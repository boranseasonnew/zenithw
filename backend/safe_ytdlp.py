"""Use guarded Python sockets, with an explicit public-IP-pinned curl adapter."""

from yt_dlp import YoutubeDL


class SafeYoutubeDL(YoutubeDL):
    def build_request_director(self, handlers, preferences=None):
        allowed = []
        for handler in handlers:
            if handler.RH_KEY in {"Urllib", "Requests", "Websockets"}:
                allowed.append(handler)
            elif handler.RH_KEY == "CurlCFFI" and self.params.get("zenith_public_impersonation"):
                from native_http import guarded_curl_handler
                allowed.append(guarded_curl_handler(handler))
        return super().build_request_director(allowed, preferences)
