import React, { useMemo, useState } from 'react';
import { AssetConfig, AssetTrack, TimezoneOption, TradingZone } from '../types';
import { formatIntervalInTz, formatMins, getSegmentsInTimezone, pad } from '../utils/time';

interface SessionTimelineProps {
  currentAsset: AssetConfig;
  offsetFromIST: number;
  activeTzObj: TimezoneOption;
  tzTime: { hours: number; minutes: number; seconds: number; day: string; totalMinutes: number };
  istTime: { hours: number; minutes: number; seconds: number; day: string; totalMinutes: number };
  currentZone: TradingZone;
}

export const SessionTimeline: React.FC<SessionTimelineProps> = ({
  currentAsset,
  offsetFromIST,
  activeTzObj,
  tzTime,
  currentZone
}) => {
  // Needle position in percentage of 24h track in selected timezone
  const needlePct = Math.min(100, Math.max(0, (tzTime.totalMinutes / 1440) * 100));

  // Hover Crosshair State
  const [hoverData, setHoverData] = useState<{
    isHovering: boolean;
    xPct: number;
    yPx: number;
    minutesInTz: number;
    targetZone: TradingZone;
    hoverTrackId?: string;
  } | null>(null);

  // Filter tradable tracks vs capital defense track
  const tradableTracks = useMemo(() => {
    return currentAsset.tracks.filter(t => t.code !== 'NO');
  }, [currentAsset]);

  const defenseTrack = useMemo(() => {
    return currentAsset.tracks.find(t => t.code === 'NO');
  }, [currentAsset]);

  // Compute dead zone segments across 24h in selected timezone
  const deadZoneSegments = useMemo(() => {
    const deadZones = currentAsset.zones.filter(z => !z.canTrade);
    return deadZones.flatMap(z => {
      const segs = getSegmentsInTimezone(z.start, z.end, offsetFromIST);
      return segs.map(s => ({
        ...s,
        name: z.name,
        notes: z.notes,
        zoneId: z.id,
        badge: z.badge
      }));
    });
  }, [currentAsset, offsetFromIST]);

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
    const zone = currentAsset.zones.find(z => minutesInIst >= z.start && minutesInIst < z.end) || currentAsset.zones[0];

    setHoverData({
      isHovering: true,
      xPct,
      yPx: clampedY,
      minutesInTz,
      targetZone: zone
    });
  };

  const handleChartMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <section id="interactive-timeline-section" className="mt-7">
      <div className="w-full select-none">
        {/* Time Axis Bar - Fluid 00:00 to 24:00 in selected timezone */}
        <div className="flex mb-3 sm:mb-4 text-[10px] sm:text-xs font-mono text-slate-400 items-center">
          {/* Left Label / Time Display in Top of the Index */}
          <div className="w-14 sm:w-36 shrink-0 flex items-center pr-2 sm:pr-3">
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
                SESSIONS INDEX
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

        {/* Master Grid: Left Sessions Index Column + Right tracks */}
        <div className="flex w-full">
          {/* Left Index Column */}
          <div className="w-14 sm:w-36 shrink-0 flex flex-col gap-3.5 sm:gap-4">
            {/* Tradable Tracks Index Rows */}
            {tradableTracks.map((track) => {
              const rangeStr = formatIntervalInTz(track.start, track.end, offsetFromIST, '');
              const isCurrentTrackActive = currentZone.id === track.zoneId;

              return (
                <div
                  key={track.id}
                  className={`h-14 sm:h-18 flex items-center gap-2 sm:gap-2.5 pr-2 sm:pr-3 rounded-lg transition-colors ${
                    isCurrentTrackActive ? 'bg-slate-800/70 ring-1 ring-emerald-500/40' : ''
                  }`}
                >
                  <span
                    className={`w-8 sm:w-9 h-8 sm:h-9 rounded-lg ${track.bgLight} border ${track.borderLight} text-xs sm:text-sm font-bold font-mono flex items-center justify-center shrink-0`}
                    style={{ color: track.color }}
                  >
                    {track.code}
                  </span>
                  <div className="hidden sm:block min-w-0">
                    <div className="text-xs font-bold text-slate-200 leading-tight truncate">
                      {track.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                      {rangeStr}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Defense Track Index Row */}
            {defenseTrack && (
              <div className="h-14 sm:h-18 flex items-center gap-2 sm:gap-2.5 pr-2 sm:pr-3 rounded-lg transition-colors">
                <span className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs sm:text-sm font-bold font-mono flex items-center justify-center shrink-0">
                  NO
                </span>
                <div className="hidden sm:block min-w-0">
                  <div className="text-xs font-bold text-slate-300 leading-tight truncate">
                    Capital Defense
                  </div>
                  <div className="text-[10px] font-mono text-rose-400/80 mt-0.5 truncate">
                    No Trade Windows
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Tracks Column */}
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

            {/* RENDER EACH TRADABLE TRACK */}
            {tradableTracks.map((track) => {
              const segments = getSegmentsInTimezone(track.start, track.end, offsetFromIST);
              const isCurrentTrackActive = currentZone.id === track.zoneId;
              const rangeStr = formatIntervalInTz(track.start, track.end, offsetFromIST, activeTzObj.short);

              return (
                <div
                  key={track.id}
                  className="relative w-full h-14 sm:h-18 bg-[#131b2e] rounded-lg sm:rounded-xl overflow-hidden border border-slate-800/90 shadow-inner"
                >
                  {/* Background Grid Guide Lines at 25%, 50%, 75% */}
                  <div className="absolute inset-0 pointer-events-none flex">
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                    <div className="w-1/4 h-full"></div>
                  </div>

                  {/* Active Segment(s) for this track */}
                  {segments.map((seg, idx) => {
                    const bgColor =
                      track.status === 'TRADE_BIG'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : track.status === 'TRADE_SCALP'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-sky-500 text-slate-950 font-bold';

                    return (
                      <div
                        key={idx}
                        title={`${track.name}: ${rangeStr}`}
                        className={`absolute top-0 bottom-0 ${bgColor} transition-all flex flex-col items-center justify-center px-1 sm:px-2 shadow-md cursor-default ${
                          isCurrentTrackActive ? 'ring-2 ring-white/90 brightness-110 shadow-emerald-500/40' : ''
                        }`}
                        style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }}
                      >
                        <span className="text-[10px] sm:text-xs leading-tight truncate">
                          {isCurrentTrackActive ? `Active • ${track.code}` : track.name}
                        </span>
                        <span className="hidden sm:inline text-[9px] opacity-80 font-mono mt-0.5 truncate">
                          {rangeStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* CAPITAL DEFENSE / NO-TRADE TRACK */}
            <div className="relative w-full h-14 sm:h-18 bg-[#131b2e] rounded-lg sm:rounded-xl overflow-hidden border border-slate-800/90 shadow-inner flex">
              {/* Background Grid Guide Lines */}
              <div className="absolute inset-0 pointer-events-none flex">
                <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                <div className="w-1/4 border-r border-slate-800/40 h-full"></div>
                <div className="w-1/4 h-full"></div>
              </div>

              {deadZoneSegments.map((seg, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 bg-rose-950/40 border-r border-rose-900/40 text-[9px] sm:text-[10px] font-mono text-rose-400 flex items-center justify-center px-0.5 sm:px-1 cursor-default"
                  style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }}
                  title={`${seg.name} (${formatMins(seg.startMin)} – ${formatMins(seg.endMin)} ${activeTzObj.short})`}
                >
                  <span className="truncate">{seg.badge || 'No trade'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
