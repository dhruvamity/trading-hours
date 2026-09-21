"""Unit tests for exponential recency decay and Kish effective sample size."""
import numpy as np
import pytest

from tradeclock.timemodel.recency import (
    compute_kish_eff_n,
    compute_recency_weights,
    weighted_mean,
    weighted_std,
    MS_PER_WEEK,
)


def test_recency_decay_formula():
    ref_ms = 1_000_000_000_000
    t_26w = ref_ms - int(26.0 * MS_PER_WEEK)
    t_52w = ref_ms - int(52.0 * MS_PER_WEEK)

    weights = compute_recency_weights(
        timestamps_ms=np.array([ref_ms, t_26w, t_52w]),
        half_life_weeks=26.0,
        reference_ms=ref_ms,
    )

    assert pytest.approx(weights[0], abs=1e-4) == 1.0
    assert pytest.approx(weights[1], abs=1e-4) == 0.5
    assert pytest.approx(weights[2], abs=1e-4) == 0.25


def test_unweighted_mode():
    ts = np.array([1000, 2000, 3000])
    weights = compute_recency_weights(ts, half_life_weeks=None)
    assert np.all(weights == 1.0)


def test_kish_effective_sample_size():
    w_equal = np.ones(100)
    assert pytest.approx(compute_kish_eff_n(w_equal), abs=1e-3) == 100.0

    w_skewed = np.zeros(100)
    w_skewed[0] = 10.0
    assert pytest.approx(compute_kish_eff_n(w_skewed), abs=1e-3) == 1.0


def test_weighted_statistics():
    vals = np.array([10.0, 20.0, 30.0])
    weights = np.array([1.0, 2.0, 1.0])

    w_m = weighted_mean(vals, weights)
    assert pytest.approx(w_m, abs=1e-4) == 20.0

    w_s = weighted_std(vals, weights)
    assert pytest.approx(w_s, abs=1e-3) == np.sqrt(50.0)
