import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  ColorType,
  Time
} from 'lightweight-charts';
import { MarketSymbol, MarketTicker } from '../types/trading';
import {
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  BarChart2
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  symbol: MarketSymbol;
  onSymbolChange: (sym: MarketSymbol) => void;
  tickers: MarketTicker[];
  fullHeightOnMobile?: boolean;
}

// Generate realistic historical candle data
function generateCandleData(symbol: MarketSymbol, count = 120): {
  candles: CandlestickData<Time>[];
  volumes: HistogramData<Time>[];
  emaFast: LineData<Time>[];
  emaSlow: LineData<Time>[];
} {
  const candles: CandlestickData<Time>[] = [];
  const volumes: HistogramData<Time>[] = [];
  const emaFast: LineData<Time>[] = [];
  const emaSlow: LineData<Time>[] = [];

  let basePrice = 20800;
  let volatility = 15;

  if (symbol === 'XAUUSD') {
    basePrice = 2670;
    volatility = 3.5;
  } else if (symbol === 'EURUSD') {
    basePrice = 1.0830;
    volatility = 0.0008;
  } else if (symbol === 'BTCUSD') {
    basePrice = 66500;
    volatility = 120;
  } else if (symbol === 'WTI') {
    basePrice = 71.2;
    volatility = 0.3;
  } else if (symbol === 'GBPUSD') {
    basePrice = 1.3000;
    volatility = 0.0010;
  }

  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = 300; // 5 min
  let currentClose = basePrice;
  let fastEmaVal = basePrice;
  let slowEmaVal = basePrice;

  for (let i = count; i >= 0; i--) {
    const time = (now - i * intervalSeconds) as Time;
    const direction = Math.random() > 0.46 ? 1 : -1;
    const delta = (Math.random() * volatility * direction);
    const open = currentClose;
    const close = Math.max(0.01, +(open + delta).toFixed(symbol === 'EURUSD' || symbol === 'GBPUSD' ? 5 : 2));
    const high = Math.max(open, close) + +(Math.random() * volatility * 0.7).toFixed(symbol === 'EURUSD' || symbol === 'GBPUSD' ? 5 : 2);
    const low = Math.min(open, close) - +(Math.random() * volatility * 0.7).toFixed(symbol === 'EURUSD' || symbol === 'GBPUSD' ? 5 : 2);

    currentClose = close;
    fastEmaVal = +(fastEmaVal * 0.85 + close * 0.15).toFixed(symbol === 'EURUSD' || symbol === 'GBPUSD' ? 5 : 2);
    slowEmaVal = +(slowEmaVal * 0.94 + close * 0.06).toFixed(symbol === 'EURUSD' || symbol === 'GBPUSD' ? 5 : 2);

    candles.push({ time, open, high, low, close });
    volumes.push({
      time,
      value: Math.floor(Math.random() * 850 + 150),
      color: close >= open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'
    });
    emaFast.push({ time, value: fastEmaVal });
    emaSlow.push({ time, value: slowEmaVal });
  }

  return { candles, volumes, emaFast, emaSlow };
}

