"""Keep yt-dlp networking inside app.py's guarded Python sockets.

Native libcurl does not call Python's socket.connect. Until a native egress
boundary is available, impersonation handlers must not be selected, even by
an extractor or a fallback. Fail closed for newly installed handlers as well.
"""

from yt_dlp import YoutubeDL


class SafeYoutubeDL(YoutubeDL):
    def build_request_director(self, handlers, preferences=None):
        allowed = (handler for handler in handlers
                   if handler.RH_KEY in {"Urllib", "Requests", "Websockets"})
        return super().build_request_director(allowed, preferences)
