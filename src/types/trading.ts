export type StandardTimeframe =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

export type Timeframe = StandardTimeframe | string;

export type PriceType = 'LAST' | 'MARK' | 'INDEX';

export interface Candle {
  time: number; // millisecond timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  markPrice?: number;
  indexPrice?: number;
}

export type DrawingType = 'trendline' | 'horizontal_line' | 'rectangle' | 'price_range';

export interface Point {
  time: number;
  price: number;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  points: Point[]; // trendline: 2 points, horizontal_line: 1 point, rectangle: 2 points, price_range: 2 points
  color: string;
  lineWidth: number;
  isLocked: boolean;
  selected?: boolean;
}

export type AlertCondition = 'CROSSES_ABOVE' | 'CROSSES_BELOW' | 'CROSSING';

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: AlertCondition;
  createdAt: number;
  triggered: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
}

export interface BarReplayState {
  isActive: boolean;
  cutIndex: number;
  currentIndex: number;
  isPlaying: boolean;
  speedMs: number;
}
