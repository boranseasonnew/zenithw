"""Direct-thumbnail streams obey a total deadline, not just socket inactivity."""
import io
import logging
import os
import tempfile
import time
import unittest
import uuid
from email.message import Message
from urllib.request import Request

import gevent
from flask import Flask, jsonify, send_file
from test_security_boundaries import load_function


class ThumbnailDeadlineTests(unittest.TestCase):
    def run_download(self, timeout, read_delay=0, chunks=None):
        with tempfile.TemporaryDirectory() as directory:
            app = Flask(__name__)
            headers = Message()
            headers['Content-Type'] = 'image/jpeg'
            stream = io.BytesIO(chunks or b'jpeg fixture')
            calls = []
            closed = []

            class Upstream:
                def __enter__(self):
                    return self
                def __exit__(self, *args):
                    closed.append(True)
                def read(self, size):
                    calls.append(size)
                    if read_delay:
                        gevent.sleep(read_delay)
                    return stream.read(min(size, 2))

            upstream = Upstream()
            upstream.headers = headers
            namespace = {
                'uuid': uuid, 'time': time, 'os': os, 'gevent': gevent,
                'UrlRequest': Request, 'THUMBNAIL_TIMEOUT_SECONDS': timeout,
                'MAX_THUMBNAIL_BYTES': 1024, 'DOWNLOAD_DIR': directory,
                'open_http_resource': lambda *args, **kwargs: upstream,
                '_register_cleanup': lambda path: None,
                '_force_cleanup': lambda path: os.unlink(path) if os.path.exists(path) else None,
                'send_file': send_file, 'jsonify': jsonify, 'logger': logging.getLogger('thumbnail-test'),
                '_redact_log_text': lambda text: text,
                'public_error_payload': lambda *args: {'error_code': 'request_timeout'},
            }
            download = load_function('download_thumbnail_from_url', namespace)
            start = time.monotonic()
            with app.test_request_context():
                response = download('https://example.test/cover.jpg')
                elapsed = time.monotonic() - start
                if isinstance(response, tuple):
                    response, status = response
                else:
                    status = response.status_code
                if status == 200:
                    body = b''.join(response.response)
                else:
                    body = response.get_json()
                response.close()
            return status, body, elapsed, calls, closed, os.listdir(directory)

    def test_normal_thumbnail_still_downloads_and_cleans_up(self):
        status, body, _, _, closed, files = self.run_download(2)
        self.assertEqual(status, 200)
        self.assertEqual(body, b'jpeg fixture')
        self.assertTrue(closed)
        self.assertEqual(files, [])

    def test_trickling_source_cannot_extend_the_total_deadline(self):
        status, body, elapsed, calls, closed, files = self.run_download(.03, .01, b'x' * 200)
        self.assertEqual(status, 400)
        self.assertEqual(body['error_code'], 'request_timeout')
        self.assertLess(elapsed, .5)
        self.assertLess(len(calls), 10)
        self.assertTrue(closed)
        self.assertEqual(files, [])


if __name__ == '__main__':
    unittest.main()
