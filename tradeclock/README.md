# TradeClock: IST Quant Trade-Window Pipeline & Live Terminal

Institutional session timing and momentum vs. chop analysis for **BTCUSDT** and **Gold (XAUUSD / XAUUSDT)**, calibrated specifically for traders in India (IST, `Asia/Kolkata`, UTC+5:30).

---

## Features

1. **Strict IST Time Model**:
   - 48 thirty-minute bins per 24h cycle, constructed strictly from 5-minute candles to avoid the 30-minute UTC boundary offset.
   - Dynamic US/UK DST regime classification (`US_SUMMER` vs `US_WINTER`, `UK_SUMMER` vs `UK_WINTER`, and transition desync tagging).
   - Specialized institutional blocks: `Fri-late` (Sat 00:00–04:00 IST US tail) and `Mon-early` (Mon 03:30–06:30 IST Asian / Gold open).
2. **Dual-Gold Architecture**:
   - **XAUUSD_MT5**: High-resolution MetaTrader 5 institutional spot feed spanning 3+ years (Sept 2023 – Sept 2026).
   - **XAUUSDT_BINANCE**: Binance USD-M Gold perpetual from its launch date (Dec 11, 2025).
   - Analyzed completely independently with cross-validation on basis and 5m returns.
3. **Quant Momentum vs. Chop Metrics**:
   - Rolling 60m Efficiency Ratio ($|\text{net}| / \text{path}$)
   - Variance Ratio (15m/5m, 1h/15m)
   - Range / Cost Multiple ($> 2.0\times$ hard gate)
   - Whipsaw & False Breakout Rates
   - Follow-through probability ($+1$ ATR before $-1$ ATR in 3h)
   - Exponential recency weighting ($H = 26$ weeks) and stationary 5-day block-bootstrap 90% CIs.
4. **Live Terminal (Python TUI + Web Subpage)**:
   - Interactive Rich / Textual terminal (`python -m tradeclock`)
   - Vite / React Web Subpage at `/terminal`
   - Real-time countdown to slot expiration, next slot preview, confidence badge, and 24h visual timeline bar.

---

## Quickstart

```bash
# 1. Run unit test suite
make -C tradeclock test

# 2. View current live IST slot status (single line for tmux / status bars)
python3 -m tradeclock --now

# 3. Launch interactive live terminal TUI
python3 -m tradeclock

# 4. Inspect specific day schedule
python3 -m tradeclock --day tue

# 5. Output JSON status
python3 -m tradeclock --json

# 6. Rebuild research pipeline and refresh data
python3 -m tradeclock refresh
```
