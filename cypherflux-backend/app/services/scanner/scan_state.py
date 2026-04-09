from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

_last_scan_target: Optional[str] = None
_last_scan_devices: List[Dict[str, Any]] = []
_last_scan_at: Optional[datetime] = None


def set_last_scan(target: str, devices: List[Dict[str, Any]]) -> None:
    global _last_scan_target, _last_scan_devices, _last_scan_at
    _last_scan_target = str(target)
    _last_scan_devices = list(devices or [])
    _last_scan_at = datetime.now(timezone.utc)


def get_last_scan() -> Dict[str, Any]:
    return {
        "target": _last_scan_target,
        "devices": list(_last_scan_devices),
        "timestamp": _last_scan_at,
    }
