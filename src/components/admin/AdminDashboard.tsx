import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  Ban,
  BarChart3,
  Bell,
  BellOff,
  BellRing,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Database,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Gem,
  Globe,
  History,
  Key,
  LayoutDashboard,
  Lock,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trash2,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  VolumeX,
  Wrench,
  X,
  Zap
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import {
  ActiveDatabaseMode,
  auth,
  db,
  getActiveDatabaseMode,
  setActiveDatabaseMode
} from '../../lib/firebase';
import { soundManager } from '../../utils/audio';
import {
  registerWebPushSubscription,
  requestAppNotificationPermission
} from '../../utils/mobileNotifications';
import { formatKeyDurationLabel } from '../../utils/activationKeyService';
import { subscribeToAuth } from '../../services/firebaseAuthService';
import {
  createFullBackupSnapshot,
  getLastAutoBackupTime,
  restoreFromBackupSnapshot,
  syncAllLegacyDataToDefaultDb
} from '../../utils/legacyDbRecovery';
import {
  buildWhatsAppUrl,
  DEFAULT_PLAN_PRICING,
  DEFAULT_PLATFORM_SETTINGS,
  fetchPlanPricingSettings,
  formatTelegramHandle,
  getCachedPlanPricingSettings,
  normalizeTelegramUrl,
  PlanPricingSettings,
  savePlanPricingSettings,
  savePlatformSettings,
  subscribeToPlatformSettings
} from '../../services/platformSettingsService';
import {
  FEATURE_CATALOG,
  FeatureKey,
  formatExpiryShort,
  getActiveTrialFeatures,
  getEffectiveTier,
  getFeatureLabel,
  SubscriptionTier
} from '../../utils/entitlements';
import {
  AdminInternalNote,
  StaffPermissionKey,
  StaffPermissionsMap,
  StaffRolePreset,
  UserProfile
} from '../../types/trading';
import {
  detectRolePresetFromPermissions,
  EMPTY_PERMISSIONS,
  getStaffRoleLabel,
  hasAnyStaffPermission,
  hasStaffPermission,
  isSuperAdminUser,
  resolveStaffPermissions,
  ROLE_PRESET_DEFINITIONS,
  STAFF_PERMISSION_CATALOG
} from '../../utils/rbac';
import {
  AdminAuditLogEntry,
  fetchAdminAuditLogs,
  recordAdminAuditLog
} from '../../services/adminAuditService';

import { PublishingCenter } from './PublishingCenter';
import { AdminBroadcastsTab } from './AdminBroadcastsTab';
import { AdminAnalyticsOverview } from './AdminAnalyticsOverview';

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
  role: 'ADMIN' | 'MODERATOR' | 'SALES' | 'VIP' | 'ELITE' | 'FREE' | 'ANALYSER' | string;
  staffRole?: StaffRolePreset | string;
  permissions?: StaffPermissionsMap;
  adminNotes?: AdminInternalNote[];
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
  createdAtMs?: number;
  lastActiveAt?: string;
  lastActiveAtMs?: number;
  altDocIds?: string[];
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

type AdminSectionId =
  | 'overview'
  | 'users'
  | 'messaging'
  | 'trading'
  | 'team'
  | 'system';

interface Props {
  userProfile?: UserProfile | null;
  currentRole?: string;
  isAdmin?: boolean;
  lang?: 'ar' | 'en';
  onClose?: () => void;
  onStartDirectMessage?: (target: {
    uid: string;
    displayName: string;
    avatar?: string;
    role: string;
  }) => void;
}

let hasFetchedActivationKeysThisSession = false;
let hasFetchedAdminUsersThisSession = false;
let sessionCachedAdminUsers: AdminUserRecord[] = [];
let lastHandledUsersRetryTick = 0;

let hasFetchedPushActiveUidsThisSession = false;
let sessionCachedPushActiveUids: Set<string> = new Set();
let lastHandledPushRetryTick = 0;

let hasFetchedAuditLogsThisSession = false;
let sessionCachedAuditLogs: AdminAuditLogEntry[] = [];

function parseFirestoreTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val?.seconds === 'number') return val.seconds * 1000;
  if (typeof val?.toDate === 'function') return val.toDate().getTime();
  const parsed = new Date(val).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDateTimeCompact(ms: number | undefined, fallbackStr: string | undefined, isAr: boolean): string {
  if (ms && ms > 0) {
    try {
      return new Date(ms).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch {
      // ignore
    }
  }
  return fallbackStr || '—';
}

export const AdminDashboard: React.FC<Props> = ({
  userProfile,
  currentRole = 'free',
  isAdmin = false,
  lang = 'ar',
  onClose,
  onStartDirectMessage
}) => {
  const isAr = lang === 'ar';
  const [liveAuthProfile, setLiveAuthProfile] = useState<UserProfile | null>(userProfile || null);
  const [dbQuotaExceeded, setDbQuotaExceeded] = useState<boolean>(false);
  const [crmRetryTick, setCrmRetryTick] = useState<number>(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Sync logged-in user's profile from singleton auth listener (0 extra reads)
  useEffect(() => {
    const unsub = subscribeToAuth((profile) => {
      if (profile) {
        setLiveAuthProfile(profile);
      }
    });
    return () => unsub();
  }, []);

  const currentActorProfile: Partial<UserProfile> = useMemo(() => {
    const base: Partial<UserProfile> = liveAuthProfile || userProfile || {};
    const email = base.email || auth.currentUser?.email || '';
    const isSuper =
      email.toLowerCase() === 'moe.albzour@gmail.com' ||
      Boolean(isAdmin) ||
      Boolean(base.isAdmin) ||
      (base.role || currentRole || '').toString().toUpperCase() === 'ADMIN';
    return {
      ...base,
      uid: base.uid || auth.currentUser?.uid,
      email,
      role: isSuper ? 'ADMIN' : base.role || currentRole || 'FREE',
      isAdmin: isSuper
    };
  }, [liveAuthProfile, userProfile, currentRole, isAdmin]);

  const myPermissions = useMemo(
    () => resolveStaffPermissions(currentActorProfile),
    [currentActorProfile]
  );

  const isFullAdmin = useMemo(
    () => isSuperAdminUser(currentActorProfile) || Boolean(myPermissions.canManageSystem),
    [currentActorProfile, myPermissions.canManageSystem]
  );

  const isStaff = useMemo(
    () => isFullAdmin || hasAnyStaffPermission(currentActorProfile),
    [isFullAdmin, currentActorProfile]
  );

  const effectiveRole = useMemo(() => {
    if (isFullAdmin) return 'admin';
    return (currentActorProfile.role || currentRole || 'free').toString().toLowerCase();
  }, [isFullAdmin, currentActorProfile.role, currentRole]);

  // 6 Top-Level Sections with Granular RBAC Visibility
  const navSections = useMemo(() => {
    const allSections: Array<{
      id: AdminSectionId;
      labelEn: string;
      labelAr: string;
      shortEn: string;
      shortAr: string;
      icon: React.ComponentType<{ className?: string }>;
      allowed: boolean;
    }> = [
      {
        id: 'overview',
        labelEn: 'Overview & Analytics',
        labelAr: 'نظرة عامة والإحصائيات',
        shortEn: 'Overview',
        shortAr: 'الإحصائيات',
        icon: LayoutDashboard,
        allowed: Boolean(myPermissions.canViewAnalytics || myPermissions.canManageSystem)
      },
      {
        id: 'users',
        labelEn: 'Users & CRM',
        labelAr: 'إدارة العملاء والاشتراكات',
        shortEn: 'Users & CRM',
        shortAr: 'العملاء CRM',
        icon: Users,
        allowed: Boolean(
          myPermissions.canManageUsers ||
            myPermissions.canManageSystem
        )
      },
      {
        id: 'messaging',
        labelEn: 'Popups & Messaging',
        labelAr: 'النوافذ والرسائل الجماعية',
        shortEn: 'Messaging',
        shortAr: 'الرسائل',
        icon: Megaphone,
        allowed: Boolean(myPermissions.canSendPopups || myPermissions.canManageSystem)
      },
      {
        id: 'trading',
        labelEn: 'Trading & Content',
        labelAr: 'التداول ونشر الصفقات',
        shortEn: 'Trading',
        shortAr: 'التوصيات',
        icon: Zap,
        allowed: Boolean(
          myPermissions.canPostSignals ||
            myPermissions.canPostAnalysis ||
            myPermissions.canManageSystem
        )
      },
      {
        id: 'team',
        labelEn: 'Team & Permissions',
        labelAr: 'الفريق والصلاحيات (RBAC)',
        shortEn: 'Team & RBAC',
        shortAr: 'الصلاحيات',
        icon: UserCog,
        allowed: Boolean(myPermissions.canManageSystem)
      },
      {
        id: 'system',
        labelEn: 'System & Tools',
        labelAr: 'النظام والأدوات والمفاتيح',
        shortEn: 'System',
        shortAr: 'النظام',
        icon: Wrench,
        allowed: Boolean(myPermissions.canManageSystem || myPermissions.canManageUsers)
      }
    ];
    return allSections.filter((s) => s.allowed);
  }, [myPermissions]);

  const [activeSection, setActiveSection] = useState<AdminSectionId>(() => {
    if (myPermissions.canViewAnalytics || myPermissions.canManageSystem) return 'overview';
    if (myPermissions.canManageUsers) return 'users';
    if (myPermissions.canSendPopups) return 'messaging';
    if (myPermissions.canPostSignals || myPermissions.canPostAnalysis) return 'trading';
    return 'overview';
  });

  // Ensure activeSection is always one the staff member is permitted to view
  useEffect(() => {
    if (navSections.length === 0) return;
    const isAllowed = navSections.some((s) => s.id === activeSection);
    if (!isAllowed) {
      setActiveSection(navSections[0].id);
    }
  }, [navSections, activeSection]);

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
  const [trialSelectedFeatures, setTrialSelectedFeatures] = useState<FeatureKey[]>([
    'botSignals',
    'vipSignals'
  ]);
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
  const [planFilter, setPlanFilter] = useState<'ALL' | 'FREE' | 'VIP' | 'ELITE'>('ALL');
  const [subStatusFilter, setSubStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'EXPIRING_3D' | 'EXPIRING_7D' | 'EXPIRED' | 'NO_EXPIRY'
  >('ALL');
  const [accountStatusFilter, setAccountStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'MUTED' | 'BANNED'
  >('ALL');
  const [staffFilter, setStaffFilter] = useState<'ALL' | 'STAFF_ONLY' | 'CLIENTS_ONLY'>('ALL');
  const [userSortBy, setUserSortBy] = useState<'NEWEST' | 'EXPIRING_SOONEST' | 'TIER'>('NEWEST');

  // Set of UIDs that have an active Web Push subscription in `push_subscriptions`
  const [pushActiveUids, setPushActiveUids] = useState<Set<string>>(new Set());

  // CRM Profile Inspector Drawer/Modal State
  const [inspectUser, setInspectUser] = useState<AdminUserRecord | null>(null);
  const [directTierTarget, setDirectTierTarget] = useState<'vip' | 'elite'>('vip');
  const [directTierMode, setDirectTierMode] = useState<'days' | 'date'>('days');
  const [directTierDays, setDirectTierDays] = useState<number>(30);
  const [directTierCustomDate, setDirectTierCustomDate] = useState<string>(() => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [isUpdatingTier, setIsUpdatingTier] = useState(false);

  // Internal Staff Notes State
  const [newStaffNoteText, setNewStaffNoteText] = useState('');
  const [isSavingStaffNote, setIsSavingStaffNote] = useState(false);

  const [featureGrantDays, setFeatureGrantDays] = useState<Record<FeatureKey, number>>({
    botSignals: 3,
    vipSignals: 3,
    vipChat: 3,
    standardAi: 3,
    publishAnalysis: 30
  });
  const [featureGrantDates, setFeatureGrantDates] = useState<Record<FeatureKey, string>>({
    botSignals: '',
    vipSignals: '',
    vipChat: '',
    standardAi: '',
    publishAnalysis: ''
  });
  const [busyFeatureKey, setBusyFeatureKey] = useState<FeatureKey | null>(null);

  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('100');
  const [paymentDurationInput, setPaymentDurationInput] = useState<
    '30' | '90' | '180' | '365' | 'lifetime'
  >('30');
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);

  // ================= TEAM & PERMISSIONS (RBAC + AUDIT LOG) STATE =================
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [selectedRbacUser, setSelectedRbacUser] = useState<AdminUserRecord | null>(null);
  const [editingPreset, setEditingPreset] = useState<StaffRolePreset>('none');
  const [editingPermissions, setEditingPermissions] = useState<Record<StaffPermissionKey, boolean>>({
    ...EMPTY_PERMISSIONS
  });
  const [isSavingRbac, setIsSavingRbac] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogEntry[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');

  // ================= PLATFORM SETTINGS STATE (settings/platform) =================
  const [settingsWhatsapp, setSettingsWhatsapp] = useState<string>(
    DEFAULT_PLATFORM_SETTINGS.whatsappNumber
  );
  const [settingsTelegram, setSettingsTelegram] = useState<string>(
    DEFAULT_PLATFORM_SETTINGS.telegramUrl
  );
  const [settingsEmail, setSettingsEmail] = useState<string>(
    DEFAULT_PLATFORM_SETTINGS.supportEmail
  );
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<string | undefined>(undefined);
  const [settingsUpdatedBy, setSettingsUpdatedBy] = useState<string | undefined>(undefined);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // ================= PLAN PRICING & MRR CONFIG STATE (settings/pricing) =================
  const [loadedPlanPricing, setLoadedPlanPricing] = useState<PlanPricingSettings>(() =>
    getCachedPlanPricingSettings()
  );
  const [pricingVipInput, setPricingVipInput] = useState<string>(() =>
    String(getCachedPlanPricingSettings().vipMonthlyUsd)
  );
  const [pricingEliteInput, setPricingEliteInput] = useState<string>(() =>
    String(getCachedPlanPricingSettings().eliteMonthlyUsd)
  );
  const [pricingSyncPublic, setPricingSyncPublic] = useState<boolean>(() =>
    Boolean(getCachedPlanPricingSettings().syncToPublicPlans)
  );
  const [isSavingPlanPricing, setIsSavingPlanPricing] = useState<boolean>(false);

  const [isWipingBotAlerts, setIsWipingBotAlerts] = useState<boolean>(false);
  const [confirmWipeBots, setConfirmWipeBots] = useState<boolean>(false);
  const [isPushingAppUpdate, setIsPushingAppUpdate] = useState<boolean>(false);
  const [isTestingBackgroundPush, setIsTestingBackgroundPush] = useState<boolean>(false);
  const [backgroundPushResult, setBackgroundPushResult] = useState<Record<string, any> | null>(
    null
  );
  const [remoteAppVersionInfo, setRemoteAppVersionInfo] = useState<{
    versionId?: string;
    versionLabel?: string;
    updatedAt?: string;
    updatedBy?: string;
  } | null>(null);

  // Notifications
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Load Push Subscription active UIDs once per session when Users & CRM or Overview loads (or on manual refresh)
  useEffect(() => {
    if (!isStaff) return;
    if (
      !myPermissions.canManageUsers &&
      !myPermissions.canViewAnalytics &&
      !myPermissions.canManageSystem
    ) {
      return;
    }
    if (activeSection !== 'users' && activeSection !== 'overview') return;

    const isManualRefresh = crmRetryTick > lastHandledPushRetryTick;
    if (hasFetchedPushActiveUidsThisSession && !isManualRefresh) {
      setPushActiveUids(sessionCachedPushActiveUids);
      return;
    }
    lastHandledPushRetryTick = crmRetryTick;

    getDocs(query(collection(db, 'push_subscriptions'), limit(300)))
      .then((snap) => {
        const nextSet = new Set<string>();
        snap.forEach((d) => {
          const data = d.data() as Record<string, any>;
          const subs = Array.isArray(data.subscriptions) ? data.subscriptions : [];
          if (subs.length > 0 || data.endpoint) {
            nextSet.add(d.id);
          }
        });
        hasFetchedPushActiveUidsThisSession = true;
        sessionCachedPushActiveUids = nextSet;
        setPushActiveUids(nextSet);
      })
      .catch(() => {
        // ignore if rules or quota block
      });
  }, [
    isStaff,
    activeSection,
    crmRetryTick,
    myPermissions.canManageUsers,
    myPermissions.canViewAnalytics,
    myPermissions.canManageSystem
  ]);

  // Load Audit Logs when Team & Permissions tab is opened (memory-cached across tab switches)
  const loadAuditLogs = async (forceOrEvent?: boolean | React.MouseEvent) => {
    if (!isFullAdmin) return;
    const forceRefresh =
      forceOrEvent === true || (typeof forceOrEvent === 'object' && forceOrEvent !== null);
    if (hasFetchedAuditLogsThisSession && !forceRefresh) {
      setAuditLogs(sessionCachedAuditLogs);
      return;
    }
    setAuditLogsLoading(true);
    try {
      const logs = await fetchAdminAuditLogs(100);
      hasFetchedAuditLogsThisSession = true;
      sessionCachedAuditLogs = logs;
      setAuditLogs(logs);
    } finally {
      setAuditLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'team' && isFullAdmin) {
      loadAuditLogs(false);
    }
  }, [activeSection, isFullAdmin]);

  // Sync RBAC editor state when a user is selected in Team & Permissions
  const handleSelectUserForRbac = (target: AdminUserRecord) => {
    soundManager.playClick();
    setSelectedRbacUser(target);
    const resolved = resolveStaffPermissions(target);
    setEditingPermissions(resolved);
    const isSuper = isSuperAdminUser(target);
    const preset =
      (target.staffRole as StaffRolePreset | undefined) &&
      ROLE_PRESET_DEFINITIONS.some((p) => p.id === target.staffRole)
        ? (target.staffRole as StaffRolePreset)
        : detectRolePresetFromPermissions(resolved, isSuper);
    setEditingPreset(preset);
  };

  const handleApplyRbacPreset = (presetId: StaffRolePreset) => {
    soundManager.playClick();
    setEditingPreset(presetId);
    const found = ROLE_PRESET_DEFINITIONS.find((p) => p.id === presetId);
    if (found) {
      setEditingPermissions({ ...found.permissions });
    }
  };

  const handleTogglePermissionFlag = (flag: StaffPermissionKey) => {
    soundManager.playClick();
    setEditingPermissions((prev) => {
      const next = { ...prev, [flag]: !prev[flag] };
      const matched = detectRolePresetFromPermissions(next, false);
      setEditingPreset(matched);
      return next;
    });
  };

  const handleSaveStaffPermissions = async () => {
    if (!selectedRbacUser || !isFullAdmin || isSavingRbac) return;
    if (
      selectedRbacUser.email?.toLowerCase() === 'moe.albzour@gmail.com' &&
      !editingPermissions.canManageSystem
    ) {
      showFeedback(
        'error',
        isAr
          ? 'لا يمكن إزالة صلاحية المدير العام عن مالك المنصة الأساسي.'
          : 'Cannot remove Super Admin system permission from primary owner.'
      );
      return;
    }

    setIsSavingRbac(true);
    soundManager.playClick();
    try {
      const hasAnyPerm = Object.values(editingPermissions).some(Boolean);
      const isSuper =
        editingPreset === 'super_admin' || Boolean(editingPermissions.canManageSystem);

      let legacyRole = 'free';
      if (isSuper) {
        legacyRole = 'admin';
      } else if (editingPreset !== 'none' && editingPreset !== 'custom') {
        const presetDef = ROLE_PRESET_DEFINITIONS.find((p) => p.id === editingPreset);
        legacyRole = presetDef?.legacyRole || 'moderator';
      } else if (hasAnyPerm) {
        if (editingPermissions.canPostSignals || editingPermissions.canPostAnalysis) {
          legacyRole = 'analyser';
        } else if (editingPermissions.canAccessInbox || editingPermissions.canManageUsers) {
          legacyRole = 'sales';
        } else {
          legacyRole = 'moderator';
        }
      } else {
        // Keep existing paid tier if returning to regular client
        const effTier = getEffectiveTier(selectedRbacUser);
        legacyRole = effTier === 'elite' || effTier === 'vip' ? 'vip' : 'free';
      }

      const nextStaffRole: StaffRolePreset = isSuper
        ? 'super_admin'
        : hasAnyPerm
        ? editingPreset === 'none'
          ? 'custom'
          : editingPreset
        : 'none';

      const payload: Record<string, any> = {
        uid: selectedRbacUser.id,
        role: legacyRole,
        staffRole: nextStaffRole,
        permissions: editingPermissions,
        updatedAt: serverTimestamp()
      };

      if (isSuper) {
        payload.tier = 'elite';
        payload.isVip = true;
        payload.vipAccess = true;
        payload.isElite = true;
        payload.subscription_status = 'active';
      } else if (hasAnyPerm) {
        payload.isVip = true;
        payload.vipAccess = true;
        payload.subscription_status = 'active';
      }

      await setDoc(doc(db, 'users', selectedRbacUser.id), payload, { merge: true });

      // Sync badge in chat_profiles
      const chatBadgeRole = isSuper
        ? 'ADMIN'
        : hasAnyPerm
        ? legacyRole.toUpperCase()
        : selectedRbacUser.tier === 'elite' || selectedRbacUser.isVip
        ? 'VIP'
        : 'FREE';
      await setDoc(
        doc(db, 'chat_profiles', selectedRbacUser.id),
        {
          uid: selectedRbacUser.id,
          role: chatBadgeRole,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      ).catch(() => {});

      const enabledFlags = (Object.keys(editingPermissions) as StaffPermissionKey[]).filter(
        (k) => editingPermissions[k]
      );

      await recordAdminAuditLog({
        action: 'STAFF_PERMISSIONS_UPDATED',
        targetUid: selectedRbacUser.id,
        targetLabel: `${selectedRbacUser.displayName} (${selectedRbacUser.email})`,
        details: `Preset: ${nextStaffRole} | Role: ${legacyRole.toUpperCase()} | Permissions: ${
          enabledFlags.length > 0 ? enabledFlags.join(', ') : 'None (Regular Client)'
        }`
      });

      const updatedUser: AdminUserRecord = {
        ...selectedRbacUser,
        role: legacyRole.toUpperCase(),
        staffRole: nextStaffRole,
        permissions: { ...editingPermissions }
      };

      setUsers((prev) => {
        const nextList = prev.map((u) => (u.id === selectedRbacUser.id ? updatedUser : u));
        try {
          localStorage.setItem('mbk_admin_cached_users_v1', JSON.stringify(nextList));
        } catch {
          // ignore
        }
        return nextList;
      });
      setSelectedRbacUser(updatedUser);
      if (inspectUser?.id === selectedRbacUser.id) {
        setInspectUser(updatedUser);
      }

      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم تحديث صلاحيات ${selectedRbacUser.displayName} بنجاح وتسجيلها في سجل التدقيق.`
          : `Updated staff permissions for ${selectedRbacUser.displayName} and logged to audit trail.`
      );
      loadAuditLogs(true);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to update staff permissions');
    } finally {
      setIsSavingRbac(false);
    }
  };

  // ================= TEST BACKGROUND PUSH =================
  const handleTestBackgroundPush = async () => {
    if (!isFullAdmin || isTestingBackgroundPush) return;
    soundManager.playClick();
    setIsTestingBackgroundPush(true);
    setBackgroundPushResult(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setBackgroundPushResult({
          subscribed: false,
          sentCount: 0,
          error: 'No signed-in Firebase user'
        });
        return;
      }

      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await requestAppNotificationPermission();
      }

      const idToken = await currentUser.getIdToken(true);
      const subRes = await registerWebPushSubscription(idToken, {
        isVip: true,
        isAdmin: true
      });

      if (!subRes.subscribed) {
        setBackgroundPushResult({
          subscribed: false,
          sentCount: 0,
          error: subRes.error || 'Web Push subscription failed',
          subscribeResponse: subRes
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const sendHttpRes = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title: 'MBK Trading • اختبار إشعار الخلفية',
          body: isAr
            ? 'نجح إرسال إشعار Web Push الحقيقي بنجاح! سيصل هذا الإشعار حتى عند إغلاق التطبيق.'
            : 'Real background Web Push delivered! Lock-screen notifications are active.',
          url: '/',
          tag: `mbk-test-push-${Date.now()}`,
          audience: 'targetUid',
          targetUid: currentUser.uid,
          excludeUid: null
        })
      });

      const sendJson = await sendHttpRes.json().catch(() => ({
        ok: false,
        sentCount: 0,
        error: `Non-JSON response (HTTP ${sendHttpRes.status})`
      }));

      setBackgroundPushResult({
        subscribed: subRes.subscribed,
        sentCount: Number(sendJson?.sentCount ?? sendJson?.sent ?? 0),
        deviceCount: subRes.deviceCount,
        storageMode: sendJson?.storageMode || subRes.storageMode,
        ...(sendJson?.error ? { error: sendJson.error } : {}),
        ...(sendJson?.skipped ? { skipped: sendJson.skipped } : {}),
        ...(sendJson?.errors ? { errors: sendJson.errors } : {})
      });
    } catch (err: any) {
      setBackgroundPushResult({
        subscribed: false,
        sentCount: 0,
        error: err?.message || 'Unexpected error during push test'
      });
    } finally {
      setIsTestingBackgroundPush(false);
    }
  };

  useEffect(() => {
    if (!isStaff) return;
    try {
      const cachedVer = localStorage.getItem('mbk_remote_app_version_info');
      if (cachedVer) {
        setRemoteAppVersionInfo(JSON.parse(cachedVer));
      }
    } catch {
      // ignore
    }
  }, [isStaff, activeSection]);

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

      await recordAdminAuditLog({
        action: 'SYSTEM_ACTION',
        targetUid: 'all_devices',
        targetLabel: 'All Connected Devices & PWAs',
        details: `Pushed live app update (${newVersionId})`
      });

      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? 'تم دفع التحديث بنجاح لجميع أجهزة اللابتوب والموبايل والاختصارات (PWA) في الوقت الفعلي دون إخراجهم من حساباتهم!'
          : 'Update pushed live to all connected laptops, mobiles, and PWA shortcuts without signing them out!'
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
      await recordAdminAuditLog({
        action: 'SYSTEM_ACTION',
        targetUid: 'bot_alerts',
        targetLabel: 'TradingView Bot Alerts Collection',
        details: `Wiped ${docs.length} bot webhook alerts`
      });
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
          ? '[محاكاة Webhook تجريبي] BUY XAUUSD @ 2680.00 - TP1: 2700.00 SL: 2665.00'
          : '[Test Webhook Simulation] BUY XAUUSD @ 2680.00 - TP1: 2700.00 SL: 2665.00',
        chat_id: null,
        timestamp: new Date(nowMs).toISOString(),
        timestampMs: nowMs
      };
      await setDoc(doc(db, 'bot_alerts', alertId), alertDoc);
      soundManager.playSuccess();
      showFeedback(
        'success',
        isAr
          ? 'تم إرسال وتوليد تنبيه Webhook التجريبي بنجاح!'
          : 'Test webhook simulation alert sent successfully!'
      );
    } catch (err: any) {
      showFeedback(
        'error',
        err?.message || (isAr ? 'فشل إرسال التنبيه التجريبي' : 'Failed to send test alert')
      );
    }
  };

  const [isSyncingLegacyDb, setIsSyncingLegacyDb] = useState(false);

  const handleSyncLegacyData = async (silent: boolean = false) => {
    if (!isStaff) return;
    if (!silent) {
      soundManager.playClick();
    }
    setIsSyncingLegacyDb(true);
    try {
      const stats = await syncAllLegacyDataToDefaultDb(true);
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
              ? 'تم استعادة السجلات المتوفرة محلياً. ملاحظة: قاعدة البيانات القديمة لا تزال تحت قفل الحصة اليومية (Quota 429) من Google.'
              : 'Local records restored. Note: The old database instance is still under Google’s daily 429 read lock.'
          );
        } else {
          soundManager.playSuccess();
          showFeedback(
            'success',
            isAr
              ? `تمت استعادة ومزامنة البيانات بنجاح (الأعضاء: ${stats.usersRecovered}، الصفقات: ${stats.signalsRecovered}، الشات: ${stats.publicChatRecovered}، الرسائل الخاصة: ${stats.dmConversationsRecovered})!`
              : `Historical data restored & synced (Users: ${stats.usersRecovered}, Trades: ${stats.signalsRecovered}, Chat: ${stats.publicChatRecovered}, DMs: ${stats.dmConversationsRecovered})!`
          );
        }
      }
    } catch (err: any) {
      if (!silent) {
        showFeedback(
          'error',
          err?.message || (isAr ? 'حدث خطأ أثناء الاستعادة' : 'Recovery error')
        );
      }
    } finally {
      setIsSyncingLegacyDb(false);
    }
  };

  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [activeDbMode, setActiveDbMode] = useState<ActiveDatabaseMode>(() =>
    getActiveDatabaseMode()
  );
  const [lastAutoBackupIso, setLastAutoBackupIso] = useState<string | null>(() =>
    getLastAutoBackupTime()
  );

  const handleSwitchDatabaseMode = async (targetMode?: ActiveDatabaseMode) => {
    if (!isFullAdmin) return;
    soundManager.playClick();
    const nextMode: ActiveDatabaseMode =
      targetMode || (activeDbMode === 'default' ? 'secondary' : 'default');
    try {
      await createFullBackupSnapshot(false, true).catch(() => {});
      setActiveDatabaseMode(nextMode);
      setActiveDbMode(nextMode);
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم تبديل قاعدة البيانات النشطة إلى (${
              nextMode === 'default' ? 'الرئيسية (default)' : 'الاحتياطية ai-studio-mbktrading'
            })! جاري إعادة تحميل المنصة...`
          : `Switched active database to (${
              nextMode === 'default' ? 'Primary (default)' : 'Standby ai-studio-mbktrading'
            })! Reloading workspace...`
      );
      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to switch database');
    }
  };

  const handleExportFullBackupJson = async () => {
    if (!isFullAdmin || isExportingBackup) return;
    soundManager.playClick();
    setIsExportingBackup(true);
    try {
      const snapshot = await createFullBackupSnapshot(true, false);
      setLastAutoBackupIso(snapshot.createdAt);
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `mbk-full-backup-${new Date().toISOString().slice(0, 16).replace(':', '')}.json`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      soundManager.playSuccess();
      showFeedback(
        'success',
        isAr
          ? `تم تحميل وحفظ النسخة الاحتياطية الكاملة (${snapshot.users.length} عضو، ${snapshot.signals.length} صفقة، ${snapshot.public_chat.length} رسالة شات، ${snapshot.dm_conversations.length} محادثة خاصة)!`
          : `Full backup exported (${snapshot.users.length} users, ${snapshot.signals.length} trades, ${snapshot.public_chat.length} chat msgs, ${snapshot.dm_conversations.length} DMs)!`
      );
    } catch (err: any) {
      showFeedback(
        'error',
        err?.message || (isAr ? 'فشل تصدير النسخة الاحتياطية' : 'Failed to export backup')
      );
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleImportFullBackupJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isFullAdmin) return;
    soundManager.playClick();
    setIsImportingBackup(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const count = await restoreFromBackupSnapshot(parsed);
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم استرجاع ${count} سجل من ملف النسخة الاحتياطية إلى قاعدة البيانات بنجاح!`
          : `Successfully restored ${count} records from backup file into Firestore!`
      );
    } catch (err: any) {
      showFeedback(
        'error',
        err?.message || (isAr ? 'ملف النسخة الاحتياطية غير صالح' : 'Invalid backup file')
      );
    } finally {
      setIsImportingBackup(false);
    }
  };

  // Automatic hourly snapshot backup from local cache (0 quota reads)
  useEffect(() => {
    if (!isFullAdmin) return;
    const initialTimer = setTimeout(() => {
      createFullBackupSnapshot(false, true)
        .then((s) => setLastAutoBackupIso(s.createdAt))
        .catch(() => {});
    }, 15000);
    const hourlyInterval = setInterval(() => {
      createFullBackupSnapshot(false, true)
        .then((s) => setLastAutoBackupIso(s.createdAt))
        .catch(() => {});
    }, 60 * 60 * 1000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(hourlyInterval);
    };
  }, [isFullAdmin]);

  useEffect(() => {
    if (!isStaff || activeSection !== 'system') return;
    const unsubSettings = subscribeToPlatformSettings((settings) => {
      setSettingsWhatsapp(settings.whatsappNumber || '');
      setSettingsTelegram(settings.telegramUrl || '');
      setSettingsEmail(settings.supportEmail || DEFAULT_PLATFORM_SETTINGS.supportEmail);
      setSettingsUpdatedAt(settings.updatedAt);
      setSettingsUpdatedBy(settings.updatedBy);
    });
    if (isFullAdmin) {
      fetchPlanPricingSettings(false)
        .then((pricing) => {
          setLoadedPlanPricing(pricing);
          setPricingVipInput(String(pricing.vipMonthlyUsd));
          setPricingEliteInput(String(pricing.eliteMonthlyUsd));
          setPricingSyncPublic(Boolean(pricing.syncToPublicPlans));
        })
        .catch(() => {});
    }
    return () => unsubSettings();
  }, [isStaff, isFullAdmin, activeSection]);

  const handleSavePlanPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFullAdmin || isSavingPlanPricing) {
      showFeedback(
        'error',
        isAr
          ? 'صلاحية تعديل أسعار الباقات مخصصة للمدير العام أو صلاحية النظام فقط.'
          : 'Only Admins with canManageSystem permission can update plan pricing.'
      );
      return;
    }

    const parsedVip = Number(pricingVipInput);
    const parsedElite = Number(pricingEliteInput);
    if (!Number.isFinite(parsedVip) || parsedVip < 0 || !Number.isFinite(parsedElite) || parsedElite < 0) {
      showFeedback(
        'error',
        isAr
          ? 'يرجى إدخال أسعار شهرية صحيحة بالدولار (USD).'
          : 'Please enter valid non-negative USD monthly prices.'
      );
      return;
    }

    setIsSavingPlanPricing(true);
    soundManager.playClick();
    try {
      const oldVip = loadedPlanPricing.vipMonthlyUsd ?? DEFAULT_PLAN_PRICING.vipMonthlyUsd;
      const oldElite = loadedPlanPricing.eliteMonthlyUsd ?? DEFAULT_PLAN_PRICING.eliteMonthlyUsd;
      const oldSync = Boolean(loadedPlanPricing.syncToPublicPlans);

      const saved = await savePlanPricingSettings({
        vipMonthlyUsd: parsedVip,
        eliteMonthlyUsd: parsedElite,
        syncToPublicPlans: pricingSyncPublic
      });

      setLoadedPlanPricing(saved);
      setPricingVipInput(String(saved.vipMonthlyUsd));
      setPricingEliteInput(String(saved.eliteMonthlyUsd));
      setPricingSyncPublic(Boolean(saved.syncToPublicPlans));

      await recordAdminAuditLog({
        action: 'UPDATE_PLAN_PRICING',
        targetUid: 'settings/pricing',
        targetLabel: 'Subscription Tier Pricing & MRR Config',
        details: `VIP/Pro: $${oldVip}/mo -> $${saved.vipMonthlyUsd}/mo | Elite: $${oldElite}/mo -> $${saved.eliteMonthlyUsd}/mo | Sync Public Modal: ${
          oldSync ? 'ON' : 'OFF'
        } -> ${saved.syncToPublicPlans ? 'ON' : 'OFF'}`
      });

      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم حفظ أسعار الباقات (VIP: $${saved.vipMonthlyUsd} / Elite: $${saved.eliteMonthlyUsd}) وتحديث حسابات MRR بنجاح!`
          : `Saved plan pricing (VIP: $${saved.vipMonthlyUsd}/mo, Elite: $${saved.eliteMonthlyUsd}/mo) and synced MRR analytics!`
      );
    } catch (err: any) {
      showFeedback(
        'error',
        err?.message ||
          (isAr ? 'فشل حفظ أسعار الباقات في Firestore' : 'Failed to save plan pricing settings')
      );
    } finally {
      setIsSavingPlanPricing(false);
    }
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFullAdmin) {
      showFeedback(
        'error',
        isAr
          ? 'صلاحية تعديل إعدادات المنصة مخصصة للمدير العام فقط.'
          : 'Only full Admins can update platform settings.'
      );
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
        isAr
          ? 'تم حفظ روابط التواصل في إعدادات المنصة بنجاح وتحديثها لجميع المستخدمين!'
          : 'Platform contact settings saved and synced live!'
      );
    } catch (err: any) {
      showFeedback(
        'error',
        err?.message ||
          (isAr ? 'فشل حفظ الإعدادات في Firestore' : 'Failed to save platform settings')
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ================= ON-DEMAND FIRESTORE ACTIVATION KEYS FETCH =================
  useEffect(() => {
    if (!isStaff || activeSection !== 'system') return;
    if (hasFetchedActivationKeysThisSession && activationKeys.length > 0 && crmRetryTick === 0) {
      return;
    }
    hasFetchedActivationKeysThisSession = true;
    const keysQuery = query(collection(db, 'activation_keys'), limit(50));
    getDocs(keysQuery)
      .then((snapshot) => {
        const keysList: ActivationKeyRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const days = Number(data.durationInDays || 30);
          keysList.push({
            id: docSnap.id,
            code: data.code || docSnap.id,
            durationInDays: days,
            durationLabel: data.durationLabel || formatKeyDurationLabel(days),
            keyType:
              data.keyType ||
              (data.grantTier === 'elite'
                ? 'elite'
                : data.grantTier === 'custom'
                ? 'trial'
                : 'vip'),
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
      })
      .catch((err: any) => {
        const msg = String(err?.message || err || '').toLowerCase();
        if (err?.code === 'resource-exhausted' || msg.includes('quota')) {
          setDbQuotaExceeded(true);
        }
        console.warn('activation_keys fetch warning:', err?.message || err);
      });
  }, [isStaff, activeSection, crmRetryTick]);

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
      setActivationKeys((prev) => {
        const next = [...generatedRecords, ...prev];
        try {
          localStorage.setItem('mbk_admin_cached_keys_v1', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
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
      const tag =
        trialTargetMode === 'custom'
          ? `TRIAL${days}D`
          : `TRIAL${trialTargetMode.toUpperCase()}`;
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
      setActivationKeys((prev) => {
        const next = [...generatedRecords, ...prev];
        try {
          localStorage.setItem('mbk_admin_cached_keys_v1', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
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

  const handleDownloadKeysCsv = (
    keysToExport: ActivationKeyRecord[],
    filenamePrefix = 'mbk-vip-keys'
  ) => {
    soundManager.playClick();
    if (!keysToExport.length) {
      showFeedback('info', isAr ? 'لا توجد مفاتيح متاحة للتصدير' : 'No keys available to export');
      return;
    }

    const escapeCsv = (val: string | number | undefined) => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Code',
      'KeyType',
      'GrantTier',
      'GrantFeatures',
      'DurationDays',
      'DurationLabel',
      'Status',
      'CreatedAt',
      'UsedByEmail'
    ];
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
    link.setAttribute(
      'download',
      `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteKey = async (code: string) => {
    soundManager.playClick();
    try {
      await deleteDoc(doc(db, 'activation_keys', code));
      setActivationKeys((prev) => {
        const next = prev.filter((k) => k.code !== code && k.id !== code);
        try {
          localStorage.setItem('mbk_admin_cached_keys_v1', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showFeedback('success', isAr ? 'تم حذف المفتاح' : 'Key deleted');
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleRevokeKey = async (code: string) => {
    soundManager.playClick();
    try {
      await setDoc(doc(db, 'activation_keys', code), { status: 'revoked' }, { merge: true });
      setActivationKeys((prev) => {
        const next: ActivationKeyRecord[] = prev.map((k) =>
          k.code === code || k.id === code ? { ...k, status: 'revoked' as const } : k
        );
        try {
          localStorage.setItem('mbk_admin_cached_keys_v1', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
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

  // ================= REAL-TIME FIRESTORE USER CRM LISTENER (STRICTLY GATED BY PERMISSION) =================
  useEffect(() => {
    if (!isStaff) return;
    const canLoadUsersDirectory = Boolean(
      myPermissions.canManageUsers ||
        myPermissions.canViewAnalytics ||
        myPermissions.canSendPopups ||
        myPermissions.canManageSystem
    );
    if (
      !canLoadUsersDirectory ||
      (activeSection !== 'users' &&
        activeSection !== 'overview' &&
        activeSection !== 'messaging' &&
        activeSection !== 'team')
    ) {
      setUsersLoading(false);
      return;
    }
    setUsersLoading(true);

    try {
      const mapDocToAdminUser = (docId: string, data: Record<string, any>): AdminUserRecord => {
        const userRole = (data.role || 'free').toString().toUpperCase();
        const subEndDate =
          data.eliteExpiryDate ||
          data.vipExpiryDate ||
          data.subscription_end_date ||
          data.subscriptionEndDate ||
          null;
        const computedTier = getEffectiveTier({
          role: userRole,
          staffRole: data.staffRole,
          permissions: data.permissions,
          tier: data.tier,
          isVip: data.isVip,
          vipAccess: data.vipAccess,
          isElite: data.isElite,
          vipExpiryDate: data.vipExpiryDate,
          eliteExpiryDate: data.eliteExpiryDate,
          subscriptionEndDate: subEndDate,
          isBanned: Boolean(data.isBanned)
        });
        let subStatus =
          data.subscription_status ||
          data.subscriptionStatus ||
          (computedTier !== 'free' ? 'active' : 'none');

        if (
          subEndDate &&
          new Date(subEndDate) < new Date() &&
          (userRole === 'VIP' ||
            userRole === 'ELITE' ||
            Boolean(data.isVip) ||
            Boolean(data.isElite))
        ) {
          subStatus = 'expired';
        }

        const createdMs = parseFirestoreTimestampMs(data.createdAt);
        const updatedMs = parseFirestoreTimestampMs(data.updatedAt || data.lastActiveAt);

        const rawNotes = Array.isArray(data.adminNotes) ? data.adminNotes : [];
        const cleanNotes: AdminInternalNote[] = rawNotes
          .filter((n: any) => n && typeof n.text === 'string')
          .map((n: any, idx: number) => ({
            id: String(n.id || `note-${idx}`),
            text: String(n.text || ''),
            authorUid: String(n.authorUid || ''),
            authorName: String(n.authorName || 'Staff'),
            createdAt: String(n.createdAt || new Date().toISOString())
          }));

        return {
          id: docId,
          uid: docId,
          username: data.email ? data.email.split('@')[0] : docId.slice(0, 8),
          email: data.email || 'N/A',
          role: userRole,
          staffRole: typeof data.staffRole === 'string' ? data.staffRole : undefined,
          permissions:
            data.permissions && typeof data.permissions === 'object'
              ? data.permissions
              : undefined,
          adminNotes: cleanNotes,
          tier: computedTier,
          isVip: Boolean(data.isVip),
          vipAccess: Boolean(data.vipAccess),
          isElite: Boolean(data.isElite),
          vipExpiryDate: data.vipExpiryDate || null,
          eliteExpiryDate: data.eliteExpiryDate || null,
          grantedFeatures:
            data.grantedFeatures && typeof data.grantedFeatures === 'object'
              ? data.grantedFeatures
              : {},
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
          createdAt:
            createdMs > 0 ? new Date(createdMs).toLocaleDateString() : '2026',
          createdAtMs: createdMs,
          lastActiveAt:
            updatedMs > 0
              ? new Date(updatedMs).toLocaleString([], {
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : undefined,
          lastActiveAtMs: updatedMs
        };
      };

      const deduplicateUsers = (
        primaryList: AdminUserRecord[],
        secList: AdminUserRecord[]
      ): AdminUserRecord[] => {
        const rawCombinedUsers = [...primaryList, ...secList];
        const loadedFromPrimaryIds = new Set(primaryList.map((u) => u.id));
        const tierScore = (u: AdminUserRecord): number => {
          const r = (u.role || '').toUpperCase();
          let score = 0;
          if (r === 'ADMIN') score += 100;
          else if (
            r === 'MODERATOR' ||
            r === 'ANALYSER' ||
            r === 'ANALYST' ||
            r === 'SALES' ||
            hasAnyStaffPermission(u)
          )
            score += 80;
          else if (u.isElite || u.tier === 'elite') score += 60;
          else if (u.isVip || u.vipAccess || u.tier === 'vip') score += 40;
          if (loadedFromPrimaryIds.has(u.id)) score += 10;
          if (u.phone) score += 5;
          if (u.country) score += 5;
          if (Number(u.totalPaid || 0) > 0) score += 10;
          if (u.id === auth.currentUser?.uid) score += 50;
          return score;
        };

        const byEmailMap = new Map<string, AdminUserRecord>();
        const byIdMap = new Map<string, AdminUserRecord>();

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
              const mergedAltDocIds = Array.from(
                new Set([
                  ...(winner.altDocIds || []),
                  ...(loser.altDocIds || []),
                  loser.id
                ])
              ).filter((altId) => Boolean(altId) && altId !== winner.id);
              const mergedWinner: AdminUserRecord = {
                ...loser,
                ...winner,
                phone: winner.phone || loser.phone || '',
                country: winner.country || loser.country || '',
                dob: winner.dob || loser.dob || '',
                totalPaid: Math.max(
                  Number(winner.totalPaid || 0),
                  Number(loser.totalPaid || 0)
                ),
                altDocIds: mergedAltDocIds.length > 0 ? mergedAltDocIds : undefined
              };
              byEmailMap.set(cleanEmail, mergedWinner);
              byIdMap.delete(loser.id);
              byIdMap.set(mergedWinner.id, mergedWinner);
            }
          } else if (!byIdMap.has(candidate.id)) {
            byIdMap.set(candidate.id, candidate);
          }
        }

        return Array.from(byIdMap.values());
      };

      const isManualRefresh = crmRetryTick > lastHandledUsersRetryTick;
      if (
        hasFetchedAdminUsersThisSession &&
        sessionCachedAdminUsers.length > 0 &&
        !isManualRefresh
      ) {
        setUsers(sessionCachedAdminUsers);
        setUsersLoading(false);
        return;
      }
      lastHandledUsersRetryTick = crmRetryTick;

      let cancelled = false;
      const usersColRef = query(collection(db, 'users'), limit(300));
      getDocs(usersColRef)
        .then((snapshot) => {
          if (cancelled) return;
          const loadedUsers: AdminUserRecord[] = [];
          snapshot.forEach((docSnap) => {
            loadedUsers.push(mapDocToAdminUser(docSnap.id, docSnap.data()));
          });

          const mergedUsers = deduplicateUsers(loadedUsers, []);
          hasFetchedAdminUsersThisSession = true;
          sessionCachedAdminUsers = mergedUsers;
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
        })
        .catch((err: any) => {
          if (cancelled) return;
          const msg = String(err?.message || err || '').toLowerCase();
          if (err?.code === 'resource-exhausted' || msg.includes('quota')) {
            setDbQuotaExceeded(true);
          }
          console.warn('Firestore CRM users fetch notice:', err?.message || err);
          setUsers((prev) => {
            if (prev.length > 0) return prev;
            if (auth.currentUser) {
              return [
                {
                  id: auth.currentUser.uid,
                  uid: auth.currentUser.uid,
                  username: auth.currentUser.email
                    ? auth.currentUser.email.split('@')[0]
                    : 'admin',
                  email: auth.currentUser.email || 'moe.albzour@gmail.com',
                  role: 'ADMIN',
                  staffRole: 'super_admin',
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
        });

      return () => {
        cancelled = true;
      };
    } catch (err) {
      console.warn('CRM setup error:', err);
      setUsersLoading(false);
    }
  }, [
    isStaff,
    activeSection,
    crmRetryTick,
    myPermissions.canManageUsers,
    myPermissions.canViewAnalytics,
    myPermissions.canSendPopups,
    myPermissions.canManageSystem
  ]);

  // Keep inspectUser and sessionCachedAdminUsers synced if users list updates
  useEffect(() => {
    if (users.length > 0) {
      sessionCachedAdminUsers = users;
    }
    if (!inspectUser) return;
    const fresh = users.find((u) => u.id === inspectUser.id);
    if (fresh) {
      setInspectUser(fresh);
    }
  }, [users]);

  // ================= EXPIRING SOON ALERTS COMPUTATION (Next 72 Hours) =================
  const expiringSoonUsers = useMemo(() => {
    return users.filter((u) => {
      if (!u.subscriptionEndDate) return false;
      const endDate = new Date(u.subscriptionEndDate);
      const now = new Date();
      const diffHours = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours >= -24 && diffHours <= 72;
    });
  }, [users]);

  // ================= GRANULAR BAN & CHAT MUTE ACTIONS =================
  const handleToggleGlobalBan = async (targetUser: AdminUserRecord) => {
    if (isSuperAdminUser(targetUser) && !isFullAdmin) {
      showFeedback(
        'error',
        isAr ? 'لا يمكنك حظر حسابات الإدارة العليا' : 'Cannot ban superadmin account'
      );
      return;
    }

    soundManager.playClick();
    const nextBanned = !targetUser.isBanned;

    try {
      const userRef = doc(db, 'users', targetUser.id);
      await setDoc(
        userRef,
        { uid: targetUser.id, isBanned: nextBanned, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setUsers((prev) => {
        const nextList = prev.map((u) =>
          u.id === targetUser.id ? { ...u, isBanned: nextBanned } : u
        );
        try {
          localStorage.setItem('mbk_admin_cached_users_v1', JSON.stringify(nextList));
        } catch {
          // ignore
        }
        return nextList;
      });

      await recordAdminAuditLog({
        action: nextBanned ? 'USER_BANNED' : 'USER_UNBANNED',
        targetUid: targetUser.id,
        targetLabel: `${targetUser.displayName} (${targetUser.email})`,
        details: nextBanned
          ? 'Account suspended/banned from platform'
          : 'Account ban lifted (restored active status)'
      });

      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? nextBanned
            ? `تم تفعيل الحظر الشامل للحساب ${targetUser.displayName}`
            : `تم رفع الحظر عن الحساب ${targetUser.displayName}`
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
      await setDoc(
        userRef,
        { uid: targetUser.id, isMutedFromChat: nextMuted, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setUsers((prev) => {
        const nextList = prev.map((u) =>
          u.id === targetUser.id ? { ...u, isMutedFromChat: nextMuted } : u
        );
        try {
          localStorage.setItem('mbk_admin_cached_users_v1', JSON.stringify(nextList));
        } catch {
          // ignore
        }
        return nextList;
      });

      await recordAdminAuditLog({
        action: nextMuted ? 'USER_MUTED' : 'USER_UNMUTED',
        targetUid: targetUser.id,
        targetLabel: `${targetUser.displayName} (${targetUser.email})`,
        details: nextMuted ? 'Muted user in trading chat' : 'Unmuted user in trading chat'
      });

      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? nextMuted
            ? `تم كتم المستخدم ${targetUser.displayName} من الشات`
            : `تم إلغاء كتم المستخدم ${targetUser.displayName}`
          : `Toggled chat mute status for ${targetUser.email}`
      );
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleSetRole = async (targetUserId: string, newRole: string) => {
    soundManager.playClick();
    if (!isFullAdmin && (newRole === 'ADMIN' || newRole === 'MODERATOR' || newRole === 'SALES')) {
      showFeedback(
        'error',
        isAr
          ? 'فقط الإدارة العليا يمكنها تعيين رتب الطاقم والإدارة'
          : 'Only Super Admin can assign staff roles'
      );
      return;
    }

    const targetObj = users.find((u) => u.id === targetUserId) || inspectUser;

    try {
      const lowerRole = newRole.toLowerCase();
      const upperRole = newRole.toUpperCase();
      const userRef = doc(db, 'users', targetUserId);
      const isStaffOrVip = [
        'vip',
        'elite',
        'admin',
        'moderator',
        'analyser',
        'analyst',
        'sales'
      ].includes(lowerRole);
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

      await setDoc(userRef, rolePayload, { merge: true });
      if (targetObj?.altDocIds && targetObj.altDocIds.length > 0) {
        await Promise.all(
          targetObj.altDocIds.map((altId) =>
            setDoc(doc(db, 'users', altId), { ...rolePayload, uid: altId }, { merge: true }).catch(() => {})
          )
        );
      }

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

      await recordAdminAuditLog({
        action: 'USER_PLAN_UPDATED',
        targetUid: targetUserId,
        targetLabel: targetObj
          ? `${targetObj.displayName} (${targetObj.email})`
          : targetUserId,
        details: `Set account role/plan to ${upperRole}`
      });

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
                subscriptionStatus: (rolePayload.subscription_status ||
                  u.subscriptionStatus) as any
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
              subscriptionStatus:
                rolePayload.subscription_status || prev.subscriptionStatus
            }
          : prev
      );
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr ? `تم تعيين الرتبة إلى ${newRole}` : `Role updated to ${newRole}`
      );
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // ================= DIRECT TIER GRANT, QUICK EXTEND & REVOKE =================
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
      const isStaffTarget = ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER'].includes(
        inspectUser.role.toUpperCase()
      );
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
      if (inspectUser.altDocIds && inspectUser.altDocIds.length > 0) {
        await Promise.all(
          inspectUser.altDocIds.map((altId) =>
            setDoc(doc(db, 'users', altId), { ...payload, uid: altId }, { merge: true }).catch(() => {})
          )
        );
      }

      await recordAdminAuditLog({
        action: 'USER_PLAN_UPDATED',
        targetUid: inspectUser.id,
        targetLabel: `${inspectUser.displayName} (${inspectUser.email})`,
        details: `Granted ${directTierTarget.toUpperCase()} until ${expiryIso.slice(0, 10)}`
      });

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
          : `Granted ${directTierTarget.toUpperCase()} tier until ${formatExpiryShort(
              expiryIso,
              false
            )}`
      );
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update tier');
    } finally {
      setIsUpdatingTier(false);
    }
  };

  // 1-Click Quick Extend (+7d, +30d, +90d, +1 Year) from current active expiry or now
  const handleQuickExtendSubscription = async (addDays: number) => {
    if (!inspectUser) return;
    setIsUpdatingTier(true);
    soundManager.playClick();
    try {
      const currentExpiryMs = inspectUser.subscriptionEndDate
        ? new Date(inspectUser.subscriptionEndDate).getTime()
        : 0;
      const baseMs =
        !Number.isNaN(currentExpiryMs) && currentExpiryMs > Date.now()
          ? currentExpiryMs
          : Date.now();
      const expiryIso = new Date(baseMs + addDays * 24 * 60 * 60 * 1000).toISOString();

      const currentEffTier = getEffectiveTier(inspectUser);
      const targetTier: 'vip' | 'elite' =
        currentEffTier === 'elite' || directTierTarget === 'elite' ? 'elite' : 'vip';
      const isEliteTarget = targetTier === 'elite';
      const isStaffTarget = ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER'].includes(
        inspectUser.role.toUpperCase()
      );
      const nextRoleLower = isStaffTarget ? inspectUser.role.toLowerCase() : 'vip';

      const payload: Record<string, any> = {
        uid: inspectUser.id,
        role: nextRoleLower,
        tier: targetTier,
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
      if (inspectUser.altDocIds && inspectUser.altDocIds.length > 0) {
        await Promise.all(
          inspectUser.altDocIds.map((altId) =>
            setDoc(doc(db, 'users', altId), { ...payload, uid: altId }, { merge: true }).catch(() => {})
          )
        );
      }

      await recordAdminAuditLog({
        action: 'USER_EXPIRY_UPDATED',
        targetUid: inspectUser.id,
        targetLabel: `${inspectUser.displayName} (${inspectUser.email})`,
        details: `Quick-extended ${targetTier.toUpperCase()} by +${addDays}d (new expiry: ${expiryIso.slice(
          0,
          10
        )})`
      });

      setUsers((prev) => {
        const nextList = prev.map((u) =>
          u.id === inspectUser.id
            ? {
                ...u,
                role: isStaffTarget ? u.role : 'VIP',
                tier: targetTier,
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
              tier: targetTier,
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
          ? `تم تمديد اشتراك ${targetTier.toUpperCase()} بمقدار +${addDays} يوم!`
          : `Extended ${targetTier.toUpperCase()} subscription by +${addDays} days!`
      );
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to extend subscription');
    } finally {
      setIsUpdatingTier(false);
    }
  };

  const handleRevokeDirectTier = async () => {
    if (!inspectUser) return;
    setIsUpdatingTier(true);
    soundManager.playClick();
    try {
      const isStaffTarget = ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER'].includes(
        inspectUser.role.toUpperCase()
      );
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
      if (inspectUser.altDocIds && inspectUser.altDocIds.length > 0) {
        await Promise.all(
          inspectUser.altDocIds.map((altId) =>
            setDoc(doc(db, 'users', altId), { ...payload, uid: altId }, { merge: true }).catch(() => {})
          )
        );
      }

      await recordAdminAuditLog({
        action: 'USER_EXPIRY_UPDATED',
        targetUid: inspectUser.id,
        targetLabel: `${inspectUser.displayName} (${inspectUser.email})`,
        details: 'Revoked paid subscription / expired now to Free plan'
      });

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
        isAr
          ? 'تم سحب الباقة وإرجاع الحساب إلى الباقة المجانية'
          : 'Subscription revoked and downgraded to Free tier'
      );
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to revoke tier');
    } finally {
      setIsUpdatingTier(false);
    }
  };

  // ================= INTERNAL STAFF NOTES (adminNotes on /users/{uid}) =================
  const handleAddStaffNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectUser || !newStaffNoteText.trim() || isSavingStaffNote) return;
    setIsSavingStaffNote(true);
    soundManager.playClick();
    try {
      const noteText = newStaffNoteText.trim().slice(0, 600);
      const authorUid = auth.currentUser?.uid || currentActorProfile.uid || 'staff';
      const authorName =
        currentActorProfile.name ||
        auth.currentUser?.displayName ||
        auth.currentUser?.email?.split('@')[0] ||
        'MBK Staff';
      const newNote: AdminInternalNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: noteText,
        authorUid,
        authorName,
        createdAt: new Date().toISOString()
      };

      const nextNotes = [newNote, ...(inspectUser.adminNotes || [])];
      await setDoc(
        doc(db, 'users', inspectUser.id),
        {
          uid: inspectUser.id,
          adminNotes: nextNotes,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      await recordAdminAuditLog({
        action: 'USER_NOTE_ADDED',
        targetUid: inspectUser.id,
        targetLabel: `${inspectUser.displayName} (${inspectUser.email})`,
        details: `Note added: "${noteText.slice(0, 120)}"`
      });

      setNewStaffNoteText('');
      setInspectUser((prev) => (prev ? { ...prev, adminNotes: nextNotes } : null));
      setUsers((prev) =>
        prev.map((u) => (u.id === inspectUser.id ? { ...u, adminNotes: nextNotes } : u))
      );
      soundManager.playSuccess();
      showFeedback(
        'success',
        isAr ? 'تمت إضافة الملاحظة الإدارية الخاصة بنجاح' : 'Internal staff note saved'
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to save staff note');
    } finally {
      setIsSavingStaffNote(false);
    }
  };

  const handleDeleteStaffNote = async (noteId: string) => {
    if (!inspectUser || isSavingStaffNote) return;
    setIsSavingStaffNote(true);
    soundManager.playClick();
    try {
      const nextNotes = (inspectUser.adminNotes || []).filter((n) => n.id !== noteId);
      await setDoc(
        doc(db, 'users', inspectUser.id),
        {
          uid: inspectUser.id,
          adminNotes: nextNotes,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      await recordAdminAuditLog({
        action: 'USER_NOTE_DELETED',
        targetUid: inspectUser.id,
        targetLabel: `${inspectUser.displayName} (${inspectUser.email})`,
        details: `Deleted internal note (${noteId})`
      });

      setInspectUser((prev) => (prev ? { ...prev, adminNotes: nextNotes } : null));
      setUsers((prev) =>
        prev.map((u) => (u.id === inspectUser.id ? { ...u, adminNotes: nextNotes } : u))
      );
      showFeedback('info', isAr ? 'تم حذف الملاحظة' : 'Internal note removed');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to remove note');
    } finally {
      setIsSavingStaffNote(false);
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

      const grantPayload = {
        uid: inspectUser.id,
        role: (inspectUser.role || 'free').toLowerCase(),
        grantedFeatures: nextMap,
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', inspectUser.id), grantPayload, { merge: true });
      if (inspectUser.altDocIds && inspectUser.altDocIds.length > 0) {
        await Promise.all(
          inspectUser.altDocIds.map((altId) =>
            setDoc(doc(db, 'users', altId), { ...grantPayload, uid: altId }, { merge: true }).catch(() => {})
          )
        );
      }

      await recordAdminAuditLog({
        action: 'FEATURE_GRANT_UPDATED',
        targetUid: inspectUser.id,
        targetLabel: `${inspectUser.displayName} (${inspectUser.email})`,
        details: `Granted feature ${featureKey} until ${expiryIso.slice(0, 10)}`
      });

      setInspectUser((prev) => (prev ? { ...prev, grantedFeatures: nextMap } : null));
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم منح ميزة "${getFeatureLabel(featureKey, true)}" حتى ${formatExpiryShort(
              expiryIso,
              true
            )}`
          : `Granted "${getFeatureLabel(featureKey, false)}" until ${formatExpiryShort(
              expiryIso,
              false
            )}`
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
      const nextMap: Partial<Record<FeatureKey, string>> = {
        ...(inspectUser.grantedFeatures || {})
      };
      delete nextMap[featureKey];

      const revokePayload = {
        uid: inspectUser.id,
        role: (inspectUser.role || 'free').toLowerCase(),
        grantedFeatures: nextMap,
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', inspectUser.id), revokePayload, { merge: true });
      if (inspectUser.altDocIds && inspectUser.altDocIds.length > 0) {
        await Promise.all(
          inspectUser.altDocIds.map((altId) =>
            setDoc(doc(db, 'users', altId), { ...revokePayload, uid: altId }, { merge: true }).catch(() => {})
          )
        );
      }

      await recordAdminAuditLog({
        action: 'FEATURE_GRANT_UPDATED',
        targetUid: inspectUser.id,
        targetLabel: `${inspectUser.displayName} (${inspectUser.email})`,
        details: `Revoked feature grant ${featureKey}`
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

      const currentEnd = inspectUser.subscriptionEndDate
        ? new Date(inspectUser.subscriptionEndDate)
        : new Date();
      const startDate = currentEnd > new Date() ? currentEnd : new Date();
      const newEndDate = new Date(
        startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000
      ).toISOString();

      const userRef = doc(db, 'users', inspectUser.id);
      const nextTotalPaid = (inspectUser.totalPaid || 0) + amountNum;
      const preserveElite = inspectUser.tier === 'elite' || Boolean(inspectUser.isElite);

      const paymentPayload = {
        uid: inspectUser.id,
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
      };
      await setDoc(userRef, paymentPayload, { merge: true });
      if (inspectUser.altDocIds && inspectUser.altDocIds.length > 0) {
        await Promise.all(
          inspectUser.altDocIds.map((altId) =>
            setDoc(doc(db, 'users', altId), { ...paymentPayload, uid: altId }, { merge: true }).catch(() => {})
          )
        );
      }

      await recordAdminAuditLog({
        action: 'MANUAL_PAYMENT_LOGGED',
        targetUid: inspectUser.id,
        targetLabel: `${inspectUser.displayName} (${inspectUser.email})`,
        details: `Logged $${amountNum} payment (+${daysToAdd}d) -> Total Paid: $${nextTotalPaid}`
      });

      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم تسجيل الدفعة بقيمة $${amountNum} وتجديد اشتراك ${
              preserveElite ? 'Elite' : 'VIP'
            } للحساب بنجاح!`
          : `Logged $${amountNum} payment and extended ${
              preserveElite ? 'Elite' : 'VIP'
            } access!`
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

  // ================= FILTERED & SORTED CRM USERS =================
  const filteredAndSortedUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const nowMs = Date.now();

    const filtered = users.filter((u) => {
      if (q) {
        const matchesName = (u.displayName || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesPhone = (u.phone || '').toLowerCase().includes(q);
        const matchesUid = (u.id || u.uid || '').toLowerCase().includes(q);
        const matchesCountry = (u.country || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesUid && !matchesCountry) {
          return false;
        }
      }

      const effTier = getEffectiveTier(u);
      const isStaffMember =
        ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(
          (u.role || '').toUpperCase()
        ) || hasAnyStaffPermission(u);

      // Plan filter
      if (planFilter === 'FREE' && effTier !== 'free') return false;
      if (planFilter === 'VIP' && effTier !== 'vip') return false;
      if (planFilter === 'ELITE' && effTier !== 'elite') return false;

      // Subscription Status filter
      const endMs = u.subscriptionEndDate ? new Date(u.subscriptionEndDate).getTime() : 0;
      const hasValidEnd = Boolean(u.subscriptionEndDate && !Number.isNaN(endMs) && endMs > 0);
      const diffDays = hasValidEnd ? (endMs - nowMs) / (1000 * 60 * 60 * 24) : null;

      if (subStatusFilter === 'ACTIVE') {
        if (effTier === 'free' && !isStaffMember) return false;
        if (diffDays !== null && diffDays <= 0) return false;
      } else if (subStatusFilter === 'EXPIRING_3D') {
        if (diffDays === null || diffDays < -1 || diffDays > 3) return false;
      } else if (subStatusFilter === 'EXPIRING_7D') {
        if (diffDays === null || diffDays < -1 || diffDays > 7) return false;
      } else if (subStatusFilter === 'EXPIRED') {
        const isMarkedExpired = u.subscriptionStatus === 'expired';
        const isPastEnd = diffDays !== null && diffDays <= 0;
        if (!isMarkedExpired && !isPastEnd) return false;
      } else if (subStatusFilter === 'NO_EXPIRY') {
        if (hasValidEnd && diffDays !== null && diffDays < 3650) return false;
      }

      // Account Status filter
      if (accountStatusFilter === 'ACTIVE' && (u.isBanned || u.isMutedFromChat)) return false;
      if (accountStatusFilter === 'MUTED' && !u.isMutedFromChat) return false;
      if (accountStatusFilter === 'BANNED' && !u.isBanned) return false;

      // Staff vs Client filter
      if (staffFilter === 'STAFF_ONLY' && !isStaffMember) return false;
      if (staffFilter === 'CLIENTS_ONLY' && isStaffMember) return false;

      return true;
    });

    return filtered.sort((a, b) => {
      if (userSortBy === 'EXPIRING_SOONEST') {
        const aEnd = a.subscriptionEndDate
          ? new Date(a.subscriptionEndDate).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bEnd = b.subscriptionEndDate
          ? new Date(b.subscriptionEndDate).getTime()
          : Number.MAX_SAFE_INTEGER;
        return aEnd - bEnd;
      }
      if (userSortBy === 'TIER') {
        const rank = (u: AdminUserRecord) => {
          if (isSuperAdminUser(u)) return 5;
          if (hasAnyStaffPermission(u)) return 4;
          const t = getEffectiveTier(u);
          if (t === 'elite') return 3;
          if (t === 'vip') return 2;
          return 1;
        };
        return rank(b) - rank(a);
      }
      // Default: NEWEST
      return (b.createdAtMs || 0) - (a.createdAtMs || 0);
    });
  }, [
    users,
    userSearch,
    planFilter,
    subStatusFilter,
    accountStatusFilter,
    staffFilter,
    userSortBy
  ]);

  // Calculate Institutional KPIs
  const totalRevenueAll = useMemo(
    () => users.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0),
    [users]
  );
  const totalVipCount = useMemo(
    () =>
      users.filter(
        (u) =>
          getEffectiveTier(u) === 'vip' &&
          !['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(
            (u.role || '').toUpperCase()
          )
      ).length,
    [users]
  );
  const totalEliteCount = useMemo(
    () =>
      users.filter(
        (u) =>
          getEffectiveTier(u) === 'elite' &&
          !['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(
            (u.role || '').toUpperCase()
          )
      ).length,
    [users]
  );
  const totalBannedCount = useMemo(() => users.filter((u) => u.isBanned).length, [users]);
  const totalStaffCount = useMemo(
    () =>
      users.filter(
        (u) =>
          ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(
            (u.role || '').toUpperCase()
          ) || hasAnyStaffPermission(u)
      ).length,
    [users]
  );

  // ACCESS DENIED VIEW IF NOT STAFF
  if (!isStaff) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center p-6 bg-[#0B0E11]">
        <div className="max-w-md w-full bg-[#131722] border border-[#2A2E39] rounded-lg p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-md bg-[#EF5350]/10 border border-[#EF5350]/30 flex items-center justify-center text-[#EF5350] mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#E2E8F0] mb-2">
            {isAr
              ? 'منطقة مقتصرة على فريق الإدارة والعمليات'
              : 'Restricted Institutional Terminal'}
          </h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed mb-6">
            {isAr
              ? 'لوحة التحكم وإدارة العملاء مقتصرة فقط على أعضاء الفريق المصرح لهم.'
              : 'This administrative terminal is strictly reserved for authorized staff members.'}
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              {isAr ? 'العودة إلى منصة التداول' : 'Return to Trading Workspace'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-full flex flex-col bg-[#0B0E11] text-[#E2E8F0] font-sans select-none antialiased"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. INSTITUTIONAL TOP HEADER BAR */}
      <header className="px-4 py-2.5 bg-[#131722] border-b border-[#2A2E39] flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#1E222D] border border-[#2A2E39] flex items-center justify-center text-[#26A69A] shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-[#F8FAFC] tracking-tight">
                {isAr ? 'وحدة تحكم الإدارة والعمليات • MBK Terminal' : 'MBK Institutional Admin Terminal'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1E222D] text-[#26A69A] border border-[#2A2E39]">
                {getStaffRoleLabel(currentActorProfile, isAr)}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              {isAr
                ? 'إدارة المشتركين، الصلاحيات، التوصيات، والنظام المؤسسي'
                : 'Subscriptions CRM, RBAC Permissions, Signal Desk & System Operations'}
            </p>
          </div>
        </div>

        {/* Quick Global Operational Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isFullAdmin && (
            <>
              <button
                type="button"
                disabled={isPushingAppUpdate}
                onClick={handlePushAppUpdateToAllUsers}
                className="px-2.5 py-1.5 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] disabled:opacity-50 text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                title={
                  isAr
                    ? 'إجبار جميع المتصفحات والاختصارات (PWA) على تحديث أحدث إصدار فوراً'
                    : 'Force all open tabs and PWA shortcuts to reload the newest version immediately'
                }
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPushingAppUpdate ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'دفع التحديث للمستخدمين' : 'Force Update All'}</span>
              </button>

              <button
                type="button"
                disabled={isExportingBackup}
                onClick={handleExportFullBackupJson}
                className="px-2.5 py-1.5 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-[#E2E8F0] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#26A69A]" />
                <span>{isAr ? 'نسخة احتياطية' : 'Backup JSON'}</span>
              </button>

              <button
                type="button"
                disabled={isTestingBackgroundPush}
                onClick={handleTestBackgroundPush}
                className="px-2.5 py-1.5 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-[#E2E8F0] disabled:opacity-50 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <BellRing
                  className={`w-3.5 h-3.5 text-[#F0B90B] ${
                    isTestingBackgroundPush ? 'animate-pulse' : ''
                  }`}
                />
                <span>
                  {isTestingBackgroundPush
                    ? isAr
                      ? 'جاري الاختبار...'
                      : 'Testing...'
                    : isAr
                    ? 'فحص إشعار Push'
                    : 'Test Web Push'}
                </span>
              </button>
            </>
          )}

          {onClose && (
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-[#94A3B8] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isAr ? 'إغلاق' : 'Close'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Background Push Test Diagnostic Output */}
      {backgroundPushResult && (
        <div className="px-4 py-2 bg-[#131722] border-b border-[#2A2E39] flex items-center justify-between gap-3">
          <pre
            dir="ltr"
            className="flex-1 overflow-x-auto rounded bg-[#0B0E11] border border-[#2A2E39] px-3 py-1.5 text-[10px] font-mono text-[#E2E8F0] select-text whitespace-pre-wrap break-all"
          >
            {JSON.stringify(backgroundPushResult, null, 2)}
          </pre>
          <button
            type="button"
            onClick={() => setBackgroundPushResult(null)}
            className="p-1.5 rounded bg-[#1E222D] hover:bg-[#2A2E39] text-[#94A3B8] hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
            feedback.type === 'success'
              ? 'bg-[#26A69A]/15 text-[#26A69A] border-[#26A69A]/30'
              : feedback.type === 'error'
              ? 'bg-[#EF5350]/15 text-[#EF5350] border-[#EF5350]/30'
              : 'bg-[#F0B90B]/15 text-[#F0B90B] border-[#F0B90B]/30'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="cursor-pointer hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Firestore Quota Banner */}
      {dbQuotaExceeded && (
        <div className="px-4 py-2.5 bg-[#F0B90B]/10 border-b border-[#F0B90B]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#F0B90B] shrink-0" />
            <div className="text-xs text-[#E2E8F0]">
              <strong className="text-[#F0B90B]">
                {isAr ? 'تنبيه حصة القراءة اليومية:' : 'Daily Read Quota Notice:'}
              </strong>{' '}
              {isAr
                ? 'يتم عرض السجلات المخزنة مؤقتاً (Cached Mode).'
                : 'Displaying locally cached records.'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://console.firebase.google.com/project/mbktrading-8dc98/firestore/databases/ai-studio-mbktrading-5c717851-cdb4-4a97-a0f4-f006f13d6c7b/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded bg-[#F0B90B] text-black font-semibold text-[11px] flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{isAr ? 'ترقية Firebase' : 'Upgrade Firebase'}</span>
            </a>
            <button
              type="button"
              onClick={() => setCrmRetryTick((t) => t + 1)}
              className="px-2.5 py-1 rounded bg-[#1E222D] border border-[#2A2E39] text-white text-[11px] font-semibold cursor-pointer"
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE HORIZONTAL 6-SECTION TAB BAR */}
      <div className="md:hidden px-3 py-1.5 bg-[#131722] border-b border-[#2A2E39] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {navSections.map((sec) => {
          const Icon = sec.icon;
          const active = activeSection === sec.id;
          return (
            <button
              key={`mob-nav-${sec.id}`}
              type="button"
              onClick={() => {
                soundManager.playClick();
                setActiveSection(sec.id);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                active
                  ? 'bg-[#1E222D] text-[#26A69A] border-[#26A69A]/50'
                  : 'bg-transparent text-[#94A3B8] border-transparent hover:text-white hover:bg-[#1E222D]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{isAr ? sec.shortAr : sec.shortEn}</span>
              {sec.id === 'users' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums bg-[#0B0E11] text-[#94A3B8]">
                  {users.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* DESKTOP 2-COLUMN SHELL: COLLAPSIBLE LEFT SIDEBAR + MAIN TERMINAL CANVAS */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden md:flex flex-col bg-[#131722] border-e border-[#2A2E39] shrink-0 transition-all duration-200 ${
            sidebarCollapsed ? 'w-[60px]' : 'w-[228px]'
          }`}
        >
          <div className="p-2 space-y-1 flex-1">
            {navSections.map((sec) => {
              const Icon = sec.icon;
              const active = activeSection === sec.id;
              return (
                <button
                  key={`desk-nav-${sec.id}`}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setActiveSection(sec.id);
                  }}
                  title={isAr ? sec.labelAr : sec.labelEn}
                  className={`w-full px-2.5 py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-between gap-2 cursor-pointer border ${
                    active
                      ? 'bg-[#1E222D] text-[#F8FAFC] border-[#26A69A]/50'
                      : 'bg-transparent text-[#94A3B8] border-transparent hover:text-[#F8FAFC] hover:bg-[#1E222D]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-[#26A69A]' : 'text-[#64748B]'
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate">{isAr ? sec.labelAr : sec.labelEn}</span>
                    )}
                  </div>
                  {!sidebarCollapsed && sec.id === 'users' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums bg-[#0B0E11] text-[#94A3B8] border border-[#2A2E39]">
                      {users.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Collapse Toggle */}
          <div className="p-2 border-t border-[#2A2E39]">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] text-[#94A3B8] hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {sidebarCollapsed ? (
                isAr ? (
                  <ChevronLeft className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )
              ) : (
                <>
                  {isAr ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronLeft className="w-3.5 h-3.5" />
                  )}
                  <span>{isAr ? 'طي القائمة' : 'Collapse Sidebar'}</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5">
          {/* ========================================================================= */}
          {/* SECTION 1: OVERVIEW & ANALYTICS (QUOTA-SAFE WEBSITE & REVENUE CHARTS) */}
          {/* ========================================================================= */}
          {activeSection === 'overview' &&
            (myPermissions.canViewAnalytics || myPermissions.canManageSystem) && (
              <AdminAnalyticsOverview
                users={users}
                pushActiveCountFallback={pushActiveUids.size}
                isAr={isAr}
                canManageUsers={Boolean(
                  myPermissions.canManageUsers || myPermissions.canManageSystem
                )}
                onInspectUser={(u) => {
                  setInspectUser(u);
                }}
                onOpenUsersCrm={() => {
                  if (myPermissions.canManageUsers || myPermissions.canManageSystem) {
                    setActiveSection('users');
                  }
                }}
              />
            )}

          {/* ========================================================================= */}
          {/* SECTION 2: PRO USERS & SUBSCRIPTIONS CRM */}
          {/* ========================================================================= */}
          {activeSection === 'users' && (
            <div className="space-y-4">
              {/* Top KPI Mini Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg bg-[#131722] border border-[#2A2E39] flex items-center justify-between">
                  <span className="text-[11px] text-[#94A3B8] font-medium">
                    {isAr ? 'النتائج المطابقة' : 'Matched Users'}
                  </span>
                  <span className="text-sm font-bold text-[#F8FAFC] font-mono tabular-nums">
                    {filteredAndSortedUsers.length} / {users.length}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#131722] border border-[#2A2E39] flex items-center justify-between">
                  <span className="text-[11px] text-[#F0B90B] font-medium">
                    {isAr ? 'ينتهي خلال 72س' : 'Expiring <= 72h'}
                  </span>
                  <span className="text-sm font-bold text-[#F0B90B] font-mono tabular-nums">
                    {expiringSoonUsers.length}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#131722] border border-[#2A2E39] flex items-center justify-between">
                  <span className="text-[11px] text-[#26A69A] font-medium">
                    {isAr ? 'VIP / Elite نشط' : 'Active Paid'}
                  </span>
                  <span className="text-sm font-bold text-[#26A69A] font-mono tabular-nums">
                    {totalVipCount + totalEliteCount}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#131722] border border-[#2A2E39] flex items-center justify-between">
                  <span className="text-[11px] text-[#EF5350] font-medium">
                    {isAr ? 'محظور / مكتوم' : 'Banned / Muted'}
                  </span>
                  <span className="text-sm font-bold text-[#EF5350] font-mono tabular-nums">
                    {totalBannedCount} / {users.filter((u) => u.isMutedFromChat).length}
                  </span>
                </div>
              </div>

              {/* Filter & Search Command Bar */}
              <div className="p-3.5 rounded-lg bg-[#131722] border border-[#2A2E39] space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                  {/* Instant Search Input (Name, Email, Phone, UID) */}
                  <div className="md:col-span-4 relative">
                    <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder={
                        isAr
                          ? 'بحث بالاسم، البريد، رقم الهاتف، أو UID...'
                          : 'Search Name, Email, Phone Number, or UID...'
                      }
                      className="w-full ps-9 pe-3 py-1.5 bg-[#1E222D] border border-[#2A2E39] focus:border-[#26A69A] rounded-md text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-hidden"
                    />
                  </div>

                  {/* Plan Filter */}
                  <div className="md:col-span-2">
                    <select
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-[#1E222D] border border-[#2A2E39] rounded-md text-xs text-[#E2E8F0] focus:outline-hidden cursor-pointer"
                    >
                      <option value="ALL">{isAr ? 'الباقة: الكل' : 'Plan: All'}</option>
                      <option value="FREE">{isAr ? 'مجاني (Free)' : 'Plan: Free'}</option>
                      <option value="VIP">{isAr ? 'باقة VIP' : 'Plan: VIP'}</option>
                      <option value="ELITE">{isAr ? 'باقة Elite' : 'Plan: Elite'}</option>
                    </select>
                  </div>

                  {/* Subscription Status Filter */}
                  <div className="md:col-span-2">
                    <select
                      value={subStatusFilter}
                      onChange={(e) => setSubStatusFilter(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-[#1E222D] border border-[#2A2E39] rounded-md text-xs text-[#E2E8F0] focus:outline-hidden cursor-pointer"
                    >
                      <option value="ALL">
                        {isAr ? 'حالة الاشتراك: الكل' : 'Sub Status: All'}
                      </option>
                      <option value="ACTIVE">{isAr ? 'نشط (Active)' : 'Active'}</option>
                      <option value="EXPIRING_3D">
                        {isAr ? 'ينتهي خلال <= 3 أيام' : 'Expiring <= 3 Days'}
                      </option>
                      <option value="EXPIRING_7D">
                        {isAr ? 'ينتهي خلال <= 7 أيام' : 'Expiring <= 7 Days'}
                      </option>
                      <option value="EXPIRED">{isAr ? 'منتهي (Expired)' : 'Expired'}</option>
                      <option value="NO_EXPIRY">
                        {isAr ? 'بدون تاريخ انتهاء' : 'No Expiry'}
                      </option>
                    </select>
                  </div>

                  {/* Account Status Filter */}
                  <div className="md:col-span-2">
                    <select
                      value={accountStatusFilter}
                      onChange={(e) => setAccountStatusFilter(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-[#1E222D] border border-[#2A2E39] rounded-md text-xs text-[#E2E8F0] focus:outline-hidden cursor-pointer"
                    >
                      <option value="ALL">
                        {isAr ? 'حالة الحساب: الكل' : 'Account: All'}
                      </option>
                      <option value="ACTIVE">{isAr ? 'طبيعي (Active)' : 'Active'}</option>
                      <option value="MUTED">
                        {isAr ? 'مكتوم في الشات (Muted)' : 'Muted in Chat'}
                      </option>
                      <option value="BANNED">
                        {isAr ? 'موقوف / محظور (Banned)' : 'Suspended / Banned'}
                      </option>
                    </select>
                  </div>

                  {/* Staff Role Filter & Sort */}
                  <div className="md:col-span-2 flex items-center gap-1.5">
                    <select
                      value={staffFilter}
                      onChange={(e) => setStaffFilter(e.target.value as any)}
                      className="w-1/2 px-2 py-1.5 bg-[#1E222D] border border-[#2A2E39] rounded-md text-xs text-[#E2E8F0] focus:outline-hidden cursor-pointer"
                    >
                      <option value="ALL">{isAr ? 'الكل' : 'All'}</option>
                      <option value="CLIENTS_ONLY">{isAr ? 'العملاء' : 'Clients'}</option>
                      <option value="STAFF_ONLY">{isAr ? 'الطاقم' : 'Staff'}</option>
                    </select>

                    <select
                      value={userSortBy}
                      onChange={(e) => setUserSortBy(e.target.value as any)}
                      className="w-1/2 px-2 py-1.5 bg-[#1E222D] border border-[#2A2E39] rounded-md text-xs text-[#E2E8F0] focus:outline-hidden cursor-pointer"
                      title={isAr ? 'ترتيب حسب' : 'Sort By'}
                    >
                      <option value="NEWEST">{isAr ? 'الأحدث' : 'Newest'}</option>
                      <option value="EXPIRING_SOONEST">
                        {isAr ? 'الأقرب انتهاءً' : 'Expiring'}
                      </option>
                      <option value="TIER">{isAr ? 'الباقة' : 'Tier'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pro Users CRM Table */}
              <div className="bg-[#131722] border border-[#2A2E39] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#2A2E39] bg-[#0B0E11] text-[#64748B] font-mono text-[11px] uppercase">
                        <th className="py-2.5 px-3 text-start">{isAr ? 'العميل' : 'User'}</th>
                        <th className="py-2.5 px-3 text-start">
                          {isAr ? 'الهاتف والدولة' : 'Phone & Country'}
                        </th>
                        <th className="py-2.5 px-3 text-start">
                          {isAr ? 'الباقة والرتبة' : 'Plan & Role'}
                        </th>
                        <th className="py-2.5 px-3 text-start">
                          {isAr ? 'تاريخ الانتهاء' : 'Subscription Expiry'}
                        </th>
                        <th className="py-2.5 px-3 text-start">
                          {isAr ? 'الإشعارات والحالة' : 'Status & Push'}
                        </th>
                        <th className="py-2.5 px-3 text-end">
                          {isAr ? 'المدفوعات' : 'Paid'}
                        </th>
                        <th className="py-2.5 px-3 text-end">
                          {isAr ? 'إجراءات سريعة' : 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2E39]">
                      {filteredAndSortedUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-[#64748B]">
                            {usersLoading
                              ? isAr
                                ? 'جاري تحميل سجل العملاء...'
                                : 'Loading user directory...'
                              : isAr
                              ? 'لا يوجد عملاء يطابقون الفلتر الحالي.'
                              : 'No users match the selected filters.'}
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedUsers.map((u) => {
                          const effTier = getEffectiveTier(u);
                          const activeTrials = getActiveTrialFeatures(u);
                          const isPushActive = pushActiveUids.has(u.id);
                          const notesCount = u.adminNotes?.length || 0;
                          const isStaffRow =
                            ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(
                              (u.role || '').toUpperCase()
                            ) || hasAnyStaffPermission(u);

                          return (
                            <tr
                              key={u.id}
                              onClick={() => {
                                soundManager.playClick();
                                setInspectUser(u);
                              }}
                              className="hover:bg-[#1E222D] transition-colors cursor-pointer"
                            >
                              {/* User Identity */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded bg-[#1E222D] text-[#E2E8F0] font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-[#2A2E39]">
                                    {u.displayName ? u.displayName[0].toUpperCase() : 'U'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-[#F8FAFC] truncate">
                                        {u.displayName}
                                      </span>
                                      {notesCount > 0 && (
                                        <span
                                          className="px-1.5 py-0.2 rounded bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 text-[9px] font-mono"
                                          title={
                                            isAr
                                              ? `${notesCount} ملاحظة إدارية`
                                              : `${notesCount} Staff Note(s)`
                                          }
                                        >
                                          {notesCount}N
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[#64748B] font-mono truncate block">
                                      {u.email}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Phone & Country */}
                              <td
                                className="py-2.5 px-3 font-mono tabular-nums"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[#E2E8F0] text-[11px] truncate">
                                    {u.phone || '—'}
                                  </span>
                                  {u.phone && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(u.phone || '');
                                        soundManager.playClick();
                                        showFeedback(
                                          'info',
                                          isAr ? 'تم نسخ رقم الهاتف' : 'Phone number copied'
                                        );
                                      }}
                                      className="p-1 rounded hover:bg-[#2A2E39] text-[#64748B] hover:text-white cursor-pointer"
                                      title={isAr ? 'نسخ الرقم' : 'Copy Phone'}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#64748B] block truncate">
                                  {u.country || 'Global'}
                                </span>
                              </td>

                              {/* Plan & Staff Role */}
                              <td className="py-2.5 px-3 font-mono">
                                <div className="flex flex-wrap items-center gap-1">
                                  {effTier === 'elite' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/40">
                                      ELITE
                                    </span>
                                  ) : effTier === 'vip' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#26A69A]/15 text-[#26A69A] border border-[#26A69A]/40">
                                      VIP
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1E222D] text-[#64748B] border border-[#2A2E39]">
                                      FREE
                                    </span>
                                  )}

                                  {isStaffRow && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1E222D] text-[#38BDF8] border border-[#38BDF8]/30">
                                      {getStaffRoleLabel(u, false).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                {activeTrials.length > 0 && (
                                  <span className="block text-[9px] text-[#26A69A] mt-0.5">
                                    +{activeTrials.length}{' '}
                                    {isAr ? 'ميزة مخصصة' : 'Feature Grant(s)'}
                                  </span>
                                )}
                              </td>

                              {/* Subscription Expiry */}
                              <td className="py-2.5 px-3 font-mono tabular-nums">
                                {u.subscriptionEndDate ? (
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      new Date(u.subscriptionEndDate).getTime() <= Date.now()
                                        ? 'text-[#EF5350]'
                                        : new Date(u.subscriptionEndDate).getTime() -
                                            Date.now() <=
                                          3 * 24 * 60 * 60 * 1000
                                        ? 'text-[#F0B90B]'
                                        : 'text-[#E2E8F0]'
                                    }`}
                                  >
                                    {formatExpiryShort(u.subscriptionEndDate, isAr)}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#64748B]">
                                    {effTier !== 'free'
                                      ? isAr
                                        ? 'مفتوح'
                                        : 'No Expiry'
                                      : '—'}
                                  </span>
                                )}
                                <span className="block text-[9px] text-[#64748B]">
                                  {isAr ? 'انضم:' : 'Joined:'}{' '}
                                  {formatDateTimeCompact(u.createdAtMs, u.createdAt, isAr)}
                                </span>
                              </td>

                              {/* Account Status & Push */}
                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {u.isBanned ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#EF5350]/15 text-[#EF5350] border border-[#EF5350]/40">
                                      BANNED
                                    </span>
                                  ) : u.isMutedFromChat ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/40">
                                      MUTED
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#26A69A]/10 text-[#26A69A] border border-[#26A69A]/30">
                                      ACTIVE
                                    </span>
                                  )}

                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono inline-flex items-center gap-1 border ${
                                      isPushActive
                                        ? 'bg-[#26A69A]/10 text-[#26A69A] border-[#26A69A]/30'
                                        : 'bg-[#1E222D] text-[#64748B] border-[#2A2E39]'
                                    }`}
                                    title={
                                      isPushActive
                                        ? 'Web Push Notifications Subscribed'
                                        : 'No Web Push Subscription'
                                    }
                                  >
                                    {isPushActive ? (
                                      <Bell className="w-2.5 h-2.5" />
                                    ) : (
                                      <BellOff className="w-2.5 h-2.5" />
                                    )}
                                    <span>{isPushActive ? 'PUSH' : 'OFF'}</span>
                                  </span>
                                </div>
                              </td>

                              {/* Revenue Paid */}
                              <td className="py-2.5 px-3 text-end font-mono tabular-nums">
                                <span className="text-xs font-semibold text-[#26A69A]">
                                  ${(u.totalPaid || 0).toLocaleString()}
                                </span>
                              </td>

                              {/* Actions */}
                              <td
                                className="py-2.5 px-3 text-end"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  {onStartDirectMessage && u.uid !== auth.currentUser?.uid && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundManager.playClick();
                                        onStartDirectMessage({
                                          uid: u.uid,
                                          displayName: u.displayName,
                                          avatar: u.avatar,
                                          role: u.role
                                        });
                                      }}
                                      className="p-1.5 rounded bg-[#1E222D] hover:bg-[#2A2E39] text-[#94A3B8] hover:text-white border border-[#2A2E39] cursor-pointer"
                                      title={isAr ? 'مراسلة على الخاص' : 'Direct Message'}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleToggleChatMute(u)}
                                    className={`p-1.5 rounded border cursor-pointer ${
                                      u.isMutedFromChat
                                        ? 'bg-[#F0B90B] text-black border-[#F0B90B]'
                                        : 'bg-[#1E222D] text-[#64748B] hover:text-white border-[#2A2E39]'
                                    }`}
                                    title={u.isMutedFromChat ? 'Unmute Chat' : 'Mute in Chat'}
                                  >
                                    <VolumeX className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleGlobalBan(u)}
                                    className={`p-1.5 rounded border cursor-pointer ${
                                      u.isBanned
                                        ? 'bg-[#EF5350] text-white border-[#EF5350]'
                                        : 'bg-[#1E222D] text-[#64748B] hover:text-white border-[#2A2E39]'
                                    }`}
                                    title={u.isBanned ? 'Unban User' : 'Suspend / Ban User'}
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundManager.playClick();
                                      setInspectUser(u);
                                    }}
                                    className="px-2.5 py-1 rounded bg-[#26A69A] hover:bg-[#1E8E82] text-white font-semibold text-[11px] cursor-pointer"
                                  >
                                    {isAr ? 'تحكم' : 'Manage'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: POPUPS & MESSAGING */}
          {/* ========================================================================= */}
          {activeSection === 'messaging' && (
            <div className="space-y-4">
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
                  isBanned: u.isBanned
                }))}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: TRADING & CONTENT (PUBLISHING CENTER) */}
          {/* ========================================================================= */}
          {activeSection === 'trading' && (
            <div className="space-y-4">
              <div className="bg-[#131722] border border-[#2A2E39] rounded-lg p-4 sm:p-5">
                <PublishingCenter
                  lang={lang}
                  currentUserRole={effectiveRole}
                  canPostSignals={Boolean(
                    myPermissions.canPostSignals || myPermissions.canManageSystem
                  )}
                  canPostAnalysis={Boolean(
                    myPermissions.canPostAnalysis || myPermissions.canManageSystem
                  )}
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: TEAM & PERMISSIONS (GRANULAR RBAC + 1-CLICK PRESETS + AUDIT LOG) */}
          {/* ========================================================================= */}
          {activeSection === 'team' && isFullAdmin && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2E39] pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#F8FAFC]">
                    {isAr
                      ? 'إدارة الفريق والصلاحيات الدقيقة (Granular RBAC) وسجل التدقيق'
                      : 'Team Roles, Granular Permissions (RBAC) & Staff Audit Log'}
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    {isAr
                      ? 'عيّن قوالب الرتب بضغطة واحدة أو خصص الصلاحيات الفردية لكل عضو في الفريق'
                      : 'Assign 1-click role presets or customize individual permission flags stored on /users/{userId}'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left Column: Staff & User Selector */}
                <div className="lg:col-span-5 bg-[#131722] border border-[#2A2E39] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                      {isAr ? 'أعضاء الفريق والبحث عن مستخدم' : 'Active Staff & User Lookup'}
                    </h3>
                    <span className="text-[11px] font-mono text-[#26A69A]">
                      {totalStaffCount} {isAr ? 'عضو طاقم' : 'Staff'}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      type="text"
                      value={teamSearchQuery}
                      onChange={(e) => setTeamSearchQuery(e.target.value)}
                      placeholder={
                        isAr
                          ? 'ابحث عن أي مستخدم لترقيته أو تعديل صلاحياته...'
                          : 'Search any user by name, email, or phone to assign role...'
                      }
                      className="w-full ps-9 pe-3 py-1.5 bg-[#1E222D] border border-[#2A2E39] focus:border-[#26A69A] rounded-md text-xs text-white placeholder-[#64748B] focus:outline-hidden"
                    />
                  </div>

                  <div className="max-h-[380px] overflow-y-auto divide-y divide-[#2A2E39] border border-[#2A2E39] rounded-md bg-[#0B0E11]">
                    {users
                      .filter((u) => {
                        const q = teamSearchQuery.trim().toLowerCase();
                        if (q) {
                          return (
                            u.displayName.toLowerCase().includes(q) ||
                            u.email.toLowerCase().includes(q) ||
                            (u.phone || '').includes(q)
                          );
                        }
                        // When search is empty, show current staff members first, then recent users
                        return true;
                      })
                      .sort((a, b) => {
                        const aStaff =
                          hasAnyStaffPermission(a) ||
                          ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(
                            (a.role || '').toUpperCase()
                          );
                        const bStaff =
                          hasAnyStaffPermission(b) ||
                          ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(
                            (b.role || '').toUpperCase()
                          );
                        if (aStaff !== bStaff) return aStaff ? -1 : 1;
                        return (b.createdAtMs || 0) - (a.createdAtMs || 0);
                      })
                      .slice(0, 60)
                      .map((u) => {
                        const isSelected = selectedRbacUser?.id === u.id;
                        const isStaffMember =
                          hasAnyStaffPermission(u) ||
                          ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(
                            (u.role || '').toUpperCase()
                          );
                        return (
                          <button
                            key={`rbac-u-${u.id}`}
                            type="button"
                            onClick={() => handleSelectUserForRbac(u)}
                            className={`w-full p-2.5 text-start flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isSelected ? 'bg-[#1E222D]' : 'hover:bg-[#131722]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[#F8FAFC] truncate">
                                {u.displayName}
                              </div>
                              <div className="text-[10px] font-mono text-[#64748B] truncate">
                                {u.email}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 border ${
                                isStaffMember
                                  ? 'bg-[#26A69A]/15 text-[#26A69A] border-[#26A69A]/40'
                                  : 'bg-[#131722] text-[#64748B] border-[#2A2E39]'
                              }`}
                            >
                              {getStaffRoleLabel(u, isAr)}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Right Column: 1-Click Role Presets + 8 Granular Checkboxes */}
                <div className="lg:col-span-7 bg-[#131722] border border-[#2A2E39] rounded-lg p-4 space-y-4">
                  {!selectedRbacUser ? (
                    <div className="py-16 text-center text-xs text-[#64748B]">
                      {isAr
                        ? 'اختر عضواً من القائمة الجانبية لتعديل رتبته أو تخصيص صلاحياته الفردية.'
                        : 'Select a user from the directory on the left to assign a role preset or customize granular permissions.'}
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2E39] pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#F8FAFC]">
                            {selectedRbacUser.displayName}
                          </h3>
                          <p className="text-[11px] font-mono text-[#64748B]">
                            {selectedRbacUser.email} • UID: {selectedRbacUser.id}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-[#1E222D] border border-[#2A2E39] text-xs font-mono font-semibold text-[#26A69A]">
                          {getStaffRoleLabel(
                            {
                              ...selectedRbacUser,
                              staffRole: editingPreset,
                              permissions: editingPermissions
                            },
                            isAr
                          )}
                        </span>
                      </div>

                      {/* 1-Click Role Presets */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                          {isAr ? 'قوالب الرتب الجاهزة (1-Click Role Presets)' : '1-Click Role Presets'}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {ROLE_PRESET_DEFINITIONS.map((preset) => {
                            const active = editingPreset === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleApplyRbacPreset(preset.id)}
                                className={`p-2.5 rounded-md border text-start transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-[#1E222D] border-[#26A69A] text-[#F8FAFC]'
                                    : 'bg-[#0B0E11] border-[#2A2E39] text-[#94A3B8] hover:text-white hover:bg-[#1E222D]/50'
                                }`}
                              >
                                <div className="text-xs font-bold truncate">
                                  {isAr ? preset.labelAr : preset.labelEn}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Granular Permission Checkboxes */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                          {isAr
                            ? 'الصلاحيات التفصيلية (Granular Permission Flags)'
                            : 'Granular Permission Flags (/users/{uid}.permissions)'}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {STAFF_PERMISSION_CATALOG.map((perm) => {
                            const checked = Boolean(editingPermissions[perm.key]);
                            return (
                              <button
                                key={perm.key}
                                type="button"
                                onClick={() => handleTogglePermissionFlag(perm.key)}
                                className={`p-3 rounded-md border text-start flex items-start justify-between gap-2.5 transition-colors cursor-pointer ${
                                  checked
                                    ? 'bg-[#1E222D] border-[#26A69A]/60 text-[#F8FAFC]'
                                    : 'bg-[#0B0E11] border-[#2A2E39] text-[#64748B] hover:text-[#E2E8F0]'
                                }`}
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="text-xs font-bold text-[#F8FAFC]">
                                    {isAr ? perm.labelAr : perm.labelEn}
                                  </div>
                                  <div className="text-[10px] text-[#94A3B8] leading-snug">
                                    {isAr ? perm.descriptionAr : perm.descriptionEn}
                                  </div>
                                  <span className="inline-block text-[9px] font-mono text-[#64748B]">
                                    {perm.key}
                                  </span>
                                </div>
                                <span
                                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                                    checked
                                      ? 'bg-[#26A69A] border-[#26A69A] text-white'
                                      : 'border-[#2A2E39] bg-[#131722]'
                                  }`}
                                >
                                  {checked && <Check className="w-3 h-3" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2E39]">
                        <button
                          type="button"
                          disabled={isSavingRbac}
                          onClick={handleSaveStaffPermissions}
                          className="px-4 py-2 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] disabled:opacity-50 text-white font-bold text-xs cursor-pointer flex items-center gap-2"
                        >
                          {isSavingRbac ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isAr
                              ? 'حفظ الصلاحيات وتحديث الحساب'
                              : 'Save Permissions & Update Staff Record'}
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* STAFF AUDIT LOG TABLE (admin_audit_logs) */}
              <div className="bg-[#131722] border border-[#2A2E39] rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#26A69A]" />
                    <h3 className="text-xs sm:text-sm font-bold text-[#F8FAFC]">
                      {isAr
                        ? 'سجل تدقيق عمليات الإدارة والطاقم (Staff Audit Log)'
                        : 'Staff Audit Log (admin_audit_logs)'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={auditActionFilter}
                      onChange={(e) => setAuditActionFilter(e.target.value)}
                      className="px-2.5 py-1 bg-[#1E222D] border border-[#2A2E39] rounded text-xs text-[#E2E8F0] focus:outline-hidden"
                    >
                      <option value="ALL">{isAr ? 'كل العمليات' : 'All Actions'}</option>
                      <option value="USER_PLAN_UPDATED">Plan Updates</option>
                      <option value="USER_EXPIRY_UPDATED">Expiry Changes</option>
                      <option value="STAFF_PERMISSIONS_UPDATED">RBAC Changes</option>
                      <option value="POPUP_PUBLISHED">Popups Published</option>
                      <option value="POPUP_UPDATED">Popups Updated</option>
                      <option value="POPUP_STATUS_CHANGED">Popups Paused/Resumed</option>
                      <option value="POPUP_DELETED">Popups Deleted</option>
                      <option value="BULK_DM_SENT">Bulk DMs Sent</option>
                      <option value="TEMPLATE_SAVED">Templates Saved</option>
                      <option value="SUPPORT_INBOX_REPLY">Support Inbox Replies</option>
                      <option value="UPDATE_PLAN_PRICING">Plan Pricing Updates</option>
                      <option value="USER_BANNED">Bans</option>
                      <option value="USER_MUTED">Chat Mutes</option>
                      <option value="USER_NOTE_ADDED">Internal Notes</option>
                      <option value="MANUAL_PAYMENT_LOGGED">Payments</option>
                    </select>
                    <button
                      type="button"
                      onClick={loadAuditLogs}
                      className="px-2.5 py-1 rounded bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-xs text-[#E2E8F0] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${auditLogsLoading ? 'animate-spin' : ''}`}
                      />
                      <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[340px] overflow-y-auto border border-[#2A2E39] rounded-md bg-[#0B0E11]">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#131722] border-b border-[#2A2E39] text-[#64748B] font-mono text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3 text-start">{isAr ? 'التوقيت' : 'Timestamp'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'المسؤول' : 'Staff Actor'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'الإجراء' : 'Action'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'المستهدف' : 'Target User'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'التفاصيل' : 'Details'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2E39]">
                      {auditLogs.filter(
                        (l) => auditActionFilter === 'ALL' || l.action === auditActionFilter
                      ).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#64748B]">
                            {auditLogsLoading
                              ? isAr
                                ? 'جاري تحميل سجل التدقيق...'
                                : 'Loading audit log entries...'
                              : isAr
                              ? 'لا توجد عمليات مسجلة حتى الآن.'
                              : 'No audit log entries recorded yet.'}
                          </td>
                        </tr>
                      ) : (
                        auditLogs
                          .filter(
                            (l) => auditActionFilter === 'ALL' || l.action === auditActionFilter
                          )
                          .map((log) => (
                            <tr key={log.id} className="hover:bg-[#1E222D]/60">
                              <td className="py-2 px-3 font-mono tabular-nums text-[11px] text-[#94A3B8] whitespace-nowrap">
                                {new Date(log.timestampMs).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 font-semibold text-[#F8FAFC]">
                                {log.actorName}
                              </td>
                              <td className="py-2 px-3 font-mono text-[10px]">
                                <span className="px-1.5 py-0.5 rounded bg-[#1E222D] border border-[#2A2E39] text-[#26A69A]">
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-[#E2E8F0]">
                                {log.targetLabel || log.targetUid || '—'}
                              </td>
                              <td className="py-2 px-3 text-[11px] text-[#94A3B8]">
                                {log.details}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: SYSTEM & TOOLS (KEYS, BACKUP/RESTORE, PUSH, FORCE UPDATE, SETTINGS) */}
          {/* ========================================================================= */}
          {activeSection === 'system' && (
            <div className="space-y-6">
              {/* System Operations Bar (Super Admin only) */}
              {isFullAdmin && (
                <div className="p-4 rounded-lg bg-[#131722] border border-[#2A2E39] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2E39] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#F8FAFC]">
                        {isAr
                          ? 'أدوات النظام، النسخ الاحتياطي، والتحديث الإجباري'
                          : 'System Operations, Database Backup & Remote Force-Update'}
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        {isAr
                          ? 'إدارة النسخ الاحتياطية JSON، التبديل بين قواعد البيانات، وفحص إشعارات الخلفية'
                          : 'Manage JSON snapshots, database failover mode, and live client updates'}
                      </p>
                    </div>
                    {lastAutoBackupIso && (
                      <span className="text-[10px] font-mono text-[#64748B]">
                        {isAr ? 'آخر حفظ تلقائي:' : 'Last Auto-Snapshot:'}{' '}
                        {new Date(lastAutoBackupIso).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      disabled={isPushingAppUpdate}
                      onClick={handlePushAppUpdateToAllUsers}
                      className="p-3 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-start flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#26A69A]">
                          {isAr ? 'دفع التحديث لجميع المستخدمين' : 'Force Update All Users'}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {remoteAppVersionInfo?.versionId || 'Live broadcast reload'}
                        </div>
                      </div>
                      <RefreshCw
                        className={`w-4 h-4 text-[#26A69A] ${
                          isPushingAppUpdate ? 'animate-spin' : ''
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      disabled={isExportingBackup}
                      onClick={handleExportFullBackupJson}
                      className="p-3 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-start flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#F8FAFC]">
                          {isAr ? 'تصدير نسخة احتياطية كاملة (JSON)' : 'Export Full Backup JSON'}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {isAr ? 'الأعضاء، الصفقات، الشات، والرسائل' : 'Users, signals, chat & DMs'}
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-[#26A69A]" />
                    </button>

                    <label className="p-3 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-start flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-xs font-bold text-[#F8FAFC]">
                          {isAr ? 'استرجاع نسخة احتياطية (Restore)' : 'Restore From JSON Backup'}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {isAr ? 'رفع ملف JSON لاستعادة البيانات' : 'Upload backup snapshot file'}
                        </div>
                      </div>
                      <Database
                        className={`w-4 h-4 text-[#F0B90B] ${
                          isImportingBackup ? 'animate-spin' : ''
                        }`}
                      />
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportFullBackupJson}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={isSyncingLegacyDb}
                      onClick={() => handleSyncLegacyData(false)}
                      className="p-3 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-start flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#F0B90B]">
                          {isAr ? 'استعادة البيانات القديمة' : 'Restore Legacy Data & Chats'}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {isAr ? 'مزامنة السجلات التاريخية' : 'Sync historical records'}
                        </div>
                      </div>
                      <Database
                        className={`w-4 h-4 text-[#F0B90B] ${
                          isSyncingLegacyDb ? 'animate-spin' : ''
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchDatabaseMode()}
                      className="p-3 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-start flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#F8FAFC]">
                          {isAr
                            ? `قاعدة البيانات: ${
                                activeDbMode === 'default' ? 'الرئيسية (1)' : 'الاحتياطية (2)'
                              }`
                            : `Active DB: ${
                                activeDbMode === 'default' ? 'Primary (1)' : 'Standby (2)'
                              }`}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {isAr ? 'اضغط للتبديل الفوري' : 'Click to toggle database instance'}
                        </div>
                      </div>
                      <Database className="w-4 h-4 text-[#94A3B8]" />
                    </button>

                    <button
                      type="button"
                      disabled={isTestingBackgroundPush}
                      onClick={handleTestBackgroundPush}
                      className="p-3 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-start flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#F8FAFC]">
                          {isAr ? 'اختبار إشعار الخلفية (Web Push)' : 'Test Background Web Push'}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {isAr ? 'فحص اشتراك VAPID والإرسال' : 'Verify VAPID subscription & send'}
                        </div>
                      </div>
                      <BellRing className="w-4 h-4 text-[#26A69A]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Bulk VIP / Elite Activation Key Generator */}
              <div className="p-4 sm:p-5 rounded-lg bg-[#131722] border border-[#2A2E39] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2E39] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-[#1E222D] border border-[#2A2E39] flex items-center justify-center text-[#F0B90B]">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#F8FAFC]">
                        {isAr
                          ? 'مولد مفاتيح التفعيل الجماعي (VIP & Elite Key Generator)'
                          : 'Bulk VIP / Elite Activation Key Generator'}
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        {isAr
                          ? 'أنشئ حتى 200 مفتاح تفعيل ذو استخدام واحد لباقات VIP أو Elite مع تصدير CSV'
                          : 'Generate up to 200 single-use VIP or Elite activation keys with instant CSV export'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                    <span className="px-2.5 py-1 rounded bg-[#26A69A]/10 text-[#26A69A] border border-[#26A69A]/30 font-bold">
                      {activationKeys.filter((k) => k.status === 'active').length}{' '}
                      {isAr ? 'متاح' : 'ACTIVE'}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#1E222D] text-[#94A3B8] border border-[#2A2E39] font-bold">
                      {activationKeys.filter((k) => k.status === 'used').length}{' '}
                      {isAr ? 'مستخدم' : 'USED'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1.5">
                      {isAr ? 'الباقة المستهدفة' : 'Target Tier'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['vip', 'elite'] as const).map((tierOpt) => (
                        <button
                          key={tierOpt}
                          type="button"
                          onClick={() => setBulkKeyTier(tierOpt)}
                          className={`py-2 rounded-md text-xs font-mono font-bold uppercase transition-colors cursor-pointer border ${
                            bulkKeyTier === tierOpt
                              ? 'bg-[#F0B90B] text-black border-[#F0B90B]'
                              : 'bg-[#1E222D] text-[#E2E8F0] border-[#2A2E39]'
                          }`}
                        >
                          {tierOpt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1.5">
                      {isAr ? 'مدة الصلاحية' : 'Key Validity Duration'}
                    </label>
                    <select
                      value={selectedKeyDays}
                      onChange={(e) => setSelectedKeyDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#1E222D] border border-[#2A2E39] rounded-md text-xs text-white font-mono focus:outline-hidden cursor-pointer"
                    >
                      <option value={30}>{isAr ? '30 يوم (شهر)' : '30 Days (1 Month)'}</option>
                      <option value={90}>{isAr ? '90 يوم (3 أشهر)' : '90 Days (3 Months)'}</option>
                      <option value={365}>{isAr ? '365 يوم (سنة)' : '365 Days (1 Year)'}</option>
                      <option value={7}>{isAr ? '7 أيام (أسبوع)' : '7 Days'}</option>
                      <option value={36500}>{isAr ? 'مدى الحياة (Lifetime)' : 'Lifetime'}</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1.5">
                      {isAr ? 'الكمية (1 - 200)' : 'Quantity (1 - 200)'}
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 10, 50, 100, 200].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setBulkKeyQuantity(qty)}
                          className={`flex-1 py-2 rounded-md text-xs font-mono font-bold transition-colors cursor-pointer border ${
                            bulkKeyQuantity === qty
                              ? 'bg-[#26A69A] text-white border-[#26A69A]'
                              : 'bg-[#1E222D] text-[#E2E8F0] border-[#2A2E39]'
                          }`}
                        >
                          {qty}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <button
                      onClick={handleGenerateKey}
                      disabled={isGeneratingKey}
                      className="w-full px-4 py-2 rounded-md bg-[#F0B90B] hover:brightness-110 text-black font-bold text-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>
                        {isAr
                          ? `توليد ${bulkKeyQuantity} مفتاح (${bulkKeyTier.toUpperCase()})`
                          : `Generate ${bulkKeyQuantity} ${bulkKeyTier.toUpperCase()}`}
                      </span>
                    </button>
                  </div>
                </div>

                {lastGeneratedBatch.length > 0 && (
                  <div className="p-3 rounded-md bg-[#26A69A]/10 border border-[#26A69A]/30 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[#26A69A]">
                      {isAr
                        ? `الدفعة الأخيرة جاهزة: ${lastGeneratedBatch.length} مفتاح`
                        : `Latest batch ready: ${lastGeneratedBatch.length} keys`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadKeysCsv(
                          lastGeneratedBatch,
                          `mbk-batch-${lastGeneratedBatch.length}`
                        )
                      }
                      className="px-3 py-1.5 rounded bg-[#26A69A] text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {isAr
                          ? `تحميل CSV (${lastGeneratedBatch.length})`
                          : `Download CSV (${lastGeneratedBatch.length})`}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Feature Trial Code Generator */}
              <div className="p-4 sm:p-5 rounded-lg bg-[#131722] border border-[#2A2E39] space-y-4">
                <div className="flex items-center gap-3 border-b border-[#2A2E39] pb-3">
                  <div className="w-9 h-9 rounded-md bg-[#1E222D] border border-[#2A2E39] flex items-center justify-center text-[#26A69A]">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F8FAFC]">
                      {isAr
                        ? 'مولد أكواد التجربة المخصصة (Trial Code Generator)'
                        : 'Feature Trial Code Generator'}
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      {isAr
                        ? 'أنشئ أكواد تفعيل مؤقتة مرتبطة بميزات محددة وبمدة مخصصة'
                        : 'Create single-use trial codes tied to specific features or tiers'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <div className="lg:col-span-6 space-y-2.5">
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'custom', ar: 'ميزات محددة', en: 'Custom Features' },
                          { id: 'vip', ar: 'تجربة VIP', en: 'VIP Trial' },
                          { id: 'elite', ar: 'تجربة Elite', en: 'Elite Trial' }
                        ] as const
                      ).map((modeOpt) => (
                        <button
                          key={modeOpt.id}
                          type="button"
                          onClick={() => setTrialTargetMode(modeOpt.id)}
                          className={`py-1.5 px-3 rounded-md text-xs font-semibold border cursor-pointer ${
                            trialTargetMode === modeOpt.id
                              ? 'bg-[#26A69A] text-white border-[#26A69A]'
                              : 'bg-[#1E222D] text-[#E2E8F0] border-[#2A2E39]'
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
                              className={`p-2 rounded-md border text-start flex items-center justify-between gap-2 cursor-pointer ${
                                checked
                                  ? 'bg-[#1E222D] border-[#26A69A] text-white'
                                  : 'bg-[#0B0E11] border-[#2A2E39] text-[#64748B]'
                              }`}
                            >
                              <span className="text-[11px] font-semibold truncate">
                                {isAr ? feat.labelAr : feat.labelEn}
                              </span>
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                  checked
                                    ? 'bg-[#26A69A] border-[#26A69A] text-white'
                                    : 'border-[#2A2E39]'
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

                  <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1">
                        {isAr ? 'المدة بالأيام' : 'Duration (Days)'}
                      </label>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 3, 7, 14, 30].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setTrialDurationDays(d)}
                            className={`flex-1 py-1 rounded text-[11px] font-mono font-bold border cursor-pointer ${
                              trialDurationDays === d
                                ? 'bg-[#26A69A] text-white border-[#26A69A]'
                                : 'bg-[#1E222D] text-[#E2E8F0] border-[#2A2E39]'
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
                        onChange={(e) =>
                          setTrialDurationDays(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-full px-3 py-1.5 bg-[#1E222D] border border-[#2A2E39] rounded-md text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1">
                        {isAr ? 'عدد الأكواد (1 - 50)' : 'Code Quantity (1 - 50)'}
                      </label>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 5, 10, 25, 50].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setTrialQuantity(q)}
                            className={`flex-1 py-1 rounded text-[11px] font-mono font-bold border cursor-pointer ${
                              trialQuantity === q
                                ? 'bg-[#26A69A] text-white border-[#26A69A]'
                                : 'bg-[#1E222D] text-[#E2E8F0] border-[#2A2E39]'
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
                        className="w-full py-2 px-4 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isAr
                          ? `توليد ${trialQuantity} كود تجربة`
                          : `Generate ${trialQuantity} Trial Codes`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activation Keys Registry Table */}
              <div className="bg-[#131722] border border-[#2A2E39] rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#26A69A]" />
                    <span>
                      {isAr ? 'سجل مفاتيح التفعيل المولدة' : 'Generated Activation Keys Registry'} (
                      {activationKeys.length})
                    </span>
                  </h4>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={keySearchQuery}
                      onChange={(e) => setKeySearchQuery(e.target.value)}
                      placeholder={isAr ? 'بحث بالكود أو البريد...' : 'Filter code or email...'}
                      className="px-2.5 py-1 bg-[#1E222D] border border-[#2A2E39] rounded text-[11px] text-white font-mono"
                    />
                    <div className="flex items-center gap-1">
                      {(['ALL', 'active', 'used', 'revoked'] as const).map((statusTab) => (
                        <button
                          key={statusTab}
                          type="button"
                          onClick={() => setKeyStatusFilter(statusTab)}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase cursor-pointer ${
                            keyStatusFilter === statusTab
                              ? 'bg-[#26A69A] text-white'
                              : 'bg-[#1E222D] text-[#94A3B8]'
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
                      className="px-2.5 py-1 rounded bg-[#1E222D] border border-[#2A2E39] text-[#F0B90B] font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[360px] overflow-y-auto border border-[#2A2E39] rounded-md bg-[#0B0E11]">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#131722] border-b border-[#2A2E39] text-[#64748B] font-mono text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3 text-start">{isAr ? 'الكود' : 'Code'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'النطاق' : 'Scope'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'المدة' : 'Duration'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'المستخدم' : 'Used By'}</th>
                        <th className="py-2 px-3 text-end">{isAr ? 'إجراء' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2E39]">
                      {activationKeys
                        .filter((k) => {
                          if (keyStatusFilter !== 'ALL' && k.status !== keyStatusFilter)
                            return false;
                          if (keySearchQuery.trim()) {
                            const q = keySearchQuery.trim().toLowerCase();
                            return (
                              k.code.toLowerCase().includes(q) ||
                              (k.usedByUserEmail || '').toLowerCase().includes(q)
                            );
                          }
                          return true;
                        })
                        .map((k) => (
                          <tr key={k.id} className="hover:bg-[#1E222D]/60">
                            <td className="py-2 px-3 font-mono font-bold">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#F0B90B]">{k.code}</span>
                                <button
                                  onClick={() => handleCopyKey(k.code)}
                                  className="p-1 rounded bg-[#1E222D] text-[#94A3B8] hover:text-white cursor-pointer"
                                >
                                  {copiedKeyCode === k.code ? (
                                    <Check className="w-3 h-3 text-[#26A69A]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px] uppercase">
                              {k.grantTier === 'custom'
                                ? (k.grantFeatures || []).join(', ')
                                : k.grantTier}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums text-[11px]">
                              {k.durationInDays >= 36500 ? 'Lifetime' : `${k.durationInDays}d`}
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px] uppercase">
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  k.status === 'active'
                                    ? 'bg-[#26A69A]/15 text-[#26A69A]'
                                    : k.status === 'used'
                                    ? 'bg-[#1E222D] text-[#94A3B8]'
                                    : 'bg-[#EF5350]/15 text-[#EF5350]'
                                }`}
                              >
                                {k.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#94A3B8]">
                              {k.usedByUserEmail || '—'}
                            </td>
                            <td className="py-2 px-3 text-end">
                              <div className="flex items-center justify-end gap-1">
                                {k.status === 'active' && (
                                  <button
                                    onClick={() => handleRevokeKey(k.code)}
                                    className="px-2 py-0.5 rounded bg-[#F0B90B]/15 text-[#F0B90B] text-[10px] font-semibold cursor-pointer"
                                  >
                                    {isAr ? 'إلغاء' : 'Revoke'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteKey(k.code)}
                                  className="p-1 rounded bg-[#EF5350]/15 text-[#EF5350] cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Platform Contact Settings & Bot Webhook Tools (Super Admin Only) */}
              {isFullAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <form
                    onSubmit={handleSavePlatformSettings}
                    className="lg:col-span-7 p-4 sm:p-5 rounded-lg bg-[#131722] border border-[#2A2E39] space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-[#2A2E39] pb-3">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-[#26A69A]" />
                        <h3 className="text-sm font-bold text-[#F8FAFC]">
                          {isAr
                            ? 'إعدادات روابط الدعم والتواصل (settings/platform)'
                            : 'Platform Contact & Support Settings'}
                        </h3>
                      </div>
                      {settingsUpdatedAt && (
                        <span className="text-[10px] font-mono text-[#64748B]">
                          {new Date(settingsUpdatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1">
                          {isAr ? 'رقم الواتساب الرسمي' : 'Official WhatsApp Number'}
                        </label>
                        <input
                          type="text"
                          value={settingsWhatsapp}
                          onChange={(e) => setSettingsWhatsapp(e.target.value)}
                          placeholder="+971501234567"
                          dir="ltr"
                          className="w-full px-3 py-2 rounded-md bg-[#1E222D] border border-[#2A2E39] text-xs font-mono text-white"
                        />
                        {buildWhatsAppUrl(settingsWhatsapp) && (
                          <a
                            href={buildWhatsAppUrl(settingsWhatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-[#26A69A] mt-1 hover:underline"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>{buildWhatsAppUrl(settingsWhatsapp)}</span>
                          </a>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1">
                          {isAr ? 'رابط أو معرف التيليجرام' : 'Telegram Channel / Support'}
                        </label>
                        <input
                          type="text"
                          value={settingsTelegram}
                          onChange={(e) => setSettingsTelegram(e.target.value)}
                          placeholder="https://t.me/your_channel"
                          dir="ltr"
                          className="w-full px-3 py-2 rounded-md bg-[#1E222D] border border-[#2A2E39] text-xs font-mono text-white"
                        />
                        {normalizeTelegramUrl(settingsTelegram) && (
                          <a
                            href={normalizeTelegramUrl(settingsTelegram)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-[#38BDF8] mt-1 hover:underline"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>{formatTelegramHandle(settingsTelegram)}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1">
                        {isAr ? 'البريد الإلكتروني الرسمي للدعم' : 'Official Support Email'}
                      </label>
                      <input
                        type="email"
                        value={settingsEmail}
                        onChange={(e) => setSettingsEmail(e.target.value)}
                        placeholder="support@mbktrading.live"
                        dir="ltr"
                        className="w-full px-3 py-2 rounded-md bg-[#1E222D] border border-[#2A2E39] text-xs font-mono text-white"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingSettings}
                        className="px-4 py-2 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isAr ? 'حفظ الإعدادات' : 'Save Platform Settings'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Bot Webhook Maintenance Cards */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-4 rounded-lg bg-[#131722] border border-[#2A2E39] space-y-2.5">
                      <div className="flex items-center gap-2 text-[#26A69A] font-bold text-xs">
                        <Radio className="w-4 h-4" />
                        <span>
                          {isAr
                            ? 'محاكاة تنبيه TradingView Webhook'
                            : 'Simulate Test Webhook Alert'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        {isAr
                          ? 'إرسال تنبيه تداول تجريبي لاختبار الصوت والتنبيهات الفورية.'
                          : 'Trigger a test webhook trading alert to verify audio chimes and live bot feed.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleSimulateBotAlert}
                        className="px-3.5 py-2 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-[#26A69A] font-bold text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>
                          {isAr ? 'إرسال تنبيه Webhook تجريبي' : 'Send Test Webhook Simulation'}
                        </span>
                      </button>
                    </div>

                    <div className="p-4 rounded-lg bg-[#131722] border border-[#EF5350]/30 space-y-2.5">
                      <div className="flex items-center gap-2 text-[#EF5350] font-bold text-xs">
                        <Trash2 className="w-4 h-4" />
                        <span>
                          {isAr
                            ? 'تفريغ تنبيهات البوت (Wipe Bot Signals)'
                            : 'Wipe All Bot Server Signals'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        {isAr
                          ? 'حذف كافة تنبيهات Webhook المخزنة في مجموعة bot_alerts.'
                          : 'Permanently delete all stored TradingView webhook alerts in bot_alerts.'}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isWipingBotAlerts}
                          onClick={handleWipeAllBotAlerts}
                          className="px-3.5 py-2 rounded-md bg-[#EF5350] hover:bg-[#D32F2F] text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            {confirmWipeBots
                              ? isAr
                                ? 'اضغط مجدداً لتأكيد الحذف النهائي'
                                : 'Click Again to Confirm Wipe'
                              : isAr
                              ? 'حذف وتفريغ تنبيهات البوت'
                              : 'Wipe Bot Signals Now'}
                          </span>
                        </button>
                        {confirmWipeBots && (
                          <button
                            type="button"
                            onClick={() => setConfirmWipeBots(false)}
                            className="px-3 py-2 rounded-md bg-[#1E222D] text-white text-xs font-semibold cursor-pointer"
                          >
                            {isAr ? 'إلغاء' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Plan Pricing & MRR Config Card (settings/pricing — restricted to role === 'admin' || permissions.canManageSystem) */}
                  <form
                    onSubmit={handleSavePlanPricing}
                    className="lg:col-span-12 p-4 sm:p-5 rounded-lg bg-[#131722] border border-[#2A2E39] space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2E39] pb-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#26A69A]" />
                        <div>
                          <h3 className="text-sm font-bold text-[#F8FAFC]">
                            {isAr
                              ? 'إعدادات أسعار الباقات وحساب الإيراد الشهري (Plan Pricing & MRR Config)'
                              : 'Plan Pricing & MRR Config (settings/pricing)'}
                          </h3>
                          <p className="text-[11px] text-[#64748B]">
                            {isAr
                              ? 'تُستخدم هذه الأسعار لحساب الإيراد الشهري المتوقع (MRR) وتوزيع الإيرادات في قسم الإحصائيات'
                              : 'Dynamically drives Estimated MRR and Chart 2 Revenue Breakdown in Overview & Analytics'}
                          </p>
                        </div>
                      </div>
                      {loadedPlanPricing.updatedAt && (
                        <span className="text-[10px] font-mono text-[#64748B]">
                          {isAr ? 'آخر تحديث:' : 'Last Saved:'}{' '}
                          {new Date(loadedPlanPricing.updatedAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#F0B90B] mb-1">
                          {isAr
                            ? 'سعر باقة VIP / Pro الشهري (USD $/mo)'
                            : 'VIP / Pro Monthly Price (USD $/mo)'}
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 start-0 ps-3 flex items-center text-xs font-mono text-[#94A3B8] pointer-events-none">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100000"
                            step="0.01"
                            value={pricingVipInput}
                            onChange={(e) => setPricingVipInput(e.target.value)}
                            dir="ltr"
                            className="w-full ps-7 pe-3 py-2 rounded-md bg-[#1E222D] border border-[#2A2E39] text-xs font-mono tabular-nums text-white focus:outline-hidden focus:border-[#F0B90B]"
                          />
                        </div>
                        <span className="block text-[10px] font-mono text-[#64748B] mt-1">
                          {isAr ? 'السعر المحفوظ حالياً:' : 'Saved rate:'} $
                          {loadedPlanPricing.vipMonthlyUsd}/mo
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#26A69A] mb-1">
                          {isAr
                            ? 'سعر باقة Elite الشهري (USD $/mo)'
                            : 'Elite Monthly Price (USD $/mo)'}
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 start-0 ps-3 flex items-center text-xs font-mono text-[#94A3B8] pointer-events-none">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100000"
                            step="0.01"
                            value={pricingEliteInput}
                            onChange={(e) => setPricingEliteInput(e.target.value)}
                            dir="ltr"
                            className="w-full ps-7 pe-3 py-2 rounded-md bg-[#1E222D] border border-[#2A2E39] text-xs font-mono tabular-nums text-white focus:outline-hidden focus:border-[#26A69A]"
                          />
                        </div>
                        <span className="block text-[10px] font-mono text-[#64748B] mt-1">
                          {isAr ? 'السعر المحفوظ حالياً:' : 'Saved rate:'} $
                          {loadedPlanPricing.eliteMonthlyUsd}/mo
                        </span>
                      </div>

                      <div className="p-3 rounded-md bg-[#0B0E11] border border-[#2A2E39] space-y-2">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={pricingSyncPublic}
                            onChange={(e) => {
                              soundManager.playClick();
                              setPricingSyncPublic(e.target.checked);
                            }}
                            className="mt-0.5 rounded border-[#2A2E39] bg-[#1E222D] text-[#26A69A] focus:ring-0 cursor-pointer"
                          />
                          <div className="text-xs">
                            <div className="font-semibold text-[#E2E8F0]">
                              {isAr
                                ? 'مزامنة الأسعار مع نافذة الترقية والباقات العامة'
                                : 'Sync prices to public Upgrade/Plans modal'}
                            </div>
                            <div className="text-[10px] text-[#64748B] mt-0.5">
                              {isAr
                                ? 'افتراضياً (OFF): تبقى واجهة المستخدم العامة بدون تغيير ما لم يتم تفعيله'
                                : 'Default OFF: keeps public pricing modal untouched unless enabled'}
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-[11px] font-mono tabular-nums text-[#94A3B8]">
                        {isAr ? 'معاينة الأسعار في التقارير:' : 'Analytics MRR Formula:'}{' '}
                        <span className="text-[#F0B90B]">
                          VIP (${Number(pricingVipInput) || 0}/mo)
                        </span>{' '}
                        +{' '}
                        <span className="text-[#26A69A]">
                          ELITE (${Number(pricingEliteInput) || 0}/mo)
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingPlanPricing}
                        className="px-4 py-2 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isAr ? 'حفظ الأسعار' : 'Save Pricing'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* USER CONTROL DRAWER / MODAL (SUBSCRIPTIONS, QUICK-EXTEND, NOTES, ACCOUNT) */}
      {/* ========================================================================= */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-xs animate-fade-in select-none">
          <div
            className="bg-[#131722] border-s border-[#2A2E39] w-full max-w-2xl h-full overflow-hidden shadow-2xl flex flex-col"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Drawer Header */}
            <div className="px-5 py-3.5 bg-[#0B0E11] border-b border-[#2A2E39] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-[#1E222D] border border-[#2A2E39] text-[#26A69A] flex items-center justify-center font-mono font-bold text-sm shrink-0">
                  {inspectUser.displayName ? inspectUser.displayName[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#F8FAFC] truncate">
                      {inspectUser.displayName}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1E222D] text-[#F0B90B] border border-[#2A2E39] uppercase">
                      {getEffectiveTier(inspectUser)}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] font-mono truncate">
                    {inspectUser.email} • UID: {inspectUser.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectUser(null)}
                className="p-1.5 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Status Indicators & Quick Account Actions Bar */}
              <div className="p-3.5 rounded-lg bg-[#0B0E11] border border-[#2A2E39] space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <span className="text-[#64748B] text-[10px] block">
                      {isAr ? 'رقم الهاتف' : 'Phone Number'}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono font-semibold text-[#F8FAFC]">
                      <span className="truncate">{inspectUser.phone || '—'}</span>
                      {inspectUser.phone && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(inspectUser.phone || '');
                            soundManager.playClick();
                            showFeedback(
                              'info',
                              isAr ? 'تم نسخ رقم الهاتف' : 'Copied phone number'
                            );
                          }}
                          className="p-1 rounded bg-[#1E222D] hover:bg-[#2A2E39] text-[#94A3B8] hover:text-white cursor-pointer"
                          title={isAr ? 'نسخ الرقم' : 'Copy Phone'}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[#64748B] text-[10px] block">
                      {isAr ? 'إشعارات Web Push' : 'Push Notifications'}
                    </span>
                    <span
                      className={`font-mono font-bold text-xs inline-flex items-center gap-1 ${
                        pushActiveUids.has(inspectUser.id)
                          ? 'text-[#26A69A]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {pushActiveUids.has(inspectUser.id) ? (
                        <>
                          <Bell className="w-3 h-3" />
                          <span>{isAr ? 'مفعّلة (Active)' : 'Active'}</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="w-3 h-3" />
                          <span>{isAr ? 'غير مفعّلة' : 'Inactive'}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] text-[10px] block">
                      {isAr ? 'تاريخ الانضمام' : 'Join Date'}
                    </span>
                    <span className="font-mono font-semibold text-[#E2E8F0] tabular-nums">
                      {formatDateTimeCompact(
                        inspectUser.createdAtMs,
                        inspectUser.createdAt,
                        isAr
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] text-[10px] block">
                      {isAr ? 'آخر ظهور / نشاط' : 'Last Seen'}
                    </span>
                    <span className="font-mono font-semibold text-[#E2E8F0] tabular-nums">
                      {inspectUser.lastActiveAt ||
                        formatDateTimeCompact(inspectUser.lastActiveAtMs, 'Active', isAr)}
                    </span>
                  </div>
                </div>

                {/* Quick Action Buttons: Jump to DM, Mute in Chat, Suspend/Ban, Copy Phone */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2A2E39]">
                  {onStartDirectMessage && inspectUser.uid !== auth.currentUser?.uid && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        const target = inspectUser;
                        setInspectUser(null);
                        onStartDirectMessage({
                          uid: target.uid,
                          displayName: target.displayName,
                          avatar: target.avatar,
                          role: target.role
                        });
                      }}
                      className="px-3 py-1.5 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>
                        {isAr ? 'مراسلة خاصة باسم MBK Trading' : 'Direct Message as MBK Trading'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleChatMute(inspectUser)}
                    className={`px-3 py-1.5 rounded-md border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      inspectUser.isMutedFromChat
                        ? 'bg-[#F0B90B] text-black border-[#F0B90B]'
                        : 'bg-[#1E222D] text-[#E2E8F0] border-[#2A2E39] hover:bg-[#2A2E39]'
                    }`}
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>
                      {inspectUser.isMutedFromChat
                        ? isAr
                          ? 'إلغاء كتم الشات'
                          : 'Unmute in Chat'
                        : isAr
                        ? 'كتم في الشات'
                        : 'Mute in Chat'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleGlobalBan(inspectUser)}
                    className={`px-3 py-1.5 rounded-md border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      inspectUser.isBanned
                        ? 'bg-[#EF5350] text-white border-[#EF5350]'
                        : 'bg-[#1E222D] text-[#EF5350] border-[#EF5350]/40 hover:bg-[#EF5350]/15'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>
                      {inspectUser.isBanned
                        ? isAr
                          ? 'رفع الحظر عن الحساب'
                          : 'Lift Account Ban'
                        : isAr
                        ? 'إيقاف / حظر الحساب'
                        : 'Suspend / Ban Account'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 1-CLICK QUICK EXTEND & SUBSCRIPTION PLAN CONTROL */}
              <div className="p-4 rounded-lg bg-[#0B0E11] border border-[#2A2E39] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#F0B90B]" />
                    <span>
                      {isAr
                        ? 'إدارة الباقة وتاريخ انتهاء الاشتراك'
                        : 'Subscription Plan & Expiry Control'}
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-[#26A69A]">
                    {inspectUser.subscriptionEndDate
                      ? `${isAr ? 'ينتهي:' : 'Expires:'} ${formatExpiryShort(
                          inspectUser.subscriptionEndDate,
                          isAr
                        )}`
                      : isAr
                      ? 'بدون تاريخ انتهاء'
                      : 'No Expiry Set'}
                  </span>
                </div>

                {/* 1-Click Quick-Extend Buttons (+7d, +30d, +90d, +1 Year, Revoke/Expire Now) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
                    {isAr
                      ? 'تمديد سريع بضغطة واحدة (Quick-Extend)'
                      : '1-Click Quick Extend / Revoke'}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { days: 7, labelEn: '+7d', labelAr: '+7 أيام' },
                      { days: 30, labelEn: '+30d', labelAr: '+30 يوم' },
                      { days: 90, labelEn: '+90d', labelAr: '+90 يوم' },
                      { days: 365, labelEn: '+1 Year', labelAr: '+1 سنة' }
                    ].map((btn) => (
                      <button
                        key={btn.days}
                        type="button"
                        disabled={isUpdatingTier}
                        onClick={() => handleQuickExtendSubscription(btn.days)}
                        className="px-3 py-1.5 rounded-md bg-[#1E222D] hover:bg-[#26A69A] text-[#E2E8F0] hover:text-white border border-[#2A2E39] font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isAr ? btn.labelAr : btn.labelEn}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={isUpdatingTier}
                      onClick={handleRevokeDirectTier}
                      className="px-3 py-1.5 rounded-md bg-[#EF5350]/15 hover:bg-[#EF5350] text-[#EF5350] hover:text-white border border-[#EF5350]/40 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 ms-auto"
                    >
                      {isAr ? 'إلغاء / إنهاء الآن (Free)' : 'Revoke / Expire Now'}
                    </button>
                  </div>
                </div>

                {/* Custom Tier & Exact Date Picker */}
                <div className="pt-2 border-t border-[#2A2E39] space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    {(['FREE', 'VIP', 'ELITE'] as const).map((planOpt) => {
                      const effTier = getEffectiveTier(inspectUser);
                      const isCurrent = effTier.toUpperCase() === planOpt;
                      return (
                        <button
                          key={planOpt}
                          type="button"
                          onClick={() => {
                            if (planOpt === 'FREE') {
                              handleRevokeDirectTier();
                            } else {
                              setDirectTierTarget(planOpt.toLowerCase() as 'vip' | 'elite');
                            }
                          }}
                          className={`py-1.5 px-3 rounded-md text-xs font-mono font-bold border cursor-pointer ${
                            (planOpt !== 'FREE' &&
                              directTierTarget === planOpt.toLowerCase()) ||
                            (planOpt === 'FREE' && isCurrent)
                              ? 'bg-[#F0B90B] text-black border-[#F0B90B]'
                              : 'bg-[#1E222D] text-[#E2E8F0] border-[#2A2E39]'
                          }`}
                        >
                          {planOpt}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDirectTierMode('days')}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-semibold border cursor-pointer ${
                        directTierMode === 'days'
                          ? 'bg-[#26A69A] text-white border-[#26A69A]'
                          : 'bg-[#1E222D] text-[#94A3B8] border-[#2A2E39]'
                      }`}
                    >
                      {isAr ? 'بالأيام' : 'By Days'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectTierMode('date')}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-semibold border cursor-pointer ${
                        directTierMode === 'date'
                          ? 'bg-[#26A69A] text-white border-[#26A69A]'
                          : 'bg-[#1E222D] text-[#94A3B8] border-[#2A2E39]'
                      }`}
                    >
                      {isAr ? 'تاريخ محدد' : 'Exact Expiry Date'}
                    </button>

                    {directTierMode === 'days' ? (
                      <input
                        type="number"
                        min={1}
                        max={36500}
                        value={directTierDays}
                        onChange={(e) =>
                          setDirectTierDays(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-24 px-2.5 py-1.5 bg-[#1E222D] border border-[#2A2E39] rounded text-xs text-white font-mono"
                      />
                    ) : (
                      <input
                        type="date"
                        value={directTierCustomDate}
                        onChange={(e) => setDirectTierCustomDate(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-[#1E222D] border border-[#2A2E39] rounded text-xs text-white font-mono"
                      />
                    )}

                    <button
                      type="button"
                      disabled={isUpdatingTier}
                      onClick={handleGrantDirectTier}
                      className="px-4 py-1.5 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] text-white font-bold text-xs cursor-pointer disabled:opacity-50 ms-auto"
                    >
                      {isAr
                        ? `تطبيق باقة ${directTierTarget.toUpperCase()}`
                        : `Apply ${directTierTarget.toUpperCase()} Plan`}
                    </button>
                  </div>
                </div>
              </div>

              {/* INTERNAL STAFF NOTES (Private to Staff, Never Visible to User) */}
              <div className="p-4 rounded-lg bg-[#0B0E11] border border-[#2A2E39] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#F0B90B]" />
                    <span>
                      {isAr
                        ? 'ملاحظات الفريق الداخلية (خاصة بالإدارة فقط)'
                        : 'Internal Staff Notes (Staff-Only • Private)'}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    {(inspectUser.adminNotes || []).length} {isAr ? 'ملاحظة' : 'Notes'}
                  </span>
                </div>

                <form onSubmit={handleAddStaffNote} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newStaffNoteText}
                    onChange={(e) => setNewStaffNoteText(e.target.value)}
                    placeholder={
                      isAr
                        ? 'أضف ملاحظة خاصة حول الاشتراك، الدفع، أو المتابعة...'
                        : 'Add private staff note (payment reference, follow-up, support context)...'
                    }
                    className="flex-1 px-3 py-2 bg-[#1E222D] border border-[#2A2E39] focus:border-[#26A69A] rounded-md text-xs text-white placeholder-[#64748B] focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={isSavingStaffNote || !newStaffNoteText.trim()}
                    className="px-3.5 py-2 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] disabled:opacity-50 text-white font-bold text-xs cursor-pointer shrink-0"
                  >
                    {isAr ? 'إضافة ملاحظة' : 'Add Note'}
                  </button>
                </form>

                {(inspectUser.adminNotes || []).length > 0 && (
                  <div className="space-y-2 max-h-44 overflow-y-auto pt-1">
                    {(inspectUser.adminNotes || []).map((note) => (
                      <div
                        key={note.id}
                        className="p-2.5 rounded-md bg-[#131722] border border-[#2A2E39] flex items-start justify-between gap-2"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs text-[#E2E8F0] leading-relaxed break-words">
                            {note.text}
                          </p>
                          <div className="text-[10px] font-mono text-[#64748B]">
                            {note.authorName} • {new Date(note.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaffNote(note.id)}
                          className="p-1 rounded hover:bg-[#1E222D] text-[#64748B] hover:text-[#EF5350] cursor-pointer shrink-0"
                          title={isAr ? 'حذف الملاحظة' : 'Delete note'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Individual Feature Grants */}
              <div className="p-4 rounded-lg bg-[#0B0E11] border border-[#2A2E39] space-y-3">
                <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#26A69A]" />
                  <span>
                    {isAr
                      ? 'صلاحيات الميزات الفردية المؤقتة (Feature Grants)'
                      : 'Individual Feature Grants & Custom Expiry'}
                  </span>
                </span>

                <div className="space-y-2">
                  {FEATURE_CATALOG.map((feat) => {
                    const currentExpiry = inspectUser.grantedFeatures?.[feat.key];
                    const isGrantActive = Boolean(
                      currentExpiry && new Date(currentExpiry).getTime() > Date.now()
                    );
                    const isBusy = busyFeatureKey === feat.key;
                    return (
                      <div
                        key={feat.key}
                        className="p-2.5 rounded-md bg-[#131722] border border-[#2A2E39] flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-semibold text-[#F8FAFC]">
                            {isAr ? feat.labelAr : feat.labelEn}
                          </div>
                          <div className="text-[10px] font-mono">
                            {isGrantActive ? (
                              <span className="text-[#26A69A]">
                                {isAr ? 'مفعّلة حتى: ' : 'Active until: '}
                                {formatExpiryShort(currentExpiry, isAr)}
                              </span>
                            ) : (
                              <span className="text-[#64748B]">
                                {isAr ? 'غير مفعّلة فردياً' : 'No individual grant'}
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
                            className="w-14 px-2 py-1 bg-[#1E222D] border border-[#2A2E39] rounded text-[11px] text-white font-mono"
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
                            className="px-2 py-1 bg-[#1E222D] border border-[#2A2E39] rounded text-[10px] text-white font-mono"
                          />
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleGrantIndividualFeature(feat.key)}
                            className="px-2.5 py-1 rounded bg-[#26A69A] text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                          >
                            {isAr ? 'منح' : 'Grant'}
                          </button>
                          {isGrantActive && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRevokeIndividualFeature(feat.key)}
                              className="px-2 py-1 rounded bg-[#EF5350]/15 text-[#EF5350] border border-[#EF5350]/30 font-bold text-[11px] cursor-pointer"
                            >
                              {isAr ? 'سحب' : 'Revoke'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manual Payment Logger */}
              <form
                onSubmit={handleLogManualPayment}
                className="p-4 rounded-lg bg-[#0B0E11] border border-[#2A2E39] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#26A69A] font-bold text-xs">
                    <DollarSign className="w-4 h-4" />
                    <span>
                      {isAr
                        ? 'تسجيل دفعة مالية وتجديد الاشتراك'
                        : 'Log Manual Payment & Extend Subscription'}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#26A69A]">
                    {isAr ? 'إجمالي المدفوع:' : 'Lifetime Paid:'} $
                    {(inspectUser.totalPaid || 0).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] font-semibold mb-1">
                      {isAr ? 'المبلغ المستلم ($)' : 'Amount Paid ($)'}
                    </label>
                    <input
                      type="number"
                      value={paymentAmountInput}
                      onChange={(e) => setPaymentAmountInput(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-1.5 bg-[#1E222D] border border-[#2A2E39] rounded-md text-xs text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#94A3B8] font-semibold mb-1">
                      {isAr ? 'مدة التمديد' : 'Extension Duration'}
                    </label>
                    <select
                      value={paymentDurationInput}
                      onChange={(e) => setPaymentDurationInput(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-[#1E222D] border border-[#2A2E39] rounded-md text-xs text-white font-mono cursor-pointer"
                    >
                      <option value="30">{isAr ? '+30 يوم' : '+30 Days'}</option>
                      <option value="90">{isAr ? '+90 يوم' : '+90 Days'}</option>
                      <option value="180">{isAr ? '+180 يوم' : '+180 Days'}</option>
                      <option value="365">{isAr ? '+365 يوم (سنة)' : '+365 Days'}</option>
                      <option value="lifetime">{isAr ? 'مدى الحياة' : 'Lifetime'}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingPayment}
                  className="w-full py-2 px-4 rounded-md bg-[#F0B90B] hover:brightness-110 text-black font-bold text-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>
                    {isAr ? 'تسجيل الدفعة وتمديد الاشتراك' : 'Log Payment & Extend Access'}
                  </span>
                </button>
              </form>
            </div>

            {/* Drawer Footer */}
            <div className="px-5 py-3 bg-[#0B0E11] border-t border-[#2A2E39] flex items-center justify-between shrink-0">
              {isFullAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectUser;
                    setInspectUser(null);
                    setActiveSection('team');
                    handleSelectUserForRbac(target);
                  }}
                  className="px-3 py-1.5 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-[#26A69A] text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <UserCog className="w-3.5 h-3.5" />
                  <span>
                    {isAr ? 'تخصيص صلاحيات الطاقم (RBAC)' : 'Configure Staff Permissions (RBAC)'}
                  </span>
                </button>
              )}
              <button
                onClick={() => setInspectUser(null)}
                className="px-4 py-1.5 rounded-md bg-[#1E222D] hover:bg-[#2A2E39] text-white text-xs font-semibold cursor-pointer ms-auto"
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
