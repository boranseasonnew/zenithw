"""Public media URL contracts; execution stays in dedicated services."""
from flask import Blueprint


def create_media_blueprint(runtime):
    blueprint = Blueprint("media", __name__)
    for path, endpoint, handler in (
        ("/info", "get_info", runtime.metadata.get_info),
        ("/download", "download", runtime.downloads.download),
        ("/thumbnail", "download_thumbnail", runtime.thumbnails.download_thumbnail),
        ("/convert", "convert_file", runtime.conversion.convert_file),
    ):
        blueprint.add_url_rule(path, endpoint, handler, methods=["POST"])
    return blueprint
