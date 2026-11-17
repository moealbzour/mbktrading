import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { soundManager } from '../utils/audio';
import { DailyTrade, TradeSource, DailyTradeStatus, UserProfile } from '../types/trading';
import { ToastContainer, ToastItem } from '../components/common/ToastContainer';
import { hasFeatureAccess } from '../utils/entitlements';
import {
  AppNotificationPermission,
  dispatchMobileAppNotification,
  getNotificationPermissionState,
  requestAppNotificationPermission
} from '../utils/mobileNotifications';

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
  originCollection?: 'signals' | 'bot_alerts';
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
  unreadDmCount: number;
  notificationPermission: AppNotificationPermission;
  setDbError: (err: string | null) => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  requestNotificationPermission: () => Promise<AppNotificationPermission>;
}

const SignalsContext = createContext<SignalsContextValue>({
  signals: [],
  trades: [],
  botAlerts: [],
  loading: true,
  botAlertsLoading: true,
  toasts: [],
  dbError: null,
  unreadDmCount: 0,
  notificationPermission: 'default',
  setDbError: () => {},
  addToast: () => {},
  removeToast: () => {},
  requestNotificationPermission: async () => 'default'
});

const SUPER_ADMIN_EMAIL = 'moe.albzour@gmail.com';
const LIVE_SIGNALS_LIMIT = 30;

function mapRawUserToProfile(userData: Record<string, any> | undefined): Partial<UserProfile> | null {
  if (!userData) return null;
  return {
    role: (userData.role || 'free').toString().toUpperCase(),
    tier: userData.tier || (userData.isElite ? 'elite' : userData.isVip ? 'vip' : 'free'),
    isVip: Boolean(userData.isVip),
    vipAccess: Boolean(userData.vipAccess),
    isElite: Boolean(userData.isElite),
    vipExpiryDate: userData.vipExpiryDate || userData.subscription_end_date || null,
    eliteExpiryDate: userData.eliteExpiryDate || userData.subscription_end_date || null,
    subscriptionEndDate: userData.subscription_end_date || userData.subscriptionEndDate || userData.vipExpiryDate || null,
    grantedFeatures:
      userData.grantedFeatures && typeof userData.grantedFeatures === 'object'
        ? userData.grantedFeatures
        : {},
    isBanned: Boolean(userData.isBanned)
  };
}

