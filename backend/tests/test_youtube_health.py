import tempfile
import unittest
from pathlib import Path
from youtube_health import YouTubeHealth, classify


def profile(cookie=False, client="default", path="/missing/cookies.txt"):
    return {"extractor_args": {"youtube": {"player_client": [client]}},
            **({"cookiefile": path} if cookie else {})}


class HealthTests(unittest.TestCase):
    def setUp(self):
        self.now = 1000
        self.health = YouTubeHealth(lambda: self.now)

    def fail(self, opts, error):
        with self.assertRaises(RuntimeError):
            with self.health.observe(opts, "metadata"):
                raise RuntimeError(error)

    def test_bot_error_with_cookie_advice_is_not_cookie_parse_error(self):
        self.assertEqual(classify("Sign in to confirm you're not a bot. Use --cookies"), "bot")

    def test_bot_failure_promotes_cookie_across_requests_and_expires(self):
        anonymous, cookie = profile(), profile(True)
        self.fail(anonymous, "Sign in to confirm you're not a bot")
        self.assertEqual(self.health.order([anonymous, cookie]), [cookie])
        self.now += 121
        self.assertEqual(self.health.order([anonymous, cookie]), [cookie, anonymous])
        self.now += 1200
        self.assertEqual(self.health.order([anonymous, cookie]), [anonymous, cookie])

    def test_replaced_cookie_clears_cookie_cooldown(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cookies.txt"
            path.write_text("first", encoding="utf-8")
            cookie, anonymous = profile(True, path=str(path)), profile()
            self.health.order([cookie, anonymous])
            self.fail(cookie, "invalid cookie file")
            self.assertEqual(self.health.order([cookie, anonymous]), [anonymous])
            path.write_text("replacement-session", encoding="utf-8")
            self.assertEqual(self.health.order([cookie, anonymous]), [cookie, anonymous])

    def test_cooldown_blocks_network_when_all_profiles_unhealthy(self):
        anonymous = profile()
        self.fail(anonymous, "HTTP Error 429")
        opts = self.health.order([anonymous])[0]
        reached_network = False
        with self.assertRaisesRegex(RuntimeError, "429"):
            with self.health.observe(opts, "download"):
                reached_network = True
        self.assertFalse(reached_network)
        self.now += 301
        with self.health.observe(opts, "download"):
            pass

    def test_video_specific_failure_does_not_disable_profile(self):
        anonymous = profile()
        self.fail(anonymous, "This video is unavailable")
        self.assertEqual(self.health.order([anonymous]), [anonymous])

    def test_metrics_separate_metadata_media_and_never_include_error_text(self):
        cookie = profile(True)
        with self.health.observe(cookie, "metadata"):
            pass
        self.fail(cookie, "HTTP Error 403 https://secret.invalid/?token=PRIVATE")
        with self.health.observe(cookie, "download"):
            pass
        snapshot = self.health.snapshot("/missing/cookies.txt")
        self.assertNotIn("PRIVATE", str(snapshot))
        self.assertEqual(set(snapshot["last_success"]), {"metadata", "download"})
        self.assertEqual(sum(row["count"] for row in snapshot["attempts"]), 3)


if __name__ == "__main__":
    unittest.main()
