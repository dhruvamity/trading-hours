"""IST 30-minute bin construction and special block mapping from 5-minute bars."""
from __future__ import annotations

from datetime import datetime, time
import numpy as np
import pandas as pd
from zoneinfo import ZoneInfo

from tradeclock.timemodel.timezone import TZ_IST

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
ANALYSIS_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Fri-late"]


def get_bin_idx_from_minutes(minute_of_day: int, bin_minutes: int = 30) -> int:
    """Return 0-47 bin index from minute of day (0 to 1439)."""
    return int(minute_of_day // bin_minutes)


def get_bin_time_range(bin_idx: int, bin_minutes: int = 30) -> tuple[str, str]:
    """Return 'HH:MM' start and end strings for bin_idx."""
    start_min = bin_idx * bin_minutes
    end_min = (bin_idx + 1) * bin_minutes
    sh, sm = divmod(start_min, 60)
    eh, em = divmod(end_min, 60)
    if eh == 24:
        return f"{sh:02d}:{sm:02d}", "24:00"
    return f"{sh:02d}:{sm:02d}", f"{eh:02d}:{em:02d}"


def classify_ist_slot(dt_ist: datetime) -> tuple[str, int, bool, bool]:
    """Classify an IST datetime into:
    (effective_weekday, bin_idx, is_special_block, is_weekend_closed).
    """
    wd = dt_ist.weekday() # 0 = Monday, 4 = Friday, 5 = Saturday, 6 = Sunday
    minute_of_day = dt_ist.hour * 60 + dt_ist.minute
    bin_idx = minute_of_day // 30

    # 1. Fri-late Block: Saturday 00:00 - 04:00 IST (captures Friday NY session tail)
    if wd == 5 and minute_of_day < 4 * 60:
        return "Fri-late", bin_idx, True, False

    # 2. Weekend Closed Rest: Saturday 04:00 -> Monday 03:30 IST
    if (wd == 5 and minute_of_day >= 4 * 60) or (wd == 6) or (wd == 0 and minute_of_day < 3 * 60 + 30):
        return "Weekend", bin_idx, False, True

    # 3. Mon-early Block: Monday 03:30 - 06:30 IST (captures Asian open & Gold market restart)
    if wd == 0 and (3 * 60 + 30 <= minute_of_day < 6 * 60 + 30):
        return "Monday", bin_idx, True, False

    # Standard weekday mapping
    weekday_name = WEEKDAYS[wd]
    return weekday_name, bin_idx, False, False


def assign_ist_bins(df_5m: pd.DataFrame) -> pd.DataFrame:
    """Vectorized assignment of IST bins, weekdays, and special block tags from 5m bars."""
    df = df_5m.copy()
    dt_utc = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    dt_ist = dt_utc.dt.tz_convert(TZ_IST)

    df["dt_ist"] = dt_ist
    df["ist_date"] = dt_ist.dt.date
    df["ist_hour"] = dt_ist.dt.hour
    df["ist_minute"] = dt_ist.dt.minute
    df["minute_of_day"] = df["ist_hour"] * 60 + df["ist_minute"]
    df["bin_idx"] = df["minute_of_day"] // 30
    df["raw_weekday"] = dt_ist.dt.weekday # 0=Mon, 4=Fri, 5=Sat, 6=Sun

    # Effective weekday and special block classifications
    is_fri_late = (df["raw_weekday"] == 5) & (df["minute_of_day"] < 240)
    is_weekend_closed = (
        ((df["raw_weekday"] == 5) & (df["minute_of_day"] >= 240))
        | (df["raw_weekday"] == 6)
        | ((df["raw_weekday"] == 0) & (df["minute_of_day"] < 210))
    )
    is_mon_early = (df["raw_weekday"] == 0) & (df["minute_of_day"] >= 210) & (df["minute_of_day"] < 390)

    weekday_names = np.array(WEEKDAYS)
    effective_wd = weekday_names[df["raw_weekday"]].copy()
    effective_wd[is_fri_late] = "Fri-late"
    effective_wd[is_weekend_closed] = "Weekend"

    df["effective_weekday"] = effective_wd
    df["is_fri_late"] = is_fri_late
    df["is_mon_early"] = is_mon_early
    df["is_weekend_closed"] = is_weekend_closed

    return df
