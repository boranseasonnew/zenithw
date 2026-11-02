"""Per-application collaborators; no process-global job registry."""
import atexit
import threading
from zenith.jobs.registry import JobRegistry
from zenith.routes.system import SystemEndpoints
from zenith.security.http import RequestSecurity
from zenith.security.network import NetworkPolicy
from zenith.services.conversion import ConversionService
from zenith.services.downloads import DownloadService
from zenith.services.engine import MediaEngine
from zenith.services.files import FileStore
from zenith.services.metadata import MetadataService
from zenith.services.thumbnails import ThumbnailService



class Runtime:
    def __init__(self, app, socketio, config):
        self.app = app
        self.socketio = socketio
        self.config = config
        self.stopping = threading.Event()
        self._threads = []
        self._shutdown_registered = False
        self.security = RequestSecurity(self)
        self.network = NetworkPolicy(self)
        self.jobs = JobRegistry(self)
        self.files = FileStore(self)
        self.metadata = MetadataService(self)
        self.downloads = DownloadService(self)
        self.thumbnails = ThumbnailService(self)
        self.conversion = ConversionService(self)
        self.system = SystemEndpoints(self)
        self.engine = MediaEngine(self)

    def start_background_tasks(self):
        if self._threads:
            return
        for target in (
            self.files.periodic_cleanup,
            self.security.periodic_rate_limiter_cleanup,
            self.files.periodic_prepared_file_cleanup,
        ):
            worker = threading.Thread(target=target, daemon=True)
            worker.start()
            self._threads.append(worker)
        atexit.register(self.shutdown)
        self._shutdown_registered = True

    def close(self):
        self.stopping.set()
        for worker in self._threads:
            worker.join(timeout=1)
        self._threads.clear()
        if self._shutdown_registered:
            atexit.unregister(self.shutdown)
            self._shutdown_registered = False

    def shutdown(self):
        self.close()
        self.engine._reap_all_children_on_shutdown()
