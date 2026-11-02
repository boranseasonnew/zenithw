"""Prepared file transfers retain their token, lease and owner checks."""
from flask import Blueprint


def create_files_blueprint(runtime):
    blueprint = Blueprint("files", __name__)
    blueprint.add_url_rule(
        "/files/<token>", "download_prepared_file", runtime.files.download_prepared_file
    )
    blueprint.add_url_rule(
        "/files/<token>/status", "prepared_transfer_status", runtime.files.prepared_transfer_status
    )
    return blueprint
