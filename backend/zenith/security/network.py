"""DNS-pinned outbound networking and scoped provider access."""
import contextvars
import ipaddress
import socket
import threading
import time
from collections import OrderedDict
from contextlib import contextmanager
from urllib.parse import urlparse
from urllib.request import HTTPDefaultErrorHandler, HTTPErrorProcessor, HTTPHandler, HTTPRedirectHandler, HTTPSHandler, OpenerDirector, ProxyHandler, Request as UrlRequest
from zenith.security.urls import _is_private_ip, is_youtube

_orig_create_connection = socket.create_connection
_orig_socket_connect = socket.socket.connect
_orig_socket_connect_ex = socket.socket.connect_ex

def open_http_resource(request_obj, timeout):
    """HTTP(S) only: local files and FTP have no installed protocol handlers."""
    address = request_obj.full_url if isinstance(request_obj, UrlRequest) else str(request_obj)
    if urlparse(address).scheme.lower() not in {"http", "https"}:
        raise ValueError("Only HTTP(S) resources are supported")
    opener = OpenerDirector()
    for handler in (ProxyHandler(), HTTPHandler(), HTTPSHandler(),
                    HTTPDefaultErrorHandler(), HTTPRedirectHandler(), HTTPErrorProcessor()):
        opener.add_handler(handler)
    return opener.open(request_obj, timeout=timeout)

SSRF_HOST_CACHE_TTL = 30

SSRF_HOST_CACHE_MAX_SIZE = 2000

