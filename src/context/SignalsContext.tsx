import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { soundManager } from '../utils/audio';
import { DailyTrade, TradeSource, DailyTradeStatus } from '../types/trading';
import { ToastContainer, ToastItem } from '../components/common/ToastContainer';
import { hasFeatureAccess } from '../utils/entitlements';
import { subscribeToAuth } from '../services/firebaseAuthService';
import {
  AppNotificationPermission,
  dispatchMobileAppNotification,
  getNotificationPermissionState,
  requestAppNotificationPermission
} from '../utils/mobileNotifications';
import { isDocumentDeleted, markDocumentDeleted } from '../utils/legacyDbRecovery';

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
  unreadChatCount: number;
  unreadTradesCount: number;
  notificationPermission: AppNotificationPermission;
  setDbError: (err: string | null) => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  removeSignalLocally: (id: string) => void;
  requestNotificationPermission: () => Promise<AppNotificationPermission>;
  markChatAsRead: () => void;
  markTradesAsRead: () => void;
  markDmAsRead: () => void;
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
  unreadChatCount: 0,
  unreadTradesCount: 0,
  notificationPermission: 'default',
  setDbError: () => {},
  addToast: () => {},
  removeToast: () => {},
  removeSignalLocally: () => {},
  requestNotificationPermission: async () => 'default',
  markChatAsRead: () => {},
  markTradesAsRead: () => {},
  markDmAsRead: () => {}
});

const SUPER_ADMIN_EMAIL = 'moe.albzour@gmail.com';
const LIVE_SIGNALS_LIMIT = 20;
const CACHED_SIGNALS_KEY = 'mbk_cached_signals_v1';
const CACHED_TRADES_KEY = 'mbk_cached_trades_v1';
const CACHED_BOT_ALERTS_KEY = 'mbk_cached_bot_alerts_v1';

function isSignalIdDeleted(rawId: string): boolean {
  if (!rawId) return false;
  const cleanId = rawId.replace(/^bot-/, '');
  return isDocumentDeleted(rawId) || isDocumentDeleted(cleanId) || isDocumentDeleted(`bot-${cleanId}`);
}

function isFirestoreQuotaError(error: any): boolean {
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || error || '').toLowerCase();
  return code === 'resource-exhausted' || msg.includes('quota') || msg.includes('resource-exhausted');
}

function readCachedJson<T extends Array<{ id: string }>>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item && !isSignalIdDeleted(String(item.id || ''))) as unknown as T;
      }
    }
  } catch {
    // ignore
  }
  return fallback;
}

