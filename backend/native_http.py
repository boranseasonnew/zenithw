"""Public-IP-pinned native HTTP for extractor-requested browser impersonation.

libcurl bypasses Python socket hooks. Every native transfer therefore gets a
validated numeric destination, no proxy, no automatic redirect, and no reused
connection. Redirects pass through the same checks before another transfer.
"""
import ipaddress
import copy
import re
import socket
from urllib.parse import urljoin, urlsplit, urlunsplit

from curl_cffi import CurlOpt
from curl_cffi.requests import Cookies, Session
from yt_dlp.networking.exceptions import RequestError

MAX_NATIVE_BODY = 16 * 1024 * 1024


class BufferedResponse:
    """yt-dlp's reader API over a bounded, already completed native transfer."""
    def __init__(self, response, content, cookies=()):
        self.headers, self.url = response.headers, response.url
        self.status_code, self.reason = response.status_code, response.reason
        self.content = content
        self.cookie_state = list(cookies)

    def iter_content(self):
        for offset in range(0, len(self.content), 65536):
            yield self.content[offset:offset + 65536]

    def close(self):
        self.content = b""


def native_transfer(cookies, options, method, url, kwargs):
    """Own the curl handle inside its OS thread, including after cancellation."""
    cancelled = [False]
    def perform():
        content = bytearray()
        stopped = [False]
        def consume(chunk):
            if cancelled[0] or len(content) + len(chunk) > MAX_NATIVE_BODY:
                stopped[0] = True
                return 0  # libcurl write abort; also supported by older curl_cffi.
            content.extend(chunk)
            return len(chunk)
        # Never use curl_cffi's streaming ThreadPoolExecutor after monkey patching:
        # its threads/events become greenlets and may block the entire API worker.
        with Session(cookies=cookies, trust_env=False, curl_options=options) as transport:
            try:
                response = transport.request(method, url, **{
                    **kwargs, "stream": False, "content_callback": consume,
                    "allow_redirects": False, "max_redirects": 0, "verify": True,
                    "proxy": "", "proxies": {},
                })
            except Exception:
                if stopped[0]:
                    raise RequestError("Native metadata transfer cancelled or above size limit") from None
                raise
            if stopped[0]:
                response.close()
                raise RequestError("Native metadata transfer cancelled or above size limit")
            result = BufferedResponse(response, bytes(content), transport.cookies.jar)
            response.close()
            return result
    from gevent import monkey
    if not monkey.is_module_patched("threading"):
        return perform()
    import gevent
    def completed_transfer():
        try:
            return perform(), None
        except Exception as error:
            # Deliver failures to the caller without an unobserved worker-thread
            # traceback (especially after the caller has already cancelled).
            return None, error
    task = gevent.get_hub().threadpool.spawn(completed_transfer)
    try:
        response, error = task.get()
        if error is not None:
            raise error
        return response
    except BaseException:
        # The callback aborts on the next body chunk; TIMEOUT_MS also bounds
        # servers that send nothing. Only the transfer thread closes its handle.
        cancelled[0] = True
        raise


def public_destination(url):
    if not isinstance(url, str) or len(url) > 8192 or re.search(r"[\x00-\x20\x7f\\]", url):
        raise RequestError("Invalid native HTTP URL")
    try:
        parsed = urlsplit(url)
        if parsed.scheme not in {"https", "http"} or parsed.username is not None or parsed.password is not None:
            raise ValueError()
        host = (parsed.hostname or "").encode("idna").decode("ascii").lower().rstrip(".")
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        if not host or "%" in host or not 1 <= port <= 65535:
            raise ValueError()
        try:
            literal = ipaddress.ip_address(host)
        except ValueError:
            if not re.fullmatch(r"[a-z0-9.-]+", host) or re.fullmatch(r"[0-9.]+", host):
                raise ValueError()
            literal = None
        addresses = [literal] if literal else [ipaddress.ip_address(item[4][0]) for item in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)]
        if not addresses or any(not ip.is_global or ip.is_multicast or ip.is_reserved
                                or getattr(ip, "ipv4_mapped", None) or getattr(ip, "sixtofour", None)
                                or getattr(ip, "teredo", None) for ip in addresses):
            raise ValueError()
    except (ValueError, UnicodeError, OSError) as exc:
        raise RequestError("Non-public or invalid native HTTP destination blocked") from exc
    # The original host is retained for TLS/SNI and Host. The numeric destination
    # is the only DNS answer libcurl may use for this exact host and port.
    address = next((ip for ip in addresses if ip.version == 4), addresses[0])
    authority = f"[{host}]" if ":" in host else host
    normalized = urlunsplit((parsed.scheme, f"{authority}:{port}", parsed.path or "/", parsed.query, ""))
    ip_text = f"[{address}]" if address.version == 6 else str(address)
    return normalized, f"{authority}:{port}:{ip_text}"