class NetworkPolicy:
    def __init__(self, runtime):
        self.runtime = runtime
        self._ssrf_safe_host_cache = OrderedDict()
        self._ssrf_safe_host_cache_lock = threading.Lock()
        self._ssrf_trusted_private_target = contextvars.ContextVar(
            "ssrf_trusted_private_target", default=frozenset()
        )

    def is_safe_url(self, u):
        if not isinstance(u, str) or not u or len(u) > 4096 or any(ord(c) < 32 or ord(c) == 127 for c in u):
            return False
        try:
            parsed = urlparse(u)
        except Exception:
            return False
        if parsed.scheme not in ("http", "https") or parsed.username is not None or parsed.password is not None:
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        lowered = hostname.lower()
        if lowered in ("localhost", "metadata", "metadata.google.internal"):
            return False
        try:
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
        except ValueError:
            return False
        # URL validation and the guarded connection share the exact host+port IP
        # tuple. This removes duplicate DNS work without caching a boolean-only
        # safety decision or introducing a second rebinding opportunity.
        return bool(self._resolve_safe_host_cached(hostname, port, allow_private_provider=False))

    def _is_pot_provider_destination(self, host, port):
        if not self.runtime.config.POT_PROVIDER_HOST or not isinstance(host, str):
            return False
        try:
            normalized_port = int(port)
        except (TypeError, ValueError):
            return False
        return (
            host.lower().rstrip(".") == self.runtime.config.POT_PROVIDER_HOST
            and normalized_port == self.runtime.config.POT_PROVIDER_PORT
        )

    def _trusted_private_ip(self, ip_str, port):
        try:
            normalized_ip = str(ipaddress.ip_address(ip_str.split("%", 1)[0]))
            normalized_port = int(port)
        except (TypeError, ValueError):
            return False
        return (normalized_ip, normalized_port) in self._ssrf_trusted_private_target.get()

    def _resolve_safe_host_cached(self, host, port, allow_private_provider=False):
        """Resolve public hosts, plus the one explicitly configured POT service."""
        if not isinstance(host, str):
            return ()
        try:
            normalized_port = int(port)
        except (TypeError, ValueError):
            return ()
        if not (1 <= normalized_port <= 65535):
            return ()
        cache_key = (host.lower(), normalized_port, bool(allow_private_provider))
        now = time.time()
        with self._ssrf_safe_host_cache_lock:
            cached = self._ssrf_safe_host_cache.get(cache_key)
            if cached is not None and now < cached[0]:
                self._ssrf_safe_host_cache.move_to_end(cache_key)
                return cached[1]
            if cached is not None:
                self._ssrf_safe_host_cache.pop(cache_key, None)
        try:
            infos = socket.getaddrinfo(host, normalized_port, type=socket.SOCK_STREAM)
        except Exception:
            return ()

        trusted_provider = (
            allow_private_provider and self._is_pot_provider_destination(host, normalized_port)
        )
        safe_ips = []
        for info in infos:
            ip_str = info[4][0]
            # Bir hostname hem public hem private adres döndürüyorsa tamamını engelle;
            # resolver sırası değiştiğinde private adrese düşme riski alınmamalı.
            # Tek istisna, startup'ta doğrulanan sabit POT provider host+port'udur.
            if _is_private_ip(ip_str) and not trusted_provider:
                return ()
            if ip_str not in safe_ips:
                safe_ips.append(ip_str)
        if not safe_ips:
            return ()

        result = tuple(safe_ips)
        with self._ssrf_safe_host_cache_lock:
            self._ssrf_safe_host_cache[cache_key] = (now + SSRF_HOST_CACHE_TTL, result)
            self._ssrf_safe_host_cache.move_to_end(cache_key)
            while len(self._ssrf_safe_host_cache) > SSRF_HOST_CACHE_MAX_SIZE:
                self._ssrf_safe_host_cache.popitem(last=False)
        return result

    @contextmanager
    def _pot_provider_network_scope(self, url):
        """Allow only the configured POT host's resolved IPs during YouTube work.

        yt-dlp can resolve the provider hostname before calling the low-level
        socket method, so that method may receive a raw Railway-private IP and no
        longer know its original hostname. Keep the exact resolved IP+port pairs
        in a context-local allowlist for the lifetime of this extraction only.
        """
        if not (self.runtime.config.POT_PROVIDER_URL and is_youtube(url)):
            yield
            return
        safe_ips = self._resolve_safe_host_cached(
            self.runtime.config.POT_PROVIDER_HOST,
            self.runtime.config.POT_PROVIDER_PORT,
            allow_private_provider=True,
        )
        trusted_targets = {
            (str(ipaddress.ip_address(ip.split("%", 1)[0])), self.runtime.config.POT_PROVIDER_PORT)
            for ip in safe_ips
        }
        previous_targets = self._ssrf_trusted_private_target.get()
        context_token = self._ssrf_trusted_private_target.set(
            frozenset(previous_targets | trusted_targets)
        )
        try:
            yield
        finally:
            self._ssrf_trusted_private_target.reset(context_token)

    def _guarded_create_connection(self, address, *args, **kwargs):
        host, port = address
        try:
            ip = ipaddress.ip_address(host)
            if _is_private_ip(str(ip)) and not self._trusted_private_ip(str(ip), port):
                raise PermissionError(f"SSRF protection: connection to {host} blocked")
            return _orig_create_connection(address, *args, **kwargs)
        except ValueError:
            # Hostname'i bir kez çözümle, doğrulanan IP'ye doğrudan bağlan. Böylece
            # güvenlik kontrolü ile gerçek bağlantı arasında ikinci DNS çözümlemesi
            # (TOCTOU / DNS rebinding) oluşmaz.
            allow_private_provider = (
                self._is_pot_provider_destination(host, port)
                and bool(self._ssrf_trusted_private_target.get())
            )
            safe_ips = self._resolve_safe_host_cached(
                host,
                port,
                allow_private_provider=allow_private_provider,
            )
            if not safe_ips:
                raise PermissionError(f"SSRF protection: connection to {host} blocked")

            last_error = None
            for safe_ip in safe_ips:
                context_token = None
                try:
                    if _is_private_ip(safe_ip):
                        trusted_targets = set(self._ssrf_trusted_private_target.get())
                        trusted_targets.add(
                            (str(ipaddress.ip_address(safe_ip.split("%", 1)[0])), int(port))
                        )
                        context_token = self._ssrf_trusted_private_target.set(
                            frozenset(trusted_targets)
                        )
                    return _orig_create_connection((safe_ip, port), *args, **kwargs)
                except OSError as exc:
                    last_error = exc
                finally:
                    if context_token is not None:
                        self._ssrf_trusted_private_target.reset(context_token)
            if last_error is not None:
                raise last_error
            raise OSError(f"Could not connect to {host}")

    def _safe_socket_address(self, address, socket_family=None):
        """Low-level socket kullanıcılarını da private/link-local ağlardan uzak tutar.

        requests/urllib3 gibi bazı istemciler socket.create_connection yerine
        socket.socket.connect çağırabildiği için yalnızca üst seviye wrapper yeterli
        değildir. Hostname gelirse güvenli public IP'ye burada sabitlenir; IP gelirse
        bağlantıdan hemen önce tekrar kontrol edilir.
        """
        if not isinstance(address, tuple) or len(address) < 2:
            return address
        host, port, *rest = address
        if not isinstance(host, str):
            raise PermissionError("SSRF protection: invalid socket destination")
        try:
            ip = ipaddress.ip_address(host.split("%", 1)[0])
        except ValueError:
            allow_private_provider = (
                self._is_pot_provider_destination(host, port)
                and bool(self._ssrf_trusted_private_target.get())
            )
            safe_ips = self._resolve_safe_host_cached(
                host,
                port,
                allow_private_provider=allow_private_provider,
            )
            if not safe_ips:
                raise PermissionError(f"SSRF protection: connection to {host} blocked")
            if socket_family == socket.AF_INET:
                safe_ips = tuple(ip for ip in safe_ips if ipaddress.ip_address(ip.split("%", 1)[0]).version == 4)
            elif socket_family == socket.AF_INET6:
                safe_ips = tuple(ip for ip in safe_ips if ipaddress.ip_address(ip.split("%", 1)[0]).version == 6)
            if not safe_ips:
                raise OSError(f"No address compatible with socket family for {host}")
            host = safe_ips[0]
        else:
            if _is_private_ip(str(ip)) and not self._trusted_private_ip(str(ip), port):
                raise PermissionError(f"SSRF protection: connection to {host} blocked")
        return (host, port, *rest)

    def _guarded_socket_connect(self, sock, address):
        return _orig_socket_connect(sock, self._safe_socket_address(address, sock.family))

    def _guarded_socket_connect_ex(self, sock, address):
        return _orig_socket_connect_ex(sock, self._safe_socket_address(address, sock.family))


