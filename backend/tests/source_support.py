"""Isolated legacy contracts against the actual modular source.

These tests inject existing fake collaborators without importing startup code.
Factory/HTTP/Socket.IO integration tests independently exercise real wiring.
"""
import ast
import copy
import functools
import re
from pathlib import Path

APP_PATH = Path(__file__).resolve().parents[1] / "app.py"
MODULE_PATHS = [APP_PATH, *sorted((APP_PATH.parent / "zenith").rglob("*.py"))]
APP_SOURCE = "\n\n".join(path.read_text(encoding="utf-8") for path in MODULE_PATHS)
APP_TREE = ast.parse(APP_SOURCE)
# Expose service methods to old isolated tests while retaining their real bodies.
APP_TREE.body.extend(
    method for node in list(APP_TREE.body) if isinstance(node, ast.ClassDef)
    for method in node.body if isinstance(method, ast.FunctionDef)
)


class Collaborators:
    def __init__(self, namespace):
        object.__setattr__(self, "namespace", namespace)

    def __getattr__(self, name):
        if name in {"runtime", "config", "security", "network", "jobs", "files", "engine",
                    "metadata", "downloads", "thumbnails", "conversion", "system"}:
            return self
        try:
            return self.namespace[name]
        except KeyError as error:
            raise AttributeError(name) from error

    def __setattr__(self, name, value):
        self.namespace[name] = value


def load_function(name, namespace):
    node = copy.deepcopy(next(item for item in APP_TREE.body
        if isinstance(item, ast.FunctionDef) and item.name == name))
    node.decorator_list = []
    module = ast.Module(body=[node], type_ignores=[])
    ast.fix_missing_locations(module)
    exec(compile(module, str(APP_PATH), "exec"), namespace)
    function = namespace[name]
    if node.args.args and node.args.args[0].arg == "self":
        function = functools.partial(function, Collaborators(namespace))
        function.__globals__ = namespace
        namespace[name] = function
    return function


def function_source(name):
    node = next(item for item in APP_TREE.body if isinstance(item, ast.FunctionDef) and item.name == name)
    source = ast.get_source_segment(APP_SOURCE, node)
    # Static legacy assertions describe safeguards, not collaborator spelling.
    # Executed tests above compile the unmodified body; do not normalize execution.
    source = re.sub(r"self\.runtime\.(?:config|security|network|jobs|files|engine|metadata|downloads|thumbnails|conversion|system)\.", "", source)
    source = source.replace("self.runtime.socketio", "socketio").replace("self.runtime.app", "app")
    fields = {name for name in re.findall(r"self\.([A-Za-z_]\w*)", source)}
    for field in fields:
        source = source.replace("self." + field, field)
    return source


def read_frontend_source():
    """Static guards inspect maintained source; browser tests cover bundling."""
    folder = APP_PATH.parents[1] / "shared" / "web-app"
    return re.sub(r"\bstate\.", "", "\n".join(
        path.read_text(encoding="utf-8") for path in sorted(folder.glob("*.mjs"))
    ))
