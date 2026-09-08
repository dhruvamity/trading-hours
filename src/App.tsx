import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  ChevronDown
} from 'lucide-react';

interface Zone {
  id: string;
  start: number; // in minutes from midnight IST
  end: number;
  name: string;
  type: 'NO_TRADE' | 'SWING_ONLY' | 'SCALP_ONLY' | 'TRADE_HIGH_VOL';
  tag: string;
  category: 'swing' | 'scalp' | 'overlap' | 'dead';
  color: string;
  volatility: string;
  canTrade: boolean;
  label: string;
  code: 'AS' | 'LD' | 'US' | 'NO';
}

const ZONES: Zone[] = [
  {
    id: 'off_night',
    start: 0,
    end: 330, // 05:30
    name: 'Off-Hours',
    type: 'NO_TRADE',
    tag: 'NO TRADE ALLOWED',
    category: 'dead',
    code: 'NO',
    color: '#ef4444',
    volatility: 'Low / Illiquid',
    canTrade: false,
    label: 'Off-Hours',
  },
  {
    id: 'asian_swing',
    start: 330, // 05:30
    end: 510, // 08:30
    name: 'Asian Swing',
    type: 'SWING_ONLY',
    tag: 'SWING TRADES ONLY',
    category: 'swing',
    code: 'AS',
    color: '#2563eb',
    volatility: 'Moderate Swing',
    canTrade: true,
    label: 'Asian Swing',
  },
  {
    id: 'asia_chop',
    start: 510, // 08:30
    end: 930, // 15:30
    name: 'Chop & Range Grind',
    type: 'NO_TRADE',
    tag: 'NO TRADE ALLOWED',
    category: 'dead',
    code: 'NO',
    color: '#ef4444',
    volatility: 'Low / Chop',
    canTrade: false,
    label: 'Chop & Range Grind',
  },
  {
    id: 'london_scalp',
    start: 930, // 15:30
    end: 1050, // 17:30
    name: 'London Scalp',
    type: 'SCALP_ONLY',
    tag: 'SCALP TRADES ONLY',
    category: 'scalp',
    code: 'LD',
    color: '#f59e0b',
    volatility: 'Moderate Expansion',
    canTrade: true,
    label: 'London Scalp',
  },
  {
    id: 'pre_ny_trap',
    start: 1050, // 17:30
    end: 1110, // 18:30
    name: 'Pre-NY Trap Zone',
    type: 'NO_TRADE',
    tag: 'NO TRADE ALLOWED',
    category: 'dead',
    code: 'NO',
    color: '#ef4444',
    volatility: 'Unstable / Trap',
    canTrade: false,
    label: 'Trap',
  },
  {
    id: 'us_prime',
    start: 1110, // 18:30
    end: 1350, // 22:30
    name: 'US Prime Overlap',
    type: 'TRADE_HIGH_VOL',
    tag: 'CORE HIGH VOLATILITY',
    category: 'overlap',
    code: 'US',
    color: '#10b981',
    volatility: 'High (Prime Peak)',
    canTrade: true,
    label: 'US Prime Overlap',
  },
  {
    id: 'late_close',
    start: 1350, // 22:30
    end: 1440, // 24:00
    name: 'Session Close',
    type: 'NO_TRADE',
    tag: 'NO TRADE ALLOWED',
    category: 'dead',
    code: 'NO',
    color: '#ef4444',
    volatility: 'Fading Volatility',
    canTrade: false,
    label: 'Close',
  }
];

type TzId = 'IST' | 'UTC' | 'ET';

interface TimezoneOption {
  id: TzId;
  label: string;
  short: string;
  iana: string;
  description: string;
}

