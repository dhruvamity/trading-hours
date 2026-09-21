"""Line-by-line audit of existing and proposed trading timetable windows.

Audits every window against empirical historical data to detect:
1. False Positives (overestimated edge that collapses under costs or recent data)
2. False Negatives (undervalued windows discarded by session bias)
3. Session Bias (arbitrary London/NY labels unsupported by price action)
"""
from __future__ import annotations

import logging
from pathlib import Path
import numpy as np
import pandas as pd
import yaml

from tradeclock.timemodel.bins import tag_ist_structure, get_bin_id
from tradeclock.metrics.engine import compute_bar_level_features
from tradeclock.classify.classifier import compute_cell_metrics

LOGGER = logging.getLogger("tradeclock.validate.audit")
ROOT = Path(__file__).resolve().parents[3]


# Traditional session-based hypothesis to test for session bias
TRADITIONAL_BTC_WINDOWS = [
    {"name": "Asian Dead Zone", "start": "01:30", "end": "05:30", "assumed": "NO_TRADE"},
    {"name": "Tokyo Sweep", "start": "05:30", "end": "08:30", "assumed": "TRADE_SCALP"},
    {"name": "Asian Scalp", "start": "08:30", "end": "11:30", "assumed": "TRADE_SCALP"},
    {"name": "Midday Dead Zone", "start": "11:30", "end": "13:30", "assumed": "NO_TRADE"},
    {"name": "Early Europe", "start": "13:30", "end": "16:30", "assumed": "TRADE"},
    {"name": "Pre-US Chop", "start": "16:30", "end": "18:30", "assumed": "NO_TRADE"},
    {"name": "US Core Session", "start": "18:30", "end": "23:30", "assumed": "TRADE_BIG"},
    {"name": "Daily Flush", "start": "23:30", "end": "01:30", "assumed": "TRADE_SCALP"},
]

TRADITIONAL_GOLD_WINDOWS = [
    {"name": "Asian Reopen", "start": "03:30", "end": "06:30", "assumed": "TRADE_SCALP"},
    {"name": "Asian Range", "start": "06:30", "end": "09:30", "assumed": "NO_TRADE"},
    {"name": "Tokyo Fix", "start": "09:30", "end": "12:30", "assumed": "TRADE_SCALP"},
    {"name": "Pre-London Lull", "start": "12:30", "end": "14:30", "assumed": "NO_TRADE"},
    {"name": "London Session", "start": "14:30", "end": "18:00", "assumed": "TRADE_BIG"},
    {"name": "Pre-NY Transition", "start": "18:00", "end": "19:30", "assumed": "TRADE_SCALP"},
    {"name": "US Session / NY Open", "start": "19:30", "end": "23:30", "assumed": "TRADE_BIG"},
    {"name": "Late US / Fix", "start": "23:30", "end": "02:30", "assumed": "TRADE_SCALP"},
    {"name": "CME Daily Settlement", "start": "02:30", "end": "03:30", "assumed": "CLOSED"},
]


def audit_window_metrics(df_feat: pd.DataFrame, start_time: str, end_time: str, cost_bps_rt: float) -> dict:
    """Calculate empirical metrics for a continuous IST window across all observations."""
    sh, sm = map(int, start_time.split(":"))
    eh, em = map(int, end_time.split(":"))
    start_min = sh * 60 + sm
    end_min = 1440 if (eh == 0 and em == 0 and start_min > 0) else (eh * 60 + em)

    minute_of_day = df_feat["ist_hour"] * 60 + df_feat["ist_minute"]
    if start_min < end_min:
        mask = (minute_of_day >= start_min) & (minute_of_day < end_min)
    else:
        # Crosses midnight
        mask = (minute_of_day >= start_min) | (minute_of_day < end_min)

    subset = df_feat[mask]
    if len(subset) < 50:
        return {
            "n_bars": len(subset),
            "er_mean": 0.0,
            "range_cost_ratio": 0.0,
            "false_breakout_rate": 1.0,
            "follow_through_prob": 0.0,
            "sample_size": len(subset),
        }

    weights = np.ones(len(subset), dtype=np.float64)
    m = compute_cell_metrics(subset, weights, cost_bps_rt)
    m["n_bars"] = len(subset)
    return m


