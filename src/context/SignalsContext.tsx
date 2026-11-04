import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { soundManager } from '../utils/audio';
import { DailyTrade, TradeSource, DailyTradeStatus } from '../types/trading';
import { ToastContainer, ToastItem } from '../components/common/ToastContainer';

export interface ChannelSignalItem {
  id: string;
  channel: 'free' | 'vip' | 'bot';
  symbol: string;
  action: 'BUY' | 'SELL';
  entryPrice: number;
  tp1: number;
  tp2: number;
  tp3?: number;
  sl: number;
  pips: number;
  strategy: string;
  timeframe: string;
  status: 'ACTIVE' | 'RUNNING' | 'TP1_HIT' | 'TP2_HIT' | 'SL_HIT' | 'CLOSED' | 'TP_HIT';
  instructionsAr: string;
  instructionsEn: string;
  timeAgo: string;
  openTime?: string;
  confidence: number;
  isBlurredForFree: boolean;
  source?: TradeSource;
  textMsg?: string;
  duration?: string;
  accessLevel?: 'free' | 'vip' | 'all';
  author?: string;
  authorRole?: string;
  timestampMs?: number;
}

export interface BotAlertItem {
  id: string;
  text: string;
  chat_id?: string | null;
  timestamp: string;
  timestampMs?: number;
}

export interface SignalsContextValue {
  signals: ChannelSignalItem[];
  trades: DailyTrade[];
  botAlerts: BotAlertItem[];
  loading: boolean;
  botAlertsLoading: boolean;
  toasts: ToastItem[];
  dbError: string | null;
  setDbError: (err: string | null) => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  requestNotificationPermission: () => Promise<NotificationPermission | undefined>;
}

const SignalsContext = createContext<SignalsContextValue>({
  signals: [],
  trades: [],
  botAlerts: [],
  loading: true,
  botAlertsLoading: true,
  toasts: [],
  dbError: null,
  setDbError: () => {},
  addToast: () => {},
  removeToast: () => {},
  requestNotificationPermission: async () => undefined
});

