import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, setDoc, where } from 'firebase/firestore';
import { auth, db, legacyDb } from '../lib/firebase';
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
  unreadChatCount: number;
  unreadTradesCount: number;
  notificationPermission: AppNotificationPermission;
  setDbError: (err: string | null) => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
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

function isFirestoreQuotaError(error: any): boolean {
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || error || '').toLowerCase();
  return code === 'resource-exhausted' || msg.includes('quota') || msg.includes('resource-exhausted');
}

function readCachedJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as unknown as T;
    }
  } catch {
    // ignore
  }
  return fallback;
}

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
          setCanReadVipChat(!profile?.isBanned);
          setAuthResolved(true);
        },
        (err) => {
          console.warn('[SignalsContext] User role listener notice:', err?.message || err);
          setCanReadVipSignals(false);
          setCanReadBotAlerts(false);
          setCanReadVipChat(true);
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

          // Merge with locally cached signals/trades so no previously loaded signal disappears during database migration
          const loadedSignalIds = new Set(liveSignals.map((s) => s.id));
          const cachedSignals = readCachedJson<ChannelSignalItem[]>(CACHED_SIGNALS_KEY, []);
          const cachedTrades = readCachedJson<DailyTrade[]>(CACHED_TRADES_KEY, []);
          const isSuperAdmin =
            auth.currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL && auth.currentUser?.emailVerified;

          for (const cSig of cachedSignals) {
            if (cSig && cSig.id && !loadedSignalIds.has(cSig.id)) {
              liveSignals.push(cSig);
              loadedSignalIds.add(cSig.id);
              if (isSuperAdmin) {
                const isVipSig = cSig.channel === 'vip' || cSig.accessLevel === 'vip';
                const isBotSig = cSig.channel === 'bot' || cSig.source === 'BOT_WEBHOOK';
                setDoc(doc(db, 'signals', cSig.id), {
                  symbol: cSig.symbol || 'US100',
                  nameAr: cSig.symbol || 'US100',
                  action: cSig.action || 'BUY',
                  orderType: cSig.action || 'BUY',
                  type: cSig.action || 'BUY',
                  source: cSig.source || (isBotSig ? 'BOT_WEBHOOK' : isVipSig ? 'VIP_MANUAL' : 'FREE_PUBLIC'),
                  entryPrice: Number(cSig.entryPrice || 0),
                  currentPrice: Number(cSig.entryPrice || 0),
                  tp1: Number(cSig.tp1 || 0),
                  tp2: Number(cSig.tp2 || 0),
                  sl: Number(cSig.sl || 0),
                  pips: Number(cSig.pips || 0),
                  strategy: cSig.strategy || 'MBK Strategy',
                  timeframe: cSig.timeframe || '15m',
                  accessLevel: cSig.accessLevel || (isVipSig ? 'vip' : 'free'),
                  access_level: cSig.accessLevel || (isVipSig ? 'vip' : 'free'),
                  confidence: Number(cSig.confidence || 92),
                  notesAr: cSig.instructionsAr || '',
                  notesEn: cSig.instructionsEn || '',
                  instructionsAr: cSig.instructionsAr || '',
                  instructionsEn: cSig.instructionsEn || '',
                  author: cSig.author || 'MBK Chief Admin',
                  authorRole: cSig.authorRole || 'ADMIN',
                  status: cSig.status || 'RUNNING',
                  openTime: cSig.openTime || cSig.timeAgo || 'الآن',
                  duration: cSig.duration || 'الآن',
                  channel: cSig.channel || 'vip',
                  isBlurredForFree: Boolean(cSig.isBlurredForFree || isVipSig),
                  isBotSignal: isBotSig,
                  createdAt: new Date(cSig.timestampMs || Date.now()).toISOString(),
                  timestampMs: Number(cSig.timestampMs || Date.now())
                }, { merge: true }).catch(() => {});
              }
            }
          }

          const loadedTradeIds = new Set(liveTrades.map((t) => t.id));
          for (const cTrade of cachedTrades) {
            if (cTrade && cTrade.id && !loadedTradeIds.has(cTrade.id) && !cTrade.id.startsWith('bot-')) {
              liveTrades.push(cTrade);
              loadedTradeIds.add(cTrade.id);
            }
          }

          liveSignals.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
          liveTrades.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));

          const nextSignals = liveSignals.slice(0, LIVE_SIGNALS_LIMIT);
          const nextTrades = liveTrades.slice(0, LIVE_SIGNALS_LIMIT);

          setSignals(() => nextSignals);
          setRawTrades(() => nextTrades);
          try {
            if (nextSignals.length > 0) {
              localStorage.setItem(CACHED_SIGNALS_KEY, JSON.stringify(nextSignals));
            }
            if (nextTrades.length > 0) {
              localStorage.setItem(CACHED_TRADES_KEY, JSON.stringify(nextTrades));
            }
          } catch {
            // ignore storage errors
          }

          // Background sync of signals from legacyDb once per session when readable
          if (isSuperAdmin && !(window as any).__mbkLegacySignalsSynced) {
            (window as any).__mbkLegacySignalsSynced = true;
            getDocs(query(collection(legacyDb, 'signals'), orderBy('timestampMs', 'desc'), limit(LIVE_SIGNALS_LIMIT)))
              .then((legacySnap) => {
                legacySnap.forEach((legacyDoc) => {
                  if (!loadedSignalIds.has(legacyDoc.id)) {
                    setDoc(doc(db, 'signals', legacyDoc.id), legacyDoc.data(), { merge: true }).catch(() => {});
                  }
                });
              })
              .catch(() => {});
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
              const data = docSnap.data();
              rawAlerts.push({
                id: docSnap.id,
                text: data.text || '',
                chat_id: data.chat_id || data.chatId || null,
                timestamp: data.timestamp || new Date().toISOString(),
                timestampMs: Number(data.timestampMs || Date.now())
              });
            });

            // Merge with cached bot alerts and auto-sync missing ones to (default)
            const loadedBotIds = new Set(rawAlerts.map((a) => a.id));
            const cachedAlerts = readCachedJson<BotAlertItem[]>(CACHED_BOT_ALERTS_KEY, []);
            for (const cAlert of cachedAlerts) {
              if (cAlert && cAlert.id && !loadedBotIds.has(cAlert.id)) {
                rawAlerts.push(cAlert);
                loadedBotIds.add(cAlert.id);
                setDoc(doc(db, 'bot_alerts', cAlert.id), {
                  id: cAlert.id,
                  text: (cAlert.text || 'MBK Bot Alert').slice(0, 2000),
                  chat_id: cAlert.chat_id || null,
                  timestamp: cAlert.timestamp || new Date().toISOString(),
                  timestampMs: Math.trunc(Number(cAlert.timestampMs || Date.now()))
                }).catch(() => {});
              }
            }

            rawAlerts.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
            const nextBotAlerts = rawAlerts.slice(0, LIVE_SIGNALS_LIMIT);

            setBotAlerts(() => nextBotAlerts);
            try {
              if (nextBotAlerts.length > 0) {
                localStorage.setItem(CACHED_BOT_ALERTS_KEY, JSON.stringify(nextBotAlerts));
              }
            } catch {
              // ignore storage errors
            }

            // Background sync of bot_alerts from legacyDb once per session when readable
            if (!(window as any).__mbkLegacyBotAlertsSynced) {
              (window as any).__mbkLegacyBotAlertsSynced = true;
              getDocs(query(collection(legacyDb, 'bot_alerts'), orderBy('timestampMs', 'desc'), limit(LIVE_SIGNALS_LIMIT)))
                .then((legacySnap) => {
                  legacySnap.forEach((legacyDoc) => {
                    if (!loadedBotIds.has(legacyDoc.id)) {
                      const d = legacyDoc.data();
                      setDoc(doc(db, 'bot_alerts', legacyDoc.id), {
                        id: legacyDoc.id,
                        text: String(d.text || 'MBK Bot Alert').slice(0, 2000),
                        chat_id: d.chat_id || null,
                        timestamp: String(d.timestamp || new Date().toISOString()),
                        timestampMs: Math.trunc(Number(d.timestampMs || Date.now()))
                      }).catch(() => {});
                    }
                  });
                })
                .catch(() => {});
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
  const mergedTrades: DailyTrade[] = [...rawTrades];
  const existingTradeIds = new Set(rawTrades.map((t) => t.id));

  botAlerts.forEach((alert) => {
    if (!existingTradeIds.has(alert.id)) {
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
        signals,
        trades: cappedTrades,
        botAlerts,
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
