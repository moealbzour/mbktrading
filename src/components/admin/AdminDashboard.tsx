import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Newspaper,
  Calendar,
  Crown,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Flame,
  Search,
  Lock,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Zap,
  TrendingUp,
  Filter,
  Check,
  X,
  Database,
  Sparkles,
  Clock,
  ArrowRight,
  Send,
  Phone,
  Globe,
  DollarSign,
  Ban,
  VolumeX,
  MessageSquare,
  Award,
  Calendar as CalendarIcon,
  Sliders,
  Key,
  Copy,
  Download,
  Gem,
  Settings,
  Save,
  MessageCircle,
  Radio,
  Megaphone
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, updateDoc, deleteDoc, writeBatch, serverTimestamp, getDocs, query, limit } from 'firebase/firestore';
import { auth, db, legacyDb } from '../../lib/firebase';
import { soundManager } from '../../utils/audio';
import { formatKeyDurationLabel } from '../../utils/activationKeyService';
import { syncAllLegacyDataToDefaultDb } from '../../utils/legacyDbRecovery';
import {
  DEFAULT_PLATFORM_SETTINGS,
  buildWhatsAppUrl,
  formatTelegramHandle,
  normalizeTelegramUrl,
  savePlatformSettings,
  subscribeToPlatformSettings
} from '../../services/platformSettingsService';
import {
  FEATURE_CATALOG,
  FeatureKey,
  SubscriptionTier,
  getEffectiveTier,
  getActiveTrialFeatures,
  formatExpiryShort,
  getFeatureLabel
} from '../../utils/entitlements';

import { SubscriptionCountdown } from '../common/SubscriptionCountdown';
import { PublishingCenter } from './PublishingCenter';
import { AdminBroadcastsTab } from './AdminBroadcastsTab';

export interface ActivationKeyRecord {
  id: string;
  code: string;
  durationInDays: number;
  durationLabel?: string;
  keyType?: 'vip' | 'elite' | 'trial';
  grantTier?: 'vip' | 'elite' | 'custom';
  grantFeatures?: FeatureKey[];
  status: 'active' | 'used' | 'revoked';
  createdAt?: string;
  createdBy?: string;
  usedByUserId?: string;
  usedByUserEmail?: string;
  usedAt?: string;
}

export interface AdminUserRecord {
  id: string;
  uid: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'MODERATOR' | 'SALES' | 'VIP' | 'ELITE' | 'FREE' | string;
  tier?: SubscriptionTier;
  isVip?: boolean;
  vipAccess?: boolean;
  isElite?: boolean;
  vipExpiryDate?: string | null;
  eliteExpiryDate?: string | null;
  grantedFeatures?: Partial<Record<FeatureKey, string>>;
  displayName: string;
  avatar?: string;
  phone?: string;
  country?: string;
  dob?: string;
  experienceLevel?: string;
  assetClasses?: string[];
  favoritePairs?: string;
  totalPaid?: number;
  isBanned?: boolean;
  isMutedFromChat?: boolean;
  subscriptionStatus?: 'active' | 'expired' | 'none';
  subscriptionEndDate?: string | null;
  createdAt?: string;
  lastActiveAt?: string;
}

export interface AdminNewsRecord {
  id: string;
  title: string;
  titleAr?: string;
  link: string;
  source: string;
  category: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  impactScore?: number;
  createdAt: string;
}

export interface AdminCalendarRecord {
  id: string;
  time: string;
  country: string;
  currency: string;
  event: string;
  eventAr?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actual: string;
  forecast: string;
  previous: string;
  date: string;
  createdAt?: string;
}

interface Props {
  currentRole?: string;
  isAdmin?: boolean;
  lang?: 'ar' | 'en';
  onClose?: () => void;
}

