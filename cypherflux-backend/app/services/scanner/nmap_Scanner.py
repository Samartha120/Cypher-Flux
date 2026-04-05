import nmap

class ScannerEngine:
    def __init__(self):
        try:
            self.nm = nmap.PortScanner()
        except nmap.PortScannerError:
            self.nm = None
            print("Nmap not found, scanner will simulate.")

    def scan_network(self, target="127.0.0.1"):
        if not self.nm:
            # Simulated data if Nmap is absent
            return [{"ip": target, "hostname": "localhost", "state": "up", "open_ports": [22, 80, 443]}]
        
        try:
            self.nm.scan(hosts=target, arguments='-sn')
            results = []
            for host in self.nm.all_hosts():
                results.append({
                    "ip": host,
                    "hostname": self.nm[host].hostname(),
                    "state": self.nm[host].state(),
                    "open_ports": [] # requires full scan
                })
            return results
        except Exception as e:
            print(f"Scan error: {e}")
            return []
