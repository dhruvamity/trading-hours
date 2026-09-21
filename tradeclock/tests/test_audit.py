"""Unit tests for line-by-line timetable audit and revalidation."""
import pandas as pd
import numpy as np
import pytest

from tradeclock.validate.audit import audit_window_metrics


def test_audit_window_metrics_calculation():
    """Verify that audit_window_metrics aggregates features across an IST window."""
    dates = pd.date_range("2026-01-01", periods=288, freq="5min")
    open_times = dates.astype(np.int64) // 10**6
    
    df = pd.DataFrame({
        "open_time": open_times,
        "ist_date": [d.date() for d in dates],
        "ist_hour": [d.hour for d in dates],
        "ist_minute": [d.minute for d in dates],
        "close": 100.0 + np.cumsum(np.random.randn(288)),
        "high": 101.0,
        "low": 99.0,
        "volume": 1000.0,
        "er_60m": 0.35,
        "ret_5m": np.random.randn(288) * 0.001,
        "ret_15m": np.random.randn(288) * 0.002,
        "range_bps_60m": 50.0,
        "is_breakout": True,
        "false_breakout": 0,
        "follow_through_valid": True,
        "follow_through_success": 1,
        "cs_spread_bps": 2.0,
        "drift_bps": 5.0,
        "market_status": "OPEN",
    })

    metrics = audit_window_metrics(df, "00:00", "04:00", cost_bps_rt=10.0)
    assert metrics["n_bars"] > 0
    assert "er_mean" in metrics
    assert "range_cost_ratio" in metrics
    assert "false_breakout_rate" in metrics
    assert "follow_through_prob" in metrics


def test_audit_session_bias_rejection():
    """Verify that an assumed trade window with high false breakouts and low range is evaluated accurately."""
    dates = pd.date_range("2026-01-01", periods=1000, freq="5min")
    open_times = dates.astype(np.int64) // 10**6
    
    df = pd.DataFrame({
        "open_time": open_times,
        "ist_date": [d.date() for d in dates],
        "ist_hour": [d.hour for d in dates],
        "ist_minute": [d.minute for d in dates],
        "close": 100.0 + np.cumsum(np.random.randn(1000) * 0.05),
        "high": 100.1,
        "low": 99.9,
        "volume": 50.0,
        "er_60m": 0.22,
        "ret_5m": np.random.randn(1000) * 0.0001,
        "ret_15m": np.random.randn(1000) * 0.0002,
        "range_bps_60m": 15.0,
        "is_breakout": True,
        "false_breakout": 1,
        "follow_through_valid": True,
        "follow_through_success": 0,
        "cs_spread_bps": 5.0,
        "drift_bps": 0.0,
        "market_status": "OPEN",
    })

    metrics = audit_window_metrics(df, "03:30", "06:30", cost_bps_rt=16.0)
    assert metrics["er_mean"] < 0.25
    assert metrics["range_cost_ratio"] < 2.0
    assert metrics["false_breakout_rate"] > 0.70
