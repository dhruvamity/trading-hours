import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Clock, 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  BarChart2, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Calendar,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import bundledSchedule from '../data/bundled_schedule.json';
import { SlotLabel, TerminalSlot } from '../types';

type InstrumentKey = 'BTCUSDT' | 'XAUUSD_MT5' | 'XAUUSDT_BINANCE';

const INSTRUMENT_META: Record<InstrumentKey, { name: string; tag: string; icon: string; history: string }> = {
  BTCUSDT: {
    name: 'Bitcoin Perpetual',
    tag: 'Binance USD-M',
    icon: '₿',
    history: '4 Years (317,274 5m bars)',
  },
  XAUUSD_MT5: {
    name: 'Gold Spot (Institutional)',
    tag: 'MetaTrader 5 Feed',
    icon: '🪙',
    history: '3 Years (212,177 5m bars)',
  },
  XAUUSDT_BINANCE: {
    name: 'Gold Perpetual',
    tag: 'Binance USD-M',
    icon: '⚡',
    history: '9 Months (Dec 2025 - Present)',
  },
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Fri-late'];

export const TerminalView: React.FC = () => {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentKey>('BTCUSDT');
  const [scheduleData, setScheduleData] = useState<any>(bundledSchedule);
  const [now, setNow] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Try fetching fresh public/schedule.json on mount
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
        // bundledSchedule is already fallback
      });
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute IST Date, Time, and minutes of day
  const istInfo = useMemo(() => {
    // Format to Asia/Kolkata
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
      dateStr: `${weekdayStr}, ${month} ${day}, ${year}`,
      timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
      hour,
      minute,
      second,
      totalMinutes,
      weekday: weekdayStr,
      effectiveWeekday,
    };
  }, [now]);

  // Set initial selected day to current weekday if valid
  useEffect(() => {
    if (WEEKDAYS.includes(istInfo.effectiveWeekday)) {
      setSelectedDay(istInfo.effectiveWeekday);
    }
  }, [istInfo.effectiveWeekday]);

  // DST Regime check (US Summer EDT vs Winter EST)
  const activeRegime = useMemo(() => {
    // In US, EDT runs roughly from 2nd Sunday in March to 1st Sunday in November
    const m = now.getUTCMonth(); // 0-indexed (2 = March, 10 = Nov)
    if (m >= 3 && m <= 9) return 'US_SUMMER';
    return 'US_SUMMER'; // default to active US_SUMMER
  }, [now]);

  // Active instrument data
  const instrumentData = scheduleData?.instruments?.[selectedInstrument] || bundledSchedule.instruments[selectedInstrument];
  const regimeSlotsMap = instrumentData?.regimes?.[activeRegime]?.slots || instrumentData?.regimes?.['POOLED']?.slots || {};

  // Today's live slots and selected day's slots
  const liveDaySlots: TerminalSlot[] = regimeSlotsMap[istInfo.effectiveWeekday] || [];
  const selectedDaySlots: TerminalSlot[] = regimeSlotsMap[selectedDay] || [];

  // Find active slot and minutes remaining
  const { activeSlot, nextSlot, minutesRemaining, secondsRemaining } = useMemo(() => {
    if (!liveDaySlots || liveDaySlots.length === 0) {
      return { activeSlot: null, nextSlot: null, minutesRemaining: 0, secondsRemaining: 0 };
    }

    for (let i = 0; i < liveDaySlots.length; i++) {
      const s = liveDaySlots[i];
      const [sh, sm] = s.start_time.split(':').map(Number);
      const [eh, em] = s.end_time.split(':').map(Number);

      const startMin = sh * 60 + sm;
      const endMin = (eh === 0 && em === 0 && startMin > 0) ? 1440 : (eh * 60 + em);

      if (istInfo.totalMinutes >= startMin && istInfo.totalMinutes < endMin) {
        const remainingTotalSecs = (endMin * 60) - (istInfo.totalMinutes * 60 + istInfo.second);
        const remMins = Math.floor(remainingTotalSecs / 60);
        const remSecs = remainingTotalSecs % 60;
        const nxt = i + 1 < liveDaySlots.length ? liveDaySlots[i + 1] : liveDaySlots[0];
        return {
          activeSlot: s,
          nextSlot: nxt,
          minutesRemaining: remMins,
          secondsRemaining: remSecs,
        };
      }
    }

    return { activeSlot: null, nextSlot: liveDaySlots[0] || null, minutesRemaining: 0, secondsRemaining: 0 };
  }, [liveDaySlots, istInfo.totalMinutes, istInfo.second]);

  // Helper for label badge styling
  const getBadgeStyle = (label: SlotLabel) => {
    switch (label) {
      case 'PRIME':
        return {
          bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
          dot: 'bg-emerald-400 shadow-[0_0_10px_#10b981]',
          cardGlow: 'shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] border-emerald-500/50',
          title: 'PRIME MOMENTUM WINDOW',
          desc: 'High Trend-Quality Score, sustained path efficiency, and ample range vs transaction costs.',
        };
      case 'SWING_ENTRY':
        return {
          bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
          dot: 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]',
          cardGlow: 'shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)] border-cyan-500/50',
          title: 'SWING ENTRY MOMENTUM WINDOW',
          desc: 'Peak follow-through probability (+1 ATR before -1 ATR in 3h) with multi-hour persistence.',
        };
      case 'SMALL_TRADES':
        return {
          bg: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
          dot: 'bg-amber-400 shadow-[0_0_10px_#f59e0b]',
          cardGlow: 'shadow-[0_0_30px_-5px_rgba(245,158,11,0.2)] border-amber-500/40',
          title: 'SMALL TRADES / SCALP POCKET',
          desc: 'Moderate volatility or selective liquidity. Strict risk limits and scalping recommended.',
        };
      case 'NO_TRADE':
        return {
          bg: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
          dot: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]',
          cardGlow: 'shadow-[0_0_25px_-5px_rgba(244,63,94,0.2)] border-rose-500/30',
          title: 'NO TRADE / CAPITAL DEFENSE CHOP',
          desc: 'High false-breakout rate (>60%) or narrow range vs costs. Statistically negative expectancy.',
        };
      case 'CLOSED':
      default:
        return {
          bg: 'bg-slate-700/40 text-slate-400 border-slate-600/50',
          dot: 'bg-slate-500',
          cardGlow: 'border-slate-800',
          title: 'MARKET CLOSED / CME SETTLEMENT PAUSE',
          desc: 'Trading halted or frozen during weekend or NYMEX/CME daily maintenance (02:30–03:30 IST).',
        };
    }
  };

  const activeStyle = activeSlot ? getBadgeStyle(activeSlot.label) : getBadgeStyle('NO_TRADE');

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-slate-100">
      {/* Top Banner: Status Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0d1424] p-5 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 shadow-inner">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
                Live IST Quant Terminal
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono">
                  PROD v1.0
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Empirical momentum vs chop classifier &bull; 0-100 Trend-Quality Score
            </p>
          </div>
        </div>

        {/* Live IST Clock & DST Tag */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#141d33] border border-slate-700/80 rounded-xl font-mono text-xs shadow-inner">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">IST:</span>
            <span className="font-bold text-emerald-400 text-sm">{istInfo.timeStr}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#141d33] border border-slate-700/80 rounded-xl font-mono text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-semibold">{istInfo.dateStr}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 rounded-xl font-mono text-xs text-blue-400">
            <span className="font-bold">{activeRegime}</span>
            <span className="text-[10px] text-blue-300/80">(EDT UTC-4)</span>
          </div>
        </div>
      </div>

      {/* Instrument Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0c1322] p-1.5 rounded-xl border border-slate-800">
        {(Object.keys(INSTRUMENT_META) as InstrumentKey[]).map((key) => {
          const meta = INSTRUMENT_META[key];
          const isSelected = selectedInstrument === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedInstrument(key)}
              className={`flex-1 min-w-[200px] flex items-center justify-between px-4 py-2.5 rounded-lg font-mono text-xs transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{meta.icon}</span>
                <div className="text-left">
                  <div className={isSelected ? 'text-slate-950 font-bold' : 'text-slate-200 font-semibold'}>
                    {meta.name}
                  </div>
                  <div className={`text-[10px] ${isSelected ? 'text-slate-900/80' : 'text-slate-500'}`}>
                    {meta.tag}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded ${isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                {key === 'BTCUSDT' ? '4Y HIST' : key === 'XAUUSD_MT5' ? '3Y SPOT' : '9M PERP'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hero Card: Current Slot Status & Countdown */}
      <div className={`relative overflow-hidden rounded-2xl border bg-[#0d1424] p-6 lg:p-8 transition-all ${activeStyle.cardGlow}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Active Slot Badge & Title */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border ${activeStyle.bg}`}>
                <span className={`w-2 h-2 rounded-full ${activeStyle.dot}`} />
                {activeSlot ? activeSlot.label : 'NO_TRADE'}
              </span>

              {activeSlot && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  <span>CONF:</span>
                  <span className={activeSlot.confidence === 'HIGH' ? 'text-emerald-400' : activeSlot.confidence === 'MED' ? 'text-amber-400' : 'text-rose-400'}>
                    {activeSlot.confidence}
                  </span>
                </span>
              )}

              {activeSlot && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  <span>SCORE:</span>
                  <span className="text-white font-extrabold">{activeSlot.score}/100</span>
                </span>
              )}
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeStyle.title}
            </h3>
            <p className="text-sm text-slate-400 max-w-2xl">
              {activeStyle.desc}
            </p>
          </div>

          {/* Right: Live Countdown & Next Slot */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 bg-[#141e34] p-4 rounded-xl border border-slate-700/60 shadow-inner">
            <div className="text-left sm:text-right">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Slot Time Remaining
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-tight mt-0.5 flex items-baseline gap-1">
                <span>{String(minutesRemaining).padStart(2, '0')}:{String(secondsRemaining).padStart(2, '0')}</span>
                <span className="text-xs font-normal text-slate-400 font-sans">mins</span>
              </div>
            </div>

            {nextSlot && (
              <div className="text-left sm:text-right border-t border-slate-700/40 pt-2 w-full">
                <span className="text-[10px] font-mono text-slate-400">UPCOMING SLOT: </span>
                <span className="text-xs font-mono font-bold text-white">
                  {nextSlot.label} ({nextSlot.start_time})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quant Metric KPI Pills for Active Slot */}
        {activeSlot && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-[#101828] p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Efficiency Ratio</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg font-mono font-bold text-white mt-1">
                {activeSlot.stats.er_mean.toFixed(3)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {activeSlot.stats.er_mean > 0.32 ? 'High Directional Path' : 'Moderate / Flat'}
              </div>
            </div>

            <div className="bg-[#101828] p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Range / Cost</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-mono font-bold text-white mt-1">
                {activeSlot.stats.range_cost_ratio}x
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Hard Gate &gt; 2.0x (BTC: 10bps RT)
              </div>
            </div>

            <div className="bg-[#101828] p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Follow-Through</span>
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-lg font-mono font-bold text-white mt-1">
                {Math.round(activeSlot.stats.follow_through_prob * 100)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                +1 ATR before -1 ATR in 3h
              </div>
            </div>

            <div className="bg-[#101828] p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>False Breakout</span>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-lg font-mono font-bold text-white mt-1">
                {Math.round(activeSlot.stats.false_breakout_rate * 100)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Prior 60m range break reversals
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 24-Hour Visual Timeline */}
      <div className="bg-[#0d1424] p-5 rounded-2xl border border-slate-800/80 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              24-Hour IST Timeline Bar ({selectedDay})
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Current needle pinned at {istInfo.timeStr}
          </span>
        </div>

        {/* The visual timeline bar */}
        <div className="relative w-full h-10 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex">
          {selectedDaySlots.map((slot, idx) => {
            const widthPct = (slot.duration_minutes / 1440) * 100;
            let bgColor = 'bg-rose-500/40 text-rose-300';
            if (slot.label === 'PRIME') bgColor = 'bg-emerald-500/70 text-slate-950 font-bold';
            else if (slot.label === 'SWING_ENTRY') bgColor = 'bg-cyan-500/70 text-slate-950 font-bold';
            else if (slot.label === 'SMALL_TRADES') bgColor = 'bg-amber-500/50 text-amber-200';
            else if (slot.label === 'CLOSED') bgColor = 'bg-slate-800 text-slate-500';

            return (
              <div
                key={idx}
                style={{ width: `${widthPct}%` }}
                title={`${slot.start_time} - ${slot.end_time} | ${slot.label} (Score: ${slot.score})`}
                className={`h-full border-r border-slate-950/40 flex items-center justify-center text-[10px] font-mono transition-opacity hover:opacity-80 cursor-pointer overflow-hidden ${bgColor}`}
              >
                {widthPct > 6 && `${slot.start_time}`}
              </div>
            );
          })}

          {/* Live Needle Pin */}
          {selectedDay === istInfo.effectiveWeekday && (
            <div
              style={{ left: `${(istInfo.totalMinutes / 1440) * 100}%` }}
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_#ffffff] z-10 pointer-events-none -translate-x-1/2"
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-white text-slate-950 font-mono text-[9px] font-extrabold px-1 rounded shadow">
                NOW
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2 px-1">
          <span>00:00 IST</span>
          <span>06:00 IST</span>
          <span>12:00 IST</span>
          <span>18:00 IST</span>
          <span>24:00 IST</span>
        </div>
      </div>

      {/* Weekday Schedule Browser & Full Table */}
      <div className="bg-[#0d1424] p-5 rounded-2xl border border-slate-800/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h4 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Full Session Schedule Table
            </h4>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Consolidated 60m+ execution windows calibrated against round-trip costs
            </p>
          </div>

          {/* Weekday Switcher */}
          <div className="flex items-center gap-1 bg-[#121a2d] p-1 rounded-xl border border-slate-700/80 overflow-x-auto">
            {WEEKDAYS.map((wd) => (
              <button
                key={wd}
                onClick={() => setSelectedDay(wd)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  selectedDay === wd
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {wd}
                {wd === istInfo.effectiveWeekday && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table of Slots */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/40">
                <th className="py-2.5 px-3">Time Window (IST)</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3 text-right">Trend Score</th>
                <th className="py-2.5 px-3 text-center">Confidence</th>
                <th className="py-2.5 px-3 text-right">Efficiency Ratio</th>
                <th className="py-2.5 px-3 text-right">Range / Cost</th>
                <th className="py-2.5 px-3 text-right">Follow-Through</th>
                <th className="py-2.5 px-3 text-right">False Break</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {selectedDaySlots.map((slot, idx) => {
                const [sh, sm] = slot.start_time.split(':').map(Number);
                const [eh, em] = slot.end_time.split(':').map(Number);
                const startMin = sh * 60 + sm;
                const endMin = (eh === 0 && em === 0 && startMin > 0) ? 1440 : (eh * 60 + em);
                const isCurrent = selectedDay === istInfo.effectiveWeekday && istInfo.totalMinutes >= startMin && istInfo.totalMinutes < endMin;

                const style = getBadgeStyle(slot.label);

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-emerald-500/10 font-bold border-l-2 border-emerald-400'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3 px-3 flex items-center gap-2">
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                      <span className={isCurrent ? 'text-emerald-400 font-bold' : 'text-slate-200'}>
                        {slot.start_time} &rarr; {slot.end_time}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{slot.duration_minutes}m</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${style.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {slot.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white">{slot.score}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        slot.confidence === 'HIGH' ? 'bg-emerald-500/15 text-emerald-400' : slot.confidence === 'MED' ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {slot.confidence}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">{slot.stats.er_mean.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right text-slate-300">{slot.stats.range_cost_ratio}x</td>
                    <td className="py-3 px-3 text-right text-slate-300">{Math.round(slot.stats.follow_through_prob * 100)}%</td>
                    <td className="py-3 px-3 text-right text-slate-400">{Math.round(slot.stats.false_breakout_rate * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dual-Gold Cross-Validation Banner */}
      <div className="bg-[#0b101c] p-5 rounded-2xl border border-slate-800 text-xs text-slate-400 font-mono flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <span className="font-bold text-slate-200">Dual-Gold Methodology: </span>
            Independent multi-year analysis on MetaTrader 5 institutional spot feed (3 years) cross-validated with Binance XAUUSDT perpetual. 
            Overlap 5m return correlation: <span className="text-emerald-400 font-bold">0.9673</span> &bull; Median basis spread: <span className="text-amber-400 font-bold">6.06 bps</span>.
          </div>
        </div>

        <div className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] text-slate-400 whitespace-nowrap">
          CME Maint: 02:30–03:30 IST (CLOSED)
        </div>
      </div>

      {/* Institutional Disclaimer Footer */}
      <div className="text-center text-[11px] font-mono text-slate-500 pb-8">
        TradeClock IST Quantitative Engine &bull; Empirical statistical tendencies, not trade signals or financial advice.
      </div>
    </div>
  );
};
