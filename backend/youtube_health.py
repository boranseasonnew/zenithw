"""Bounded, process-local YouTube routing and privacy-safe observations."""
import os
import time
from collections import Counter
from contextlib import contextmanager
from threading import RLock


def classify(error):
    text = str(error).lower()
    for category, tokens in (
        ("rate_limit", ("429", "too many requests")),
        ("bot", ("not a bot", "confirm you're", "confirm you’re")),
        ("restricted", ("private video", "age-restricted", "not available in your country")),
        ("login", ("sign in", "login_required", "login required")),
        ("cookie", ("cookie",)),
        ("unavailable", ("video unavailable", "video is unavailable", "removed")),
        ("po_token", ("po token", "po_token", "proof of origin")),
        ("media_403", ("403", "forbidden")),
        ("format", ("requested format", "no video formats", "only images")),
        ("timeout", ("timed out", "timeout", "deadline")),
    ):
        if any(token in text for token in tokens):
            return category
    return "other"


class YouTubeHealth:
    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.lock = RLock()
        self.cookie_until = 0
        self.upstream_until = 0
        self.cooldowns = {}
        self.counts = Counter()
        self.last_success = {}
        self.cookie_stamp = None

    @staticmethod
    def profile(opts):
        clients = opts.get("extractor_args", {}).get("youtube", {}).get("player_client", ["default"])
        return ",".join(clients) + (":cookies" if opts.get("cookiefile") else ":anonymous")

    def order(self, profiles):
        with self.lock:
            now = self.clock()
            # A replacement cookie file immediately clears stale session state.
            path = next((p.get("cookiefile") for p in profiles if p.get("cookiefile")), None)
            try:
                stat = os.stat(path) if path else None
                stamp = (stat.st_mtime_ns, stat.st_size) if stat else None
            except OSError:
                stamp = None
            if stamp != self.cookie_stamp:
                self.cookie_stamp = stamp
                self.cooldowns = {k: v for k, v in self.cooldowns.items() if not k.endswith(":cookies")}
            available = [p for p in profiles if self.cooldowns.get(self.profile(p), 0) <= now]
            if not available:
                # Keep an option so the existing request error handler can
                # report the cooldown. observe() prevents the network call.
                return profiles[:1]
            if self.cookie_until > now:
                available.sort(key=lambda p: not bool(p.get("cookiefile")))
            return available

    @contextmanager
    def observe(self, opts, phase):
        key = self.profile(opts)
        started = self.clock()
        with self.lock:
            if self.upstream_until > started:
                raise RuntimeError("HTTP Error 429: YouTube upstream temporarily cooling down; retry later")
            if self.cooldowns.get(key, 0) > started:
                raise RuntimeError("HTTP Error 429: YouTube profile temporarily cooling down; retry later")
        try:
            yield
        except Exception as exc:
            category = classify(exc)
            with self.lock:
                self.counts[(phase, key, category)] += 1
                if category in ("bot", "login") and not opts.get("cookiefile"):
                    self.cookie_until = self.clock() + 1200
                if category in ("bot", "login", "cookie", "rate_limit"):
                    self.cooldowns[key] = self.clock() + (300 if category == "rate_limit" else 120)
                if category == "rate_limit":
                    # A real 429 applies to the shared AWS egress IP, not just
                    # one player profile. Avoid probing another profile until
                    # YouTube's temporary block has had time to cool down.
                    self.upstream_until = self.clock() + 300
            raise
        else:
            with self.lock:
                self.counts[(phase, key, "success")] += 1
                self.last_success[phase] = {"at": time.time(), "profile": key,
                                            "seconds": round(self.clock() - started, 3)}
                if opts.get("cookiefile"):
                    self.cookie_until = self.clock() + 1200

    def snapshot(self, cookie_path):
        try:
            stat = os.stat(cookie_path)
            cookie = {"present": stat.st_size > 0, "age_seconds": max(0, int(time.time() - stat.st_mtime))}
        except OSError:
            cookie = {"present": False, "age_seconds": None}
        with self.lock:
            return {"cookie": cookie, "cookie_preferred_seconds": max(0, int(self.cookie_until - self.clock())),
                    "upstream_cooldown_seconds": max(0, int(self.upstream_until - self.clock())),
                    "attempts": [{"phase": phase, "profile": profile, "outcome": outcome, "count": count}
                                 for (phase, profile, outcome), count in sorted(self.counts.items())],
                    "last_success": dict(self.last_success)}
