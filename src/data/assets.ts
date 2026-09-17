import { AssetConfig, TimezoneOption, TzId } from '../types';

export const TIMEZONES: Record<TzId, TimezoneOption> = {
  IST: {
    id: 'IST',
    label: 'IST (UTC+5:30)',
    short: 'IST',
    iana: 'Asia/Kolkata',
    description: 'Indian Standard Time'
  },
  UTC: {
    id: 'UTC',
    label: 'UTC (UTC+0:00)',
    short: 'UTC',
    iana: 'UTC',
    description: 'Coordinated Universal Time'
  },
  ET: {
    id: 'ET',
    label: 'ET (New York)',
    short: 'ET',
    iana: 'America/New_York',
    description: 'Eastern Time'
  }
};

export const BTC_CONFIG: AssetConfig = {
  id: 'btc',
  slug: 'btc',
  title: 'BTC Session Tracker',
  symbol: 'BTC',
  pair: 'BTC / USDT',
  quoteName: 'Bitcoin',
  icon: '₿',
  accentColor: '#10b981',
  glowClass: 'timer-glow-emerald',
  zones: [
    {
      id: 'btc_night',
      start: 0,
      end: 300, // 05:00
      name: 'Overnight Dead Zone',
      status: 'NO_TRADE',
      tag: 'NO TRADE ALLOWED',
      notes: 'Illiquid hours, spread widening risk',
      canTrade: false,
      color: '#ef4444',
      volatility: 'Low / Illiquid',
      code: 'NO',
      badge: 'No trade'
    },
    {
      id: 'btc_tokyo_flush',
      start: 300, // 05:00
      end: 480, // 08:00
      name: 'Daily-Close Flush & Tokyo Open',
      status: 'TRADE_BIG',
      tag: 'CORE TRADE (BIG)',
      notes: 'Daily-close flush into Tokyo open',
      canTrade: true,
      color: '#10b981',
      volatility: 'High (Daily Close Flush)',
      code: 'DC',
      badge: 'TRADE (big)'
    },
    {
      id: 'btc_chop_grind',
      start: 480, // 08:00
      end: 960, // 16:00
      name: 'Asia Chop & London Grind',
      status: 'NO_TRADE',
      tag: 'NO TRADE ALLOWED',
      notes: 'Range-bound chop, high false breakout rate',
      canTrade: false,
      color: '#ef4444',
      volatility: 'Low / Range Grind',
      code: 'NO',
      badge: 'No trade'
    },
    {
      id: 'btc_pre_market',
      start: 960, // 16:00
      end: 1020, // 17:00
      name: 'US Pre-Market Pocket',
      status: 'TRADE',
      tag: 'ACTIVE TRADE WINDOW',
      notes: 'US pre-market positioning pocket',
      canTrade: true,
      color: '#38bdf8',
      volatility: 'Moderate Expansion',
      code: 'PM',
      badge: 'TRADE'
    },
    {
      id: 'btc_ny_trap',
      start: 1020, // 17:00
      end: 1140, // 19:00
      name: 'Pre-NY Trap Zone',
      status: 'NO_TRADE',
      tag: 'NO TRADE ALLOWED',
      notes: 'Unstable liquidity, algorithmic stop sweeps',
      canTrade: false,
      color: '#ef4444',
      volatility: 'Unstable / Trap',
      code: 'NO',
      badge: 'No trade'
    },
    {
      id: 'btc_us_fix_overlap',
      start: 1140, // 19:00
      end: 1350, // 22:30
      name: 'US Cash & London Fix Overlap',
      status: 'TRADE',
      tag: 'CORE TRADE OVERLAP',
      notes: 'US cash open through London-fix overlap',
      canTrade: true,
      color: '#10b981',
      volatility: 'Very High (Prime Overlap Peak)',
      code: 'US',
      badge: 'TRADE'
    },
    {
      id: 'btc_session_close',
      start: 1350, // 22:30
      end: 1440, // 24:00
      name: 'Session Close & Defense',
      status: 'NO_TRADE',
      tag: 'NO TRADE ALLOWED',
      notes: 'Fading volume, capital defense window',
      canTrade: false,
      color: '#ef4444',
      volatility: 'Fading Volatility',
      code: 'NO',
      badge: 'No trade'
    }
  ],
  tracks: [
    {
      id: 'track_btc_dc',
      code: 'DC',
      name: 'Tokyo & Daily Flush',
      shortName: 'Tokyo Flush',
      sublabel: '05:00 – 08:00 IST',
      color: '#10b981',
      bgLight: 'bg-emerald-500/15',
      borderLight: 'border-emerald-500/30',
      start: 300,
      end: 480,
      status: 'TRADE_BIG',
      zoneId: 'btc_tokyo_flush'
    },
    {
      id: 'track_btc_pm',
      code: 'PM',
      name: 'US Pre-Market',
      shortName: 'Pre-Market',
      sublabel: '16:00 – 17:00 IST',
      color: '#38bdf8',
      bgLight: 'bg-sky-500/15',
      borderLight: 'border-sky-500/30',
      start: 960,
      end: 1020,
      status: 'TRADE',
      zoneId: 'btc_pre_market'
    },
    {
      id: 'track_btc_us',
      code: 'US',
      name: 'US Cash & Fix',
      shortName: 'US Cash',
      sublabel: '19:00 – 22:30 IST',
      color: '#10b981',
      bgLight: 'bg-emerald-500/15',
      borderLight: 'border-emerald-500/30',
      start: 1140,
      end: 1350,
      status: 'TRADE',
      zoneId: 'btc_us_fix_overlap'
    },
    {
      id: 'track_btc_no',
      code: 'NO',
      name: 'Capital Defense',
      shortName: 'Defense',
      sublabel: 'Restricted Hours',
      color: '#ef4444',
      bgLight: 'bg-rose-500/15',
      borderLight: 'border-rose-500/30',
      start: 0,
      end: 1440,
      status: 'NO_TRADE',
      zoneId: 'btc_night'
    }
  ],
  quantNotes: {
    title: 'BTC Section 6 Execution Protocols',
    highlights: [
      {
        label: 'Prime Morning Window',
        text: '05:00–08:00 IST captures the daily-candle close rebalance and the subsequent Tokyo spot bid.',
        level: 'success'
      },
      {
        label: 'US Pre-Market Pocket',
        text: '16:00–17:00 IST acts as an institutional positioning wedge prior to New York derivatives open.',
        level: 'info'
      },
      {
        label: 'Overlap Window',
        text: '19:00–22:30 IST features peak aggregate order flow, bridging London fix benchmark and US equity open.',
        level: 'success'
      }
    ],
    summary: 'Strict rule: Avoid trading between 08:00–16:00 IST and 17:00–19:00 IST where retail chop and pre-NY traps have negative expected value.'
  },
  getVolatilityLevelAtIst: (istMins: number) => {
    // Peak 1: 05:00 to 08:00 (center ~390 mins = 06:30)
    if (istMins >= 300 && istMins <= 480) {
      const dist = Math.abs(istMins - 390);
      return 15 + 65 * Math.max(0, 1 - Math.pow(dist / 90, 2));
    }
    // Peak 2: 16:00 to 17:00 (center 990 mins = 16:30)
    if (istMins >= 960 && istMins <= 1020) {
      const dist = Math.abs(istMins - 990);
      return 12 + 50 * Math.max(0, 1 - Math.pow(dist / 30, 2));
    }
    // Peak 3: 19:00 to 22:30 (center 1245 mins = 20:45)
    if (istMins >= 1140 && istMins <= 1350) {
      const dist = Math.abs(istMins - 1245);
      return 15 + 85 * Math.max(0, 1 - Math.pow(dist / 105, 2));
    }
    return 8;
  }
};