export const SignalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signals, setSignals] = useState<ChannelSignalItem[]>(() =>
    readCachedJson<ChannelSignalItem[]>(CACHED_SIGNALS_KEY, [])
  );
  const [rawTrades, setRawTrades] = useState<DailyTrade[]>(() =>
    readCachedJson<DailyTrade[]>(CACHED_TRADES_KEY, [])
  );
  const [botAlerts, setBotAlerts] = useState<BotAlertItem[]>(() =>
    readCachedJson<BotAlertItem[]>(CACHED_BOT_ALERTS_KEY, [])
  );
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
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [unreadTradesCount, setUnreadTradesCount] = useState<number>(0);

  const markChatAsRead = useCallback(() => {
    setUnreadChatCount(0);
    try {
      localStorage.setItem('mbk_last_seen_chat_ms', String(Date.now()));
    } catch {
      // ignore storage errors
    }
  }, []);

  const markTradesAsRead = useCallback(() => {
    setUnreadTradesCount(0);
    try {
      localStorage.setItem('mbk_last_seen_trades_ms', String(Date.now()));
    } catch {
      // ignore storage errors
    }
  }, []);

  const markDmAsRead = useCallback(() => setUnreadDmCount(0), []);

  // Sync PWA App Shortcut / Icon Badge & Browser Tab Title
  const totalUnread = unreadDmCount + unreadChatCount + unreadTradesCount;
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const baseTitle = 'MBK Trading — منصة التداول الذكية';
      document.title = totalUnread > 0 ? `(${totalUnread}) ${baseTitle}` : baseTitle;
    }

    if (typeof navigator !== 'undefined') {
      if ('setAppBadge' in navigator) {
        if (totalUnread > 0) {
          (navigator as any).setAppBadge(totalUnread).catch(() => {});
        } else {
          (navigator as any).clearAppBadge?.().catch(() => {});
        }
      }

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'SET_BADGE',
            count: totalUnread
          });
        } catch {
          // ignore
        }
      }
    }
  }, [totalUnread]);

  const [notificationPermission, setNotificationPermission] = useState<AppNotificationPermission>(() =>
    getNotificationPermissionState()
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeSignalLocally = useCallback((rawId: string) => {
    if (!rawId) return;
    const cleanId = rawId.replace(/^bot-/, '');
    markDocumentDeleted(cleanId);
    markDocumentDeleted(rawId);
    markDocumentDeleted(`bot-${cleanId}`);

    setSignals((prev) => {
      const next = prev.filter((s) => s.id !== cleanId && s.id !== rawId && !isSignalIdDeleted(s.id));
      try {
        localStorage.setItem(CACHED_SIGNALS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    setRawTrades((prev) => {
      const next = prev.filter((t) => t.id !== cleanId && t.id !== rawId && !isSignalIdDeleted(t.id));
      try {
        localStorage.setItem(CACHED_TRADES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    setBotAlerts((prev) => {
      const next = prev.filter((b) => b.id !== cleanId && b.id !== rawId && !isSignalIdDeleted(b.id));
      try {
        localStorage.setItem(CACHED_BOT_ALERTS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
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

  // Track authenticated user VIP/Elite/Feature-Trial/Admin status via shared singleton auth listener (0 extra reads)
  useEffect(() => {
    const unsubscribe = subscribeToAuth((profile) => {
      if (!profile) {
        setCurrentUserUid(null);
        setCanReadVipSignals(false);
        setCanReadBotAlerts(false);
        setCanReadVipChat(false);
        setUnreadDmCount(0);
        setAuthResolved(true);
        return;
      }

      const uid = profile.uid || profile.id || null;
      setCurrentUserUid(uid);

      const isSuperAdmin = profile.email?.toLowerCase() === SUPER_ADMIN_EMAIL || profile.isAdmin;
      if (isSuperAdmin) {
        setCanReadVipSignals(true);
        setCanReadBotAlerts(true);
        setCanReadVipChat(true);
        setAuthResolved(true);
        return;
      }

      setCanReadVipSignals(hasFeatureAccess(profile, 'vipSignals'));
      setCanReadBotAlerts(hasFeatureAccess(profile, 'botSignals'));
      setCanReadVipChat(!profile.isBanned);
      setAuthResolved(true);
    });

    return () => unsubscribe();
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
                setUnreadTradesCount((prev) => prev + 1);
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
            if (isSignalIdDeleted(docId)) return;

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
              sourceLabelAr: data.sourceLabelAr || (isBot ? 'بوت MBK' : isVip ? 'توصية VIP' : 'عام'),
              sourceLabelEn: data.sourceLabelEn || (isBot ? 'MBK Bot' : isVip ? 'VIP Signal' : 'Free'),
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

          const nextSignals = liveSignals.slice(0, LIVE_SIGNALS_LIMIT);
          const nextTrades = liveTrades.slice(0, LIVE_SIGNALS_LIMIT);

          setSignals(() => nextSignals);
          setRawTrades(() => nextTrades);
          try {
            localStorage.setItem(CACHED_SIGNALS_KEY, JSON.stringify(nextSignals));
            localStorage.setItem(CACHED_TRADES_KEY, JSON.stringify(nextTrades));
          } catch {
            // ignore storage errors
          }

          isFirstSignalsSnapshot = false;
          setLoading(false);
        } catch (procErr: any) {
          console.warn('[SignalsContext] Signals snapshot processing notice:', procErr?.message || procErr);
          setLoading(false);
        }
      },
      (error) => {
        if (isFirestoreQuotaError(error)) {
          console.warn(
            '[SignalsContext] Firestore daily read quota reached for signals; serving cached signals until quota resets.'
          );
          setLoading(false);
          return;
        }
        console.warn('[SignalsContext] Firestore signals listener notice:', error?.message || error);
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
                const text = data.text || 'MBK Bot Alert';
                const isRecent = data.timestampMs ? data.timestampMs > Date.now() - 5 * 60 * 1000 : true;

                if (!isFirstBotSnapshot && isRecent) {
                  setUnreadTradesCount((prev) => prev + 1);
                  triggerAudioAlert();

                  addToast({
                    title: 'بوت MBK 🤖',
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
              if (isSignalIdDeleted(docSnap.id)) return;
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
            const nextBotAlerts = rawAlerts.slice(0, LIVE_SIGNALS_LIMIT);

            setBotAlerts(() => nextBotAlerts);
            try {
              localStorage.setItem(CACHED_BOT_ALERTS_KEY, JSON.stringify(nextBotAlerts));
            } catch {
              // ignore storage errors
            }

            isFirstBotSnapshot = false;
            setBotAlertsLoading(false);
          } catch (procErr: any) {
            console.warn('[SignalsContext] bot_alerts snapshot processing notice:', procErr?.message || procErr);
            setBotAlertsLoading(false);
          }
        },
        (error) => {
          if (isFirestoreQuotaError(error)) {
            console.warn(
              '[SignalsContext] Firestore daily read quota reached for bot_alerts; serving cached bot alerts until quota resets.'
            );
            setBotAlertsLoading(false);
            return;
          }
          console.warn('[SignalsContext] Firestore bot_alerts listener notice:', error?.message || error);
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
      where('participants', 'array-contains', currentUserUid),
      limit(30)
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
                setUnreadChatCount((prev) => prev + 1);
                const senderName = d.displayName || 'Trader';
                const msgBody = (d.text || '[صورة شارت]').toString().slice(0, 120);

                triggerAudioAlert();
                addToast({
                  title: `الشات العام • ${senderName} 💬`,
                  message: msgBody,
                  type: 'info',
                  timestamp: 'الآن'
                });
                sendBrowserNotification(`الشات العام • ${senderName}`, msgBody, `general-chat-${change.doc.id}`);
              }
            });
          }
          isFirstChatSnapshot = false;
        },
        (err) => {
          console.warn('[SignalsContext] Global chat notification notice:', err?.message || err);
        }
      );
    }

    return () => {
      unsubDm();
      if (unsubChat) unsubChat();
    };
  }, [authResolved, currentUserUid, canReadVipChat, addToast, sendBrowserNotification, triggerAudioAlert]);

  // Merge raw bot_alerts into trades array, capped at latest 30 signals
  const mergedTrades: DailyTrade[] = rawTrades.filter((t) => !isSignalIdDeleted(t.id));
  const existingTradeIds = new Set(mergedTrades.map((t) => t.id));

  botAlerts.forEach((alert) => {
    if (!isSignalIdDeleted(alert.id) && !existingTradeIds.has(alert.id)) {
      const text = alert.text || '';

      mergedTrades.push({
        id: `bot-${alert.id}`,
        symbol: 'US100',
        nameAr: 'MBK Bot',
        action: 'BUY',
        source: 'BOT_WEBHOOK',
        sourceLabelAr: 'بوت MBK',
        sourceLabelEn: 'MBK Bot',
        status: 'RUNNING',
        statusLabelAr: 'بوت MBK 🤖',
        openTime: alert.timestamp
          ? new Date(alert.timestamp).toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          : 'الآن',
        duration: 'الآن',
        pips: 0,
        entryPrice: 0,
        currentPrice: 0,
        tp1: 0,
        sl: 0,
        riskReward: 'N/A',
        strategy: 'MBK Bot',
        confidence: 100,
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
        signals: signals.filter((s) => !isSignalIdDeleted(s.id)),
        trades: cappedTrades,
        botAlerts: botAlerts.filter((b) => !isSignalIdDeleted(b.id)),
        loading,
        botAlertsLoading,
        toasts,
        dbError,
        unreadDmCount,
        unreadChatCount,
        unreadTradesCount,
        notificationPermission,
        setDbError,
        addToast,
        removeToast,
        removeSignalLocally,
        requestNotificationPermission,
        markChatAsRead,
        markTradesAsRead,
        markDmAsRead
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </SignalsContext.Provider>
  );
};

export const useSignalsContext = () => useContext(SignalsContext);
