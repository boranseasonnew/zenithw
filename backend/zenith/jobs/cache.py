"""Shared jobs cache helpers."""
import math
import threading
import time
from collections import OrderedDict, deque

class TTLCache:
    """Thread-safe TTL-based cache for rate limiting."""
    def __init__(self, ttl=60, max_size=10000, max_requests=8):
        self.ttl = ttl
        self.max_size = max_size
        self.max_requests = max_requests
        self._data = OrderedDict()
        self._lock = threading.Lock()

    def _cleanup_all(self):
        """Tüm key'leri tarayan pahalı (O(n)) temizlik. Sadece periyodik
        background thread tarafından çağrılmalı -- her request'te DEĞİL
        (önceden add() içinde her çağrıda tüm cache taranıyordu, bu da
        eşzamanlı trafik altında her isteği tek bir lock üzerinden
        O(tracked_ip_count) maliyetle serialize ediyordu)."""
        now = time.time()
        to_remove = []
        with self._lock:
            for key, timestamps in self._data.items():
                while timestamps and now - timestamps[0] >= self.ttl:
                    timestamps.popleft()
                if not timestamps:
                    to_remove.append(key)
            for key in to_remove:
                del self._data[key]

            # Boyut limiti aşılırsa en eski kayıtları sil
            while len(self._data) > self.max_size:
                self._data.popitem(last=False)

    def add(self, key):
        """Adds a timestamp. Returns True if under limit, False if rate limited.
        Sadece kendi key'inin listesini budar (ucuz, O(kendi kaydı)); süresi
        dolan diğer key'lerin global temizliği ayrı bir arka plan thread'inde
        (_cleanup_all) yapılır."""
        now = time.time()
        with self._lock:
            timestamps = self._data.get(key)
            if timestamps is None:
                timestamps = deque()
                self._data[key] = timestamps
            while timestamps and now - timestamps[0] >= self.ttl:
                timestamps.popleft()

            # En yeni kaydı sona taşı (LRU)
            self._data.move_to_end(key)

            # Reddedilen istekleri kaydetmeyerek tek bir saldırganın timestamp
            # listesini sınırsız büyütmesini önle. Bu, standart sliding-window
            # davranışıdır: en eski kabul edilmiş istek süresi dolunca yeni bir
            # istek için yer açılır.
            if len(timestamps) >= self.max_requests:
                return False
            timestamps.append(now)

            # max_size sınırını yalnızca periyodik sweep'e bırakmak, spoofed IP
            # selinde bir temizlik aralığı boyunca sınırsız büyümeye izin verir.
            # OrderedDict sayesinde en eski kaydı burada O(1) maliyetle atıyoruz.
            while len(self._data) > self.max_size:
                self._data.popitem(last=False)
            return True

    def retry_after(self, key):
        """Return the remaining sliding-window wait for one rate-limit key."""
        now = time.time()
        with self._lock:
            timestamps = self._data.get(key)
            if not timestamps:
                return 1
            while timestamps and now - timestamps[0] >= self.ttl:
                timestamps.popleft()
            if not timestamps or len(timestamps) < self.max_requests:
                return 1
            return max(1, math.ceil(self.ttl - (now - timestamps[0])))
