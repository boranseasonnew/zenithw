"""Validated environment settings; importing this module does not start the app."""
import ipaddress
import json
import logging
import math
import os
import re
import secrets
from types import SimpleNamespace
from urllib.parse import urlparse

logger = logging.getLogger("zenithw")
BACKEND_ROOT = os.path.dirname(os.path.dirname(__file__))
MAINTENANCE_CONFIG_PATH = os.path.join(BACKEND_ROOT, "maintenance-config.json")

def _bounded_env_int(name, default, minimum, maximum):
    try:
        value = int(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        value = default
    return min(maximum, max(minimum, value))

def _bounded_env_float(name, default, minimum, maximum):
    try:
        value = float(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        value = default
    if not math.isfinite(value):
        value = default
    return min(maximum, max(minimum, value))

def _env_flag(name, default=False):
    raw_value = os.environ.get(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}

def _load_maintenance_config():
    try:
        with open(MAINTENANCE_CONFIG_PATH, "r", encoding="utf-8") as config_file:
            config = json.load(config_file)
        return config if isinstance(config, dict) else {}
    except (OSError, ValueError, TypeError) as exc:
        logger.warning("[INIT] maintenance config could not be loaded: %s", exc)
        return {}

def _load_pot_provider_config():
    """Validate the optional private PO Token provider endpoint at startup."""
    raw_url = os.environ.get("YOUTUBE_POT_PROVIDER_URL", "").strip()
    if not raw_url:
        return None, None, None
    try:
        parsed = urlparse(raw_url)
        port = parsed.port or 4416
    except ValueError as exc:
        raise RuntimeError("YOUTUBE_POT_PROVIDER_URL has an invalid port") from exc
    host = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme != "http":
        raise RuntimeError("YOUTUBE_POT_PROVIDER_URL must use http on a private or loopback network")
    if not host or not (1 <= port <= 65535):
        raise RuntimeError("YOUTUBE_POT_PROVIDER_URL must contain a valid hostname and port")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise RuntimeError("YOUTUBE_POT_PROVIDER_URL must not contain credentials, query, or fragment")
    if parsed.path not in ("", "/"):
        raise RuntimeError("YOUTUBE_POT_PROVIDER_URL must be a base URL without a path")
    if not (host.endswith(".railway.internal") or host in {"localhost", "127.0.0.1", "::1"}):
        raise RuntimeError(
            "YOUTUBE_POT_PROVIDER_URL must target a Railway private hostname or local loopback"
        )
    normalized_host = f"[{host}]" if ":" in host else host
    return f"http://{normalized_host}:{port}", host, port

def load_settings(*, download_dir=None):
    TRUST_PROXY = os.environ.get("TRUST_PROXY", "1") != "0"
    PROXY_HOPS = _bounded_env_int("PROXY_HOPS", 1, 1, 8)


    SECRET_KEY = os.environ.get("SECRET_KEY")
    if SECRET_KEY and SECRET_KEY.startswith("replace-with-"):
        raise RuntimeError("SECRET_KEY must be replaced with a generated secret")
    if not SECRET_KEY:
        if os.environ.get("FLASK_ENV") == "development":
            SECRET_KEY = secrets.token_hex(32)
            logger.warning("[INIT] Using random SECRET_KEY (development mode)")
        else:
            raise RuntimeError(
                "SECRET_KEY environment variable is required in production. "
                "Set it in the deployment environment or set FLASK_ENV=development for local dev."
            )


    MAX_UPLOAD_SIZE_BYTES = 95 * 1024 * 1024


    MAX_API_JSON_BYTES = 16 * 1024
    API_JSON_PATHS = frozenset({'/info', '/download', '/thumbnail', '/cancel'})


    FFMPEG_TIMEOUT = _bounded_env_int("FFMPEG_TIMEOUT_SECONDS", 120, 30, 3600)
    FFMPEG_THREADS = _bounded_env_int("FFMPEG_THREADS", 2, 1, 8)
    DOWNLOAD_TIMEOUT_SECONDS = _bounded_env_int("DOWNLOAD_TIMEOUT_SECONDS", 600, 60, 3600)
    MAX_CONCURRENT_PER_IP = _bounded_env_int("MAX_CONCURRENT_PER_IP", 5, 1, 20)
    MAX_CONCURRENT_DOWNLOADS = _bounded_env_int("MAX_CONCURRENT_DOWNLOADS", 2, 1, 32)
    MAX_CONCURRENT_CONVERSIONS = _bounded_env_int("MAX_CONCURRENT_CONVERSIONS", 1, 1, 16)
    MAX_CONCURRENT_INFO = _bounded_env_int("MAX_CONCURRENT_INFO", 4, 1, 64)
    MAX_CONCURRENT_THUMBNAILS = _bounded_env_int("MAX_CONCURRENT_THUMBNAILS", 2, 1, 32)
    MAX_DOWNLOAD_QUEUE = _bounded_env_int("MAX_DOWNLOAD_QUEUE", 12, 1, 100)
    MAX_QUEUE_WAIT_SECONDS = _bounded_env_int("MAX_QUEUE_WAIT_SECONDS", 120, 5, 900)
    INFO_TIMEOUT_SECONDS = _bounded_env_int("INFO_TIMEOUT_SECONDS", 45, 5, 300)
    INFO_CACHE_TTL_SECONDS = _bounded_env_int("INFO_CACHE_TTL_SECONDS", 45, 5, 3600)
    INFO_CACHE_MAX_SIZE = _bounded_env_int("INFO_CACHE_MAX_SIZE", 256, 16, 4096)
    YOUTUBE_RATE_LIMIT_WINDOW = _bounded_env_int("YOUTUBE_RATE_LIMIT_WINDOW", 60, 10, 600)
    YOUTUBE_INFO_PER_IP = _bounded_env_int("YOUTUBE_INFO_PER_IP", 6, 2, 60)
    YOUTUBE_INFO_GLOBAL = _bounded_env_int("YOUTUBE_INFO_GLOBAL", 12, 2, 120)
    YOUTUBE_DOWNLOADS_PER_IP = _bounded_env_int("YOUTUBE_DOWNLOADS_PER_IP", 3, 1, 30)
    YOUTUBE_DOWNLOADS_GLOBAL = _bounded_env_int("YOUTUBE_DOWNLOADS_GLOBAL", 8, 1, 60)
    YOUTUBE_REPEAT_COOLDOWN_SECONDS = _bounded_env_int(
        "YOUTUBE_REPEAT_COOLDOWN_SECONDS", 10, 2, 120
    )
    YOUTUBE_WEB_ENABLED = os.environ.get("YOUTUBE_WEB_ENABLED", "0").strip() == "1"
    THUMBNAIL_TIMEOUT_SECONDS = _bounded_env_int("THUMBNAIL_TIMEOUT_SECONDS", 60, 5, 300)
    MAX_THUMBNAIL_BYTES = _bounded_env_int("MAX_THUMBNAIL_MB", 12, 1, 32) * 1024 * 1024
    MAX_VIDEO_DURATION_SECONDS = _bounded_env_int("MAX_VIDEO_DURATION_SECONDS", 90 * 60, 60, 6 * 3600)
    MAX_TRANSCODE_DURATION_SECONDS = _bounded_env_int("MAX_TRANSCODE_DURATION_SECONDS", 10 * 60, 30, 3600)
    MAX_DOWNLOAD_SIZE_BYTES = _bounded_env_int("MAX_DOWNLOAD_SIZE_MB", 1536, 16, 10240) * 1024 * 1024
    MAX_CONVERT_OUTPUT_SIZE_BYTES = _bounded_env_int("MAX_CONVERT_OUTPUT_SIZE_MB", 1024, 16, 4096) * 1024 * 1024
    MAX_SPOOL_SIZE_BYTES = _bounded_env_int("MAX_SPOOL_SIZE_MB", 4096, 128, 32768) * 1024 * 1024
    MIN_FREE_DISK_BYTES = _bounded_env_int("MIN_FREE_DISK_MB", 512, 64, 8192) * 1024 * 1024
    DOWNLOAD_SPOOL_RESERVATION_BYTES = _bounded_env_int(
        "DOWNLOAD_SPOOL_RESERVATION_MB", 2048, 16, 16384
    ) * 1024 * 1024
    CONVERT_SPOOL_RESERVATION_BYTES = (
        MAX_UPLOAD_SIZE_BYTES + MAX_CONVERT_OUTPUT_SIZE_BYTES
    )
    if DOWNLOAD_SPOOL_RESERVATION_BYTES > MAX_SPOOL_SIZE_BYTES:
        raise RuntimeError("DOWNLOAD_SPOOL_RESERVATION_MB cannot exceed MAX_SPOOL_SIZE_MB")
    if CONVERT_SPOOL_RESERVATION_BYTES > MAX_SPOOL_SIZE_BYTES:
        raise RuntimeError("MAX_SPOOL_SIZE_MB is too small for one conversion reservation")
    MAX_CONCURRENT_TRANSFERS = _bounded_env_int("MAX_CONCURRENT_TRANSFERS", 2, 1, 64)
    MAX_CONCURRENT_TRANSFERS_PER_IP = min(
        MAX_CONCURRENT_TRANSFERS,
        _bounded_env_int("MAX_CONCURRENT_TRANSFERS_PER_IP", 2, 1, 32),
    )
    MAX_TRANSFER_QUEUE = _bounded_env_int("MAX_TRANSFER_QUEUE", 12, 1, 100)
    MAX_TRANSFER_QUEUE_PER_IP = min(MAX_TRANSFER_QUEUE, _bounded_env_int("MAX_TRANSFER_QUEUE_PER_IP", 2, 1, 8))
    MAX_SOCKET_CONNECTIONS = _bounded_env_int("MAX_SOCKET_CONNECTIONS", 400, 10, 5000)
    MAX_SOCKET_CONNECTIONS_PER_IP = min(
        MAX_SOCKET_CONNECTIONS,
        _bounded_env_int("MAX_SOCKET_CONNECTIONS_PER_IP", 20, 1, 200),
    )
    TRANSFER_QUEUE_WAIT_SECONDS = _bounded_env_int("TRANSFER_QUEUE_WAIT_SECONDS", 120, 5, 900)
    PREPARED_FILE_TTL = _bounded_env_int("PREPARED_FILE_TTL", 10 * 60, 60, 3600)
    PROGRESS_EMIT_INTERVAL = _bounded_env_float("PROGRESS_EMIT_INTERVAL", 0.2, 0.05, 5.0)
    RATE_LIMIT_WINDOW = _bounded_env_int("RATE_LIMIT_WINDOW", 60, 10, 600)
    # Heavy job starts remain deliberately bounded, while metadata and thumbnails
    # receive their own friendlier quotas below. This avoids making a normal user
    # wait after a couple of harmless paste/edit retries.
    RATE_LIMIT_MAX_REQUESTS = _bounded_env_int("RATE_LIMIT_MAX_REQUESTS", 8, 2, 60)
    INFO_RATE_LIMIT_MAX_REQUESTS = _bounded_env_int("INFO_RATE_LIMIT_MAX_REQUESTS", 12, 4, 120)
    THUMBNAIL_RATE_LIMIT_MAX_REQUESTS = _bounded_env_int(
        "THUMBNAIL_RATE_LIMIT_MAX_REQUESTS", 15, 2, 60
    )
    CONVERSION_RATE_LIMIT_WINDOW = _bounded_env_int("CONVERSION_RATE_LIMIT_WINDOW", 600, 60, 86400)
    CONVERSION_RATE_LIMIT_MAX_REQUESTS = _bounded_env_int("CONVERSION_RATE_LIMIT_MAX_REQUESTS", 2, 1, 100)
    CANCEL_RATE_LIMIT_WINDOW = _bounded_env_int("CANCEL_RATE_LIMIT_WINDOW", 60, 10, 600)
    CANCEL_RATE_LIMIT_MAX_REQUESTS = _bounded_env_int("CANCEL_RATE_LIMIT_MAX_REQUESTS", 30, 5, 300)
    RATE_LIMIT_CLEANUP_INTERVAL = 60  # saniye
    FILE_CLEANUP_INTERVAL = 900  # 15 dakika
    FILE_MAX_AGE = 1800  # 30 dakika
    PLAYLIST_LIMIT = 50


    MAINTENANCE_DEFAULT_MESSAGE = (
        "Pati ekibimiz sunucuların kablolarını düzeltiyor. Kısa süre sonra yeniden buradayız."
    )
    MAINTENANCE_CONFIG_PATH = os.path.join(BACKEND_ROOT, "maintenance-config.json")


    _MAINTENANCE_FILE_CONFIG = _load_maintenance_config()
    _MAINTENANCE_ENV_MODE = os.environ.get("MAINTENANCE_MODE", "workflow").strip().lower()
    _MAINTENANCE_ENABLED_VALUES = {"1", "true", "yes", "on"}
    _MAINTENANCE_DISABLED_VALUES = {"0", "false", "no", "off"}
    _MAINTENANCE_WORKFLOW_MANAGED = _MAINTENANCE_ENV_MODE not in (
        _MAINTENANCE_ENABLED_VALUES | _MAINTENANCE_DISABLED_VALUES
    )

    if _MAINTENANCE_ENV_MODE in _MAINTENANCE_ENABLED_VALUES:
        MAINTENANCE_MODE = True
    elif _MAINTENANCE_ENV_MODE in _MAINTENANCE_DISABLED_VALUES:
        MAINTENANCE_MODE = False
    else:
        MAINTENANCE_MODE = bool(_MAINTENANCE_FILE_CONFIG.get("active", False))

    if _MAINTENANCE_WORKFLOW_MANAGED:
        MAINTENANCE_MESSAGE = str(
            _MAINTENANCE_FILE_CONFIG.get("message", MAINTENANCE_DEFAULT_MESSAGE)
        ).strip()[:240]
        MAINTENANCE_UNTIL = str(_MAINTENANCE_FILE_CONFIG.get("until", "")).strip()[:64]
        try:
            _maintenance_retry_candidate = int(_MAINTENANCE_FILE_CONFIG.get("retryAfter", 900))
        except (TypeError, ValueError):
            _maintenance_retry_candidate = 900
        MAINTENANCE_RETRY_AFTER = min(86400, max(60, _maintenance_retry_candidate))
    else:
        MAINTENANCE_MESSAGE = os.environ.get(
            "MAINTENANCE_MESSAGE", MAINTENANCE_DEFAULT_MESSAGE
        ).strip()[:240]
        MAINTENANCE_UNTIL = os.environ.get("MAINTENANCE_UNTIL", "").strip()[:64]
        MAINTENANCE_RETRY_AFTER = _bounded_env_int(
            "MAINTENANCE_RETRY_AFTER", 900, 60, 86400
        )
    MAINTENANCE_BLOCKED_PATHS = frozenset({
        "/info", "/download", "/thumbnail", "/convert",
    })


    POT_PROVIDER_URL, POT_PROVIDER_HOST, POT_PROVIDER_PORT = _load_pot_provider_config()

    # YENİ: connected_sids TTL temizlik süresi (1 saat)
    CONNECTED_SID_MAX_AGE = 3600
    # YENİ: cancel_events TTL temizlik süresi (1 saat)
    CANCEL_EVENT_MAX_AGE = 3600


    ALLOWED_ORIGINS = ["https://zenithw.space", "https://www.zenithw.space"]
    # A self-hosted Compose install is served through one explicit public origin.
    # Keep this opt-in so a typo cannot silently broaden CORS in production.
    SELF_HOSTED_ORIGIN = os.environ.get("SELF_HOSTED_ORIGIN", "").strip().rstrip("/")
    if SELF_HOSTED_ORIGIN:
        _self_hosted_origin = urlparse(SELF_HOSTED_ORIGIN)
        if (
            _self_hosted_origin.scheme not in {"http", "https"}
            or not _self_hosted_origin.netloc
            or _self_hosted_origin.path not in {"", "/"}
            or _self_hosted_origin.params
            or _self_hosted_origin.query
            or _self_hosted_origin.fragment
        ):
            raise RuntimeError("SELF_HOSTED_ORIGIN must be a plain http(s) origin")
        ALLOWED_ORIGINS.append(SELF_HOSTED_ORIGIN)
    if os.environ.get("FLASK_ENV") == "development":
        ALLOWED_ORIGINS += ["http://localhost:5000", "http://127.0.0.1:3000"]


    DOWNLOAD_DIR = str(download_dir) if download_dir is not None else "./downloads"


    YTDLP_CACHE_DIR = os.path.join(DOWNLOAD_DIR, ".yt-dlp-cache")


    COOKIES_FILE = os.path.join(BACKEND_ROOT, "cookies.txt")

    # YouTube can correlate an exported browser session with the browser profile
    # that created it. Keep this override separate so production can use the
    # current User-Agent of the browser that produced cookies.txt without
    # changing requests made to other platforms.
    DEFAULT_USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    YOUTUBE_USER_AGENT = os.environ.get("YOUTUBE_USER_AGENT", "").strip() or DEFAULT_USER_AGENT


    ENABLE_ORIGIN_LOCK = os.environ.get("ENABLE_ORIGIN_LOCK", "1") != "0"

    CLOUDFLARE_IPV4 = [
        "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22",
        "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
        "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22",
        "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
        "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
    ]
    CLOUDFLARE_IPV6 = [
        "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32",
        "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29",
        "2c0f:f248::/32",
    ]
    _CF_NETWORKS = [ipaddress.ip_network(n) for n in CLOUDFLARE_IPV4 + CLOUDFLARE_IPV6]

    ORIGIN_SECRET_HEADER = "X-Origin-Verify"
    ORIGIN_SECRET_VALUE = os.environ.get("ORIGIN_SECRET", "")
    if ORIGIN_SECRET_VALUE.startswith("replace-with-"):
        raise RuntimeError("ORIGIN_SECRET must be replaced with a generated secret")
    DIAGNOSTICS_TOKEN = os.environ.get("DIAGNOSTICS_TOKEN", "").strip()
    ORIGIN_LOCK_DEV_BYPASS = (
        os.environ.get("FLASK_ENV") == "development"
        and _env_flag("ALLOW_INSECURE_ORIGIN_LOCK")
    )


    if ENABLE_ORIGIN_LOCK and not ORIGIN_SECRET_VALUE:
        if ORIGIN_LOCK_DEV_BYPASS:
            logger.warning("[INIT] Origin lock is running without ORIGIN_SECRET (development override)")
        else:
            raise RuntimeError(
                "ORIGIN_SECRET environment variable is required when ENABLE_ORIGIN_LOCK is enabled. "
                "Set it in the origin and Cloudflare, disable ENABLE_ORIGIN_LOCK explicitly, or use "
                "ALLOW_INSECURE_ORIGIN_LOCK=1 only for local development."
            )

    return SimpleNamespace(
        ALLOWED_ORIGINS=ALLOWED_ORIGINS,
        API_JSON_PATHS=API_JSON_PATHS,
        CANCEL_EVENT_MAX_AGE=CANCEL_EVENT_MAX_AGE,
        CANCEL_RATE_LIMIT_MAX_REQUESTS=CANCEL_RATE_LIMIT_MAX_REQUESTS,
        CANCEL_RATE_LIMIT_WINDOW=CANCEL_RATE_LIMIT_WINDOW,
        CLOUDFLARE_IPV4=CLOUDFLARE_IPV4,
        CLOUDFLARE_IPV6=CLOUDFLARE_IPV6,
        CONNECTED_SID_MAX_AGE=CONNECTED_SID_MAX_AGE,
        CONVERSION_RATE_LIMIT_MAX_REQUESTS=CONVERSION_RATE_LIMIT_MAX_REQUESTS,
        CONVERSION_RATE_LIMIT_WINDOW=CONVERSION_RATE_LIMIT_WINDOW,
        CONVERT_SPOOL_RESERVATION_BYTES=CONVERT_SPOOL_RESERVATION_BYTES,
        COOKIES_FILE=COOKIES_FILE,
        DEFAULT_USER_AGENT=DEFAULT_USER_AGENT,
        DIAGNOSTICS_TOKEN=DIAGNOSTICS_TOKEN,
        DOWNLOAD_DIR=DOWNLOAD_DIR,
        DOWNLOAD_SPOOL_RESERVATION_BYTES=DOWNLOAD_SPOOL_RESERVATION_BYTES,
        DOWNLOAD_TIMEOUT_SECONDS=DOWNLOAD_TIMEOUT_SECONDS,
        ENABLE_ORIGIN_LOCK=ENABLE_ORIGIN_LOCK,
        FFMPEG_THREADS=FFMPEG_THREADS,
        FFMPEG_TIMEOUT=FFMPEG_TIMEOUT,
        FILE_CLEANUP_INTERVAL=FILE_CLEANUP_INTERVAL,
        FILE_MAX_AGE=FILE_MAX_AGE,
        INFO_CACHE_MAX_SIZE=INFO_CACHE_MAX_SIZE,
        INFO_CACHE_TTL_SECONDS=INFO_CACHE_TTL_SECONDS,
        INFO_RATE_LIMIT_MAX_REQUESTS=INFO_RATE_LIMIT_MAX_REQUESTS,
        INFO_TIMEOUT_SECONDS=INFO_TIMEOUT_SECONDS,
        MAINTENANCE_BLOCKED_PATHS=MAINTENANCE_BLOCKED_PATHS,
        MAINTENANCE_CONFIG_PATH=MAINTENANCE_CONFIG_PATH,
        MAINTENANCE_DEFAULT_MESSAGE=MAINTENANCE_DEFAULT_MESSAGE,
        MAINTENANCE_MESSAGE=MAINTENANCE_MESSAGE,
        MAINTENANCE_MODE=MAINTENANCE_MODE,
        MAINTENANCE_RETRY_AFTER=MAINTENANCE_RETRY_AFTER,
        MAINTENANCE_UNTIL=MAINTENANCE_UNTIL,
        MAX_API_JSON_BYTES=MAX_API_JSON_BYTES,
        MAX_CONCURRENT_CONVERSIONS=MAX_CONCURRENT_CONVERSIONS,
        MAX_CONCURRENT_DOWNLOADS=MAX_CONCURRENT_DOWNLOADS,
        MAX_CONCURRENT_INFO=MAX_CONCURRENT_INFO,
        MAX_CONCURRENT_PER_IP=MAX_CONCURRENT_PER_IP,
        MAX_CONCURRENT_THUMBNAILS=MAX_CONCURRENT_THUMBNAILS,
        MAX_CONCURRENT_TRANSFERS=MAX_CONCURRENT_TRANSFERS,
        MAX_CONCURRENT_TRANSFERS_PER_IP=MAX_CONCURRENT_TRANSFERS_PER_IP,
        MAX_CONVERT_OUTPUT_SIZE_BYTES=MAX_CONVERT_OUTPUT_SIZE_BYTES,
        MAX_DOWNLOAD_QUEUE=MAX_DOWNLOAD_QUEUE,
        MAX_DOWNLOAD_SIZE_BYTES=MAX_DOWNLOAD_SIZE_BYTES,
        MAX_QUEUE_WAIT_SECONDS=MAX_QUEUE_WAIT_SECONDS,
        MAX_SOCKET_CONNECTIONS=MAX_SOCKET_CONNECTIONS,
        MAX_SOCKET_CONNECTIONS_PER_IP=MAX_SOCKET_CONNECTIONS_PER_IP,
        MAX_SPOOL_SIZE_BYTES=MAX_SPOOL_SIZE_BYTES,
        MAX_THUMBNAIL_BYTES=MAX_THUMBNAIL_BYTES,
        MAX_TRANSCODE_DURATION_SECONDS=MAX_TRANSCODE_DURATION_SECONDS,
        MAX_TRANSFER_QUEUE=MAX_TRANSFER_QUEUE,
        MAX_TRANSFER_QUEUE_PER_IP=MAX_TRANSFER_QUEUE_PER_IP,
        MAX_UPLOAD_SIZE_BYTES=MAX_UPLOAD_SIZE_BYTES,
        MAX_VIDEO_DURATION_SECONDS=MAX_VIDEO_DURATION_SECONDS,
        MIN_FREE_DISK_BYTES=MIN_FREE_DISK_BYTES,
        ORIGIN_LOCK_DEV_BYPASS=ORIGIN_LOCK_DEV_BYPASS,
        ORIGIN_SECRET_HEADER=ORIGIN_SECRET_HEADER,
        ORIGIN_SECRET_VALUE=ORIGIN_SECRET_VALUE,
        PLAYLIST_LIMIT=PLAYLIST_LIMIT,
        POT_PROVIDER_HOST=POT_PROVIDER_HOST,
        POT_PROVIDER_PORT=POT_PROVIDER_PORT,
        POT_PROVIDER_URL=POT_PROVIDER_URL,
        PREPARED_FILE_TTL=PREPARED_FILE_TTL,
        PROGRESS_EMIT_INTERVAL=PROGRESS_EMIT_INTERVAL,
        PROXY_HOPS=PROXY_HOPS,
        RATE_LIMIT_CLEANUP_INTERVAL=RATE_LIMIT_CLEANUP_INTERVAL,
        RATE_LIMIT_MAX_REQUESTS=RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_WINDOW=RATE_LIMIT_WINDOW,
        SECRET_KEY=SECRET_KEY,
        SELF_HOSTED_ORIGIN=SELF_HOSTED_ORIGIN,
        THUMBNAIL_RATE_LIMIT_MAX_REQUESTS=THUMBNAIL_RATE_LIMIT_MAX_REQUESTS,
        THUMBNAIL_TIMEOUT_SECONDS=THUMBNAIL_TIMEOUT_SECONDS,
        TRANSFER_QUEUE_WAIT_SECONDS=TRANSFER_QUEUE_WAIT_SECONDS,
        TRUST_PROXY=TRUST_PROXY,
        YOUTUBE_DOWNLOADS_GLOBAL=YOUTUBE_DOWNLOADS_GLOBAL,
        YOUTUBE_DOWNLOADS_PER_IP=YOUTUBE_DOWNLOADS_PER_IP,
        YOUTUBE_INFO_GLOBAL=YOUTUBE_INFO_GLOBAL,
        YOUTUBE_INFO_PER_IP=YOUTUBE_INFO_PER_IP,
        YOUTUBE_RATE_LIMIT_WINDOW=YOUTUBE_RATE_LIMIT_WINDOW,
        YOUTUBE_REPEAT_COOLDOWN_SECONDS=YOUTUBE_REPEAT_COOLDOWN_SECONDS,
        YOUTUBE_USER_AGENT=YOUTUBE_USER_AGENT,
        YOUTUBE_WEB_ENABLED=YOUTUBE_WEB_ENABLED,
        YTDLP_CACHE_DIR=YTDLP_CACHE_DIR,
        _CF_NETWORKS=_CF_NETWORKS,
        _MAINTENANCE_DISABLED_VALUES=_MAINTENANCE_DISABLED_VALUES,
        _MAINTENANCE_ENABLED_VALUES=_MAINTENANCE_ENABLED_VALUES,
        _MAINTENANCE_ENV_MODE=_MAINTENANCE_ENV_MODE,
        _MAINTENANCE_FILE_CONFIG=_MAINTENANCE_FILE_CONFIG,
        _MAINTENANCE_WORKFLOW_MANAGED=_MAINTENANCE_WORKFLOW_MANAGED,
    )
