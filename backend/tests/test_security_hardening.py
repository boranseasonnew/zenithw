"""Local regression tests: no production imports or external network traffic."""
import io
import threading
import time
import unittest
from collections import defaultdict
from flask import Flask, request, jsonify
from test_security_boundaries import load_function, APP_SOURCE, function_source

class ControlBodyTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['MAX_CONTENT_LENGTH'] = 96 * 1024 * 1024
        hook = load_function('_limit_api_json_body', {'request':request,'jsonify':jsonify,'MAX_API_JSON_BYTES':16384,'API_JSON_PATHS':frozenset(['/info','/download','/thumbnail','/cancel'])})
        self.app.before_request(hook)
        self.app.add_url_rule('/download', view_func=lambda:jsonify(request.get_json()),methods=['POST'])
        self.app.add_url_rule('/convert', endpoint='convert', view_func=lambda:str(len(request.get_data())),methods=['POST'])
        self.client = self.app.test_client()
    def test_large_declared_control_body_rejected(self):
        response=self.client.post('/download',data=b' '*17000,content_type='application/json')
        self.assertEqual(response.status_code,413)
    def test_unknown_length_stream_cannot_bypass_body_limit(self):
        stream=io.BytesIO(b'"'+b'a'*17000+b'"')
        response=self.client.open('/download',method='POST',environ_overrides={'CONTENT_LENGTH':'','wsgi.input':stream,'wsgi.input_terminated':True,'CONTENT_TYPE':'application/json'})
        self.assertIn(response.status_code,(400,413))
        self.assertLessEqual(stream.tell(),16384)
    def test_small_control_and_media_bodies_keep_working(self):
        self.assertEqual(self.client.post('/download',json={'url':'https://example.com/a'}).status_code,200)
        self.assertEqual(self.client.post('/convert',data=b'x'*20000).data,b'20000')

class TransferQueueTests(unittest.TestCase):
    def namespace(self):
        return {'threading':threading,'time':time,'MAX_TRANSFER_QUEUE':2,'MAX_TRANSFER_QUEUE_PER_IP':1,'MAX_CONCURRENT_TRANSFERS_PER_IP':1,'TRANSFER_QUEUE_WAIT_SECONDS':.01,'transfer_lock':threading.Lock(),'transfer_slots':threading.BoundedSemaphore(1),'active_transfers_count':0,'active_transfers_per_ip':defaultdict(int),'transfer_waiting_count':0,'transfer_waiting_per_ip':defaultdict(int)}
    def test_full_global_or_per_ip_queue_rejected_without_counter_growth(self):
        n=self.namespace();f=load_function('acquire_transfer_slot',n)
        n['transfer_waiting_count']=2;self.assertFalse(f('a'));self.assertEqual(n['transfer_waiting_count'],2)
        n['transfer_waiting_count']=1;n['transfer_waiting_per_ip']['a']=1;self.assertFalse(f('a'));self.assertEqual(n['transfer_waiting_per_ip']['a'],1)
    def test_success_and_timeout_clean_up_waiters(self):
        n=self.namespace();f=load_function('acquire_transfer_slot',n)
        self.assertTrue(f('a'));self.assertEqual(n['active_transfers_count'],1);self.assertEqual(n['transfer_waiting_count'],0)
        self.assertFalse(f('b'));self.assertEqual(n['transfer_waiting_count'],0);self.assertEqual(dict(n['transfer_waiting_per_ip']),{})

class MediaBoundaryTests(unittest.TestCase):
    def test_probe_convert_and_mute_use_demuxer_allowlist(self):
        for name in ['probe_media_duration','convert_file_with_slot','apply_mute_postprocessing']:
            self.assertIn('format_whitelist',function_source(name))
        demuxers=next(line for line in APP_SOURCE.splitlines() if line.startswith('FFMPEG_LOCAL_DEMUXERS ='))
        self.assertNotIn('concat',demuxers);self.assertNotIn('hls',demuxers)
    def test_invalid_urls_rejected_before_dns(self):
        f=load_function('is_safe_url',{})
        for value in [None,123,'','https://example.com/\x00','https://example.com/'+'a'*4096]:self.assertFalse(f(value))

if __name__=='__main__':unittest.main()
