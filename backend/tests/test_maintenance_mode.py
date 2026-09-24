import ast
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch


APP_PATH = Path(__file__).resolve().parents[1] / "app.py"
APP_TREE = ast.parse(APP_PATH.read_text(encoding="utf-8"))


def load_function(name, namespace):
    node = next(
        item for item in APP_TREE.body
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and item.name == name
    )
    module = ast.Module(body=[node], type_ignores=[])
    exec(compile(module, str(APP_PATH), "exec"), namespace)
    return namespace[name]


class FakeApp:
    @staticmethod
    def before_request(function):
        return function


class FakeRequest:
    method = "POST"
    path = "/download"


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload
        self.status_code = 200
        self.headers = {}


class MaintenanceConfigTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.env_flag = staticmethod(load_function("_env_flag", {"os": os}))
        cls.bounded_int = staticmethod(load_function("_bounded_env_int", {"os": os}))

    def test_env_flag_accepts_only_explicit_enabled_values(self):
        with patch.dict(os.environ, {"TEST_MODE": " YeS "}, clear=False):
            self.assertTrue(self.env_flag("TEST_MODE"))
        with patch.dict(os.environ, {"TEST_MODE": "0"}, clear=False):
            self.assertFalse(self.env_flag("TEST_MODE", True))

    def test_retry_value_is_defaulted_and_clamped(self):
        with patch.dict(os.environ, {"TEST_RETRY": "invalid"}, clear=False):
            self.assertEqual(self.bounded_int("TEST_RETRY", 900, 60, 86400), 900)
        with patch.dict(os.environ, {"TEST_RETRY": "5"}, clear=False):
            self.assertEqual(self.bounded_int("TEST_RETRY", 900, 60, 86400), 60)

    def test_frontend_and_backend_workflow_configs_match(self):
        backend_config = json.loads(
            (APP_PATH.parent / "maintenance-config.json").read_text(encoding="utf-8")
        )
        frontend_config = json.loads(
            (APP_PATH.parents[1] / "frontend" / "maintenance-config.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(backend_config, frontend_config)
        self.assertIsInstance(backend_config["active"], bool)
        self.assertIsInstance(backend_config.get("title", ""), str)
        self.assertIsInstance(backend_config.get("message", ""), str)
        self.assertIsInstance(backend_config.get("until", ""), str)
        self.assertGreaterEqual(backend_config["retryAfter"], 60)


class MaintenanceGateTests(unittest.TestCase):
    def make_gate(self, enabled=True):
        namespace = {
            "app": FakeApp(),
            "request": FakeRequest(),
            "jsonify": FakeResponse,
            "MAINTENANCE_MODE": enabled,
            "MAINTENANCE_BLOCKED_PATHS": frozenset({
                "/info", "/download", "/thumbnail", "/convert",
            }),
            "MAINTENANCE_MESSAGE": "Bakım sürüyor",
            "MAINTENANCE_UNTIL": "",
            "MAINTENANCE_RETRY_AFTER": 900,
        }
        return load_function("_enforce_maintenance_mode", namespace), namespace["request"]

    def test_new_job_is_rejected_with_retryable_503(self):
        gate, request = self.make_gate()
        request.method = "POST"
        request.path = "/download"
        response = gate()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.payload["error_code"], "maintenance")
        self.assertEqual(response.headers["Retry-After"], "900")
        self.assertEqual(response.headers["Cache-Control"], "no-store, max-age=0")

    def test_existing_transfer_and_cancel_routes_remain_available(self):
        gate, request = self.make_gate()
        for path in ("/files/token", "/cancel", "/health"):
            request.method = "POST"
            request.path = path
            self.assertIsNone(gate(), path)

    def test_disabled_mode_and_preflight_pass_through(self):
        gate, request = self.make_gate(enabled=False)
        self.assertIsNone(gate())
        gate, request = self.make_gate(enabled=True)
        request.method = "OPTIONS"
        self.assertIsNone(gate())


if __name__ == "__main__":
    unittest.main()
