import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AssetId, TzId } from './types';
import { ASSETS, BTC_CONFIG, GOLD_CONFIG, TIMEZONES } from './data/assets';
import { getLiveTime, getTzOffsetMinutesFromIST, formatMins, pad } from './utils/time';
import { AssetHeader } from './components/AssetHeader';
import { StatusCountdownCard } from './components/StatusCountdownCard';
import { SessionTimeline } from './components/SessionTimeline';
import { VolatilityChart } from './components/VolatilityChart';
import { ScheduleTable } from './components/ScheduleTable';

export default function App() {
  // Parse initial asset from URL pathname or hash (/gold, /xau, /btc)
  const getInitialAssetId = (): AssetId => {
    if (typeof window !== 'undefined') {
      const path = (window.location.pathname + window.location.hash).toLowerCase();
      if (path.includes('gold') || path.includes('xau')) {
        return 'gold';
      }
    }
    return 'btc';
  };

  const [activeAssetId, setActiveAssetId] = useState<AssetId>(getInitialAssetId);
  const [selectedTz, setSelectedTz] = useState<TzId>('IST');

  // Sync with browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setActiveAssetId(getInitialAssetId());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handler for changing asset subpage
  const handleSelectAsset = useCallback((assetId: AssetId) => {
    setActiveAssetId(assetId);
    if (typeof window !== 'undefined') {
      const targetUrl = assetId === 'gold' ? '/gold' : '/btc';
      if (window.location.pathname !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
      }
    }
  }, []);

  const currentAsset = ASSETS[activeAssetId] || BTC_CONFIG;
  const activeTzObj = TIMEZONES[selectedTz];

  // Real-time live clocks
  const [clockState, setClockState] = useState(() => {
    return {
      ist: getLiveTime('Asia/Kolkata'),
      tz: getLiveTime(activeTzObj.iana),
      offsetFromIST: getTzOffsetMinutesFromIST(activeTzObj.iana)
    };
  });

  // 1-second clock ticker
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

  // Active Zone for current asset
  const currentZone = useMemo(() => {
    return (
      currentAsset.zones.find(
        (z) => istTime.totalMinutes >= z.start && istTime.totalMinutes < z.end
      ) || currentAsset.zones[0]
    );
  }, [currentAsset, istTime.totalMinutes]);

  // Next tradable zone for current asset
  const nextTradableZone = useMemo(() => {
    const tradable = currentAsset.zones.filter((z) => z.canTrade);
    const upcoming = tradable.find((z) => z.start > istTime.totalMinutes);
    if (upcoming) {
      return {
        zone: upcoming,
        diffMinutes: upcoming.start - istTime.totalMinutes
      };
    }
    const firstTomorrow = tradable[0];
    return {
      zone: firstTomorrow,
      diffMinutes: 1440 - istTime.totalMinutes + firstTomorrow.start
    };
  }, [currentAsset, istTime.totalMinutes]);

  // Overall status check for tabs
  const btcTradable = useMemo(() => {
    const zone = BTC_CONFIG.zones.find(
      (z) => istTime.totalMinutes >= z.start && istTime.totalMinutes < z.end
    );
    return !!zone?.canTrade;
  }, [istTime.totalMinutes]);

  const goldTradable = useMemo(() => {
    const zone = GOLD_CONFIG.zones.find(
      (z) => istTime.totalMinutes >= z.start && istTime.totalMinutes < z.end
    );
    return !!zone?.canTrade;
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

      let label = `UNTIL ${currentZone.name.toUpperCase()} CLOSE`;
      if (currentZone.badge) {
        label = `UNTIL ${currentZone.badge.toUpperCase()} WINDOW CLOSE`;
      }

      const slotStartTz = (currentZone.start + offsetFromIST + 1440) % 1440;
      const slotEndTz = (currentZone.end + offsetFromIST + 1440) % 1440;

      let color: 'emerald' | 'amber' | 'sky' = 'emerald';
      if (currentZone.status === 'TRADE_SCALP') color = 'amber';
      else if (currentZone.status === 'TRADE' && currentAsset.id === 'btc') color = 'emerald';

      return {
        tagLabel: label,
        formattedTime: `${pad(ch)}h ${pad(cm)}m ${pad(cs)}s`,
        percentElapsed: percent,
        slotStr: `${formatMins(slotStartTz)} – ${formatMins(slotEndTz)} ${activeTzObj.short}`,
        status: 'active',
        color
      };
    } else {
      const totalSecs = nextTradableZone.diffMinutes * 60 - istTime.seconds;
      const ch = Math.floor(Math.max(0, totalSecs) / 3600);
      const cm = Math.floor((Math.max(0, totalSecs) % 3600) / 60);
      const cs = Math.max(0, totalSecs) % 60;

      const zoneDuration = (currentZone.end - currentZone.start) * 60;
      const elapsedSecs = (istTime.totalMinutes - currentZone.start) * 60 + istTime.seconds;
      const percent = Math.min(100, Math.max(0, Math.floor((elapsedSecs / zoneDuration) * 100)));

      const targetText = `${nextTradableZone.zone.name.toUpperCase()} (${nextTradableZone.zone.badge.toUpperCase()})`;

      const slotStartTz = (nextTradableZone.zone.start + offsetFromIST + 1440) % 1440;
      const slotEndTz = (nextTradableZone.zone.end + offsetFromIST + 1440) % 1440;

      return {
        tagLabel: `UNTIL ${targetText}`,
        formattedTime: `${pad(ch)}h ${pad(cm)}m ${pad(cs)}s`,
        percentElapsed: percent,
        slotStr: `${formatMins(slotStartTz)} – ${formatMins(slotEndTz)} ${activeTzObj.short}`,
        status: 'restricted',
        color: 'amber' as const
      };
    }
  }, [currentZone, istTime, nextTradableZone, offsetFromIST, activeTzObj, currentAsset.id]);

  return (
    <main
      id="trading-hours-app"
      className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col items-center justify-start p-2.5 sm:p-6 md:p-8"
    >
      {/* Main Widget Container */}
      <div
        id="tracker-card"
        className="w-full max-w-5xl bg-[#0f172a] border border-slate-800/90 rounded-2xl shadow-2xl p-4 sm:p-7 md:p-9 relative overflow-hidden"
      >
        {/* Top Header with Asset Switcher and Timezone Selector */}
        <AssetHeader
          currentAsset={currentAsset}
          onSelectAsset={handleSelectAsset}
          selectedTz={selectedTz}
          onSelectTz={setSelectedTz}
          isCurrentZoneTradable={currentZone.canTrade}
          btcTradable={btcTradable}
          goldTradable={goldTradable}
        />

        {/* Live Status & Countdown Gauge Card */}
        <StatusCountdownCard
          currentAsset={currentAsset}
          istTime={istTime}
          tzTime={tzTime}
          activeTzObj={activeTzObj}
          currentZone={currentZone}
          countdownData={countdownData}
        />

        {/* Interactive 24H Session Timeline */}
        <SessionTimeline
          currentAsset={currentAsset}
          offsetFromIST={offsetFromIST}
          activeTzObj={activeTzObj}
          tzTime={tzTime}
          istTime={istTime}
          currentZone={currentZone}
        />

        {/* Dynamic Volatility Profile Waveform */}
        <VolatilityChart
          currentAsset={currentAsset}
          offsetFromIST={offsetFromIST}
          activeTzObj={activeTzObj}
          tzTime={tzTime}
          currentZone={currentZone}
        />

        {/* Section 6 Execution Schedule Table & Quant Notes */}
        <ScheduleTable
          currentAsset={currentAsset}
          currentZone={currentZone}
          offsetFromIST={offsetFromIST}
          activeTzObj={activeTzObj}
        />
      </div>

      {/* Footer Info */}
      <footer className="mt-5 text-center text-xs font-mono text-slate-500 flex items-center justify-center gap-4">
        <span>Trading Hours • Section 6 Spec</span>
        <span>•</span>
        <span>IST (UTC+5:30) Synchronized</span>
        <span>•</span>
        <span>Use top switcher to toggle BTC / Gold</span>
      </footer>
    </main>
  );
}
