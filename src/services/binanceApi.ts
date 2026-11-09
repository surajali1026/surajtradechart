import { Candle, PriceType, Timeframe, TradingPair } from '../types/trading';

// Attempt direct Binance Futures first, fallback to proxy if CORS/sandboxed
const BINANCE_FAPI_DIRECT = 'https://fapi.binance.com';
const BINANCE_FAPI_PROXY = '/api/binance';

async function fetchWithFallback(endpoint: string): Promise<any> {
  try {
    const res = await fetch(`${BINANCE_FAPI_DIRECT}${endpoint}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error(`Direct failed with status ${res.status}`);
  } catch (err) {
    // Fallback to proxy
    const proxyRes = await fetch(`${BINANCE_FAPI_PROXY}${endpoint}`);
    if (!proxyRes.ok) {
      throw new Error(`Proxy failed with status ${proxyRes.status}`);
    }
    return await proxyRes.json();
  }
}

/**
 * Fetch all available USD-M Futures 24hr tickers
 */
export async function fetchFuturesTickers(): Promise<TradingPair[]> {
  const data = await fetchWithFallback('/fapi/v1/ticker/24hr');
  if (!Array.isArray(data)) return [];

  return data
    .filter((item: any) => item.symbol.endsWith('USDT'))
    .map((item: any) => ({
      symbol: item.symbol,
      baseAsset: item.symbol.replace('USDT', ''),
      quoteAsset: 'USDT',
      price: parseFloat(item.lastPrice) || 0,
      priceChangePercent: parseFloat(item.priceChangePercent) || 0,
      highPrice: parseFloat(item.highPrice) || 0,
      lowPrice: parseFloat(item.lowPrice) || 0,
      volume: parseFloat(item.volume) || 0,
      quoteVolume: parseFloat(item.quoteVolume) || 0,
    }))
    .sort((a, b) => b.quoteVolume - a.quoteVolume);
}

/**
 * Fetch historical Kline / Candlestick data for LAST, MARK, or INDEX price
 */
export async function fetchHistoricalKlines(
  symbol: string,
  interval: Timeframe,
  priceType: PriceType = 'LAST',
  limit: number = 500
): Promise<Candle[]> {
  let endpoint = '';
  const sym = symbol.toUpperCase();

  if (priceType === 'MARK') {
    endpoint = `/fapi/v1/markPriceKlines?symbol=${sym}&interval=${interval}&limit=${limit}`;
  } else if (priceType === 'INDEX') {
    endpoint = `/fapi/v1/indexPriceKlines?pair=${sym}&interval=${interval}&limit=${limit}`;
  } else {
    endpoint = `/fapi/v1/klines?symbol=${sym}&interval=${interval}&limit=${limit}`;
  }

  const data = await fetchWithFallback(endpoint);
  if (!Array.isArray(data)) return [];

  return data.map((d: any) => ({
    time: Number(d[0]),
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5]) || 0,
  }));
}

/**
 * Fetch the single latest candle for guaranteed 1-second live ticker movement
 */
export async function fetchLatestCandle(
  symbol: string,
  interval: Timeframe,
  priceType: PriceType = 'LAST'
): Promise<Candle | null> {
  try {
    const klines = await fetchHistoricalKlines(symbol, interval, priceType, 2);
    if (klines.length > 0) {
      return klines[klines.length - 1];
    }
  } catch (err) {
    // ignore
  }
  return null;
}

/**
 * Fetch Mark Price and Index Price
 */
export async function fetchPremiumIndex(symbol: string): Promise<{ markPrice: number; indexPrice: number; fundingRate: number; nextFundingTime: number }> {
  try {
    const data = await fetchWithFallback(`/fapi/v1/premiumIndex?symbol=${symbol.toUpperCase()}`);
    return {
      markPrice: parseFloat(data.markPrice) || 0,
      indexPrice: parseFloat(data.indexPrice) || 0,
      fundingRate: parseFloat(data.lastFundingRate) || 0,
      nextFundingTime: Number(data.nextFundingTime) || 0,
    };
  } catch (err) {
    return { markPrice: 0, indexPrice: 0, fundingRate: 0, nextFundingTime: 0 };
  }
}

/**
 * WebSocket Live Kline & Mark Price Subscription
 */
export class BinanceWebSocketClient {
  private ws: WebSocket | null = null;
  private currentSymbol: string = '';
  private currentInterval: string = '';
  private currentPriceType: PriceType = 'LAST';
  private onCandleUpdate: ((candle: Candle, isClosed: boolean) => void) | null = null;
  private onPriceUpdate: ((prices: { markPrice?: number; indexPrice?: number; lastPrice?: number }) => void) | null = null;
  private reconnectTimer: any = null;
  private isDestroyed: boolean = false;

  connect(
    symbol: string,
    interval: Timeframe,
    priceType: PriceType = 'LAST',
    onCandleUpdate: (candle: Candle, isClosed: boolean) => void,
    onPriceUpdate?: (prices: { markPrice?: number; indexPrice?: number; lastPrice?: number }) => void
  ) {
    this.isDestroyed = false;
    this.currentSymbol = symbol.toLowerCase();
    this.currentInterval = interval;
    this.currentPriceType = priceType;
    this.onCandleUpdate = onCandleUpdate;
    this.onPriceUpdate = onPriceUpdate || null;

    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }

    // Stream both kline and markPrice@1s for real-time live price updates
    const klineStream = `${this.currentSymbol}@kline_${this.currentInterval}`;
    const markStream = `${this.currentSymbol}@markPrice@1s`;
    const tickerStream = `${this.currentSymbol}@ticker`;
    const streamUrl = `wss://fstream.binance.com/stream?streams=${klineStream}/${markStream}/${tickerStream}`;

    try {
      this.ws = new WebSocket(streamUrl);

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Handle both stream combined wrapper and raw message
          const stream = msg.stream || '';
          const data = msg.data || msg;

          // 1. Kline stream update
          if ((stream.includes('kline') || data?.e === 'kline') && data?.k) {
            const k = data.k;
            const candle: Candle = {
              time: Number(k.t),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
            };

            // If user is viewing LAST price, this candle directly updates the live chart!
            if (this.currentPriceType === 'LAST') {
              this.onCandleUpdate?.(candle, k.x === true);
            }
          }

          // 2. Mark Price stream update (fires every 1 second)
          if (stream.includes('markPrice') || data?.e === 'markPriceUpdate') {
            const mp = parseFloat(data.p) || undefined;
            const ip = parseFloat(data.i) || undefined;
            this.onPriceUpdate?.({ markPrice: mp, indexPrice: ip });

            // If user is viewing MARK price, update the current candle live!
            if (this.currentPriceType === 'MARK' && mp) {
              const now = Number(data.E) || Date.now();
              this.onPriceUpdate?.({ markPrice: mp });
            }
          }

          // 3. Ticker stream update (fires continuously on trade)
          if (stream.includes('ticker') || data?.e === '24hrTicker') {
            const lp = parseFloat(data.c) || undefined;
            if (lp) {
              this.onPriceUpdate?.({ lastPrice: lp });
            }
          }
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Binance WS error', err);
      };

      this.ws.onclose = () => {
        if (!this.isDestroyed) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (!this.isDestroyed && this.currentSymbol) {
              this.connect(
                this.currentSymbol,
                this.currentInterval as Timeframe,
                this.currentPriceType,
                this.onCandleUpdate!,
                this.onPriceUpdate || undefined
              );
            }
          }, 2500);
        }
      };
    } catch (e) {
      console.error('Failed to open WS connection', e);
    }
  }

  disconnect() {
    this.isDestroyed = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
  }
}

/**
 * Synthesizes an authentic TradingView-like alert chime using Web Audio API
 */
export function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.51, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.35);
    gain2.gain.setValueAtTime(0.2, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn('Audio alert not supported or blocked by user gesture', err);
  }
}

/**
 * Triggers haptic vibration on supported devices
 */
export function triggerVibration(pattern: number[] = [250, 100, 250]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    console.warn('Vibration failed', err);
  }
}

/**
 * Show system / browser notification
 */
export async function showBrowserNotification(title: string, body: string) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
  } catch (err) {
    console.warn('Notification error', err);
  }
}
