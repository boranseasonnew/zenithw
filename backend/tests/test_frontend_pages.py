import unittest
from pathlib import Path


FRONTEND = Path(__file__).resolve().parents[2] / "frontend"


class StandaloneToolPageTests(unittest.TestCase):
    def test_navigation_tools_are_no_longer_embedded_in_index(self):
        source = (FRONTEND / "index.html").read_text(encoding="utf-8")
        for overlay_id in (
            "historyOverlay", "remuxOverlay", "convOverlay",
            "stOverlay", "donOverlay",
        ):
            self.assertNotIn(f'id="{overlay_id}"', source)
        self.assertIn('id="servicesOverlay"', source)
        for workflow_overlay in ("dlOverlay", "plQueueOverlay", "saveOverlay"):
            self.assertIn(f'id="{workflow_overlay}"', source)

    def test_hosted_youtube_links_are_routed_to_device_apps(self):
        index = (FRONTEND / "index.html").read_text(encoding="utf-8")
        app = (FRONTEND / "app.d4596317c4a7.js").read_text(encoding="utf-8")
        runtime = (FRONTEND / "runtime-config.js").read_text(encoding="utf-8")
        docker_runtime = (FRONTEND.parent / "docker/runtime-config.js").read_text(encoding="utf-8")

        self.assertIn('id="youtubeAppOverlay"', index)
        self.assertIn('href="/pc-app.html"', index)
        self.assertIn('href="/app.html"', index)
        self.assertIn("window.ZENITHW_YOUTUBE_WEB_ENABLED = false", runtime)
        self.assertIn("window.ZENITHW_YOUTUBE_WEB_ENABLED = true", docker_runtime)
        self.assertIn("shouldRouteYoutubeToApps(url)", app)
        self.assertIn("error_code:'youtube_app_required'", app)

    def test_every_tool_destination_keeps_shared_navigation(self):
        for filename in (
            "history.html", "convert.html", "remux.html",
            "settings.html", "support.html",
        ):
            with self.subTest(filename=filename):
                source = (FRONTEND / filename).read_text(encoding="utf-8")
                self.assertIn('id="siteBottomNav"', source)
                self.assertIn('src="site-shell.js?v=14.3"', source)

    def test_services_are_a_home_page_popover(self):
        source = (FRONTEND / "index.html").read_text(encoding="utf-8")
        self.assertIn('onclick="toggleServices()"', source)
        self.assertIn('class="services-popover"', source)
        self.assertFalse((FRONTEND / "services.html").exists())

    def test_hidden_desktop_promo_never_blocks_navigation(self):
        index = (FRONTEND / "index.html").read_text(encoding="utf-8")
        styles = (FRONTEND / "desktop-promo.css").read_text(encoding="utf-8")
        self.assertIn('id="desktopPromo" hidden', index)
        self.assertIn('.desktop-promo[hidden]{display:none!important;pointer-events:none!important}', styles)
        self.assertIn('.desktop-promo.is-visible{pointer-events:auto}', styles)

    def test_about_routes_use_native_about_pages_without_cross_root_rewrites(self):
        redirects = (FRONTEND / "_redirects").read_text(encoding="utf-8")
        for page in ("community", "privacy", "terms", "credit"):
            self.assertTrue((FRONTEND / "about" / f"{page}.html").is_file())
            self.assertNotIn(f"/about/{page}    /{page}.html    200", redirects)
            self.assertNotIn(f"/{page}.html    /about/{page}    301", redirects)

    def test_support_page_has_no_papara_details(self):
        source = (FRONTEND / "support.html").read_text(encoding="utf-8").lower()
        self.assertNotIn("papara", source)
        self.assertIn("instagram", source)
        self.assertIn("info@zenithw.space", source)

    def test_home_command_center_has_current_identity_and_modes(self):
        index = (FRONTEND / "index.html").read_text(encoding="utf-8")
        app = (FRONTEND / "app.d4596317c4a7.js").read_text(encoding="utf-8")
        self.assertIn('class="home-wordmark"', index)
        self.assertIn('id="homeStatusTxt"', index)
        self.assertIn('id="modeAuto"', index)
        self.assertIn('id="modeAudio"', index)
        self.assertIn('id="modeMute"', index)
        self.assertNotIn('id="modeVideo"', index)
        self.assertNotIn('class="home-activity"', index)
        self.assertNotIn('class="logo-wrap" onclick=', index)
        self.assertIn("['Auto','Audio','Mute']", app)
        self.assertIn("const payload=await res.json().catch", app)
        self.assertIn("showPublicError(payload,res.status,videoInfo.url,false)", app)

    def test_v14_4_release_is_current_and_previous_releases_are_preserved(self):
        version = (FRONTEND / "version.js").read_text(encoding="utf-8")
        updates = (FRONTEND / "updates-core.99daf4ea6088.js").read_text(encoding="utf-8")
        archive = (FRONTEND / "updates-archive.07c744021db2.js").read_text(encoding="utf-8")
        self.assertIn("ver: 'v14.4'", version)
        self.assertIn("YouTube daha akıllı, ilerleme daha net", updates)
        self.assertIn("const UPDATE_V14_3=", updates)
        self.assertIn("const UPDATE_V14_2=", updates)
        self.assertIn("Daha sakin, daha net, daha ZenithW", updates)
        self.assertIn("Railway’den AWS’ye: ZenithW artık kendi sunucusunda", updates)
        self.assertIn("['v14.4', 'v14.3', 'v14.2', 'v14.1', 'v14.0'", updates)
        self.assertIn("{ver:'v14.0',latest:false", archive)

    def test_settings_use_the_wide_workspace_layout(self):
        settings = (FRONTEND / "settings.html").read_text(encoding="utf-8")
        shell = (FRONTEND / "site-shell.css").read_text(encoding="utf-8")
        self.assertIn('class="theme-default tool-page settings-page mobile-settings-index"', settings)
        self.assertIn('id="appVersion"', settings)
        self.assertIn('id="stPageAccessibility"', settings)
        self.assertIn('id="stPageAdvanced"', settings)
        self.assertIn('id="mobileSettingsTitle"', settings)
        self.assertIn('data-v="default"', settings)
        self.assertIn('data-v="purple"', settings)
        for removed_theme in ("gray", "pink", "cobalt"):
            self.assertNotIn(f'data-v="{removed_theme}"', settings)
        self.assertIn("body.settings-page.tool-page", shell)
        self.assertIn(".settings-page.mobile-settings-index .st-content{display:none}", shell)

    def test_status_page_uses_public_runtime_status_fields(self):
        source = (FRONTEND / "status.html").read_text(encoding="utf-8")
        self.assertIn("fetch(`${API}/status`", source)
        self.assertIn("data.components", source)
        self.assertIn("components.media_processing", source)
        self.assertIn("components.job_intake", source)
        self.assertNotIn("cookies_loaded", source)
        self.assertNotIn("max_concurrent_downloads", source)
        self.assertNotIn("fetch(`${API}/health`", source)

    def test_public_docs_describe_the_current_aws_architecture(self):
        repository = FRONTEND.parent
        public_files = [
            repository / "README.md",
            repository / "README.tr.md",
            repository / "README.de.md",
            repository / "README.fr.md",
            repository / "README.ja.md",
            FRONTEND / "index.html",
            FRONTEND / "privacy.html",
            FRONTEND / "updates-archive.07c744021db2.js",
        ]
        combined = "\n".join(path.read_text(encoding="utf-8") for path in public_files)
        self.assertIn("Amazon EC2", combined)
        self.assertNotIn("Railway", combined)

    def test_converter_has_premium_standalone_workflow(self):
        source = (FRONTEND / "convert.html").read_text(encoding="utf-8")
        app = next(FRONTEND.glob("app.*.js")).read_text(encoding="utf-8")
        shell = (FRONTEND / "site-shell.css").read_text(encoding="utf-8")
        self.assertIn('class="theme-default tool-page convert-page"', source)
        self.assertIn('class="convert-stepper"', source)
        self.assertIn('class="action-btn convert-primary-btn"', source)
        self.assertIn('aria-pressed="true"', source)
        self.assertIn("document.querySelectorAll('.conv-modal .chip')", app)
        self.assertIn(".convert-page .tool-modal-body", shell)


if __name__ == "__main__":
    unittest.main()
