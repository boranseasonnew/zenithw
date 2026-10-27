import ast
from pathlib import Path
import unittest
from urllib.parse import urlparse
from urllib.request import (Request as UrlRequest, OpenerDirector, ProxyHandler,
                            HTTPHandler, HTTPSHandler, HTTPDefaultErrorHandler,
                            HTTPRedirectHandler, HTTPErrorProcessor)

class HttpOpenerSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree=ast.parse((Path(__file__).parents[1]/'app.py').read_text(encoding='utf-8'))
        node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='open_http_resource')
        scope=globals().copy()
        exec(compile(ast.Module(body=[node],type_ignores=[]),'<http-opener>','exec'),scope)
        cls.open_resource=staticmethod(scope['open_http_resource'])
    def test_local_file_and_ftp_schemes_are_rejected_before_io(self):
        for url in ['file:///etc/passwd','file:///C:/Windows/win.ini','ftp://example.test/file','data:text/plain,secret']:
            with self.subTest(url=url), self.assertRaisesRegex(ValueError,'HTTP'):
                self.open_resource(UrlRequest(url),timeout=1)
