"""Shared security errors helpers."""
from flask import jsonify
from zenith.security.urls import is_instagram, is_pornhub, is_tiktok, is_youtube

def classify_error(error_msg, url):
    """Map upstream/technical failures to stable codes safe for public clients."""
    es = str(error_msg or "").lower()
    if es.strip() in ("url required", "invalid or disallowed url."):
        return "invalid_url"
    if "unsupported url" in es or es.strip() == "this platform is not supported.":
        return "unsupported_url"
    if es.strip() == "live streams are not currently supported.":
        return "live_not_supported"
    if "playlist downloads are not supported" in es:
        return "playlist_not_supported"
    if "video too long" in es:
        return "video_too_long"
    if "timed out" in es or "timeout" in es:
        return "request_timeout"
    if is_youtube(url):
        if "private video" in es or ("private" in es and "video" in es):
            return "private_video"
        if "copyright" in es:
            return "copyright_restricted"
        if any(token in es for token in ("age-restricted", "age restricted", "confirm your age")):
            return "age_restricted"
        # "Requested format is not available" also contains "not available";
        # classify it before the generic unavailable-video branch.
        if "format" in es:
            return "format_unavailable"
        if "live" in es:
            return "live_not_supported"
        if "unavailable" in es or "not available" in es:
            return "video_unavailable"
        if any(token in es for token in ("sign in", "login", "bot", "403", "forbidden", "po token")):
            return "youtube_restricted"
        return "youtube_restricted"
    if is_instagram(url):
        if "rate" in es or "429" in es:
            return "instagram_ratelimit"
        if "login" in es or "private" in es:
            return "platform_restricted"
        return "platform_restricted"
    if is_tiktok(url):
        return "platform_restricted"
    if is_pornhub(url):
        # Pornhub frequently returns a generic connection/HTTP failure when
        # its page request is rejected. Keep the public response actionable
        # instead of exposing the generic retry-only message.
        return "platform_restricted"
    if "no video formats" in es or "requested format" in es:
        return "format_unavailable"
    if any(token in es for token in ("network", "connection", "403", "forbidden")):
        return "network_error"
    return "request_failed"

def parse_error(error_msg, url):
    code = classify_error(error_msg, url)
    if code == "instagram_ratelimit":
        return code  # Legacy frontend compatibility.
    return PUBLIC_ERROR_MESSAGES[code]

def public_error_payload(error_msg, url):
    code = classify_error(error_msg, url)
    return {
        "error": PUBLIC_ERROR_MESSAGES[code],
        "error_code": code,
    }

def validation_error_response(message):
    payload = {"error": str(message)}
    code = classify_error(message, "")
    if code != "request_failed":
        payload["error_code"] = code
    return jsonify(payload), 400

def is_cookie_configuration_error(error_text):
    """Distinguish cookie-file failures from YouTube's generic cookie advice.

    YouTube appends ``Use --cookies-from-browser or --cookies`` to ordinary
    bot/authentication errors.  Treating any message containing ``cookie`` as
    a broken cookie file makes the retry ladder spend anonymous profiles that
    cannot satisfy the authentication requirement.
    """
    text = str(error_text or "").lower()
    return any(token in text for token in (
        "failed to load cookies",
        "unable to load cookies",
        "failed to parse cookies",
        "invalid cookie file",
        "invalid cookies file",
        "cookie file not found",
        "cookies file not found",
        "could not open cookie",
        "unable to open cookie",
        "netscape format cookies file",
    ))

def remember_primary_error(primary_error, candidate):
    """Keep the first meaningful failure across cookie/cookieless fallbacks."""
    if primary_error is None:
        return candidate
    primary_text = str(primary_error).lower()
    candidate_text = str(candidate).lower()
    # A cookie-file parsing/config error is only about the first attempt; if
    # the cookieless fallback also fails, that later failure is more useful.
    if (is_cookie_configuration_error(primary_text)
            and not is_cookie_configuration_error(candidate_text)):
        return candidate
    return primary_error

def is_youtube_auth_required_error(error_text):
    """Return whether YouTube is explicitly asking for an authenticated session."""
    text = str(error_text or "").lower()
    return any(token in text for token in (
        "login",
        "sign in",
        "not a bot",
        "private",
        "age-restricted",
        "age restricted",
        "confirm your age",
    ))

def youtube_app_required_response():
    """Stop hosted YouTube work before contacting upstream and hand off to apps."""
    response = jsonify({
        "error": "YouTube downloads are temporarily unavailable on the website. Use a ZenithW device app.",
        "error_code": "youtube_app_required",
        "desktop_app_url": "/pc-app.html",
        "mobile_app_url": "/app.html",
    })
    response.status_code = 503
    response.headers["Cache-Control"] = "no-store, max-age=0"
    return response

def rate_limit_response(limiter, ip, message="Too many requests. Please wait a moment."):
    """Return a cache-safe, client-friendly quota response."""
    response = jsonify({"error": message, "error_code": "rate_limited"})
    response.status_code = 429
    response.headers["Retry-After"] = str(limiter.retry_after(ip))
    response.headers["Cache-Control"] = "no-store, max-age=0"
    return response

def service_busy(message, retry_after=10, status=503):
    response = jsonify({"error": message, "error_code": "server_busy"})
    response.status_code = status
    response.headers["Retry-After"] = str(retry_after)
    return response

PUBLIC_ERROR_MESSAGES = {
    "playlist_not_supported": "Playlist downloads are not supported. Select a single video.",
    "video_too_long": "This video is longer than the allowed limit.",
    "youtube_restricted": "YouTube did not allow this download. Please wait a few minutes and try again.",
    "private_video": "This video is private and cannot be downloaded.",
    "copyright_restricted": "This video cannot be downloaded due to a copyright restriction.",
    "age_restricted": "This video is age-restricted and cannot be accessed right now.",
    "format_unavailable": "The selected format is not available. Try another format or quality.",
    "video_unavailable": "This video is currently unavailable.",
    "live_not_supported": "Live streams are not currently supported.",
    "instagram_ratelimit": "Instagram is temporarily limiting requests. Please try again shortly.",
    "platform_restricted": "The platform did not allow this download. Please try again later.",
    "unsupported_url": "This link or platform is not supported.",
    "invalid_url": "Enter a valid public video page URL starting with https:// or http://.",
    "network_error": "A connection problem occurred. Please try again.",
    "request_timeout": "The request took too long. Please try again.",
    "request_failed": "The request could not be completed. Please try again.",
}
