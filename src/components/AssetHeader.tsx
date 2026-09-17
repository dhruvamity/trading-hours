import React from 'react';
import { ChevronDown, Clock, Sparkles } from 'lucide-react';
import { AssetConfig, AssetId, TimezoneOption, TzId } from '../types';
import { TIMEZONES } from '../data/assets';

interface AssetHeaderProps {
  currentAsset: AssetConfig;
  onSelectAsset: (assetId: AssetId) => void;
  selectedTz: TzId;
  onSelectTz: (tz: TzId) => void;
  isCurrentZoneTradable: boolean;
  btcTradable: boolean;
  goldTradable: boolean;
}

export const AssetHeader: React.FC<AssetHeaderProps> = ({
  currentAsset,
  onSelectAsset,
  selectedTz,
  onSelectTz,
  btcTradable,
  goldTradable
}) => {
  const activeTzObj = TIMEZONES[selectedTz];

  return (
    <header id="widget-header" className="flex flex-col gap-4 pb-5 border-b border-slate-800/80">
      {/* Top Row: Title, Subpage Navigation Tabs & Timezone Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: App Title and Pair Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" role="img" aria-label={currentAsset.quoteName}>
              {currentAsset.icon}
            </span>
            <div>
              <h1 id="app-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                {currentAsset.pair}
                <span className="text-xs font-mono font-medium text-slate-400 hidden sm:inline">
                  Session Tracker
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono hidden xs:block">
                Section 6 Liquidity Timeline & Execution Rules
              </p>
            </div>
          </div>
          <span
            id="top-tz-badge"
            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 ml-1"
          >
            {activeTzObj.short}
          </span>
        </div>

        {/* Right: Subpage Tabs & Timezone Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Subpage Nav Switcher */}
          <nav aria-label="Asset subpages" className="flex items-center bg-[#131c31] p-1 rounded-xl border border-slate-700/80 shadow-inner">
            <button
              id="subpage-tab-btc"
              onClick={() => onSelectAsset('btc')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                currentAsset.id === 'btc'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>₿</span>
              <span>BTC/USDT</span>
              {btcTradable && (
                <span
                  className={`w-2 h-2 rounded-full animate-ping ${
                    currentAsset.id === 'btc' ? 'bg-slate-950' : 'bg-emerald-400'
                  }`}
                />
              )}
            </button>

            <button
              id="subpage-tab-gold"
              onClick={() => onSelectAsset('gold')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                currentAsset.id === 'gold'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>🪙</span>
              <span>XAU/USD Gold</span>
              {goldTradable && (
                <span
                  className={`w-2 h-2 rounded-full animate-ping ${
                    currentAsset.id === 'gold' ? 'bg-slate-950' : 'bg-amber-400'
                  }`}
                />
              )}
            </button>
          </nav>

          {/* Timezone Selector Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="tz-select-top" className="text-xs font-medium text-slate-400 font-mono hidden sm:inline">
              TZ:
            </label>
            <div className="relative">
              <select
                id="tz-select-top"
                value={selectedTz}
                onChange={(e) => onSelectTz(e.target.value as TzId)}
                className="bg-[#131c31] hover:bg-[#18233d] border border-slate-700/90 rounded-lg px-3 py-1.5 pr-8 text-xs font-mono font-bold text-emerald-400 appearance-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer shadow-sm"
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
        </div>
      </div>
    </header>
  );
};
