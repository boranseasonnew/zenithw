"""Shared security logging helpers."""
import hashlib
import re
from urllib.parse import urlparse

_LOG_URL_RE = re.compile(r"https?://[^\s\"'<>]+", re.IGNORECASE)

_LOG_SECRET_RE = re.compile(
    r"(?i)(\b(?:token|sig|signature|auth|authorization|api[_-]?key|key)=)[^&\s,;]+"
)

def _safe_log_url(raw_url):
    """Return a useful URL label without credentials, query, or fragment."""
    try:
        parsed = urlparse(str(raw_url or ""))
    except Exception:
        return "[invalid-url]"
    hostname = (parsed.hostname or "").lower().rstrip(".")
    if not hostname:
        return "[invalid-url]"
    try:
        port = parsed.port
    except ValueError:
        port = None
    default_port = 443 if parsed.scheme == "https" else 80 if parsed.scheme == "http" else None
    authority = hostname if not port or port == default_port else f"{hostname}:{port}"
    path = parsed.path or "/"
    # Prepared download URLs are bearer-like capabilities. They are normally
    # never logged, but redact their token defensively if one reaches an
    # exception message or a third-party library diagnostic.
    path_parts = path.split("/")
    for index, segment in enumerate(path_parts[:-1]):
        candidate = path_parts[index + 1]
        if (
            segment == "files"
            and 40 <= len(candidate) <= 64
            and all(char.isalnum() or char in "_-" for char in candidate)
        ):
            path_parts[index + 1] = "[redacted]"
            break
    path = "/".join(path_parts)
    if len(path) > 96:
        path = f"{path[:64]}…#{hashlib.sha256(path.encode('utf-8', 'replace')).hexdigest()[:12]}"
    return f"{parsed.scheme or 'url'}://{authority}{path}"

def _redact_log_text(value):
    """Remove signed URLs and common credential parameters from journal text."""
    text = str(value or "")
    text = _LOG_URL_RE.sub(lambda match: _safe_log_url(match.group(0)), text)
    return _LOG_SECRET_RE.sub(r"\1[redacted]", text)
