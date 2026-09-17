export type TradeStatus = 'NO_TRADE' | 'TRADE_BIG' | 'TRADE_SCALP' | 'TRADE';

export type TzId = 'IST' | 'UTC' | 'ET';

export interface TimezoneOption {
  id: TzId;
  label: string;
  short: string;
  iana: string;
  description: string;
}

export interface TradingZone {
  id: string;
  start: number; // in minutes from midnight IST (0 - 1440)
  end: number;   // in minutes from midnight IST (0 - 1440)
  name: string;
  status: TradeStatus;
  tag: string;
  notes: string;
  canTrade: boolean;
  color: string;
  volatility: string;
  code: string;
  badge: string;
}

export interface AssetTrack {
  id: string;
  code: string;
  name: string;
  sublabel: string;
  color: string;
  bgLight: string;
  borderLight: string;
  start: number;
  end: number;
  status: TradeStatus;
  zoneId: string;
}

export type AssetId = 'btc' | 'gold';

export interface QuantNote {
  title: string;
  highlights: {
    label: string;
    text: string;
    level: 'info' | 'warning' | 'success';
  }[];
  summary: string;
}

export interface AssetConfig {
  id: AssetId;
  slug: string;
  title: string;
  symbol: string;
  pair: string;
  quoteName: string;
  icon: string;
  accentColor: string;
  glowClass: string;
  zones: TradingZone[];
  tracks: AssetTrack[];
  quantNotes?: QuantNote;
  getVolatilityLevelAtIst: (istMins: number) => number;
}
