import React from 'react';
import { AlertCircle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { AssetConfig, TimezoneOption, TradingZone } from '../types';
import { formatIntervalInTz, formatMins } from '../utils/time';

interface ScheduleTableProps {
  currentAsset: AssetConfig;
  currentZone: TradingZone;
  offsetFromIST: number;
  activeTzObj: TimezoneOption;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  currentAsset,
  currentZone,
  offsetFromIST,
  activeTzObj
}) => {
  const showSecondaryTz = activeTzObj.id !== 'IST';

  return (
    <section id="schedule-reference-section" className="mt-8 pt-6 border-t border-slate-800/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-mono">
            <span>Section 6: {currentAsset.pair} Trading Schedule</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Verified execution windows and liquidity status breakdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
            {currentAsset.zones.length} Time Slots
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
            {currentAsset.zones.filter(z => z.canTrade).length} Tradable Windows
          </span>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1424] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800/90 bg-[#10192e] text-slate-400">
                <th scope="col" className="py-3 px-4 font-semibold">Time (IST)</th>
                {showSecondaryTz && (
                  <th scope="col" className="py-3 px-4 font-semibold text-emerald-400/90">
                    Time ({activeTzObj.short})
                  </th>
                )}
                <th scope="col" className="py-3 px-4 font-semibold">Status</th>
                <th scope="col" className="py-3 px-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {currentAsset.zones.map((zone) => {
                const isActive = currentZone.id === zone.id;
                const istRange = `${formatMins(zone.start)}–${formatMins(zone.end)}`;
                const altRange = showSecondaryTz
                  ? formatIntervalInTz(zone.start, zone.end, offsetFromIST, '')
                  : null;

                // Status badge rendering
                let badgeEl;
                if (zone.status === 'TRADE_BIG') {
                  badgeEl = (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      TRADE (big)
                    </span>
                  );
                } else if (zone.status === 'TRADE_SCALP') {
                  badgeEl = (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      TRADE (scalp)
                    </span>
                  );
                } else if (zone.status === 'TRADE') {
                  badgeEl = (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                      TRADE
                    </span>
                  );
                } else {
                  badgeEl = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal text-slate-400 bg-slate-800/60 border border-slate-700/50">
                      No trade
                    </span>
                  );
                }

                return (
                  <tr
                    key={zone.id}
                    className={`transition-colors ${
                      isActive
                        ? 'bg-slate-800/80 ring-1 ring-inset ring-emerald-500/50 font-bold'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        )}
                        <span>{istRange}</span>
                        {isActive && (
                          <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-extrabold ml-1">
                            LIVE
                          </span>
                        )}
                      </div>
                    </td>

                    {showSecondaryTz && (
                      <td className="py-3 px-4 text-emerald-300/90 whitespace-nowrap">
                        {altRange}
                      </td>
                    )}

                    <td className="py-3 px-4 whitespace-nowrap">
                      {badgeEl}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {zone.notes === '–' ? (
                        <span className="text-slate-500 font-mono">–</span>
                      ) : (
                        <span className="text-slate-200">{zone.notes}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quant Intelligence & Execution Notes */}
      {currentAsset.quantNotes && (
        <div className="mt-5 p-4 sm:p-5 rounded-xl border border-slate-700/70 bg-[#12192a]/80 shadow-lg">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-300 font-mono mb-3">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{currentAsset.quantNotes.title}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {currentAsset.quantNotes.highlights.map((item, idx) => {
              const icon =
                item.level === 'warning' ? (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : item.level === 'info' ? (
                  <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                );

              const borderBg =
                item.level === 'warning'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : item.level === 'info'
                  ? 'border-sky-500/30 bg-sky-500/5'
                  : 'border-emerald-500/30 bg-emerald-500/5';

              return (
                <div key={idx} className={`p-3 rounded-lg border ${borderBg} flex flex-col gap-1`}>
                  <div className="flex items-center gap-1.5">
                    {icon}
                    <span className="text-xs font-bold text-white font-mono">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans mt-1">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 font-mono border-t border-slate-700/50 pt-2.5">
            <span className="text-amber-400 font-semibold">Execution Rule: </span>
            {currentAsset.quantNotes.summary}
          </p>
        </div>
      )}
    </section>
  );
};