export const AdminDashboard: React.FC<Props> = ({
  currentRole = 'free',
  isAdmin = false,
  lang = 'ar',
  onClose
}) => {
  const isAr = lang === 'ar';
  const [firestoreRole, setFirestoreRole] = useState<string | null>(() => {
    if (auth.currentUser?.email?.toLowerCase() === 'moe.albzour@gmail.com') {
      return 'admin';
    }
    return null;
  });
  const [dbQuotaExceeded, setDbQuotaExceeded] = useState<boolean>(false);
  const [crmRetryTick, setCrmRetryTick] = useState<number>(0);

  // Check logged-in user's role from Firestore 'users' collection
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (authUser) => {
      if (!authUser) {
        setFirestoreRole(null);
        return;
      }
      if (authUser.email?.toLowerCase() === 'moe.albzour@gmail.com') {
        setFirestoreRole('admin');
        return;
      }
      try {
        const userDocRef = doc(db, 'users', authUser.uid);
        const unsubDoc = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setFirestoreRole((data.role || 'free').toString().toLowerCase());
            } else {
              setFirestoreRole('free');
            }
          },
          (err) => {
            console.warn('Admin role Firestore check notice:', err);
          }
        );

        return () => unsubDoc();
      } catch (err) {
        console.warn('Error setting up admin role listener:', err);
      }
    });

    return () => unsubAuth();
  }, []);

  // Staff roles allowed to access dashboard: admin, moderator, sales, analyser
  const effectiveRole = (
    firestoreRole ||
    (auth.currentUser?.email?.toLowerCase() === 'moe.albzour@gmail.com' ? 'admin' : '') ||
    currentRole ||
    ''
  )
    .toString()
    .toLowerCase();
  const isStaff =
    ['admin', 'moderator', 'sales', 'analyser', 'analyst'].includes(effectiveRole) ||
    Boolean(isAdmin);
  const isFullAdmin = effectiveRole === 'admin' || Boolean(isAdmin);
  const isAnalyserOnly = ['analyser', 'analyst'].includes(effectiveRole) && !isFullAdmin;

  const [activeTab, setActiveTab] = useState<'users' | 'broadcasts' | 'news' | 'calendar' | 'overview' | 'publishing' | 'keys' | 'settings'>(
    isAnalyserOnly ? 'publishing' : 'users'
  );

  useEffect(() => {
    if (isAnalyserOnly && activeTab === 'users') {
      setActiveTab('publishing');
    }
  }, [isAnalyserOnly, activeTab]);

  // ================= ACTIVATION KEYS & TRIAL GENERATOR STATE =================
  const [activationKeys, setActivationKeys] = useState<ActivationKeyRecord[]>(() => {
    try {
      const saved = localStorage.getItem('mbk_admin_cached_keys_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [bulkKeyTier, setBulkKeyTier] = useState<'vip' | 'elite'>('vip');
  const [selectedKeyDays, setSelectedKeyDays] = useState<number>(30);
  const [bulkKeyQuantity, setBulkKeyQuantity] = useState<number>(50);
  const [isGeneratingKey, setIsGeneratingKey] = useState<boolean>(false);
  const [copiedKeyCode, setCopiedKeyCode] = useState<string | null>(null);
  const [lastGeneratedBatch, setLastGeneratedBatch] = useState<ActivationKeyRecord[]>([]);
  const [keyStatusFilter, setKeyStatusFilter] = useState<'ALL' | 'active' | 'used' | 'revoked'>('ALL');
  const [keySearchQuery, setKeySearchQuery] = useState('');

  // Trial Code Generator State
  const [trialTargetMode, setTrialTargetMode] = useState<'custom' | 'vip' | 'elite'>('custom');
  const [trialSelectedFeatures, setTrialSelectedFeatures] = useState<FeatureKey[]>(['botSignals', 'vipSignals']);
  const [trialDurationDays, setTrialDurationDays] = useState<number>(3);
  const [trialQuantity, setTrialQuantity] = useState<number>(10);
  const [isGeneratingTrial, setIsGeneratingTrial] = useState<boolean>(false);
  const [lastGeneratedTrialBatch, setLastGeneratedTrialBatch] = useState<ActivationKeyRecord[]>([]);

  // ================= USERS & CRM STATE =================
  const [users, setUsers] = useState<AdminUserRecord[]>(() => {
    try {
      const saved = localStorage.getItem('mbk_admin_cached_users_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterTab, setUserFilterTab] = useState<'ALL' | 'EXPIRING_SOON' | 'VIP' | 'ELITE' | 'FREE' | 'BANNED' | 'MUTED' | 'STAFF'>('ALL');

  // CRM Profile Inspector Modal State
  const [inspectUser, setInspectUser] = useState<AdminUserRecord | null>(null);
  const [directTierTarget, setDirectTierTarget] = useState<'vip' | 'elite'>('vip');
  const [directTierMode, setDirectTierMode] = useState<'days' | 'date'>('days');
  const [directTierDays, setDirectTierDays] = useState<number>(30);
  const [directTierCustomDate, setDirectTierCustomDate] = useState<string>(() => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [isUpdatingTier, setIsUpdatingTier] = useState(false);

  const [featureGrantDays, setFeatureGrantDays] = useState<Record<FeatureKey, number>>({
    botSignals: 3,
    vipSignals: 3,
    vipChat: 3,
    standardAi: 3
  });
  const [featureGrantDates, setFeatureGrantDates] = useState<Record<FeatureKey, string>>({
    botSignals: '',
    vipSignals: '',
    vipChat: '',
    standardAi: ''
  });
  const [busyFeatureKey, setBusyFeatureKey] = useState<FeatureKey | null>(null);

  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('100');
  const [paymentDurationInput, setPaymentDurationInput] = useState<'30' | '90' | '180' | '365' | 'lifetime'>('30');
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);

  // ================= PLATFORM SETTINGS STATE (settings/platform) =================
  const [settingsWhatsapp, setSettingsWhatsapp] = useState<string>(DEFAULT_PLATFORM_SETTINGS.whatsappNumber);
  const [settingsTelegram, setSettingsTelegram] = useState<string>(DEFAULT_PLATFORM_SETTINGS.telegramUrl);
  const [settingsEmail, setSettingsEmail] = useState<string>(DEFAULT_PLATFORM_SETTINGS.supportEmail);
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<string | undefined>(undefined);
  const [settingsUpdatedBy, setSettingsUpdatedBy] = useState<string | undefined>(undefined);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isWipingBotAlerts, setIsWipingBotAlerts] = useState<boolean>(false);
  const [confirmWipeBots, setConfirmWipeBots] = useState<boolean>(false);
  const [isPushingAppUpdate, setIsPushingAppUpdate] = useState<boolean>(false);
  const [remoteAppVersionInfo, setRemoteAppVersionInfo] = useState<{
    versionId?: string;
    versionLabel?: string;
    updatedAt?: string;
    updatedBy?: string;
  } | null>(null);

  useEffect(() => {
    if (!isStaff) return;
    const unsubVer = onSnapshot(
      doc(db, 'settings', 'app_version'),
      (snap) => {
        if (snap.exists()) {
          setRemoteAppVersionInfo(snap.data() as any);
        }
      },
      () => {
        // ignore
      }
    );
    return () => unsubVer();
  }, [isStaff]);

  const handlePushAppUpdateToAllUsers = async () => {
    if (!isFullAdmin || isPushingAppUpdate) return;
    soundManager.playClick();
    setIsPushingAppUpdate(true);
    try {
      const nowMs = Date.now();
      const newVersionId = `v-${nowMs}`;
      const nowIso = new Date(nowMs).toISOString();
      const updatedBy = auth.currentUser?.email || 'Admin';
      const versionLabel = new Date(nowMs).toLocaleString();

      // Pre-save on admin's own browser so the admin sees confirmation first, then refreshes cleanly
      try {
        localStorage.setItem('mbk_synced_remote_version', newVersionId);
        localStorage.setItem('mbk_tv_nav_rail_folded', 'false');
        localStorage.setItem('mbk_tv_sidebar_shrinked', 'false');
        localStorage.setItem('mbk_tv_bottom_panel_folded', 'false');
      } catch {
        // ignore
      }

      await setDoc(doc(db, 'settings', 'app_version'), {
        versionId: newVersionId,
        versionLabel,
        forceReloadAtMs: nowMs,
        resetLayout: true,
        updatedAt: nowIso,
        updatedBy
      });

      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? '🚀 تم دفع التحديث بنجاح لجميع أجهزة اللابتوب والموبايل والاختصارات (PWA) في الوقت الفعلي دون إخراجهم من حساباتهم!'
          : '🚀 Update pushed live to all connected laptops, mobiles, and PWA shortcuts without signing them out!'
      );
    } catch (err: any) {
      showFeedback(
        'error',
        err?.message || (isAr ? 'فشل دفع التحديث للمستخدمين' : 'Failed to push app update')
      );
    } finally {
      setIsPushingAppUpdate(false);
    }
  };

  const handleWipeAllBotAlerts = async () => {
    if (!isFullAdmin) return;
    soundManager.playClick();
    if (!confirmWipeBots) {
      setConfirmWipeBots(true);
      return;
    }

    setConfirmWipeBots(false);
    setIsWipingBotAlerts(true);
    try {
      const snap = await getDocs(collection(db, 'bot_alerts'));
      const docs = snap.docs;
      const chunkSize = 400;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
      soundManager.playSuccess();
      showFeedback(
        'success',
        isAr
          ? `تم تفريغ وحذف جميع تنبيهات وبوت الـ Webhook (${docs.length}) بنجاح!`
          : `All bot server signals (${docs.length}) wiped successfully!`
      );
    } catch (err: any) {
      showFeedback(
        'error',
        err?.message || (isAr ? 'فشل حذف تنبيهات البوت' : 'Failed to wipe bot alerts')
      );
    } finally {
      setIsWipingBotAlerts(false);
    }
  };

  const handleSimulateBotAlert = async () => {
    if (!isFullAdmin) return;
    soundManager.playClick();
    try {
      const nowMs = Date.now();
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const alertId = `alert-${nowMs}-${randomSuffix}`;
      const alertDoc = {
        id: alertId,
        text: isAr
          ? '🤖 [محاكاة Webhook تجريبي] BUY XAUUSD @ 2680.00 - TP1: 2700.00 SL: 2665.00'
          : '🤖 [Test Webhook Simulation] BUY XAUUSD @ 2680.00 - TP1: 2700.00 SL: 2665.00',
        chat_id: null,
        timestamp: new Date(nowMs).toISOString(),
        timestampMs: nowMs
      };
      await setDoc(doc(db, 'bot_alerts', alertId), alertDoc);
      soundManager.playSuccess();
      showFeedback(
        'success',
        isAr ? 'تم إرسال وتوليد تنبيه Webhook التجريبي بنجاح!' : 'Test webhook simulation alert sent successfully!'
      );
    } catch (err: any) {
      showFeedback(
        'error',
        err?.message || (isAr ? 'فشل إرسال التنبيه التجريبي' : 'Failed to send test alert')
      );
    }
  };

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const [isSyncingLegacyDb, setIsSyncingLegacyDb] = useState(false);

  const handleSyncLegacyData = async (silent: boolean = false) => {
    if (!isStaff) return;
    if (!silent) {
      soundManager.playClick();
    }
    setIsSyncingLegacyDb(true);
    try {
      const stats = await syncAllLegacyDataToDefaultDb();
      const totalRecovered =
        stats.usersRecovered +
        stats.signalsRecovered +
        stats.botAlertsRecovered +
        stats.publicChatRecovered +
        stats.chatProfilesRecovered +
        stats.dmConversationsRecovered +
        stats.dmMessagesRecovered +
        stats.activationKeysRecovered;

      if (!silent) {
        if (stats.legacyDbStatus === 'quota_locked' && totalRecovered === 0) {
          showFeedback(
            'info',
            isAr
              ? 'تم استعادة السجلات المتوفرة محلياً. ملاحظة: قاعدة البيانات القديمة لا تزال تحت قفل الحصة اليومية (Quota 429) من Google؛ اضغط على "فتح قفل قاعدة البيانات القديمة في Firebase" أو ستتم استعادة باقي المحادثات والصفقات تلقائياً فور تصفير العداد اليومي.'
              : 'Local records restored. Note: The old database instance is still under Google’s daily 429 read lock; click "Unlock Old Database in Firebase" or remaining history will auto-sync as soon as the daily counter resets.'
          );
        } else {
          soundManager.playSuccess();
          showFeedback(
            'success',
            isAr
              ? `✅ تمت استعادة ومزامنة البيانات بنجاح (الأعضاء: ${stats.usersRecovered}، الصفقات: ${stats.signalsRecovered}، الشات: ${stats.publicChatRecovered}، الرسائل الخاصة: ${stats.dmConversationsRecovered})!`
              : `✅ Historical data restored & synced (Users: ${stats.usersRecovered}, Trades: ${stats.signalsRecovered}, Chat: ${stats.publicChatRecovered}, DMs: ${stats.dmConversationsRecovered})!`
          );
        }
      }
    } catch (err: any) {
      if (!silent) {
        showFeedback('error', err?.message || (isAr ? 'حدث خطأ أثناء الاستعادة' : 'Recovery error'));
      }
    } finally {
      setIsSyncingLegacyDb(false);
    }
  };

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const runAutoRecovery = async () => {
      if (cancelled) return;
      try {
        const stats = await syncAllLegacyDataToDefaultDb();
        if (!cancelled && stats.legacyDbStatus === 'quota_locked') {
          timer = setTimeout(runAutoRecovery, 30000);
        }
      } catch {
        if (!cancelled) {
          timer = setTimeout(runAutoRecovery, 45000);
        }
      }
    };

    runAutoRecovery();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    const unsubSettings = subscribeToPlatformSettings((settings) => {
      setSettingsWhatsapp(settings.whatsappNumber || '');
      setSettingsTelegram(settings.telegramUrl || '');
      setSettingsEmail(settings.supportEmail || DEFAULT_PLATFORM_SETTINGS.supportEmail);
      setSettingsUpdatedAt(settings.updatedAt);
      setSettingsUpdatedBy(settings.updatedBy);
    });
    return () => unsubSettings();
  }, [isStaff]);

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFullAdmin) {
      showFeedback('error', isAr ? 'صلاحية تعديل إعدادات المنصة مخصصة للمدير العام فقط.' : 'Only full Admins can update platform settings.');
      return;
    }
    setIsSavingSettings(true);
    soundManager.playClick();
    try {
      const saved = await savePlatformSettings({
        whatsappNumber: settingsWhatsapp,
        telegramUrl: settingsTelegram,
        supportEmail: settingsEmail
      });
      setSettingsWhatsapp(saved.whatsappNumber);
      setSettingsTelegram(saved.telegramUrl);
      setSettingsEmail(saved.supportEmail);
      setSettingsUpdatedAt(saved.updatedAt);
      setSettingsUpdatedBy(saved.updatedBy);
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr ? 'تم حفظ روابط التواصل في إعدادات المنصة بنجاح وتحديثها لجميع المستخدمين!' : 'Platform contact settings saved and synced live!'
      );
    } catch (err: any) {
      showFeedback('error', err?.message || (isAr ? 'فشل حفظ الإعدادات في Firestore' : 'Failed to save platform settings'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ================= REAL-TIME FIRESTORE ACTIVATION KEYS LISTENER (LAZY-LOADED ON KEYS TAB) =================
  useEffect(() => {
    if (!isStaff || activeTab !== 'keys') return;
    try {
      const keysQuery = query(collection(db, 'activation_keys'), limit(150));
      const unsubKeys = onSnapshot(
        keysQuery,
        (snapshot) => {
          const keysList: ActivationKeyRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const days = Number(data.durationInDays || 30);
            keysList.push({
              id: docSnap.id,
              code: data.code || docSnap.id,
              durationInDays: days,
              durationLabel: data.durationLabel || formatKeyDurationLabel(days),
              keyType: data.keyType || (data.grantTier === 'elite' ? 'elite' : data.grantTier === 'custom' ? 'trial' : 'vip'),
              grantTier: data.grantTier || 'vip',
              grantFeatures: Array.isArray(data.grantFeatures) ? data.grantFeatures : [],
              status: data.status || 'active',
              createdAt: data.createdAt || '',
              createdBy: data.createdBy || '',
              usedByUserId: data.usedByUserId || '',
              usedByUserEmail: data.usedByUserEmail || '',
              usedAt: data.usedAt || ''
            });
          });
          keysList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setActivationKeys(keysList);
          try {
            localStorage.setItem('mbk_admin_cached_keys_v1', JSON.stringify(keysList));
          } catch {
            // ignore
          }
        },
        (err: any) => {
          const msg = String(err?.message || err || '').toLowerCase();
          if (err?.code === 'resource-exhausted' || msg.includes('quota')) {
            setDbQuotaExceeded(true);
          }
          console.warn('activation_keys snapshot warning:', err?.message || err);
        }
      );
      return () => unsubKeys();
    } catch (err) {
      console.warn('activation_keys listener error:', err);
    }
  }, [isStaff, activeTab, crmRetryTick]);

  const generateSecureRandomCode = (tag: string): string => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(8);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    let suffix = '';
    for (let i = 0; i < 8; i++) {
      suffix += charset[bytes[i] % charset.length];
    }
    return `MBK-${tag}-${suffix}`;
  };

  const handleGenerateKey = async () => {
    const qty = Math.min(200, Math.max(1, Number(bulkKeyQuantity) || 1));
    setIsGeneratingKey(true);
    soundManager.playClick();
    try {
      let durTag = '30D';
      if (selectedKeyDays <= 1) durTag = '24H';
      else if (selectedKeyDays <= 7) durTag = '7D';
      else if (selectedKeyDays <= 30) durTag = '30D';
      else if (selectedKeyDays <= 90) durTag = '90D';
      else if (selectedKeyDays <= 365) durTag = '1Y';
      else durTag = 'LIFE';

      const tag = bulkKeyTier === 'elite' ? `ELT${durTag}` : durTag;
      const durationLabel = formatKeyDurationLabel(selectedKeyDays);
      const existingSet = new Set(activationKeys.map((k) => k.code));
      const generatedRecords: ActivationKeyRecord[] = [];
      const createdAtIso = new Date().toISOString();
      const createdBy = auth.currentUser?.email || 'admin';
      const batch = writeBatch(db);

      while (generatedRecords.length < qty) {
        const code = generateSecureRandomCode(tag);
        if (existingSet.has(code)) continue;
        existingSet.add(code);

        const record: ActivationKeyRecord = {
          id: code,
          code,
          durationInDays: selectedKeyDays,
          durationLabel,
          keyType: bulkKeyTier,
          grantTier: bulkKeyTier,
          grantFeatures: [],
          status: 'active',
          createdAt: createdAtIso,
          createdBy
        };

        batch.set(doc(db, 'activation_keys', code), {
          code,
          durationInDays: selectedKeyDays,
          durationLabel,
          keyType: bulkKeyTier,
          grantTier: bulkKeyTier,
          grantFeatures: [],
          status: 'active',
          createdAt: createdAtIso,
          createdBy
        });
        generatedRecords.push(record);
      }

      await batch.commit();
      setLastGeneratedBatch(generatedRecords);
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم توليد وحفظ ${generatedRecords.length} مفتاح تفعيل ${bulkKeyTier.toUpperCase()} بنجاح!`
          : `Successfully generated and saved ${generatedRecords.length} single-use ${bulkKeyTier.toUpperCase()} keys!`
      );
    } catch (err: any) {
      console.error('Bulk key generation failed:', err);
      showFeedback('error', err.message || 'Failed to generate keys');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleToggleTrialFeature = (key: FeatureKey) => {
    setTrialSelectedFeatures((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleGenerateTrialKeys = async () => {
    const days = Math.max(1, Math.min(36500, Number(trialDurationDays) || 3));
    const qty = Math.min(50, Math.max(1, Number(trialQuantity) || 1));

    if (trialTargetMode === 'custom' && trialSelectedFeatures.length === 0) {
      showFeedback(
        'error',
        isAr
          ? 'يرجى اختيار ميزة واحدة على الأقل للكود التجريبي المخصص.'
          : 'Please select at least one feature for a custom trial code.'
      );
      return;
    }

    setIsGeneratingTrial(true);
    soundManager.playClick();
    try {
      const tag = trialTargetMode === 'custom' ? `TRIAL${days}D` : `TRIAL${trialTargetMode.toUpperCase()}`;
      const durationLabel = formatKeyDurationLabel(days);
      const existingSet = new Set(activationKeys.map((k) => k.code));
      const generatedRecords: ActivationKeyRecord[] = [];
      const createdAtIso = new Date().toISOString();
      const createdBy = auth.currentUser?.email || 'admin';
      const batch = writeBatch(db);
      const grantFeaturesList: FeatureKey[] =
        trialTargetMode === 'custom' ? [...trialSelectedFeatures] : [];

      while (generatedRecords.length < qty) {
        const code = generateSecureRandomCode(tag);
        if (existingSet.has(code)) continue;
        existingSet.add(code);

        const record: ActivationKeyRecord = {
          id: code,
          code,
          durationInDays: days,
          durationLabel,
          keyType: 'trial',
          grantTier: trialTargetMode,
          grantFeatures: grantFeaturesList,
          status: 'active',
          createdAt: createdAtIso,
          createdBy
        };

        batch.set(doc(db, 'activation_keys', code), {
          code,
          durationInDays: days,
          durationLabel,
          keyType: 'trial',
          grantTier: trialTargetMode,
          grantFeatures: grantFeaturesList,
          status: 'active',
          createdAt: createdAtIso,
          createdBy
        });
        generatedRecords.push(record);
      }

      await batch.commit();
      setLastGeneratedTrialBatch(generatedRecords);
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم توليد ${generatedRecords.length} كود تجربة مجانية (${durationLabel}) بنجاح!`
          : `Generated ${generatedRecords.length} trial codes (${durationLabel})!`
      );
    } catch (err: any) {
      console.error('Trial key generation failed:', err);
      showFeedback('error', err.message || 'Failed to generate trial codes');
    } finally {
      setIsGeneratingTrial(false);
    }
  };

  const handleDownloadKeysCsv = (keysToExport: ActivationKeyRecord[], filenamePrefix = 'mbk-vip-keys') => {
    soundManager.playClick();
    if (!keysToExport.length) {
      showFeedback('info', isAr ? 'لا توجد مفاتيح متاحة للتصدير' : 'No keys available to export');
      return;
    }

    const escapeCsv = (val: string | number | undefined) => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Code', 'KeyType', 'GrantTier', 'GrantFeatures', 'DurationDays', 'DurationLabel', 'Status', 'CreatedAt', 'UsedByEmail'];
    const rows = keysToExport.map((k) =>
      [
        escapeCsv(k.code),
        escapeCsv(k.keyType || 'vip'),
        escapeCsv(k.grantTier || 'vip'),
        escapeCsv((k.grantFeatures || []).join(' | ')),
        escapeCsv(k.durationInDays),
        escapeCsv(k.durationLabel || formatKeyDurationLabel(k.durationInDays)),
        escapeCsv(k.status),
        escapeCsv(k.createdAt || ''),
        escapeCsv(k.usedByUserEmail || '')
      ].join(',')
    );

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteKey = async (code: string) => {
    soundManager.playClick();
    try {
      await deleteDoc(doc(db, 'activation_keys', code));
      showFeedback('success', isAr ? 'تم حذف المفتاح' : 'Key deleted');
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleRevokeKey = async (code: string) => {
    soundManager.playClick();
    try {
      await updateDoc(doc(db, 'activation_keys', code), { status: 'revoked' });
      showFeedback('success', isAr ? 'تم إلغاء تفعيل المفتاح' : 'Key revoked');
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleCopyKey = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKeyCode(code);
    soundManager.playClick();
    setTimeout(() => setCopiedKeyCode(null), 2500);
  };

  // ================= REAL-TIME FIRESTORE USER CRM LISTENER =================
  useEffect(() => {
    if (!isStaff) return;
    setUsersLoading(true);

    try {
      const usersColRef = collection(db, 'users');
      const unsub = onSnapshot(usersColRef, (snapshot) => {
        const loadedUsers: AdminUserRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const userRole = (data.role || 'free').toString().toUpperCase();
          const subEndDate = data.eliteExpiryDate || data.vipExpiryDate || data.subscription_end_date || data.subscriptionEndDate || null;
          const computedTier = getEffectiveTier({
            role: userRole,
            tier: data.tier,
            isVip: data.isVip,
            vipAccess: data.vipAccess,
            isElite: data.isElite,
            vipExpiryDate: data.vipExpiryDate,
            eliteExpiryDate: data.eliteExpiryDate,
            subscriptionEndDate: subEndDate,
            isBanned: Boolean(data.isBanned)
          });
          let subStatus = data.subscription_status || data.subscriptionStatus || (computedTier !== 'free' ? 'active' : 'none');

          if (subEndDate && new Date(subEndDate) < new Date() && (userRole === 'VIP' || userRole === 'ELITE' || Boolean(data.isVip) || Boolean(data.isElite))) {
            subStatus = 'expired';
          }

          loadedUsers.push({
            id: docSnap.id,
            uid: docSnap.id,
            username: data.email ? data.email.split('@')[0] : docSnap.id.slice(0, 8),
            email: data.email || 'N/A',
            role: userRole,
            tier: computedTier,
            isVip: Boolean(data.isVip),
            vipAccess: Boolean(data.vipAccess),
            isElite: Boolean(data.isElite),
            vipExpiryDate: data.vipExpiryDate || null,
            eliteExpiryDate: data.eliteExpiryDate || null,
            grantedFeatures: (data.grantedFeatures && typeof data.grantedFeatures === 'object') ? data.grantedFeatures : {},
            displayName: data.displayName || data.email?.split('@')[0] || 'MBK Member',
            avatar: data.avatar || undefined,
            phone: data.phone || '',
            country: data.country || '',
            dob: data.dob || '',
            experienceLevel: data.experienceLevel || '',
            assetClasses: data.assetClasses || [],
            favoritePairs: data.favoritePairs || '',
            totalPaid: Number(data.totalPaid || 0),
            isBanned: Boolean(data.isBanned),
            isMutedFromChat: Boolean(data.isMutedFromChat),
            subscriptionStatus: subStatus as any,
            subscriptionEndDate: subEndDate,
            createdAt: data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt).toLocaleDateString() : '2026',
            lastActiveAt: data.updatedAt ? new Date(data.updatedAt.seconds ? data.updatedAt.seconds * 1000 : data.updatedAt).toLocaleTimeString() : undefined
          });
        });

          // Merge with any locally cached users ONLY for UIDs that do NOT yet exist in live Firestore
          const loadedIds = new Set(loadedUsers.map((u) => u.id));
          const rawCombinedUsers = [...loadedUsers];
          try {
            const rawCached = localStorage.getItem('mbk_admin_cached_users_v1');
            if (rawCached) {
              const parsedCached = JSON.parse(rawCached);
              if (Array.isArray(parsedCached)) {
                for (const cachedUser of parsedCached) {
                  if (cachedUser && cachedUser.id && !loadedIds.has(cachedUser.id)) {
                    rawCombinedUsers.push(cachedUser);
                    loadedIds.add(cachedUser.id);
                  }
                }
              }
            }
          } catch {
            // ignore
          }

          // Deduplicate users by both UID and normalized Email (live Firestore record or higher tier wins)
          const loadedFromFirestoreIds = new Set(loadedUsers.map((u) => u.id));
          const tierScore = (u: AdminUserRecord): number => {
            const r = (u.role || '').toUpperCase();
            let score = 0;
            // Live Firestore document gets priority over stale localStorage cache
            if (loadedFromFirestoreIds.has(u.id)) score += 20;
            if (r === 'ADMIN') score += 100;
            else if (r === 'MODERATOR' || r === 'ANALYSER' || r === 'ANALYST' || r === 'SALES') score += 80;
            else if (u.isElite || u.tier === 'elite') score += 60;
            else if (u.isVip || u.vipAccess || u.tier === 'vip') score += 40;
            if (u.phone) score += 5;
            if (u.country) score += 5;
            if (Number(u.totalPaid || 0) > 0) score += 10;
            if (u.id === auth.currentUser?.uid) score += 50;
            return score;
          };

          const byEmailMap = new Map<string, AdminUserRecord>();
          const byIdMap = new Map<string, AdminUserRecord>();
          const duplicateFirestoreIdsToDelete: string[] = [];

          for (const candidate of rawCombinedUsers) {
            if (!candidate || !candidate.id) continue;
            const cleanEmail = (candidate.email || '').trim().toLowerCase();
            const hasValidEmail = cleanEmail && cleanEmail !== 'n/a' && cleanEmail.includes('@');

            if (hasValidEmail) {
              const existingForEmail = byEmailMap.get(cleanEmail);
              if (!existingForEmail) {
                byEmailMap.set(cleanEmail, candidate);
                byIdMap.set(candidate.id, candidate);
              } else {
                const keepCandidate = tierScore(candidate) > tierScore(existingForEmail);
                const winner = keepCandidate ? candidate : existingForEmail;
                const loser = keepCandidate ? existingForEmail : candidate;
                // Merge any missing fields from loser into winner
                const mergedWinner: AdminUserRecord = {
                  ...loser,
                  ...winner,
                  phone: winner.phone || loser.phone || '',
                  country: winner.country || loser.country || '',
                  dob: winner.dob || loser.dob || '',
                  totalPaid: Math.max(Number(winner.totalPaid || 0), Number(loser.totalPaid || 0))
                };
                byEmailMap.set(cleanEmail, mergedWinner);
                byIdMap.delete(loser.id);
                byIdMap.set(mergedWinner.id, mergedWinner);
                if (loser.id !== mergedWinner.id && loadedFromFirestoreIds.has(loser.id)) {
                  duplicateFirestoreIdsToDelete.push(loser.id);
                }
              }
            } else if (!byIdMap.has(candidate.id)) {
              byIdMap.set(candidate.id, candidate);
            }
          }

          const mergedUsers = Array.from(byIdMap.values());

          // Clean up duplicate ghost records from Firestore & sync missing canonical users
          if (isFullAdmin) {
            for (const dupId of duplicateFirestoreIdsToDelete) {
              deleteDoc(doc(db, 'users', dupId)).catch(() => {});
              deleteDoc(doc(db, 'chat_profiles', dupId)).catch(() => {});
            }

            for (const canonicalUser of mergedUsers) {
              if (!loadedFromFirestoreIds.has(canonicalUser.id)) {
                setDoc(doc(db, 'users', canonicalUser.id), {
                  uid: canonicalUser.id,
                  email: canonicalUser.email || '',
                  displayName: canonicalUser.displayName || canonicalUser.username || 'MBK Member',
                  role: (canonicalUser.role || 'free').toString().toLowerCase(),
                  tier: canonicalUser.tier || 'free',
                  isVip: Boolean(canonicalUser.isVip),
                  vipAccess: Boolean(canonicalUser.vipAccess),
                  isElite: Boolean(canonicalUser.isElite),
                  vipExpiryDate: canonicalUser.vipExpiryDate || null,
                  eliteExpiryDate: canonicalUser.eliteExpiryDate || null,
                  grantedFeatures: canonicalUser.grantedFeatures || {},
                  phone: canonicalUser.phone || '',
                  country: canonicalUser.country || '',
                  dob: canonicalUser.dob || '',
                  experienceLevel: canonicalUser.experienceLevel || '',
                  assetClasses: Array.isArray(canonicalUser.assetClasses) ? canonicalUser.assetClasses : [],
                  favoritePairs: canonicalUser.favoritePairs || '',
                  totalPaid: Number(canonicalUser.totalPaid || 0),
                  isBanned: Boolean(canonicalUser.isBanned),
                  isMutedFromChat: Boolean(canonicalUser.isMutedFromChat),
                  subscription_status: canonicalUser.subscriptionStatus || 'none',
                  subscription_end_date: canonicalUser.subscriptionEndDate || null,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                }, { merge: true }).catch(() => {});
              }
            }
          }

          setUsers(mergedUsers);
          setDbQuotaExceeded(false);
          try {
            if (mergedUsers.length > 0) {
              localStorage.setItem('mbk_admin_cached_users_v1', JSON.stringify(mergedUsers));
            }
          } catch {
            // ignore
          }
          setUsersLoading(false);

          // Ensure all active CRM users have a directory entry in chat_profiles so the DM Inbox Members list is complete
          if (isFullAdmin && mergedUsers.length > 0 && !(window as any).__mbkChatProfilesSeededFromCrm) {
            (window as any).__mbkChatProfilesSeededFromCrm = true;
            for (const u of mergedUsers) {
              if (u && u.id && !u.isBanned) {
                setDoc(doc(db, 'chat_profiles', u.id), {
                  uid: u.id,
                  displayName: (u.displayName || u.username || u.email?.split('@')[0] || 'MBK Member').slice(0, 100),
                  avatar: (u.avatar || '').slice(0, 1000),
                  role: (u.role || 'FREE').toString().toUpperCase().slice(0, 40),
                  allowDirectMessages: true,
                  blockedUids: [],
                  updatedAt: new Date().toISOString()
                }, { merge: true }).catch(() => {});
              }
            }
          }

          // Silent background sync from legacyDb once per session when readable
          if (isFullAdmin && !(window as any).__mbkLegacyUsersSynced) {
            (window as any).__mbkLegacyUsersSynced = true;
            getDocs(query(collection(legacyDb, 'users'), limit(300)))
              .then((legacySnap) => {
                legacySnap.forEach((legacyDoc) => {
                  if (!loadedIds.has(legacyDoc.id)) {
                    setDoc(doc(db, 'users', legacyDoc.id), legacyDoc.data(), { merge: true }).catch(() => {});
                  }
                });
              })
              .catch(() => {
                // legacyDb still in daily free-tier cooldown; active users auto-register in (default) on visit
              });
          }
        },
        (err: any) => {
          const msg = String(err?.message || err || '').toLowerCase();
          if (err?.code === 'resource-exhausted' || msg.includes('quota')) {
            setDbQuotaExceeded(true);
          }
          console.warn('Firestore CRM users subscription notice:', err?.message || err);
          // Fallback to cached users or current signed-in admin if no cached list exists yet
          setUsers((prev) => {
            if (prev.length > 0) return prev;
            if (auth.currentUser) {
              return [
                {
                  id: auth.currentUser.uid,
                  uid: auth.currentUser.uid,
                  username: auth.currentUser.email ? auth.currentUser.email.split('@')[0] : 'admin',
                  email: auth.currentUser.email || 'moe.albzour@gmail.com',
                  role: 'ADMIN',
                  tier: 'elite',
                  isVip: true,
                  vipAccess: true,
                  isElite: true,
                  vipExpiryDate: null,
                  eliteExpiryDate: null,
                  grantedFeatures: {},
                  displayName: auth.currentUser.displayName || 'MBK Super Admin',
                  phone: '',
                  country: 'Global',
                  dob: '',
                  experienceLevel: 'Pro',
                  assetClasses: [],
                  favoritePairs: '',
                  totalPaid: 0,
                  isBanned: false,
                  isMutedFromChat: false,
                  subscriptionStatus: 'active',
                  subscriptionEndDate: null,
                  createdAt: '2026'
                }
              ];
            }
            return prev;
          });
          setUsersLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.warn('CRM setup error:', err);
      setUsersLoading(false);
    }
  }, [isStaff, crmRetryTick]);

  // ================= EXPIRING SOON ALERTS COMPUTATION (Next 72 Hours) =================
  const expiringSoonUsers = users.filter((u) => {
    if (!u.subscriptionEndDate) return false;
    const endDate = new Date(u.subscriptionEndDate);
    const now = new Date();
    const diffHours = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours >= -24 && diffHours <= 72; // Expiring within 3 days or expired in last 24h
  });

  // ================= GRANULAR BAN & CHAT MUTE ACTIONS =================
  const handleToggleGlobalBan = async (targetUser: AdminUserRecord) => {
    if (targetUser.role === 'ADMIN' && !isFullAdmin) {
      showFeedback('error', isAr ? 'لا يمكنك حظر حسابات الإدارة العليا' : 'Cannot ban superadmin account');
      return;
    }

    soundManager.playClick();
    const nextBanned = !targetUser.isBanned;

    try {
      const userRef = doc(db, 'users', targetUser.id);
      await setDoc(userRef, { uid: targetUser.id, isBanned: nextBanned, updatedAt: serverTimestamp() }, { merge: true });
      setUsers((prev) => {
        const nextList = prev.map((u) => (u.id === targetUser.id ? { ...u, isBanned: nextBanned } : u));
        try {
          localStorage.setItem('mbk_admin_cached_users_v1', JSON.stringify(nextList));
        } catch {
          // ignore
        }
        return nextList;
      });
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? nextBanned ? `تم تفعيل الحظر الشامل للحساب ${targetUser.displayName}` : `تم رفع الحظر عن الحساب ${targetUser.displayName}`
          : `Toggled ban status for ${targetUser.email}`
      );
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleToggleChatMute = async (targetUser: AdminUserRecord) => {
    soundManager.playClick();
    const nextMuted = !targetUser.isMutedFromChat;

    try {
      const userRef = doc(db, 'users', targetUser.id);
      await setDoc(userRef, { uid: targetUser.id, isMutedFromChat: nextMuted, updatedAt: serverTimestamp() }, { merge: true });
      setUsers((prev) => {
        const nextList = prev.map((u) => (u.id === targetUser.id ? { ...u, isMutedFromChat: nextMuted } : u));
        try {
          localStorage.setItem('mbk_admin_cached_users_v1', JSON.stringify(nextList));
        } catch {
          // ignore
        }
        return nextList;
      });
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? nextMuted ? `تم كتم المستخدم ${targetUser.displayName} من الشات` : `تم إلغاء كتم المستخدم ${targetUser.displayName}`
          : `Toggled chat mute status for ${targetUser.email}`
      );
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleSetRole = async (targetUserId: string, newRole: string) => {
    soundManager.playClick();
    if (!isFullAdmin && newRole === 'ADMIN') {
      showFeedback('error', isAr ? 'فقط الإدارة العليا يمكنها تعيين رتبة ADMIN' : 'Only full admin can promote to ADMIN');
      return;
    }

    try {
      const lowerRole = newRole.toLowerCase();
      const upperRole = newRole.toUpperCase();
      const userRef = doc(db, 'users', targetUserId);
      const isStaffOrVip = ['vip', 'elite', 'admin', 'moderator', 'analyser', 'analyst', 'sales'].includes(lowerRole);
      const computedTier =
        lowerRole === 'elite' || lowerRole === 'admin'
          ? 'elite'
          : isStaffOrVip
          ? 'vip'
          : 'free';

      const rolePayload: Record<string, any> = {
        uid: targetUserId,
        role: lowerRole === 'elite' ? 'vip' : lowerRole,
        tier: computedTier,
        isVip: isStaffOrVip,
        vipAccess: isStaffOrVip,
        updatedAt: serverTimestamp()
      };
      if (lowerRole === 'free') {
        rolePayload.tier = 'free';
        rolePayload.isElite = false;
        rolePayload.vipExpiryDate = null;
        rolePayload.eliteExpiryDate = null;
        rolePayload.subscription_status = 'none';
        rolePayload.subscription_end_date = null;
      } else if (lowerRole === 'vip') {
        rolePayload.tier = 'vip';
        rolePayload.isElite = false;
        rolePayload.subscription_status = 'active';
      } else if (lowerRole === 'elite' || lowerRole === 'admin') {
        rolePayload.tier = 'elite';
        rolePayload.isElite = true;
        rolePayload.subscription_status = 'active';
      } else if (isStaffOrVip) {
        rolePayload.subscription_status = 'active';
      }

      // Use setDoc with merge: true so it succeeds even if the user doc was only in cache
      await setDoc(userRef, rolePayload, { merge: true });

      // Also sync the user's role badge in chat_profiles so General Chat & DM Inbox reflect ADMIN/STAFF immediately
      await setDoc(
        doc(db, 'chat_profiles', targetUserId),
        {
          uid: targetUserId,
          role: upperRole === 'ELITE' ? 'VIP' : upperRole,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      ).catch(() => {});

      const nextDisplayRole = upperRole === 'ELITE' ? 'VIP' : upperRole;

      // Immediately update local users state and localStorage cache so background sync never reverts it
      setUsers((prev) => {
        const nextList = prev.map((u) =>
          u.id === targetUserId
            ? {
                ...u,
                role: nextDisplayRole,
                tier: computedTier as any,
                isVip: rolePayload.isVip,
                vipAccess: rolePayload.vipAccess,
                isElite: Boolean(rolePayload.isElite),
                subscriptionStatus: (rolePayload.subscription_status || u.subscriptionStatus) as any
              }
            : u
        );
        try {
          localStorage.setItem('mbk_admin_cached_users_v1', JSON.stringify(nextList));
        } catch {
          // ignore
        }
        return nextList;
      });

      setInspectUser((prev) =>
        prev && prev.id === targetUserId
          ? {
              ...prev,
              role: nextDisplayRole,
              tier: computedTier as any,
              isVip: rolePayload.isVip,
              vipAccess: rolePayload.vipAccess,
              isElite: Boolean(rolePayload.isElite),
              subscriptionStatus: rolePayload.subscription_status || prev.subscriptionStatus
            }
          : prev
      );
      soundManager.playProfitChime();
      showFeedback('success', isAr ? `تم تعيين الرتبة إلى ${newRole}` : `Role updated to ${newRole}`);
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // ================= DIRECT TIER GRANT & REVOKE (VIP / ELITE / FREE) =================
  const computeExpiryIso = (mode: 'days' | 'date', days: number, dateStr: string): string => {
    if (mode === 'date' && dateStr) {
      const parsed = new Date(`${dateStr}T23:59:59.000Z`);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    const safeDays = Math.max(1, Number(days) || 30);
    return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000).toISOString();
  };

  const handleGrantDirectTier = async () => {
    if (!inspectUser) return;
    setIsUpdatingTier(true);
    soundManager.playClick();
    try {
      const expiryIso = computeExpiryIso(directTierMode, directTierDays, directTierCustomDate);
      const isStaffTarget = ['ADMIN', 'MODERATOR', 'SALES'].includes(inspectUser.role.toUpperCase());
      const nextRoleLower = isStaffTarget ? inspectUser.role.toLowerCase() : 'vip';
      const isEliteTarget = directTierTarget === 'elite';

      const payload: Record<string, any> = {
        uid: inspectUser.id,
        role: nextRoleLower,
        tier: directTierTarget,
        isVip: true,
        vipAccess: true,
        isElite: isEliteTarget,
        vipExpiryDate: expiryIso,
        eliteExpiryDate: isEliteTarget ? expiryIso : null,
        subscription_status: 'active',
        subscription_end_date: expiryIso,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', inspectUser.id), payload, { merge: true });
      setUsers((prev) => {
        const nextList = prev.map((u) =>
          u.id === inspectUser.id
            ? {
                ...u,
                role: isStaffTarget ? u.role : 'VIP',
                tier: directTierTarget,
                isVip: true,
                vipAccess: true,
                isElite: isEliteTarget,
                vipExpiryDate: expiryIso,
                eliteExpiryDate: isEliteTarget ? expiryIso : null,
                subscriptionStatus: 'active' as any,
                subscriptionEndDate: expiryIso
              }
            : u
        );
        try {
          localStorage.setItem('mbk_admin_cached_users_v1', JSON.stringify(nextList));
        } catch {
          // ignore
        }
        return nextList;
      });
      setInspectUser((prev) =>
        prev
          ? {
              ...prev,
              role: isStaffTarget ? prev.role : 'VIP',
              tier: directTierTarget,
              isVip: true,
              vipAccess: true,
              isElite: isEliteTarget,
              vipExpiryDate: expiryIso,
              eliteExpiryDate: isEliteTarget ? expiryIso : null,
              subscriptionStatus: 'active',
              subscriptionEndDate: expiryIso
            }
          : null
      );
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم منح باقة ${directTierTarget.toUpperCase()} حتى ${formatExpiryShort(expiryIso, true)}`
          : `Granted ${directTierTarget.toUpperCase()} tier until ${formatExpiryShort(expiryIso, false)}`
      );
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update tier');
    } finally {
      setIsUpdatingTier(false);
    }
  };

  const handleRevokeDirectTier = async () => {
    if (!inspectUser) return;
    setIsUpdatingTier(true);
    soundManager.playClick();
    try {
      const isStaffTarget = ['ADMIN', 'MODERATOR', 'SALES'].includes(inspectUser.role.toUpperCase());
      const payload: Record<string, any> = {
        uid: inspectUser.id,
        role: isStaffTarget ? inspectUser.role.toLowerCase() : 'free',
        tier: 'free',
        isVip: false,
        vipAccess: false,
        isElite: false,
        vipExpiryDate: null,
        eliteExpiryDate: null,
        subscription_status: 'none',
        subscription_end_date: null,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', inspectUser.id), payload, { merge: true });
      setUsers((prev) => {
        const nextList: AdminUserRecord[] = prev.map((u) =>
          u.id === inspectUser.id
            ? {
                ...u,
                role: isStaffTarget ? u.role : 'FREE',
                tier: 'free' as const,
                isVip: false,
                vipAccess: false,
                isElite: false,
                vipExpiryDate: null,
                eliteExpiryDate: null,
                subscriptionStatus: 'none' as any,
                subscriptionEndDate: null
              }
            : u
        );
        try {
          localStorage.setItem('mbk_admin_cached_users_v1', JSON.stringify(nextList));
        } catch {
          // ignore
        }
        return nextList;
      });
      setInspectUser((prev) =>
        prev
          ? {
              ...prev,
              role: isStaffTarget ? prev.role : 'FREE',
              tier: 'free',
              isVip: false,
              vipAccess: false,
              isElite: false,
              vipExpiryDate: null,
              eliteExpiryDate: null,
              subscriptionStatus: 'none',
              subscriptionEndDate: null
            }
          : null
      );
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr ? 'تم سحب الباقة وإرجاع الحساب إلى الباقة المجانية' : 'Subscription revoked and downgraded to Free tier'
      );
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to revoke tier');
    } finally {
      setIsUpdatingTier(false);
    }
  };

  // ================= INDIVIDUAL FEATURE GRANT / REVOKE =================
  const handleGrantIndividualFeature = async (featureKey: FeatureKey) => {
    if (!inspectUser) return;
    setBusyFeatureKey(featureKey);
    soundManager.playClick();
    try {
      const customDate = featureGrantDates[featureKey];
      const days = featureGrantDays[featureKey] || 3;
      const expiryIso = customDate
        ? computeExpiryIso('date', days, customDate)
        : computeExpiryIso('days', days, '');

      const nextMap: Partial<Record<FeatureKey, string>> = {
        ...(inspectUser.grantedFeatures || {}),
        [featureKey]: expiryIso
      };

      await updateDoc(doc(db, 'users', inspectUser.id), {
        grantedFeatures: nextMap,
        updatedAt: serverTimestamp()
      });

      setInspectUser((prev) => (prev ? { ...prev, grantedFeatures: nextMap } : null));
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم منح ميزة "${getFeatureLabel(featureKey, true)}" حتى ${formatExpiryShort(expiryIso, true)}`
          : `Granted "${getFeatureLabel(featureKey, false)}" until ${formatExpiryShort(expiryIso, false)}`
      );
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to grant feature');
    } finally {
      setBusyFeatureKey(null);
    }
  };

  const handleRevokeIndividualFeature = async (featureKey: FeatureKey) => {
    if (!inspectUser) return;
    setBusyFeatureKey(featureKey);
    soundManager.playClick();
    try {
      const nextMap: Partial<Record<FeatureKey, string>> = { ...(inspectUser.grantedFeatures || {}) };
      delete nextMap[featureKey];

      await updateDoc(doc(db, 'users', inspectUser.id), {
        grantedFeatures: nextMap,
        updatedAt: serverTimestamp()
      });

      setInspectUser((prev) => (prev ? { ...prev, grantedFeatures: nextMap } : null));
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم إلغاء صلاحية "${getFeatureLabel(featureKey, true)}"`
          : `Revoked "${getFeatureLabel(featureKey, false)}" access`
      );
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to revoke feature');
    } finally {
      setBusyFeatureKey(null);
    }
  };

  // ================= LOG MANUAL PAYMENT & RENEWAL =================
  const handleLogManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectUser) return;

    const amountNum = parseFloat(paymentAmountInput) || 0;
    setIsLoggingPayment(true);
    soundManager.playClick();

    try {
      let daysToAdd = 30;
      if (paymentDurationInput === '90') daysToAdd = 90;
      else if (paymentDurationInput === '180') daysToAdd = 180;
      else if (paymentDurationInput === '365') daysToAdd = 365;
      else if (paymentDurationInput === 'lifetime') daysToAdd = 36500;

      const currentEnd = inspectUser.subscriptionEndDate ? new Date(inspectUser.subscriptionEndDate) : new Date();
      const startDate = currentEnd > new Date() ? currentEnd : new Date();
      const newEndDate = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      const userRef = doc(db, 'users', inspectUser.id);
      const nextTotalPaid = (inspectUser.totalPaid || 0) + amountNum;
      const preserveElite = inspectUser.tier === 'elite' || Boolean(inspectUser.isElite);

      await updateDoc(userRef, {
        totalPaid: nextTotalPaid,
        role: 'vip',
        tier: preserveElite ? 'elite' : 'vip',
        isVip: true,
        vipAccess: true,
        isElite: preserveElite,
        vipExpiryDate: newEndDate,
        eliteExpiryDate: preserveElite ? newEndDate : null,
        subscription_status: 'active',
        subscription_end_date: newEndDate,
        updatedAt: serverTimestamp()
      });

      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم تسجيل الدفعة بقيمة $${amountNum} وتجديد اشتراك ${preserveElite ? 'Elite' : 'VIP'} للحساب بنجاح!`
          : `Logged $${amountNum} payment and extended ${preserveElite ? 'Elite' : 'VIP'} access!`
      );

      setInspectUser((prev) =>
        prev
          ? {
              ...prev,
              totalPaid: nextTotalPaid,
              role: 'VIP',
              tier: preserveElite ? 'elite' : 'vip',
              isVip: true,
              vipAccess: true,
              isElite: preserveElite,
              vipExpiryDate: newEndDate,
              eliteExpiryDate: preserveElite ? newEndDate : null,
              subscriptionStatus: 'active',
              subscriptionEndDate: newEndDate
            }
          : null
      );
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setIsLoggingPayment(false);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const query = userSearch.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(query) ||
      u.displayName.toLowerCase().includes(query) ||
      (u.phone && u.phone.includes(query)) ||
      (u.country && u.country.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    const effTier = getEffectiveTier(u);

    const isStaffRole = ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes((u.role || '').toUpperCase());

    if (userFilterTab === 'EXPIRING_SOON') {
      if (!u.subscriptionEndDate) return false;
      const endDate = new Date(u.subscriptionEndDate);
      const diffHours = (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      return diffHours >= -24 && diffHours <= 72;
    }
    if (userFilterTab === 'VIP') return effTier === 'vip' && !isStaffRole;
    if (userFilterTab === 'ELITE') return effTier === 'elite' && !isStaffRole;
    if (userFilterTab === 'FREE') return effTier === 'free' && !isStaffRole;
    if (userFilterTab === 'BANNED') return u.isBanned;
    if (userFilterTab === 'MUTED') return u.isMutedFromChat;
    if (userFilterTab === 'STAFF') return isStaffRole;

    return true;
  });

  // Calculate Metrics
  const totalRevenueAll = users.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0);
  const totalVipCount = users.filter((u) => getEffectiveTier(u) === 'vip' && !['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes((u.role || '').toUpperCase())).length;
  const totalEliteCount = users.filter((u) => getEffectiveTier(u) === 'elite' && !['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes((u.role || '').toUpperCase())).length;
  const totalBannedCount = users.filter((u) => u.isBanned).length;

  // ACCESS DENIED VIEW IF NOT STAFF
  if (!isStaff) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center p-6 bg-[#0d1017]">
        <div className="max-w-md w-full bg-[#1e222d] border border-[#f23645]/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 start-0 w-full h-1.5 bg-[#f23645]" />
          <div className="w-16 h-16 rounded-2xl bg-[#f23645]/15 border border-[#f23645]/30 flex items-center justify-center text-[#f23645] mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isAr ? 'منطقة مقتصرة على فريق الإدارة والمبيعات' : 'Restricted CRM & Admin Access'}
          </h2>
          <p className="text-xs text-[#787b86] leading-relaxed mb-6">
            {isAr
              ? 'لوحة التحكم وإدارة العملاء مقتصرة فقط على رتب (ADMIN, MODERATOR, SALES, ANALYSER).'
              : 'This CRM Dashboard is strictly reserved for Admin, Moderator, Sales, and Analyser roles.'}
          </p>
          {auth.currentUser && (
            <button
              onClick={async () => {
                const curr = auth.currentUser;
                if (!curr) return;
                try {
                  soundManager.playClick();
                  await setDoc(
                    doc(db, 'users', curr.uid),
                    {
                      uid: curr.uid,
                      email: curr.email || '',
                      displayName: curr.displayName || curr.email?.split('@')[0] || 'Admin',
                      role: 'admin',
                      tier: 'elite',
                      isVip: true,
                      vipAccess: true,
                      isElite: true,
                      subscription_status: 'active',
                      updatedAt: serverTimestamp()
                    },
                    { merge: true }
                  );
                  await setDoc(
                    doc(db, 'chat_profiles', curr.uid),
                    {
                      uid: curr.uid,
                      displayName: curr.displayName || curr.email?.split('@')[0] || 'Admin',
                      role: 'ADMIN',
                      allowDirectMessages: true,
                      updatedAt: new Date().toISOString()
                    },
                    { merge: true }
                  ).catch(() => {});
                  soundManager.playProfitChime();
                } catch (e) {
                  console.warn(e);
                }
              }}
              className="w-full mb-3 py-3 px-4 rounded-xl bg-[#089981] hover:bg-[#089981]/90 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {isAr ? '👑 استعادة صلاحية الأدمن (ADMIN) لهذا الحساب المفتوح الآن' : '👑 Restore ADMIN Access for Current Account'}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {isAr ? 'العودة إلى منصة التداول' : 'Return to Trading Workspace'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full flex flex-col bg-[#0d1017] text-[#d1d4dc] font-sans select-none antialiased">
      {/* 1. TOP HEADER CONTROL BAR */}
      <header className="px-4 sm:px-6 py-3.5 bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#089981]/30 to-[#00f2fe]/10 border border-[#089981]/40 flex items-center justify-center text-[#089981] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {isAr ? 'مركز إدارة العملاء والمبيعات (MBK CRM & Admin)' : 'MBK CRM & Executive Dashboard'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                {effectiveRole.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-[#787b86]">
              {isAr
                ? 'إدارة اشتراكات المستخدمين، تتبع المبيعات، حظر الحسابات، وتنفيذ التجديدات المباشرة'
                : 'Manage user profiles, track revenue, control bans/mutes, & process renewals'}
            </p>
          </div>
        </div>

        {/* Global Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isFullAdmin && (
            <>
              <button
                type="button"
                disabled={isSyncingLegacyDb}
                onClick={() => handleSyncLegacyData(false)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                title={
                  isAr
                    ? 'استعادة ومزامنة جميع المحادثات والرسائل الخاصة والصفقات والأعضاء من قاعدة البيانات القديمة وذاكرة المتصفح'
                    : 'Restore & sync all General Chat, DMs, trades, and members from the legacy database and browser cache'
                }
              >
                <Database className={`w-3.5 h-3.5 ${isSyncingLegacyDb ? 'animate-spin' : ''}`} />
                <span>{isAr ? '🔄 استعادة البيانات والمحادثات القديمة' : '🔄 Restore Legacy Data & Chats'}</span>
              </button>
              <button
                type="button"
                disabled={isPushingAppUpdate}
                onClick={handlePushAppUpdateToAllUsers}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#089981] to-emerald-500 hover:brightness-110 disabled:opacity-50 text-white text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                title={
                  isAr
                    ? 'إجبار جميع المتصفحات والاختصارات (PWA) على مسح الكاش وتحميل أحدث إصدار فوراً دون تسجيل خروجهم'
                    : 'Force all open tabs and PWA shortcuts to clear cache and reload the newest version immediately'
                }
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPushingAppUpdate ? 'animate-spin' : ''}`} />
                <span>{isAr ? '🚀 دفع التحديث لجميع المستخدمين' : '🚀 Push Update to All Users'}</span>
              </button>
            </>
          )}
          {onClose && (
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isAr ? 'خروج من اللوحة' : 'Close Dashboard'}
            </button>
          )}
        </div>
      </header>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between transition-all ${
          feedback.type === 'success' ? 'bg-[#089981] text-white' : feedback.type === 'error' ? 'bg-[#f23645] text-white' : 'bg-blue-600 text-white'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="cursor-pointer hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Firestore Free-Tier Daily Read Quota Warning & 1-Click Console Upgrade Banner */}
      {dbQuotaExceeded && (
        <div className="px-4 sm:px-6 py-3.5 bg-amber-500/15 border-b border-amber-500/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-amber-300">
                {isAr
                  ? 'تنبيه من Google Firebase: وصلت قاعدة البيانات للحد اليومي المجاني للقراءة (50,000 قراءة/يوم)'
                  : 'Google Firebase Notice: Database reached its Free Daily Read Quota (50,000 reads/day)'}
              </div>
              <p className="text-[11px] text-[#d1d4dc] leading-relaxed">
                {isAr
                  ? 'يتم حالياً عرض البيانات المخزنة مؤقتاً (Cached Mode). لفتح القراءة المباشرة غير المحدودة لعملائك فوراً دون انتظار إعادة التعيين اليومي، اضغط على زر الترقية أدناه في لوحة Firebase.'
                  : 'Showing locally cached records. To unlock unlimited live database reads immediately without waiting for tomorrow’s reset, upgrade the database instance in Firebase Console.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://console.firebase.google.com/project/mbktrading-8dc98/firestore/databases/ai-studio-mbktrading-5c717851-cdb4-4a97-a0f4-f006f13d6c7b/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>
                {isAr
                  ? '🔓 ترقية قاعدة البيانات في Firebase لرفع الحد'
                  : '🔓 Upgrade Database in Firebase Console'}
              </span>
            </a>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setCrmRetryTick((t) => t + 1);
              }}
              className="px-3 py-2 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Sub-Nav Tabs */}
      <div className="px-4 sm:px-6 py-2 bg-[#181c27] border-b border-[#2a2e39] flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#089981] text-white shadow-md'
              : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? 'إدارة العملاء والاشتراكات (CRM)' : 'User CRM & Subscriptions'}</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/30 font-mono">{users.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('keys')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'keys'
              ? 'bg-[#089981] text-white shadow-md'
              : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
          }`}
        >
          <Key className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'مولد مفاتيح تفعيل VIP' : 'VIP Activation Keys'}</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/30 font-mono">
            {activationKeys.filter((k) => k.status === 'active').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('publishing')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'publishing'
              ? 'bg-[#089981] text-white shadow-md'
              : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'مركز نشر التوصيات والصفقات' : 'Publishing Center'}</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'broadcasts'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-amber-300/90 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>{isAr ? '📢 النوافذ المنبثقة والرسائل الجماعية' : '📢 Popups & Bulk DMs'}</span>
        </button>

        {isFullAdmin && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#089981] text-white shadow-md'
                : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
            }`}
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>{isAr ? 'إعدادات المنصة' : 'Platform Settings'}</span>
          </button>
        )}
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">

        {/* ========================================================================= */}
        {/* 2. PRIORITY 3-DAY EXPIRATION ALERTS WIDGET */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#131722] to-amber-500/10 border border-amber-500/40 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
                <Clock className="w-5 h-5 animate-pulse text-amber-400 shrink-0" />
                <span>
                  {isAr
                    ? `⚠️ تنبيه المبيعات: ${expiringSoonUsers.length} عميل تنتهي عضويتهم خلال 72 ساعة`
                    : `⚠️ Priority Sales Alerts: ${expiringSoonUsers.length} VIP Subscriptions Expiring in 72 Hours`}
                </span>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold border border-amber-500/40">
                RENEWAL TEAM DESK
              </span>
            </div>

            {expiringSoonUsers.length === 0 ? (
              <p className="text-xs text-[#787b86] italic">
                {isAr ? 'لا يوجد اشتراكات قريبة من الانتهاء حالياً.' : 'No VIP subscriptions expiring in the next 72 hours.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {expiringSoonUsers.map((u) => {
                  const cleanPhone = u.phone ? u.phone.replace(/[^0-9]/g, '') : '';
                  return (
                    <div key={u.id} className="p-3 rounded-xl bg-[#131722] border border-amber-500/30 flex items-center justify-between gap-2 shadow-sm">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate">{u.displayName}</span>
                          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                            EXPIRING
                          </span>
                        </div>
                        <p className="text-[10px] text-[#787b86] font-mono truncate">{u.phone || u.email}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 transition-colors"
                            title="WhatsApp Contact"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          onClick={() => setInspectUser(u)}
                          className="px-2 py-1 rounded-lg bg-amber-500 text-black font-extrabold text-[10px] hover:brightness-110 cursor-pointer shadow-sm"
                        >
                          {isAr ? 'تجديد' : 'Renew'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Overview Stats Cards */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-1">
              <span className="text-[11px] text-[#787b86] font-bold block">{isAr ? 'إجمالي العملاء' : 'Total Accounts'}</span>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">{users.length}</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-1">
              <span className="text-[11px] text-amber-400 font-bold block">{isAr ? 'أعضاء VIP و Elite' : 'Active VIP / Elite'}</span>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {totalVipCount + totalEliteCount}
                {totalEliteCount > 0 && (
                  <span className="text-xs text-purple-300 ms-2">({totalEliteCount} Elite)</span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-1">
              <span className="text-[11px] text-emerald-400 font-bold block">{isAr ? 'إجمالي الإيرادات المحصلة' : 'Total Revenue Collected'}</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">${totalRevenueAll.toLocaleString()}</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-1">
              <span className="text-[11px] text-red-400 font-bold block">{isAr ? 'الحسابات المحظورة' : 'Global Banned Users'}</span>
              <div className="text-xl sm:text-2xl font-black text-red-400 font-mono">{totalBannedCount}</div>
            </div>
          </div>
        )}

        {/* TAB 1: USER CRM TABLE */}
        {activeTab === 'users' && (
          <div className="bg-[#131722] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-xl space-y-4 p-4">
            {/* Table Search & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={isAr ? 'بحث باسم العميل، البريد، أو الهاتف...' : 'Search by name, email, or phone...'}
                  className="w-full ps-10 pe-4 py-2 bg-[#1e222d] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['ALL', 'EXPIRING_SOON', 'VIP', 'ELITE', 'FREE', 'BANNED', 'MUTED', 'STAFF'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setUserFilterTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                      userFilterTab === tab
                        ? 'bg-[#089981] text-white shadow-sm'
                        : 'bg-[#1e222d] text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                    }`}
                  >
                    {tab === 'ALL'
                      ? (isAr ? 'الكل' : 'All')
                      : tab === 'EXPIRING_SOON'
                      ? (isAr ? '⚡ ينتهي قريباً' : 'Expiring Soon')
                      : tab === 'VIP'
                      ? 'VIP'
                      : tab === 'ELITE'
                      ? 'ELITE'
                      : tab === 'FREE'
                      ? (isAr ? 'مجاني' : 'Free')
                      : tab === 'BANNED'
                      ? (isAr ? '🚫 محظور' : 'Banned')
                      : tab === 'MUTED'
                      ? (isAr ? '🔇 مكتوم' : 'Muted')
                      : (isAr ? 'الطاقم' : 'Staff')}
                  </button>
                ))}
              </div>
            </div>

            {/* User CRM Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#2a2e39] bg-[#181c27] text-[#787b86] font-mono text-[11px]">
                    <th className="py-3 px-3 text-start">{isAr ? 'العميل' : 'Trader'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الهاتف والدولة' : 'Contact & Country'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الخبرة والأصول' : 'Trading Background'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الإيراد المحصل' : 'Total Revenue'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الرتبة والصلاحيات' : 'Role'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الحظر والكتم' : 'Ban / Mute Controls'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2e39]/50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#787b86] italic">
                        {isAr ? 'لا يوجد عملاء يطابقون خيارات البحث الحالية.' : 'No users match the current filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#1e222d]/60 transition-colors group">
                        {/* Trader Identity */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#2a2e39] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-[#363a45]">
                              {u.displayName ? u.displayName[0].toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">{u.displayName}</span>
                              <span className="text-[10px] text-[#787b86] font-mono truncate block">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Contact & Country */}
                        <td className="py-3 px-3 font-mono">
                          <div className="space-y-0.5">
                            <span className="text-white block truncate">{u.phone || '—'}</span>
                            <span className="text-[10px] text-[#787b86] block truncate">{u.country || 'Global'}</span>
                          </div>
                        </td>

                        {/* Trading Background */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span className="text-amber-400 font-bold block text-[11px]">
                              {u.experienceLevel || 'Beginner'}
                            </span>
                            <span className="text-[10px] text-[#787b86] truncate block">
                              {u.assetClasses && u.assetClasses.length > 0 ? u.assetClasses.join(', ') : 'Indices, Forex'}
                            </span>
                          </div>
                        </td>

                        {/* Revenue */}
                        <td className="py-3 px-3 font-mono">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                            ${(u.totalPaid || 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Role & Tier Badge */}
                        <td className="py-3 px-3 font-mono">
                          {(() => {
                            const effTier = getEffectiveTier(u);
                            const activeTrials = getActiveTrialFeatures(u);
                            return (
                              <div className="space-y-1">
                                {u.role === 'ADMIN' ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                                    ADMIN
                                  </span>
                                ) : u.role === 'MODERATOR' ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                    MODERATOR
                                  </span>
                                ) : u.role === 'SALES' ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                    SALES
                                  </span>
                                ) : effTier === 'elite' ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                    ELITE ($500)
                                  </span>
                                ) : effTier === 'vip' ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                    VIP ($100)
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#2a2e39] text-[#787b86]">
                                    FREE ($0)
                                  </span>
                                )}
                                {activeTrials.length > 0 && (
                                  <span className="block text-[9px] text-cyan-300">
                                    +{activeTrials.length} {isAr ? 'ميزة مخصصة' : 'Trial Features'}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Ban / Mute Toggles */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {/* Ban Toggle */}
                            <button
                              onClick={() => handleToggleGlobalBan(u)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                u.isBanned
                                  ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                  : 'bg-[#1e222d] text-[#787b86] hover:text-white border-[#2a2e39]'
                              }`}
                              title={u.isBanned ? 'Banned from Platform' : 'Click to Ban'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>

                            {/* Chat Mute Toggle */}
                            <button
                              onClick={() => handleToggleChatMute(u)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                u.isMutedFromChat
                                  ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                                  : 'bg-[#1e222d] text-[#787b86] hover:text-white border-[#2a2e39]'
                              }`}
                              title={u.isMutedFromChat ? 'Muted from Community Chat' : 'Click to Mute Chat'}
                            >
                              <VolumeX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.role !== 'ADMIN' && isFullAdmin && (
                              <button
                                onClick={() => handleSetRole(u.id, 'ADMIN')}
                                className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/40 font-bold text-[11px] transition-all cursor-pointer"
                                title={isAr ? 'ترقية مباشرة إلى ADMIN في Firestore' : 'Promote directly to ADMIN in Firestore'}
                              >
                                {isAr ? '👑 تعيين أدمن' : '👑 Make Admin'}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                soundManager.playClick();
                                setInspectUser(u);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#089981]/20 hover:bg-[#089981] text-[#089981] hover:text-white font-bold text-xs transition-all cursor-pointer"
                            >
                              {isAr ? 'فحص الملف' : 'Inspect'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PUBLISHING CENTER */}
        {activeTab === 'publishing' && (
          <div className="bg-[#131722] border border-[#2a2e39] rounded-2xl p-4 sm:p-6 shadow-xl">
            <PublishingCenter lang={lang} currentUserRole={effectiveRole} />
          </div>
        )}

        {/* TAB 3: BULK ACTIVATION KEYS & TRIAL CODE GENERATOR */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            {/* Bulk VIP / Elite Generator Card */}
            <div className="p-5 rounded-2xl bg-[#131722] border border-[#2a2e39] shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2e39] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isAr ? 'مولد مفاتيح التفعيل الجماعي (VIP & Elite Key Generator)' : 'Bulk VIP / Elite Activation Key Generator'}
                    </h3>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'أنشئ حتى 200 مفتاح تفعيل عشوائي ذو استخدام واحد لباقات VIP أو Elite مع تصدير CSV فوري'
                        : 'Generate up to 200 single-use VIP or Elite activation keys with instant CSV export'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                    {activationKeys.filter((k) => k.status === 'active').length} {isAr ? 'متاح' : 'ACTIVE'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold">
                    {activationKeys.filter((k) => k.status === 'used').length} {isAr ? 'مستخدم' : 'USED'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Target Tier Selector */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-[#787b86] mb-1.5">
                    {isAr ? 'الباقة المستهدفة' : 'Target Tier'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['vip', 'elite'] as const).map((tierOpt) => (
                      <button
                        key={tierOpt}
                        type="button"
                        onClick={() => setBulkKeyTier(tierOpt)}
                        className={`py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase transition-all cursor-pointer border ${
                          bulkKeyTier === tierOpt
                            ? tierOpt === 'elite'
                              ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                              : 'bg-amber-500 text-black border-amber-400 shadow-sm'
                            : 'bg-[#1e222d] text-[#d1d4dc] border-[#2a2e39]'
                        }`}
                      >
                        {tierOpt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Selector */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-[#787b86] mb-1.5">
                    {isAr ? 'مدة الصلاحية للمفاتيح' : 'Key Validity Duration'}
                  </label>
                  <select
                    value={selectedKeyDays}
                    onChange={(e) => setSelectedKeyDays(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#1e222d] border border-[#2a2e39] focus:border-amber-500 rounded-xl text-xs text-white font-mono focus:outline-hidden cursor-pointer"
                  >
                    <option value={30}>{isAr ? '30 يوم (شهر واحد)' : '30 Days (1 Month)'}</option>
                    <option value={90}>{isAr ? '90 يوم (3 أشهر)' : '90 Days (3 Months)'}</option>
                    <option value={36500}>{isAr ? 'مدى الحياة (Lifetime Access)' : 'Lifetime Access'}</option>
                    <option value={7}>{isAr ? '7 أيام (أسبوع)' : '7 Days'}</option>
                    <option value={365}>{isAr ? '365 يوم (سنة كاملة)' : '365 Days (1 Year)'}</option>
                  </select>
                </div>

                {/* Quantity Selector */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-[#787b86] mb-1.5">
                    {isAr ? 'عدد المفاتيح (1 إلى 200)' : 'Quantity (1 to 200)'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 10, 50, 100, 200].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setBulkKeyQuantity(qty)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                          bulkKeyQuantity === qty
                            ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                            : 'bg-[#1e222d] text-[#d1d4dc] border-[#2a2e39] hover:border-amber-500/40'
                        }`}
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Action */}
                <div className="md:col-span-3">
                  <button
                    onClick={handleGenerateKey}
                    disabled={isGeneratingKey}
                    className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow-lg hover:brightness-110 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  >
                    {isGeneratingKey ? (
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-black" />
                        <span>
                          {isAr
                            ? `توليد ${bulkKeyQuantity} (${bulkKeyTier.toUpperCase()})`
                            : `Generate ${bulkKeyQuantity} ${bulkKeyTier.toUpperCase()}`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Newly Generated Batch Download Banner */}
              {lastGeneratedBatch.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {isAr
                        ? `الدفعة الأخيرة جاهزة: ${lastGeneratedBatch.length} مفتاح (${lastGeneratedBatch[0]?.grantTier?.toUpperCase()} • ${lastGeneratedBatch[0]?.durationLabel})`
                        : `Latest batch ready: ${lastGeneratedBatch.length} keys (${lastGeneratedBatch[0]?.grantTier?.toUpperCase()} • ${lastGeneratedBatch[0]?.durationLabel})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadKeysCsv(lastGeneratedBatch, `mbk-batch-${lastGeneratedBatch.length}`)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isAr ? `تحميل الدفعة CSV (${lastGeneratedBatch.length})` : `Download Batch CSV (${lastGeneratedBatch.length})`}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Trial Code Generator Card */}
            <div className="p-5 rounded-2xl bg-[#131722] border border-cyan-500/30 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2e39] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isAr ? 'مولد أكواد التجربة المخصصة (Trial Code Generator)' : 'Feature Trial Code Generator'}
                    </h3>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'أنشئ أكواد تفعيل مؤقتة مرتبطة بميزات محددة (مثل إشارات البوت فقط أو الشات) وبمدة مخصصة (3 أيام، 7 أيام...)'
                        : 'Create single-use trial codes tied to specific features or tiers with custom durations'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Trial Target Mode & Feature Checkboxes */}
                <div className="lg:col-span-6 space-y-3">
                  <label className="block text-[11px] font-bold text-[#787b86]">
                    {isAr ? 'نطاق الكود التجريبي' : 'Trial Scope'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'custom', ar: 'ميزات محددة', en: 'Custom Features' },
                      { id: 'vip', ar: 'تجربة VIP', en: 'VIP Trial' },
                      { id: 'elite', ar: 'تجربة Elite', en: 'Elite Trial' }
                    ] as const).map((modeOpt) => (
                      <button
                        key={modeOpt.id}
                        type="button"
                        onClick={() => setTrialTargetMode(modeOpt.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          trialTargetMode === modeOpt.id
                            ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                            : 'bg-[#1e222d] text-[#d1d4dc] border-[#2a2e39] hover:border-cyan-500/40'
                        }`}
                      >
                        {isAr ? modeOpt.ar : modeOpt.en}
                      </button>
                    ))}
                  </div>

                  {trialTargetMode === 'custom' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {FEATURE_CATALOG.map((feat) => {
                        const checked = trialSelectedFeatures.includes(feat.key);
                        return (
                          <button
                            key={feat.key}
                            type="button"
                            onClick={() => handleToggleTrialFeature(feat.key)}
                            className={`p-2.5 rounded-xl border text-start flex items-center justify-between gap-2 transition-all cursor-pointer ${
                              checked
                                ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                                : 'bg-[#1e222d] border-[#2a2e39] text-[#787b86] hover:text-white'
                            }`}
                          >
                            <span className="text-[11px] font-bold truncate">
                              {isAr ? feat.labelAr : feat.labelEn}
                            </span>
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                checked ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-[#363a45]'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Duration & Quantity */}
                <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#787b86] mb-1.5">
                      {isAr ? 'المدة بالأيام (سريعة أو مخصصة)' : 'Trial Duration (Days)'}
                    </label>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 3, 7, 14, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setTrialDurationDays(d)}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${
                            trialDurationDays === d
                              ? 'bg-cyan-500 text-black border-cyan-400'
                              : 'bg-[#1e222d] text-[#d1d4dc] border-[#2a2e39]'
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={trialDurationDays}
                      onChange={(e) => setTrialDurationDays(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] focus:border-cyan-500 rounded-xl text-xs text-white font-mono focus:outline-hidden"
                      placeholder="Days"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#787b86] mb-1.5">
                      {isAr ? 'عدد الأكواد (1 - 50)' : 'Code Quantity (1 - 50)'}
                    </label>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 5, 10, 25, 50].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setTrialQuantity(q)}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${
                            trialQuantity === q
                              ? 'bg-cyan-500 text-black border-cyan-400'
                              : 'bg-[#1e222d] text-[#d1d4dc] border-[#2a2e39]'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateTrialKeys}
                      disabled={isGeneratingTrial}
                      className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-extrabold text-xs shadow-lg hover:brightness-110 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingTrial ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{isAr ? `توليد ${trialQuantity} كود تجربة` : `Generate ${trialQuantity} Trial Codes`}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {lastGeneratedTrialBatch.length > 0 && (
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {isAr
                        ? `تم إنشاء ${lastGeneratedTrialBatch.length} كود تجربة (${lastGeneratedTrialBatch[0]?.durationLabel})`
                        : `Generated ${lastGeneratedTrialBatch.length} trial codes (${lastGeneratedTrialBatch[0]?.durationLabel})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadKeysCsv(lastGeneratedTrialBatch, `mbk-trial-codes-${lastGeneratedTrialBatch.length}`)}
                    className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isAr ? `تحميل أكواد التجربة CSV` : `Download Trial CSV`}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Keys Database Table */}
            <div className="bg-[#131722] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#089981]" />
                  <span>{isAr ? 'سجل مفاتيح التفعيل المولدة' : 'Generated Activation Keys Registry'}</span>
                  <span className="text-[10px] text-[#787b86] font-mono">
                    ({activationKeys.length})
                  </span>
                </h4>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={keySearchQuery}
                    onChange={(e) => setKeySearchQuery(e.target.value)}
                    placeholder={isAr ? 'بحث بالكود أو البريد...' : 'Filter code or email...'}
                    className="px-3 py-1.5 bg-[#1e222d] border border-[#2a2e39] focus:border-[#089981] rounded-lg text-[11px] text-white placeholder-[#787b86] focus:outline-hidden font-mono"
                  />

                  <div className="flex items-center gap-1">
                    {(['ALL', 'active', 'used', 'revoked'] as const).map((statusTab) => (
                      <button
                        key={statusTab}
                        type="button"
                        onClick={() => setKeyStatusFilter(statusTab)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all ${
                          keyStatusFilter === statusTab
                            ? 'bg-[#089981] text-white'
                            : 'bg-[#1e222d] text-[#787b86] hover:text-white'
                        }`}
                      >
                        {statusTab}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadKeysCsv(
                        activationKeys.filter((k) => k.status === 'active'),
                        'mbk-active-keys'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-amber-500/40 text-amber-400 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تصدير المفاتيح المتاحة CSV' : 'Export Active CSV'}</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-start text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[#2a2e39] bg-[#181c27] text-[#787b86] font-mono text-[11px]">
                      <th className="py-3 px-3 text-start">{isAr ? 'كود التفعيل' : 'Key Code'}</th>
                      <th className="py-3 px-3 text-start">{isAr ? 'الباقة / الميزات' : 'Tier / Scope'}</th>
                      <th className="py-3 px-3 text-start">{isAr ? 'المدة' : 'Duration'}</th>
                      <th className="py-3 px-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="py-3 px-3 text-start">{isAr ? 'تاريخ الإنشاء' : 'Created Date'}</th>
                      <th className="py-3 px-3 text-start">{isAr ? 'المستخدم المفعل' : 'Used By'}</th>
                      <th className="py-3 px-3 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2e39]/50">
                    {(() => {
                      const filteredKeys = activationKeys.filter((k) => {
                        if (keyStatusFilter !== 'ALL' && k.status !== keyStatusFilter) return false;
                        if (keySearchQuery.trim()) {
                          const q = keySearchQuery.trim().toLowerCase();
                          return (
                            k.code.toLowerCase().includes(q) ||
                            (k.usedByUserEmail || '').toLowerCase().includes(q)
                          );
                        }
                        return true;
                      });

                      if (filteredKeys.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[#787b86] italic">
                              {isAr ? 'لا يوجد مفاتيح مطابقة للفلتر الحالي.' : 'No activation keys match current filter.'}
                            </td>
                          </tr>
                        );
                      }

                      return filteredKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-[#1e222d]/60 transition-colors">
                          {/* Code */}
                          <td className="py-3 px-3 font-mono font-bold">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                                {k.code}
                              </span>
                              <button
                                onClick={() => handleCopyKey(k.code)}
                                className="p-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-[#787b86] hover:text-white transition-colors cursor-pointer"
                                title="Copy Code"
                              >
                                {copiedKeyCode === k.code ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Scope */}
                          <td className="py-3 px-3 font-mono">
                            {k.grantTier === 'elite' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                ELITE {k.keyType === 'trial' ? 'TRIAL' : ''}
                              </span>
                            ) : k.grantTier === 'custom' ? (
                              <div className="flex flex-wrap gap-1">
                                {(k.grantFeatures || []).map((f) => (
                                  <span
                                    key={f}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                VIP {k.keyType === 'trial' ? 'TRIAL' : ''}
                              </span>
                            )}
                          </td>

                          {/* Duration */}
                          <td className="py-3 px-3 font-mono text-white">
                            {k.durationInDays >= 36500
                              ? (isAr ? 'مدى الحياة' : 'Lifetime')
                              : `${k.durationInDays} ${isAr ? 'يوم' : 'Days'}`}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 font-mono">
                            {k.status === 'active' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                ACTIVE
                              </span>
                            ) : k.status === 'used' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
                                USED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                                REVOKED
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3 font-mono text-[#787b86] text-[11px]">
                            {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '—'}
                          </td>

                          {/* Used By */}
                          <td className="py-3 px-3 font-mono text-xs text-white">
                            {k.usedByUserEmail ? (
                              <span className="text-emerald-400 text-[11px] truncate block">{k.usedByUserEmail}</span>
                            ) : (
                              <span className="text-[#787b86] italic text-[11px]">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              {k.status === 'active' && (
                                <button
                                  onClick={() => handleRevokeKey(k.code)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-[10px] transition-colors cursor-pointer"
                                >
                                  {isAr ? 'إلغاء' : 'Revoke'}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteKey(k.code)}
                                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 transition-colors cursor-pointer"
                                title="Delete Key"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PLATFORM SETTINGS (Dynamic WhatsApp, Telegram & Support Contact Links) */}
        {activeTab === 'settings' && isFullAdmin && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 1-Click Remote Force-Update Card for All Devices & Installed PWA Shortcuts */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#089981]/20 via-[#131722] to-cyan-500/15 border border-[#089981]/50 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#089981]/20 border border-[#089981]/40 flex items-center justify-center text-[#089981]">
                    <RefreshCw className={`w-5 h-5 ${isPushingAppUpdate ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      {isAr
                        ? '🚀 دفع التحديث الفوري لجميع المستخدمين والاختصارات (Force Update All Users)'
                        : '🚀 Push Instant App Update to All Users & PWA Shortcuts'}
                    </h3>
                    <p className="text-xs text-[#9ca3af]">
                      {isAr
                        ? 'مسح الكاش القديم وتحديث الموقع تلقائياً لدى جميع المستخدمين (لابتوب، موبايل، واختصارات الشاشة الرئيسية) دون الحاجة لتسجيل الخروج أو حذف الاختصار.'
                        : 'Remotely clear stale caches, unfold hidden panels, and reload the latest version on all user devices and installed PWA shortcuts without signing them out.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-[11px] font-mono text-[#787b86] bg-[#181c27] px-3 py-1.5 rounded-xl border border-[#2a2e39]">
                  {remoteAppVersionInfo?.versionId ? (
                    <span>
                      {isAr ? 'آخر دفع تحديث:' : 'Last pushed:'}{' '}
                      <strong className="text-emerald-400">{remoteAppVersionInfo.versionId}</strong>
                      {remoteAppVersionInfo.updatedAt
                        ? ` • ${new Date(remoteAppVersionInfo.updatedAt).toLocaleString()}`
                        : ''}
                    </span>
                  ) : (
                    <span>{isAr ? 'جاهز لدفع التحديث الفوري' : 'Ready for instant remote broadcast'}</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isPushingAppUpdate}
                  onClick={handlePushAppUpdateToAllUsers}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#089981] to-emerald-500 hover:brightness-110 disabled:opacity-50 text-white font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                >
                  <RefreshCw className={`w-4 h-4 ${isPushingAppUpdate ? 'animate-spin' : ''}`} />
                  <span>
                    {isAr
                      ? '🚀 دفع التحديث الآن لجميع الأجهزة والاختصارات'
                      : '🚀 Push Update Now to All Devices & Shortcuts'}
                  </span>
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-[#131722] border border-[#2a2e39] shadow-xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2e39] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isAr ? 'إعدادات روابط الدعم والتواصل (Platform Settings)' : 'Platform Contact & Support Settings'}
                    </h3>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'تحديث رقم الواتساب ورابط قناة/دعم التيليجرام المباشر في قاعدة البيانات لجميع نوافذ الاشتراك والدعم'
                        : 'Configure your live WhatsApp number and Telegram link stored in Firestore (settings/platform)'}
                    </p>
                  </div>
                </div>
                {settingsUpdatedAt && (
                  <span className="text-[11px] font-mono text-[#787b86] bg-[#1e222d] px-2.5 py-1 rounded-lg border border-[#2a2e39]">
                    {isAr ? 'آخر تحديث:' : 'Updated:'} {new Date(settingsUpdatedAt).toLocaleString()}
                  </span>
                )}
              </div>

              <form onSubmit={handleSavePlatformSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WhatsApp Number */}
                  <div className="p-4 rounded-xl bg-[#181c27] border border-[#2a2e39] space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-white">
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      <span>{isAr ? 'رقم الواتساب الرسمي (مع رمز الدولة)' : 'Official WhatsApp Number (with country code)'}</span>
                    </label>
                    <input
                      type="text"
                      value={settingsWhatsapp}
                      onChange={(e) => setSettingsWhatsapp(e.target.value)}
                      placeholder="+971501234567"
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#25D366] text-xs font-mono text-white placeholder-[#5d606b] focus:outline-hidden"
                    />
                    <p className="text-[11px] text-[#787b86]">
                      {isAr
                        ? 'أدخل الرقم الدولي كاملاً بدون مسافات زائدة (مثال: +971501234567).'
                        : 'Enter international number (e.g., +971501234567). Used for Contact Support links.'}
                    </p>
                    {buildWhatsAppUrl(settingsWhatsapp) && (
                      <a
                        href={buildWhatsAppUrl(settingsWhatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#25D366] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{buildWhatsAppUrl(settingsWhatsapp)}</span>
                      </a>
                    )}
                  </div>

                  {/* Telegram Link */}
                  <div className="p-4 rounded-xl bg-[#181c27] border border-[#2a2e39] space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-white">
                      <Send className="w-4 h-4 text-[#229ED9]" />
                      <span>{isAr ? 'رابط أو معرف قناة التيليجرام' : 'Telegram Channel / Support Link'}</span>
                    </label>
                    <input
                      type="text"
                      value={settingsTelegram}
                      onChange={(e) => setSettingsTelegram(e.target.value)}
                      placeholder="https://t.me/your_channel or @your_handle"
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#229ED9] text-xs font-mono text-white placeholder-[#5d606b] focus:outline-hidden"
                    />
                    <p className="text-[11px] text-[#787b86]">
                      {isAr
                        ? 'يمكنك إدخال الرابط الكامل https://t.me/... أو معرف القناة @handle.'
                        : 'Paste a full https://t.me/... URL or @handle — normalized automatically.'}
                    </p>
                    {normalizeTelegramUrl(settingsTelegram) && (
                      <a
                        href={normalizeTelegramUrl(settingsTelegram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#229ED9] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>
                          {formatTelegramHandle(settingsTelegram)} ({normalizeTelegramUrl(settingsTelegram)})
                        </span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Support Email */}
                <div className="p-4 rounded-xl bg-[#181c27] border border-[#2a2e39] space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-white">
                    <Globe className="w-4 h-4 text-[#089981]" />
                    <span>{isAr ? 'البريد الإلكتروني الرسمي للدعم' : 'Official Support Email'}</span>
                  </label>
                  <input
                    type="email"
                    value={settingsEmail}
                    onChange={(e) => setSettingsEmail(e.target.value)}
                    placeholder="support@mbktrading.live"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-xs font-mono text-white placeholder-[#5d606b] focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-[#787b86] font-mono">
                    {settingsUpdatedBy
                      ? `${isAr ? 'آخر تعديل بواسطة:' : 'Last saved by:'} ${settingsUpdatedBy}`
                      : (isAr ? 'المستند الهدف: settings/platform' : 'Target document: settings/platform')}
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-6 py-2.5 rounded-xl bg-[#089981] hover:bg-[#07806c] disabled:opacity-50 text-white font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                  >
                    {isSavingSettings ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isAr ? 'حفظ إعدادات المنصة' : 'Save Platform Settings'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Test Bot Webhook Simulation Card */}
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Radio className="w-4 h-4" />
                <span>{isAr ? 'محاكاة وإرسال تنبيه Webhook تجريبي' : 'Simulate Test Webhook Alert'}</span>
              </div>
              <p className="text-[11px] text-[#787b86] leading-relaxed">
                {isAr
                  ? 'انقر هنا لإرسال تنبيه تداول تجريبي فوراً لاختبار صوت التنبيه، التوست، الشارة ورؤية التنبيه يظهر في القناة ومساعد التداول.'
                  : 'Click here to instantly trigger a test webhook trading alert to test audio chimes, toasts, unread badges, and live bot feed.'}
              </p>
              <button
                type="button"
                onClick={handleSimulateBotAlert}
                className="px-4 py-2 rounded-xl bg-[#089981] hover:bg-[#07806c] text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-md"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{isAr ? '🚀 إرسال تنبيه محاكاة Webhook الآن' : '🚀 Send Test Webhook Simulation Now'}</span>
              </button>
            </div>

            {/* Wipe Bot Server Signals Maintenance Card */}
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <Trash2 className="w-4 h-4" />
                <span>{isAr ? 'تفريغ وحذف جميع تنبيهات البوت (Wipe Bot Signals)' : 'Wipe All Bot Server Signals'}</span>
              </div>
              <p className="text-[11px] text-[#787b86] leading-relaxed">
                {isAr
                  ? 'هذا الإجراء سيقوم بحذف كافة تنبيهات Webhook الواردة من TradingView والمخزنة في مجموعة bot_alerts لتفريغ المساحة وتنظيف السجل عبر جميع الدومينات فوراً.'
                  : 'This action permanently deletes all incoming TradingView webhook alerts in bot_alerts to clear space and reset history across all domains.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isWipingBotAlerts}
                  onClick={handleWipeAllBotAlerts}
                  className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md ${
                    confirmWipeBots
                      ? 'bg-red-600 hover:bg-red-500 ring-2 ring-red-400 animate-pulse'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isWipingBotAlerts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>
                    {confirmWipeBots
                      ? isAr
                        ? '🔥 اضغط مجدداً لتأكيد الحذف النهائي لجميع تنبيهات البوت'
                        : '🔥 Click Again to Confirm Permanent Wipe'
                      : isAr
                      ? '⚠️ حذف وتفريغ كافة تنبيهات البوت الآن'
                      : '⚠️ Wipe All Bot Server Signals Now'}
                  </span>
                </button>
                {confirmWipeBots && (
                  <button
                    type="button"
                    onClick={() => setConfirmWipeBots(false)}
                    className="px-3 py-2 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2.5 ADMIN BROADCASTS TAB (POPUP ANNOUNCEMENTS & SEGMENTED BULK DMs) */}
        {/* ========================================================================= */}
        {activeTab === 'broadcasts' && (
          <AdminBroadcastsTab
            isAr={isAr}
            onShowFeedback={(type, message) => showFeedback(type, message)}
            users={users.map((u) => ({
              id: u.id || u.uid,
              name: u.displayName || u.username || u.email?.split('@')[0] || 'Trader',
              email: u.email,
              role: u.role,
              tier: u.tier,
              isVip: u.isVip,
              isElite: u.isElite,
              vipExpiryDate: u.vipExpiryDate,
              eliteExpiryDate: u.eliteExpiryDate,
              subscriptionEndDate: u.subscriptionEndDate,
              grantedFeatures: u.grantedFeatures,
              isBanned: u.isBanned,
            }))}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. DETAILED PROFILE INSPECTOR, GRANULAR ACCESS & PAYMENT CRM MODAL */}
      {/* ========================================================================= */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div
            className="bg-[#1e222d] border border-[#2a2e39] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#181c27] border-b border-[#2a2e39] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                  CRM
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? `ملف العميل: ${inspectUser.displayName}` : `CRM Inspector: ${inspectUser.displayName}`}
                  </h3>
                  <p className="text-[10px] text-[#787b86] font-mono">
                    UID: {inspectUser.id} • {getEffectiveTier(inspectUser).toUpperCase()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectUser(null)}
                className="p-1.5 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-[#787b86] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Core Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] text-xs">
                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
                  <span className="font-bold text-white font-mono truncate block">{inspectUser.email}</span>
                </div>

                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'رقم الهاتف' : 'Phone'}</span>
                  <span className="font-bold text-white font-mono block">{inspectUser.phone || '—'}</span>
                </div>

                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'الباقة الحالية' : 'Current Tier'}</span>
                  <span className="font-bold text-amber-400 font-mono block uppercase">
                    {getEffectiveTier(inspectUser)}
                    {inspectUser.subscriptionEndDate ? ` (${formatExpiryShort(inspectUser.subscriptionEndDate, isAr)})` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'الدولة' : 'Country'}</span>
                  <span className="font-bold text-white block">{inspectUser.country || 'Global'}</span>
                </div>

                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'مستوى الخبرة' : 'Experience'}</span>
                  <span className="font-bold text-cyan-300 block">{inspectUser.experienceLevel || 'Beginner'}</span>
                </div>

                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'إجمالي المدفوعات' : 'Lifetime Paid'}</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">${(inspectUser.totalPaid || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Direct Tier Grant / Revoke Controls (VIP / Elite with Custom Expiration) */}
              <div className="p-4 rounded-2xl bg-[#131722] border border-purple-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Gem className="w-4 h-4 text-purple-400" />
                    <span>{isAr ? 'منح أو سحب الباقة مباشرة (VIP / Elite)' : 'Direct Tier Grant / Revoke (VIP / Elite)'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#787b86]">
                    {isAr ? 'تحديد المدة أو تاريخ الانتهاء' : 'Custom days or expiry date'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(['vip', 'elite'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDirectTierTarget(t)}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold uppercase border cursor-pointer transition-all ${
                        directTierTarget === t
                          ? t === 'elite'
                            ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                            : 'bg-amber-500 text-black border-amber-400 shadow-sm'
                          : 'bg-[#1e222d] text-[#d1d4dc] border-[#2a2e39]'
                      }`}
                    >
                      {t === 'elite' ? 'ELITE ($500)' : 'VIP ($100)'}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDirectTierMode('days')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                      directTierMode === 'days'
                        ? 'bg-[#089981] text-white border-[#089981]'
                        : 'bg-[#1e222d] text-[#787b86] border-[#2a2e39]'
                    }`}
                  >
                    {isAr ? 'بالأيام' : 'By Days'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectTierMode('date')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                      directTierMode === 'date'
                        ? 'bg-[#089981] text-white border-[#089981]'
                        : 'bg-[#1e222d] text-[#787b86] border-[#2a2e39]'
                    }`}
                  >
                    {isAr ? 'بتاريخ مخصص' : 'Custom Date'}
                  </button>

                  {directTierMode === 'days' ? (
                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                      {[3, 7, 30, 90, 36500].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDirectTierDays(d)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${
                            directTierDays === d
                              ? 'bg-amber-500 text-black border-amber-400'
                              : 'bg-[#1e222d] text-[#d1d4dc] border-[#2a2e39]'
                          }`}
                        >
                          {d >= 36500 ? (isAr ? 'دائم' : 'Life') : `${d}d`}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={36500}
                        value={directTierDays}
                        onChange={(e) => setDirectTierDays(Math.max(1, Number(e.target.value) || 1))}
                        className="w-20 px-2.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={directTierCustomDate}
                      onChange={(e) => setDirectTierCustomDate(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white font-mono"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isUpdatingTier}
                    onClick={handleGrantDirectTier}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#089981] to-emerald-500 text-white font-extrabold text-xs shadow-md hover:brightness-110 cursor-pointer disabled:opacity-50"
                  >
                    {isAr ? `منح صلاحية ${directTierTarget.toUpperCase()}` : `Grant ${directTierTarget.toUpperCase()} Access`}
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingTier}
                    onClick={handleRevokeDirectTier}
                    className="py-2.5 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/40 font-extrabold text-xs cursor-pointer disabled:opacity-50"
                  >
                    {isAr ? 'سحب الباقة والعودة للمجاني (Free)' : 'Revoke Tier to Free ($0)'}
                  </button>
                </div>
              </div>

              {/* Individual Feature Access Controls (Bot Signals, VIP Signals, VIP Chat, Standard AI) */}
              <div className="p-4 rounded-2xl bg-[#131722] border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>{isAr ? 'التحكم الفردي في الميزات (تجربة / صلاحية مخصصة)' : 'Individual Feature Grants & Custom Expiry'}</span>
                  </span>
                </div>

                <div className="space-y-2">
                  {FEATURE_CATALOG.map((feat) => {
                    const currentExpiry = inspectUser.grantedFeatures?.[feat.key];
                    const isGrantActive = Boolean(currentExpiry && new Date(currentExpiry).getTime() > Date.now());
                    const isBusy = busyFeatureKey === feat.key;
                    return (
                      <div
                        key={feat.key}
                        className="p-3 rounded-xl bg-[#1e222d] border border-[#2a2e39] flex flex-col gap-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-white">
                              {isAr ? feat.labelAr : feat.labelEn}
                            </div>
                            <div className="text-[10px] font-mono">
                              {isGrantActive ? (
                                <span className="text-emerald-400">
                                  {isAr ? 'مفعّلة حتى: ' : 'Granted until: '}
                                  {formatExpiryShort(currentExpiry, isAr)}
                                </span>
                              ) : (
                                <span className="text-[#787b86]">
                                  {isAr ? 'غير مفعّلة كصلاحية فردية' : 'No active individual grant'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={3650}
                              value={featureGrantDays[feat.key] || 3}
                              onChange={(e) =>
                                setFeatureGrantDays((prev) => ({
                                  ...prev,
                                  [feat.key]: Math.max(1, Number(e.target.value) || 1)
                                }))
                              }
                              className="w-16 px-2 py-1 bg-[#131722] border border-[#2a2e39] rounded-lg text-[11px] text-white font-mono"
                              title={isAr ? 'عدد الأيام' : 'Days'}
                            />
                            <input
                              type="date"
                              value={featureGrantDates[feat.key] || ''}
                              onChange={(e) =>
                                setFeatureGrantDates((prev) => ({
                                  ...prev,
                                  [feat.key]: e.target.value
                                }))
                              }
                              className="px-2 py-1 bg-[#131722] border border-[#2a2e39] rounded-lg text-[10px] text-white font-mono"
                              title={isAr ? 'تاريخ انتهاء مخصص' : 'Custom expiry date'}
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleGrantIndividualFeature(feat.key)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[11px] cursor-pointer disabled:opacity-50"
                            >
                              {isAr ? 'منح' : 'Grant'}
                            </button>
                            {isGrantActive && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRevokeIndividualFeature(feat.key)}
                                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                              >
                                {isAr ? 'سحب' : 'Revoke'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Role Setter Controls */}
              <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-2">
                <span className="text-xs font-bold text-white block">{isAr ? 'تعيين رتبة العضوية والطاقم' : 'Change User Role'}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {(['FREE', 'VIP', 'ELITE', 'SALES', 'MODERATOR', 'ADMIN'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleSetRole(inspectUser.id, r)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        (r === 'ELITE' ? inspectUser.tier === 'elite' : inspectUser.role === r && !(r === 'VIP' && inspectUser.tier === 'elite'))
                          ? 'bg-[#089981] text-white shadow-md'
                          : 'bg-[#1e222d] text-[#787b86] hover:text-white border border-[#2a2e39]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Payment Logger & VIP Extension Form */}
              <form onSubmit={handleLogManualPayment} className="p-4 rounded-2xl bg-gradient-to-br from-[#131722] to-[#181c27] border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <DollarSign className="w-4 h-4" />
                  <span>{isAr ? 'تسجيل دفعة تفعيل وتجديد العضوية' : 'Log Manual Payment & Renew Subscription'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#787b86] font-bold mb-1">
                      {isAr ? 'المبلغ المستلم ($)' : 'Amount Paid ($)'}
                    </label>
                    <input
                      type="number"
                      value={paymentAmountInput}
                      onChange={(e) => setPaymentAmountInput(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded-xl text-xs text-white font-mono focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#787b86] font-bold mb-1">
                      {isAr ? 'مدة التمديد' : 'Extension Duration'}
                    </label>
                    <select
                      value={paymentDurationInput}
                      onChange={(e) => setPaymentDurationInput(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded-xl text-xs text-white font-mono focus:outline-hidden cursor-pointer"
                    >
                      <option value="30">{isAr ? '+30 يوم' : '+30 Days'}</option>
                      <option value="90">{isAr ? '+90 يوم (3 أشهر)' : '+90 Days'}</option>
                      <option value="180">{isAr ? '+180 يوم (6 أشهر)' : '+180 Days'}</option>
                      <option value="365">{isAr ? '+365 يوم (سنة)' : '+365 Days'}</option>
                      <option value="lifetime">{isAr ? 'مدى الحياة (Lifetime)' : 'Lifetime'}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingPayment}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow-md hover:brightness-110 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoggingPayment ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-4 h-4 fill-black" />
                      <span>{isAr ? 'تسجيل الدفعة وتمديد الاشتراك' : 'Log Payment & Extend Access'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#181c27] border-t border-[#2a2e39] flex items-center justify-between shrink-0">
              <button
                onClick={() => setInspectUser(null)}
                className="px-4 py-2 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-bold transition-colors cursor-pointer ms-auto"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
