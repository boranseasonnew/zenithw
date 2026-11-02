"""Engine options, tool inventory and bounded subprocesses."""
import logging
import math
import os
import psutil
import re
import shutil
import subprocess
import threading
import time
from contextlib import contextmanager
from importlib.metadata import PackageNotFoundError, version as package_version
from urllib.request import Request as UrlRequest
from youtube_health import YouTubeHealth
from zenith.security.logging import _redact_log_text
from zenith.security.network import open_http_resource
from zenith.security.urls import _get_hostname, is_instagram, is_pornhub, is_youtube
from zenith.services.formats import FFMPEG_LOCAL_DEMUXERS, FFMPEG_LOCAL_PROTOCOLS, FFMPEG_POST_DEMUXERS

logger = logging.getLogger("zenithw")

def find_ffmpeg():
    """Cross-platform ffmpeg path finder."""
    path = shutil.which('ffmpeg')
    if path:
        return os.path.dirname(os.path.abspath(path))
    return None

REAPABLE_PROCESS_NAMES = {"ffmpeg", "ffprobe", "aria2c"}

class MediaEngine:
    def __init__(self, runtime):
        self.runtime = runtime
        self.youtube_health = YouTubeHealth()
        self._youtube_provider_probe = {"checked_at": 0, "status": "not_checked"}
        self._youtube_provider_probe_lock = threading.Lock()
        cookies_env = os.environ.get("YOUTUBE_COOKIES") or os.environ.get("COOKIES") or os.environ.get("YOUTUBE_COOKIE")
        if cookies_env:
            try:
                cookies_content = cookies_env.replace('\\n', '\n').strip()
                fd = os.open(self.runtime.config.COOKIES_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    f.write(cookies_content)
                os.chmod(self.runtime.config.COOKIES_FILE, 0o600)
                logger.info(f"[INIT] cookies.txt written from env ({len(cookies_content)} bytes)")
            except Exception as e:
                logger.warning(f"[INIT] Failed to write cookies.txt: {e}")
        elif os.path.exists(self.runtime.config.COOKIES_FILE) and os.path.getsize(self.runtime.config.COOKIES_FILE) > 10:
            try:
                os.chmod(self.runtime.config.COOKIES_FILE, 0o600)
            except Exception as exc:
                self.runtime.files._log_cleanup_failure("restrict cookie-file permissions", exc)
            logger.info(f"[INIT] cookies.txt found ({os.path.getsize(self.runtime.config.COOKIES_FILE)} bytes)")
        else:
            logger.warning("[INIT] cookies.txt not found - YouTube downloads may be restricted")
        self.FFMPEG_DIR = find_ffmpeg()
        self.FFMPEG_PATH = shutil.which('ffmpeg')
        self.FFPROBE_PATH = shutil.which('ffprobe')
        if not self.FFPROBE_PATH and self.FFMPEG_DIR:
            _ffprobe_name = "ffprobe.exe" if os.name == "nt" else "ffprobe"
            _ffprobe_candidate = os.path.join(self.FFMPEG_DIR, _ffprobe_name)
            if os.path.isfile(_ffprobe_candidate):
                self.FFPROBE_PATH = _ffprobe_candidate
        logger.info(f"[INIT] ffmpeg={self.FFMPEG_DIR} ffprobe={self.FFPROBE_PATH or 'MISSING'}")
        try:
            import deno as _deno_package
            self._DENO_PATH = str(_deno_package.find_deno_bin())
        except (ImportError, AttributeError, OSError):
            # Local development fallback. Production installs the pinned PyPI binary.
            self._DENO_PATH = shutil.which("deno")
        self._DENO_VERSION = None
        if self._DENO_PATH:
            try:
                _deno_version_result = subprocess.run(
                    [self._DENO_PATH, "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    check=False,
                )
                self._DENO_VERSION = (_deno_version_result.stdout or "").splitlines()[0].strip() or None
            except (OSError, subprocess.SubprocessError):
                self._DENO_VERSION = None
        try:
            import yt_dlp_ejs  # noqa: F401
            self._EJS_AVAILABLE = True
        except ImportError:
            self._EJS_AVAILABLE = False
        try:
            import curl_cffi as _curl_cffi  # noqa: F401
            self._CURL_CFFI_VERSION = getattr(_curl_cffi, "__version__", "available")
        except (ImportError, OSError):
            # Optional package inventory only. SafeYoutubeDL excludes its native
            # networking handler regardless of whether this import succeeds.
            self._CURL_CFFI_VERSION = None
        try:
            self._POT_PLUGIN_VERSION = package_version("bgutil-ytdlp-pot-provider")
        except PackageNotFoundError:
            self._POT_PLUGIN_VERSION = None
        if self.runtime.config.POT_PROVIDER_URL and not self._POT_PLUGIN_VERSION:
            raise RuntimeError(
                "YOUTUBE_POT_PROVIDER_URL is configured but bgutil-ytdlp-pot-provider is not installed"
            )
        if self._DENO_PATH and self._EJS_AVAILABLE:
            logger.info(
                f"[INIT] yt-dlp JS solver: OK "
                f"(deno={self._DENO_PATH}, version={self._DENO_VERSION or 'unknown'}, yt-dlp-ejs=loaded)"
            )
        else:
            logger.warning(
                f"[INIT] yt-dlp JS solver INCOMPLETE (deno={'found' if self._DENO_PATH else 'MISSING'}, "
                f"yt-dlp-ejs={'loaded' if self._EJS_AVAILABLE else 'MISSING'}) — "
                "n-challenge çözümü yavaş/eksik fallback'e düşebilir, throttle veya "
                "bot-detection hatalarına yol açabilir."
            )
        logger.warning(
            "[INIT] Native browser impersonation disabled: libcurl bypasses Python "
            "socket SSRF guards. Providers requiring impersonation may reject requests."
        )
        if self.runtime.config.POT_PROVIDER_URL:
            logger.info(
                f"[INIT] YouTube PO Token provider configured "
                f"(host={self.runtime.config.POT_PROVIDER_HOST}:{self.runtime.config.POT_PROVIDER_PORT}, plugin={self._POT_PLUGIN_VERSION}, "
                "client_order=adaptive-cookie-first)"
            )
        else:
            logger.info("[INIT] YouTube PO Token provider disabled (YOUTUBE_POT_PROVIDER_URL not set)")
        self.ARIA2_PATH = None
        logger.info("[INIT] aria2c disabled (SSRF protection)")


    @contextmanager
    def youtube_observation(self, url, opts, phase):
        if is_youtube(url):
            with self.youtube_health.observe(opts, phase):
                yield
        else:
            yield

    def youtube_provider_health(self):
        """A short, cached local probe; never a global readiness dependency."""
        if not self.runtime.config.POT_PROVIDER_URL:
            return {"status": "disabled"}
        with self._youtube_provider_probe_lock:
            now = time.monotonic()
            if now - self._youtube_provider_probe["checked_at"] > 60:
                status = "unreachable"
                try:
                    with self.runtime.network._pot_provider_network_scope("https://www.youtube.com/"):
                        with open_http_resource(UrlRequest(self.runtime.config.POT_PROVIDER_URL + "/ping"), timeout=2) as response:
                            status = "ok" if response.status == 200 else "unhealthy"
                except Exception:
                    pass  # Only the status is exposed, never provider response/token data.
                self._youtube_provider_probe.update(checked_at=now, status=status)
            return {"status": self._youtube_provider_probe["status"]}

    def _snapshot_child_pids(self):
        """Şu anki process'in çocuklarının PID setini döner (timeout öncesi çağrılır)."""
        try:
            return {p.pid for p in psutil.Process(os.getpid()).children(recursive=True)}
        except Exception:
            return set()

    def _reap_new_children(self, before_pids, download_id=None, file_token=None):
        """
        Timeout sonrası: before_pids'te olmayan ve komut satırında bu indirmeye ait
        benzersiz dosya token'ını taşıyan ffmpeg/ffprobe/aria2c child process'lerini
        bulup öldürür.
        yt-dlp bu process'leri kendi içinde subprocess.Popen ile başlattığı için
        PID'lerine doğrudan erişimimiz yok; bu yüzden process ağacını tarıyoruz.
        Sadece "snapshot'tan sonra doğdu" ölçütü yeterli değildir: eşzamanlı başka
        bir indirme veya /convert işlemi de aynı aralıkta FFmpeg başlatabilir.
        """
        if not file_token:
            logger.warning(f"[REAP] skipped: missing file token for download_id={download_id}")
            return
        token = str(file_token).lower()
        try:
            current = psutil.Process(os.getpid()).children(recursive=True)
        except Exception:
            return
        for p in current:
            try:
                if p.pid in before_pids:
                    continue
                name = (p.name() or "").lower()
                if not any(reapable in name for reapable in REAPABLE_PROCESS_NAMES):
                    continue
                try:
                    command_line = " ".join(p.cmdline()).lower()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                if token not in command_line:
                    continue
                logger.warning(f"[REAP] killing orphaned process pid={p.pid} name={name} download_id={download_id}")
                p.kill()
                try:
                    p.wait(timeout=5)
                except Exception as exc:
                    self.runtime.files._log_cleanup_failure("wait for reaped child", exc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
            except Exception as e:
                logger.error("[REAP ERR] %s", _redact_log_text(e))

    def _reap_all_children_on_shutdown(self):
        """
        Uygulama kapanırken (worker restart, deploy, SIGTERM vb.) geride kalan
        tüm ffmpeg/ffprobe/aria2c child process'lerini temizler. Sadece bu
        process'in kendi child'larını hedef alır; sistemdeki başka process'lere
        dokunmaz.
        """
        try:
            children = psutil.Process(os.getpid()).children(recursive=True)
        except Exception:
            return
        for p in children:
            try:
                name = (p.name() or "").lower()
                if not any(reapable in name for reapable in REAPABLE_PROCESS_NAMES):
                    continue
                logger.warning(f"[SHUTDOWN REAP] killing pid={p.pid} name={name}")
                p.kill()
                try:
                    p.wait(timeout=5)
                except Exception as exc:
                    self.runtime.files._log_cleanup_failure("wait for shutdown child", exc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
            except Exception as e:
                logger.error("[SHUTDOWN REAP ERR] %s", _redact_log_text(e))

    def probe_media_duration(self, input_path):
        """Return the longest declared stream/container duration, when available."""
        if self.FFPROBE_PATH:
            try:
                result = subprocess.run(
                    [
                        self.FFPROBE_PATH,
                        '-v', 'error',
                        '-protocol_whitelist', FFMPEG_LOCAL_PROTOCOLS,
                        '-format_whitelist', FFMPEG_LOCAL_DEMUXERS,
                        '-show_entries', 'format=duration:stream=duration',
                        '-of', 'default=noprint_wrappers=1:nokey=1',
                        input_path,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=min(30, max(1, self.runtime.config.FFMPEG_TIMEOUT)),
                    check=False,
                )
            except (OSError, subprocess.SubprocessError):
                result = None
            if result is not None and result.returncode == 0:
                durations = []
                for value in (result.stdout or '').splitlines():
                    try:
                        duration = float(value.strip())
                    except (TypeError, ValueError):
                        continue
                    if math.isfinite(duration) and duration >= 0:
                        durations.append(duration)
                if durations:
                    return max(durations)

        # Some local FFmpeg bundles omit ffprobe. Reading the input header with
        # FFmpeg keeps conversion usable while still failing closed when no finite
        # duration can be established.
        ffmpeg_cmd = self.FFMPEG_PATH or (os.path.join(self.FFMPEG_DIR, 'ffmpeg') if self.FFMPEG_DIR else None)
        if not ffmpeg_cmd:
            return None
        try:
            result = subprocess.run(
                [
                    ffmpeg_cmd,
                    '-hide_banner', '-nostdin',
                    '-protocol_whitelist', FFMPEG_LOCAL_PROTOCOLS,
                        '-format_whitelist', FFMPEG_LOCAL_DEMUXERS,
                    '-i', input_path,
                ],
                capture_output=True,
                text=True,
                timeout=min(30, max(1, self.runtime.config.FFMPEG_TIMEOUT)),
                check=False,
            )
        except (OSError, subprocess.SubprocessError):
            return None
        match = re.search(
            r'Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)',
            result.stderr or '',
        )
        if not match:
            return None
        hours, minutes, seconds = match.groups()
        duration = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
        return duration if math.isfinite(duration) and duration >= 0 else None

    def run_ffmpeg_with_output_limit(self, command, output_path, timeout_seconds=None):
        """Run FFmpeg while enforcing size without turning a partial file into success."""
        if timeout_seconds is None:
            timeout_seconds = self.runtime.config.FFMPEG_TIMEOUT
        process = subprocess.Popen(
            command,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
        deadline = time.monotonic() + timeout_seconds
        output_limit_exceeded = False
        try:
            while process.poll() is None:
                try:
                    output_limit_exceeded = (
                        os.path.getsize(output_path) >= self.runtime.config.MAX_CONVERT_OUTPUT_SIZE_BYTES
                    )
                except OSError:
                    output_limit_exceeded = False
                if output_limit_exceeded:
                    process.kill()
                    break
                if time.monotonic() >= deadline:
                    process.kill()
                    _, stderr = process.communicate()
                    raise subprocess.TimeoutExpired(
                        command,
                        timeout_seconds,
                        stderr=stderr,
                    )
                time.sleep(0.1)

            _, stderr = process.communicate()
            if not output_limit_exceeded:
                try:
                    output_limit_exceeded = (
                        os.path.getsize(output_path) >= self.runtime.config.MAX_CONVERT_OUTPUT_SIZE_BYTES
                    )
                except OSError:
                    output_limit_exceeded = False
            return subprocess.CompletedProcess(
                command,
                process.returncode,
                stdout='',
                stderr=stderr or '',
            ), output_limit_exceeded
        except BaseException:
            if process.poll() is None:
                process.kill()
                process.communicate()
            raise

    def get_base_opts(self, url, use_cookies=True, youtube_player_clients=None):
        opts = {
            "quiet": True,
            "no_warnings": True,
            # Ağ indirmelerini Python içinde tut; böylece socket seviyesindeki SSRF
            # koruması her bağlantıda uygulanır. FFmpeg yalnızca yerel post-process
            # girdilerini okuyabilir ve uzak manifest/segment açamaz.
            "hls_prefer_native": True,
            "external_downloader": {
                "default": "native",
                "http": "native",
                "https": "native",
                "m3u8": "native",
                "dash": "native",
            },
            "external_downloader_args": {
                "ffmpeg_i": ["-protocol_whitelist", FFMPEG_LOCAL_PROTOCOLS, "-format_whitelist", FFMPEG_LOCAL_DEMUXERS],
            },
            "postprocessor_args": {
                "ffmpeg_i": ["-protocol_whitelist", FFMPEG_LOCAL_PROTOCOLS, "-format_whitelist", FFMPEG_POST_DEMUXERS],
            },
            "http_headers": {
                "User-Agent": self.runtime.config.YOUTUBE_USER_AGENT if is_youtube(url) else self.runtime.config.DEFAULT_USER_AGENT
            },
            "cachedir": self.runtime.config.YTDLP_CACHE_DIR,
        }
        if is_pornhub(url):
            # Preserve the source referer; SafeYoutubeDL excludes native libcurl
            # because its connections bypass the Python SSRF boundary.
            opts["http_headers"]["Referer"] = f"https://{_get_hostname(url)}/"
        if self.runtime.config.POT_PROVIDER_URL and is_youtube(url):
            # Keep provider failures visible in Railway logs while public clients
            # continue receiving the sanitized error_code/message payload.
            opts["no_warnings"] = False
            opts["extractor_args"] = {
                "youtube": {
                    "player_client": youtube_player_clients or ["mweb"],
                    # yt-dlp's auto policy can decide not to fetch a token before
                    # it filters the mweb formats that require one. Since a
                    # provider is explicitly configured, always request the token.
                    "fetch_pot": ["always"],
                },
                "youtubepot-bgutilhttp": {
                    "base_url": [self.runtime.config.POT_PROVIDER_URL],
                },
            }
            if self._DENO_PATH:
                # Do not rely on yt-dlp rediscovering the Nix-provided runtime in
                # the worker environment; pass the verified executable directly.
                opts["js_runtimes"] = {
                    "deno": {"path": self._DENO_PATH},
                }
                # Keep production execution reproducible: yt-dlp discovers the
                # pinned yt-dlp-ejs package locally. remote_components is
                # deliberately not enabled, so deploys never fetch executable EJS
                # components from npm at request time.
        if self.FFMPEG_DIR:
            opts["ffmpeg_location"] = self.FFMPEG_DIR
            # Keep every yt-dlp-managed FFmpeg postprocessor within the same
            # Railway CPU budget as the explicit /convert pipeline. Remux/copy
            # operations ignore encoder threading, while real transcodes obey it.
            opts["postprocessor_args"].update({
                "ffmpeg": ["-threads", str(self.runtime.config.FFMPEG_THREADS)],
            })
        # aria2c kaldırıldı: SSRF korumasını bypass ediyordu
        if use_cookies and os.path.exists(self.runtime.config.COOKIES_FILE) and not is_instagram(url):
            opts["cookiefile"] = self.runtime.config.COOKIES_FILE
        return opts

    def get_opts_list(self, url, extra=None, youtube_video_fallback=False):
        opts_list = []
        def add_opts(*, use_cookies, youtube_player_clients=None):
            o = self.get_base_opts(
                url,
                use_cookies=use_cookies,
                youtube_player_clients=youtube_player_clients,
            )
            if extra:
                o.update(extra)
            opts_list.append(o)

        if self.runtime.config.POT_PROVIDER_URL and is_youtube(url):
            # Keep distinct anonymous options available for missing/stale cookies.
            add_opts(use_cookies=False, youtube_player_clients=["default"])

            # mweb + PO Token remains the bounded second path. It can expose formats
            # unavailable through the defaults, but YouTube occasionally rejects a
            # valid-looking mweb token during GVS media/fragment requests. Do not
            # retry the identical mweb profile with and without cookies.
            add_opts(use_cookies=False, youtube_player_clients=["mweb"])

            # The default cookie profile has been verified on AWS. Prefer it on
            # startup, with mweb + PO as a bounded alternative on that session.
            cookie_opts = self.get_base_opts(
                url,
                use_cookies=True,
                youtube_player_clients=["default"],
            )
            if "cookiefile" in cookie_opts:
                if extra:
                    cookie_opts.update(extra)
                opts_list.insert(0, cookie_opts)
                mweb_cookie_opts = self.get_base_opts(url, use_cookies=True, youtube_player_clients=["mweb"])
                if extra:
                    mweb_cookie_opts.update(extra)
                opts_list.insert(1, mweb_cookie_opts)
            return self.youtube_health.order(opts_list)

        add_opts(use_cookies=True)
        # Cookie gerçekten kullanılıyorsa ikinci denemeyi cookie'siz fallback olarak
        # ekle. Cookie dosyası yokken veya Instagram'da iki özdeş upstream isteği
        # çalıştırmak yalnızca hata/latency yükünü ikiye katlıyordu.
        if "cookiefile" in opts_list[0]:
            add_opts(use_cookies=False)
        return opts_list

    def enforce_download_limits(self, info, *, incomplete=False):
        """Playlist ve süre sınırlarını yt-dlp'nin tek extraction akışında uygular."""
        # yt-dlp playlist container'ını match_filter'a incomplete=True ve
        # playlist_index olmadan geçirir. Entry'lerde playlist_index bulunduğu için
        # yalnızca container reddedilir; video+playlist URL'sinde noplaylist tek
        # videoyu seçmeye devam eder.
        if incomplete and info.get("playlist") and info.get("playlist_index") is None:
            return "Playlist downloads are not supported. Select a single video."
        duration = info.get("duration")
        if duration and duration > self.runtime.config.MAX_VIDEO_DURATION_SECONDS:
            max_min = self.runtime.config.MAX_VIDEO_DURATION_SECONDS // 60
            return f"Video too long (maximum {max_min} minutes)."
        safe_protocols = {
            "", "http", "https", "m3u8", "m3u8_native",
            "dash", "http_dash_segments", "https_fragments",
        }

        def has_unsafe_protocol(raw_protocol):
            # yt-dlp, ayrı video+ses akışlarını seçtiğinde üst protokolü
            # "https+https" veya "m3u8_native+https" biçiminde birleştirir.
            # Her parçayı tek tek doğrula; böylece güvenli birleşimler çalışırken
            # "https+file" gibi yerel/tehlikeli bir protokol yine reddedilir.
            parts = {
                part.strip().lower()
                for part in str(raw_protocol or "").split("+")
                if part.strip()
            }
            return any(part not in safe_protocols for part in parts)

        if has_unsafe_protocol(info.get("protocol")):
            return "Remote media protocol is not allowed."
        for selected_format in info.get("requested_formats") or ():
            if isinstance(selected_format, dict) and has_unsafe_protocol(selected_format.get("protocol")):
                return "Remote media protocol is not allowed."
        return None
