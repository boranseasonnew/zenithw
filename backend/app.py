"""Gunicorn-compatible entry point for the modular ZenithW backend."""
from zenith.factory import create_app
from zenith.config import _bounded_env_int

app = create_app()
socketio = app.extensions["zenith"].socketio

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", debug=False, port=_bounded_env_int("PORT", 5000, 1, 65535))
