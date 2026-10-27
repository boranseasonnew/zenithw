"""Static contracts for the local FFmpeg converter format catalogue."""

import ast
from html.parser import HTMLParser
import unittest
from pathlib import Path


APP_PATH = Path(__file__).resolve().parents[1] / "app.py"
APP_SOURCE = APP_PATH.read_text(encoding="utf-8")
APP_TREE = ast.parse(APP_SOURCE, filename=str(APP_PATH))
FRONTEND_DIR = APP_PATH.parents[1] / "frontend"
CONVERT_PAGE = (FRONTEND_DIR / "convert.html").read_text(encoding="utf-8")
REMUX_PAGE = (FRONTEND_DIR / "remux.html").read_text(encoding="utf-8")


def assigned_set(name):
    node = next(
        item for item in APP_TREE.body
        if isinstance(item, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == name for target in item.targets)
    )
    return ast.literal_eval(node.value)


def function_source(name):
    node = next(
        item for item in APP_TREE.body
        if isinstance(item, ast.FunctionDef) and item.name == name
    )
    return ast.get_source_segment(APP_SOURCE, node)


class ConverterFormatContractTests(unittest.TestCase):
    def test_backend_exposes_the_complete_local_format_catalogue(self):
        expected = {
            "mp3", "m4a", "aac", "opus", "ogg", "flac", "wav", "aiff", "wma",
            "mp4", "webm", "mkv", "mov", "avi", "m4v", "3gp", "ts", "wmv",
        }
        self.assertEqual(assigned_set("ALLOWED_CONVERT_FORMATS"), expected)

    def test_new_formats_have_explicit_ffmpeg_encode_paths(self):
        source = function_source("convert_file_with_slot")
        for target in ("aac", "aiff", "wma", "m4v", "3gp", "ts", "wmv"):
            self.assertIn(f"target_format == '{target}'", source)

    def test_converter_and_remux_only_advertise_server_supported_formats(self):
        supported = assigned_set("ALLOWED_CONVERT_FORMATS")
        class FormatOptions(HTMLParser):
            def __init__(self):
                super().__init__()
                self.in_formats = False
                self.values = set()
            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if tag == 'select':
                    self.in_formats = attrs.get('id') == 'convFormat'
                if tag == 'option' and self.in_formats:
                    self.values.add(attrs.get('value'))
            def handle_endtag(self, tag):
                if tag == 'select':
                    self.in_formats = False
        options = FormatOptions()
        options.feed(CONVERT_PAGE)
        self.assertEqual(options.values, supported)
        self.assertIn("aiff", REMUX_PAGE)
        self.assertIn("wmv", REMUX_PAGE)


if __name__ == "__main__":
    unittest.main()
