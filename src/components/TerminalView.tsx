import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Clock, 
  Calendar, 
  Zap, 
  ShieldAlert, 
  TrendingUp, 
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import bundledSchedule from '../data/bundled_schedule.json';
import { SlotLabel, TerminalSlot } from '../types';
import { pad, formatMins } from '../utils/time';

type InstrumentKey = 'BTCUSDT' | 'XAUUSD_MT5' | 'XAUUSDT_BINANCE';

const INSTRUMENT_META: Record<InstrumentKey, { name: string; tag: string; icon: string }> = {
  BTCUSDT: {
    name: 'BTC/USDT',
    tag: 'Perpetual',
    icon: '₿',
  },
  XAUUSD_MT5: {
    name: 'XAU/USD',
    tag: 'Spot (MT5)',
    icon: '🪙',
  },
  XAUUSDT_BINANCE: {
    name: 'XAU/USDT',
    tag: 'Perp (Binance)',
    icon: '⚡',
  },
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Fri-late'];

export const TerminalView: React.FC = () => {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentKey>('BTCUSDT');
  const [scheduleData, setScheduleData] = useState<any>(bundledSchedule);
  const [now, setNow] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Hover crosshair and segment tooltip state
  const [hoverData, setHoverData] = useState<{
    isHovering: boolean;
    xPct: number;
    minutesInIst: number;
    slot: TerminalSlot | null;
  } | null>(null);

  // Fetch fresh public/schedule.json if available
  useEffect(() => {
    fetch('/schedule.json')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not found');
      })
      .then((data) => {
        if (data?.instruments) {
          setScheduleData(data);
        }
      })
      .catch(() => {
        // Fallback to bundledSchedule
      });
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live IST Date, Time, and total minutes
  const istInfo = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const weekdayStr = getPart('weekday');
    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = parseInt(getPart('hour'), 10) || 0;
    const minute = parseInt(getPart('minute'), 10) || 0;
    const second = parseInt(getPart('second'), 10) || 0;

    const totalMinutes = hour * 60 + minute;

    // Fri-late check: Saturday 00:00 - 04:00 IST
    let effectiveWeekday = weekdayStr;
    if (weekdayStr === 'Saturday' && totalMinutes < 240) {
      effectiveWeekday = 'Fri-late';
    } else if (weekdayStr === 'Saturday' || weekdayStr === 'Sunday') {
      effectiveWeekday = 'Weekend';
    }

    return {
      dateStr: `${weekdayStr}, ${month} ${day}`,
      timeStr: `${pad(hour)}:${pad(minute)}:${pad(second)}`,
      hour,
      minute,
      second,
      totalMinutes,
      weekday: weekdayStr,
      effectiveWeekday,
    };
  }, [now]);

  // Set default selected day to current weekday if valid
  useEffect(() => {
    if (WEEKDAYS.includes(istInfo.effectiveWeekday)) {
      setSelectedDay(istInfo.effectiveWeekday);
    }
  }, [istInfo.effectiveWeekday]);

  // Active regime
  const activeRegime = useMemo(() => {
    const m = now.getUTCMonth(); // 3 = April, 9 = October
    if (m >= 3 && m <= 9) return 'US_SUMMER';
    return 'US_SUMMER';
  }, [now]);

  // Slot map
  const instrumentData = scheduleData?.instruments?.[selectedInstrument] || bundledSchedule.instruments[selectedInstrument];
  const regimeSlotsMap = instrumentData?.regimes?.[activeRegime]?.slots || instrumentData?.regimes?.['POOLED']?.slots || {};

  const selectedDaySlots: TerminalSlot[] = regimeSlotsMap[selectedDay] || [];
  const todayLiveSlots: TerminalSlot[] = regimeSlotsMap[istInfo.effectiveWeekday] || [];

  // Parse start and end minutes for a slot
  const parseSlotRange = (slot: TerminalSlot) => {
    const [sh, sm] = slot.start_time.split(':').map(Number);
    const [eh, em] = slot.end_time.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = (eh === 0 && em === 0 && startMin > 0) ? 1440 : (eh * 60 + em);
    return { startMin, endMin };
  };

  // Active slot, countdowns, and next tradable window
  const statusInfo = useMemo(() => {
    if (!todayLiveSlots || todayLiveSlots.length === 0) {
      return {
        isTradable: false,
        activeSlot: null,
        nextTradableSlot: null,
        secondsRemainingInActive: 0,
        secondsUntilNextTradable: 0,
        percentElapsed: 0,
      };
    }

    let active: TerminalSlot | null = null;
    let activeIndex = -1;

    for (let i = 0; i < todayLiveSlots.length; i++) {
      const { startMin, endMin } = parseSlotRange(todayLiveSlots[i]);
      if (istInfo.totalMinutes >= startMin && istInfo.totalMinutes < endMin) {
        active = todayLiveSlots[i];
        activeIndex = i;
        break;
      }
    }

    if (!active && todayLiveSlots.length > 0) {
      active = todayLiveSlots[0];
      activeIndex = 0;
    }

    const isTradable = active ? (active.label !== 'NO_TRADE' && active.label !== 'CLOSED') : false;

    // Time remaining in active slot
    let secondsRemainingInActive = 0;
    let percentElapsed = 0;

    if (active) {
      const { startMin, endMin } = parseSlotRange(active);
      const totalSlotSecs = (endMin - startMin) * 60;
      const elapsedSecs = (istInfo.totalMinutes - startMin) * 60 + istInfo.second;
      secondsRemainingInActive = Math.max(0, (endMin * 60) - (istInfo.totalMinutes * 60 + istInfo.second));
      percentElapsed = Math.min(100, Math.max(0, Math.floor((elapsedSecs / totalSlotSecs) * 100)));
    }

    // Find next tradable slot if not currently tradable
    let nextTradableSlot: TerminalSlot | null = null;
    let secondsUntilNextTradable = 0;

    const tradableSlots = todayLiveSlots.filter((s) => s.label !== 'NO_TRADE' && s.label !== 'CLOSED');
    if (tradableSlots.length > 0) {
      const upcoming = tradableSlots.find((s) => {
        const { startMin } = parseSlotRange(s);
        return startMin > istInfo.totalMinutes;
      });

      if (upcoming) {
        nextTradableSlot = upcoming;
        const { startMin } = parseSlotRange(upcoming);
        secondsUntilNextTradable = Math.max(0, (startMin * 60) - (istInfo.totalMinutes * 60 + istInfo.second));
      } else {
        // First tradable slot of tomorrow
        nextTradableSlot = tradableSlots[0];
        const { startMin } = parseSlotRange(tradableSlots[0]);
        secondsUntilNextTradable = Math.max(0, ((1440 - istInfo.totalMinutes + startMin) * 60) - istInfo.second);
      }
    }

    return {
      isTradable,
      activeSlot: active,
      nextTradableSlot,
      secondsRemainingInActive,
      secondsUntilNextTradable,
      percentElapsed,
    };
  }, [todayLiveSlots, istInfo.totalMinutes, istInfo.second]);

  // Aggregate day statistics for the selected day
  const dayStats = useMemo(() => {
    let tradableMinutes = 0;
    let defenseMinutes = 0;
    let tradableCount = 0;
    let defenseCount = 0;

    selectedDaySlots.forEach((slot) => {
      if (slot.label !== 'NO_TRADE' && slot.label !== 'CLOSED') {
        tradableMinutes += slot.duration_minutes;
        tradableCount++;
      } else {
        defenseMinutes += slot.duration_minutes;
        defenseCount++;
      }
    });

    return {
      tradableHours: (tradableMinutes / 60).toFixed(1),
      defenseHours: (defenseMinutes / 60).toFixed(1),
      tradableCount,
      defenseCount,
      tradablePct: Math.round((tradableMinutes / 1440) * 100),
    };
  }, [selectedDaySlots]);

  // Live needle position in percentage of 24h
  const needlePct = Math.min(100, Math.max(0, (istInfo.totalMinutes / 1440) * 100));

  // Chart mouse interaction
  const handleChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clampedX = Math.max(0, Math.min(rect.width, clientX));
    const xPct = (clampedX / rect.width) * 100;
    const minutesInIst = Math.min(1439, Math.max(0, Math.round((xPct / 100) * 1440)));

    const slot = selectedDaySlots.find((s) => {
      const { startMin, endMin } = parseSlotRange(s);
      return minutesInIst >= startMin && minutesInIst < endMin;
    }) || null;

    setHoverData({
      isHovering: true,
      xPct,
      minutesInIst,
      slot,
    });
  };

  const handleChartMouseLeave = () => {
    setHoverData(null);
  };

  // Format seconds to H:M:S or M:S
  const formatCountdown = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    }
    return `${pad(m)}m ${pad(s)}s`;
  };

  // Color & badge helpers
  const getSlotVisuals = (label: SlotLabel) => {
    switch (label) {
      case 'PRIME':
        return {
          bg: 'bg-emerald-500 text-slate-950 font-bold',
          badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          dot: 'bg-emerald-400',
          glowText: 'text-emerald-400',
          name: 'PRIME MOMENTUM',
          isTradable: true,
        };
      case 'SWING_ENTRY':
        return {
          bg: 'bg-cyan-500 text-slate-950 font-bold',
          badgeBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
          dot: 'bg-cyan-400',
          glowText: 'text-cyan-400',
          name: 'SWING ENTRY',
          isTradable: true,
        };
      case 'SMALL_TRADES':
        return {
          bg: 'bg-amber-500 text-slate-950 font-bold',
          badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          dot: 'bg-amber-400',
          glowText: 'text-amber-400',
          name: 'SCALP WINDOW',
          isTradable: true,
        };
      case 'CLOSED':
        return {
          bg: 'bg-slate-800 text-slate-400 border border-slate-700/50',
          badgeBg: 'bg-slate-800 text-slate-400 border-slate-700',
          dot: 'bg-slate-500',
          glowText: 'text-slate-400',
          name: 'MARKET CLOSED',
          isTradable: false,
        };
      case 'NO_TRADE':
      default:
        return {
          bg: 'bg-rose-950/40 text-rose-300 border border-rose-900/40',
          badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500',
          glowText: 'text-rose-400',
          name: 'CAPITAL DEFENSE (CHOP)',
          isTradable: false,
        };
    }
  };

  const activeVisuals = statusInfo.activeSlot
    ? getSlotVisuals(statusInfo.activeSlot.label)
    : getSlotVisuals('NO_TRADE');

  const isTodaySelected = selectedDay === istInfo.effectiveWeekday;

  return (
    <div className="flex flex-col gap-5 animate-fade-in text-slate-100 select-none">
      
      {/* 1. MINIMALIST TOP NAV: Asset Switcher & Day Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0d1424] p-3 rounded-2xl border border-slate-800/80 shadow-lg">
        {/* Asset Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#131b2e] rounded-xl border border-slate-800 overflow-x-auto">
          {(Object.keys(INSTRUMENT_META) as InstrumentKey[]).map((key) => {
            const meta = INSTRUMENT_META[key];
            const isSelected = selectedInstrument === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedInstrument(key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.name}</span>
                <span className={`text-[10px] font-normal ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                  {meta.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live IST Clock & Day Tag */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#131b2e] rounded-xl border border-slate-800 text-xs font-mono self-start md:self-auto">
          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-slate-400">IST:</span>
          <span className="font-extrabold text-white tracking-wider text-sm">{istInfo.timeStr}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-semibold">{istInfo.dateStr}</span>
        </div>
      </div>

      {/* 2. HERO STATUS CARD: Majorly saying if it's trading hours now or not */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-7 transition-all duration-300 ${
          statusInfo.isTradable
            ? 'bg-gradient-to-r from-emerald-950/40 via-[#0e172a] to-[#0d1424] border-emerald-500/50 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]'
            : 'bg-gradient-to-r from-rose-950/25 via-[#0e172a] to-[#0d1424] border-rose-500/40 shadow-[0_0_35px_-10px_rgba(244,63,94,0.2)]'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Instant visual answer */}
          <div className="flex flex-col gap-2.5">
            {/* Top Permission Badge */}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-extrabold tracking-wide uppercase border ${
                  statusInfo.isTradable
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                }`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      statusInfo.isTradable ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      statusInfo.isTradable ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                </span>
                {statusInfo.isTradable ? 'TRADING HOURS NOW' : 'NO TRADE NOW • CAPITAL DEFENSE'}
              </span>

              {statusInfo.activeSlot && (
                <span className="text-xs font-mono text-slate-400 font-semibold">
                  {statusInfo.activeSlot.start_time} – {statusInfo.activeSlot.end_time} IST
                </span>
              )}
            </div>

            {/* Main Window Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{activeVisuals.name}</span>
            </h1>

            {/* Sub-label */}
            <p className="text-xs sm:text-sm font-mono text-slate-400">
              {statusInfo.isTradable
                ? 'High directional path efficiency. Safe to deploy capital and trade momentum.'
                : 'High false-breakout rate & chop risk. Stay flat, avoid friction, and defend capital.'}
            </p>
          </div>

          {/* Right: Clean Countdown Widget */}
          <div className="flex flex-col items-start lg:items-end justify-center bg-[#131d33]/90 border border-slate-700/70 p-4 sm:px-6 sm:py-4 rounded-xl shrink-0 shadow-inner">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {statusInfo.isTradable ? 'ACTIVE WINDOW TIME REMAINING' : 'NEXT TRADABLE WINDOW IN'}
              </span>
            </div>

            <div
              className={`text-2xl sm:text-3xl md:text-4xl font-mono font-black tracking-tight mt-0.5 ${
                statusInfo.isTradable ? 'text-emerald-400 timer-glow-emerald' : 'text-amber-400 timer-glow-amber'
              }`}
            >
              {statusInfo.isTradable
                ? formatCountdown(statusInfo.secondsRemainingInActive)
                : formatCountdown(statusInfo.secondsUntilNextTradable)}
            </div>

            {/* Next Window Pill or Slot Range */}
            <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1.5">
              {!statusInfo.isTradable && statusInfo.nextTradableSlot ? (
                <span>
                  Next: <strong className="text-white">{statusInfo.nextTradableSlot.label}</strong> ({statusInfo.nextTradableSlot.start_time} IST)
                </span>
              ) : (
                <span>
                  Window ends at <strong className="text-white">{statusInfo.activeSlot?.end_time} IST</strong>
                </span>
              )}
            </div>

            {/* Minimalist Progress Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full transition-all duration-300 ${
                  statusInfo.isTradable ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${statusInfo.percentElapsed}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. 24-HOUR MULTI-TRACK VISUAL CHART (Tokyo/London SessionTimeline style) */}
      <div className="bg-[#0d1424] p-5 rounded-2xl border border-slate-800/80 shadow-xl flex flex-col gap-3">
        
        {/* Chart Header: Day Selector & Quick Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              24-Hour Visual Schedule
            </span>
            <span className="text-xs font-mono text-slate-500">•</span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {dayStats.tradableHours}h Tradable
            </span>
            <span className="text-xs font-mono text-slate-500">•</span>
            <span className="text-xs font-mono text-rose-400 font-bold">
              {dayStats.defenseHours}h Defense
            </span>
          </div>

          {/* Weekday Switcher */}
          <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-slate-800 overflow-x-auto self-start sm:self-auto">
            {WEEKDAYS.map((wd) => {
              const isCurrentDay = wd === istInfo.effectiveWeekday;
              const isSelected = selectedDay === wd;
              return (
                <button
                  key={wd}
                  onClick={() => setSelectedDay(wd)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>{wd}</span>
                  {isCurrentDay && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* The Visual Timeline Layout */}
        <div className="w-full relative mt-2 select-none">
          
          {/* Time Axis Bar: 00:00 to 24:00 IST */}
          <div className="flex mb-2 text-[10px] sm:text-xs font-mono text-slate-400 items-center">
            {/* Left Sessions Index Spacer */}
            <div className="w-16 sm:w-36 md:w-44 shrink-0 flex items-center pr-2">
              {hoverData?.isHovering ? (
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-mono font-bold text-xs truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>{formatMins(hoverData.minutesInIst)} IST</span>
                </div>
              ) : (
                <span className="hidden sm:inline text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                  TRACKS
                </span>
              )}
            </div>

            {/* Horizontal Axis Ticks */}
            <div className="flex-1 flex justify-between relative px-0 font-mono">
              <span className="-ml-1 sm:-ml-2">00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
              <span className="-mr-1 sm:-mr-2">24:00</span>

              {/* TradingView Floating Time Pill on Scale at Hover Position */}
              {hoverData?.isHovering && (
                <div
                  className="hidden sm:flex absolute -top-1 pointer-events-none z-40 transition-all duration-75"
                  style={{ left: `${hoverData.xPct}%` }}
                >
                  <div
                    className={`bg-slate-900 border border-slate-600 text-slate-100 px-2 py-0.5 rounded shadow-xl font-mono text-xs font-bold whitespace-nowrap flex items-center gap-1.5 -translate-y-full ${
                      hoverData.xPct < 12
                        ? 'translate-x-0'
                        : hoverData.xPct > 88
                        ? '-translate-x-full'
                        : '-translate-x-1/2'
                    }`}
                  >
                    <span className="text-white">{formatMins(hoverData.minutesInIst)} IST</span>
                    {hoverData.slot && (
                      <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                        hoverData.slot.label !== 'NO_TRADE' && hoverData.slot.label !== 'CLOSED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {hoverData.slot.label}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Master Grid: Left Labels + Right Multi-Tracks */}
          <div className="flex w-full">
            {/* Left Index Column */}
            <div className="w-16 sm:w-36 md:w-44 shrink-0 flex flex-col gap-3">
              {/* Row 1: Tradable Windows Label */}
              <div className="h-16 sm:h-18 flex items-center gap-2 pr-2 sm:pr-3 rounded-xl bg-slate-900/60 border border-slate-800/80 px-2 sm:px-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                  TR
                </span>
                <div className="hidden sm:block min-w-0 flex-1">
                  <div className="text-xs font-bold text-emerald-400 leading-tight truncate">
                    Tradable
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                    {dayStats.tradableHours} hrs ({dayStats.tradableCount} slots)
                  </div>
                </div>
              </div>

              {/* Row 2: Capital Defense Label */}
              <div className="h-14 sm:h-16 flex items-center gap-2 pr-2 sm:pr-3 rounded-xl bg-slate-900/60 border border-slate-800/80 px-2 sm:px-3">
                <span className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                  NO
                </span>
                <div className="hidden sm:block min-w-0 flex-1">
                  <div className="text-xs font-bold text-rose-400 leading-tight truncate">
                    Capital Defense
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                    {dayStats.defenseHours} hrs (Chop)
                  </div>
                </div>
              </div>
            </div>

            {/* Right Multi-Tracks Canvas */}
            <div
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
              className="flex-1 min-w-0 relative flex flex-col gap-3 sm:cursor-crosshair"
            >
              {/* Vertical Dashed Hover Guide */}
              {hoverData?.isHovering && (
                <div
                  className="hidden sm:block absolute top-0 bottom-0 border-r border-dashed border-slate-300/60 pointer-events-none z-30 transition-all duration-75"
                  style={{ left: `${hoverData.xPct}%` }}
                />
              )}

              {/* Live Time Synchronized Needle */}
              {isTodaySelected && (
                <div
                  className="absolute -top-7 bottom-0 w-[1.5px] bg-white z-20 pointer-events-none transition-all duration-150"
                  style={{ left: `${needlePct}%` }}
                >
                  {/* Floating Needle Pill */}
                  <div
                    className={`absolute -top-1 bg-emerald-500 text-slate-950 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md shadow-lg font-mono text-center flex flex-col items-center whitespace-nowrap transition-transform duration-100 ${
                      needlePct < 15
                        ? 'left-0 translate-x-0'
                        : needlePct > 85
                        ? 'right-0 translate-x-0'
                        : 'left-1/2 -translate-x-1/2'
                    } -translate-y-full`}
                  >
                    <span className="text-[10px] sm:text-xs font-extrabold leading-tight">
                      NOW {pad(istInfo.hour)}:{pad(istInfo.minute)}
                    </span>
                    <span className="text-[8px] font-bold opacity-85 uppercase tracking-wide">
                      IST
                    </span>
                    {/* Downward pointer tip */}
                    <div
                      className={`w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-emerald-500 absolute -bottom-1 ${
                        needlePct < 15 ? 'left-3' : needlePct > 85 ? 'right-3' : 'left-1/2 -translate-x-1/2'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* TRACK 1: TRADABLE WINDOWS */}
              <div className="relative w-full h-16 sm:h-18 bg-[#131b2e] rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                {/* 4-hour background grid lines */}
                <div className="absolute inset-0 pointer-events-none flex">
                  <div className="w-1/6 border-r border-slate-800/50 h-full" />
                  <div className="w-1/6 border-r border-slate-800/50 h-full" />
                  <div className="w-1/6 border-r border-slate-800/50 h-full" />
                  <div className="w-1/6 border-r border-slate-800/50 h-full" />
                  <div className="w-1/6 border-r border-slate-800/50 h-full" />
                  <div className="w-1/6 h-full" />
                </div>

                {/* Slices for tradable windows */}
                {selectedDaySlots.map((slot, idx) => {
                  if (slot.label === 'NO_TRADE' || slot.label === 'CLOSED') return null;

                  const { startMin, endMin } = parseSlotRange(slot);
                  const leftPct = (startMin / 1440) * 100;
                  const widthPct = (slot.duration_minutes / 1440) * 100;

                  const visuals = getSlotVisuals(slot.label);
                  const isCurrentActive = isTodaySelected && istInfo.totalMinutes >= startMin && istInfo.totalMinutes < endMin;

                  return (
                    <div
                      key={idx}
                      className={`absolute top-0 bottom-0 ${visuals.bg} flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden min-w-0 shadow-md ${
                        isCurrentActive
                          ? 'ring-2 ring-white brightness-110 z-10 shadow-emerald-500/40'
                          : 'hover:brightness-110'
                      }`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`${slot.label} (${slot.start_time} - ${slot.end_time} IST)`}
                    >
                      {widthPct >= 11 ? (
                        <div className="w-full flex flex-col items-center justify-center px-1 text-center">
                          <span className="text-[11px] sm:text-xs font-black truncate max-w-full leading-tight">
                            {isCurrentActive ? `Active • ${visuals.name}` : visuals.name}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-mono opacity-90 truncate max-w-full">
                            {slot.start_time} – {slot.end_time}
                          </span>
                        </div>
                      ) : widthPct >= 5.5 ? (
                        <div className="w-full flex flex-col items-center justify-center px-0.5 text-center">
                          <span className="text-[10px] font-black truncate max-w-full leading-tight">
                            {slot.label === 'SWING_ENTRY' ? 'SWING' : slot.label === 'SMALL_TRADES' ? 'SCALP' : 'PRIME'}
                          </span>
                          <span className="text-[8px] font-mono opacity-90 truncate max-w-full leading-none">
                            {slot.start_time}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black font-mono">
                          {slot.start_time.split(':')[0]}h
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* TRACK 2: CAPITAL DEFENSE & NON-TRADABLE */}
              <div className="relative w-full h-14 sm:h-16 bg-[#131b2e] rounded-xl overflow-hidden border border-slate-800 shadow-inner flex">
                {/* 4-hour background grid lines */}
                <div className="absolute inset-0 pointer-events-none flex">
                  <div className="w-1/6 border-r border-slate-800/50 h-full" />
                  <div className="w-1/6 border-r border-slate-800/50 h-full" />
                  <div className="w-1/6 border-r border-slate-800/50 h-full" />
                  <div className="w-1/6 border-r border-slate-800/50 h-full" />
                  <div className="w-1/6 border-r border-slate-800/50 h-full" />
                  <div className="w-1/6 h-full" />
                </div>

                {/* Slices for defense / closed windows */}
                {selectedDaySlots.map((slot, idx) => {
                  if (slot.label !== 'NO_TRADE' && slot.label !== 'CLOSED') return null;

                  const { startMin, endMin } = parseSlotRange(slot);
                  const leftPct = (startMin / 1440) * 100;
                  const widthPct = (slot.duration_minutes / 1440) * 100;

                  const isCurrentActive = isTodaySelected && istInfo.totalMinutes >= startMin && istInfo.totalMinutes < endMin;
                  const isClosed = slot.label === 'CLOSED';

                  return (
                    <div
                      key={idx}
                      className={`absolute top-0 bottom-0 flex items-center justify-center px-1 text-center overflow-hidden min-w-0 transition-colors ${
                        isClosed
                          ? 'bg-slate-800/70 border-r border-slate-700/50 text-slate-400'
                          : 'bg-rose-950/40 border-r border-rose-900/40 text-rose-300 hover:bg-rose-950/60'
                      } ${isCurrentActive ? 'ring-1 ring-rose-400 z-10' : ''}`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`${isClosed ? 'Closed' : 'Chop Defense'} (${slot.start_time} - ${slot.end_time} IST)`}
                    >
                      {widthPct >= 14 ? (
                        <span className="text-[10px] font-mono font-medium truncate max-w-full">
                          {isClosed ? 'CME Settlement Pause' : 'Capital Defense (Chop)'}
                        </span>
                      ) : widthPct >= 7 ? (
                        <span className="text-[9px] font-mono truncate max-w-full">
                          {isClosed ? 'Closed' : 'Chop'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono opacity-50">⊘</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TODAY'S ENTIRE SCHEDULE CHRONOLOGICAL BREAKDOWN */}
      <div className="bg-[#0d1424] p-5 rounded-2xl border border-slate-800/80 shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Full Chronological Schedule ({selectedDay})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {selectedDaySlots.length} windows • 24:00 IST span
          </span>
        </div>

        {/* Minimalist Chronological Flow Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-1">
          {selectedDaySlots.map((slot, idx) => {
            const { startMin, endMin } = parseSlotRange(slot);
            const isCurrent = isTodaySelected && istInfo.totalMinutes >= startMin && istInfo.totalMinutes < endMin;
            const visuals = getSlotVisuals(slot.label);
            const isTradable = visuals.isTradable;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                  isCurrent
                    ? 'bg-slate-800/90 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                    : 'bg-[#101828] border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${visuals.dot} ${isCurrent ? 'animate-ping' : ''}`} />
                    <span className="text-xs font-mono font-extrabold text-white">
                      {slot.start_time} &rarr; {slot.end_time}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {slot.duration_minutes}m
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${visuals.badgeBg}`}>
                    {slot.label}
                  </span>

                  <span className={`text-[10px] font-mono font-semibold ${isTradable ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isTradable ? '✓ Tradable' : '⊘ Defense'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Minimalist Footer */}
      <div className="text-center text-[11px] font-mono text-slate-500 py-2">
        TradeClock Live IST Subpage &bull; Strict Indian Standard Time (UTC+5:30) &bull; Quantitative Momentum Classifier
      </div>
    </div>
  );
};
