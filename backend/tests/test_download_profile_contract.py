"""Contracts for the quick download profiles exposed by the frontend."""

import ast
from pathlib import Path
import threading
import unittest


ROOT = Path(__file__).resolve().parents[2]
APP_SOURCE = (ROOT / "backend" / "app.py").read_text(encoding="utf-8")
FRONTEND_SOURCE = (ROOT / "frontend" / "app.d4596317c4a7.js").read_text(encoding="utf-8")
SETTINGS_SOURCE = (ROOT / "frontend" / "settings.html").read_text(encoding="utf-8")


def load_function(name, namespace):
    tree = ast.parse(APP_SOURCE)
    node = next(item for item in tree.body if isinstance(item, ast.FunctionDef) and item.name == name)
    exec(compile(ast.Module(body=[node], type_ignores=[]), "app.py", "exec"), namespace)
    return namespace[name]


class DownloadProfileContractTests(unittest.TestCase):
    def test_quality_profile_keeps_its_promised_format_contract(self):
        self.assertIn("quality:{quality:'2160',codec:'av1',vfmt:'webm',afmt:'opus',audioQ:'192'}", FRONTEND_SOURCE)
        self.assertIn("data-profile=\"quality\"", SETTINGS_SOURCE)

    def test_opus_audio_profile_honours_the_selected_bitrate(self):
        self.assertIn('fmt in ("mp3", "ogg", "m4a", "opus")', APP_SOURCE)

    def test_youtube_adaptive_policy_is_server_side_and_queue_aware(self):
        namespace = {
            "queue_lock": threading.Lock(),
            "active_downloads_count": 1,
            "queue_waiting": 0,
            "is_youtube": lambda url: "youtube.com" in url,
        }
        choose = load_function("choose_youtube_adaptive_quality", namespace)
        self.assertEqual(choose("https://youtube.com/watch?v=x", "2160", enabled=True, is_audio=False), ("1080", "1080p-idle"))
        self.assertEqual(choose("https://youtube.com/watch?v=x", "2160", enabled=False, is_audio=False), ("1080", "1080p-idle"))
        namespace["active_downloads_count"] = 2
        self.assertEqual(choose("https://youtube.com/watch?v=x", "2160", enabled=True, is_audio=False), ("720", "720p-busy"))
        self.assertEqual(choose("https://youtube.com/watch?v=x", "2160", enabled=True, is_audio=True), ("2160", "off"))
        self.assertEqual(choose("https://example.com/video", "2160", enabled=True, is_audio=False), ("2160", "off"))
        self.assertIn('youtube_adaptive_quality:!!S.youtubeAdaptiveQuality', FRONTEND_SOURCE)

    def test_youtube_quality_fallback_never_escapes_the_selected_cap(self):
        namespace = {"AUDIO_FMTS": {"mp3"}, "is_youtube": lambda url: True}
        build = load_function("build_format_str", namespace)
        selector = build("https://youtube.com/watch?v=x", "720", "mp4", "h264")
        self.assertNotIn("/bestvideo+bestaudio/best", selector)
        self.assertFalse(selector.endswith("/best"))
        self.assertTrue(all("height<=720" in choice for choice in selector.split("/")))

    def test_selected_dimensions_use_the_real_video_stream(self):
        dimensions = load_function("selected_video_dimensions", {})
        info = {
            "width": 1920,
            "height": 1080,
            "requested_formats": [
                {"vcodec": "avc1", "width": 1280, "height": 720},
                {"vcodec": "none", "width": None, "height": None},
            ],
        }
        self.assertEqual(dimensions(info), (1280, 720))

    def test_profile_changes_are_persisted_and_revert_to_custom_after_manual_choice(self):
        self.assertIn("downloadProfile:'custom'", FRONTEND_SOURCE)
        self.assertIn("if(PROFILE_FIELDS.includes(key))S.downloadProfile='custom'", FRONTEND_SOURCE)


if __name__ == "__main__":
    unittest.main()
