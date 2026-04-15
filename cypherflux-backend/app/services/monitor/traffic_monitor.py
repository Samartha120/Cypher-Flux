from collections import defaultdict, deque
import time

class TrafficMonitor:
    def __init__(self):
        self.request_counts = defaultdict(int)
        self.request_meta = {}
        self.window_start = time.time()
        self.WINDOW_SIZE = 60 # 60 seconds reset window
        self.timeline = deque(maxlen=120)
        self.bucket_second = int(time.time())
        self.bucket_requests = 0
        self.bucket_suspicious = 0
        self.bucket_attack = 0
        self.updated_at = None

    def _status_for_requests(self, requests):
        if requests > 200:
            return 'attack'
        if requests > 100:
            return 'suspicious'
        return 'normal'

    def _risk_score_for_requests(self, requests):
        status = self._status_for_requests(requests)
        if status == 'attack':
            return min(100, 80 + int((requests - 200) * 0.15))
        if status == 'suspicious':
            return min(79, 45 + int((requests - 100) * 0.2))
        return min(44, 5 + int(requests * 0.3))

    def _roll_timeline(self, current_second):
        while self.bucket_second < current_second:
            self.timeline.append({
                'time': time.strftime('%H:%M:%S', time.localtime(self.bucket_second)),
                'requests': self.bucket_requests,
                'suspicious': self.bucket_suspicious,
                'attack': self.bucket_attack,
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(self.bucket_second)),
            })
            self.bucket_second += 1
            self.bucket_requests = 0
            self.bucket_suspicious = 0
            self.bucket_attack = 0

    def log_request(self, ip, path='/', method='GET'):
        current_time = time.time()
        if current_time - self.window_start > self.WINDOW_SIZE:
            self.request_counts.clear()
            self.request_meta.clear()
            self.window_start = current_time

        current_second = int(current_time)
        self._roll_timeline(current_second)

        self.request_counts[ip] += 1
        requests = self.request_counts[ip]
        status = self._status_for_requests(requests)
        self.bucket_requests += 1
        if status == 'suspicious':
            self.bucket_suspicious += 1
        elif status == 'attack':
            self.bucket_attack += 1

        self.request_meta[ip] = {
            'requests': requests,
            'status': status,
            'risk_score': self._risk_score_for_requests(requests),
            'last_seen': current_time,
            'last_path': path,
            'last_method': method,
            'detection_source': 'Traffic Monitor',
        }
        self.updated_at = current_time
        return self.request_counts[ip]

    def get_stats(self):
        return dict(self.request_counts)

    def get_detailed_stats(self):
        rows = []
        for ip, requests in self.request_counts.items():
            meta = self.request_meta.get(ip, {})
            rows.append({
                'ip': ip,
                'requests': requests,
                'status': meta.get('status') or self._status_for_requests(requests),
                'riskScore': meta.get('risk_score') or self._risk_score_for_requests(requests),
                'lastSeen': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(meta.get('last_seen', self.updated_at or time.time()))),
                'lastPath': meta.get('last_path'),
                'lastMethod': meta.get('last_method'),
                'detectionSource': meta.get('detection_source', 'Traffic Monitor'),
            })
        rows.sort(key=lambda row: row.get('requests', 0), reverse=True)
        return rows

    def get_timeline(self):
        now_second = int(time.time())
        self._roll_timeline(now_second)
        current = {
            'time': time.strftime('%H:%M:%S', time.localtime(self.bucket_second)),
            'requests': self.bucket_requests,
            'suspicious': self.bucket_suspicious,
            'attack': self.bucket_attack,
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(self.bucket_second)),
        }
        return [*list(self.timeline), current]

    def get_summary(self):
        rows = self.get_detailed_stats()
        suspicious = sum(1 for row in rows if row['status'] == 'suspicious')
        attack = sum(1 for row in rows if row['status'] == 'attack')
        return {
            'activeIps': len(rows),
            'suspiciousIps': suspicious,
            'attackIps': attack,
            'updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(self.updated_at or time.time())),
        }

monitor = TrafficMonitor()
