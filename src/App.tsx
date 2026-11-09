import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Candle,
  Drawing,
  DrawingType,
  PriceAlert,
  PriceType,
  Timeframe,
  TradingPair,
} from './types/trading';
import {
  fetchFuturesTickers,
  fetchHistoricalKlines,
  fetchLatestCandle,
  fetchPremiumIndex,
  BinanceWebSocketClient,
  playAlertChime,
  triggerVibration,
  showBrowserNotification,
} from './services/binanceApi';
import { CandlestickChart, formatPrice } from './components/CandlestickChart';
import { DrawingToolbar } from './components/DrawingToolbar';
import { DrawingSettingsBar } from './components/DrawingSettingsBar';
import { WatchlistModal } from './components/WatchlistModal';
import { PriceAlertsModal } from './components/PriceAlertsModal';
import { CustomTimeframeModal } from './components/CustomTimeframeModal';
import { BarReplayBar } from './components/BarReplayBar';
import { AndroidProjectViewer } from './components/AndroidProjectViewer';
import {
  ChevronDown,
  Bell,
  RotateCcw,
  Smartphone,
  FolderGit2,
  Maximize2,
  Minimize2,
  Maximize,
  Minimize,
  Plus,
  Clock,
} from 'lucide-react';

const COMMON_TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '1h', '4h', '1d'];

