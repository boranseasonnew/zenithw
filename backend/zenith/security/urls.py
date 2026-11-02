"""Shared security urls helpers."""
import ipaddress
from urllib.parse import urlparse

def _get_hostname(u):
    try:
        return (urlparse(u).hostname or "").lower()
    except Exception:
        return ""

def _hostname_matches(hostname, domain):
    return bool(hostname) and (hostname == domain or hostname.endswith("." + domain))

def is_youtube(u):
    h = _get_hostname(u)
    return _hostname_matches(h, "youtube.com") or _hostname_matches(h, "youtu.be")

def is_tiktok(u):
    return _hostname_matches(_get_hostname(u), "tiktok.com")

def is_instagram(u):
    return _hostname_matches(_get_hostname(u), "instagram.com")

def is_pornhub(u):
    h = _get_hostname(u)
    return any(_hostname_matches(h, domain) for domain in (
        "pornhub.com", "pornhub.net", "pornhub.org", "pornhubpremium.com",
    ))

def is_youtube_live_url(u): return is_youtube(u) and "/live/" in u

def is_unsupported_domain(u):
    h = _get_hostname(u)
    return any(_hostname_matches(h, d) for d in UNSUPPORTED_DOMAINS)

def _is_private_ip(ip_str):
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True
    # Python versions differ in how they classify IPv4-mapped IPv6 addresses.
    # Normalize them so ::ffff:127.0.0.1 is always treated as loopback/private.
    mapped_ipv4 = getattr(ip, "ipv4_mapped", None)
    if mapped_ipv4 is not None:
        ip = mapped_ipv4
    return (
        not ip.is_global or ip.is_loopback or ip.is_link_local or
        ip.is_multicast or ip.is_reserved or ip.is_unspecified
    )

UNSUPPORTED_DOMAINS = (
    "spotify.com", "music.apple.com", "deezer.com", "tidal.com",
    "music.amazon.com",
)
