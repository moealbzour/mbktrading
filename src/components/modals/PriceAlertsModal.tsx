import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  BellRing,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  X,
  CheckCircle2,
  RotateCcw,
  Target
} from 'lucide-react';
import { MarketSymbol, MarketTicker } from '../../types/trading';
import { soundManager } from '../../utils/audio';
import {
  AppNotificationPermission,
  dispatchMobileAppNotification,
  emitBackgroundNotificationPulse
} from '../../utils/mobileNotifications';
import { ToastItem } from '../common/ToastContainer';

export interface PriceAlertItem {
  id: string;
  symbol: MarketSymbol;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  note?: string;
  status: 'active' | 'triggered';
  createdAtMs: number;
  triggeredAtMs?: number;
  triggeredPrice?: number;
}

const STORAGE_PREFIX = 'mbk_price_alerts_v1_';

function getStorageKey(uid?: string | null): string {
  return `${STORAGE_PREFIX}${uid || 'guest'}`;
}

export function loadUserPriceAlerts(uid?: string | null): PriceAlertItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a) =>
        a &&
        typeof a.id === 'string' &&
        typeof a.symbol === 'string' &&
        typeof a.targetPrice === 'number' &&
        a.targetPrice > 0
    );
  } catch {
    return [];
  }
}

export function saveUserPriceAlerts(uid: string | null | undefined, alerts: PriceAlertItem[], lang: 'ar' | 'en' = 'ar') {
  try {
    localStorage.setItem(getStorageKey(uid), JSON.stringify(alerts));
  } catch {
    // ignore storage errors
  }

  // Sync with in-memory server pulse watcher so alerts also fire when app is closed (0 Firestore quota)
  if (typeof window !== 'undefined' && uid) {
    fetch('/api/notifications/pulse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        action: 'sync_price_alerts',
        uid,
        alerts: alerts.map((a) => ({ ...a, lang }))
      })
    }).catch(() => {});
  }
}