def run_traditional_session_audit(df_clean_5m: pd.DataFrame, is_gold: bool, cost_bps_rt: float) -> list[dict]:
    """Audit traditional session assumptions against real historical data."""
    df_tagged = tag_ist_structure(df_clean_5m, is_gold=is_gold)
    df_feat = compute_bar_level_features(df_tagged, cost_bps_rt=cost_bps_rt)

    trad_windows = TRADITIONAL_GOLD_WINDOWS if is_gold else TRADITIONAL_BTC_WINDOWS
    audit_results = []

    for w in trad_windows:
        metrics = audit_window_metrics(df_feat, w["start"], w["end"], cost_bps_rt)
        
        er = metrics["er_mean"]
        rc = metrics["range_cost_ratio"]
        fb = metrics["false_breakout_rate"]
        ft = metrics["follow_through_prob"]

        # Objective Verdict Determination
        assumed = w["assumed"]
        verdict = "KEEP"
        verdict_reason = ""
        confidence = "HIGH"

        if w["assumed"] == "CLOSED":
            verdict = "KEEP"
            verdict_reason = "Mandatory CME settlement pause / exchange liquidity frozen."
            confidence = "HIGH"
        elif rc < 2.0 or fb > 0.78 or er < 0.26:
            # Empirical failure
            if "TRADE" in assumed:
                verdict = "REJECT"
                verdict_reason = f"False positive. ER={er:.3f}, FalseBreak={fb:.0%}, Range/Cost={rc:.1f}x. Severe chop & negative expectancy."
            else:
                verdict = "KEEP"
                verdict_reason = f"Correctly flat. High noise and low path efficiency (ER={er:.3f})."
        elif er >= 0.30 and rc >= 5.0 and ft >= 0.50:
            # Empirical success
            if assumed == "NO_TRADE":
                verdict = "REJECT"
                verdict_reason = f"False negative / Session bias. ER={er:.3f}, Range/Cost={rc:.1f}x proves clear momentum and viable directional follow-through."
            else:
                verdict = "KEEP"
                verdict_reason = f"Validated. Strong efficiency (ER={er:.3f}) and range multiple ({rc:.1f}x)."
        else:
            verdict = "MODIFY"
            verdict_reason = f"Selective quality. Boundary needs tightening based on intraday clustering."
            confidence = "MED"

        audit_results.append({
            "name": w["name"],
            "window_ist": f"{w['start']} – {w['end']}",
            "assumed_status": assumed,
            "verdict": verdict,
            "confidence": confidence,
            "evidence": {
                "er_mean": round(float(er), 3),
                "range_cost_ratio": round(float(rc), 1),
                "false_breakout_rate": round(float(fb), 2),
                "follow_through_prob": round(float(ft), 2),
                "bars": metrics["n_bars"],
            },
            "reason": verdict_reason,
        })

    return audit_results


def run_full_existing_timetable_audit() -> dict:
    """Run line-by-line audit across BTC and Gold."""
    clean_dir = ROOT / "data" / "clean"
    results = {}

    # 1. BTC
    btc_path = clean_dir / "BTCUSDT" / "5m" / "klines.parquet"
    if btc_path.exists():
        df_btc = pd.read_parquet(btc_path)
        results["BTCUSDT"] = run_traditional_session_audit(df_btc, is_gold=False, cost_bps_rt=10.0)

    # 2. Gold Spot MT5
    gold_mt5_path = clean_dir / "XAUUSD_MT5" / "5m" / "klines.parquet"
    if gold_mt5_path.exists():
        df_gold_mt5 = pd.read_parquet(gold_mt5_path)
        results["XAUUSD_MT5"] = run_traditional_session_audit(df_gold_mt5, is_gold=True, cost_bps_rt=16.0)

    # 3. Gold Perp Binance
    gold_bin_path = clean_dir / "XAUUSDT_BINANCE" / "5m" / "klines.parquet"
    if gold_bin_path.exists():
        df_gold_bin = pd.read_parquet(gold_bin_path)
        results["XAUUSDT_BINANCE"] = run_traditional_session_audit(df_gold_bin, is_gold=True, cost_bps_rt=16.0)

    return results