const TIMEZONES: Record<TzId, TimezoneOption> = {
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

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

function formatMins(totalMins: number): string {
  const m = ((Math.floor(totalMins) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${pad(h)}:${pad(min)}`;
}

interface BlockSegment {
  leftPct: number;
  widthPct: number;
  startMin: number;
  endMin: number;
}

function getSegmentsInTimezone(startIst: number, endIst: number, offsetMinutes: number): BlockSegment[] {
  const startTz = ((startIst + offsetMinutes) % 1440 + 1440) % 1440;
  const duration = endIst - startIst;
  const endTz = startTz + duration;

  if (endTz <= 1440) {
    return [{
      leftPct: (startTz / 1440) * 100,
      widthPct: (duration / 1440) * 100,
      startMin: startTz,
      endMin: endTz
    }];
  } else {
    // Crosses midnight: split into 2 visual segments
    const seg1Width = 1440 - startTz;
    const seg2Width = endTz - 1440;
    return [
      {
        leftPct: (startTz / 1440) * 100,
        widthPct: (seg1Width / 1440) * 100,
        startMin: startTz,
        endMin: 1440
      },
      {
        leftPct: 0,
        widthPct: (seg2Width / 1440) * 100,
        startMin: 0,
        endMin: seg2Width
      }
    ];
  }
}

// Volatility level at IST minute (0 to 1440)
function getVolatilityLevelAtIst(istMins: number): number {
  if (istMins >= 330 && istMins <= 510) {
    // Asian swing: center 420
    const dist = Math.abs(istMins - 420);
    return 10 + 35 * Math.max(0, 1 - Math.pow(dist / 90, 2));
  }
  if (istMins >= 930 && istMins <= 1050) {
    // London scalp: center 990
    const dist = Math.abs(istMins - 990);
    return 10 + 55 * Math.max(0, 1 - Math.pow(dist / 60, 2));
  }
  if (istMins >= 1110 && istMins <= 1350) {
    // US prime: center 1230
    const dist = Math.abs(istMins - 1230);
    return 12 + 82 * Math.max(0, 1 - Math.pow(dist / 120, 2));
  }
  return 8;
}

// Dynamic offset calculation in minutes from IST to target timezone
function getTzOffsetMinutesFromIST(iana: string): number {
  const now = new Date();
  const istStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const targetStr = now.toLocaleString('en-US', { timeZone: iana });
  const diffMs = new Date(targetStr).getTime() - new Date(istStr).getTime();
  return Math.round(diffMs / 60000);
}

// Live time in a specific timezone
function getLiveTime(iana: string) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long'
  });
  const parts = formatter.formatToParts(now);
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || '';

  let hours = parseInt(getVal('hour'), 10);
  if (hours === 24) hours = 0;
  const minutes = parseInt(getVal('minute'), 10);
  const seconds = parseInt(getVal('second'), 10);
  const day = getVal('weekday').toUpperCase();

  return {
    hours,
    minutes,
    seconds,
    totalMinutes: hours * 60 + minutes,
    day
  };
}

export default function App() {
  const [selectedTz, setSelectedTz] = useState<TzId>('IST');

  // Real-time live clocks
  const [clockState, setClockState] = useState<{
    ist: ReturnType<typeof getLiveTime>;
    tz: ReturnType<typeof getLiveTime>;
    offsetFromIST: number;
  }>(() => {
    const tzObj = TIMEZONES['IST'];
    return {
      ist: getLiveTime('Asia/Kolkata'),
      tz: getLiveTime(tzObj.iana),
      offsetFromIST: 0
    };
  });

  const activeTzObj = TIMEZONES[selectedTz];

  // Clock ticker updating every second
  useEffect(() => {
    const update = () => {
      const istTime = getLiveTime('Asia/Kolkata');
      const tzTime = getLiveTime(activeTzObj.iana);
      const offset = getTzOffsetMinutesFromIST(activeTzObj.iana);
      setClockState({
        ist: istTime,
        tz: tzTime,
        offsetFromIST: offset
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeTzObj]);

  const { ist: istTime, tz: tzTime, offsetFromIST } = clockState;

  // Active Zone (determined by universal market session time via IST)
  const currentZone = useMemo(() => {
    return ZONES.find(z => istTime.totalMinutes >= z.start && istTime.totalMinutes < z.end) || ZONES[0];
  }, [istTime.totalMinutes]);

  // Next tradable zone calculation
  const nextTradableZone = useMemo(() => {
    const tradable = ZONES.filter(z => z.canTrade);
    const upcoming = tradable.find(z => z.start > istTime.totalMinutes);
    if (upcoming) {
      return {
        zone: upcoming,
        diffMinutes: upcoming.start - istTime.totalMinutes
      };
    }
    const firstTomorrow = tradable[0];
    return {
      zone: firstTomorrow,
      diffMinutes: (1440 - istTime.totalMinutes) + firstTomorrow.start
    };
  }, [istTime.totalMinutes]);

  // Countdown calculations auto-adjusted for selected timezone
  const countdownData = useMemo(() => {
    if (currentZone.canTrade) {
      const remMins = currentZone.end - istTime.totalMinutes;
      const totalSecs = remMins * 60 - istTime.seconds;
      const ch = Math.floor(Math.max(0, totalSecs) / 3600);
      const cm = Math.floor((Math.max(0, totalSecs) % 3600) / 60);
      const cs = Math.max(0, totalSecs) % 60;

      const zoneDuration = (currentZone.end - currentZone.start) * 60;
      const elapsedSecs = (istTime.totalMinutes - currentZone.start) * 60 + istTime.seconds;
      const percent = Math.min(100, Math.max(0, Math.floor((elapsedSecs / zoneDuration) * 100)));

      let label = 'UNTIL SESSION CLOSE';
      if (currentZone.id === 'asian_swing') label = 'UNTIL SWING CLOSE';
      if (currentZone.id === 'london_scalp') label = 'UNTIL SCALP CLOSE';
      if (currentZone.id === 'us_prime') label = 'UNTIL PRIME CLOSE';

      const slotStartTz = (currentZone.start + offsetFromIST + 1440) % 1440;
      const slotEndTz = (currentZone.end + offsetFromIST + 1440) % 1440;

      return {
        tagLabel: label,
        formattedTime: `${pad(ch)}h ${pad(cm)}m ${pad(cs)}s`,
        percentElapsed: percent,
        slotStr: `${formatMins(slotStartTz)} – ${formatMins(slotEndTz)} ${activeTzObj.short}`,
        status: 'active',
        color: currentZone.id === 'us_prime' ? 'emerald' : currentZone.id === 'london_scalp' ? 'amber' : 'sky'
      };
    } else {
      const totalSecs = nextTradableZone.diffMinutes * 60 - istTime.seconds;
      const ch = Math.floor(Math.max(0, totalSecs) / 3600);
      const cm = Math.floor((Math.max(0, totalSecs) % 3600) / 60);
      const cs = Math.max(0, totalSecs) % 60;

      const zoneDuration = (currentZone.end - currentZone.start) * 60;
      const elapsedSecs = (istTime.totalMinutes - currentZone.start) * 60 + istTime.seconds;
      const percent = Math.min(100, Math.max(0, Math.floor((elapsedSecs / zoneDuration) * 100)));

      let targetText = 'TRADE SESSION';
      if (nextTradableZone.zone.id === 'london_scalp') targetText = 'SCALP ONLY';
      else if (nextTradableZone.zone.id === 'asian_swing') targetText = 'SWING ONLY';
      else if (nextTradableZone.zone.id === 'us_prime') targetText = 'US PRIME OVERLAP';

      const slotStartTz = (nextTradableZone.zone.start + offsetFromIST + 1440) % 1440;
      const slotEndTz = (nextTradableZone.zone.end + offsetFromIST + 1440) % 1440;

      return {
        tagLabel: `UNTIL ${targetText}`,
        formattedTime: `${pad(ch)}h ${pad(cm)}m ${pad(cs)}s`,
        percentElapsed: percent,
        slotStr: `${formatMins(slotStartTz)} – ${formatMins(slotEndTz)} ${activeTzObj.short}`,
        status: 'restricted',
        color: 'amber'
      };
    }
  }, [currentZone, istTime, nextTradableZone, offsetFromIST, activeTzObj]);

  // Needle position in percentage of 24h track in selected timezone
  const needlePct = Math.min(100, Math.max(0, (tzTime.totalMinutes / 1440) * 100));

  // Compute session segments in selected timezone
  const asianSwingSegments = useMemo(() => getSegmentsInTimezone(330, 510, offsetFromIST), [offsetFromIST]);
  const londonScalpSegments = useMemo(() => getSegmentsInTimezone(930, 1050, offsetFromIST), [offsetFromIST]);
  const usPrimeSegments = useMemo(() => getSegmentsInTimezone(1110, 1350, offsetFromIST), [offsetFromIST]);

  const deadZoneSegments = useMemo(() => {
    return [
      ...getSegmentsInTimezone(0, 330, offsetFromIST).map(s => ({ ...s, label: 'Off-Hours', title: 'Off-Hours' })),
      ...getSegmentsInTimezone(510, 930, offsetFromIST).map(s => ({ ...s, label: 'Chop & Asian Range', title: 'Chop & Range Grind' })),
      ...getSegmentsInTimezone(1050, 1110, offsetFromIST).map(s => ({ ...s, label: 'Trap', title: 'Pre-NY Trap Zone' })),
      ...getSegmentsInTimezone(1350, 1440, offsetFromIST).map(s => ({ ...s, label: 'Close', title: 'Session Close' })),
    ];
  }, [offsetFromIST]);

  // Time labels for left column index
  const asRangeLabel = useMemo(() => {
    const s = (330 + offsetFromIST + 1440) % 1440;
    const e = (510 + offsetFromIST + 1440) % 1440;
    return `${formatMins(s)} - ${formatMins(e)}`;
  }, [offsetFromIST]);

  const ldRangeLabel = useMemo(() => {
    const s = (930 + offsetFromIST + 1440) % 1440;
    const e = (1050 + offsetFromIST + 1440) % 1440;
    return `${formatMins(s)} - ${formatMins(e)}`;
  }, [offsetFromIST]);

  const usRangeLabel = useMemo(() => {
    const s = (1110 + offsetFromIST + 1440) % 1440;
    const e = (1350 + offsetFromIST + 1440) % 1440;
    return `${formatMins(s)} - ${formatMins(e)}`;
  }, [offsetFromIST]);

  // TradingView-style Hover State
  const [hoverData, setHoverData] = useState<{
    isHovering: boolean;
    xPct: number;
    yPx: number;
    minutesInTz: number;
    targetZone: Zone;
    trackCode: 'AS' | 'LD' | 'US' | 'NO';
  } | null>(null);

  const handleChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const clampedX = Math.max(0, Math.min(rect.width, clientX));
    const clampedY = Math.max(0, Math.min(rect.height, clientY));

    const xPct = (clampedX / rect.width) * 100;
    const minutesInTz = Math.min(1439, Math.max(0, Math.round((xPct / 100) * 1440)));

    // Corresponding IST minute for zone classification
    const minutesInIst = ((minutesInTz - offsetFromIST) % 1440 + 1440) % 1440;
    const zone = ZONES.find(z => minutesInIst >= z.start && minutesInIst < z.end) || ZONES[0];

    let trackCode: 'AS' | 'LD' | 'US' | 'NO' = 'AS';
    const rowRatio = clampedY / rect.height;
    if (rowRatio < 0.25) trackCode = 'AS';
    else if (rowRatio < 0.5) trackCode = 'LD';
    else if (rowRatio < 0.75) trackCode = 'US';
    else trackCode = 'NO';

    setHoverData({
      isHovering: true,
      xPct,
      yPx: clampedY,
      minutesInTz,
      targetZone: zone,
      trackCode
    });
  };

  const handleVolMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const clampedX = Math.max(0, Math.min(rect.width, clientX));
    const clampedY = Math.max(0, Math.min(rect.height, clientY));

    const xPct = (clampedX / rect.width) * 100;
    const minutesInTz = Math.min(1439, Math.max(0, Math.round((xPct / 100) * 1440)));

    const minutesInIst = ((minutesInTz - offsetFromIST) % 1440 + 1440) % 1440;
    const zone = ZONES.find(z => minutesInIst >= z.start && minutesInIst < z.end) || ZONES[0];

    setHoverData({
      isHovering: true,
      xPct,
      yPx: clampedY,
      minutesInTz,
      targetZone: zone,
      trackCode: zone.code
    });
  };

  const handleChartMouseLeave = () => {
    setHoverData(null);
  };

  // Generate dynamic volatility SVG path auto-adjusted to the selected timezone
  const volPathData = useMemo(() => {
    const points: string[] = [];
    const step = 10; // 100 samples across 1000px
    for (let x = 0; x <= 1000; x += step) {
      const minInTz = (x / 1000) * 1440;
      const minInIst = ((minInTz - offsetFromIST) % 1440 + 1440) % 1440;
      const level = getVolatilityLevelAtIst(minInIst);
      const y = Math.round(112 - level * 0.94);
      points.push(`${x},${y}`);
    }

    const areaPath = `M 0,120 L 0,${points[0].split(',')[1]} ` + points.map(p => `L ${p}`).join(' ') + ` L 1000,120 Z`;
    const linePath = `M ${points[0]} ` + points.map(p => `L ${p}`).join(' ');

    return { areaPath, linePath };
  }, [offsetFromIST]);

  // SVG Circle parameters for progress gauge
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (countdownData.percentElapsed / 100) * circumference;

  return (
    <main id="btc-tracker-widget" className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col items-center justify-center p-2.5 sm:p-6 md:p-8">
      {/* Main Widget Container */}
      <div
        id="tracker-card"
        className="w-full max-w-5xl bg-[#0f172a] border border-slate-800/90 rounded-2xl shadow-2xl p-4 sm:p-7 md:p-9 relative overflow-hidden"
      >
        {/* TOP HEADER - With Top-Right Timezone Dropdown */}
        <header id="widget-header" className="flex items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <h1 id="app-title" className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
              BTC Session Tracker
            </h1>
            <span
              id="top-tz-badge"
              className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
            >
              {activeTzObj.short}
            </span>
          </div>

          {/* Controls: Timezone Selector Dropdown at Top Right */}
          <div className="flex items-center gap-2.5 shrink-0">
            <label htmlFor="tz-select-top" className="text-xs font-medium text-slate-400 font-mono hidden xs:inline sm:inline">
              TIMEZONE:
            </label>
            <div className="relative">
              <select
                id="tz-select-top"
                value={selectedTz}
                onChange={(e) => setSelectedTz(e.target.value as TzId)}
                className="bg-[#131c31] hover:bg-[#18233d] border border-slate-700/90 rounded-lg px-3 py-1.5 pr-8 text-xs sm:text-sm font-mono font-bold text-emerald-400 appearance-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer shadow-sm"
              >
                <option value="IST" className="bg-[#0f172a] text-slate-200">
                  IST (UTC+5:30)
                </option>
                <option value="UTC" className="bg-[#0f172a] text-slate-200">
                  UTC (UTC+0:00)
                </option>
                <option value="ET" className="bg-[#0f172a] text-slate-200">
                  ET (New York)
                </option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </header>

        {/* STATUS BANNER + COUNTDOWN GAUGE */}
        <section id="status-timer-section" className="mt-5 flex flex-col lg:flex-row lg:items-stretch justify-between gap-4">
          {/* Left Column: Live Time Readout & Current Permission Pill */}
          <div className="w-full lg:w-72 flex flex-col justify-between gap-3 shrink-0">
            {/* Live Clock Card in Selected Timezone */}
            <div className="bg-[#131c31]/90 border border-slate-700/70 rounded-xl px-4 py-3 flex items-center justify-between shadow-inner">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  LIVE CLOCK ({activeTzObj.short})
                </div>
                <div id="live-digital-time" className="text-xl sm:text-2xl font-mono font-extrabold text-white tracking-tight mt-0.5">
                  {pad(tzTime.hours)}:{pad(tzTime.minutes)}:{pad(tzTime.seconds)}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  {tzTime.day}
                </span>
                {selectedTz !== 'IST' && (
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    IST: {pad(istTime.hours)}:{pad(istTime.minutes)}
                  </div>
                )}
              </div>
            </div>

            {/* Current Permission Banner */}
            <div
              id="permission-banner"
              className={`rounded-xl px-3.5 py-2.5 flex items-center gap-3 shadow-inner border transition-all duration-300 ${
                currentZone.canTrade
                  ? currentZone.id === 'us_prime'
                    ? 'bg-gradient-to-r from-emerald-950/40 to-[#131c31] border-emerald-500/40'
                    : currentZone.id === 'london_scalp'
                    ? 'bg-gradient-to-r from-amber-950/40 to-[#131c31] border-amber-500/40'
                    : 'bg-gradient-to-r from-blue-950/40 to-[#131c31] border-blue-500/40'
                  : 'bg-gradient-to-r from-rose-950/30 to-[#131c31] border-red-500/30'
              }`}
            >
              <span className="relative flex h-3 w-3 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    currentZone.canTrade
                      ? currentZone.id === 'us_prime'
                        ? 'bg-emerald-400'
                        : currentZone.id === 'london_scalp'
                        ? 'bg-amber-400'
                        : 'bg-blue-400'
                      : 'bg-red-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    currentZone.canTrade
                      ? currentZone.id === 'us_prime'
                        ? 'bg-emerald-500'
                        : currentZone.id === 'london_scalp'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                      : 'bg-red-500'
                  }`}
                ></span>
              </span>
              <div className="min-w-0">
                <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold leading-tight">
                  {currentZone.canTrade ? 'ACTIVE TRADE SESSION' : 'CURRENT PERMISSION'}
                </div>
                <div className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                  {currentZone.canTrade ? currentZone.tag : 'NO TRADE ALLOWED'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Circular Progress Countdown Widget */}
          <div
            id="countdown-gauge-card"
            className="flex-1 bg-[#0c131f] border border-[#1e293b] rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.35)] relative overflow-hidden"
          >
            {/* Background Glow */}
            <div
              className={`absolute -left-10 -top-10 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
                countdownData.color === 'emerald'
                  ? 'bg-emerald-500/10'
                  : countdownData.color === 'sky'
                  ? 'bg-sky-500/10'
                  : 'bg-amber-500/10'
              }`}
            ></div>

            {/* Left: Circular Ring with Elapsed Progress */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-22 h-22 sm:w-[102px] sm:h-[102px] -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#1c2536"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={
                    countdownData.color === 'emerald'
                      ? '#10b981'
                      : countdownData.color === 'sky'
                      ? '#38bdf8'
                      : '#f59e0b'
                  }
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span id="elapsed-percent-value" className="text-base sm:text-xl font-extrabold font-mono text-white tracking-tight leading-none">
                  {countdownData.percentElapsed}%
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase mt-1">
                  ELAPSED
                </span>
              </div>
            </div>

            {/* Right: Countdown & Target Label */}
            <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left justify-center min-w-0">
              <div
                id="countdown-target-label"
                className={`flex items-center gap-1.5 text-xs font-mono uppercase font-bold tracking-wider ${
                  countdownData.color === 'emerald'
                    ? 'text-emerald-400'
                    : countdownData.color === 'sky'
                    ? 'text-sky-400'
                    : 'text-amber-400/90'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{countdownData.tagLabel}</span>
              </div>

              <div
                id="led-countdown-timer"
                className={`mt-1 sm:mt-0.5 text-2xl sm:text-4xl md:text-[42px] font-extrabold font-mono tracking-tight select-all leading-tight ${
                  countdownData.color === 'emerald'
                    ? 'text-[#10b981] timer-glow-emerald'
                    : countdownData.color === 'sky'
                    ? 'text-[#38bdf8] timer-glow-sky'
                    : 'text-[#ffb703] timer-glow-amber'
                }`}
              >
                {countdownData.formattedTime}
              </div>

              <div className="mt-1 text-xs font-mono text-slate-400 flex items-center gap-2">
                <span className="text-slate-500 font-semibold">Slot:</span>
                <span id="slot-time-range" className="text-slate-300 font-medium">
                  {countdownData.slotStr}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* TIMELINE SCHEDULE SECTION - BIRD'S EYE VIEW IN SELECTED TIMEZONE */}
        <section id="interactive-timeline-section" className="mt-7">
          <div className="w-full select-none">
            {/* Time Axis Bar - Fluid 00:00 to 24:00 in selected timezone */}
            <div className="flex mb-3 sm:mb-4 text-[10px] sm:text-xs font-mono text-slate-400 items-center">
              {/* Left Label / Time Display in Top of the Index */}
              <div className="w-12 sm:w-32 shrink-0 flex items-center pr-2 sm:pr-3">
                {hoverData?.isHovering ? (
                  <div
                    id="top-index-hover-badge"
                    className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-emerald-400 font-mono font-bold text-xs tracking-tight shadow-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="truncate">{formatMins(hoverData.minutesInTz)}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{hoverData.targetZone.code}</span>
                  </div>
                ) : (
                  <span className="hidden sm:inline text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                    INDEX
                  </span>
                )}
              </div>

              {/* Axis markers across the tracks */}
              <div className="flex-1 flex justify-between relative px-0">
                <span className="text-left -ml-1 sm:-ml-2">00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span className="text-right -mr-1 sm:-mr-2">24:00</span>

                {/* TradingView Floating Time Pill directly on top of the scale at cursor position */}
                {hoverData?.isHovering && (
                  <div
                    id="hover-scale-time-badge"
                    className="hidden sm:flex absolute -top-1 pointer-events-none z-40 transition-all duration-75"
                    style={{ left: `${hoverData.xPct}%` }}
                  >
                    <div
                      className={`bg-slate-900 border border-slate-600 text-slate-100 px-2.5 py-0.5 rounded shadow-xl font-mono text-xs font-bold whitespace-nowrap flex items-center gap-1.5 -translate-y-full ${
                        hoverData.xPct < 12
                          ? 'translate-x-0'
                          : hoverData.xPct > 88
                          ? '-translate-x-full'
                          : '-translate-x-1/2'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: hoverData.targetZone.color }}
                      ></span>
                      <span className="text-white">{formatMins(hoverData.minutesInTz)}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {activeTzObj.short}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Master Grid: Left AS LD US NO index + Right tracks */}
            <div className="flex w-full">
              {/* Left AS LD US NO Index Column */}
              <div className="w-12 sm:w-32 shrink-0 flex flex-col gap-3.5 sm:gap-4">
                {/* AS Index Row */}
                <div
                  className={`h-16 sm:h-20 flex items-center gap-2 sm:gap-3 pr-2 sm:pr-3 rounded-lg transition-colors ${
                    hoverData?.isHovering && hoverData.trackCode === 'AS' ? 'bg-blue-950/40 ring-1 ring-blue-500/40' : ''
                  }`}
                >
                  <span className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs sm:text-sm font-bold font-mono flex items-center justify-center shrink-0">
                    AS
                  </span>
                  <div className="hidden sm:block min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-200 leading-tight truncate">Asian</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">{asRangeLabel}</div>
                  </div>
                </div>

                {/* LD Index Row */}
                <div
                  className={`h-16 sm:h-20 flex items-center gap-2 sm:gap-3 pr-2 sm:pr-3 rounded-lg transition-colors ${
                    hoverData?.isHovering && hoverData.trackCode === 'LD' ? 'bg-amber-950/40 ring-1 ring-amber-500/40' : ''
                  }`}
                >
                  <span className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-bold font-mono flex items-center justify-center shrink-0">
                    LD
                  </span>
                  <div className="hidden sm:block min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-200 leading-tight truncate">London</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">{ldRangeLabel}</div>
                  </div>
                </div>

                {/* US Index Row */}
                <div
                  className={`h-16 sm:h-20 flex items-center gap-2 sm:gap-3 pr-2 sm:pr-3 rounded-lg transition-colors ${
                    hoverData?.isHovering && hoverData.trackCode === 'US' ? 'bg-emerald-950/40 ring-1 ring-emerald-500/40' : ''
                  }`}
                >
                  <span className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-bold font-mono flex items-center justify-center shrink-0">
                    US
                  </span>
                  <div className="hidden sm:block min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-200 leading-tight truncate">US Prime</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">{usRangeLabel}</div>
                  </div>
                </div>

                {/* NO Index Row */}
                <div
                  className={`h-16 sm:h-20 flex items-center gap-2 sm:gap-3 pr-2 sm:pr-3 rounded-lg transition-colors ${
                    hoverData?.isHovering && hoverData.trackCode === 'NO' ? 'bg-rose-950/40 ring-1 ring-rose-500/40' : ''
                  }`}
                >
                  <span className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs sm:text-sm font-bold font-mono flex items-center justify-center shrink-0">
                    NO
                  </span>
                  <div className="hidden sm:block min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-300 leading-tight truncate">Restricted</div>
                    <div className="text-[10px] font-mono text-rose-400/80 mt-0.5">Capital Defense</div>
                  </div>
                </div>
              </div>

              {/* Right Tracks Column - Full Width Fluid Bird's Eye View with Generous Height */}
              <div
                id="timeline-tracks-container"
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
                className="flex-1 min-w-0 relative flex flex-col gap-3.5 sm:gap-4 sm:cursor-crosshair"
              >
                {/* Vertical Time Hover Guide moving with cursor X */}
                {hoverData?.isHovering && (
                  <div
                    id="tradingview-crosshair-vertical"
                    className="hidden sm:block absolute top-0 bottom-0 border-r border-dashed border-slate-300/60 pointer-events-none z-30 transition-all duration-75"
                    style={{ left: `${hoverData.xPct}%` }}
                  />
                )}

                {/* Vertical Synchronized Live Time Needle across all tracks */}
                <div
                  id="timeline-needle"
                  className="absolute -top-6 sm:-top-7 bottom-0 w-[1.5px] bg-white z-20 pointer-events-none transition-all duration-150"
                  style={{ left: `${needlePct}%` }}
                >
                  {/* Floating Needle Badge */}
                  <div
                    id="needle-pill"
                    className={`absolute -top-1 bg-emerald-500 text-slate-950 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md shadow-lg font-mono text-center flex flex-col items-center whitespace-nowrap transition-transform duration-100 ${
                      needlePct < 15
                        ? 'left-0 translate-x-0'
                        : needlePct > 85
                        ? 'right-0 translate-x-0'
                        : 'left-1/2 -translate-x-1/2'
                    } -translate-y-full`}
                  >
                    <span id="needle-time" className="text-[10px] sm:text-xs font-bold leading-tight">
                      {pad(tzTime.hours)}:{pad(tzTime.minutes)}:{pad(tzTime.seconds)}
                    </span>
                    <span id="needle-day" className="text-[8px] sm:text-[9px] font-semibold opacity-85 uppercase tracking-wide">
                      {tzTime.day} {activeTzObj.short}
                    </span>
                    {/* Downward pointer tip */}
                    <div
                      className={`w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-emerald-500 absolute -bottom-1 ${
                        needlePct < 15 ? 'left-3' : needlePct > 85 ? 'right-3' : 'left-1/2 -translate-x-1/2'
                      }`}
                    ></div>
                  </div>
                </div>

                {/* ROW 1 TRACK: Asian */}
                <div className="relative w-full h-16 sm:h-20 bg-[#131b2e] rounded-lg sm:rounded-xl overflow-hidden border border-slate-800/90 shadow-inner">
                  {/* Background Grid Guide Lines at 25%, 50%, 75% (06:00, 12:00, 18:00) */}
                  <div className="absolute inset-0 pointer-events-none flex">
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 h-full"></div>
                  </div>

                  {/* Active Asian Segments (Auto-adjusted for timezone) */}
                  {asianSwingSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      title={`Asian: ${asRangeLabel} ${activeTzObj.short}`}
                      className={`absolute top-0 bottom-0 bg-blue-600/95 transition-all flex flex-col items-center justify-center px-1 sm:px-2 text-white shadow-md cursor-default ${
                        currentZone.id === 'asian_swing' ? 'ring-2 ring-white/90 brightness-115 font-bold shadow-blue-500/40' : ''
                      }`}
                      style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }}
                    >
                      <span className="text-[10px] sm:text-xs font-semibold truncate leading-tight">
                        {currentZone.id === 'asian_swing' ? 'Active' : 'Asian'}
                      </span>
                      <span className="hidden sm:inline text-[9px] text-blue-200/90 font-mono mt-0.5 truncate">
                        {asRangeLabel}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ROW 2 TRACK: London */}
                <div className="relative w-full h-16 sm:h-20 bg-[#131b2e] rounded-lg sm:rounded-xl overflow-hidden border border-slate-800/90 shadow-inner">
                  {/* Background Grid Guide Lines */}
                  <div className="absolute inset-0 pointer-events-none flex">
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 h-full"></div>
                  </div>

                  {/* Active London Segments (Auto-adjusted for timezone) */}
                  {londonScalpSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      title={`London: ${ldRangeLabel} ${activeTzObj.short}`}
                      className={`absolute top-0 bottom-0 bg-amber-500 transition-all flex flex-col items-center justify-center px-1 sm:px-2 text-slate-950 font-bold shadow-md cursor-default ${
                        currentZone.id === 'london_scalp' ? 'ring-2 ring-white/90 brightness-115 shadow-amber-500/40' : ''
                      }`}
                      style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }}
                    >
                      <span className="text-[10px] sm:text-xs leading-tight truncate">
                        {currentZone.id === 'london_scalp' ? 'Active' : 'London'}
                      </span>
                      <span className="hidden sm:inline text-[9px] text-slate-900/80 font-mono mt-0.5 truncate">
                        {ldRangeLabel}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ROW 3 TRACK: US Prime Overlap */}
                <div className="relative w-full h-16 sm:h-20 bg-[#131b2e] rounded-lg sm:rounded-xl overflow-hidden border border-slate-800/90 shadow-inner">
                  {/* Background Grid Guide Lines */}
                  <div className="absolute inset-0 pointer-events-none flex">
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 h-full"></div>
                  </div>

                  {/* Active US Prime Segments (Auto-adjusted for timezone) */}
                  {usPrimeSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      title={`US Prime Overlap: ${usRangeLabel} ${activeTzObj.short}`}
                      className={`absolute top-0 bottom-0 bg-emerald-500 transition-all flex flex-col items-center justify-center px-1 sm:px-2 text-slate-950 font-bold shadow-md cursor-default ${
                        currentZone.id === 'us_prime' ? 'ring-2 ring-white/90 brightness-115 shadow-emerald-500/40' : ''
                      }`}
                      style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }}
                    >
                      <span className="text-[10px] sm:text-xs leading-tight truncate">
                        {currentZone.id === 'us_prime' ? 'High Vol Active' : 'US Prime'}
                      </span>
                      <span className="hidden sm:inline text-[9px] text-slate-950/80 font-mono mt-0.5 truncate">
                        {usRangeLabel}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ROW 4 TRACK: Restricted Dead Zones */}
                <div className="relative w-full h-16 sm:h-20 bg-[#131b2e] rounded-lg sm:rounded-xl overflow-hidden border border-slate-800/90 shadow-inner flex">
                  {deadZoneSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 bg-rose-950/40 border-r border-rose-900/40 text-[9px] sm:text-[10px] font-mono text-rose-400 flex items-center justify-center px-0.5 sm:px-1 cursor-default"
                      style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }}
                      title={`${seg.title} (${formatMins(seg.startMin)} – ${formatMins(seg.endMin)} ${activeTzObj.short})`}
                    >
                      <span className="truncate">{seg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRADING VOLUME & EXPECTED VOLATILITY WAVEFORM - Auto-Adjusted in Selected Timezone */}
        <section id="volatility-section" className="mt-7 pt-6 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                TRADING VOLUME & EXPECTED VOLATILITY:
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  id="volatility-dot"
                  className={`w-2.5 h-2.5 rounded-full ${
                    currentZone.type === 'TRADE_HIGH_VOL'
                      ? 'bg-emerald-400 animate-pulse'
                      : currentZone.canTrade
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`}
                ></span>
                <span id="volatility-text" className="text-xs font-mono font-bold text-white">
                  {currentZone.volatility}
                </span>
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Session Profile Mode: <span className="text-emerald-400 font-semibold">{activeTzObj.short}</span>
            </div>
          </div>

          {/* SVG Smooth Volatility Area Chart - Auto-adjusted to Selected Timezone */}
          <div className="flex w-full">
            <div className="w-12 sm:w-32 shrink-0"></div>
            <div
              id="volatility-chart-container"
              onMouseMove={handleVolMouseMove}
              onMouseLeave={handleChartMouseLeave}
              className="flex-1 min-w-0 relative h-20 bg-[#101726]/60 rounded-lg sm:rounded-xl overflow-hidden border border-slate-800/60 sm:cursor-crosshair"
            >
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 120">
                <defs>
                  <linearGradient id="volGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="65%" stopColor="#3b82f6" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Vertical Quarter Grid Guidelines */}
                <line x1="250" y1="0" x2="250" y2="120" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="500" y1="0" x2="500" y2="120" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="750" y1="0" x2="750" y2="120" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

                {/* Volatility Area & Line dynamically shifted */}
                <path d={volPathData.areaPath} fill="url(#volGradient)" />
                <path d={volPathData.linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
              </svg>

              {/* Synchronized Needle on Volatility Chart */}
              <div
                id="vol-needle"
                className="absolute top-0 bottom-0 w-[1.5px] bg-white/70 pointer-events-none transition-all duration-150"
                style={{ left: `${needlePct}%` }}
              />

              {/* Vertical Time Hover Guide on volatility chart */}
              {hoverData?.isHovering && (
                <div
                  id="vol-crosshair-vertical"
                  className="hidden sm:block absolute top-0 bottom-0 border-r border-dashed border-slate-300/60 pointer-events-none z-30 transition-all duration-75"
                  style={{ left: `${hoverData.xPct}%` }}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
