import React, { useMemo, useState } from 'react';
import { AssetConfig, TimezoneOption, TradingZone } from '../types';
import { formatMins } from '../utils/time';

interface VolatilityChartProps {
  currentAsset: AssetConfig;
  offsetFromIST: number;
  activeTzObj: TimezoneOption;
  tzTime: { totalMinutes: number };
  currentZone: TradingZone;
}

export const VolatilityChart: React.FC<VolatilityChartProps> = ({
  currentAsset,
  offsetFromIST,
  activeTzObj,
  tzTime,
  currentZone
}) => {
  const needlePct = Math.min(100, Math.max(0, (tzTime.totalMinutes / 1440) * 100));

  const [hoverVol, setHoverVol] = useState<{
    isHovering: boolean;
    xPct: number;
    minutesInTz: number;
    level: number;
  } | null>(null);

  // Generate dynamic volatility SVG path auto-adjusted to the selected timezone
  const volPathData = useMemo(() => {
    const points: string[] = [];
    const step = 10; // 100 samples across 1000px
    for (let x = 0; x <= 1000; x += step) {
      const minInTz = (x / 1000) * 1440;
      const minInIst = ((minInTz - offsetFromIST) % 1440 + 1440) % 1440;
      const level = currentAsset.getVolatilityLevelAtIst(minInIst);
      const y = Math.round(112 - level * 0.94);
      points.push(`${x},${y}`);
    }

    const areaPath = `M 0,120 L 0,${points[0].split(',')[1]} ` + points.map(p => `L ${p}`).join(' ') + ` L 1000,120 Z`;
    const linePath = `M ${points[0]} ` + points.map(p => `L ${p}`).join(' ');

    return { areaPath, linePath };
  }, [currentAsset, offsetFromIST]);

  const handleVolMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clampedX = Math.max(0, Math.min(rect.width, clientX));
    const xPct = (clampedX / rect.width) * 100;
    const minutesInTz = Math.min(1439, Math.max(0, Math.round((xPct / 100) * 1440)));
    const minInIst = ((minutesInTz - offsetFromIST) % 1440 + 1440) % 1440;
    const level = currentAsset.getVolatilityLevelAtIst(minInIst);

    setHoverVol({
      isHovering: true,
      xPct,
      minutesInTz,
      level: Math.round(level)
    });
  };

  const isHighVol = currentZone.status === 'TRADE_BIG';

  return (
    <section id="volatility-section" className="mt-7 pt-6 border-t border-slate-800/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            {currentAsset.symbol} EXPECTED VOLATILITY PROFILE:
          </span>
          <div className="flex items-center gap-1.5">
            <span
              id="volatility-dot"
              className={`w-2.5 h-2.5 rounded-full ${
                isHighVol
                  ? currentAsset.id === 'gold' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
                  : currentZone.canTrade
                  ? 'bg-sky-400'
                  : 'bg-slate-500'
              }`}
            ></span>
            <span id="volatility-text" className="text-xs font-mono font-bold text-white">
              {currentZone.volatility}
            </span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          {hoverVol?.isHovering && (
            <span className="text-slate-300 font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {formatMins(hoverVol.minutesInTz)} {activeTzObj.short} • Vol: {hoverVol.level}%
            </span>
          )}
          <span>
            Profile Mode: <span className="text-emerald-400 font-semibold">{activeTzObj.short}</span>
          </span>
        </div>
      </div>

      {/* SVG Smooth Volatility Area Chart */}
      <div className="flex w-full">
        <div className="w-14 sm:w-44 md:w-48 shrink-0"></div>
        <div
          id="volatility-chart-container"
          onMouseMove={handleVolMouseMove}
          onMouseLeave={() => setHoverVol(null)}
          className="flex-1 min-w-0 relative h-20 bg-[#101726]/60 rounded-lg sm:rounded-xl overflow-hidden border border-slate-800/60 sm:cursor-crosshair"
        >
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 120">
            <defs>
              <linearGradient id={`volGradient-${currentAsset.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop
                  offset="0%"
                  stopColor={currentAsset.accentColor}
                  stopOpacity={currentAsset.id === 'gold' ? 0.45 : 0.45}
                />
                <stop
                  offset="65%"
                  stopColor={currentAsset.id === 'gold' ? '#d97706' : '#3b82f6'}
                  stopOpacity="0.18"
                />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Vertical Quarter Grid Guidelines */}
            <line x1="250" y1="0" x2="250" y2="120" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="500" y1="0" x2="500" y2="120" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="750" y1="0" x2="750" y2="120" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

            {/* Volatility Area & Line dynamically shifted */}
            <path d={volPathData.areaPath} fill={`url(#volGradient-${currentAsset.id})`} />
            <path
              d={volPathData.linePath}
              fill="none"
              stroke={currentAsset.accentColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          {/* Synchronized Needle on Volatility Chart */}
          <div
            id="vol-needle"
            className="absolute top-0 bottom-0 w-[1.5px] bg-white/70 pointer-events-none transition-all duration-150"
            style={{ left: `${needlePct}%` }}
          />

          {/* Vertical Time Hover Guide on volatility chart */}
          {hoverVol?.isHovering && (
            <div
              id="vol-crosshair-vertical"
              className="hidden sm:block absolute top-0 bottom-0 border-r border-dashed border-slate-300/60 pointer-events-none z-30 transition-all duration-75"
              style={{ left: `${hoverVol.xPct}%` }}
            />
          )}
        </div>
      </div>
    </section>
  );
};
