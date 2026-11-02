"""Shared services validation helpers."""
import os
import re
from zenith.security.urls import is_youtube
from zenith.services.formats import ALLOWED_INPUT_EXTS, AUDIO_FMTS

def build_format_str(url, quality, fmt, codec, mute=False):
    if fmt in AUDIO_FMTS:
        return "bestaudio/best"
    q = str(quality)
    best = (q == "9999")
    if is_youtube(url):
        if mute:
            height_filter = "" if best else f"[height<={q}]"
            if codec == "av1":
                return f"bestvideo[vcodec^=av01]{height_filter}/bestvideo{height_filter}"
            if codec == "vp9":
                return f"bestvideo[vcodec^=vp9]{height_filter}/bestvideo{height_filter}"
            return f"bestvideo[vcodec^=avc1]{height_filter}/bestvideo{height_filter}"
        if codec == "av1":
            if best:
                return ("bestvideo[vcodec^=av01]+bestaudio[acodec^=opus]"
                        "/bestvideo[vcodec^=av01]+bestaudio/bestvideo+bestaudio/best")
            return (f"bestvideo[vcodec^=av01][height<={q}]+bestaudio[acodec^=opus]"
                    f"/bestvideo[vcodec^=av01][height<={q}]+bestaudio"
                    f"/bestvideo[height<={q}]+bestaudio/best[height<={q}]")
        elif codec == "vp9":
            if best:
                return ("bestvideo[vcodec^=vp9]+bestaudio[acodec^=opus]"
                        "/bestvideo[vcodec^=vp9]+bestaudio/bestvideo+bestaudio/best")
            return (f"bestvideo[vcodec^=vp9][height<={q}]+bestaudio[acodec^=opus]"
                    f"/bestvideo[vcodec^=vp9][height<={q}]+bestaudio"
                    f"/bestvideo[height<={q}]+bestaudio/best[height<={q}]")
        else:
            if best:
                return "bestvideo+bestaudio/best"
            return (f"bestvideo[height<={q}]+bestaudio"
                    f"/best[height<={q}]")
    if best:
        return "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
    return (f"bestvideo[ext=mp4][height<={q}]+bestaudio[ext=m4a]"
            f"/bestvideo[height<={q}]+bestaudio/best[height<={q}]/best")

def sanitize_filename(name):
    """Dosya adı için güvenli string üretir."""
    if not name:
        return "zenithw"
    # Path traversal ve özel karakterleri temizle
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', name)
    name = re.sub(r'\s+', ' ', name).strip()
    name = name[:80]  # Maksimum uzunluk
    return name if name else "zenithw"

def safe_download_name(requested_name, fallback_stem, extension):
    stem = fallback_stem or "zenithw"
    if isinstance(requested_name, str) and requested_name.strip():
        stem = os.path.splitext(os.path.basename(requested_name.strip()))[0]
    return f"{sanitize_filename(stem)}.{extension}"

def safe_input_suffix(original_filename):
    ext = os.path.splitext(original_filename or "")[1].lower()
    if (
        ext in ALLOWED_INPUT_EXTS
        and ext.count('.') == 1
        and 2 <= len(ext) <= 5
        and all(c.isalnum() for c in ext[1:])
    ):
        return ext
    return ".bin"

def selected_video_dimensions(info):
    """Return the selected video stream dimensions, never the page thumbnail."""
    if not isinstance(info, dict):
        return None, None
    candidates = []
    for key in ("requested_formats", "requested_downloads"):
        for item in info.get(key) or ():
            if isinstance(item, dict) and item.get("vcodec") != "none":
                candidates.append(item)
    if not candidates and info.get("vcodec") != "none":
        candidates.append(info)
    dimensions = []
    for item in candidates:
        try:
            height = int(item.get("height") or 0)
            width = int(item.get("width") or 0)
        except (TypeError, ValueError):
            continue
        if height > 0:
            dimensions.append((height, width if width > 0 else None))
    if not dimensions:
        return None, None
    height, width = max(dimensions)
    return width, height
