"""Application composition and extension registration."""
# Patch before importing socket, threading, HTTP clients or service modules.
from gevent import monkey
monkey.patch_all()

import logging
import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from werkzeug.middleware.proxy_fix import ProxyFix
from zenith.config import BACKEND_ROOT, load_settings
from zenith.runtime import Runtime
from zenith.routes.media import create_media_blueprint
from zenith.routes.files import create_files_blueprint
from zenith.security.network import install_network_guards, bind_request_policy, release_request_policy


def create_app(*, start_background=True, download_dir=None):
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
    for name in ("engineio", "socketio", "werkzeug"):
        logging.getLogger(name).setLevel(logging.WARNING)
    settings = load_settings(download_dir=download_dir)
    # Flask resolves relative send_file paths from root_path. Keep the original
    # backend root even though the factory now lives one package deeper.
    app = Flask("app", root_path=BACKEND_ROOT, static_folder=None)
    app.config.update(
        SECRET_KEY=settings.SECRET_KEY,
        MAX_CONTENT_LENGTH=settings.MAX_UPLOAD_SIZE_BYTES,
        MAX_FORM_MEMORY_SIZE=256 * 1024,
        MAX_FORM_PARTS=8,
    )
    if settings.TRUST_PROXY:
        app.wsgi_app = ProxyFix(
            app.wsgi_app, x_for=settings.PROXY_HOPS,
            x_proto=settings.PROXY_HOPS, x_host=settings.PROXY_HOPS,
            x_port=0, x_prefix=0,
        )
    CORS(app, resources={r"/*": {"origins": settings.ALLOWED_ORIGINS}})
    socketio = SocketIO()
    socketio.init_app(
        app, cors_allowed_origins=settings.ALLOWED_ORIGINS,
        async_mode="gevent", max_http_buffer_size=64 * 1024,
    )
    os.makedirs(settings.DOWNLOAD_DIR, exist_ok=True)
    os.makedirs(settings.YTDLP_CACHE_DIR, exist_ok=True)
    runtime = Runtime(app, socketio, settings)
    app.extensions["zenith"] = runtime
    install_network_guards()
    app.before_request(lambda: bind_request_policy(runtime.network))
    app.teardown_request(release_request_policy)
    for handler in (
        runtime.security._enforce_cloudflare_origin,
        runtime.security._limit_api_json_body,
        runtime.security._enforce_maintenance_mode,
        runtime.security._limit_concurrent_requests_per_ip,
    ):
        app.before_request(handler)
    app.teardown_request(runtime.security._release_concurrent_request_per_ip)
    app.after_request(runtime.system.prevent_api_indexing)
    app.register_error_handler(404, runtime.system.not_found)
    app.register_error_handler(413, runtime.system.request_too_large)
    app.register_blueprint(create_media_blueprint(runtime))
    app.register_blueprint(create_files_blueprint(runtime))
    for path, endpoint in (
        ("/", "api_root"), ("/health", "health"), ("/ready", "readiness"),
        ("/status", "public_status"), ("/diagnostics", "diagnostics"),
        ("/robots.txt", "robots"),
    ):
        app.add_url_rule(path, endpoint, getattr(runtime.system, endpoint))
    app.add_url_rule("/cancel", "cancel_route", runtime.system.cancel_route, methods=["POST"])
    if os.environ.get("FLASK_ENV") == "development":
        app.add_url_rule("/debug-headers", "debug_headers", runtime.system.debug_headers)
    socketio.on_event("connect", runtime.jobs.on_connect)
    socketio.on_event("disconnect", runtime.jobs.on_disconnect)
    if start_background:
        runtime.start_background_tasks()
    return app
