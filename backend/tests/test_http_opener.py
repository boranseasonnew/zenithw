from source_support import load_function
from pathlib import Path
import unittest
from urllib.parse import urlparse
from urllib.request import (Request as UrlRequest, OpenerDirector, ProxyHandler,
                            HTTPHandler, HTTPSHandler, HTTPDefaultErrorHandler,
                            HTTPRedirectHandler, HTTPErrorProcessor)

class HttpOpenerSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.open_resource = staticmethod(load_function("open_http_resource", globals().copy()))
    def test_local_file_and_ftp_schemes_are_rejected_before_io(self):
        for url in ['file:///etc/passwd','file:///C:/Windows/win.ini','ftp://example.test/file','data:text/plain,secret']:
            with self.subTest(url=url), self.assertRaisesRegex(ValueError,'HTTP'):
                self.open_resource(UrlRequest(url),timeout=1)