class PublicSession(Session):
    def __init__(self, **kwargs):
        super().__init__(**kwargs, trust_env=False)

    def request(self, method, url, **kwargs):
        # This adapter is used by yt-dlp's handler, not as a general Session API.
        # Refuse configuration capable of replacing the checked destination.
        if any(kwargs.get(key) for key in ("proxy", "proxies", "params", "curl_options", "doh_url", "dns", "auth")):
            raise RequestError("Native HTTP routing overrides are not supported")
        headers = dict(kwargs.pop("headers", {}) or {})
        method = method.upper()
        for hop in range(6):
            normalized, resolve = public_destination(url)
            self.curl_options = {
                CurlOpt.RESOLVE: [resolve.encode("ascii")],
                CurlOpt.FOLLOWLOCATION: 0,
                CurlOpt.PROXY: "",
                CurlOpt.NOPROXY: "*",
                CurlOpt.FRESH_CONNECT: 1,
                CurlOpt.FORBID_REUSE: 1,
                CurlOpt.PROTOCOLS_STR: "http,https",
                CurlOpt.REDIR_PROTOCOLS_STR: "http,https",
                CurlOpt.SSL_VERIFYPEER: 1,
                CurlOpt.SSL_VERIFYHOST: 2,
                CurlOpt.TIMEOUT_MS: 15000,
            }
            original = {(c.domain, c.path, c.name): copy.deepcopy(vars(c)) for c in self.cookies.jar}
            response = native_transfer(Cookies(self.cookies), self.curl_options, method, normalized, {**kwargs, "headers": headers})
            # Merge accepted Set-Cookie updates on the caller thread, preserving
            # yt-dlp's jar identity and unrelated concurrent cookie changes.
            final = {(c.domain, c.path, c.name): c for c in response.cookie_state}
            current = {(c.domain, c.path, c.name): c for c in self.cookies.jar}
            for key in original.keys() - final.keys():
                if key in current and vars(current[key]) == original[key]:
                    self.cookies.jar.clear(*key)
            for key, cookie in final.items():
                if vars(cookie) != original.get(key):
                    self.cookies.jar.set_cookie(cookie)
            if response.status_code not in (301, 302, 303, 307, 308) or not response.headers.get("Location"):
                return response
            status = response.status_code
            destination = urljoin(normalized, response.headers["Location"])
            response.close()
            if hop == 5:
                raise RequestError("Too many native HTTP redirects")
            current, target = urlsplit(normalized), urlsplit(destination)
            if current.scheme == "https" and target.scheme != "https":
                raise RequestError("Insecure native HTTP redirect blocked")
            # Origin-bound headers and bodies must never leak across origins.
            if (current.scheme, current.hostname, current.port or 443) != (target.scheme, target.hostname, target.port or (443 if target.scheme == "https" else 80)):
                headers = {key: value for key, value in headers.items() if key.lower() not in {"authorization", "cookie", "host", "referer", "origin"}}
                if kwargs.get("data") is not None:
                    raise RequestError("Cross-origin native HTTP body redirect blocked")
            if (status in (301, 302) and method == "POST") or (status == 303 and method != "HEAD"):
                method = "GET"
                kwargs.pop("data", None)
                headers = {key: value for key, value in headers.items() if key.lower() not in {"content-length", "content-type"}}
            url = destination


def guarded_curl_handler(base):
    class PublicCurlCFFIRH(base):
        RH_KEY = "CurlCFFI"

        def _create_instance(self, cookiejar=None):
            return PublicSession(cookies=cookiejar)

    return PublicCurlCFFIRH