export function usePriceAlertsManager(options: {
  uid?: string | null;
  tickers: MarketTicker[];
  lang?: 'ar' | 'en';
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
}) {
  const { uid, tickers, lang = 'ar', addToast } = options;
  const isAr = lang === 'ar';
  const [alerts, setAlerts] = useState<PriceAlertItem[]>(() => loadUserPriceAlerts(uid));
  const triggeredIdsRef = useRef<Set<string>>(new Set());

  // Reload when user uid changes
  useEffect(() => {
    const loaded = loadUserPriceAlerts(uid);
    setAlerts(loaded);
    triggeredIdsRef.current = new Set(
      loaded.filter((a) => a.status === 'triggered').map((a) => a.id)
    );
    if (uid && loaded.length > 0) {
      saveUserPriceAlerts(uid, loaded, lang);
    }
  }, [uid, lang]);

  const updateAlerts = useCallback(
    (updater: (prev: PriceAlertItem[]) => PriceAlertItem[]) => {
      setAlerts((prev) => {
        const next = updater(prev);
        saveUserPriceAlerts(uid, next, lang);
        return next;
      });
    },
    [uid, lang]
  );

  // Evaluate live ticker prices against active alerts
  useEffect(() => {
    if (!tickers || tickers.length === 0) return;

    const livePriceMap = new Map<MarketSymbol, number>();
    for (const t of tickers) {
      if (t && t.symbol && typeof t.price === 'number' && t.price > 0) {
        livePriceMap.set(t.symbol, t.price);
      }
    }
    if (livePriceMap.size === 0) return;

    const newlyTriggered: Array<{ alert: PriceAlertItem; livePrice: number }> = [];

    setAlerts((prev) => {
      let changed = false;
      const next = prev.map((alert) => {
        if (alert.status !== 'active' || triggeredIdsRef.current.has(alert.id)) {
          return alert;
        }
        const livePrice = livePriceMap.get(alert.symbol);
        if (typeof livePrice !== 'number' || livePrice <= 0) return alert;

        const hitAbove = alert.condition === 'ABOVE' && livePrice >= alert.targetPrice;
        const hitBelow = alert.condition === 'BELOW' && livePrice <= alert.targetPrice;

        if (hitAbove || hitBelow) {
          changed = true;
          triggeredIdsRef.current.add(alert.id);
          const updatedAlert: PriceAlertItem = {
            ...alert,
            status: 'triggered',
            triggeredAtMs: Date.now(),
            triggeredPrice: livePrice
          };
          newlyTriggered.push({ alert: updatedAlert, livePrice });
          return updatedAlert;
        }
        return alert;
      });

      if (changed) {
        saveUserPriceAlerts(uid, next, lang);
        return next;
      }
      return prev;
    });

    if (newlyTriggered.length > 0) {
      for (const { alert, livePrice } of newlyTriggered) {
        const dirTextAr = alert.condition === 'ABOVE' ? 'صعد إلى أو تجاوز' : 'هبط إلى أو كسر';
        const dirTextEn = alert.condition === 'ABOVE' ? 'crossed above' : 'dropped below';
        const noteSuffix = alert.note ? ` • ${alert.note}` : '';

        const title = isAr
          ? `منبه الأسعار MBK 🎯 • ${alert.symbol}`
          : `MBK Price Alert 🎯 • ${alert.symbol}`;
        const body = isAr
          ? `وصل سعر ${alert.symbol} (${dirTextAr} ${alert.targetPrice}) — السعر الحالي: ${livePrice}${noteSuffix}`
          : `${alert.symbol} ${dirTextEn} target ${alert.targetPrice} — Live price: ${livePrice}${noteSuffix}`;
        const tag = `price-alert-${alert.id}`;

        soundManager.playSignalPing();
        addToast({
          title,
          message: body,
          type: 'signal',
          symbol: alert.symbol,
          action: alert.condition === 'ABOVE' ? 'BUY' : 'SELL',
          timestamp: isAr ? 'الآن' : 'Now'
        });

        dispatchMobileAppNotification({
          title,
          body,
          tag,
          url: '/'
        }).catch(() => {});

        emitBackgroundNotificationPulse({
          title,
          body,
          tag,
          targetUid: uid || null,
          excludeUid: null
        });
      }
    }
  }, [tickers, uid, lang, isAr, addToast]);

  const addPriceAlert = useCallback(
    (params: {
      symbol: MarketSymbol;
      targetPrice: number;
      condition: 'ABOVE' | 'BELOW';
      note?: string;
    }) => {
      const id = `pa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newAlert: PriceAlertItem = {
        id,
        symbol: params.symbol,
        targetPrice: params.targetPrice,
        condition: params.condition,
        note: params.note?.trim() || undefined,
        status: 'active',
        createdAtMs: Date.now()
      };
      updateAlerts((prev) => [newAlert, ...prev.slice(0, 29)]);
      return newAlert;
    },
    [updateAlerts]
  );

  const removePriceAlert = useCallback(
    (id: string) => {
      triggeredIdsRef.current.delete(id);
      updateAlerts((prev) => prev.filter((a) => a.id !== id));
    },
    [updateAlerts]
  );

  const reactivatePriceAlert = useCallback(
    (id: string) => {
      triggeredIdsRef.current.delete(id);
      updateAlerts((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'active',
                triggeredAtMs: undefined,
                triggeredPrice: undefined
              }
            : a
        )
      );
    },
    [updateAlerts]
  );

  const clearTriggeredAlerts = useCallback(() => {
    updateAlerts((prev) => prev.filter((a) => a.status !== 'triggered'));
  }, [updateAlerts]);

  const activeAlertsCount = alerts.filter((a) => a.status === 'active').length;

  return {
    alerts,
    activeAlertsCount,
    addPriceAlert,
    removePriceAlert,
    reactivatePriceAlert,
    clearTriggeredAlerts
  };
}

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol: MarketSymbol;
  tickers: MarketTicker[];
  alerts: PriceAlertItem[];
  onAddAlert: (params: {
    symbol: MarketSymbol;
    targetPrice: number;
    condition: 'ABOVE' | 'BELOW';
    note?: string;
  }) => void;
  onRemoveAlert: (id: string) => void;
  onReactivateAlert: (id: string) => void;
  onClearTriggered: () => void;
  notificationPermission: AppNotificationPermission;
  onRequestNotificationPermission: () => Promise<AppNotificationPermission>;
  lang?: 'ar' | 'en';
}

const SYMBOLS_LIST: MarketSymbol[] = ['XAUUSD', 'US100', 'EURUSD', 'BTCUSD', 'WTI', 'GBPUSD'];

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol,
  tickers,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onReactivateAlert,
  onClearTriggered,
  notificationPermission,
  onRequestNotificationPermission,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [symbol, setSymbol] = useState<MarketSymbol>(defaultSymbol || 'XAUUSD');
  const [targetPriceInput, setTargetPriceInput] = useState<string>('');
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [note, setNote] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const currentTicker = tickers.find((t) => t.symbol === symbol);
  const currentPrice = currentTicker?.price || 0;
  const digits = currentTicker?.digits ?? (symbol === 'EURUSD' || symbol === 'GBPUSD' ? 5 : 2);

  useEffect(() => {
    if (isOpen && defaultSymbol) {
      setSymbol(defaultSymbol);
    }
  }, [isOpen, defaultSymbol]);

  useEffect(() => {
    if (currentPrice > 0 && !targetPriceInput) {
      setTargetPriceInput(currentPrice.toFixed(digits));
    }
  }, [symbol, currentPrice, digits, targetPriceInput]);

  if (!isOpen) return null;

  const handleSelectSymbol = (nextSym: MarketSymbol) => {
    soundManager.playClick();
    setSymbol(nextSym);
    const nextTicker = tickers.find((t) => t.symbol === nextSym);
    const nextDigits = nextTicker?.digits ?? (nextSym === 'EURUSD' || nextSym === 'GBPUSD' ? 5 : 2);
    if (nextTicker && nextTicker.price > 0) {
      setTargetPriceInput(nextTicker.price.toFixed(nextDigits));
    } else {
      setTargetPriceInput('');
    }
    setFormError(null);
  };

  const applyQuickOffset = (pctOrPoints: number, isPoints = false) => {
    soundManager.playClick();
    if (currentPrice <= 0) return;
    const nextVal = isPoints
      ? currentPrice + pctOrPoints
      : currentPrice * (1 + pctOrPoints / 100);
    if (nextVal <= 0) return;
    setTargetPriceInput(nextVal.toFixed(digits));
    setCondition(nextVal >= currentPrice ? 'ABOVE' : 'BELOW');
    setFormError(null);
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(targetPriceInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError(isAr ? 'يرجى إدخال سعر مستهدف صحيح أكبر من الصفر' : 'Please enter a valid target price > 0');
      return;
    }

    soundManager.playClick();
    onAddAlert({
      symbol,
      targetPrice: Number(parsed.toFixed(digits)),
      condition,
      note
    });
    setNote('');
    setFormError(null);
  };

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const triggeredAlerts = alerts.filter((a) => a.status === 'triggered');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#131722] border border-[#2a2e39] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#171b26] border-b border-[#2a2e39] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#089981]/20 border border-[#089981]/40 text-[#089981] flex items-center justify-center">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                <span>{isAr ? 'منبه الأسعار الذكي (Price Alerts)' : 'Smart Price Alerts'}</span>
                {activeAlerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#089981]/20 text-[#089981] border border-[#089981]/40 text-[10px] font-mono">
                    {activeAlerts.length} {isAr ? 'نشط' : 'Active'}
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-[#787b86]">
                {isAr
                  ? 'إشعار فوري على المتصفح والهاتف عند وصول السعر المباشر لهدفك'
                  : 'Instant browser & mobile push alert when live price hits your target'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Browser Push Notification Permission Banner */}
        {notificationPermission !== 'granted' && (
          <div className="px-4 py-2.5 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-amber-300 text-[11px] font-bold">
              <Bell className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>
                {isAr
                  ? 'فعّل إشعارات المتصفح لتصلك تنبيهات الأسعار على شاشة الهاتف مباشرة'
                  : 'Enable browser notifications to receive price alerts directly on your phone'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onRequestNotificationPermission();
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#06080c] text-[10px] font-black shrink-0 cursor-pointer"
            >
              {isAr ? 'تفعيل الإشعارات' : 'Enable Push'}
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* 1. Create New Price Alert Form */}
          <form
            onSubmit={handleCreateAlert}
            className="p-3.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] space-y-3"
          >
            {/* Symbol Quick Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-[#9db2c6]">
                  {isAr ? 'اختر الزوج / الأصل:' : 'Select Symbol:'}
                </label>
                {currentPrice > 0 && (
                  <span className="text-[11px] font-mono font-bold text-[#089981] bg-[#089981]/10 px-2 py-0.5 rounded border border-[#089981]/30">
                    {isAr ? 'السعر المباشر:' : 'Live:'} {currentPrice.toFixed(digits)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {SYMBOLS_LIST.map((sym) => {
                  const isSelected = symbol === sym;
                  const t = tickers.find((item) => item.symbol === sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleSelectSymbol(sym)}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#089981] text-white border-[#089981] shadow-md'
                          : 'bg-[#131722] text-[#9db2c6] hover:text-white border-[#2a2e39]'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold block">{sym}</span>
                      {t && t.price > 0 && (
                        <span
                          className={`text-[9px] font-mono block truncate ${
                            isSelected ? 'text-white/90' : 'text-[#787b86]'
                          }`}
                        >
                          {t.price.toFixed(t.digits)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Condition & Target Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-[#9db2c6] block mb-1">
                  {isAr ? 'شرط التنبيه:' : 'Trigger Condition:'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setCondition('ABOVE');
                    }}
                    className={`py-2 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      condition === 'ABOVE'
                        ? 'bg-[#089981]/20 text-[#089981] border-[#089981]'
                        : 'bg-[#131722] text-[#787b86] border-[#2a2e39]'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{isAr ? 'صعود (≥)' : 'Above (≥)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setCondition('BELOW');
                    }}
                    className={`py-2 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      condition === 'BELOW'
                        ? 'bg-[#f23645]/20 text-[#f23645] border-[#f23645]'
                        : 'bg-[#131722] text-[#787b86] border-[#2a2e39]'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>{isAr ? 'هبوط (≤)' : 'Below (≤)'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#9db2c6] block mb-1">
                  {isAr ? `السعر المستهدف (${symbol}):` : `Target Price (${symbol}):`}
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetPriceInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetPriceInput(val);
                    const num = Number(val);
                    if (currentPrice > 0 && Number.isFinite(num) && num > 0) {
                      setCondition(num >= currentPrice ? 'ABOVE' : 'BELOW');
                    }
                    setFormError(null);
                  }}
                  placeholder={currentPrice > 0 ? currentPrice.toFixed(digits) : '3620.00'}
                  className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Price Offset Presets */}
            {currentPrice > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-[#787b86]">
                  {isAr ? 'تحديد سريع:' : 'Quick target:'}
                </span>
                {symbol === 'XAUUSD' ? (
                  <>
                    {[
                      { label: '+$5', val: 5, pts: true },
                      { label: '+$15', val: 15, pts: true },
                      { label: '-$5', val: -5, pts: true },
                      { label: '-$15', val: -15, pts: true }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyQuickOffset(preset.val, preset.pts)}
                        className="px-2 py-0.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[10px] font-mono text-[#d1d4dc] cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { label: '+0.25%', val: 0.25 },
                      { label: '+0.5%', val: 0.5 },
                      { label: '-0.25%', val: -0.25 },
                      { label: '-0.5%', val: -0.5 }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyQuickOffset(preset.val, false)}
                        className="px-2 py-0.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[10px] font-mono text-[#d1d4dc] cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Optional Note */}
            <div>
              <input
                type="text"
                maxLength={100}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 100))}
                placeholder={
                  isAr
                    ? 'ملاحظة اختيارية (مثال: منطقة دخول شراء الذهب أو جني أرباح)...'
                    : 'Optional note (e.g., Gold breakout zone or take profit)...'
                }
                className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#787b86] focus:outline-none"
              />
            </div>

            {formError && (
              <p className="text-[11px] font-bold text-[#f23645]">{formError}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isAr
                  ? `إضافة تنبيه سعر على ${symbol}`
                  : `Set Price Alert on ${symbol}`}
              </span>
            </button>
          </form>

          {/* 2. Active Price Alerts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#089981]" />
                <span>
                  {isAr
                    ? `التنبيهات النشطة (${activeAlerts.length})`
                    : `Active Price Alerts (${activeAlerts.length})`}
                </span>
              </h4>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#1e222d]/60 border border-[#2a2e39] text-center text-xs text-[#787b86]">
                {isAr
                  ? 'لا توجد تنبيهات أسعار نشطة حالياً. حدد السعر المستهدف أعلاه واضغط إضافة.'
                  : 'No active price alerts. Set a target price above to start monitoring.'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {activeAlerts.map((alert) => {
                  const live = tickers.find((t) => t.symbol === alert.symbol)?.price || 0;
                  return (
                    <div
                      key={alert.id}
                      className="p-2.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-white text-xs">
                            {alert.symbol}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                              alert.condition === 'ABOVE'
                                ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40'
                                : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40'
                            }`}
                          >
                            {alert.condition === 'ABOVE' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span>
                              {alert.condition === 'ABOVE' ? '≥' : '≤'} {alert.targetPrice}
                            </span>
                          </span>
                          {live > 0 && (
                            <span className="text-[10px] font-mono text-[#787b86]">
                              ({isAr ? 'الحالي:' : 'Live:'} {live})
                            </span>
                          )}
                        </div>
                        {alert.note && (
                          <p className="text-[11px] text-[#9db2c6] truncate mt-0.5">{alert.note}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onRemoveAlert(alert.id);
                        }}
                        className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] cursor-pointer transition-colors shrink-0"
                        title={isAr ? 'حذف التنبيه' : 'Delete alert'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Triggered Alerts History */}
          {triggeredAlerts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#2a2e39]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isAr
                      ? `تنبيهات تحققت (${triggeredAlerts.length})`
                      : `Triggered Alerts (${triggeredAlerts.length})`}
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onClearTriggered();
                  }}
                  className="text-[10px] text-[#787b86] hover:text-white cursor-pointer"
                >
                  {isAr ? 'مسح السجل' : 'Clear History'}
                </button>
              </div>

              <div className="space-y-1.5">
                {triggeredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2.5 rounded-xl bg-[#131722] border border-amber-500/30 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-white text-xs">
                          {alert.symbol}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                          {isAr ? 'وصل للهدف:' : 'Hit:'} {alert.targetPrice}
                        </span>
                        {alert.triggeredPrice && (
                          <span className="text-[10px] font-mono text-[#089981]">
                            @ {alert.triggeredPrice}
                          </span>
                        )}
                      </div>
                      {alert.note && (
                        <p className="text-[10px] text-[#787b86] truncate mt-0.5">{alert.note}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onReactivateAlert(alert.id);
                        }}
                        className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-[#089981]/20 text-[#9db2c6] hover:text-[#089981] cursor-pointer"
                        title={isAr ? 'إعادة تفعيل التنبيه' : 'Reactivate alert'}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onRemoveAlert(alert.id);
                        }}
                        className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] cursor-pointer"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
