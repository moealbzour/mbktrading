import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Crown,
  LogOut,
  Mail,
  CheckCircle2,
  Globe,
  Volume2,
  VolumeX,
  Headphones,
  Copy,
  Check,
  Sliders,
  Edit3,
  Lock,
  KeyRound,
  Phone,
  Calendar,
  Award,
  TrendingUp,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  Send,
  Bell,
  BellOff,
  Download,
  Sun,
  Moon,
  Monitor,
  Activity,
  Newspaper,
  Maximize2,
  PanelLeft,
  PanelBottom,
  PanelRight,
  Calculator,
  Plus
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { UserProfile } from '../../types/trading';
import { soundManager } from '../../utils/audio';
import { subscribeToAuth } from '../../services/firebaseAuthService';
import { SubscriptionCountdown } from '../common/SubscriptionCountdown';
import { useTheme } from '../../context/ThemeContext';
import {
  FeatureKey,
  formatExpiryShort,
  getActiveTrialFeatures,
  getEffectiveTier,
  getFeatureLabel
} from '../../utils/entitlements';
import {
  updateOwnUserProfile,
  changeUserPassword,
  sendFirebasePasswordReset,
  getFirebaseAuthErrorMessage,
  getNameChangeAvailability
} from '../../services/firebaseAuthService';
import {
  dispatchMobileAppNotification,
  getNotificationPermissionState,
  isAppNotificationsEnabled,
  requestAppNotificationPermission,
  setAppNotificationsEnabled
} from '../../utils/mobileNotifications';

export type ProfileModalTab = 'overview' | 'settings' | 'edit' | 'password';
export type CompanionDockPosition = 'left' | 'right' | 'bottom' | 'hide';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onLogout: () => void;
  onOpenPromoModal: () => void;
  onOpenPlansModal?: () => void;
  onOpenSupportModal?: () => void;
  onOpenCalculatorModal?: () => void;
  onOpenSessionsModal?: () => void;
  onOpenQuickSignalDrawer?: () => void;
  canPublishQuickSignals?: boolean;
  onNavigateAdmin?: () => void;
  lang?: 'ar' | 'en';
  onToggleLang?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  showPriceTicker?: boolean;
  onTogglePriceTicker?: () => void;
  showNewsBanner?: boolean;
  onToggleNewsBanner?: () => void;
  isAnalysisMode?: boolean;
  onToggleAnalysisMode?: () => void;
  chatPosition?: CompanionDockPosition;
  onSetChatPosition?: (pos: CompanionDockPosition) => void;
  notificationPermission?: string;
  notificationsEnabled?: boolean;
  onToggleNotifications?: () => void;
  initialTab?: ProfileModalTab;
}

const COUNTRIES_LIST = [
  'الإمارات العربية المتحدة (UAE)',
  'المملكة العربية السعودية (KSA)',
  'الكويت (Kuwait)',
  'قطر (Qatar)',
  'البحرين (Bahrain)',
  'سلطنة عمان (Oman)',
  'الأردن (Jordan)',
  'مصر (Egypt)',
  'United States',
  'United Kingdom',
  'Germany',
  'Switzerland',
  'Singapore',
  'Other Country'
];

const ASSET_OPTIONS = [
  { id: 'Indices', labelAr: 'المؤشرات العالمية (Indices)', labelEn: 'Global Indices' },
  { id: 'Forex', labelAr: 'العملات الأجنبية (Forex)', labelEn: 'Forex Pairs' },
  { id: 'Crypto', labelAr: 'العملات الرقمية (Crypto)', labelEn: 'Crypto Assets' },
  { id: 'Commodities', labelAr: 'السلع والمعادن (Gold / Oil)', labelEn: 'Commodities & Metals' }
];

function toIsoDateString(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  return null;
}

