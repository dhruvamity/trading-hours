"""Dynamic US and UK Daylight Saving Time (DST) regime tracking."""
from __future__ import annotations

from datetime import datetime
import pandas as pd
from zoneinfo import ZoneInfo

from tradeclock.timemodel.timezone import TZ_NY, TZ_LON, TZ_UTC


def get_dst_regime(dt_utc: datetime) -> dict[str, str | bool]:
    """Inspect DST status for US (Eastern) and UK (London) at a given UTC datetime."""
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=TZ_UTC)

    dt_ny = dt_utc.astimezone(TZ_NY)
    dt_lon = dt_utc.astimezone(TZ_LON)

    us_dst_active = bool(dt_ny.dst() and dt_ny.dst().total_seconds() > 0)
    uk_dst_active = bool(dt_lon.dst() and dt_lon.dst().total_seconds() > 0)

    # US Summer (EDT, UTC-4) vs US Winter (EST, UTC-5)
    us_regime = "US_SUMMER" if us_dst_active else "US_WINTER"
    uk_regime = "UK_SUMMER" if uk_dst_active else "UK_WINTER"

    # Desync occurs during the 2-3 weeks in March and 1 week in Oct/Nov
    is_desync = (us_dst_active != uk_dst_active)

    return {
        "us_regime": us_regime,
        "uk_regime": uk_regime,
        "is_desync": is_desync,
        "active_primary": us_regime, # Primary market anchor for US session
    }


def tag_df_with_regimes(df: pd.DataFrame) -> pd.DataFrame:
    """Tag an entire DataFrame containing open_time (epoch ms) with DST regimes."""
    df = df.copy()
    dt_utc = pd.to_datetime(df["open_time"], unit="ms", utc=True)

    # Vectorized check via America/New_York and Europe/London offsets
    dt_ny = dt_utc.dt.tz_convert(TZ_NY)
    dt_lon = dt_utc.dt.tz_convert(TZ_LON)

    # In EDT, UTC offset is -4 hours (-14400s). In EST, -5 hours (-18000s).
    us_offsets = dt_ny.apply(lambda x: x.utcoffset().total_seconds() if x is not None else -18000).values
    uk_offsets = dt_lon.apply(lambda x: x.utcoffset().total_seconds() if x is not None else 0).values

    us_summer = (us_offsets == -14400)
    uk_summer = (uk_offsets == 3600)

    df["us_regime"] = np.where(us_summer, "US_SUMMER", "US_WINTER")
    df["uk_regime"] = np.where(uk_summer, "UK_SUMMER", "UK_WINTER")
    df["dst_desync"] = (us_summer != uk_summer)
    df["regime"] = df["us_regime"]

    return df
import numpy as np
