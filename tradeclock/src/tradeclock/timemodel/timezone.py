"""Strict timezone management for TradeClock using zoneinfo."""
from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

TZ_IST = ZoneInfo("Asia/Kolkata")
TZ_NY = ZoneInfo("America/New_York")
TZ_LON = ZoneInfo("Europe/London")
TZ_UTC = timezone.utc


def epoch_ms_to_ist(epoch_ms: int) -> datetime:
    """Convert UTC epoch millisecond timestamp to IST datetime."""
    dt_utc = datetime.fromtimestamp(epoch_ms / 1000, tz=TZ_UTC)
    return dt_utc.astimezone(TZ_IST)


def now_ist() -> datetime:
    """Return current localized time in Indian Standard Time (IST)."""
    return datetime.now(tz=TZ_IST)


def ist_to_epoch_ms(dt_ist: datetime) -> int:
    """Convert an IST datetime to UTC epoch milliseconds."""
    if dt_ist.tzinfo is None:
        dt_ist = dt_ist.replace(tzinfo=TZ_IST)
    return int(dt_ist.timestamp() * 1000)


ms_to_ist = epoch_ms_to_ist


def ms_to_utc(epoch_ms: int) -> datetime:
    """Convert UTC epoch millisecond timestamp to UTC datetime."""
    return datetime.fromtimestamp(epoch_ms / 1000, tz=TZ_UTC)