export const SignalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signals, setSignals] = useState<ChannelSignalItem[]>([]);
  const [rawTrades, setRawTrades] = useState<DailyTrade[]>([]);
  const [botAlerts, setBotAlerts] = useState<BotAlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [botAlertsLoading, setBotAlertsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  // Dismiss toast by ID using functional state update
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Add toast notification using functional state update
  const addToast = useCallback(
    (toastData: Omit<ToastItem, 'id'>) => {
      try {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newToast: ToastItem = { ...toastData, id };
        setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

        setTimeout(() => {
          removeToast(id);
        }, 7000);
      } catch (err) {
        console.error('[SignalsContext ERROR] addToast failed:', err);
      }
    },
    [removeToast]
  );

  // Request native browser Push Notification permission safely
  const requestNotificationPermission = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          return perm;
        }
        return Notification.permission;
      }
    } catch (err) {
      console.warn('[SignalsContext] Error requesting notification permission:', err);
    }
    return undefined;
  }, []);

  // Strict safe Audio Ping wrapper
  const triggerAudioAlert = useCallback(() => {
    try {
      soundManager.playSignalPing();
    } catch (err) {
      console.warn('[SignalsContext] soundManager ping notice:', err);
    }

    try {
      const backupAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      backupAudio.volume = 0.5;
      const playPromise = backupAudio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch((e) => {
          console.warn('[SignalsContext] Audio playback muted by browser autoplay policy:', e?.message || e);
        });
      }
    } catch (err) {
      console.warn('[SignalsContext] Backup audio notice:', err);
    }
  }, []);

  // Native Browser System Push Notification safely wrapped
  const sendBrowserNotification = useCallback((title: string, body: string) => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico'
        });
      }
    } catch (err) {
      console.warn('[SignalsContext] Failed to dispatch browser notification:', err);
    }
  }, []);

  // Auto request permission on mount
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
  }, [requestNotificationPermission]);

  useEffect(() => {
    let isFirstSignalsSnapshot = true;
    let isFirstBotSnapshot = true;

    // 1. Central Firestore listener for `signals` collection
    const signalsRef = collection(db, 'signals');

    const unsubscribeSignals = onSnapshot(
      signalsRef,
      (snapshot) => {
        try {
          // Detect additions via docChanges()
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const symbol = data.symbol || 'US100';
              const action = (data.action || 'BUY').toUpperCase() as 'BUY' | 'SELL';
              const entryPrice = Number(data.entryPrice || 0);
              const channel = data.channel || 'vip';

              // Guard against old records on initial load or cold start
              const isRecent = data.timestampMs ? data.timestampMs > Date.now() - 5 * 60 * 1000 : true;

              if (!isFirstSignalsSnapshot && isRecent) {
                triggerAudioAlert();

                addToast({
                  title: channel === 'bot' ? 'تنبيه آلي جديد ⚡' : 'توصية تداول جديدة 🚀',
                  message: `صفقة ${action === 'BUY' ? 'شراء' : 'بيع'} على ${symbol} بسعر دخول ${entryPrice}.`,
                  type: channel === 'bot' ? 'bot' : 'signal',
                  symbol,
                  action,
                  timestamp: 'الآن'
                });

                sendBrowserNotification(
                  `MBK Trading Alert - ${symbol}`,
                  `New Signal: ${action} ${symbol} @ ${entryPrice}`
                );
              }
            }
          });

          const liveSignals: ChannelSignalItem[] = [];
          const liveTrades: DailyTrade[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;

            const access = (data.accessLevel || data.access_level || 'free').toLowerCase();
            const isVip = access === 'vip' || data.source === 'VIP_MANUAL';
            const isBot = data.source === 'BOT_WEBHOOK' || Boolean(data.isBotSignal) || data.channel === 'bot';

            const source: TradeSource = isBot
              ? 'BOT_WEBHOOK'
              : isVip
              ? 'VIP_MANUAL'
              : 'FREE_PUBLIC';

            const channel: 'free' | 'vip' | 'bot' = isBot
              ? 'bot'
              : isVip
              ? 'vip'
              : 'free';

            const entry = Number(data.entryPrice || 0);
            const tp1 = Number(data.tp1 || 0);
            const tp2 = Number(data.tp2 || 0);
            const tp3 = data.tp3 !== undefined ? Number(data.tp3) : undefined;
            const sl = Number(data.sl || 0);
            const pips = Number(data.pips || 0);
            const status = data.status || 'RUNNING';
            const timestampMs = Number(data.timestampMs || Date.now());

            liveSignals.push({
              id: docId,
              channel,
              symbol: data.symbol || 'US100',
              action: (data.action || 'BUY').toUpperCase() as 'BUY' | 'SELL',
              entryPrice: entry,
              tp1,
              tp2,
              tp3,
              sl,
              pips,
              strategy: data.strategy || 'MBK Strategy',
              timeframe: data.timeframe || '15m',
              status: status as any,
              instructionsAr: data.notesAr || data.instructionsAr || 'إشارة تداول مباشرة مع إرشادات إدارة المخاطر.',
              instructionsEn: data.notesEn || data.instructionsEn || 'Live trade setup with risk management parameters.',
              timeAgo: data.openTime || data.duration || 'الآن',
              openTime: data.openTime || 'الآن',
              confidence: Number(data.confidence || 90),
              isBlurredForFree: Boolean(data.isBlurredForFree || isVip || isBot),
              source,
              textMsg: data.textMsg,
              duration: data.duration,
              accessLevel: access as any,
              author: data.author,
              authorRole: data.authorRole,
              timestampMs
            });

            liveTrades.push({
              id: docId,
              symbol: data.symbol || 'US100',
              nameAr: data.nameAr || data.symbol || 'صفقة تداول',
              action: (data.action || 'BUY').toUpperCase() as 'BUY' | 'SELL',
              source,
              sourceLabelAr: data.sourceLabelAr || (isBot ? 'بوت TradingView' : isVip ? 'توصية VIP' : 'تحليل عام'),
              sourceLabelEn: data.sourceLabelEn || (isBot ? 'TradingView Bot' : isVip ? 'VIP Signal' : 'Free Public'),
              status: status as DailyTradeStatus,
              statusLabelAr: data.statusLabelAr || (status === 'RUNNING' ? 'صفقة جارية الآن ⚡' : 'هدف محقق 🎯'),
              openTime: data.openTime || 'الآن',
              duration: data.duration || 'الآن',
              pips,
              entryPrice: entry,
              currentPrice: Number(data.currentPrice || entry),
              tp1,
              tp2,
              tp3,
              sl,
              riskReward: data.riskReward || '1:2.4',
              strategy: data.strategy || 'MBK Strategy',
              confidence: Number(data.confidence || 90),
              notesAr: data.notesAr || data.instructionsAr,
              textMsg: data.textMsg,
              isBotSignal: isBot,
              isBlurredForFree: Boolean(data.isBlurredForFree || isVip),
              accessLevel: access as any,
              timestampMs
            });
          });

          // Sort in memory by timestampMs descending
          liveSignals.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
          liveTrades.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));

          // Functional state updates to prevent stale closure issues
          setSignals(() => liveSignals);
          setRawTrades(() => liveTrades);
          isFirstSignalsSnapshot = false;
          setLoading(false);
        } catch (procErr: any) {
          console.error('[SignalsContext ERROR] Exception in signals snapshot handler:', procErr);
          setDbError(`[Signals processing error]: ${procErr?.message || String(procErr)}`);
          setLoading(false);
        }
      },
      (error) => {
        console.error('[Firestore Signals onSnapshot Error]:', error);
        const errMsg = error?.message || String(error);
        setDbError(`[Firestore signals collection error]: ${errMsg}`);
        setLoading(false);
      }
    );

    // 2. Central Firestore listener for `bot_alerts` collection
    const botAlertsRef = collection(db, 'bot_alerts');

    const unsubscribeBot = onSnapshot(
      botAlertsRef,
      (snapshot) => {
        try {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const text = data.text || 'TradingView PinScript Alert';
              const isRecent = data.timestampMs ? data.timestampMs > Date.now() - 5 * 60 * 1000 : true;

              if (!isFirstBotSnapshot && isRecent) {
                triggerAudioAlert();

                addToast({
                  title: 'تنبيه TradingView Webhook 🤖',
                  message: text,
                  type: 'bot',
                  timestamp: 'الآن'
                });

                sendBrowserNotification(
                  'MBK Bot Warning Posted!',
                  text.length > 100 ? `${text.slice(0, 100)}...` : text
                );
              }
            }
          });

          const rawAlerts: BotAlertItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            rawAlerts.push({
              id: docSnap.id,
              text: data.text || '',
              chat_id: data.chat_id || data.chatId || null,
              timestamp: data.timestamp || new Date().toISOString(),
              timestampMs: Number(data.timestampMs || Date.now())
            });
          });

          // Sort in memory by timestampMs descending
          rawAlerts.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));

          // Functional state update
          setBotAlerts(() => rawAlerts);
          isFirstBotSnapshot = false;
          setBotAlertsLoading(false);
        } catch (procErr: any) {
          console.error('[SignalsContext ERROR] Exception in bot_alerts snapshot handler:', procErr);
          setDbError((prev) => prev ? `${prev} | [Bot alerts processing error]: ${procErr?.message || String(procErr)}` : `[Bot alerts processing error]: ${procErr?.message || String(procErr)}`);
          setBotAlertsLoading(false);
        }
      },
      (error) => {
        console.error('[Firestore Bot Alerts onSnapshot Error]:', error);
        const errMsg = error?.message || String(error);
        setDbError((prev) => prev ? `${prev} | [Firestore bot_alerts error]: ${errMsg}` : `[Firestore bot_alerts error]: ${errMsg}`);
        setBotAlertsLoading(false);
      }
    );

    return () => {
      unsubscribeSignals();
      unsubscribeBot();
    };
  }, [addToast, sendBrowserNotification, triggerAudioAlert]);

  // Merge raw bot_alerts into trades array
  const mergedTrades: DailyTrade[] = [...rawTrades];
  const existingTradeIds = new Set(rawTrades.map((t) => t.id));

  botAlerts.forEach((alert) => {
    if (!existingTradeIds.has(alert.id)) {
      const text = alert.text || '';
      const upperText = text.toUpperCase();

      const actionMatch = upperText.match(/\b(BUY|SELL)\b/);
      const action: 'BUY' | 'SELL' = actionMatch ? (actionMatch[1] as 'BUY' | 'SELL') : 'BUY';

      let symbol = 'US100';
      if (upperText.includes('XAU') || upperText.includes('GOLD')) symbol = 'XAUUSD';
      else if (upperText.includes('EUR')) symbol = 'EURUSD';
      else if (upperText.includes('BTC')) symbol = 'BTCUSD';
      else if (upperText.includes('GBP')) symbol = 'GBPUSD';
      else if (upperText.includes('WTI') || upperText.includes('OIL')) symbol = 'WTI';
      else if (upperText.includes('NAS') || upperText.includes('NDX') || upperText.includes('US100')) symbol = 'US100';

      const priceMatch = text.match(/(\d{2,5}\.?\d{0,4})/);
      const entryPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;

      // Only synthesize a trade card if a valid numerical entry price was parsed
      if (entryPrice > 0) {
        const tp1 = action === 'BUY' ? Math.round(entryPrice * 1.005 * 100) / 100 : Math.round(entryPrice * 0.995 * 100) / 100;
        const sl = action === 'BUY' ? Math.round(entryPrice * 0.995 * 100) / 100 : Math.round(entryPrice * 1.005 * 100) / 100;

        mergedTrades.push({
          id: `bot-${alert.id}`,
          symbol,
          nameAr: `${symbol} (تنبيه آلي)`,
          action,
          source: 'BOT_WEBHOOK',
          sourceLabelAr: 'تنبيه TradingView Webhook',
          sourceLabelEn: 'TradingView Webhook',
          status: 'RUNNING',
          statusLabelAr: 'صفقة جارية الآن ⚡',
          openTime: alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'الآن',
          duration: 'الآن',
          pips: 0,
          entryPrice,
          currentPrice: entryPrice,
          tp1,
          sl,
          riskReward: '1:2.4',
          strategy: 'TradingView PineScript Alert',
          confidence: 90,
          notesAr: text,
          textMsg: text,
          isBotSignal: true,
          isBlurredForFree: false,
          accessLevel: 'free',
          timestampMs: alert.timestampMs || Date.now()
        });
      }
    }
  });

  // Re-sort merged trades in memory
  mergedTrades.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));

  return (
    <SignalsContext.Provider
      value={{
        signals,
        trades: mergedTrades,
        botAlerts,
        loading,
        botAlertsLoading,
        toasts,
        dbError,
        setDbError,
        addToast,
        removeToast,
        requestNotificationPermission
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </SignalsContext.Provider>
  );
};

export const useSignalsContext = () => useContext(SignalsContext);
