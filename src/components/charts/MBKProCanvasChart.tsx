import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { init, dispose, type Chart, type KLineData, type Period, type DeepPartial, type Styles } from 'klinecharts';
import {
  TrendingUp,
  ArrowUpRight,
  Minus,
  DollarSign,
  Columns,
  Percent,
  Type,
  Trash2,
  Radio,
  Pin,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Maximize2,
  Minimize2,
  Sparkles,
  CheckCircle2,
  X,
  Bot,
  AlertTriangle
} from 'lucide-react';
import {
  loadUserDrawings,
  saveUserDrawings,
  subscribeAdminChartSetup,
  publishAdminChartSetup,
  clearAdminChartSetup,
  normalizeChartSymbol,
  type SerializedOverlay,
  type AdminChartSetupDoc,
  type ActiveChartSetupSignal
} from '../../services/chartBroadcastService';
import { parsePlainTextSignal } from '../../utils/signalChartParser';
import { useSignalsContext } from '../../context/SignalsContext';
import { auth } from '../../lib/firebase';
import { triggerServerWebPush } from '../../utils/mobileNotifications';

export interface MBKProCanvasChartProps {
  lang: 'ar' | 'en';
  activeSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
  isAdmin?: boolean;
  isAnalyser?: boolean;
  isVip?: boolean;
  onOpenPlans?: () => void;
}

type ProSymbol = 'XAUUSD' | 'US100' | 'BTCUSD' | 'EURUSD' | 'GBPUSD' | 'WTI';
type ProInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
type IndicatorKey = 'MA' | 'EMA' | 'BOLL' | 'RSI' | 'VOL';

const SYMBOLS: { id: ProSymbol; labelAr: string; labelEn: string; precision: number }[] = [
  { id: 'XAUUSD', labelAr: 'الذهب XAUUSD', labelEn: 'Gold XAUUSD', precision: 2 },
  { id: 'US100', labelAr: 'ناسداك US100', labelEn: 'Nasdaq US100', precision: 2 },
  { id: 'BTCUSD', labelAr: 'بيتكوين BTCUSD', labelEn: 'Bitcoin BTCUSD', precision: 2 },
  { id: 'EURUSD', labelAr: 'يورو EURUSD', labelEn: 'EUR/USD', precision: 5 },
  { id: 'GBPUSD', labelAr: 'باوند GBPUSD', labelEn: 'GBP/USD', precision: 5 },
  { id: 'WTI', labelAr: 'النفط WTI', labelEn: 'Crude Oil WTI', precision: 2 },
];

const INTERVALS: { id: ProInterval; labelAr: string; labelEn: string; period: Period }[] = [
  { id: '1m', labelAr: '1د', labelEn: '1m', period: { type: 'minute', span: 1 } },
  { id: '5m', labelAr: '5د', labelEn: '5m', period: { type: 'minute', span: 5 } },
  { id: '15m', labelAr: '15د', labelEn: '15m', period: { type: 'minute', span: 15 } },
  { id: '1h', labelAr: '1س', labelEn: '1h', period: { type: 'hour', span: 1 } },
  { id: '4h', labelAr: '4س', labelEn: '4h', period: { type: 'hour', span: 4 } },
  { id: '1d', labelAr: '1ي', labelEn: '1D', period: { type: 'day', span: 1 } },
];

const INDICATORS: { id: IndicatorKey; isMainPane: boolean }[] = [
  { id: 'MA', isMainPane: true },
  { id: 'EMA', isMainPane: true },
  { id: 'BOLL', isMainPane: true },
  { id: 'RSI', isMainPane: false },
  { id: 'VOL', isMainPane: false },
];

const DRAWING_TOOLS: {
  id: string;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'segment', labelAr: 'خط اتجاه', labelEn: 'Trendline', icon: TrendingUp },
  { id: 'rayLine', labelAr: 'شعاع', labelEn: 'Ray', icon: ArrowUpRight },
  { id: 'horizontalStraightLine', labelAr: 'خط أفقي', labelEn: 'Horizontal Line', icon: Minus },
  { id: 'priceLine', labelAr: 'خط سعر', labelEn: 'Price Line', icon: DollarSign },
  { id: 'priceChannelLine', labelAr: 'قناة سعرية', labelEn: 'Channel', icon: Columns },
  { id: 'fibonacciLine', labelAr: 'فيبوناتشي', labelEn: 'Fibonacci', icon: Percent },
  { id: 'simpleAnnotation', labelAr: 'ملاحظة نصية', labelEn: 'Text Tag', icon: Type },
];

const OBSIDIAN_CHART_STYLES: DeepPartial<Styles> = {
  grid: {
    show: true,
    horizontal: {
      show: true,
      size: 1,
      color: '#1e2536',
      style: 'dashed',
      dashedValue: [3, 3],
    },
    vertical: {
      show: true,
      size: 1,
      color: '#1e2536',
      style: 'dashed',
      dashedValue: [3, 3],
    },
  },
  candle: {
    type: 'candle_solid',
    bar: {
      compareRule: 'current_open',
      upColor: '#10b981',
      downColor: '#ef4444',
      noChangeColor: '#64748b',
      upBorderColor: '#10b981',
      downBorderColor: '#ef4444',
      noChangeBorderColor: '#64748b',
      upWickColor: '#10b981',
      downWickColor: '#ef4444',
      noChangeWickColor: '#64748b',
    },
    priceMark: {
      show: true,
      high: {
        show: true,
        color: '#94a3b8',
        textSize: 10,
      },
      low: {
        show: true,
        color: '#94a3b8',
        textSize: 10,
      },
      last: {
        show: true,
        upColor: '#10b981',
        downColor: '#ef4444',
        noChangeColor: '#64748b',
        line: {
          show: true,
          style: 'dashed',
          dashedValue: [4, 4],
          size: 1,
        },
        text: {
          show: true,
          style: 'fill',
          size: 11,
          paddingLeft: 6,
          paddingTop: 3,
          paddingRight: 6,
          paddingBottom: 3,
          color: '#ffffff',
          borderRadius: 4,
        },
      },
    },
    tooltip: {
      showRule: 'always',
      showType: 'standard',
      legend: {
        size: 11,
        color: '#cbd5e1',
      },
    },
  },
  xAxis: {
    show: true,
    axisLine: {
      show: true,
      color: '#1e2536',
      size: 1,
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: '#1e2536',
    },
    tickText: {
      show: true,
      color: '#94a3b8',
      size: 11,
    },
  },
  yAxis: {
    show: true,
    axisLine: {
      show: true,
      color: '#1e2536',
      size: 1,
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: '#1e2536',
    },
    tickText: {
      show: true,
      color: '#94a3b8',
      size: 11,
    },
  },
  separator: {
    size: 1,
    color: '#1e2536',
    fill: true,
    activeBackgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: {
        show: true,
        style: 'dashed',
        dashedValue: [4, 4],
        size: 1,
        color: '#475569',
      },
      text: {
        show: true,
        style: 'fill',
        color: '#f8fafc',
        size: 11,
        backgroundColor: '#1e293b',
        borderRadius: 3,
      },
    },
    vertical: {
      show: true,
      line: {
        show: true,
        style: 'dashed',
        dashedValue: [4, 4],
        size: 1,
        color: '#475569',
      },
      text: {
        show: true,
        style: 'fill',
        color: '#f8fafc',
        size: 11,
        backgroundColor: '#1e293b',
        borderRadius: 3,
      },
    },
  },
};

