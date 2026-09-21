"""Exponential recency weighting and Kish effective sample size calculations."""
from __future__ import annotations

import numpy as np
import pandas as pd

MS_PER_WEEK = 7 * 24 * 3600 * 1000


def compute_recency_weights(
    timestamps_ms: np.ndarray | pd.Series,
    ref_timestamp_ms: int | None = None,
    half_life_weeks: float | None = 26.0,
) -> np.ndarray:
    """Compute exponential decay weights based on age in weeks from reference timestamp.
    If half_life_weeks is None, returns equal weights of 1.0.
    """
    ts = np.asarray(timestamps_ms, dtype=np.int64)
    if ref_timestamp_ms is None:
        ref_timestamp_ms = int(ts.max())

    if half_life_weeks is None or half_life_weeks <= 0:
        return np.ones(len(ts), dtype=np.float64)

    age_weeks = (ref_timestamp_ms - ts) / MS_PER_WEEK
    # Protect against negative age for future/edge bars
    age_weeks = np.maximum(0.0, age_weeks)

    decay_rate = np.log(2.0) / float(half_life_weeks)
    weights = np.exp(-decay_rate * age_weeks)
    return weights


def compute_kish_effective_n(weights: np.ndarray) -> float:
    """Compute Kish effective sample size: (sum(w))^2 / sum(w^2)."""
    w = np.asarray(weights, dtype=np.float64)
    sum_w = np.sum(w)
    sum_w_sq = np.sum(w ** 2)
    if sum_w_sq == 0:
        return 0.0
    return float((sum_w ** 2) / sum_w_sq)


def weighted_mean(values: np.ndarray, weights: np.ndarray) -> float:
    """Compute weighted average."""
    v = np.asarray(values, dtype=np.float64)
    w = np.asarray(weights, dtype=np.float64)
    valid = ~np.isnan(v) & ~np.isnan(w) & (w > 0)
    if not np.any(valid):
        return float(np.nan)
    return float(np.sum(v[valid] * w[valid]) / np.sum(w[valid]))


def weighted_quantile(values: np.ndarray, weights: np.ndarray, q: float) -> float:
    """Compute weighted quantile (e.g. 0.5 for median)."""
    v = np.asarray(values, dtype=np.float64)
    w = np.asarray(weights, dtype=np.float64)
    valid = ~np.isnan(v) & ~np.isnan(w) & (w > 0)
    if not np.any(valid):
        return float(np.nan)
    v_clean = v[valid]
    w_clean = w[valid]

    sorter = np.argsort(v_clean)
    sorted_v = v_clean[sorter]
    sorted_w = w_clean[sorter]

    cum_w = np.cumsum(sorted_w)
    total_w = cum_w[-1]
    target = q * total_w
    idx = np.searchsorted(cum_w, target)
    idx = min(idx, len(sorted_v) - 1)
    return float(sorted_v[idx])
