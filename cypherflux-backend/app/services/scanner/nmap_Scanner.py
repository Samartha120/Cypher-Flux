import nmap
import ipaddress
import socket

class ScannerEngine:
    def __init__(self):
        try:
            self.nm = nmap.PortScanner()
        except nmap.PortScannerError:
            self.nm = None
            print("Nmap not found, scanner will simulate.")

    def _resolve_local_subnet_target(self):
        """Best-effort: resolve local IPv4 and scan its /24 subnet."""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                # No packets are actually sent, but this picks the default route interface.
                s.connect(('8.8.8.8', 80))
                local_ip = s.getsockname()[0]
            finally:
                s.close()

            ip_obj = ipaddress.ip_address(local_ip)
            if ip_obj.is_loopback or ip_obj.is_unspecified:
                raise ValueError('Invalid local IP for subnet scan')

            network = ipaddress.ip_network(f"{local_ip}/24", strict=False)
            return str(network)
        except Exception:
            # Fallback if we cannot detect local IP.
            return '192.168.1.0/24'

    def _simulate_scan_all(self, subnet_cidr):
        try:
            net = ipaddress.ip_network(subnet_cidr, strict=False)
            base = int(net.network_address)
            # Create a small sample of hosts in the subnet.
            sample_hosts = [str(ipaddress.ip_address(base + offset)) for offset in [1, 2, 3, 10, 20, 30]]
        except Exception:
            sample_hosts = ['192.168.1.1', '192.168.1.2', '192.168.1.10', '192.168.1.20']

        results = []
        for host in sample_hosts:
            results.append({
                "ip": host,
                "hostname": f"host-{host.split('.')[-1]}.lan",
                "state": "up",
                "open_ports": [22, 80, 443] if host.endswith('.1') or host.endswith('.10') else [80, 443],
            })
        return results

    def _scan_open_ports(self, host: str, top_ports: int = 50):
        """Lightweight TCP connect scan of top ports.

        Returns a list of {port, service} objects (or empty list on failure).
        """
        try:
            nm_ports = nmap.PortScanner()
            nm_ports.scan(hosts=str(host), arguments=f"-sT -T4 --top-ports {int(top_ports)} --open")
            if host not in nm_ports.all_hosts():
                return []

            tcp = nm_ports[host].get('tcp', {}) or {}
            open_ports = []
            for port, meta in tcp.items():
                try:
                    if (meta.get('state') or '').lower() != 'open':
                        continue
                    open_ports.append({
                        'port': int(port),
                        'service': meta.get('name') or 'unknown',
                    })
                except Exception:
                    continue
            open_ports.sort(key=lambda p: p['port'])
            return open_ports
        except Exception:
            return []

    def scan_network(self, target="127.0.0.1"):
        scan_target = target
        if str(target).strip() == '0.0.0.0':
            scan_target = self._resolve_local_subnet_target()

        if not self.nm:
            # Simulated data if Nmap is absent
            if str(target).strip() == '0.0.0.0':
                return self._simulate_scan_all(scan_target)
            return [{"ip": target, "hostname": "localhost", "state": "up", "open_ports": [22, 80, 443]}]
        
        try:
            scan_target_str = str(scan_target).strip()

            # For a single host, do a lightweight port scan so open ports are real.
            if '/' not in scan_target_str:
                self.nm.scan(hosts=scan_target_str, arguments='-sn')
                host = scan_target_str
                hostname = self.nm[host].hostname() if host in self.nm.all_hosts() else ''
                state = self.nm[host].state() if host in self.nm.all_hosts() else 'up'
                open_ports = self._scan_open_ports(host)
                return [{
                    "ip": host,
                    "hostname": hostname,
                    "state": state,
                    "open_ports": open_ports,
                }]

            # For subnets, do host discovery and (optionally) port scan a small number of discovered hosts.
            self.nm.scan(hosts=scan_target_str, arguments='-sn')
            hosts = list(self.nm.all_hosts())
            results = []
            up_hosts = [h for h in hosts if (self.nm[h].state() or '').lower() == 'up']

            # Avoid expensive scans on large subnets.
            should_port_scan = len(up_hosts) <= 10

            for host in hosts:
                open_ports = self._scan_open_ports(host) if should_port_scan and (self.nm[host].state() or '').lower() == 'up' else []
                results.append({
                    "ip": host,
                    "hostname": self.nm[host].hostname(),
                    "state": self.nm[host].state(),
                    "open_ports": open_ports,
                })

            return results
        except Exception as e:
            print(f"Scan error: {e}")
            return []