export const MBKProCanvasChart: React.FC<MBKProCanvasChartProps> = ({
  lang,
  activeSymbol = 'XAUUSD',
  onSelectSymbol,
  isAdmin = false,
  isAnalyser = false,
  isVip = false,
  onOpenPlans,
}) => {
  const isAr = lang === 'ar';
  const canManageBroadcast = Boolean(isAdmin || isAnalyser);
  const canViewAdminLayer = Boolean(isVip || isAdmin || isAnalyser);
  const { botAlerts, signals, addToast } = useSignalsContext();

  const normalizedInitialSymbol = useMemo<ProSymbol>(() => {
    const norm = normalizeChartSymbol(activeSymbol);
    const found = SYMBOLS.find((s) => s.id === norm);
    return found ? found.id : 'XAUUSD';
  }, [activeSymbol]);

  const [symbol, setSymbol] = useState<ProSymbol>(normalizedInitialSymbol);
  const [interval, setIntervalState] = useState<ProInterval>('5m');
  const [activeIndicators, setActiveIndicators] = useState<IndicatorKey[]>(['EMA', 'VOL']);
  const [showAdminLayer, setShowAdminLayer] = useState<boolean>(canViewAdminLayer);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [annotationPromptOpen, setAnnotationPromptOpen] = useState(false);
  const [annotationText, setAnnotationText] = useState(isAr ? 'منطقة سيولة MBK' : 'MBK Liquidity Zone');

  const [isLoadingCandles, setIsLoadingCandles] = useState(false);
  const [candleSource, setCandleSource] = useState<string>('live');
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [isFullChart, setIsFullChart] = useState(false);

  // Admin setup state from Firestore (1 doc per symbol)
  const [adminSetup, setAdminSetup] = useState<AdminChartSetupDoc | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [pinDrawerOpen, setPinDrawerOpen] = useState(false);

  // Pin Signal Form State
  const [rawAlertInput, setRawAlertInput] = useState('');
  const [pinSide, setPinSide] = useState<'BUY' | 'SELL'>('BUY');
  const [pinEntry, setPinEntry] = useState('');
  const [pinSl, setPinSl] = useState('');
  const [pinTp1, setPinTp1] = useState('');
  const [pinTp2, setPinTp2] = useState('');
  const [pinTp3, setPinTp3] = useState('');
  const [pinSweep, setPinSweep] = useState('');
  const [pinAtr, setPinAtr] = useState('');
  const [pinRr, setPinRr] = useState('');
  const [pinNoteAr, setPinNoteAr] = useState('');

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const liveBarCallbackRef = useRef<((data: KLineData) => void) | null>(null);
  const latestCandlesRef = useRef<KLineData[]>([]);
  const symbolRef = useRef<ProSymbol>(symbol);
  const intervalRef = useRef<ProInterval>(interval);

  symbolRef.current = symbol;
  intervalRef.current = interval;

  // Sync external symbol prop changes
  useEffect(() => {
    const norm = normalizeChartSymbol(activeSymbol) as ProSymbol;
    if (SYMBOLS.some((s) => s.id === norm) && norm !== symbol) {
      setSymbol(norm);
    }
  }, [activeSymbol]);

  // Keep Admin Layer enabled automatically when user upgrades to VIP/Admin
  useEffect(() => {
    if (canViewAdminLayer) {
      setShowAdminLayer(true);
    }
  }, [canViewAdminLayer]);

  const getPrecisionForSymbol = useCallback((sym: ProSymbol): number => {
    return SYMBOLS.find((s) => s.id === sym)?.precision ?? 2;
  }, []);

  /**
   * Persist current user drawings (`groupId: 'user_drawings'`) to localStorage (0 Firestore reads)
   */
  const syncUserDrawingsToLocalStorage = useCallback((targetSym?: ProSymbol) => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    const symToSave = targetSym || symbolRef.current;
    const overlays = chart.getOverlays({ groupId: 'user_drawings' }) || [];
    const serialized: SerializedOverlay[] = overlays
      .filter((o) => o && o.points && o.points.length > 0)
      .map((o) => ({
        name: o.name,
        points: o.points.map((pt) => ({
          ...(typeof pt.timestamp === 'number' ? { timestamp: pt.timestamp } : {}),
          ...(typeof pt.dataIndex === 'number' ? { dataIndex: pt.dataIndex } : {}),
          ...(typeof pt.value === 'number' ? { value: pt.value } : {}),
        })),
        ...(o.styles ? { styles: o.styles as Record<string, any> } : {}),
        ...(o.extendData !== undefined ? { extendData: o.extendData } : {}),
      }));
    saveUserDrawings(symToSave, serialized);
  }, []);

  /**
   * Restore user's personal drawings from localStorage
   */
  const restoreUserDrawingsFromLocalStorage = useCallback(
    (targetSym: ProSymbol) => {
      const chart = chartInstanceRef.current;
      if (!chart) return;
      chart.removeOverlay({ groupId: 'user_drawings' });
      const saved = loadUserDrawings(targetSym);
      for (const item of saved) {
        chart.createOverlay({
          name: item.name,
          groupId: 'user_drawings',
          points: item.points,
          ...(item.styles ? { styles: item.styles } : {}),
          ...(item.extendData !== undefined ? { extendData: item.extendData } : {}),
          onDrawEnd: () => syncUserDrawingsToLocalStorage(targetSym),
          onPressedMoveEnd: () => syncUserDrawingsToLocalStorage(targetSym),
          onRemoved: () => syncUserDrawingsToLocalStorage(targetSym),
        });
      }
    },
    [syncUserDrawingsToLocalStorage]
  );

  /**
   * Render Admin Broadcasted Drawings + Active Signal Entry/SL/TP1-3/Sweep overlays
   */
  const renderAdminBroadcastLayer = useCallback(
    (setupDoc: AdminChartSetupDoc | null, layerVisible: boolean) => {
      const chart = chartInstanceRef.current;
      if (!chart) return;

      chart.removeOverlay({ groupId: 'admin_broadcast' });
      chart.removeOverlay({ groupId: 'admin_signal_lines' });

      if (!layerVisible || !canViewAdminLayer || !setupDoc) {
        return;
      }

      // 1. Render Admin Broadcasted Drawings
      const adminOverlays = setupDoc.overlays || [];
      for (const item of adminOverlays) {
        if (!item?.name || !Array.isArray(item.points) || item.points.length === 0) continue;
        chart.createOverlay({
          name: item.name,
          groupId: 'admin_broadcast',
          lock: !canManageBroadcast,
          points: item.points,
          styles: item.styles || {
            line: { color: '#38bdf8', size: 2, style: 'solid', dashedValue: [4, 4], smooth: false },
          },
          ...(item.extendData !== undefined ? { extendData: item.extendData } : {}),
        });
      }

      // 2. Render Active Signal Price Lines (Entry, SL, TP1, TP2, TP3, Sweep)
      const sig = setupDoc.activeSetup;
      if (!sig || !Number.isFinite(sig.entry) || !Number.isFinite(sig.sl)) {
        return;
      }

      const candles = latestCandlesRef.current;
      const anchorTs =
        candles.length > 5
          ? candles[Math.max(0, candles.length - 25)].timestamp
          : Date.now() - 3600_000;

      const createSignalLevelLine = (
        price: number,
        color: string,
        labelText: string,
        dashed = false
      ) => {
        chart.createOverlay({
          name: 'priceLine',
          groupId: 'admin_signal_lines',
          lock: true,
          points: [{ timestamp: anchorTs, value: price }],
          extendData: labelText,
          styles: {
            line: {
              color,
              size: 2,
              style: dashed ? 'dashed' : 'solid',
              dashedValue: [5, 4],
              smooth: false,
            },
            text: {
              color: '#ffffff',
              backgroundColor: color,
              borderColor: color,
              size: 11,
              weight: 'bold',
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 4,
            },
          },
        });
      };

      // Entry Line (#3b82f6)
      createSignalLevelLine(
        sig.entry,
        '#3b82f6',
        `${sig.side === 'BUY' ? (isAr ? 'دخول شراء' : 'BUY ENTRY') : isAr ? 'دخول بيع' : 'SELL ENTRY'} @ ${sig.entry}`
      );

      // SL Line (#ef4444)
      createSignalLevelLine(
        sig.sl,
        '#ef4444',
        `${isAr ? 'وقف خسارة SL' : 'STOP LOSS'} @ ${sig.sl}`,
        true
      );

      // TP1, TP2, TP3 Lines (#10b981)
      if (sig.tp1 && Number.isFinite(sig.tp1)) {
        createSignalLevelLine(sig.tp1, '#10b981', `${isAr ? 'هدف 1 (TP1)' : 'TARGET 1 (TP1)'} @ ${sig.tp1}`);
      }
      if (sig.tp2 && Number.isFinite(sig.tp2)) {
        createSignalLevelLine(sig.tp2, '#10b981', `${isAr ? 'هدف 2 (TP2)' : 'TARGET 2 (TP2)'} @ ${sig.tp2}`);
      }
      if (sig.tp3 && Number.isFinite(sig.tp3)) {
        createSignalLevelLine(sig.tp3, '#10b981', `${isAr ? 'هدف 3 (TP3)' : 'TARGET 3 (TP3)'} @ ${sig.tp3}`);
      }

      // Optional Liquidity Sweep annotation (#f59e0b)
      if (sig.sweepPrice && Number.isFinite(sig.sweepPrice)) {
        chart.createOverlay({
          name: 'simpleAnnotation',
          groupId: 'admin_signal_lines',
          lock: true,
          points: [{ timestamp: anchorTs, value: sig.sweepPrice }],
          extendData: isAr ? `⚡ سحب سيولة (${sig.sweepPrice})` : `⚡ Liquidity Sweep (${sig.sweepPrice})`,
          styles: {
            line: { color: '#f59e0b', size: 1, style: 'dashed', dashedValue: [3, 3], smooth: false },
            text: {
              color: '#06080c',
              backgroundColor: '#f59e0b',
              borderColor: '#f59e0b',
              size: 11,
              weight: 'bold',
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 4,
            },
          },
        });
      }
    },
    [canManageBroadcast, canViewAdminLayer, isAr]
  );

  // Initialize klinecharts once on mount
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = init(container, {
      styles: OBSIDIAN_CHART_STYLES,
      timezone: 'UTC',
    });

    if (!chart) return;
    chartInstanceRef.current = chart;

    chart.setDataLoader({
      getBars: async ({ symbol: symInfo, period, callback }) => {
        const currentSym = (symInfo?.ticker as ProSymbol) || symbolRef.current;
        const matchedInterval =
          INTERVALS.find(
            (item) => item.period.type === period.type && item.period.span === period.span
          )?.id || intervalRef.current;

        setIsLoadingCandles(true);
        try {
          const res = await fetch(
            `/api/market/candles?symbol=${encodeURIComponent(currentSym)}&interval=${encodeURIComponent(matchedInterval)}`
          );
          const json = await res.json();
          const bars: KLineData[] = Array.isArray(json?.candles) ? json.candles : [];
          latestCandlesRef.current = bars;
          if (bars.length > 0) {
            setLastPrice(bars[bars.length - 1].close);
          }
          setCandleSource(String(json?.source || 'live'));
          callback(bars, false);

          // Restore user drawings & admin setup after bars load
          setTimeout(() => {
            restoreUserDrawingsFromLocalStorage(currentSym);
          }, 30);
        } catch {
          callback([], false);
        } finally {
          setIsLoadingCandles(false);
        }
      },
      subscribeBar: ({ callback }) => {
        liveBarCallbackRef.current = callback;
      },
      unsubscribeBar: () => {
        liveBarCallbackRef.current = null;
      },
    });

    // Initial indicators
    chart.createIndicator({ name: 'EMA', paneId: 'candle_pane' }, true);
    chart.createIndicator({ name: 'VOL' }, false);

    // Initial symbol and period trigger getBars
    const initPrecision = getPrecisionForSymbol(symbolRef.current);
    chart.setSymbol({
      ticker: symbolRef.current,
      pricePrecision: initPrecision,
      volumePrecision: 0,
    });
    const initPeriod = INTERVALS.find((i) => i.id === intervalRef.current)?.period || {
      type: 'minute',
      span: 5,
    };
    chart.setPeriod(initPeriod);

    const resizeObserver = new ResizeObserver(() => {
      chartInstanceRef.current?.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      liveBarCallbackRef.current = null;
      chartInstanceRef.current = null;
      dispose(container);
    };
  }, []);

  // Update symbol & precision when symbol state changes
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    const precision = getPrecisionForSymbol(symbol);
    chart.setSymbol({
      ticker: symbol,
      pricePrecision: precision,
      volumePrecision: 0,
    });
  }, [symbol, getPrecisionForSymbol]);

  // Update period when interval state changes
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    const found = INTERVALS.find((i) => i.id === interval);
    if (found) {
      chart.setPeriod(found.period);
    }
  }, [interval]);

  // Live 15-second edge-cached candle updater via subscribeBar callback
  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(
          `/api/market/candles?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`
        );
        if (!res.ok) return;
        const json = await res.json();
        const bars: KLineData[] = Array.isArray(json?.candles) ? json.candles : [];
        if (bars.length === 0) return;

        latestCandlesRef.current = bars;
        const latest = bars[bars.length - 1];
        setLastPrice(latest.close);

        if (liveBarCallbackRef.current) {
          if (bars.length >= 2) {
            liveBarCallbackRef.current(bars[bars.length - 2]);
          }
          liveBarCallbackRef.current(latest);
        }
      } catch {
        // Silent retry on next tick
      }
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [symbol, interval]);

  // Subscribe to Admin Chart Setup ONLY while mounted & when symbol changes
  useEffect(() => {
    const unsubscribe = subscribeAdminChartSetup(symbol, (docData) => {
      setAdminSetup(docData);
    });
    return () => unsubscribe();
  }, [symbol]);

  // Re-render Admin Broadcast layer whenever adminSetup or showAdminLayer changes
  useEffect(() => {
    renderAdminBroadcastLayer(adminSetup, showAdminLayer);
  }, [adminSetup, showAdminLayer, renderAdminBroadcastLayer, isLoadingCandles]);

  // Toggle Technical Indicators
  const handleToggleIndicator = (ind: IndicatorKey) => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    const meta = INDICATORS.find((i) => i.id === ind);
    if (!meta) return;

    if (activeIndicators.includes(ind)) {
      chart.removeIndicator({ name: ind });
      setActiveIndicators((prev) => prev.filter((item) => item !== ind));
    } else {
      if (meta.isMainPane) {
        chart.createIndicator({ name: ind, paneId: 'candle_pane' }, true);
      } else {
        chart.createIndicator({ name: ind }, false);
      }
      setActiveIndicators((prev) => [...prev, ind]);
    }
  };

  // Start a Drawing Tool (Available to every user)
  const handleSelectDrawingTool = (toolName: string) => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    if (toolName === 'simpleAnnotation') {
      setAnnotationPromptOpen(true);
      setActiveTool(toolName);
      return;
    }

    setActiveTool(toolName);
    chart.createOverlay({
      name: toolName,
      groupId: 'user_drawings',
      onDrawEnd: () => {
        setActiveTool(null);
        syncUserDrawingsToLocalStorage();
      },
      onPressedMoveEnd: () => syncUserDrawingsToLocalStorage(),
      onRemoved: () => syncUserDrawingsToLocalStorage(),
    });
  };

  const handleConfirmAnnotationTool = () => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    setAnnotationPromptOpen(false);
    chart.createOverlay({
      name: 'simpleAnnotation',
      groupId: 'user_drawings',
      extendData: annotationText.trim() || (isAr ? 'ملاحظة MBK' : 'MBK Note'),
      onDrawEnd: () => {
        setActiveTool(null);
        syncUserDrawingsToLocalStorage();
      },
      onPressedMoveEnd: () => syncUserDrawingsToLocalStorage(),
      onRemoved: () => syncUserDrawingsToLocalStorage(),
    });
  };

  const handleClearPersonalDrawings = () => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    chart.removeOverlay({ groupId: 'user_drawings' });
    saveUserDrawings(symbol, []);
    setActiveTool(null);
    addToast({
      title: isAr ? 'تم مسح رسوماتك الشخصية' : 'Personal Drawings Cleared',
      message: isAr
        ? `تم تنظيف لوحة الرسم الخاصة بك لزوج ${symbol}.`
        : `Cleared your personal canvas drawings for ${symbol}.`,
      type: 'info',
    });
  };

  // Admin: Broadcast current drawings to VIPs (1 single Firestore doc per symbol)
  const handleBroadcastAdminDrawings = async () => {
    const chart = chartInstanceRef.current;
    if (!chart || !canManageBroadcast) return;

    setIsBroadcasting(true);
    try {
      const userOverlays = chart.getOverlays({ groupId: 'user_drawings' }) || [];
      const adminOverlays = chart.getOverlays({ groupId: 'admin_broadcast' }) || [];
      const combined = [...adminOverlays, ...userOverlays].filter(
        (o) => o && Array.isArray(o.points) && o.points.length > 0
      );

      const serialized: SerializedOverlay[] = combined.map((o) => ({
        name: o.name,
        points: o.points.map((pt) => ({
          ...(typeof pt.timestamp === 'number' ? { timestamp: pt.timestamp } : {}),
          ...(typeof pt.dataIndex === 'number' ? { dataIndex: pt.dataIndex } : {}),
          ...(typeof pt.value === 'number' ? { value: pt.value } : {}),
        })),
        ...(o.styles ? { styles: o.styles as Record<string, any> } : {}),
        ...(o.extendData !== undefined ? { extendData: o.extendData } : {}),
      }));

      await publishAdminChartSetup(symbol, {
        timeframe: interval,
        overlays: serialized,
      });

      triggerServerWebPush({
        title: `📐 بث تحليل شارت VIP (${symbol} - ${interval})`,
        body: `تم تحديث الرسومات ومناطق السيولة المباشرة على ${symbol} (${serialized.length} رسمة).`,
        tag: `mbk-chart-draw-${symbol}-${Date.now()}`,
        url: '/',
        audience: 'vip',
        category: 'signal',
        excludeUid: auth.currentUser?.uid || null
      });

      addToast({
        title: isAr ? 'تم بث الرسومات للـ VIP بنجاح' : 'Drawings Broadcasted to VIPs',
        message: isAr
          ? `تم تحديث تحليل الإدارة لـ ${symbol} (${serialized.length} رسمة) لجميع مشتركي VIP.`
          : `Published ${serialized.length} drawing(s) on ${symbol} to all VIP members.`,
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        title: isAr ? 'تعذر بث الرسومات' : 'Broadcast Failed',
        message: err?.message || (isAr ? 'تحقق من صلاحيات الإدارة.' : 'Check admin permissions.'),
        type: 'info',
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Admin: Auto-parse plain text inside the Pin Signal drawer
  const handleParseRawAlertText = (textToParse: string) => {
    setRawAlertInput(textToParse);
    const parsed = parsePlainTextSignal(textToParse);
    if (!parsed) return;

    setPinSide(parsed.side);
    setPinEntry(String(parsed.entry));
    setPinSl(String(parsed.sl));
    setPinTp1(parsed.tp1 !== undefined ? String(parsed.tp1) : '');
    setPinTp2(parsed.tp2 !== undefined ? String(parsed.tp2) : '');
    setPinTp3(parsed.tp3 !== undefined ? String(parsed.tp3) : '');
    setPinSweep(parsed.sweepPrice !== undefined ? String(parsed.sweepPrice) : '');
    setPinAtr(parsed.atr !== undefined ? String(parsed.atr) : '');
    setPinRr(parsed.rrText || '');
  };

  // Admin: Pick latest signal from bot_alerts or signals feed
  const recentParsedBotAlerts = useMemo(() => {
    const list: { id: string; label: string; rawText: string }[] = [];
    for (const alert of botAlerts.slice(0, 15)) {
      const p = parsePlainTextSignal(alert.text);
      if (p) {
        list.push({
          id: alert.id,
          label: `${p.side} ${p.symbol || symbol} @ ${p.entry} (SL: ${p.sl}${p.tp1 ? ` / TP1: ${p.tp1}` : ''})`,
          rawText: alert.text,
        });
      }
    }
    for (const sig of signals.slice(0, 10)) {
      if (sig.entryPrice > 0 && sig.sl > 0) {
        const synthetic = `${sig.action} ${sig.symbol} @ ${sig.entryPrice} SL: ${sig.sl} TP1: ${sig.tp1 || ''} TP2: ${sig.tp2 || ''} ${sig.tp3 ? `TP3: ${sig.tp3}` : ''}`;
        list.push({
          id: `sig-${sig.id}`,
          label: `[Signal] ${sig.action} ${sig.symbol} @ ${sig.entryPrice} (SL: ${sig.sl})`,
          rawText: synthetic,
        });
      }
    }
    return list.slice(0, 8);
  }, [botAlerts, signals, symbol]);

  // Admin: Publish pinned signal setup to chart_setups/{symbol}
  const handlePublishPinnedSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBroadcast) return;

    const entryNum = Number(pinEntry);
    const slNum = Number(pinSl);
    if (!Number.isFinite(entryNum) || entryNum <= 0 || !Number.isFinite(slNum) || slNum <= 0) {
      addToast({
        title: isAr ? 'بيانات غير مكتملة' : 'Missing Entry or SL',
        message: isAr ? 'يرجى إدخال سعر الدخول ووقف الخسارة بشكل صحيح.' : 'Please enter valid Entry and Stop Loss prices.',
        type: 'info',
      });
      return;
    }

    setIsBroadcasting(true);
    try {
      const tp1Num = pinTp1 ? Number(pinTp1) : undefined;
      const tp2Num = pinTp2 ? Number(pinTp2) : undefined;
      const tp3Num = pinTp3 ? Number(pinTp3) : undefined;
      const sweepNum = pinSweep ? Number(pinSweep) : undefined;
      const atrNum = pinAtr ? Number(pinAtr) : undefined;

      let computedRr = pinRr.trim();
      if (!computedRr && tp1Num && Number.isFinite(tp1Num)) {
        const risk = Math.abs(entryNum - slNum);
        const reward = Math.abs(tp1Num - entryNum);
        if (risk > 0 && reward > 0) {
          computedRr = `1:${(reward / risk).toFixed(1)}`;
        }
      }

      const activeSetup: ActiveChartSetupSignal = {
        side: pinSide,
        entry: entryNum,
        sl: slNum,
        ...(tp1Num && Number.isFinite(tp1Num) ? { tp1: tp1Num } : {}),
        ...(tp2Num && Number.isFinite(tp2Num) ? { tp2: tp2Num } : {}),
        ...(tp3Num && Number.isFinite(tp3Num) ? { tp3: tp3Num } : {}),
        ...(sweepNum && Number.isFinite(sweepNum) ? { sweepPrice: sweepNum } : {}),
        ...(atrNum && Number.isFinite(atrNum) ? { atr: atrNum } : {}),
        ...(computedRr ? { rrText: computedRr } : {}),
        ...(pinNoteAr.trim() ? { noteAr: pinNoteAr.trim(), noteEn: pinNoteAr.trim() } : {}),
        updatedAt: Date.now(),
      };

      await publishAdminChartSetup(symbol, {
        timeframe: interval,
        activeSetup,
      });

      triggerServerWebPush({
        title: `${pinSide === 'BUY' ? '🟢 شراء' : '🔴 بيع'} ${symbol} (VIP) — صفقة مثبتة على الشارت`,
        body: `الدخول: ${entryNum} | الوقف: ${slNum}${tp1Num ? ` | الهدف 1: ${tp1Num}` : ''}`,
        tag: `mbk-chart-pin-${symbol}-${Date.now()}`,
        url: '/',
        audience: 'vip',
        category: 'signal',
        excludeUid: auth.currentUser?.uid || null
      });

      setPinDrawerOpen(false);
      setShowAdminLayer(true);
      addToast({
        title: isAr ? 'تم تثبيت الصفقة على الشارت' : 'Signal Pinned on Chart',
        message: isAr
          ? `تم رسم مستويات الدخول والوقف والأهداف لـ ${symbol} وبثها لمشتركي VIP.`
          : `Plotted Entry, SL, and TP levels on ${symbol} for all VIP viewers.`,
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        title: isAr ? 'خطأ في تثبيت الإشارة' : 'Failed to Pin Signal',
        message: err?.message || 'Error publishing chart setup',
        type: 'info',
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleClearAdminBroadcast = async (mode: 'all' | 'signal' | 'drawings') => {
    if (!canManageBroadcast) return;
    setIsBroadcasting(true);
    try {
      await clearAdminChartSetup(symbol, mode);
      addToast({
        title: isAr ? 'تم مسح بث الإدارة' : 'Admin Broadcast Cleared',
        message: isAr ? `تم إزالة بيانات البث المحددة من شارت ${symbol}.` : `Cleared admin broadcast layer for ${symbol}.`,
        type: 'info',
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const activePinnedSignal = adminSetup?.activeSetup;

  return (
    <div
      className={`${
        isFullChart ? 'fixed inset-0 z-[120]' : 'relative w-full h-full min-h-[540px]'
      } flex flex-col bg-[#06080c] text-slate-100 select-none overflow-hidden`}
    >
      {/* 1. TOP COMPACT BAR: Symbol Selector, Timeframes, Indicators, MBK Admin Layer Toggle */}
      <div className="shrink-0 bg-[#0b0e14] border-b border-white/10 px-2.5 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Left / Start: Symbol Pills & Timeframes */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Symbol Selector */}
          <div className="flex items-center bg-[#0f141e] border border-white/10 rounded-lg p-0.5 gap-0.5 overflow-x-auto max-w-full">
            {SYMBOLS.map((s) => {
              const active = symbol === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSymbol(s.id);
                    onSelectSymbol?.(s.id);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isAr ? s.labelAr : s.labelEn}
                </button>
              );
            })}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#0f141e] border border-white/10 rounded-lg p-0.5 gap-0.5">
            {INTERVALS.map((tf) => {
              const active = interval === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setIntervalState(tf.id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                    active
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isAr ? tf.labelAr : tf.labelEn}
                </button>
              );
            })}
          </div>

          {/* Indicator Toggles */}
          <div className="flex items-center bg-[#0f141e] border border-white/10 rounded-lg p-0.5 gap-0.5">
            {INDICATORS.map((ind) => {
              const active = activeIndicators.includes(ind.id);
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => handleToggleIndicator(ind.id)}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {ind.id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right / End: MBK Admin Layer Toggle + Admin Controls + Fullscreen */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* MBK Admin Layer Toggle (Free users see non-intrusive VIP lock badge) */}
          {canViewAdminLayer ? (
            <button
              type="button"
              onClick={() => setShowAdminLayer((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                showAdminLayer
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0f141e] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {showAdminLayer ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isAr ? 'تحليل الإدارة (VIP)' : 'MBK Admin Layer'}</span>
              {(adminSetup?.overlays?.length || adminSetup?.activeSetup) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenPlans?.()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#0f141e] border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-all"
              title={
                isAr
                  ? 'اشترك في VIP لفتح رسومات الإدارة ومستويات الدخول والأهداف المباشرة على الشارت'
                  : 'Upgrade to VIP to unlock live Admin drawings and signal levels on the chart'
              }
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'تحليل الإدارة المباشر' : 'MBK Admin Layer'}</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-extrabold">
                VIP
              </span>
            </button>
          )}

          {/* Admin / Analyser Broadcast Controls */}
          {canManageBroadcast && (
            <>
              <button
                type="button"
                disabled={isBroadcasting}
                onClick={handleBroadcastAdminDrawings}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 transition-all disabled:opacity-50"
              >
                <Radio className={`w-3.5 h-3.5 ${isBroadcasting ? 'animate-spin' : 'text-sky-400'}`} />
                <span>{isAr ? 'بث الرسومات للـ VIP' : 'Broadcast Drawings'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPinDrawerOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                  pinDrawerOpen
                    ? 'bg-amber-500/25 border-amber-500/50 text-amber-200'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-300'
                }`}
              >
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? 'تثبيت صفقة/إشارة' : 'Pin Signal on Chart'}</span>
              </button>
            </>
          )}

          {/* Refresh & Full Chart buttons */}
          <button
            type="button"
            onClick={() => chartInstanceRef.current?.resetData()}
            className="p-1.5 rounded-lg bg-[#0f141e] border border-white/10 text-slate-400 hover:text-white transition-all"
            title={isAr ? 'تحديث الشموع' : 'Refresh Candles'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCandles ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsFullChart((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0f141e] border border-white/10 text-slate-300 hover:text-white text-[11px] font-bold transition-all"
          >
            {isFullChart ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isAr ? (isFullChart ? 'تصغير' : 'ملء الشاشة') : isFullChart ? 'Exit' : 'Full'}</span>
          </button>
        </div>
      </div>

      {/* 2. DRAWING TOOLBAR (Available 100% Free to EVERY User, Persisted in localStorage) */}
      <div className="shrink-0 bg-[#0b0e14]/95 border-b border-white/10 px-2.5 py-1.5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400 px-1.5 whitespace-nowrap">
            {isAr ? 'أدوات الرسم الشخصي:' : 'Drawing Tools:'}
          </span>
          {DRAWING_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleSelectDrawingTool(tool.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-[#0f141e] text-slate-300 hover:text-white border border-white/5 hover:border-white/15'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? tool.labelAr : tool.labelEn}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleClearPersonalDrawings}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>{isAr ? 'مسح رسوماتي' : 'Clear My Drawings'}</span>
          </button>
        </div>

        {/* Live Price & Feed Status Pill */}
        <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
          {lastPrice !== null && (
            <span className="px-2 py-0.5 rounded bg-[#0f141e] border border-white/10 text-emerald-400 font-bold">
              {symbol}: {lastPrice.toFixed(getPrecisionForSymbol(symbol))}
            </span>
          )}
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {isAr ? 'محفوظ تلقائياً على جهازك' : 'Auto-saved locally'} ({candleSource})
          </span>
        </div>
      </div>

      {/* Optional Custom Text Annotation Prompt */}
      {annotationPromptOpen && (
        <div className="shrink-0 bg-[#0f141e] border-b border-emerald-500/30 px-3 py-2 flex items-center gap-2">
          <Type className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder={isAr ? 'اكتب نص الملاحظة ثم اضغط على الشارت...' : 'Enter label text then click on chart...'}
            className="flex-1 bg-[#06080c] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50"
          />
          <button
            type="button"
            onClick={handleConfirmAnnotationTool}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
          >
            {isAr ? 'اختر النقطة على الشارت' : 'Place on Chart'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAnnotationPromptOpen(false);
              setActiveTool(null);
            }}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. MAIN CANVAS VIEWPORT + SMART TRADE HUD + ADMIN PIN SIGNAL DRAWER */}
      <div className="relative flex-1 w-full min-h-[450px] bg-[#06080c]">
        {/* Klinecharts HTML5 Canvas Mount */}
        <div ref={chartContainerRef} className="w-full h-full" />

        {/* Smart Trade HUD (Corner Overlay for VIP / Elite / Admin when activeSetup exists & Admin Layer is ON) */}
        {canViewAdminLayer && showAdminLayer && activePinnedSignal && (
          <div
            className={`absolute top-3 ${
              isAr ? 'left-3' : 'right-3'
            } z-20 w-64 sm:w-72 bg-[#0f141e]/95 backdrop-blur-md border border-white/15 rounded-xl p-3 shadow-2xl pointer-events-auto`}
          >
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider ${
                    activePinnedSignal.side === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {activePinnedSignal.side === 'BUY'
                    ? isAr
                      ? 'شراء مؤسسي BUY'
                      : 'INSTITUTIONAL BUY'
                    : isAr
                    ? 'بيع مؤسسي SELL'
                    : 'INSTITUTIONAL SELL'}
                </span>
                <span className="text-xs font-extrabold text-white font-mono">{symbol}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{adminSetup?.timeframe || interval}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <div className="bg-[#0b0e14] border border-sky-500/30 rounded-lg px-2 py-1.5">
                <div className="text-[9px] text-sky-400 font-sans font-bold">
                  {isAr ? 'نقطة الدخول (Entry)' : 'Entry Price'}
                </div>
                <div className="text-white font-bold">{activePinnedSignal.entry}</div>
              </div>

              <div className="bg-[#0b0e14] border border-rose-500/30 rounded-lg px-2 py-1.5">
                <div className="text-[9px] text-rose-400 font-sans font-bold">
                  {isAr ? 'وقف الخسارة (SL)' : 'Stop Loss'}
                </div>
                <div className="text-rose-300 font-bold">{activePinnedSignal.sl}</div>
              </div>

              {activePinnedSignal.tp1 !== undefined && (
                <div className="bg-[#0b0e14] border border-emerald-500/30 rounded-lg px-2 py-1.5">
                  <div className="text-[9px] text-emerald-400 font-sans font-bold">
                    {isAr ? 'الهدف الأول (TP1)' : 'Target 1 (TP1)'}
                  </div>
                  <div className="text-emerald-300 font-bold">{activePinnedSignal.tp1}</div>
                </div>
              )}

              {activePinnedSignal.tp2 !== undefined && (
                <div className="bg-[#0b0e14] border border-emerald-500/30 rounded-lg px-2 py-1.5">
                  <div className="text-[9px] text-emerald-400 font-sans font-bold">
                    {isAr ? 'الهدف الثاني (TP2)' : 'Target 2 (TP2)'}
                  </div>
                  <div className="text-emerald-300 font-bold">{activePinnedSignal.tp2}</div>
                </div>
              )}

              {activePinnedSignal.tp3 !== undefined && (
                <div className="bg-[#0b0e14] border border-emerald-500/30 rounded-lg px-2 py-1.5">
                  <div className="text-[9px] text-emerald-400 font-sans font-bold">
                    {isAr ? 'الهدف الثالث (TP3)' : 'Target 3 (TP3)'}
                  </div>
                  <div className="text-emerald-300 font-bold">{activePinnedSignal.tp3}</div>
                </div>
              )}

              {activePinnedSignal.sweepPrice !== undefined && (
                <div className="bg-[#0b0e14] border border-amber-500/30 rounded-lg px-2 py-1.5">
                  <div className="text-[9px] text-amber-400 font-sans font-bold">
                    {isAr ? 'سحب سيولة (Sweep)' : 'Liquidity Sweep'}
                  </div>
                  <div className="text-amber-300 font-bold">{activePinnedSignal.sweepPrice}</div>
                </div>
              )}
            </div>

            {(activePinnedSignal.rrText || activePinnedSignal.atr !== undefined) && (
              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300 font-mono">
                {activePinnedSignal.rrText && (
                  <span>
                    R:R <strong className="text-emerald-400">{activePinnedSignal.rrText}</strong>
                  </span>
                )}
                {activePinnedSignal.atr !== undefined && (
                  <span>
                    ATR <strong className="text-amber-300">{activePinnedSignal.atr}</strong>
                  </span>
                )}
              </div>
            )}

            {(activePinnedSignal.noteAr || activePinnedSignal.noteEn) && (
              <p className="mt-1.5 text-[11px] text-slate-300 leading-relaxed bg-[#0b0e14] rounded-lg p-2 border border-white/5">
                {isAr
                  ? activePinnedSignal.noteAr || activePinnedSignal.noteEn
                  : activePinnedSignal.noteEn || activePinnedSignal.noteAr}
              </p>
            )}
          </div>
        )}

        {/* Admin Pin Signal Drawer / Popover (Visible ONLY to Admin / Analyser) */}
        {canManageBroadcast && pinDrawerOpen && (
          <div
            className={`absolute top-3 ${
              isAr ? 'right-3' : 'left-3'
            } z-30 w-80 sm:w-96 max-h-[90%] overflow-y-auto bg-[#0f141e] border border-white/15 rounded-xl p-3.5 shadow-2xl`}
          >
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-extrabold text-white">
                  {isAr ? `تثبيت صفقة وبثها على شارت ${symbol}` : `Pin & Broadcast Signal (${symbol})`}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPinDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Option A: Pick from recent Bot Alerts / Signals */}
            {recentParsedBotAlerts.length > 0 && (
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isAr ? 'اختر من آخر إشارات البوت أو التوصيات:' : 'Pick Recent Bot Alert / Signal:'}</span>
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleParseRawAlertText(e.target.value);
                  }}
                  defaultValue=""
                  className="w-full bg-[#06080c] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">
                    {isAr ? '-- اختر إشارة جاهزة لتعبئة الحقول تلقائياً --' : '-- Select alert to auto-fill --'}
                  </option>
                  {recentParsedBotAlerts.map((item) => (
                    <option key={item.id} value={item.rawText}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Option B: Paste Plain-Text Alert (Arabic or English — No JSON needed) */}
            <div className="mb-3">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isAr
                    ? 'أو الصق نص الإشارة (عربي/إنجليزي بدون JSON):'
                    : 'Or Paste Plain-Text Alert (Auto-Extracted):'}
                </span>
              </label>
              <textarea
                rows={2}
                value={rawAlertInput}
                onChange={(e) => handleParseRawAlertText(e.target.value)}
                placeholder={
                  isAr
                    ? 'مثال: شراء XAUUSD دخول 3025 وقف 3015 هدف 1: 3038 هدف 2: 3050 سحب سيولة 3020'
                    : 'e.g. BUY XAUUSD Entry: 3025 SL: 3015 TP1: 3038 TP2: 3050 Sweep: 3020'
                }
                className="w-full bg-[#06080c] border border-white/10 rounded-lg p-2 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Option C: Manual / Auto-Filled Fields */}
            <form onSubmit={handlePublishPinnedSignal} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPinSide('BUY')}
                  className={`py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                    pinSide === 'BUY'
                      ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300'
                      : 'bg-[#06080c] border-white/10 text-slate-400'
                  }`}
                >
                  {isAr ? 'شراء (BUY)' : 'BUY / LONG'}
                </button>
                <button
                  type="button"
                  onClick={() => setPinSide('SELL')}
                  className={`py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                    pinSide === 'SELL'
                      ? 'bg-rose-500/25 border-rose-500/50 text-rose-300'
                      : 'bg-[#06080c] border-white/10 text-slate-400'
                  }`}
                >
                  {isAr ? 'بيع (SELL)' : 'SELL / SHORT'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-sky-400 font-bold mb-0.5">
                    {isAr ? 'سعر الدخول (Entry) *' : 'Entry Price *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={pinEntry}
                    onChange={(e) => setPinEntry(e.target.value)}
                    className="w-full bg-[#06080c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-rose-400 font-bold mb-0.5">
                    {isAr ? 'وقف الخسارة (SL) *' : 'Stop Loss (SL) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={pinSl}
                    onChange={(e) => setPinSl(e.target.value)}
                    className="w-full bg-[#06080c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-emerald-400 font-bold mb-0.5">TP1</label>
                  <input
                    type="number"
                    step="any"
                    value={pinTp1}
                    onChange={(e) => setPinTp1(e.target.value)}
                    className="w-full bg-[#06080c] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-emerald-400 font-bold mb-0.5">TP2</label>
                  <input
                    type="number"
                    step="any"
                    value={pinTp2}
                    onChange={(e) => setPinTp2(e.target.value)}
                    className="w-full bg-[#06080c] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-emerald-400 font-bold mb-0.5">TP3</label>
                  <input
                    type="number"
                    step="any"
                    value={pinTp3}
                    onChange={(e) => setPinTp3(e.target.value)}
                    className="w-full bg-[#06080c] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-amber-400 font-bold mb-0.5">
                    {isAr ? 'سحب سيولة' : 'Sweep Price'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={pinSweep}
                    onChange={(e) => setPinSweep(e.target.value)}
                    className="w-full bg-[#06080c] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ATR</label>
                  <input
                    type="number"
                    step="any"
                    value={pinAtr}
                    onChange={(e) => setPinAtr(e.target.value)}
                    className="w-full bg-[#06080c] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">R:R</label>
                  <input
                    type="text"
                    placeholder="1:2.5"
                    value={pinRr}
                    onChange={(e) => setPinRr(e.target.value)}
                    className="w-full bg-[#06080c] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5">
                  {isAr ? 'ملاحظة فنية على الشارت (اختياري)' : 'Technical Note (Optional)'}
                </label>
                <input
                  type="text"
                  value={pinNoteAr}
                  onChange={(e) => setPinNoteAr(e.target.value)}
                  placeholder={isAr ? 'مثال: انتظار إغلاق شمعة 15د فوق منطقة الطلب' : 'e.g. Wait for 15m candle close above demand'}
                  className="w-full bg-[#06080c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAr ? 'رسم وبث للـ VIP الآن' : 'Plot & Broadcast to VIP'}</span>
                </button>
              </div>
            </form>

            {/* Clear Admin Signal / Drawings actions */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => handleClearAdminBroadcast('signal')}
                className="flex-1 py-1.5 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-[10px] font-bold"
              >
                {isAr ? 'إزالة الصفقة المثبتة' : 'Clear Pinned Signal'}
              </button>
              <button
                type="button"
                onClick={() => handleClearAdminBroadcast('drawings')}
                className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-[10px] font-bold"
              >
                {isAr ? 'مسح رسومات البث' : 'Clear Broadcast Drawings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MBKProCanvasChart;
