from collections import defaultdict
import time

class TrafficMonitor:
    def __init__(self):
        self.request_counts = defaultdict(int)
        self.window_start = time.time()
        self.WINDOW_SIZE = 60 # 60 seconds reset window

    def log_request(self, ip):
        current_time = time.time()
        if current_time - self.window_start > self.WINDOW_SIZE:
            self.request_counts.clear()
            self.window_start = current_time
        self.request_counts[ip] += 1
        return self.request_counts[ip]

    def get_stats(self):
        return dict(self.request_counts)

monitor = TrafficMonitor()