# The installed dispatchers are process-wide; policy and provider allowances
# remain context-local. Creating another Flask app never replaces its peers.
_active_policy = contextvars.ContextVar("zenith_network_policy", default=None)
_fallback_policy = None
_installed = False
_installation_lock = threading.Lock()


def current_policy():
    global _fallback_policy
    policy = _active_policy.get()
    if policy is not None:
        return policy
    if _fallback_policy is None:
        from types import SimpleNamespace
        config = SimpleNamespace(POT_PROVIDER_HOST=None, POT_PROVIDER_PORT=None, POT_PROVIDER_URL=None)
        _fallback_policy = NetworkPolicy(SimpleNamespace(config=config))
    return _fallback_policy


def bind_request_policy(policy):
    from flask import g
    g._zenith_network_token = _active_policy.set(policy)


def release_request_policy(error=None):
    from flask import g
    token = g.pop("_zenith_network_token", None)
    if token is not None:
        _active_policy.reset(token)


def _dispatch_create_connection(address, *args, **kwargs):
    return current_policy()._guarded_create_connection(address, *args, **kwargs)


def _dispatch_socket_connect(sock, address):
    return current_policy()._guarded_socket_connect(sock, address)


def _dispatch_socket_connect_ex(sock, address):
    return current_policy()._guarded_socket_connect_ex(sock, address)


def install_network_guards():
    global _installed
    with _installation_lock:
        if _installed:
            return
        socket.create_connection = _dispatch_create_connection
        socket.socket.connect = _dispatch_socket_connect
        socket.socket.connect_ex = _dispatch_socket_connect_ex
        _installed = True
