import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Candle, Drawing, DrawingType, PriceAlert, PriceType, Timeframe } from '../types/trading';
import { Plus, RotateCcw, ArrowRight } from 'lucide-react';

interface CandlestickChartProps {
  candles: Candle[];
  timeframe: Timeframe;
  symbol: string;
  priceType: PriceType;
  markPrice?: number;
  indexPrice?: number;
  activeDrawingTool: DrawingType | null;
  onDrawingComplete: () => void;
  drawings: Drawing[];
  onUpdateDrawing: (drawing: Drawing) => void;
  onDeleteDrawing: (id: string) => void;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  isReplayActive: boolean;
  replayCutIndex: number;
  onSetReplayCutIndex?: (index: number) => void;
  logScale: boolean;
  alerts: PriceAlert[];
  onAddAlertAtPrice: (price: number) => void;
  onUpdateAlertPrice: (id: string, newPrice: number) => void;
  onDeleteAlert: (id: string) => void;
}

// Convert any timeframe string to milliseconds
export function getTimeframeMs(tf: string): number {
  const match = tf.match(/^(\d+)([mhdwM])$/);
  if (!match) return 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    case 'w': return val * 7 * 24 * 60 * 60 * 1000;
    case 'M': return val * 30 * 24 * 60 * 60 * 1000;
    default: return 60 * 1000;
  }
}

// Format price with proper precision
export function formatPrice(price: number): string {
  if (isNaN(price)) return '0.00';
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
}