export const UserProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onOpenPromoModal,
  onOpenPlansModal,
  onOpenSupportModal,
  onOpenCalculatorModal,
  onOpenSessionsModal,
  onOpenQuickSignalDrawer,
  canPublishQuickSignals = false,
  onNavigateAdmin,
  lang = 'ar',
  onToggleLang,
  isMuted = false,
  onToggleMute,
  showPriceTicker = true,
  onTogglePriceTicker,
  showNewsBanner = true,
  onToggleNewsBanner,
  isAnalysisMode = false,
  onToggleAnalysisMode,
  chatPosition = 'left',
  onSetChatPosition,
  notificationPermission,
  notificationsEnabled,
  onToggleNotifications,
  initialTab = 'overview'
}) => {
  const { themeMode, setThemeMode } = useTheme();
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUser | null>(auth.currentUser);
  const [firestoreUserData, setFirestoreUserData] = useState<{
    email: string;
    displayName?: string;
    role: string;
    tier?: 'free' | 'vip' | 'elite';
    isVip?: boolean;
    vipAccess?: boolean;
    isElite?: boolean;
    eliteExpiryDate?: string | null;
    grantedFeatures?: Partial<Record<FeatureKey, string>>;
    subscriptionStatus?: string;
    subscriptionEndDate?: string | null;
    phone?: string;
    country?: string;
    dob?: string;
    experienceLevel?: string;
    assetClasses?: string[];
    favoritePairs?: string;
    telegramUsername?: string;
    lastNameChangeAt?: string | null;
    createdAt?: any;
  } | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  const [activeTab, setActiveTab] = useState<ProfileModalTab>(initialTab);

  // Edit Profile form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editExperience, setEditExperience] = useState('Intermediate');
  const [editAssets, setEditAssets] = useState<string[]>([]);
  const [editPairs, setEditPairs] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Change Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [sendingResetLink, setSendingResetLink] = useState(false);
  const [notifPerm, setNotifPerm] = useState(() => getNotificationPermissionState());
  const [notifEnabled, setNotifEnabled] = useState(() => isAppNotificationsEnabled());
  const [notifHint, setNotifHint] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (authUser) => {
      setCurrentUserAuth(authUser);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAuth((liveProfile) => {
      if (!liveProfile) return;
      setFirestoreUserData({
        email: liveProfile.email || currentUserAuth?.email || user.email,
        displayName: liveProfile.name || currentUserAuth?.displayName || user.name,
        role: (liveProfile.role || 'free').toLowerCase(),
        tier: liveProfile.tier,
        isVip: Boolean(liveProfile.isVip),
        vipAccess: Boolean(liveProfile.vipAccess || liveProfile.isVip),
        isElite: Boolean(liveProfile.isElite),
        eliteExpiryDate: liveProfile.eliteExpiryDate || null,
        grantedFeatures:
          liveProfile.grantedFeatures && typeof liveProfile.grantedFeatures === 'object'
            ? liveProfile.grantedFeatures
            : {},
        subscriptionStatus: liveProfile.subscriptionStatus,
        subscriptionEndDate:
          liveProfile.subscriptionEndDate || liveProfile.vipExpiryDate || null,
        phone: liveProfile.phone || '',
        country: liveProfile.country || '',
        dob: liveProfile.dob || '',
        experienceLevel: liveProfile.experienceLevel || '',
        assetClasses: Array.isArray(liveProfile.assetClasses) ? liveProfile.assetClasses : [],
        favoritePairs: liveProfile.favoritePairs || '',
        telegramUsername: (liveProfile as any).telegramUsername || '',
        lastNameChangeAt: toIsoDateString((liveProfile as any).lastNameChangeAt)
      });
    });
    return () => unsub();
  }, [isOpen, currentUserAuth, user.email, user.name]);

  const mergedProfile: Partial<UserProfile> = {
    ...user,
    name: firestoreUserData?.displayName || user.name,
    email: firestoreUserData?.email || user.email,
    role: firestoreUserData?.role || user.role,
    tier: firestoreUserData?.tier || user.tier,
    isVip: firestoreUserData?.isVip ?? user.isVip,
    vipAccess: firestoreUserData?.vipAccess ?? user.vipAccess,
    isElite: firestoreUserData?.isElite ?? user.isElite,
    vipExpiryDate: firestoreUserData?.subscriptionEndDate ?? user.vipExpiryDate,
    eliteExpiryDate: firestoreUserData?.eliteExpiryDate ?? user.eliteExpiryDate,
    subscriptionEndDate: firestoreUserData?.subscriptionEndDate ?? user.subscriptionEndDate,
    grantedFeatures: firestoreUserData?.grantedFeatures ?? user.grantedFeatures,
    phone: firestoreUserData?.phone ?? user.phone ?? '',
    country: firestoreUserData?.country ?? user.country ?? '',
    dob: firestoreUserData?.dob ?? user.dob ?? '',
    experienceLevel: firestoreUserData?.experienceLevel ?? user.experienceLevel ?? '',
    assetClasses: firestoreUserData?.assetClasses ?? user.assetClasses ?? [],
    favoritePairs: firestoreUserData?.favoritePairs ?? user.favoritePairs ?? '',
    telegramUsername: firestoreUserData?.telegramUsername ?? user.telegramUsername ?? '',
    lastNameChangeAt: firestoreUserData?.lastNameChangeAt ?? user.lastNameChangeAt ?? null
  };

  useEffect(() => {
    if (!isOpen) {
      setProfileError(null);
      setProfileSuccess(null);
      setPasswordError(null);
      setPasswordSuccess(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      return;
    }

    if (activeTab === 'edit') {
      setEditName(mergedProfile.name || '');
      setEditPhone(mergedProfile.phone || '');
      setEditCountry(mergedProfile.country || COUNTRIES_LIST[0]);
      setEditDob(mergedProfile.dob || '');
      setEditExperience(mergedProfile.experienceLevel || 'Intermediate');
      setEditAssets(Array.isArray(mergedProfile.assetClasses) ? mergedProfile.assetClasses : []);
      setEditPairs(mergedProfile.favoritePairs || '');
      setEditTelegram(mergedProfile.telegramUsername || '');
      setProfileError(null);
      setProfileSuccess(null);
    }

    if (activeTab === 'password') {
      setPasswordError(null);
      setPasswordSuccess(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const rawRole = (mergedProfile.role || 'free').toString().toLowerCase();
  const effectiveTier = getEffectiveTier(mergedProfile);
  const activeTrials = getActiveTrialFeatures(mergedProfile);

  const isAdmin =
    rawRole === 'admin' ||
    user.isAdmin === true ||
    currentUserAuth?.email?.toLowerCase() === 'moe.albzour@gmail.com';
  const isStaff =
    isAdmin ||
    ['moderator', 'sales', 'analyser', 'analyst'].includes(rawRole) ||
    user.isStaff === true;
  const isAnalyser = rawRole === 'analyser' || rawRole === 'analyst';
  const isEliteMember = !isAdmin && effectiveTier === 'elite';
  const isVIP = isAdmin || effectiveTier === 'vip' || effectiveTier === 'elite';
  const isFree = !isVIP && !isAnalyser && !isAdmin;

  const effectiveEndDate =
    effectiveTier === 'elite'
      ? mergedProfile.eliteExpiryDate || mergedProfile.subscriptionEndDate
      : mergedProfile.subscriptionEndDate || mergedProfile.vipExpiryDate;

  const displayNameText = mergedProfile.name || mergedProfile.email?.split('@')[0] || 'Trader';
  const displayEmail = mergedProfile.email || user.email;
  const targetUid = currentUserAuth?.uid || user.uid || user.id || '';

  const nameAvailability = getNameChangeAvailability(mergedProfile.lastNameChangeAt);
  const hasPasswordProvider = Boolean(
    currentUserAuth?.providerData?.some((p) => p.providerId === 'password')
  );

  const effectiveNotifPerm = notificationPermission ?? notifPerm;
  const effectiveNotifEnabled = notificationsEnabled ?? notifEnabled;

  const handleCopyId = () => {
    soundManager.playClick();
    const idToCopy = user.uid || user.id || displayEmail || '';
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleToggleAsset = (assetId: string) => {
    soundManager.playClick();
    setEditAssets((prev) =>
      prev.includes(assetId) ? prev.filter((item) => item !== assetId) : [...prev, assetId]
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!targetUid) {
      setProfileError(isAr ? 'تعذر تحديد معرف الحساب.' : 'Could not identify account UID.');
      return;
    }

    const originalName = (mergedProfile.name || '').trim();
    const proposedName = nameAvailability.canChange ? editName.trim() : originalName;

    if (nameAvailability.canChange && proposedName.length < 2) {
      setProfileError(
        isAr ? 'الاسم يجب أن يتكون من حرفين على الأقل.' : 'Display name must be at least 2 characters.'
      );
      return;
    }

    setSavingProfile(true);
    soundManager.playClick();
    try {
      const result = await updateOwnUserProfile(targetUid, {
        displayName: proposedName,
        phone: editPhone,
        country: editCountry,
        dob: editDob,
        experienceLevel: editExperience,
        assetClasses: editAssets,
        favoritePairs: editPairs,
        telegramUsername: editTelegram
      });

      soundManager.playSuccess();
      setProfileSuccess(
        result.nameChanged
          ? isAr
            ? 'تم تحديث الاسم والمعلومات الشخصية بنجاح. سيتم فتح تغيير الاسم مجدداً بعد 7 أيام.'
            : 'Profile and display name updated. You can change your name again in 7 days.'
          : isAr
          ? 'تم حفظ جميع التعديلات بنجاح.'
          : 'Your personal information has been saved.'
      );
    } catch (err: any) {
      const friendly =
        err?.code && typeof err.code === 'string'
          ? getFirebaseAuthErrorMessage(err)
          : err?.message || (isAr ? 'تعذر تحديث الملف الشخصي.' : 'Failed to update profile.');
      setProfileError(friendly);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError(isAr ? 'يرجى إدخال كلمة المرور الحالية.' : 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(
        isAr ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.' : 'New password must be at least 6 characters.'
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError(
        isAr ? 'كلمة المرور الجديدة وتأكيدها غير متطابقتين.' : 'New password and confirmation do not match.'
      );
      return;
    }

    setSavingPassword(true);
    soundManager.playClick();
    try {
      await changeUserPassword(currentPassword, newPassword);
      soundManager.playSuccess();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSuccess(
        isAr
          ? 'تم تحديث كلمة المرور بنجاح.'
          : 'Password updated successfully.'
      );
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPasswordError(
          isAr ? 'كلمة المرور الحالية غير صحيحة.' : 'The current password you entered is incorrect.'
        );
      } else {
        setPasswordError(code ? getFirebaseAuthErrorMessage(err) : err?.message || 'Failed to update password.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSendPasswordResetLink = async () => {
    if (!displayEmail) return;
    setPasswordError(null);
    setPasswordSuccess(null);
    setSendingResetLink(true);
    soundManager.playClick();
    try {
      await sendFirebasePasswordReset(displayEmail);
      soundManager.playSuccess();
      setPasswordSuccess(
        isAr
          ? `تم إرسال رابط تعيين كلمة المرور إلى ${displayEmail}.`
          : `A password reset link was sent to ${displayEmail}.`
      );
    } catch (err: any) {
      setPasswordError(getFirebaseAuthErrorMessage(err));
    } finally {
      setSendingResetLink(false);
    }
  };

  const handleNotificationToggleClick = async () => {
    if (onToggleNotifications) {
      onToggleNotifications();
      return;
    }
    soundManager.playClick();
    setNotifHint(null);
    const perm = await requestAppNotificationPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      const next = !notifEnabled;
      setAppNotificationsEnabled(next);
      setNotifEnabled(next);
      if (next) {
        soundManager.playSignalPing();
        dispatchMobileAppNotification({
          title: isAr ? 'تم تفعيل إشعارات MBK Trading' : 'MBK Trading Alerts Active',
          body: isAr
            ? 'ستصلك تنبيهات الصفقات والرسائل الخاصة والشات فوراً.'
            : 'You will receive live trade, DM & VIP chat notifications.',
          tag: 'mbk-test-alert'
        }).catch(() => {});
        setNotifHint(isAr ? 'تم تفعيل الإشعارات بنجاح.' : 'Notifications enabled.');
      }
    } else if (perm === 'denied') {
      setNotifHint(
        isAr
          ? 'تم حظر الإشعارات من المتصفح — اسمح بها من إعدادات الموقع.'
          : 'Blocked by browser — allow notifications in site settings.'
      );
    } else if (perm === 'unsupported') {
      setNotifHint(
        isAr
          ? 'أضف التطبيق للشاشة الرئيسية لتفعيل إشعارات الهاتف.'
          : 'Add to Home Screen on iOS to enable web notifications.'
      );
    }
  };

  const nextNameUnlockFormatted = nameAvailability.nextAvailableDate
    ? nameAvailability.nextAvailableDate.toLocaleDateString(isAr ? 'ar-AE' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '';

  const tierTitle = isAdmin
    ? isAr
      ? 'مدير المنصة (Administrator)'
      : 'Administrator'
    : isEliteMember
    ? isAr
      ? 'باقة Elite المؤسسية ($500/mo)'
      : 'Elite Institutional ($500/mo)'
    : isVIP
    ? isAr
      ? 'باقة VIP ($100/mo)'
      : 'VIP Tier ($100/mo)'
    : isAnalyser
    ? isAr
      ? 'محلل معتمد (Analyst)'
      : 'Certified Analyst'
    : isAr
    ? 'الباقة القياسية المجانية'
    : 'Standard Free Tier';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm select-none">
      <div
        className="bg-[#10141c] border border-[#1e2633] rounded-[4px] w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* 1. INSTITUTIONAL ACCOUNT HEADER */}
        <div className="p-4 bg-[#0a0d12] border-b border-[#1e2633] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[3px] bg-[#161c26] border border-[#2a3446] flex items-center justify-center text-white font-mono font-bold text-base shrink-0 overflow-hidden">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayNameText}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{displayNameText ? displayNameText[0].toUpperCase() : 'U'}</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  {displayNameText}
                </h2>
                <span className="text-xs text-[#5e6878]" aria-hidden="true">·</span>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    isAdmin
                      ? 'text-[#e11d48]'
                      : isEliteMember || isVIP
                      ? 'text-[#10b981]'
                      : isAnalyser
                      ? 'text-sky-400'
                      : 'text-[#8b95a5]'
                  }`}
                >
                  {isAdmin
                    ? 'ADMIN'
                    : isEliteMember
                    ? 'ELITE'
                    : isVIP
                    ? 'VIP'
                    : isAnalyser
                    ? 'ANALYST'
                    : 'STANDARD'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#8b95a5] font-mono mt-0.5 flex-wrap">
                <span className="truncate max-w-[180px] sm:max-w-[260px]">{displayEmail}</span>
                <span className="text-[#5e6878]" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title={isAr ? 'نسخ معرف الحساب' : 'Copy Account ID'}
                >
                  {copiedUid ? (
                    <>
                      <Check className="w-3 h-3 text-[#10b981]" />
                      <span className="text-[#10b981]">{isAr ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>ID: {targetUid ? `${targetUid.slice(0, 8)}...` : 'N/A'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-[3px] bg-[#161c26] hover:bg-[#1c2430] border border-[#2a3446] text-[#8b95a5] hover:text-white transition-colors cursor-pointer shrink-0"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. PRIMARY 4-TAB SEGMENTED BAR */}
        <div className="px-4 py-2 bg-[#10141c] border-b border-[#1e2633] grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('overview');
            }}
            className={`py-2 px-3 rounded-[3px] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#161c26] text-white border border-[#2a3446]'
                : 'bg-[#0a0d12] text-[#8b95a5] hover:text-white border border-[#1e2633]'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'الحساب والباقة' : 'Account & Plan'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('settings');
            }}
            className={`py-2 px-3 rounded-[3px] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#161c26] text-white border border-[#2a3446]'
                : 'bg-[#0a0d12] text-[#8b95a5] hover:text-white border border-[#1e2633]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'إعدادات المنصة' : 'App Settings'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('edit');
            }}
            className={`py-2 px-3 rounded-[3px] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'edit'
                ? 'bg-[#161c26] text-white border border-[#2a3446]'
                : 'bg-[#0a0d12] text-[#8b95a5] hover:text-white border border-[#1e2633]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'تعديل البيانات' : 'Edit Profile'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('password');
            }}
            className={`py-2 px-3 rounded-[3px] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'password'
                ? 'bg-[#161c26] text-white border border-[#2a3446]'
                : 'bg-[#0a0d12] text-[#8b95a5] hover:text-white border border-[#1e2633]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'الأمان وكلمة المرور' : 'Security'}</span>
          </button>
        </div>

        {/* 3. MODAL BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 min-h-0">
          {/* ========================================================== */}
          {/* TAB 1: ACCOUNT OVERVIEW, SUBSCRIPTION & DESK UTILITIES */}
          {/* ========================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Staff / Admin Control Bar */}
              {(isStaff || canPublishQuickSignals) && (
                <div className="p-3.5 rounded-[3px] bg-[#0a0d12] border border-[#2a3446] flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Shield className="w-3.5 h-3.5 text-[#10b981]" />
                      <span>
                        {isAdmin
                          ? isAr
                            ? 'صلاحيات الإدارة العليا (Administrator)'
                            : 'Administrator Access'
                          : isAr
                          ? `صلاحيات فريق العمل (${rawRole.toUpperCase()})`
                          : `Staff Operations (${rawRole.toUpperCase()})`}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8b95a5]">
                      {isAr
                        ? 'إدارة الأعضاء، مفاتيح التفعيل، ونشر الصفقات المباشرة.'
                        : 'Manage accounts, activation keys, and live trade signals.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {canPublishQuickSignals && onOpenQuickSignalDrawer && (
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onClose();
                          onOpenQuickSignalDrawer();
                        }}
                        className="px-3 py-1.5 rounded-[3px] bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAr ? 'نشر صفقة سريعة' : 'Publish Trade'}</span>
                      </button>
                    )}

                    {onNavigateAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onClose();
                          onNavigateAdmin();
                        }}
                        className="px-3 py-1.5 rounded-[3px] bg-[#161c26] hover:bg-[#1c2430] border border-[#2a3446] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isAr ? 'لوحة الإدارة' : 'Admin Hub'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Subscription & Membership Ledger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white">
                    {isAr ? 'تفاصيل الاشتراك والصلاحيات' : 'Membership & Entitlements'}
                  </h3>
                  <span className="text-[11px] font-mono text-[#8b95a5] tabular-nums">
                    {tierTitle}
                  </span>
                </div>

                <div className="rounded-[3px] bg-[#0a0d12] border border-[#1e2633] divide-y divide-[#1e2633] text-xs">
                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[#8b95a5]">{isAr ? 'الباقة الحالية' : 'Current Tier'}</span>
                    <span className="font-mono font-semibold text-white">{tierTitle}</span>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[#8b95a5]">{isAr ? 'صلاحية الاشتراك' : 'Subscription Expiry'}</span>
                    <SubscriptionCountdown
                      status={isVIP ? 'active' : user.subscriptionStatus || 'none'}
                      endDate={effectiveEndDate}
                      lang={lang}
                      size="sm"
                    />
                  </div>

                  {user.promoCode && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-[#8b95a5]">{isAr ? 'مفتاح التفعيل المرتبط' : 'Activation Key'}</span>
                      <span className="font-mono font-semibold text-[#10b981] tabular-nums">{user.promoCode}</span>
                    </div>
                  )}

                  {activeTrials.length > 0 && (
                    <div className="px-3.5 py-2.5 space-y-1.5">
                      <span className="text-[11px] text-[#8b95a5] block">
                        {isAr ? 'الوحدات المفعلة لحسابك' : 'Active Granted Features'}
                      </span>
                      <div className="space-y-1">
                        {activeTrials.map((trial) => (
                          <div
                            key={trial.key}
                            className="flex items-center justify-between text-[11px] py-1 px-2.5 rounded-[2px] bg-[#10141c] border border-[#1e2633]"
                          >
                            <span className="text-white font-medium">{getFeatureLabel(trial.key, isAr)}</span>
                            <span className="text-[#10b981] font-mono tabular-nums">
                              {formatExpiryShort(trial.expiryDate, isAr)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-[#10141c] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-[#8b95a5]">
                      {isFree
                        ? isAr
                          ? 'قم بترقية حسابك أو تفعيل مفتاح VIP لفتح الصفقات والمساعد الذكي.'
                          : 'Upgrade or redeem an activation key to unlock VIP signals and AI.'
                        : isAr
                        ? 'إدارة خطة الاشتراك أو تفعيل مفتاح جديد.'
                        : 'Manage subscription plan or redeem a new activation key.'}
                    </span>
                    <div className="flex items-center gap-2">
                      {onOpenPlansModal && (
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            onClose();
                            onOpenPlansModal();
                          }}
                          className="px-3 py-1.5 rounded-[3px] bg-[#161c26] hover:bg-[#1c2430] border border-[#2a3446] text-white font-semibold text-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Crown className="w-3.5 h-3.5 text-[#10b981]" />
                          <span>{isAr ? 'خطط الاشتراك' : 'View Plans'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onClose();
                          onOpenPromoModal();
                        }}
                        className="px-3 py-1.5 rounded-[3px] bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{isAr ? 'تفعيل كود' : 'Redeem Key'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trader Profile Details Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white">
                    {isAr ? 'بيانات المتداول المسجلة' : 'Registered Trader Profile'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setActiveTab('edit');
                    }}
                    className="text-[11px] font-semibold text-[#10b981] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isAr ? 'تعديل البيانات' : 'Edit Details'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#1e2633] border border-[#1e2633] rounded-[3px] overflow-hidden text-xs">
                  <div className="bg-[#0a0d12] px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[#8b95a5]">{isAr ? 'الهاتف' : 'Phone'}</span>
                    <span className="font-mono text-white tabular-nums truncate">
                      {mergedProfile.phone || (isAr ? 'غير محدد' : 'Not set')}
                    </span>
                  </div>
                  <div className="bg-[#0a0d12] px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[#8b95a5]">{isAr ? 'الدولة' : 'Country'}</span>
                    <span className="text-white truncate">
                      {mergedProfile.country || (isAr ? 'غير محدد' : 'Not set')}
                    </span>
                  </div>
                  <div className="bg-[#0a0d12] px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[#8b95a5]">{isAr ? 'مستوى الخبرة' : 'Experience'}</span>
                    <span className="text-white font-medium">
                      {mergedProfile.experienceLevel || 'Intermediate'}
                    </span>
                  </div>
                  <div className="bg-[#0a0d12] px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[#8b95a5]">Telegram</span>
                    <span className="font-mono text-white truncate">
                      {mergedProfile.telegramUsername || (isAr ? 'غير محدد' : 'Not set')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trader Desk Tools & Support */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white">
                  {isAr ? 'أدوات المكتب والدعم الفني' : 'Trader Desk Tools & Support'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {onOpenCalculatorModal && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onClose();
                        onOpenCalculatorModal();
                      }}
                      className="p-3 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] hover:border-[#2a3446] flex items-center gap-2.5 text-white transition-colors cursor-pointer text-start"
                    >
                      <Calculator className="w-4 h-4 text-[#10b981] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{isAr ? 'حاسبة المخاطر' : 'Risk Calculator'}</div>
                        <div className="text-[10px] text-[#8b95a5] truncate">{isAr ? 'حساب اللوت والوقف' : 'Position & Lot Size'}</div>
                      </div>
                    </button>
                  )}

                  {onOpenSessionsModal && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onClose();
                        onOpenSessionsModal();
                      }}
                      className="p-3 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] hover:border-[#2a3446] flex items-center gap-2.5 text-white transition-colors cursor-pointer text-start"
                    >
                      <Clock className="w-4 h-4 text-[#10b981] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{isAr ? 'جلسات السوق' : 'Market Sessions'}</div>
                        <div className="text-[10px] text-[#8b95a5] truncate">{isAr ? 'توقيت البورصات' : 'Global Desk Hours'}</div>
                      </div>
                    </button>
                  )}

                  {onOpenSupportModal && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onClose();
                        onOpenSupportModal();
                      }}
                      className="p-3 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] hover:border-[#2a3446] flex items-center gap-2.5 text-white transition-colors cursor-pointer text-start"
                    >
                      <Headphones className="w-4 h-4 text-[#10b981] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{isAr ? 'الدعم الفني 24/7' : '24/7 Support Desk'}</div>
                        <div className="text-[10px] text-[#8b95a5] truncate">{isAr ? 'تواصل مع الإدارة' : 'Direct Concierge'}</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 2: APP & WORKSPACE SETTINGS (CONSOLIDATED FROM TOP BAR) */}
          {/* ========================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Group 1: Appearance & Language */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white">
                  {isAr ? 'المظهر واللغة' : 'Appearance & Localization'}
                </h3>
                <div className="rounded-[3px] bg-[#0a0d12] border border-[#1e2633] divide-y divide-[#1e2633] text-xs">
                  {/* Theme Mode */}
                  <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">
                        {isAr ? 'سمة المنصة (Theme Mode)' : 'Terminal Theme Mode'}
                      </div>
                      <div className="text-[11px] text-[#8b95a5]">
                        {isAr
                          ? 'اختر المظهر الليلي أو النهاري أو المطابقة التلقائية لنظام جهازك'
                          : 'Switch between Obsidian Dark, Swiss Daylight, or System Auto'}
                      </div>
                    </div>

                    <div className="flex items-center bg-[#10141c] p-0.5 rounded-[3px] border border-[#1e2633]">
                      <button
                        type="button"
                        onClick={() => setThemeMode('auto')}
                        className={`px-2.5 py-1.5 rounded-[2px] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          themeMode === 'auto'
                            ? 'bg-[#161c26] text-white border border-[#2a3446]'
                            : 'text-[#8b95a5] hover:text-white'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>{isAr ? 'تلقائي' : 'Auto'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeMode('dark')}
                        className={`px-2.5 py-1.5 rounded-[2px] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          themeMode === 'dark'
                            ? 'bg-[#161c26] text-white border border-[#2a3446]'
                            : 'text-[#8b95a5] hover:text-white'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>{isAr ? 'ليلي' : 'Dark'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeMode('light')}
                        className={`px-2.5 py-1.5 rounded-[2px] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          themeMode === 'light'
                            ? 'bg-[#161c26] text-white border border-[#2a3446]'
                            : 'text-[#8b95a5] hover:text-white'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>{isAr ? 'نهاري' : 'Light'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Language */}
                  {onToggleLang && (
                    <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">
                          {isAr ? 'لغة واجهة المنصة' : 'Interface Language'}
                        </div>
                        <div className="text-[11px] text-[#8b95a5]">
                          {isAr
                            ? 'التبديل الفوري بين العربية (RTL) والإنجليزية (LTR)'
                            : 'Switch between Arabic (RTL) and English (LTR)'}
                        </div>
                      </div>

                      <div className="flex items-center bg-[#10141c] p-0.5 rounded-[3px] border border-[#1e2633]">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isAr) {
                              soundManager.playClick();
                              onToggleLang();
                            }
                          }}
                          className={`px-3 py-1.5 rounded-[2px] text-[11px] font-semibold transition-colors cursor-pointer ${
                            isAr
                              ? 'bg-[#161c26] text-white border border-[#2a3446]'
                              : 'text-[#8b95a5] hover:text-white'
                          }`}
                        >
                          العربية
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAr) {
                              soundManager.playClick();
                              onToggleLang();
                            }
                          }}
                          className={`px-3 py-1.5 rounded-[2px] text-[11px] font-semibold transition-colors cursor-pointer ${
                            !isAr
                              ? 'bg-[#161c26] text-white border border-[#2a3446]'
                              : 'text-[#8b95a5] hover:text-white'
                          }`}
                        >
                          English
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Group 2: Workspace Layout & Panels */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white">
                  {isAr ? 'تخصيص مساحة العمل واللوحات' : 'Workspace Layout & Panels'}
                </h3>
                <div className="rounded-[3px] bg-[#0a0d12] border border-[#1e2633] divide-y divide-[#1e2633] text-xs">
                  {/* Companion Panel Dock Position */}
                  {onSetChatPosition && (
                    <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">
                          {isAr ? 'موضع اللوحة المساعدة (الإشارات والماسنجر)' : 'Companion Panel Dock Position'}
                        </div>
                        <div className="text-[11px] text-[#8b95a5]">
                          {isAr
                            ? 'تثبيت لوحة الإشارات والشات على اليسار أو الأسفل أو اليمين'
                            : 'Dock the companion signals & messenger panel Left, Bottom, or Right'}
                        </div>
                      </div>

                      <div className="flex items-center bg-[#10141c] p-0.5 rounded-[3px] border border-[#1e2633]">
                        {(
                          [
                            { id: 'left' as const, labelAr: 'يسار', labelEn: 'Left', icon: PanelLeft },
                            { id: 'bottom' as const, labelAr: 'أسفل', labelEn: 'Bottom', icon: PanelBottom },
                            { id: 'right' as const, labelAr: 'يمين', labelEn: 'Right', icon: PanelRight }
                          ]
                        ).map((pos) => {
                          const Icon = pos.icon;
                          const active = chatPosition === pos.id;
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => onSetChatPosition(pos.id)}
                              className={`px-2.5 py-1.5 rounded-[2px] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#161c26] text-white border border-[#2a3446]'
                                  : 'text-[#8b95a5] hover:text-white'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{isAr ? pos.labelAr : pos.labelEn}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Price Ticker Visibility */}
                  {onTogglePriceTicker && (
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Activity className="w-4 h-4 text-[#8b95a5]" />
                        <div>
                          <div className="font-semibold text-white">
                            {isAr ? 'شريط الأسعار المباشر (Price Ticker)' : 'Live Market Price Ticker'}
                          </div>
                          <div className="text-[11px] text-[#8b95a5]">
                            {isAr ? 'إظهار أو إخفاء شريط أسعار المؤشرات والذهب أعلى الشارت' : 'Show or hide the live market price strip'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onTogglePriceTicker}
                        className={`px-3 py-1.5 rounded-[3px] text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          showPriceTicker
                            ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                            : 'bg-[#10141c] border-[#1e2633] text-[#8b95a5] hover:text-white'
                        }`}
                      >
                        {showPriceTicker ? (isAr ? 'ظاهر' : 'Visible') : (isAr ? 'مخفي' : 'Hidden')}
                      </button>
                    </div>
                  )}

                  {/* Financial News Banner Visibility */}
                  {onToggleNewsBanner && (
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Newspaper className="w-4 h-4 text-[#8b95a5]" />
                        <div>
                          <div className="font-semibold text-white">
                            {isAr ? 'شريط الأخبار العاجلة (News Wire)' : 'Breaking Financial News Banner'}
                          </div>
                          <div className="text-[11px] text-[#8b95a5]">
                            {isAr ? 'إظهار أو إخفاء شريط الأخبار الاقتصادية المباشر' : 'Show or hide the live RSS financial news ticker'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onToggleNewsBanner}
                        className={`px-3 py-1.5 rounded-[3px] text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          showNewsBanner
                            ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                            : 'bg-[#10141c] border-[#1e2633] text-[#8b95a5] hover:text-white'
                        }`}
                      >
                        {showNewsBanner ? (isAr ? 'ظاهر' : 'Visible') : (isAr ? 'مخفي' : 'Hidden')}
                      </button>
                    </div>
                  )}

                  {/* Full-Screen Chart Analysis Mode */}
                  {onToggleAnalysisMode && (
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Maximize2 className="w-4 h-4 text-[#8b95a5]" />
                        <div>
                          <div className="font-semibold text-white">
                            {isAr ? 'وضع الشارت الكامل (Full-Screen Chart)' : 'Full-Screen Chart Analysis Mode'}
                          </div>
                          <div className="text-[11px] text-[#8b95a5]">
                            {isAr ? 'توسيع الشارت على كامل الشاشة للتحليل الفني المتقدم' : 'Expand live chart across the entire workspace'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onToggleAnalysisMode();
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-[3px] text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          isAnalysisMode
                            ? 'bg-[#10b981] border-[#10b981] text-white'
                            : 'bg-[#10141c] border-[#1e2633] text-[#8b95a5] hover:text-white'
                        }`}
                      >
                        {isAnalysisMode ? (isAr ? 'مفعل (إيقاف)' : 'Active (Exit)') : (isAr ? 'تفعيل الشارت الكامل' : 'Enable Full Chart')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Group 3: Audio, Notifications & App Installation */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white">
                  {isAr ? 'الصوت والإشعارات والتطبيق' : 'Audio, Notifications & App'}
                </h3>
                <div className="rounded-[3px] bg-[#0a0d12] border border-[#1e2633] divide-y divide-[#1e2633] text-xs">
                  {/* Sound Alerts */}
                  {onToggleMute && (
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {isMuted ? (
                          <VolumeX className="w-4 h-4 text-[#e11d48]" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-[#10b981]" />
                        )}
                        <div>
                          <div className="font-semibold text-white">
                            {isAr ? 'التنبيهات والمؤثرات الصوتية' : 'Audio Chimes & Sound Alerts'}
                          </div>
                          <div className="text-[11px] text-[#8b95a5]">
                            {isAr ? 'صوت التنبيه عند وصول صفقة جديدة أو رسالة' : 'Play audio alert when new signals or messages arrive'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onToggleMute();
                        }}
                        className={`px-3 py-1.5 rounded-[3px] text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          !isMuted
                            ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                            : 'bg-[#e11d48]/15 border-[#e11d48]/40 text-[#e11d48]'
                        }`}
                      >
                        {isMuted ? (isAr ? 'مكتوم (Muted)' : 'Muted') : (isAr ? 'مفعل (Active)' : 'Active')}
                      </button>
                    </div>
                  )}

                  {/* Browser / Mobile Push Notifications */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {effectiveNotifPerm === 'granted' && effectiveNotifEnabled ? (
                        <Bell className="w-4 h-4 text-[#10b981]" />
                      ) : (
                        <BellOff className="w-4 h-4 text-[#8b95a5]" />
                      )}
                      <div>
                        <div className="font-semibold text-white">
                          {isAr ? 'إشعارات المتصفح والهاتف الفورية' : 'Push & Browser Notifications'}
                        </div>
                        <div className="text-[11px] text-[#8b95a5]">
                          {isAr
                            ? 'إشعارات منبثقة للصفقات الجديدة والرسائل الخاصة والشات'
                            : 'Receive OS/browser popup alerts for live signals and DMs'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleNotificationToggleClick}
                      className={`px-3 py-1.5 rounded-[3px] text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                        effectiveNotifPerm === 'granted' && effectiveNotifEnabled
                          ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                          : 'bg-[#10141c] border-[#1e2633] text-[#8b95a5] hover:text-white'
                      }`}
                    >
                      {effectiveNotifPerm === 'granted' && effectiveNotifEnabled
                        ? isAr
                          ? 'مفعل (ON)'
                          : 'Enabled'
                        : effectiveNotifPerm === 'denied'
                        ? isAr
                          ? 'محظور'
                          : 'Blocked'
                        : isAr
                        ? 'تفعيل الإشعارات'
                        : 'Enable Alerts'}
                    </button>
                  </div>

                  {/* Install App Shortcut */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Download className="w-4 h-4 text-[#8b95a5]" />
                      <div>
                        <div className="font-semibold text-white">
                          {isAr ? 'تثبيت تطبيق المنصة (Web App)' : 'Install Desktop / Mobile App'}
                        </div>
                        <div className="text-[11px] text-[#8b95a5]">
                          {isAr
                            ? 'إضافة اختصار MBK Trading مباشرة على الشاشة الرئيسية'
                            : 'Add MBK Trading to your Home Screen or Desktop'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onClose();
                        window.dispatchEvent(new CustomEvent('mbk-open-pwa-install'));
                      }}
                      className="px-3 py-1.5 rounded-[3px] bg-[#161c26] hover:bg-[#1c2430] border border-[#2a3446] text-white text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {isAr ? 'تثبيت التطبيق' : 'Install App'}
                    </button>
                  </div>
                </div>

                {notifHint && (
                  <p className="text-[11px] text-amber-400 px-1 font-medium">{notifHint}</p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 3: EDIT PROFILE (EMAIL IMMUTABLE, NAME 1x/WEEK) */}
          {/* ========================================================== */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 select-text">
              {profileError && (
                <div className="p-3 rounded-[3px] bg-[#e11d48]/10 border border-[#e11d48]/40 text-[#e11d48] text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="p-3 rounded-[3px] bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] text-xs flex items-start gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Immutable Email Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#f1f5f9]">
                      {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <span className="text-[10px] text-[#8b95a5] flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      {isAr ? 'ثابت' : 'Locked'}
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="email"
                      value={displayEmail}
                      readOnly
                      disabled
                      dir="ltr"
                      className="w-full ps-9 pe-3 py-2 rounded-[3px] bg-[#0a0d12]/60 border border-[#1e2633] text-[#8b95a5] text-xs font-mono cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Display Name with 7-Day Cooldown */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-[#f1f5f9]">
                      {isAr ? 'اسم المتداول' : 'Trader Display Name'}
                    </label>
                    {nameAvailability.canChange ? (
                      <span className="text-[10px] text-[#10b981] font-mono">
                        {isAr ? 'متاح (1x / 7d)' : 'Editable (1x/7d)'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isAr ? `${nameAvailability.remainingDays} يوم` : `${nameAvailability.remainingDays}d left`}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={!nameAvailability.canChange}
                      maxLength={100}
                      placeholder={isAr ? 'أدخل اسمك' : 'Enter your name'}
                      className={`w-full ps-9 pe-3 py-2 rounded-[3px] border text-xs outline-none transition-colors ${
                        nameAvailability.canChange
                          ? 'bg-[#0a0d12] border-[#1e2633] focus:border-[#10b981] text-white'
                          : 'bg-[#0a0d12]/60 border-[#1e2633] text-[#8b95a5] cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {!nameAvailability.canChange && (
                <p className="text-[11px] text-amber-400/90 leading-relaxed">
                  {isAr
                    ? `يمكن تغيير الاسم مرة واحدة كل 7 أيام (متاح مجدداً في ${nextNameUnlockFormatted}).`
                    : `Display name can be updated once every 7 days (next available: ${nextNameUnlockFormatted}).`}
                </p>
              )}

              {/* Phone & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#f1f5f9]">
                    {isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      maxLength={40}
                      dir="ltr"
                      placeholder="+971 50 000 0000"
                      className="w-full ps-9 pe-3 py-2 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] focus:border-[#10b981] text-white text-xs font-mono outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#f1f5f9]">
                    {isAr ? 'الدولة' : 'Country'}
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <select
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="w-full ps-9 pe-3 py-2 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] focus:border-[#10b981] text-white text-xs outline-none transition-colors"
                    >
                      {editCountry && !COUNTRIES_LIST.includes(editCountry) && (
                        <option value={editCountry}>{editCountry}</option>
                      )}
                      {COUNTRIES_LIST.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Date of Birth & Experience Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#f1f5f9]">
                    {isAr ? 'تاريخ الميلاد' : 'Date of Birth'}
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="date"
                      value={editDob}
                      onChange={(e) => setEditDob(e.target.value)}
                      dir="ltr"
                      className="w-full ps-9 pe-3 py-2 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] focus:border-[#10b981] text-white text-xs outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#f1f5f9]">
                    {isAr ? 'مستوى الخبرة' : 'Trading Experience'}
                  </label>
                  <div className="relative">
                    <Award className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <select
                      value={editExperience}
                      onChange={(e) => setEditExperience(e.target.value)}
                      className="w-full ps-9 pe-3 py-2 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] focus:border-[#10b981] text-white text-xs outline-none transition-colors"
                    >
                      <option value="Beginner">{isAr ? 'مبتدئ (Beginner)' : 'Beginner'}</option>
                      <option value="Intermediate">{isAr ? 'متوسط (Intermediate)' : 'Intermediate'}</option>
                      <option value="Advanced">{isAr ? 'متقدم (Advanced)' : 'Advanced'}</option>
                      <option value="Institutional">{isAr ? 'مؤسسي (Institutional)' : 'Institutional'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Telegram Username & Favorite Pairs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#f1f5f9]">
                    {isAr ? 'معرف تيليجرام' : 'Telegram Username'}
                  </label>
                  <div className="relative">
                    <Send className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="text"
                      value={editTelegram}
                      onChange={(e) => setEditTelegram(e.target.value)}
                      maxLength={80}
                      dir="ltr"
                      placeholder="@username"
                      className="w-full ps-9 pe-3 py-2 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] focus:border-[#10b981] text-white text-xs font-mono outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#f1f5f9]">
                    {isAr ? 'الأزواج المفضلة' : 'Favorite Pairs / Markets'}
                  </label>
                  <div className="relative">
                    <TrendingUp className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="text"
                      value={editPairs}
                      onChange={(e) => setEditPairs(e.target.value)}
                      maxLength={200}
                      dir="ltr"
                      placeholder="US100, XAUUSD, BTCUSD"
                      className="w-full ps-9 pe-3 py-2 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] focus:border-[#10b981] text-white text-xs font-mono outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Asset Classes */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#f1f5f9] block">
                  {isAr ? 'فئات الأصول المفضلة' : 'Preferred Asset Classes'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ASSET_OPTIONS.map((asset) => {
                    const checked = editAssets.includes(asset.id);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleToggleAsset(asset.id)}
                        className={`px-3 py-2 rounded-[3px] border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          checked
                            ? 'bg-[#10b981]/15 border-[#10b981] text-white'
                            : 'bg-[#0a0d12] border-[#1e2633] text-[#8b95a5] hover:text-white'
                        }`}
                      >
                        <span>{isAr ? asset.labelAr : asset.labelEn}</span>
                        {checked && <Check className="w-3.5 h-3.5 text-[#10b981] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2.5 rounded-[3px] bg-[#10b981] hover:bg-[#059669] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {savingProfile ? (
                  <span>{isAr ? 'جاري حفظ التغييرات...' : 'Saving changes...'}</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isAr ? 'حفظ التعديلات' : 'Save Profile Changes'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================== */}
          {/* TAB 4: CHANGE PASSWORD & SECURITY */}
          {/* ========================================================== */}
          {activeTab === 'password' && (
            <div className="space-y-4 select-text">
              {passwordError && (
                <div className="p-3 rounded-[3px] bg-[#e11d48]/10 border border-[#e11d48]/40 text-[#e11d48] text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-[3px] bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] text-xs flex items-start gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {hasPasswordProvider ? (
                <form onSubmit={handleSavePassword} className="space-y-3.5">
                  <div className="p-3 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] text-[11px] text-[#8b95a5] leading-relaxed">
                    {isAr
                      ? 'أدخل كلمة المرور الحالية ثم اختر كلمة مرور جديدة مكونة من 6 أحرف أو أرقام على الأقل.'
                      : 'Verify your current password before setting a new password (minimum 6 characters).'}
                  </div>

                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#f1f5f9]">
                      {isAr ? 'كلمة المرور الحالية' : 'Current Password'}
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        dir="ltr"
                        placeholder="••••••••"
                        className="w-full ps-9 pe-10 py-2 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] focus:border-[#10b981] text-white text-xs outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        className="absolute top-1/2 -translate-y-1/2 end-3 text-[#8b95a5] hover:text-white cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#f1f5f9]">
                      {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                    </label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        dir="ltr"
                        placeholder="••••••••"
                        className="w-full ps-9 pe-10 py-2 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] focus:border-[#10b981] text-white text-xs outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute top-1/2 -translate-y-1/2 end-3 text-[#8b95a5] hover:text-white cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#f1f5f9]">
                      {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                    </label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-[#5e6878] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        autoComplete="new-password"
                        dir="ltr"
                        placeholder="••••••••"
                        className="w-full ps-9 pe-3 py-2 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] focus:border-[#10b981] text-white text-xs outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="w-full py-2.5 rounded-[3px] bg-[#10b981] hover:bg-[#059669] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {savingPassword
                        ? isAr
                          ? 'جاري تحديث كلمة المرور...'
                          : 'Updating Password...'
                        : isAr
                        ? 'تحديث كلمة المرور'
                        : 'Update Password'}
                    </span>
                  </button>

                  <div className="pt-2 border-t border-[#1e2633] flex items-center justify-between text-[11px] text-[#8b95a5]">
                    <span>{isAr ? 'نسيت كلمة المرور الحالية؟' : 'Forgot your current password?'}</span>
                    <button
                      type="button"
                      disabled={sendingResetLink}
                      onClick={handleSendPasswordResetLink}
                      className="text-[#10b981] hover:underline font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {sendingResetLink
                        ? isAr
                          ? 'جاري الإرسال...'
                          : 'Sending...'
                        : isAr
                        ? 'إرسال رابط إعادة تعيين بالبريد'
                        : 'Send Reset Email'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-[3px] bg-[#0a0d12] border border-[#1e2633] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Shield className="w-4 h-4 text-[#10b981]" />
                    <span>{isAr ? 'حساب مرتبط عبر Google' : 'Google-Linked Account'}</span>
                  </div>
                  <p className="text-xs text-[#8b95a5] leading-relaxed">
                    {isAr
                      ? `أنت مسجل الدخول حالياً عبر Google (${displayEmail}). يمكنك إرسال رابط آمن إلى بريدك الإلكتروني لإضافة كلمة مرور خاصة بالدخول المباشر.`
                      : `You currently sign in using Google (${displayEmail}). Send a secure link to your email to configure a direct password.`}
                  </p>
                  <button
                    type="button"
                    disabled={sendingResetLink}
                    onClick={handleSendPasswordResetLink}
                    className="w-full py-2.5 rounded-[3px] bg-[#10b981] hover:bg-[#059669] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>
                      {sendingResetLink
                        ? isAr
                          ? 'جاري إرسال الرابط...'
                          : 'Sending Link...'
                        : isAr
                        ? 'إرسال رابط تعيين كلمة المرور'
                        : 'Send Password Setup Email'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. INSTITUTIONAL FOOTER */}
        <div className="px-4 py-3 bg-[#0a0d12] border-t border-[#1e2633] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onLogout();
            }}
            className="px-3 py-1.5 rounded-[3px] bg-[#e11d48]/12 hover:bg-[#e11d48]/20 text-[#e11d48] border border-[#e11d48]/30 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-[3px] bg-[#161c26] hover:bg-[#1c2430] border border-[#2a3446] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
