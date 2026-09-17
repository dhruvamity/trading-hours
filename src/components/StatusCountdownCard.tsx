import React from 'react';
import { Clock } from 'lucide-react';
import { AssetConfig, TimezoneOption, TradingZone } from '../types';
import { pad } from '../utils/time';

interface StatusCountdownCardProps {
  currentAsset: AssetConfig;
  istTime: { hours: number; minutes: number; seconds: number; day: string };
  tzTime: { hours: number; minutes: number; seconds: number; day: string };
  activeTzObj: TimezoneOption;
  currentZone: TradingZone;
  countdownData: {
    tagLabel: string;
    formattedTime: string;
    percentElapsed: number;
    slotStr: string;
    status: string;
    color: 'emerald' | 'amber' | 'sky';
  };
}

export const StatusCountdownCard: React.FC<StatusCountdownCardProps> = ({
  currentAsset,
  istTime,
  tzTime,
  activeTzObj,
  currentZone,
  countdownData
}) => {
  // SVG Circle parameters for progress gauge
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (countdownData.percentElapsed / 100) * circumference;

  const isTradable = currentZone.canTrade;

  // Status color styling
  const getBannerStyles = () => {
    if (!isTradable) {
      return {
        wrapper: 'bg-gradient-to-r from-rose-950/30 to-[#131c31] border-red-500/30',
        dotPing: 'bg-red-400',
        dot: 'bg-red-500'
      };
    }
    if (currentZone.status === 'TRADE_BIG') {
      return {
        wrapper: 'bg-gradient-to-r from-emerald-950/40 to-[#131c31] border-emerald-500/40',
        dotPing: 'bg-emerald-400',
        dot: 'bg-emerald-500'
      };
    }
    if (currentZone.status === 'TRADE_SCALP') {
      return {
        wrapper: 'bg-gradient-to-r from-amber-950/40 to-[#131c31] border-amber-500/40',
        dotPing: 'bg-amber-400',
        dot: 'bg-amber-500'
      };
    }
    return {
      wrapper: 'bg-gradient-to-r from-sky-950/40 to-[#131c31] border-sky-500/40',
      dotPing: 'bg-sky-400',
      dot: 'bg-sky-500'
    };
  };

  const bannerStyle = getBannerStyles();

  return (
    <section id="status-timer-section" className="mt-5 flex flex-col lg:flex-row lg:items-stretch justify-between gap-4">
      {/* Left Column: Live Time Readout & Current Permission Pill */}
      <div className="w-full lg:w-72 flex flex-col justify-between gap-3 shrink-0">
        {/* Live Clock Card in Selected Timezone */}
        <div className="bg-[#131c31]/90 border border-slate-700/70 rounded-xl px-4 py-3 flex items-center justify-between shadow-inner">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <span>LIVE CLOCK ({activeTzObj.short})</span>
            </div>
            <div id="live-digital-time" className="text-xl sm:text-2xl font-mono font-extrabold text-white tracking-tight mt-0.5">
              {pad(tzTime.hours)}:{pad(tzTime.minutes)}:{pad(tzTime.seconds)}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
              {tzTime.day}
            </span>
            {activeTzObj.id !== 'IST' && (
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                IST: {pad(istTime.hours)}:{pad(istTime.minutes)}
              </div>
            )}
          </div>
        </div>

        {/* Current Permission Banner */}
        <div
          id="permission-banner"
          className={`rounded-xl px-3.5 py-2.5 flex items-center gap-3 shadow-inner border transition-all duration-300 ${bannerStyle.wrapper}`}
        >
          <span className="relative flex h-3 w-3 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bannerStyle.dotPing}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${bannerStyle.dot}`}></span>
          </span>
          <div className="min-w-0">
            <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold leading-tight">
              {isTradable ? `${currentAsset.symbol} ACTIVE WINDOW` : 'CURRENT PERMISSION'}
            </div>
            <div className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
              {isTradable ? `${currentZone.badge} — ${currentZone.name}` : 'NO TRADE ALLOWED'}
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
  );
};