export default function App() {
  // Active Pair & Data
  const [currentSymbol, setCurrentSymbol] = useState<string>('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [priceType, setPriceType] = useState<PriceType>('LAST');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tv_favorites');
      return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'XRPUSDT'];
    } catch {
      return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
    }
  });

  // Current market stats
  const [currentPairStats, setCurrentPairStats] = useState<TradingPair | null>(null);
  const [markPrice, setMarkPrice] = useState<number>(0);
  const [indexPrice, setIndexPrice] = useState<number>(0);
  const [fundingRate, setFundingRate] = useState<number>(0);

  // Drawings state
  const [drawings, setDrawings] = useState<Drawing[]>(() => {
    try {
      const saved = localStorage.getItem(`tv_drawings_${currentSymbol}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingType | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // Price Scale Setting (Linear vs Log)
  const [logScale, setLogScale] = useState<boolean>(false);

  // Modals & Panels
  const [isWatchlistOpen, setIsWatchlistOpen] = useState<boolean>(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isCustomTfOpen, setIsCustomTfOpen] = useState<boolean>(false);
  const [isAndroidProjectOpen, setIsAndroidProjectOpen] = useState<boolean>(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Price Alerts (simple editable price line, no name tags)
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem('tv_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Bar Replay Mode
  const [isReplayActive, setIsReplayActive] = useState<boolean>(false);
  const [replayCutIndex, setReplayCutIndex] = useState<number>(-1);
  const [replayCurrentIndex, setReplayCurrentIndex] = useState<number>(-1);
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replaySpeedMs, setReplaySpeedMs] = useState<number>(500);

  // Orientation / Auto-Rotate simulation
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);

  // WebSocket Manager reference
  const wsClientRef = useRef<BinanceWebSocketClient | null>(null);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Save favorites, alerts & drawings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tv_favorites', JSON.stringify(favorites));
    } catch (_) {}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('tv_alerts', JSON.stringify(alerts));
    } catch (_) {}
  }, [alerts]);

  useEffect(() => {
    try {
      localStorage.setItem(`tv_drawings_${currentSymbol}`, JSON.stringify(drawings));
    } catch (_) {}
  }, [drawings, currentSymbol]);

  // Load all Binance USD-M futures pairs
  useEffect(() => {
    let isMounted = true;
    fetchFuturesTickers()
      .then((data) => {
        if (!isMounted) return;
        setPairs(data);
        const match = data.find((p) => p.symbol === currentSymbol);
        if (match) setCurrentPairStats(match);
      })
      .catch((err) => console.error('Failed to load pairs', err));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const match = pairs.find((p) => p.symbol === currentSymbol);
    if (match) setCurrentPairStats(match);
  }, [pairs, currentSymbol]);

  // Load Premium Index (Mark Price, Index Price, Funding Rate)
  const refreshPremiumIndex = useCallback(() => {
    fetchPremiumIndex(currentSymbol).then((data) => {
      setMarkPrice(data.markPrice);
      setIndexPrice(data.indexPrice);
      setFundingRate(data.fundingRate);
    });
  }, [currentSymbol]);

  useEffect(() => {
    refreshPremiumIndex();
    const interval = setInterval(refreshPremiumIndex, 3000);
    return () => clearInterval(interval);
  }, [refreshPremiumIndex]);

  // Check Price Alerts
  const checkPriceAlerts = useCallback((latestPrice: number) => {
    setAlerts((prevAlerts) => {
      let hasTriggeredAny = false;
      const updated = prevAlerts.map((a) => {
        if (a.symbol === currentSymbol && !a.triggered) {
          let triggered = false;
          if (a.condition === 'CROSSES_ABOVE' && latestPrice >= a.targetPrice) triggered = true;
          if (a.condition === 'CROSSES_BELOW' && latestPrice <= a.targetPrice) triggered = true;
          if (a.condition === 'CROSSING' && Math.abs(latestPrice - a.targetPrice) / a.targetPrice < 0.0008) triggered = true;

          if (triggered) {
            hasTriggeredAny = true;
            if (a.soundEnabled) playAlertChime();
            if (a.vibrateEnabled) triggerVibration([300, 150, 300]);
            showBrowserNotification(
              `Price Alert: ${a.symbol}`,
              `Price reached ${formatPrice(latestPrice)} (Target: ${formatPrice(a.targetPrice)})`
            );
            return { ...a, triggered: true };
          }
        }
        return a;
      });
      return hasTriggeredAny ? updated : prevAlerts;
    });
  }, [currentSymbol]);

  // Load historical klines and initialize WebSocket whenever symbol, timeframe, or priceType changes!
  useEffect(() => {
    let isCancelled = false;

    try {
      const saved = localStorage.getItem(`tv_drawings_${currentSymbol}`);
      setDrawings(saved ? JSON.parse(saved) : []);
    } catch {
      setDrawings([]);
    }
    setSelectedDrawingId(null);

    // Fetch initial historical candles based on active priceType (LAST, MARK, or INDEX)
    fetchHistoricalKlines(currentSymbol, timeframe, priceType)
      .then((history) => {
        if (isCancelled) return;
        setCandles(history);

        if (history.length > 50) {
          const cut = history.length - 30;
          setReplayCutIndex(cut);
          setReplayCurrentIndex(cut);
        }

        if (!isReplayActive) {
          if (!wsClientRef.current) {
            wsClientRef.current = new BinanceWebSocketClient();
          }
          wsClientRef.current.connect(
            currentSymbol,
            timeframe,
            priceType,
            (newCandle) => {
              setCandles((prev) => {
                if (prev.length === 0) return [newCandle];
                const last = prev[prev.length - 1];
                let nextCandles: Candle[];
                if (last.time === newCandle.time) {
                  nextCandles = [...prev.slice(0, -1), newCandle];
                } else {
                  nextCandles = [...prev, newCandle];
                }
                checkPriceAlerts(newCandle.close);
                return nextCandles;
              });
            },
            (prices) => {
              if (prices.markPrice) setMarkPrice(prices.markPrice);
              if (prices.indexPrice) setIndexPrice(prices.indexPrice);
              if (prices.lastPrice && priceType === 'LAST') {
                // Instantly update live candle close
                setCandles((prev) => {
                  if (prev.length === 0) return prev;
                  const last = prev[prev.length - 1];
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...last,
                    close: prices.lastPrice!,
                    high: Math.max(last.high, prices.lastPrice!),
                    low: Math.min(last.low, prices.lastPrice!),
                  };
                  checkPriceAlerts(prices.lastPrice!);
                  return updated;
                });
              } else if (prices.markPrice && priceType === 'MARK') {
                // If viewing Mark Price chart, update candle live with markPrice
                setCandles((prev) => {
                  if (prev.length === 0) return prev;
                  const last = prev[prev.length - 1];
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...last,
                    close: prices.markPrice!,
                    high: Math.max(last.high, prices.markPrice!),
                    low: Math.min(last.low, prices.markPrice!),
                  };
                  checkPriceAlerts(prices.markPrice!);
                  return updated;
                });
              }
            }
          );
        }
      })
      .catch((err) => console.error('Failed to load klines', err));

    return () => {
      isCancelled = true;
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
    };
  }, [currentSymbol, timeframe, priceType, isReplayActive, checkPriceAlerts]);

  // Guaranteed 1-Second Live Candle Mover (Prevents freezing if WebSocket is delayed)
  useEffect(() => {
    if (isReplayActive) return;

    const interval = setInterval(async () => {
      const latest = await fetchLatestCandle(currentSymbol, timeframe, priceType);
      if (latest) {
        setCandles((prev) => {
          if (prev.length === 0) return [latest];
          const last = prev[prev.length - 1];
          if (last.time === latest.time) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...last,
              close: latest.close,
              high: Math.max(last.high, latest.high),
              low: Math.min(last.low, latest.low),
              volume: latest.volume || last.volume,
            };
            checkPriceAlerts(latest.close);
            return updated;
          } else if (latest.time > last.time) {
            checkPriceAlerts(latest.close);
            return [...prev, latest];
          }
          return prev;
        });
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [currentSymbol, timeframe, priceType, isReplayActive, checkPriceAlerts]);

  // Bar Replay auto-play
  useEffect(() => {
    if (!isReplayActive || !isReplayPlaying) return;

    const timer = setInterval(() => {
      setReplayCurrentIndex((prev) => {
        if (prev < candles.length - 1) {
          return prev + 1;
        } else {
          setIsReplayPlaying(false);
          return prev;
        }
      });
    }, replaySpeedMs);

    return () => clearInterval(timer);
  }, [isReplayActive, isReplayPlaying, replaySpeedMs, candles.length]);

  const handleStartReplay = () => {
    if (candles.length < 20) return;
    const cut = Math.max(10, candles.length - 40);
    setReplayCutIndex(cut);
    setReplayCurrentIndex(cut);
    setIsReplayActive(true);
    setIsReplayPlaying(false);
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }
  };

  const handleExitReplay = () => {
    setIsReplayActive(false);
    setIsReplayPlaying(false);
  };

  const handleToggleFavorite = (symbol: string) => {
    setFavorites((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  // Drawing updates
  const handleUpdateDrawing = (updated: Drawing) => {
    setDrawings((prev) => {
      const exists = prev.some((d) => d.id === updated.id);
      if (exists) {
        return prev.map((d) => (d.id === updated.id ? updated : d));
      }
      return [...prev, updated];
    });
  };

  const handleDeleteDrawing = (id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    if (selectedDrawingId === id) setSelectedDrawingId(null);
  };

  const handleClearAllDrawings = () => {
    setDrawings([]);
    setSelectedDrawingId(null);
  };

  // Direct Plus (+) alert line creation (pure price line, no name tag)
  const handleAddAlertAtPrice = (price: number) => {
    const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : price;
    const condition = price >= currentPrice ? 'CROSSES_ABOVE' : 'CROSSES_BELOW';
    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}`,
      symbol: currentSymbol,
      targetPrice: price,
      condition,
      createdAt: Date.now(),
      triggered: false,
      soundEnabled: true,
      vibrateEnabled: true,
    };
    setAlerts((prev) => [newAlert, ...prev]);
    playAlertChime();
  };

  const handleUpdateAlertPrice = (id: string, newPrice: number) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, targetPrice: newPrice, triggered: false } : a))
    );
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const selectedDrawing = drawings.find((d) => d.id === selectedDrawingId);

  // Active price based on selected price type
  const activePriceValue =
    priceType === 'MARK' && markPrice
      ? markPrice
      : priceType === 'INDEX' && indexPrice
      ? indexPrice
      : currentPairStats?.price || (candles.length > 0 ? candles[candles.length - 1].close : 0);

  const isBullish = (currentPairStats?.priceChangePercent || 0) >= 0;

  return (
    <div className={`w-screen h-screen flex flex-col bg-[#131722] text-[#d1d4dc] overflow-hidden ${isLandscape ? 'landscape-mode' : ''}`}>
      {/* Phone bezel frame wrapper if enabled */}
      <div className={`flex flex-col flex-1 w-full h-full overflow-hidden ${isPhoneFrame ? 'max-w-md mx-auto my-auto h-[92vh] rounded-[38px] border-[10px] border-[#242731] shadow-2xl relative' : ''}`}>

        {/* Top TradingView Bar */}
        <header className="flex items-center justify-between px-2 sm:px-3 py-1.5 bg-[#181b24] border-b border-[#242731] shrink-0 z-20 gap-2 select-none">
          {/* Left Zone: Symbol Selector & Price Summary */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWatchlistOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#202430] hover:bg-[#2a2e39] border border-[#2a2e39] text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              title="Select Binance Futures pair"
            >
              <span>{currentSymbol}</span>
              <span className="text-[10px] px-1 py-0.2 bg-[#2962ff]/20 text-[#2962ff] rounded">USD-M</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#787b86]" />
            </button>

            <div className="flex items-center gap-1.5 font-mono-numbers">
              <span className={`text-xs sm:text-sm font-bold ${isBullish ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                {formatPrice(activePriceValue)}
              </span>
              {currentPairStats && (
                <span
                  className={`text-[11px] font-semibold hidden sm:inline ${
                    isBullish ? 'text-[#089981]' : 'text-[#f23645]'
                  }`}
                >
                  {isBullish ? '+' : ''}{currentPairStats.priceChangePercent.toFixed(2)}%
                </span>
              )}
            </div>
          </div>

          {/* Middle Zone: Timeframes Bar & SINGLE-CLICK Price Type Switcher (LAST / MARK / INDEX) */}
          <div className="flex items-center gap-1.5">
            {/* Timeframes Bar */}
            <div className="flex items-center bg-[#131722] p-0.5 rounded-lg border border-[#242731]">
              {COMMON_TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-1.5 sm:px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    timeframe === tf
                      ? 'bg-[#2962ff] text-white shadow-sm font-semibold'
                      : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
                  }`}
                >
                  {tf}
                </button>
              ))}

              {!COMMON_TIMEFRAMES.includes(timeframe) && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#2962ff] text-white rounded">
                  {timeframe}
                </span>
              )}

              <button
                onClick={() => setIsCustomTfOpen(true)}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-[#787b86] hover:text-white hover:bg-[#202430] rounded transition-colors cursor-pointer"
                title="Select or add custom timeframe (e.g. 30m, 2h, 12h, 1w)"
              >
                <Clock className="w-3 h-3" />
                <span className="text-[10px]">Custom</span>
              </button>
            </div>

            {/* SINGLE CLICK Switch between LAST, MARK, and INDEX Price Chart */}
            <div className="flex items-center bg-[#131722] p-0.5 rounded-lg border border-[#242731] text-[11px]">
              {(['LAST', 'MARK', 'INDEX'] as PriceType[]).map((type) => {
                const isActive = priceType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setPriceType(type)}
                    className={`px-2 py-0.5 font-bold rounded transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#2962ff] text-white shadow'
                        : 'text-[#787b86] hover:text-white hover:bg-[#1e222d]'
                    }`}
                    title={`Click to open ${type} Price Chart for ${currentSymbol}`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            {/* Scale mode: Log vs Linear */}
            <button
              onClick={() => setLogScale(!logScale)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer hidden xl:inline ${
                logScale
                  ? 'bg-[#2962ff]/20 text-[#2962ff] border-[#2962ff]/50'
                  : 'bg-[#131722] text-[#787b86] border-[#242731] hover:text-white'
              }`}
              title="Toggle Logarithmic Price Scale"
            >
              {logScale ? 'LOG' : 'LIN'}
            </button>
          </div>

          {/* Right Zone: Alert Plus Button, Fullscreen, Replay, Rotate, Android */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Direct Plus Button to add Price Alert line */}
            <button
              onClick={() => {
                if (candles.length > 0) {
                  handleAddAlertAtPrice(candles[candles.length - 1].close);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#ff9800] hover:bg-[#e68900] text-black text-xs font-bold shadow transition-colors cursor-pointer"
              title="Add price alert line (+)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Alert</span>
            </button>

            {/* Price Alerts List trigger */}
            <button
              onClick={() => setIsAlertsOpen(true)}
              className="relative p-1.5 rounded bg-[#202430] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-colors cursor-pointer"
              title="View all price alerts"
              aria-label="Price Alerts"
            >
              <Bell className="w-3.5 h-3.5" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#2962ff] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Bar Replay Trigger */}
            <button
              onClick={isReplayActive ? handleExitReplay : handleStartReplay}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                isReplayActive
                  ? 'bg-[#ff9800]/20 text-[#ff9800] border-[#ff9800]/50'
                  : 'bg-[#202430] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border-[#2a2e39]'
              }`}
              title="Bar Replay mode"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Replay</span>
            </button>

            {/* Full Screen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded bg-[#202430] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              aria-label="Toggle Full Screen"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-[#2962ff]" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>

            {/* Auto-Rotate Orientation */}
            <button
              onClick={() => setIsLandscape(!isLandscape)}
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                isLandscape
                  ? 'bg-[#2962ff] text-white border-[#2962ff]'
                  : 'bg-[#202430] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border-[#2a2e39]'
              }`}
              title={isLandscape ? 'Switch to Portrait' : 'Switch to Landscape (Auto-rotate)'}
              aria-label="Rotate Orientation"
            >
              <Smartphone className={`w-3.5 h-3.5 transition-transform ${isLandscape ? 'rotate-90 text-white' : ''}`} />
            </button>

            {/* Android Device Frame */}
            <button
              onClick={() => setIsPhoneFrame(!isPhoneFrame)}
              className={`hidden sm:flex p-1.5 rounded border transition-colors cursor-pointer ${
                isPhoneFrame
                  ? 'bg-[#2962ff]/20 text-[#2962ff] border-[#2962ff]/50'
                  : 'bg-[#202430] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border-[#2a2e39]'
              }`}
              title={isPhoneFrame ? 'Full Screen Preview' : 'Phone Bezel Preview'}
              aria-label="Phone Bezel Preview"
            >
              {isPhoneFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Android Studio Source Code */}
            <button
              onClick={() => setIsAndroidProjectOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#2962ff] hover:bg-[#1e4bd8] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
              title="View Kotlin & Jetpack Compose Android Studio project"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Android Code</span>
            </button>
          </div>
        </header>

        {/* Secondary Info Ticker (Mark Price, Index Price, Funding Rate, 24h High/Low) */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#131722] border-b border-[#242731] text-[11px] text-[#787b86] font-mono-numbers shrink-0 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-3">
            <span
              onClick={() => setPriceType('MARK')}
              className={`cursor-pointer transition-colors ${priceType === 'MARK' ? 'text-[#2962ff] font-bold underline' : 'hover:text-white'}`}
            >
              Mark: <strong className="text-white">{formatPrice(markPrice)}</strong>
            </span>
            <span
              onClick={() => setPriceType('INDEX')}
              className={`cursor-pointer transition-colors ${priceType === 'INDEX' ? 'text-[#2962ff] font-bold underline' : 'hover:text-white'}`}
            >
              Index: <strong className="text-white">{formatPrice(indexPrice)}</strong>
            </span>
            <span>
              Funding:{' '}
              <strong className={fundingRate >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}>
                {(fundingRate * 100).toFixed(4)}%
              </strong>
            </span>
          </div>
          {currentPairStats && (
            <div className="hidden sm:flex items-center gap-3">
              <span>24h High: <strong className="text-white">{formatPrice(currentPairStats.highPrice)}</strong></span>
              <span>24h Low: <strong className="text-white">{formatPrice(currentPairStats.lowPrice)}</strong></span>
              <span>24h Vol: <strong className="text-white">${(currentPairStats.quoteVolume / 1_000_000).toFixed(1)}M</strong></span>
            </div>
          )}
        </div>

        {/* Bar Replay Controls Bar */}
        <BarReplayBar
          isActive={isReplayActive}
          isPlaying={isReplayPlaying}
          currentIndex={replayCurrentIndex}
          totalCandles={candles.length}
          speedMs={replaySpeedMs}
          onTogglePlay={() => setIsReplayPlaying(!isReplayPlaying)}
          onStepForward={() => setReplayCurrentIndex((prev) => Math.min(candles.length - 1, prev + 1))}
          onResetToCut={() => setReplayCurrentIndex(replayCutIndex)}
          onChangeSpeed={(ms) => setReplaySpeedMs(ms)}
          onSeek={(idx) => setReplayCurrentIndex(idx)}
          onExit={handleExitReplay}
        />

        {/* Center Workspace: Left Drawing Toolbar + Candlestick Chart */}
        <div className="relative flex flex-1 w-full overflow-hidden">
          {/* Left Drawing Tools */}
          <DrawingToolbar
            activeDrawingTool={activeDrawingTool}
            onSelectTool={(tool) => setActiveDrawingTool(tool)}
            onClearAllDrawings={handleClearAllDrawings}
            drawingsCount={drawings.length}
          />

          {/* Floating Settings Bar when a drawing is selected */}
          {selectedDrawing && (
            <DrawingSettingsBar
              drawing={selectedDrawing}
              onUpdate={handleUpdateDrawing}
              onDelete={handleDeleteDrawing}
              onClose={() => setSelectedDrawingId(null)}
            />
          )}

          {/* 60fps Candlestick Chart with reliable pan and live movement */}
          <main className="flex-1 w-full h-full relative overflow-hidden" aria-label="Live Candlestick Chart">
            <CandlestickChart
              candles={candles}
              timeframe={timeframe}
              symbol={currentSymbol}
              priceType={priceType}
              markPrice={markPrice}
              indexPrice={indexPrice}
              activeDrawingTool={activeDrawingTool}
              onDrawingComplete={() => setActiveDrawingTool(null)}
              drawings={drawings}
              onUpdateDrawing={handleUpdateDrawing}
              onDeleteDrawing={handleDeleteDrawing}
              selectedDrawingId={selectedDrawingId}
              onSelectDrawing={(id) => setSelectedDrawingId(id)}
              isReplayActive={isReplayActive}
              replayCutIndex={replayCurrentIndex}
              onSetReplayCutIndex={(idx) => {
                setReplayCutIndex(idx);
                setReplayCurrentIndex(idx);
              }}
              logScale={logScale}
              alerts={alerts}
              onAddAlertAtPrice={handleAddAlertAtPrice}
              onUpdateAlertPrice={handleUpdateAlertPrice}
              onDeleteAlert={handleDeleteAlert}
            />
          </main>
        </div>

        {/* Bottom Bar: Mobile / Desktop status bar */}
        <footer className="flex items-center justify-between px-3 py-1.5 bg-[#181b24] border-t border-[#242731] text-[10.5px] text-[#787b86] shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse" />
              <span className="text-white font-medium">Binance USD-M Live Stream</span>
            </span>
            <span className="hidden sm:inline">· Active: {priceType} Price</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Alert Plus Button at bottom */}
            <button
              onClick={() => {
                if (candles.length > 0) {
                  handleAddAlertAtPrice(candles[candles.length - 1].close);
                }
              }}
              className="flex items-center gap-1 text-[#ff9800] hover:underline font-bold cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Add Alert Line</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setIsWatchlistOpen(true)}
              className="text-[#d1d4dc] hover:text-white font-medium cursor-pointer"
            >
              Watchlist ({favorites.length})
            </button>
            <span>·</span>
            <button
              onClick={() => setIsAndroidProjectOpen(true)}
              className="text-[#2962ff] hover:underline font-medium cursor-pointer"
            >
              Jetpack Compose Code
            </button>
          </div>
        </footer>
      </div>

      {/* 4-Part Watchlist Modal (My Watchlist, Top 100, Gainers, Losers) */}
      <WatchlistModal
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        pairs={pairs}
        currentSymbol={currentSymbol}
        onSelectPair={(sym) => setCurrentSymbol(sym)}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Price Alerts Modal (Simple Price Line Editor) */}
      <PriceAlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        symbol={currentSymbol}
        currentPrice={activePriceValue}
        alerts={alerts}
        onAddAlert={(targetPrice, condition, sound, vibrate) => {
          const newAlert: PriceAlert = {
            id: `alert_${Date.now()}`,
            symbol: currentSymbol,
            targetPrice,
            condition,
            createdAt: Date.now(),
            triggered: false,
            soundEnabled: sound,
            vibrateEnabled: vibrate,
          };
          setAlerts((prev) => [newAlert, ...prev]);
          setIsAlertsOpen(false);
          playAlertChime();
        }}
        onDeleteAlert={handleDeleteAlert}
        onClearTriggered={() => setAlerts((prev) => prev.filter((a) => !a.triggered))}
      />

      {/* Custom Timeframe Selector Modal */}
      <CustomTimeframeModal
        isOpen={isCustomTfOpen}
        onClose={() => setIsCustomTfOpen(false)}
        currentTimeframe={timeframe}
        onSelectTimeframe={(tf) => setTimeframe(tf)}
      />

      {/* Android Studio Clean Architecture Project Viewer */}
      <AndroidProjectViewer
        isOpen={isAndroidProjectOpen}
        onClose={() => setIsAndroidProjectOpen(false)}
      />
    </div>
  );
}