export const GOLD_CONFIG: AssetConfig = {
  id: 'gold',
  slug: 'gold',
  title: 'XAU/USD Gold Session Tracker',
  symbol: 'XAU',
  pair: 'XAU / USD',
  quoteName: 'Spot Gold',
  icon: '🪙',
  accentColor: '#f59e0b',
  glowClass: 'timer-glow-amber',
  zones: [
    {
      id: 'gold_night',
      start: 0,
      end: 300, // 05:00
      name: 'Overnight Dead Zone',
      status: 'NO_TRADE',
      tag: 'NO TRADE ALLOWED',
      notes: '–',
      canTrade: false,
      color: '#ef4444',
      volatility: 'Low / Illiquid',
      code: 'NO',
      badge: 'No trade'
    },
    {
      id: 'gold_tokyo_sweep',
      start: 300, // 05:00
      end: 390, // 06:30
      name: 'Tokyo Open Sweep',
      status: 'TRADE_BIG',
      tag: 'CORE TRADE (BIG)',
      notes: 'Tokyo open sweep, clean and repeatable',
      canTrade: true,
      color: '#10b981',
      volatility: 'High (Tokyo Sweep)',
      code: 'TK',
      badge: 'TRADE (big)'
    },
    {
      id: 'gold_tokyo_pause',
      start: 390, // 06:30
      end: 480, // 08:00
      name: 'Post-Sweep Consolidation',
      status: 'NO_TRADE',
      tag: 'NO TRADE ALLOWED',
      notes: '–',
      canTrade: false,
      color: '#ef4444',
      volatility: 'Low / Drift',
      code: 'NO',
      badge: 'No trade'
    },
    {
      id: 'gold_asian_scalp',
      start: 480, // 08:00
      end: 540, // 09:00
      name: 'Asian Secondary Window',
      status: 'TRADE_SCALP',
      tag: 'SCALP TRADE ONLY',
      notes: 'Secondary window, real but smaller than the primes',
      canTrade: true,
      color: '#f59e0b',
      volatility: 'Moderate Scalp Expansion',
      code: 'AS',
      badge: 'TRADE (scalp)'
    },
    {
      id: 'gold_asian_lull',
      start: 540, // 09:00
      end: 660, // 11:00
      name: 'Late Asian Chop',
      status: 'NO_TRADE',
      tag: 'NO TRADE ALLOWED',
      notes: '–',
      canTrade: false,
      color: '#ef4444',
      volatility: 'Low / Chop',
      code: 'NO',
      badge: 'No trade'
    },
    {
      id: 'gold_euro_scalp',
      start: 660, // 11:00
      end: 720, // 12:00
      name: 'Early-European Setup',
      status: 'TRADE_SCALP',
      tag: 'SCALP TRADE ONLY',
      notes: 'Early-European setup window',
      canTrade: true,
      color: '#38bdf8',
      volatility: 'Moderate Setup Expansion',
      code: 'EU',
      badge: 'TRADE (scalp)'
    },
    {
      id: 'gold_mid_day_drift',
      start: 720, // 12:00
      end: 1140, // 19:00
      name: 'Mid-Day European Lull',
      status: 'NO_TRADE',
      tag: 'NO TRADE ALLOWED',
      notes: '–',
      canTrade: false,
      color: '#ef4444',
      volatility: 'Low / Unstable',
      code: 'NO',
      badge: 'No trade'
    },
    {
      id: 'gold_us_cash_open',
      start: 1140, // 19:00
      end: 1350, // 22:30
      name: 'US Cash Open Window',
      status: 'TRADE_BIG',
      tag: 'CORE TRADE (BIG)',
      notes: 'US cash open — highest trade frequency of the day, real trend character',
      canTrade: true,
      color: '#10b981',
      volatility: 'Very High (Prime Trend Peak)',
      code: 'US',
      badge: 'TRADE (big)'
    },
    {
      id: 'gold_session_close',
      start: 1350, // 22:30
      end: 1440, // 24:00
      name: 'Late Session Drift',
      status: 'NO_TRADE',
      tag: 'NO TRADE ALLOWED',
      notes: '–',
      canTrade: false,
      color: '#ef4444',
      volatility: 'Fading Volatility',
      code: 'NO',
      badge: 'No trade'
    }
  ],
  tracks: [
    {
      id: 'track_gold_tk',
      code: 'TK',
      name: 'Tokyo Sweep',
      shortName: 'Tokyo Sweep',
      sublabel: '05:00 – 06:30 IST',
      color: '#10b981',
      bgLight: 'bg-emerald-500/15',
      borderLight: 'border-emerald-500/30',
      start: 300,
      end: 390,
      status: 'TRADE_BIG',
      zoneId: 'gold_tokyo_sweep'
    },
    {
      id: 'track_gold_as',
      code: 'AS',
      name: 'Asian Scalp',
      shortName: 'Asian Scalp',
      sublabel: '08:00 – 09:00 IST',
      color: '#f59e0b',
      bgLight: 'bg-amber-500/15',
      borderLight: 'border-amber-500/30',
      status: 'TRADE_SCALP',
      start: 480,
      end: 540,
      zoneId: 'gold_asian_scalp'
    },
    {
      id: 'track_gold_eu',
      code: 'EU',
      name: 'Early Europe',
      shortName: 'Early Europe',
      sublabel: '11:00 – 12:00 IST',
      color: '#38bdf8',
      bgLight: 'bg-sky-500/15',
      borderLight: 'border-sky-500/30',
      status: 'TRADE_SCALP',
      start: 660,
      end: 720,
      zoneId: 'gold_euro_scalp'
    },
    {
      id: 'track_gold_us',
      code: 'US',
      name: 'US Cash Open',
      shortName: 'US Cash',
      sublabel: '19:00 – 22:30 IST',
      color: '#10b981',
      bgLight: 'bg-emerald-500/15',
      borderLight: 'border-emerald-500/30',
      status: 'TRADE_BIG',
      start: 1140,
      end: 1350,
      zoneId: 'gold_us_cash_open'
    },
    {
      id: 'track_gold_no',
      code: 'NO',
      name: 'Capital Defense',
      shortName: 'Defense',
      sublabel: 'Restricted Hours',
      color: '#ef4444',
      bgLight: 'bg-rose-500/15',
      borderLight: 'border-rose-500/30',
      status: 'NO_TRADE',
      start: 0,
      end: 1440,
      zoneId: 'gold_night'
    }
  ],
  quantNotes: {
    title: 'XAU/USD Quantitative Intelligence & Empirical Backtest Warnings',
    highlights: [
      {
        label: '19:00–20:00 vs 20:00–22:30 Reality Check',
        text: 'Only 19:00–20:00 IST inside your 7pm–10:30pm block is statistically data-backed. The 20:00–22:30 hours tested flat-to-negative hour-by-hour (PF 0.94, then 0.77, with 22:00–22:30 entering the red-zone at PF 0.52).',
        level: 'warning'
      },
      {
        label: '00:00–01:00 IST Anomaly',
        text: 'This schedule skips 00:00–01:00 IST entirely, which was the single highest Profit Factor hour in the entire gold dataset (PF 3.18, sample n=20). Keep this in mind if active during late night.',
        level: 'info'
      },
      {
        label: 'Tokyo Open Sweep Alpha',
        text: '05:00–06:30 IST offers clean, highly repeatable liquidity sweeps against Asian highs/lows with reliable mean-reversion and continuation follow-through.',
        level: 'success'
      }
    ],
    summary: 'Executive Takeaway: Treat 19:00–20:00 IST as prime execution velocity, but tighten risk drastically or halt new positions after 20:00 IST as edge decays sharply towards 22:30 IST.'
  },
  getVolatilityLevelAtIst: (istMins: number) => {
    // Peak 1: Tokyo Sweep 05:00 to 06:30 (center 345 mins)
    if (istMins >= 300 && istMins <= 390) {
      const dist = Math.abs(istMins - 345);
      return 12 + 68 * Math.max(0, 1 - Math.pow(dist / 45, 2));
    }
    // Peak 2: Asian Scalp 08:00 to 09:00 (center 510 mins)
    if (istMins >= 480 && istMins <= 540) {
      const dist = Math.abs(istMins - 510);
      return 10 + 38 * Math.max(0, 1 - Math.pow(dist / 30, 2));
    }
    // Peak 3: Early Europe 11:00 to 12:00 (center 690 mins)
    if (istMins >= 660 && istMins <= 720) {
      const dist = Math.abs(istMins - 690);
      return 10 + 44 * Math.max(0, 1 - Math.pow(dist / 30, 2));
    }
    // Peak 4: US Cash Open 19:00 to 22:30 (highest between 19:00-20:00, center ~1170)
    if (istMins >= 1140 && istMins <= 1350) {
      // Skewed peak towards 19:00-20:30
      const dist = Math.abs(istMins - 1200);
      return 14 + 86 * Math.max(0, 1 - Math.pow(dist / 110, 2));
    }
    return 7;
  }
};

export const ASSETS: Record<string, AssetConfig> = {
  btc: BTC_CONFIG,
  gold: GOLD_CONFIG
};