export const SignalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signals, setSignals] = useState<ChannelSignalItem[]>([]);
  const [rawTrades, setRawTrades] = useState<DailyTrade[]>([]);
  const [botAlerts, setBotAlerts] = useState<BotAlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [botAlertsLoading, setBotAlertsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState<boolean>(false);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [canReadVipSignals, setCanReadVipSignals] = useState<boolean>(false);
  const [canReadBotAlerts, setCanReadBotAlerts] = useState<boolean>(false);
  const [canReadVipChat, setCanReadVipChat] = useState<boolean>(false);
  const [unreadDmCount, setUnreadDmCount] = useState<number>(0);
  const [notificationPermission, setNotificationPermission] = useState<AppNotificationPermission>(() =>
    getNotificationPermissionState()
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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

  const requestNotificationPermission = useCallback(async (): Promise<AppNotificationPermission> => {
    const perm = await requestAppNotificationPermission();
    setNotificationPermission(perm);
    return perm;
  }, []);

  const triggerAudioAlert = useCallback(() => {
    try {
      soundManager.playSignalPing();
    } catch (err) {
      console.warn('[SignalsContext] soundManager ping notice:', err);
    }
  }, []);

  const sendBrowserNotification = useCallback((title: string, body: string, tag?: string) => {
    dispatchMobileAppNotification({ title, body, tag }).catch(() => {});
  }, []);

  useEffect(() => {
    const syncPermission = () => {
      setNotificationPermission(getNotificationPermissionState());
    };
    syncPermission();

    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);

    let permStatus: PermissionStatus | null = null;
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((status) => {
          permStatus = status;
          status.onchange = syncPermission;
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
      if (permStatus) {
        permStatus.onchange = null;
      }
    };
  }, []);

  // Track authenticated user VIP/Elite/Feature-Trial/Admin status in real time
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (!firebaseUser) {
        setCurrentUserUid(null);
        setCanReadVipSignals(false);
        setCanReadBotAlerts(false);
        setCanReadVipChat(false);
        setUnreadDmCount(0);
        setAuthResolved(true);
        return;
      }

      setCurrentUserUid(firebaseUser.uid);

      const isSuperAdmin =
        firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL && firebaseUser.emailVerified;

      if (isSuperAdmin) {
        setCanReadVipSignals(true);
        setCanReadBotAlerts(true);
        setCanReadVipChat(true);
        setAuthResolved(true);
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      unsubscribeUserDoc = onSnapshot(
        userRef,
        (snap) => {
          const profile = mapRawUserToProfile(snap.data());
          setCanReadVipSignals(hasFeatureAccess(profile, 'vipSignals'));
          setCanReadBotAlerts(hasFeatureAccess(profile, 'botSignals'));
          setCanReadVipChat(hasFeatureAccess(profile, 'vipChat'));
          setAuthResolved(true);
        },
        (err) => {
          console.warn('[SignalsContext] User role listener notice:', err?.message || err);
          setCanReadVipSignals(false);
          setCanReadBotAlerts(false);
          setCanReadVipChat(false);
          setAuthResolved(true);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // Live Firestore listeners (capped at latest 30 signals & split Free vs VIP/Bot queries)
  useEffect(() => {
    if (!authResolved) return;

    let isFirstSignalsSnapshot = true;
    let isFirstBotSnapshot = true;

    setLoading(true);
    setDbError(null);

    const signalsQuery = canReadVipSignals
      ? query(collection(db, 'signals'), orderBy('timestampMs', 'desc'), limit(LIVE_SIGNALS_LIMIT))
      : query(
          collection(db, 'signals'),
          where('accessLevel', '==', 'free'),
          orderBy('timestampMs', 'desc'),
          limit(LIVE_SIGNALS_LIMIT)
        );

    const unsubscribeSignals = onSnapshot(
      signalsQuery,
      (snapshot) => {
        try {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const symbol = data.symbol || 'US100';
              const action = (data.action || 'BUY').toUpperCase() as 'BUY' | 'SELL';
              const entryPrice = Number(data.entryPrice || 0);
              const channel = data.channel || 'vip';
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
              originCollection: 'signals',
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
              originCollection: 'signals',
              timestampMs
            });
          });

          liveSignals.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
          liveTrades.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));

          setSignals(() => liveSignals.slice(0, LIVE_SIGNALS_LIMIT));
          setRawTrades(() => liveTrades.slice(0, LIVE_SIGNALS_LIMIT));
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

    let unsubscribeBot: (() => void) | null = null;
    if (canReadBotAlerts) {
      setBotAlertsLoading(true);
      const botAlertsQuery = query(
        collection(db, 'bot_alerts'),
        orderBy('timestampMs', 'desc'),
        limit(LIVE_SIGNALS_LIMIT)
      );

      unsubscribeBot = onSnapshot(
        botAlertsQuery,
        (snapshot) => {
          try {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const data = change.doc.data();
                const text = data.text || 'TradingView PineScript Alert';
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
                    'MBK Bot Alert',
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

            rawAlerts.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));

            setBotAlerts(() => rawAlerts.slice(0, LIVE_SIGNALS_LIMIT));
            isFirstBotSnapshot = false;
            setBotAlertsLoading(false);
          } catch (procErr: any) {
            console.error('[SignalsContext ERROR] Exception in bot_alerts snapshot handler:', procErr);
            setDbError((prev) =>
              prev
                ? `${prev} | [Bot alerts processing error]: ${procErr?.message || String(procErr)}`
                : `[Bot alerts processing error]: ${procErr?.message || String(procErr)}`
            );
            setBotAlertsLoading(false);
          }
        },
        (error) => {
          console.error('[Firestore Bot Alerts onSnapshot Error]:', error);
          const errMsg = error?.message || String(error);
          setDbError((prev) =>
            prev
              ? `${prev} | [Firestore bot_alerts error]: ${errMsg}`
              : `[Firestore bot_alerts error]: ${errMsg}`
          );
          setBotAlertsLoading(false);
        }
      );
    } else {
      setBotAlerts([]);
      setBotAlertsLoading(false);
    }

    return () => {
      unsubscribeSignals();
      if (unsubscribeBot) unsubscribeBot();
    };
  }, [authResolved, canReadVipSignals, canReadBotAlerts, addToast, sendBrowserNotification, triggerAudioAlert]);

  // Global Direct Message & VIP Group Chat Live Notifications (Sound + Toast + Mobile PWA OS Notification)
  useEffect(() => {
    if (!authResolved || !currentUserUid) return;

    let isFirstDmSnapshot = true;
    const lastSeenConvoMsgMs = new Map<string, number>();

    const dmQuery = query(
      collection(db, 'dm_conversations'),
      where('participants', 'array-contains', currentUserUid)
    );

    const unsubDm = onSnapshot(
      dmQuery,
      (snap) => {
        let totalUnread = 0;

        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const unreadMap = d.unreadBy || {};
          totalUnread += Number(unreadMap[currentUserUid] || 0);

          const msgMs = Number(d.lastMessageAtMs || 0);
          const prevMs = lastSeenConvoMsgMs.get(docSnap.id) || 0;
          lastSeenConvoMsgMs.set(docSnap.id, msgMs);

          if (
            !isFirstDmSnapshot &&
            msgMs > prevMs &&
            d.lastSenderUid &&
            d.lastSenderUid !== currentUserUid &&
            d.lastMessage
          ) {
            const senderName = d.participantNames?.[d.lastSenderUid] || 'متداول MBK';
            const preview = String(d.lastMessage).slice(0, 120);

            triggerAudioAlert();
            addToast({
              title: `رسالة خاصة من ${senderName} 💬`,
              message: preview,
              type: 'info',
              timestamp: 'الآن'
            });
            sendBrowserNotification(`رسالة خاصة • ${senderName}`, preview, `dm-${docSnap.id}`);
          }
        });

        setUnreadDmCount(totalUnread);
        isFirstDmSnapshot = false;
      },
      (err) => {
        console.warn('[SignalsContext] DM listener notice:', err?.message || err);
      }
    );

    let unsubChat: (() => void) | null = null;
    if (canReadVipChat) {
      let isFirstChatSnapshot = true;
      const latestChatQuery = query(
        collection(db, 'public_chat'),
        orderBy('timestampMs', 'desc'),
        limit(1)
      );

      unsubChat = onSnapshot(
        latestChatQuery,
        (snap) => {
          if (!isFirstChatSnapshot) {
            snap.docChanges().forEach((change) => {
              if (change.type !== 'added') return;
              const d = change.doc.data();
              const isRecent = d.timestampMs ? d.timestampMs > Date.now() - 2 * 60 * 1000 : true;
              if (d.uid && d.uid !== currentUserUid && isRecent) {
                const senderName = d.displayName || 'VIP Trader';
                const msgBody = (d.text || '[صورة شارت]').toString().slice(0, 120);

                triggerAudioAlert();
                addToast({
                  title: `شات VIP • ${senderName} 💬`,
                  message: msgBody,
                  type: 'info',
                  timestamp: 'الآن'
                });
                sendBrowserNotification(`غرفة VIP • ${senderName}`, msgBody, `vip-chat-${change.doc.id}`);
              }
            });
          }
          isFirstChatSnapshot = false;
        },
        (err) => {
          console.warn('[SignalsContext] Global VIP chat notification notice:', err?.message || err);
        }
      );
    }

    return () => {
      unsubDm();
      if (unsubChat) unsubChat();
    };
  }, [authResolved, currentUserUid, canReadVipChat, addToast, sendBrowserNotification, triggerAudioAlert]);

  // Merge raw bot_alerts into trades array, capped at latest 30 signals
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

      const tp1 =
        entryPrice > 0
          ? action === 'BUY'
            ? Math.round(entryPrice * 1.005 * 100) / 100
            : Math.round(entryPrice * 0.995 * 100) / 100
          : 0;
      const sl =
        entryPrice > 0
          ? action === 'BUY'
            ? Math.round(entryPrice * 0.995 * 100) / 100
            : Math.round(entryPrice * 1.005 * 100) / 100
          : 0;

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
        openTime: alert.timestamp
          ? new Date(alert.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
          : 'الآن',
        duration: 'الآن',
        pips: 0,
        entryPrice,
        currentPrice: entryPrice,
        tp1,
        sl,
        riskReward: entryPrice > 0 ? '1:2.4' : 'N/A',
        strategy: 'TradingView PineScript Alert',
        confidence: 90,
        notesAr: text,
        textMsg: text,
        isBotSignal: true,
        isBlurredForFree: false,
        accessLevel: 'vip',
        originCollection: 'bot_alerts',
        timestampMs: alert.timestampMs || Date.now()
      });
    }
  });

  mergedTrades.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
  const cappedTrades = mergedTrades.slice(0, LIVE_SIGNALS_LIMIT);

  return (
    <SignalsContext.Provider
      value={{
        signals,
        trades: cappedTrades,
        botAlerts,
        loading,
        botAlertsLoading,
        toasts,
        dbError,
        unreadDmCount,
        notificationPermission,
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