// Format timestamp
function formatTime(timestamp: number, tf: string): string {
  const date = new Date(timestamp);
  if (tf.endsWith('d') || tf.endsWith('w') || tf.endsWith('M')) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  }
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  timeframe,
  symbol,
  priceType,
  markPrice,
  indexPrice,
  activeDrawingTool,
  onDrawingComplete,
  drawings,
  onUpdateDrawing,
  onDeleteDrawing,
  selectedDrawingId,
  onSelectDrawing,
  isReplayActive,
  replayCutIndex,
  onSetReplayCutIndex,
  logScale,
  alerts,
  onAddAlertAtPrice,
  onUpdateAlertPrice,
  onDeleteAlert,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport transformation state
  const [candleWidth, setCandleWidth] = useState<number>(10);
  // Pan offset in pixels. 0 means live candle is at standard right margin.
  const [panX, setPanX] = useState<number>(0);
  // Price scale vertical stretch multiplier
  const [priceScaleMultiplier, setPriceScaleMultiplier] = useState<number>(1);
  const [pricePanOffset, setPricePanOffset] = useState<number>(0);

  // Generous right-margin breathing room (10 bars space before the price scale)
  const rightMarginBars = 10;

  // Mouse / Touch interaction
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [isPriceScaleDragging, setIsPriceScaleDragging] = useState<boolean>(false);
  const [isTimeScaleDragging, setIsTimeScaleDragging] = useState<boolean>(false);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);

  // Dragging alert line price
  const [draggingAlertId, setDraggingAlertId] = useState<string | null>(null);

  // Drawing creation in progress
  const [drawingPoints, setDrawingPoints] = useState<{ time: number; price: number }[]>([]);
  // Dragging existing drawing handle
  const [draggingHandle, setDraggingHandle] = useState<{ drawingId: string; pointIndex: number } | null>(null);
  const [draggingWholeDrawing, setDraggingWholeDrawing] = useState<{ drawingId: string; startX: number; startY: number; origPoints: { time: number; price: number }[] } | null>(null);

  // Countdown timer state
  const [countdownText, setCountdownText] = useState<string>('00:00');

  // Multi-touch pinch tracking
  const touchDistanceRef = useRef<number | null>(null);

  // Dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const priceScaleWidth = 76;
  const timeScaleHeight = 26;

  // Measure container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(rect.width, 300),
          height: Math.max(rect.height, 250),
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update countdown timer every second
  useEffect(() => {
    const updateCountdown = () => {
      if (candles.length === 0) return;
      const lastCandle = candles[candles.length - 1];
      const tfMs = getTimeframeMs(timeframe);
      const nextCandleTime = lastCandle.time + tfMs;
      const now = Date.now();
      const diff = Math.max(0, nextCandleTime - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdownText(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      } else {
        setCountdownText(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [candles, timeframe]);

  // Determine current active candles (respecting Bar Replay cut)
  const displayCandles = isReplayActive && replayCutIndex >= 0
    ? candles.slice(0, replayCutIndex + 1)
    : candles;

  const chartWidth = Math.max(10, dimensions.width - priceScaleWidth);
  const chartHeight = Math.max(10, dimensions.height - timeScaleHeight);
  const N = displayCandles.length;

  // Stable Coordinate Math:
  // Base X for live candle (N - 1)
  const liveBaseX = chartWidth - rightMarginBars * candleWidth;

  const indexToX = useCallback((i: number): number => {
    if (N === 0) return 0;
    return liveBaseX - (N - 1 - i) * candleWidth + panX;
  }, [N, liveBaseX, candleWidth, panX]);

  const xToIndex = useCallback((x: number): number => {
    if (N === 0) return 0;
    const diffFromLive = (liveBaseX + panX - x) / candleWidth;
    return Math.round(N - 1 - diffFromLive);
  }, [N, liveBaseX, panX, candleWidth]);

  // Visible candle indices: all candles whose X coordinate is inside visible chart area
  let minVisibleI = 0;
  let maxVisibleI = Math.max(0, N - 1);

  if (N > 0) {
    minVisibleI = Math.max(0, Math.floor(xToIndex(-candleWidth * 2)));
    maxVisibleI = Math.min(N - 1, Math.ceil(xToIndex(chartWidth + candleWidth * 2)));
    if (minVisibleI > maxVisibleI) {
      const temp = minVisibleI;
      minVisibleI = maxVisibleI;
      maxVisibleI = temp;
    }
  }

  // Compute price bounds from visible candles
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  if (N > 0 && minVisibleI <= maxVisibleI) {
    for (let i = minVisibleI; i <= maxVisibleI; i++) {
      const c = displayCandles[i];
      if (c) {
        if (c.low < minPrice) minPrice = c.low;
        if (c.high > maxPrice) maxPrice = c.high;
      }
    }
  }

  if (minPrice === Infinity || maxPrice === -Infinity || minPrice >= maxPrice) {
    if (N > 0) {
      const lastC = displayCandles[N - 1];
      minPrice = lastC.low * 0.995;
      maxPrice = lastC.high * 1.005;
    } else {
      minPrice = 100;
      maxPrice = 200;
    }
  }

  const rawPriceRange = Math.max(maxPrice - minPrice, maxPrice * 0.001);
  const midPrice = (maxPrice + minPrice) / 2;
  const scaledRange = (rawPriceRange * 1.1) / priceScaleMultiplier;

  const displayMinPrice = midPrice - scaledRange / 2 + pricePanOffset;
  const displayMaxPrice = midPrice + scaledRange / 2 + pricePanOffset;
  const displayPriceRange = Math.max(displayMaxPrice - displayMinPrice, 0.00000001);

  // Price conversion functions
  const priceToY = useCallback((price: number): number => {
    if (logScale && displayMinPrice > 0 && displayMaxPrice > 0 && price > 0) {
      const logMin = Math.log(displayMinPrice);
      const logMax = Math.log(displayMaxPrice);
      const logPrice = Math.log(price);
      return chartHeight - ((logPrice - logMin) / (logMax - logMin)) * chartHeight;
    }
    return chartHeight - ((price - displayMinPrice) / displayPriceRange) * chartHeight;
  }, [displayMinPrice, displayMaxPrice, displayPriceRange, chartHeight, logScale]);

  const yToPrice = useCallback((y: number): number => {
    const ratio = (chartHeight - y) / chartHeight;
    if (logScale && displayMinPrice > 0 && displayMaxPrice > 0) {
      const logMin = Math.log(displayMinPrice);
      const logMax = Math.log(displayMaxPrice);
      return Math.exp(logMin + ratio * (logMax - logMin));
    }
    return displayMinPrice + ratio * displayPriceRange;
  }, [displayMinPrice, displayMaxPrice, displayPriceRange, chartHeight, logScale]);

  const timeToX = useCallback((time: number): number => {
    if (N === 0) return 0;
    let idx = displayCandles.findIndex(c => c.time >= time);
    if (idx === -1) idx = N - 1;
    return indexToX(idx);
  }, [displayCandles, N, indexToX]);

  const xToTime = useCallback((x: number): number => {
    const idx = xToIndex(x);
    if (idx >= 0 && idx < N) {
      return displayCandles[idx].time;
    }
    if (N > 0) {
      const tfMs = getTimeframeMs(timeframe);
      const last = displayCandles[N - 1];
      const diffIdx = idx - (N - 1);
      return last.time + diffIdx * tfMs;
    }
    return Date.now();
  }, [xToIndex, displayCandles, N, timeframe]);

  // Reset viewport to default auto-fit
  const handleAutoFit = useCallback(() => {
    setPanX(0);
    setPriceScaleMultiplier(1);
    setPricePanOffset(0);
    setCandleWidth(10);
  }, []);

  // Is live candle currently off to the right?
  const liveCandleX = N > 0 ? indexToX(N - 1) : 0;
  const isLiveCandleOffscreen = liveCandleX > chartWidth + 50 || liveCandleX < -50;

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // 1. Dark TradingView Background
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // 2. Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e222d';

    // Horizontal price grid lines
    const numPriceSteps = Math.max(4, Math.floor(chartHeight / 55));
    const priceStep = displayPriceRange / numPriceSteps;
    const priceTicks: number[] = [];

    for (let i = 0; i <= numPriceSteps; i++) {
      const p = displayMinPrice + i * priceStep;
      priceTicks.push(p);
      const y = priceToY(p);
      if (y >= 0 && y <= chartHeight) {
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(chartWidth, Math.round(y) + 0.5);
        ctx.stroke();
      }
    }

    // Vertical time grid lines
    const candleStep = Math.max(1, Math.floor(80 / candleWidth));
    const firstGridIdx = Math.max(0, Math.floor(xToIndex(0)) - 1);
    const lastGridIdx = Math.ceil(xToIndex(chartWidth)) + rightMarginBars + 2;

    for (let i = firstGridIdx; i <= lastGridIdx; i++) {
      if (i % candleStep === 0) {
        const x = indexToX(i);
        if (x >= 0 && x <= chartWidth) {
          ctx.beginPath();
          ctx.moveTo(Math.round(x) + 0.5, 0);
          ctx.lineTo(Math.round(x) + 0.5, chartHeight);
          ctx.stroke();
        }
      }
    }

    // 3. Render Candlesticks (Every candle inside visible range is rendered smoothly!)
    const barWidth = Math.max(1, candleWidth * 0.72);
    const wickWidth = Math.max(1, Math.min(2, Math.floor(candleWidth * 0.15)));

    for (let i = minVisibleI; i <= maxVisibleI; i++) {
      if (i < 0 || i >= N) continue;
      const c = displayCandles[i];
      const x = indexToX(i);
      if (x < -barWidth || x > chartWidth + barWidth) continue;

      const isBull = c.close >= c.open;
      const color = isBull ? '#089981' : '#f23645';

      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1.5);

      // Wick
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x - wickWidth / 2), Math.round(highY), wickWidth, Math.round(lowY - highY));

      // Real Body
      ctx.fillRect(Math.round(x - barWidth / 2), Math.round(bodyTop), Math.round(barWidth), Math.round(bodyHeight));
    }

    // 4. Render User Drawings
    drawings.forEach((drawing) => {
      const isSelected = drawing.id === selectedDrawingId;
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = isSelected ? drawing.lineWidth + 1.5 : drawing.lineWidth;
      ctx.fillStyle = drawing.color;

      if (drawing.type === 'horizontal_line') {
        const p = drawing.points[0];
        if (p) {
          const y = priceToY(p.price);
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartWidth, y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = drawing.color;
          ctx.fillRect(chartWidth, y - 9, priceScaleWidth, 18);
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(formatPrice(p.price), chartWidth + 5, y + 3.5);

          if (isSelected) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(chartWidth / 2, y, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = drawing.color;
            ctx.stroke();
          }
        }
      } else if (drawing.type === 'trendline') {
        if (drawing.points.length >= 2) {
          const p1 = drawing.points[0];
          const p2 = drawing.points[1];
          const x1 = timeToX(p1.time);
          const y1 = priceToY(p1.price);
          const x2 = timeToX(p2.time);
          const y2 = priceToY(p2.price);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          if (isSelected) {
            [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach((pt) => {
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = drawing.color;
              ctx.lineWidth = 2;
              ctx.stroke();
            });
          }
        }
      } else if (drawing.type === 'rectangle') {
        if (drawing.points.length >= 2) {
          const p1 = drawing.points[0];
          const p2 = drawing.points[1];
          const x1 = timeToX(p1.time);
          const y1 = priceToY(p1.price);
          const x2 = timeToX(p2.time);
          const y2 = priceToY(p2.price);

          const rx = Math.min(x1, x2);
          const ry = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1);
          const rh = Math.abs(y2 - y1);

          ctx.fillStyle = drawing.color.startsWith('#')
            ? `${drawing.color}22`
            : 'rgba(38, 166, 154, 0.15)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);

          if (isSelected) {
            [
              { x: rx, y: ry },
              { x: rx + rw, y: ry },
              { x: rx + rw, y: ry + rh },
              { x: rx, y: ry + rh },
            ].forEach((pt) => {
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = drawing.color;
              ctx.stroke();
            });
          }
        }
      } else if (drawing.type === 'price_range') {
        if (drawing.points.length >= 2) {
          const p1 = drawing.points[0];
          const p2 = drawing.points[1];
          const x1 = timeToX(p1.time);
          const y1 = priceToY(p1.price);
          const x2 = timeToX(p2.time);
          const y2 = priceToY(p2.price);

          const rx = Math.min(x1, x2);
          const ry = Math.min(y1, y2);
          const rw = Math.max(Math.abs(x2 - x1), 2);
          const rh = Math.max(Math.abs(y2 - y1), 2);

          const priceDiff = p2.price - p1.price;
          const percentDiff = p1.price !== 0 ? (priceDiff / p1.price) * 100 : 0;
          const isGain = priceDiff >= 0;

          ctx.fillStyle = isGain ? 'rgba(8, 153, 129, 0.16)' : 'rgba(242, 54, 69, 0.16)';
          ctx.fillRect(rx, ry, rw, rh);

          ctx.strokeStyle = isGain ? '#089981' : '#f23645';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(rx, ry, rw, rh);

          ctx.beginPath();
          ctx.moveTo(x2, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          const labelText = `${isGain ? '+' : ''}${percentDiff.toFixed(2)}% (${isGain ? '+' : ''}${formatPrice(priceDiff)})`;
          const badgeWidth = Math.max(130, ctx.measureText(labelText).width + 24);
          const badgeHeight = 22;
          const badgeX = Math.max(10, Math.min(chartWidth - badgeWidth - 10, rx + rw / 2 - badgeWidth / 2));
          const badgeY = Math.max(25, ry + rh / 2 - badgeHeight / 2);

          ctx.fillStyle = isGain ? '#089981' : '#f23645';
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(labelText, badgeX + badgeWidth / 2, badgeY + 14.5);
        }
      }
    });

    // In-progress drawing preview
    if (drawingPoints.length > 0 && crosshairPos) {
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 1.5;
      const p1 = drawingPoints[0];
      const x1 = timeToX(p1.time);
      const y1 = priceToY(p1.price);
      const x2 = crosshairPos.x;
      const y2 = crosshairPos.y;

      if (activeDrawingTool === 'trendline') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (activeDrawingTool === 'rectangle') {
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);
        ctx.fillStyle = 'rgba(41, 98, 255, 0.15)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (activeDrawingTool === 'price_range') {
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);
        const p2Price = yToPrice(y2);
        const diff = p2Price - p1.price;
        const pct = p1.price !== 0 ? (diff / p1.price) * 100 : 0;
        const gain = diff >= 0;

        ctx.fillStyle = gain ? 'rgba(8, 153, 129, 0.16)' : 'rgba(242, 54, 69, 0.16)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = gain ? '#089981' : '#f23645';
        ctx.strokeRect(rx, ry, rw, rh);
      }
    }

    // 5. Render Active Alert Price Lines on Chart
    alerts.forEach((alert) => {
      if (alert.symbol === symbol) {
        const alertY = priceToY(alert.targetPrice);
        if (alertY >= 0 && alertY <= chartHeight) {
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = alert.triggered ? '#f23645' : '#ff9800';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, alertY);
          ctx.lineTo(chartWidth, alertY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = alert.triggered ? '#f23645' : '#ff9800';
          ctx.fillRect(chartWidth, alertY - 9, priceScaleWidth, 18);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`🔔${formatPrice(alert.targetPrice)}`, chartWidth + 3, alertY + 3.5);
        }
      }
    });

    // 6. Current Active Price Line + COUNTDOWN UNDER PRICE LINE
    if (N > 0) {
      const lastCandle = displayCandles[N - 1];
      let currentPriceVal = lastCandle.close;
      if (priceType === 'MARK' && markPrice) currentPriceVal = markPrice;
      if (priceType === 'INDEX' && indexPrice) currentPriceVal = indexPrice;

      const currentY = priceToY(currentPriceVal);
      const isBull = currentPriceVal >= lastCandle.open;
      const priceColor = isBull ? '#089981' : '#f23645';

      // Horizontal dashed price line across entire chart
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = priceColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, currentY);
      ctx.lineTo(chartWidth, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pulsing bead at current candle
      const lastCandleX = indexToX(N - 1);
      if (lastCandleX >= 0 && lastCandleX <= chartWidth) {
        ctx.fillStyle = priceColor;
        ctx.beginPath();
        ctx.arc(lastCandleX, currentY, 4, 0, Math.PI * 2);
        ctx.fill();

        // 1. BAR COUNT DOWN DIRECTLY UNDER PRICE LINE ON THE CHART
        ctx.fillStyle = '#1e222d';
        ctx.beginPath();
        ctx.roundRect(lastCandleX - 25, currentY + 6, 50, 16, 3);
        ctx.fill();
        ctx.strokeStyle = '#2a2e39';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#d1d4dc';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(countdownText, lastCandleX, currentY + 18);
      }

      // Right Axis Price Tag
      ctx.fillStyle = priceColor;
      ctx.fillRect(chartWidth, currentY - 10, priceScaleWidth, 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10.5px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(currentPriceVal), chartWidth + 5, currentY + 3.5);

      // 1. BAR COUNT DOWN UNDER PRICE TAG ON SCALE
      ctx.fillStyle = '#181b24';
      ctx.fillRect(chartWidth, currentY + 11, priceScaleWidth, 16);
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 9.5px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`⏳ ${countdownText}`, chartWidth + 5, currentY + 23);
    }

    // 7. Right Price Scale Background & Ticks
    ctx.fillStyle = '#131722';
    ctx.fillRect(chartWidth, 0, priceScaleWidth, chartHeight);
    ctx.strokeStyle = '#2a2e39';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartWidth + 0.5, 0);
    ctx.lineTo(chartWidth + 0.5, chartHeight);
    ctx.stroke();

    ctx.fillStyle = '#787b86';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';

    priceTicks.forEach((p) => {
      const y = priceToY(p);
      if (y >= 10 && y <= chartHeight - 10) {
        ctx.beginPath();
        ctx.moveTo(chartWidth, Math.round(y) + 0.5);
        ctx.lineTo(chartWidth + 4, Math.round(y) + 0.5);
        ctx.stroke();
        ctx.fillText(formatPrice(p), chartWidth + 7, y + 3.5);
      }
    });

    // 8. Bottom Time Scale Background & Labels
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, chartHeight, dimensions.width, timeScaleHeight);
    ctx.strokeStyle = '#2a2e39';
    ctx.beginPath();
    ctx.moveTo(0, chartHeight + 0.5);
    ctx.lineTo(dimensions.width, chartHeight + 0.5);
    ctx.stroke();

    ctx.fillStyle = '#787b86';
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';

    for (let i = firstGridIdx; i <= lastGridIdx; i++) {
      if (i % candleStep === 0) {
        const x = indexToX(i);
        if (x >= 20 && x <= chartWidth - 20) {
          const t = xToTime(x);
          ctx.beginPath();
          ctx.moveTo(Math.round(x) + 0.5, chartHeight);
          ctx.lineTo(Math.round(x) + 0.5, chartHeight + 4);
          ctx.stroke();
          ctx.fillText(formatTime(t, timeframe), x, chartHeight + 17);
        }
      }
    }

    // 9. Crosshair & Value Callouts + Steady Plus Button
    if (crosshairPos && crosshairPos.x >= 0 && crosshairPos.x <= chartWidth + priceScaleWidth && crosshairPos.y >= 0 && crosshairPos.y <= chartHeight) {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#4a5061';
      ctx.lineWidth = 1;

      // Vertical crosshair
      if (crosshairPos.x <= chartWidth) {
        ctx.beginPath();
        ctx.moveTo(crosshairPos.x, 0);
        ctx.lineTo(crosshairPos.x, chartHeight);
        ctx.stroke();
      }

      // Horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(0, crosshairPos.y);
      ctx.lineTo(chartWidth, crosshairPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price Tag on scale
      const hoverPrice = yToPrice(crosshairPos.y);
      ctx.fillStyle = '#2a2e39';
      ctx.fillRect(chartWidth, crosshairPos.y - 9, priceScaleWidth, 18);
      ctx.fillStyle = '#f0f3fa';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(hoverPrice), chartWidth + 5, crosshairPos.y + 3.5);

      // Time Tag on bottom scale
      if (crosshairPos.x <= chartWidth) {
        const hoverTime = xToTime(crosshairPos.x);
        const timeStr = formatTime(hoverTime, timeframe);
        ctx.fillStyle = '#2a2e39';
        ctx.fillRect(crosshairPos.x - 30, chartHeight, 60, 20);
        ctx.fillStyle = '#f0f3fa';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, crosshairPos.x, chartHeight + 14);
      }
    }
  }, [
    dimensions,
    displayCandles,
    N,
    minVisibleI,
    maxVisibleI,
    displayMinPrice,
    displayMaxPrice,
    displayPriceRange,
    chartWidth,
    chartHeight,
    candleWidth,
    timeframe,
    priceType,
    markPrice,
    indexPrice,
    drawings,
    selectedDrawingId,
    drawingPoints,
    activeDrawingTool,
    crosshairPos,
    countdownText,
    logScale,
    alerts,
    symbol,
    rightMarginBars,
    priceToY,
    yToPrice,
    indexToX,
    xToIndex,
    timeToX,
    xToTime,
  ]);

  // Handle Mouse / Touch down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;


    // Check if clicked on the price scale area (right side)
    if (x >= chartWidth) {
      // Check if clicked an existing alert line to drag or edit
      for (const alert of alerts) {
        if (alert.symbol === symbol) {
          const alertY = priceToY(alert.targetPrice);
          if (Math.abs(y - alertY) < 12) {
            setDraggingAlertId(alert.id);
            return;
          }
        }
      }

      // If clicked on empty space on the price scale with double tap or single click, create alert!
      setIsPriceScaleDragging(true);
      setDragStartY(y);
      return;
    }

    // Check if clicked in time scale area (bottom side)
    if (y > chartHeight) {
      setIsTimeScaleDragging(true);
      setDragStartX(x);
      return;
    }

    // Check if Bar Replay is active and user is clicking to select cut point
    if (isReplayActive && onSetReplayCutIndex) {
      const idx = xToIndex(x);
      if (idx >= 0 && idx < candles.length) {
        onSetReplayCutIndex(idx);
        return;
      }
    }

    // Check if active drawing tool is enabled
    if (activeDrawingTool) {
      const clickedTime = xToTime(x);
      const clickedPrice = yToPrice(y);

      if (activeDrawingTool === 'horizontal_line') {
        const newDrawing: Drawing = {
          id: `h_${Date.now()}`,
          type: 'horizontal_line',
          points: [{ time: clickedTime, price: clickedPrice }],
          color: '#2962ff',
          lineWidth: 1.5,
          isLocked: false,
        };
        onUpdateDrawing(newDrawing);
        onSelectDrawing(newDrawing.id);
        onDrawingComplete();
        setDrawingPoints([]);
        return;
      }

      if (activeDrawingTool === 'trendline' || activeDrawingTool === 'rectangle' || activeDrawingTool === 'price_range') {
        if (drawingPoints.length === 0) {
          setDrawingPoints([{ time: clickedTime, price: clickedPrice }]);
        } else {
          const newDrawing: Drawing = {
            id: `${activeDrawingTool}_${Date.now()}`,
            type: activeDrawingTool,
            points: [drawingPoints[0], { time: clickedTime, price: clickedPrice }],
            color: activeDrawingTool === 'price_range' ? '#089981' : '#2962ff',
            lineWidth: 1.5,
            isLocked: false,
          };
          onUpdateDrawing(newDrawing);
          onSelectDrawing(newDrawing.id);
          onDrawingComplete();
          setDrawingPoints([]);
        }
        return;
      }
    }

    // Check if user clicked an existing drawing to select or drag
    let hitDrawing: Drawing | null = null;
    let hitHandleIndex: number = -1;

    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];
      if (d.type === 'horizontal_line') {
        const lineY = priceToY(d.points[0].price);
        if (Math.abs(y - lineY) < 8) {
          hitDrawing = d;
          break;
        }
      } else if (d.type === 'trendline' && d.points.length >= 2) {
        const x1 = timeToX(d.points[0].time);
        const y1 = priceToY(d.points[0].price);
        const x2 = timeToX(d.points[1].time);
        const y2 = priceToY(d.points[1].price);

        if (Math.hypot(x - x1, y - y1) < 10) {
          hitDrawing = d;
          hitHandleIndex = 0;
          break;
        }
        if (Math.hypot(x - x2, y - y2) < 10) {
          hitDrawing = d;
          hitHandleIndex = 1;
          break;
        }
        const dist = distanceToLineSegment(x, y, x1, y1, x2, y2);
        if (dist < 8) {
          hitDrawing = d;
          break;
        }
      } else if ((d.type === 'rectangle' || d.type === 'price_range') && d.points.length >= 2) {
        const x1 = timeToX(d.points[0].time);
        const y1 = priceToY(d.points[0].price);
        const x2 = timeToX(d.points[1].time);
        const y2 = priceToY(d.points[1].price);
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);

        if (x >= rx - 6 && x <= rx + rw + 6 && y >= ry - 6 && y <= ry + rh + 6) {
          hitDrawing = d;
          if (Math.hypot(x - x1, y - y1) < 10) hitHandleIndex = 0;
          else if (Math.hypot(x - x2, y - y2) < 10) hitHandleIndex = 1;
          break;
        }
      }
    }

    if (hitDrawing) {
      onSelectDrawing(hitDrawing.id);
      if (!hitDrawing.isLocked) {
        if (hitHandleIndex >= 0) {
          setDraggingHandle({ drawingId: hitDrawing.id, pointIndex: hitHandleIndex });
        } else {
          setDraggingWholeDrawing({
            drawingId: hitDrawing.id,
            startX: x,
            startY: y,
            origPoints: [...hitDrawing.points],
          });
        }
      }
      return;
    } else {
      onSelectDrawing(null);
    }

    // Default chart panning
    setIsDragging(true);
    setDragStartX(x);
    setDragStartY(y);
  };

  function distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  // Handle Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCrosshairPos({ x, y });

    // Dragging Alert Price line directly
    if (draggingAlertId) {
      const newPrice = yToPrice(y);
      onUpdateAlertPrice(draggingAlertId, newPrice);
      return;
    }

    // Dragging Price Scale (vertical stretch)
    if (isPriceScaleDragging) {
      const deltaY = y - dragStartY;
      setPriceScaleMultiplier((prev) => Math.max(0.1, Math.min(10, prev * (1 - deltaY * 0.01))));
      setDragStartY(y);
      return;
    }

    // Dragging Time Scale (horizontal stretch)
    if (isTimeScaleDragging) {
      const deltaX = x - dragStartX;
      setCandleWidth((prev) => Math.max(3, Math.min(50, prev + deltaX * 0.1)));
      setDragStartX(x);
      return;
    }

    // Dragging individual drawing handle
    if (draggingHandle) {
      const drawing = drawings.find((d) => d.id === draggingHandle.drawingId);
      if (drawing && !drawing.isLocked) {
        const newPoints = [...drawing.points];
        newPoints[draggingHandle.pointIndex] = {
          time: xToTime(x),
          price: yToPrice(y),
        };
        onUpdateDrawing({ ...drawing, points: newPoints });
      }
      return;
    }

    // Dragging whole drawing
    if (draggingWholeDrawing) {
      const drawing = drawings.find((d) => d.id === draggingWholeDrawing.drawingId);
      if (drawing && !drawing.isLocked) {
        const deltaPrice = yToPrice(y) - yToPrice(draggingWholeDrawing.startY);
        const deltaTime = xToTime(x) - xToTime(draggingWholeDrawing.startX);

        const newPoints = draggingWholeDrawing.origPoints.map((pt) => ({
          time: pt.time + deltaTime,
          price: pt.price + deltaPrice,
        }));
        onUpdateDrawing({ ...drawing, points: newPoints });
      }
      return;
    }

    // Chart Pan (smooth, reliable pan that never hides the live candle!)
    if (isDragging) {
      const deltaX = x - dragStartX;
      const deltaY = y - dragStartY;

      setPanX((prev) => prev + deltaX);

      const priceDelta = (deltaY / chartHeight) * displayPriceRange;
      setPricePanOffset((prev) => prev + priceDelta);

      setDragStartX(x);
      setDragStartY(y);
    }
  };

  // Handle Pointer Up / Leave
  const handlePointerUp = () => {
    setIsDragging(false);
    setIsPriceScaleDragging(false);
    setIsTimeScaleDragging(false);
    setDraggingAlertId(null);
    setDraggingHandle(null);
    setDraggingWholeDrawing(null);
  };

  const handlePointerLeave = () => {
    handlePointerUp();
    // Keep crosshairPos active or subtle so Plus button never vanishes abruptly
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setCandleWidth((prev) => Math.max(2.5, Math.min(60, prev * zoomFactor)));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchDistanceRef.current;
      setCandleWidth((prev) => Math.max(2.5, Math.min(60, prev * ratio)));
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  // Current Hover Candle info for HUD
  let hudCandle: Candle | null = null;
  if (crosshairPos && crosshairPos.x >= 0 && crosshairPos.x <= chartWidth) {
    const idx = xToIndex(crosshairPos.x);
    if (idx >= 0 && idx < N) {
      hudCandle = displayCandles[idx];
    }
  }
  if (!hudCandle && N > 0) {
    hudCandle = displayCandles[N - 1];
  }

  const hudChangePercent = hudCandle
    ? ((hudCandle.close - hudCandle.open) / hudCandle.open) * 100
    : 0;
  const isHudBull = hudChangePercent >= 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-[#131722]"
    >
      {/* Top Left Candlestick HUD (O H L C V) */}
      <div className="absolute top-2 left-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pointer-events-none font-mono-numbers">
        <span className="font-semibold text-white tracking-wide">{symbol} · {timeframe} · {priceType}</span>
        {hudCandle && (
          <div className="flex items-center gap-2 text-[11px] text-[#787b86]">
            <span>O <strong className={isHudBull ? 'text-[#089981]' : 'text-[#f23645]'}>{formatPrice(hudCandle.open)}</strong></span>
            <span>H <strong className={isHudBull ? 'text-[#089981]' : 'text-[#f23645]'}>{formatPrice(hudCandle.high)}</strong></span>
            <span>L <strong className={isHudBull ? 'text-[#089981]' : 'text-[#f23645]'}>{formatPrice(hudCandle.low)}</strong></span>
            <span>C <strong className={isHudBull ? 'text-[#089981]' : 'text-[#f23645]'}>{formatPrice(hudCandle.close)}</strong></span>
            <span className={isHudBull ? 'text-[#089981]' : 'text-[#f23645]'}>
              {isHudBull ? '+' : ''}{hudChangePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Floating Action Controls on Chart */}
      <div className="absolute bottom-9 right-20 z-10 flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
        {/* If live candle is panned off-screen, show jump to live button */}
        {isLiveCandleOffscreen && (
          <button
            onClick={() => setPanX(0)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#2962ff] text-white rounded-md shadow-lg transition-transform hover:scale-105 cursor-pointer animate-pulse"
            title="Jump back to live candle"
          >
            <span>Live Candle</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {/* Fixed Alert Plus Button at Bottom */}
        <button
          onClick={() => {
            if (N > 0) {
              const currentPrice = displayCandles[N - 1].close;
              onAddAlertAtPrice(currentPrice);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#ff9800] hover:bg-[#ffa726] active:scale-95 text-black rounded-lg shadow-lg border border-[#ff9800]/70 transition-all cursor-pointer"
          title="Fixed Plus Button: Add editable price alert line (+)"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Alert</span>
        </button>

        {/* Auto Fit Scale Button */}
        <button
          onClick={handleAutoFit}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white rounded border border-[#2a2e39] shadow transition-colors cursor-pointer"
          title="Reset chart scale and view"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Auto Fit</span>
        </button>
      </div>

      {/* Main HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        className="block cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
};
