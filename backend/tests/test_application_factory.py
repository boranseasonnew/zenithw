"""Exercise real app composition in isolated processes (gevent patches globally)."""
import os
from pathlib import Path
import subprocess
import sys
import unittest


class ApplicationFactoryTests(unittest.TestCase):
    def run_scenario(self, name):
        script = Path(__file__).with_name("factory_scenarios.py")
        result = subprocess.run(
            [sys.executable, str(script), name], capture_output=True, text=True,
            timeout=45, cwd=script.parents[1], env={**os.environ, "PYTHONUTF8": "1"},
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_http_contracts_and_metadata_cache_use_real_service_wiring(self):
        self.run_scenario("http")

    def test_apps_keep_jobs_sockets_limits_cache_and_network_policy_isolated(self):
        self.run_scenario("isolation")

    def test_real_remux_prepared_transfer_and_cleanup_through_blueprints(self):
        self.run_scenario("conversion")