export const TradingViewChart: React.FC<Props> = ({
  symbol,
  onSymbolChange,
  tickers,
  fullHeightOnMobile = true
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const emaFastSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSlowSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | 'D'>('5m');
  const [showIndicators, setShowIndicators] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastTickPrice, setLastTickPrice] = useState<number | null>(null);

  const currentTicker = tickers.find((t) => t.symbol === symbol) || tickers[0];

  const getChartHeight = () => {
    if (isFullscreen) return window.innerHeight - 180;
    if (typeof window !== 'undefined' && window.innerWidth < 768 && fullHeightOnMobile) {
      return Math.max(380, window.innerHeight - 250);
    }
    return 440;
  };

  // Touch Swipe Gesture for switching active assets (US100 / XAUUSD / EURUSD)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartXRef.current;
    const dy = touchEndY - touchStartYRef.current;

    // Detect horizontal swipe (dx > 50px, dy < 60px)
    if (Math.abs(dx) > 45 && Math.abs(dy) < 65) {
      const symbols: MarketSymbol[] = ['US100', 'XAUUSD', 'EURUSD', 'BTCUSD'];
      const currentIndex = symbols.indexOf(symbol);
      if (currentIndex !== -1) {
        if (dx < 0) {
          // Swipe Left -> Next asset
          const nextIndex = (currentIndex + 1) % symbols.length;
          soundManager.playClick();
          onSymbolChange(symbols[nextIndex]);
        } else {
          // Swipe Right -> Previous asset
          const prevIndex = (currentIndex - 1 + symbols.length) % symbols.length;
          soundManager.playClick();
          onSymbolChange(symbols[prevIndex]);
        }
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Initialize and redraw chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear previous chart if any
    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b0f17' },
        textColor: '#94a3b8'
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.25)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.25)' }
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#38bdf8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0284c7'
        },
        horzLine: {
          color: '#38bdf8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0284c7'
        }
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor: '#334155',
        autoScale: true
      },
      width: chartContainerRef.current.clientWidth,
      height: getChartHeight()
    });

    chartRef.current = chart;

    // Candlestick series with institutional green & red styling
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: true,
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    });
    candleSeriesRef.current = candleSeries;

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume'
      },
      priceScaleId: '' // overlay mode
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0
      }
    });
    volumeSeriesRef.current = volumeSeries;

    // MBK Proprietary EMA fast (cyan) & slow (purple-gold)
    const emaFastSeries = chart.addSeries(LineSeries, {
      color: '#06b6d4',
      lineWidth: 2,
      title: 'MBK Fast 9'
    });
    emaFastSeriesRef.current = emaFastSeries;

    const emaSlowSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      title: 'MBK Trend 21'
    });
    emaSlowSeriesRef.current = emaSlowSeries;

    // Generate and set data
    const data = generateCandleData(symbol, 90);
    candleSeries.setData(data.candles);
    volumeSeries.setData(data.volumes);
    emaFastSeries.setData(data.emaFast);
    emaSlowSeries.setData(data.emaSlow);

    // Initial price
    if (data.candles.length > 0) {
      setLastTickPrice(data.candles[data.candles.length - 1].close);
    }

    // Set markers for MBK Algorithm signals using v5 createSeriesMarkers
    const markers = [
      {
        time: data.candles[data.candles.length - 28].time,
        position: 'belowBar' as const,
        color: '#10b981',
        shape: 'arrowUp' as const,
        text: 'MBK BUY #1'
      },
      {
        time: data.candles[data.candles.length - 14].time,
        position: 'aboveBar' as const,
        color: '#ef4444',
        shape: 'arrowDown' as const,
        text: 'MBK TP HIT'
      },
      {
        time: data.candles[data.candles.length - 3].time,
        position: 'belowBar' as const,
        color: '#06b6d4',
        shape: 'arrowUp' as const,
        text: 'ACTIVE BUY'
      }
    ];
    createSeriesMarkers(candleSeries, markers);

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: getChartHeight()
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, timeframe, isFullscreen, fullHeightOnMobile]);

  // Live price tick simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (!candleSeriesRef.current) return;

      const delta = (Math.random() - 0.48) * (symbol === 'EURUSD' ? 0.0003 : symbol === 'XAUUSD' ? 0.45 : 3.5);
      setLastTickPrice((prev) => {
        if (!prev) return currentTicker.price;
        const newPrice = +(prev + delta).toFixed(currentTicker.digits);
        return newPrice;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [symbol, currentTicker]);

  // Toggle indicators visibility
  useEffect(() => {
    if (emaFastSeriesRef.current && emaSlowSeriesRef.current) {
      emaFastSeriesRef.current.applyOptions({ visible: showIndicators });
      emaSlowSeriesRef.current.applyOptions({ visible: showIndicators });
    }
  }, [showIndicators]);

  // Toggle volume visibility
  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: showVolume });
    }
  }, [showVolume]);

  const symbolsList: MarketSymbol[] = ['US100', 'XAUUSD', 'EURUSD', 'BTCUSD', 'WTI'];
  const timeframesList: Array<'1m' | '5m' | '15m' | '1h' | '4h' | 'D'> = ['1m', '5m', '15m', '1h', '4h', 'D'];

  return (
    <div className={`flex flex-col bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl ${isFullscreen ? 'fixed inset-4 z-50 bg-[#0b0f17] border-cyan-500/50' : ''}`}>
      {/* Chart Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0f172a] border-b border-slate-800/80">
        {/* Symbol Selection Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {symbolsList.map((sym) => {
            const symTicker = tickers.find((t) => t.symbol === sym);
            const isSelected = sym === symbol;
            return (
              <button
                key={sym}
                onClick={() => onSymbolChange(sym)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                }`}
              >
                <span>{sym}</span>
                {symTicker && (
                  <span
                    className={`tabular-nums text-[11px] font-mono ${
                      symTicker.isUp ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {symTicker.price.toLocaleString(undefined, { minimumFractionDigits: symTicker.digits })}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Timeframe & Display Toggles */}
        <div className="flex items-center gap-2">
          {/* Timeframes */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
            {timeframesList.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator toggles */}
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            title="تفعيل/تعطيل مؤشرات MBK الخوارزمية"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-all ${
              showIndicators
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">مؤشرات MBK</span>
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            title="إظهار/إخفاء الفوليوم"
            className={`p-1.5 rounded-lg border transition-colors ${
              showVolume
                ? 'bg-slate-800 border-slate-700 text-cyan-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
            title={isFullscreen ? 'تصغير' : 'تكبير الشاشة'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Symbol Live Info Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#0b0f17]/95 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 text-sm">{currentTicker.nameAr}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
              {symbol}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400 text-[11px]">السعر الحالي:</span>
            <span
              className={`text-sm font-bold tabular-nums ${
                currentTicker.isUp ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(lastTickPrice ?? currentTicker.price).toLocaleString(undefined, {
                minimumFractionDigits: currentTicker.digits
              })}
            </span>
            <span
              className={`flex items-center text-[11px] font-bold px-1.5 py-0.2 rounded ${
                currentTicker.isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {currentTicker.isUp ? <TrendingUp className="w-3 h-3 ml-0.5 inline" /> : <TrendingDown className="w-3 h-3 ml-0.5 inline" />}
              {currentTicker.changePercent > 0 ? '+' : ''}
              {currentTicker.changePercent}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <div>
            <span>أعلى: </span>
            <span className="text-slate-200">{currentTicker.high.toLocaleString()}</span>
          </div>
          <div>
            <span>أدنى: </span>
            <span className="text-slate-200">{currentTicker.low.toLocaleString()}</span>
          </div>
          <div className="hidden sm:block">
            <span>السبريد: </span>
            <span className="text-cyan-400">{currentTicker.spread} pip</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>بث حي مباشر</span>
          </div>
        </div>
      </div>

      {/* Mobile Swipe Gesture Helper Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-1.5 bg-[#080d16] border-b border-slate-800 text-[10px] text-slate-400 select-none">
        <span className="flex items-center gap-1 text-cyan-400 font-bold">
          <span>👈 اسحب أفقياً للتبديل السريع بين الشارتات (US100 / XAUUSD / EURUSD) 👉</span>
        </span>
        <span className="text-emerald-400 font-mono font-bold shrink-0">نشط</span>
      </div>

      {/* Lightweight Charts Canvas */}
      <div
        ref={chartContainerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-full relative ${
          fullHeightOnMobile
            ? 'h-[calc(100vh-250px)] min-h-[380px] md:h-[480px]'
            : 'min-h-[380px] h-[55vh] sm:h-[480px]'
        } bg-[#0b0f17] touch-pan-y`}
      />

      {/* Watermark Footer Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0b0f17] border-t border-slate-800/60 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">MBK Institutional Engine:</span>
          <span className="text-cyan-400">TradingView Lightweight Core v4.2</span>
          <span>•</span>
          <span className="text-amber-400">إشارات مشفرة من كود Pine Script</span>
        </div>
        <div className="flex items-center gap-3">
          <span>خادم التسعير: London Equinix LD4 (0.8ms)</span>
          <span className="text-slate-400 font-mono">UTC+3 (توقيت مكة)</span>
        </div>
      </div>
    </div>
  );
};
