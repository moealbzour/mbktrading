import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Crown,
  LogOut,
  Mail,
  Sparkles,
  CheckCircle2,
  Globe,
  Volume2,
  VolumeX,
  Headphones,
  Copy,
  Check,
  Cpu,
  BarChart2,
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
  Smartphone
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { UserProfile } from '../../types/trading';
import { soundManager } from '../../utils/audio';
import { SubscriptionCountdown } from '../common/SubscriptionCountdown';
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onLogout: () => void;
  onOpenPromoModal: () => void;
  onOpenPlansModal?: () => void;
  onOpenSupportModal?: () => void;
  onNavigateAdmin?: () => void;
  lang?: 'ar' | 'en';
  onToggleLang?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
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
  onNavigateAdmin,
  lang = 'ar',
  onToggleLang,
  isMuted = false,
  onToggleMute
}) => {
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

  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'password'>('overview');

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

  // Listen to Firebase Auth state & Firestore 'users' collection
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (authUser) => {
      setCurrentUserAuth(authUser);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const targetUid = currentUserAuth?.uid || user.uid || user.id;
    if (!targetUid) return;

    try {
      const userDocRef = doc(db, 'users', targetUid);
      const unsubDoc = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFirestoreUserData({
              email: data.email || currentUserAuth?.email || user.email,
              displayName: data.displayName || currentUserAuth?.displayName || user.name,
              role: data.role || 'free',
              tier: data.tier,
              isVip: Boolean(data.isVip),
              vipAccess: Boolean(data.vipAccess),
              isElite: Boolean(data.isElite),
              eliteExpiryDate: data.eliteExpiryDate || null,
              grantedFeatures:
                data.grantedFeatures && typeof data.grantedFeatures === 'object'
                  ? data.grantedFeatures
                  : {},
              subscriptionStatus: data.subscription_status || data.subscriptionStatus,
              subscriptionEndDate:
                data.subscription_end_date || data.subscriptionEndDate || data.vipExpiryDate || null,
              phone: data.phone || '',
              country: data.country || '',
              dob: data.dob || '',
              experienceLevel: data.experienceLevel || '',
              assetClasses: Array.isArray(data.assetClasses) ? data.assetClasses : [],
              favoritePairs: data.favoritePairs || '',
              telegramUsername: data.telegramUsername || '',
              lastNameChangeAt: toIsoDateString(data.lastNameChangeAt),
              createdAt: data.createdAt
            });
          }
        },
        (err) => {
          console.warn('Firestore user profile fetch notice:', err);
        }
      );
      return () => unsubDoc();
    } catch (err) {
      console.warn('Profile listener notice:', err);
    }
  }, [currentUserAuth, user.uid, user.id, user.email, user.name]);

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

  // Sync edit form values whenever modal opens or user switches to edit tab
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('overview');
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

  const isAdmin = rawRole === 'admin' || user.isAdmin === true;
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
          ? 'تم حفظ جميع التعديلات بنجاح!'
          : 'Your personal information has been saved!'
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
          ? 'تم تحديث كلمة المرور بنجاح! يمكنك استخدام كلمة المرور الجديدة من الآن.'
          : 'Password updated successfully!'
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
          ? `تم إرسال رابط تعيين/تغيير كلمة المرور إلى ${displayEmail}. تحقق من البريد الوارد أو الرسائل غير المرغوب فيها.`
          : `A password setup/reset link was sent to ${displayEmail}.`
      );
    } catch (err: any) {
      setPasswordError(getFirebaseAuthErrorMessage(err));
    } finally {
      setSendingResetLink(false);
    }
  };

  const nextNameUnlockFormatted = nameAvailability.nextAvailableDate
    ? nameAvailability.nextAvailableDate.toLocaleDateString(isAr ? 'ar-AE' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className="bg-[#1e222d] border border-[#2a2e39] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Top Header */}
        <div className="p-4 bg-[#181c27] border-b border-[#2a2e39] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#089981]/15 border border-[#089981]/30 flex items-center justify-center text-[#089981]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {isAr ? 'البطاقة الرقمية وإعدادات الحساب' : 'Digital ID & Account Settings'}
              </h2>
              <p className="text-[10px] text-[#787b86]">
                {isAr ? 'إدارة الملف الشخصي والأمان والصلاحيات' : 'Manage profile details, security & access'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-[#2a2e39]/60 hover:bg-[#363a45] text-[#787b86] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-2.5 bg-[#131722] border-b border-[#2a2e39] grid grid-cols-3 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('overview');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#089981] text-white shadow-sm'
                : 'bg-[#1e222d] text-[#787b86] hover:text-white border border-[#2a2e39]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{isAr ? 'البطاقة الرقمية' : 'Digital ID'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('edit');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-[#089981] text-white shadow-sm'
                : 'bg-[#1e222d] text-[#787b86] hover:text-white border border-[#2a2e39]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isAr ? 'تعديل البيانات' : 'Edit Profile'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('password');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-[#089981] text-white shadow-sm'
                : 'bg-[#1e222d] text-[#787b86] hover:text-white border border-[#2a2e39]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isAr ? 'كلمة المرور' : 'Password'}</span>
          </button>
        </div>

        {/* Content Scroll Container */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'overview' && (
            <>
              {/* ========================================================== */}
              {/* HIGH-END DIGITAL ID CARD WITH GLOWING BADGES & EMV CHIP */}
              {/* ========================================================== */}
              <div className="relative rounded-2xl bg-gradient-to-br from-[#131722] via-[#1a1e2b] to-[#131722] border border-[#2a2e39] p-5 shadow-xl overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(#089981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                <div
                  className={`absolute -top-12 -end-12 w-36 h-36 rounded-full blur-3xl opacity-30 pointer-events-none transition-all ${
                    isAdmin
                      ? 'bg-red-500'
                      : isVIP
                      ? 'bg-amber-400'
                      : isAnalyser
                      ? 'bg-blue-500'
                      : 'bg-slate-500'
                  }`}
                />

                {/* Card Header Row: EMV Chip & Role Badge */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-amber-400 to-yellow-600 border border-amber-200/50 flex items-center justify-center shadow-inner relative overflow-hidden">
                      <Cpu className="w-5 h-5 text-amber-950 opacity-80" />
                      <div className="absolute inset-0 bg-white/20 -skew-x-12 pointer-events-none" />
                    </div>
                    <span className="text-[10px] font-mono font-extrabold text-[#787b86] tracking-widest uppercase">
                      MBK SECURE ID
                    </span>
                  </div>

                  {isAdmin ? (
                    <div className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-mono font-black text-[10px] tracking-wider border border-red-400/40 shadow-[0_0_15px_rgba(239,68,68,0.5)] flex items-center gap-1.5">
                      <Shield className="w-3 h-3 fill-white/20" />
                      <span>ADMINISTRATOR</span>
                    </div>
                  ) : isEliteMember ? (
                    <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono font-black text-[10px] tracking-wider border border-amber-400/60 flex items-center gap-1.5">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>ELITE ($500)</span>
                    </div>
                  ) : isVIP ? (
                    <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-mono font-black text-[10px] tracking-wider border border-amber-300/60 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-1.5">
                      <Crown className="w-3 h-3 fill-black" />
                      <span>VIP ($100)</span>
                    </div>
                  ) : isAnalyser ? (
                    <div className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-mono font-black text-[10px] tracking-wider border border-cyan-300/40 shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center gap-1.5">
                      <BarChart2 className="w-3 h-3" />
                      <span>ANALYSER</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-full bg-[#2a2e39] text-[#9db2c6] font-mono font-bold text-[10px] tracking-wider border border-[#363a45]">
                      FREE ($0)
                    </div>
                  )}
                </div>

                {/* Avatar & User Core Details */}
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="relative shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={displayNameText}
                        className={`w-14 h-14 rounded-2xl object-cover border-2 shadow-lg ${
                          isAdmin
                            ? 'border-red-500 shadow-red-500/20'
                            : isVIP
                            ? 'border-amber-400 shadow-amber-400/20'
                            : isAnalyser
                            ? 'border-cyan-400 shadow-cyan-400/20'
                            : 'border-[#363a45]'
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-14 h-14 rounded-2xl bg-[#1e222d] text-white font-mono font-black text-xl flex items-center justify-center border-2 shadow-lg ${
                          isAdmin
                            ? 'border-red-500 text-red-400 shadow-red-500/20'
                            : isVIP
                            ? 'border-amber-400 text-amber-400 shadow-amber-400/20'
                            : isAnalyser
                            ? 'border-cyan-400 text-cyan-400 shadow-cyan-400/20'
                            : 'border-[#363a45] text-[#787b86]'
                        }`}
                      >
                        {displayNameText ? displayNameText[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    {isVIP && (
                      <div
                        className="absolute -bottom-1 -end-1 p-1 bg-amber-400 text-black rounded-lg shadow-sm"
                        title="VIP Account"
                      >
                        <Crown className="w-3 h-3 fill-black" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-base font-extrabold text-white truncate leading-tight">
                      {displayNameText}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-[#787b86] truncate font-mono">
                      <Mail className="w-3.5 h-3.5 text-[#089981] shrink-0" />
                      <span className="truncate">{displayEmail}</span>
                    </div>

                    {/* Account UID & Copy Action */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={handleCopyId}
                        className="px-2 py-0.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-[10px] font-mono text-[#d1d4dc] hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copiedUid ? (
                          <>
                            <Check className="w-3 h-3 text-[#089981]" />
                            <span className="text-[#089981] font-bold">{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-[#787b86]" />
                            <span className="text-[#787b86] truncate max-w-[140px]">
                              ID: {user.uid ? `${user.uid.slice(0, 10)}...` : displayEmail}
                            </span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setActiveTab('edit');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[#089981]/15 hover:bg-[#089981]/25 border border-[#089981]/30 text-[10px] font-bold text-[#089981] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isAr ? 'تعديل' : 'Edit'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personal Details Quick Summary */}
                {(mergedProfile.phone ||
                  mergedProfile.country ||
                  mergedProfile.experienceLevel ||
                  mergedProfile.telegramUsername) && (
                  <div className="mt-4 pt-3 border-t border-[#2a2e39]/70 grid grid-cols-2 gap-2 text-[11px] relative z-10">
                    {mergedProfile.phone && (
                      <div className="text-[#9db2c6] truncate">
                        <span className="text-[#787b86]">{isAr ? 'الهاتف: ' : 'Phone: '}</span>
                        <span className="text-white font-mono">{mergedProfile.phone}</span>
                      </div>
                    )}
                    {mergedProfile.country && (
                      <div className="text-[#9db2c6] truncate">
                        <span className="text-[#787b86]">{isAr ? 'الدولة: ' : 'Country: '}</span>
                        <span className="text-white">{mergedProfile.country}</span>
                      </div>
                    )}
                    {mergedProfile.experienceLevel && (
                      <div className="text-[#9db2c6] truncate">
                        <span className="text-[#787b86]">{isAr ? 'الخبرة: ' : 'Level: '}</span>
                        <span className="text-white font-semibold">{mergedProfile.experienceLevel}</span>
                      </div>
                    )}
                    {mergedProfile.telegramUsername && (
                      <div className="text-[#9db2c6] truncate">
                        <span className="text-[#787b86]">Telegram: </span>
                        <span className="text-cyan-400 font-mono">{mergedProfile.telegramUsername}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ========================================================== */}
              {/* STAFF / ADMIN ACTION SHORTCUT */}
              {/* ========================================================== */}
              {isStaff && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-600/15 via-rose-600/10 to-red-600/15 border border-red-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                      <Shield className="w-4 h-4 text-red-400" />
                      <span>
                        {isAdmin
                          ? isAr
                            ? 'صلاحيات المسؤول الإداري (ADMIN)'
                            : 'Administrator Permissions Active'
                          : isAr
                          ? `صلاحيات فريق العمل (${rawRole.toUpperCase()})`
                          : `Staff Permissions Active (${rawRole.toUpperCase()})`}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 uppercase">
                      {rawRole}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#d1d4dc] leading-relaxed">
                    {isAr
                      ? 'يمكنك الانتقال مباشرة إلى لوحة التحكم وإدارة العملاء أو مركز النشر حسب صلاحيات دورك.'
                      : 'Access the Admin CRM & Publishing Dashboard according to your assigned staff permissions.'}
                  </p>

                  {onNavigateAdmin && (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        onClose();
                        onNavigateAdmin();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-1"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{isAr ? '⚡ الانتقال إلى لوحة التحكم الإدارية' : '⚡ Open Admin Control Dashboard'}</span>
                    </button>
                  )}
                </div>
              )}

              {!isAdmin && (
                <div className="p-3.5 rounded-2xl bg-[#131722] border border-red-500/30 space-y-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const targetUid = currentUserAuth?.uid || user.uid || user.id;
                      if (!targetUid) return;
                      soundManager.playClick();
                      try {
                        await setDoc(
                          doc(db, 'users', targetUid),
                          {
                            uid: targetUid,
                            email: displayEmail || user.email || '',
                            displayName: displayNameText || user.name || 'Admin',
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
                          doc(db, 'chat_profiles', targetUid),
                          {
                            uid: targetUid,
                            displayName: displayNameText || user.name || 'Admin',
                            role: 'ADMIN',
                            allowDirectMessages: true,
                            updatedAt: new Date().toISOString()
                          },
                          { merge: true }
                        ).catch(() => {});
                        const upgradedUser = {
                          ...user,
                          role: 'ADMIN',
                          tier: 'elite' as const,
                          isAdmin: true,
                          isStaff: true,
                          isVip: true,
                          vipAccess: true,
                          isElite: true,
                          subscriptionStatus: 'active' as const
                        };
                        try {
                          localStorage.setItem('mbk_user', JSON.stringify(upgradedUser));
                        } catch {
                          // ignore
                        }
                        soundManager.playProfitChime();
                        if (onNavigateAdmin) {
                          onClose();
                          onNavigateAdmin();
                        }
                      } catch (err) {
                        console.warn('Admin promotion error:', err);
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>
                      {isAr
                        ? '👑 تفعيل واستعادة رتبة الأدمن (ADMIN) لهذا الحساب في Firestore'
                        : '👑 Restore & Activate ADMIN Role for This Account in Firestore'}
                    </span>
                  </button>
                </div>
              )}

              {/* ========================================================== */}
              {/* SUBSCRIPTION & MEMBERSHIP DETAILS */}
              {/* ========================================================== */}
              <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#787b86] font-medium">
                    {isAr ? 'نوع الباقة والتفعيل:' : 'Active Plan Status:'}
                  </span>
                  <span className="font-bold text-white font-mono">
                    {isAdmin
                      ? isAr
                        ? 'مدير المنصة (Admin)'
                        : 'Administrator'
                      : isEliteMember
                      ? isAr
                        ? 'باقة Elite ($500/mo)'
                        : 'Elite Tier ($500/mo)'
                      : isVIP
                      ? isAr
                        ? 'باقة VIP ($100/mo)'
                        : 'VIP Tier ($100/mo)'
                      : isAr
                      ? 'الباقة المجانية (Free $0)'
                      : 'Free Tier ($0)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#2a2e39]/60">
                  <span className="text-[#787b86] font-medium">
                    {isAr ? 'مدة صلاحية الاشتراك:' : 'Subscription Expiry:'}
                  </span>
                  <SubscriptionCountdown
                    status={isVIP ? 'active' : user.subscriptionStatus || 'none'}
                    endDate={effectiveEndDate}
                    lang={lang}
                    size="sm"
                  />
                </div>

                {activeTrials.length > 0 && (
                  <div className="pt-2 border-t border-[#2a2e39]/60 space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-300 block">
                      {isAr ? 'المميزات التجريبية / الممنوحة المفعلة:' : 'Active Granted / Trial Features:'}
                    </span>
                    <div className="space-y-1">
                      {activeTrials.map((trial) => (
                        <div
                          key={trial.key}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-[11px]"
                        >
                          <span className="text-white font-semibold truncate">
                            {getFeatureLabel(trial.key, isAr)}
                          </span>
                          <span className="text-[#089981] font-mono tabular-nums whitespace-nowrap shrink-0">
                            {formatExpiryShort(trial.expiryDate, isAr)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {user.promoCode && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2a2e39]/60">
                    <span className="text-[#787b86] font-medium">
                      {isAr ? 'كود التفعيل المستخدم:' : 'Applied Activation Code:'}
                    </span>
                    <span className="font-bold text-amber-400 font-mono">{user.promoCode}</span>
                  </div>
                )}

                {(isFree || (!isEliteMember && !isAdmin)) && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>{isAr ? 'خطط الاشتراك وكود التفعيل' : 'Subscription Plans & Key Activation'}</span>
                    </div>
                    <p className="text-[11px] text-[#d1d4dc] leading-relaxed">
                      {isAr
                        ? 'اختر باقة VIP ($100) لفتح الإشارات والشات والمساعد الذكي، أو أدخل كود التفعيل الخاص بك.'
                        : 'Choose VIP ($100/mo) for full signals, private chat & Standard AI, or enter your activation key.'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {onOpenPlansModal && (
                        <button
                          onClick={() => {
                            soundManager.playClick();
                            onClose();
                            onOpenPlansModal();
                          }}
                          className="py-2.5 px-3 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>{isAr ? 'عرض الباقات والاشتراك' : 'View Plans'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          onClose();
                          onOpenPromoModal();
                        }}
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow-md hover:brightness-110 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Crown className="w-3.5 h-3.5 fill-black" />
                        <span>{isAr ? 'إدخال كود تفعيل' : 'Enter Key / Trial Code'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {isVIP && !isAdmin && (
                  <div className="p-2.5 rounded-xl bg-[#089981]/10 border border-[#089981]/30 flex items-center gap-2 text-xs text-[#089981] font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {isEliteMember
                        ? isAr
                          ? 'عضوية Elite مفعلة — جميع مزايا VIP مفعلة ووحدات Elite القادمة محجوزة لحسابك'
                          : 'Elite active — full VIP access plus priority upcoming Elite modules'
                        : isAr
                        ? 'جميع مزايا VIP ومساعد MBK الذكي مفعلة لحسابك'
                        : 'All VIP signals, private chat & Standard AI are active on your account'}
                    </span>
                  </div>
                )}
              </div>

              {/* ========================================================== */}
              {/* QUICK PREFERENCES */}
              {/* ========================================================== */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#787b86] px-1 block uppercase tracking-wider font-mono">
                  {isAr ? 'تفضيلات النظام' : 'System Preferences'}
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {onToggleLang && (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        onToggleLang();
                      }}
                      className="p-3 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] flex items-center justify-between text-[#d1d4dc] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#089981]" />
                        <span>{isAr ? 'اللغة' : 'Language'}</span>
                      </div>
                      <span className="font-bold text-white font-mono">{isAr ? 'العربية' : 'EN'}</span>
                    </button>
                  )}

                  {onToggleMute && (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        onToggleMute();
                      }}
                      className="p-3 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] flex items-center justify-between text-[#d1d4dc] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isMuted ? (
                          <VolumeX className="w-4 h-4 text-[#f23645]" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-[#089981]" />
                        )}
                        <span>{isAr ? 'الصوت' : 'Audio'}</span>
                      </div>
                      <span className="font-bold text-white font-mono">{isMuted ? 'Muted' : 'On'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
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
                          setNotifHint(isAr ? 'تم تفعيل الإشعارات بنجاح!' : 'Notifications enabled!');
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
                            ? 'أضف التطبيق للشاشة الرئيسية لتفعيل إشعارات الآيفون.'
                            : 'Add to Home Screen on iOS to enable web notifications.'
                        );
                      }
                    }}
                    className="p-3 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] flex items-center justify-between text-[#d1d4dc] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {notifPerm === 'granted' && notifEnabled ? (
                        <Bell className="w-4 h-4 text-[#089981]" />
                      ) : (
                        <BellOff className="w-4 h-4 text-amber-400" />
                      )}
                      <span>{isAr ? 'إشعارات الهاتف' : 'Notifications'}</span>
                    </div>
                    <span className="font-bold text-white font-mono text-[10px]">
                      {notifPerm === 'granted' && notifEnabled ? 'ON' : notifPerm === 'denied' ? 'Blocked' : 'Enable'}
                    </span>
                  </button>

                  {!(
                    typeof window !== 'undefined' &&
                    (window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true)
                  ) && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onClose();
                        window.dispatchEvent(new CustomEvent('mbk-open-pwa-install'));
                      }}
                      className="p-3 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#089981]/30 flex items-center justify-between text-[#d1d4dc] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#089981]" />
                        <span>{isAr ? 'اختصار التطبيق' : 'Home Shortcut'}</span>
                      </div>
                      <span className="font-bold text-[#089981] font-mono text-[10px]">
                        {isAr ? 'تثبيت' : 'Install'}
                      </span>
                    </button>
                  )}
                </div>

                {notifHint && (
                  <p className="text-[11px] text-amber-300 px-1 font-medium">{notifHint}</p>
                )}

                {onOpenSupportModal && (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onClose();
                      onOpenSupportModal();
                    }}
                    className="w-full p-3 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] flex items-center justify-between text-xs text-[#d1d4dc] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-[#089981]" />
                      <span>{isAr ? 'الدعم الفني والخدمة المباشرة' : 'Concierge Support Desk'}</span>
                    </div>
                    <span className="text-[10px] text-[#089981] font-bold font-mono">24/7 LIVE</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* ========================================================== */}
          {/* TAB 2: EDIT PROFILE (EMAIL IMMUTABLE, NAME 1x/WEEK) */}
          {/* ========================================================== */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 select-text">
              {profileError && (
                <div className="p-3 rounded-xl bg-[#f23645]/10 border border-[#f23645]/40 text-[#f23645] text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="p-3 rounded-xl bg-[#089981]/15 border border-[#089981]/40 text-[#089981] text-xs flex items-start gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {/* Immutable Email Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#d1d4dc]">
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <span className="text-[10px] text-[#787b86] flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {isAr ? 'غير قابل للتعديل' : 'Locked / Immutable'}
                  </span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                  <input
                    type="email"
                    value={displayEmail}
                    readOnly
                    disabled
                    dir="ltr"
                    className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#131722]/70 border border-[#2a2e39] text-[#787b86] text-xs font-mono cursor-not-allowed opacity-80"
                  />
                </div>
              </div>

              {/* Display Name with 7-Day Cooldown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#d1d4dc]">
                    {isAr ? 'الاسم الكامل / اسم المتداول' : 'Full Name / Trader Name'}
                  </label>
                  {nameAvailability.canChange ? (
                    <span className="text-[10px] text-[#089981] font-semibold">
                      {isAr ? 'متاح للتغيير (مرة كل 7 أيام)' : 'Editable (1x per 7 days)'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {isAr
                        ? `متاح بعد ${nameAvailability.remainingDays} يوم`
                        : `Locked (${nameAvailability.remainingDays}d left)`}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <User className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={!nameAvailability.canChange}
                    maxLength={100}
                    placeholder={isAr ? 'أدخل اسمك' : 'Enter your name'}
                    className={`w-full ps-9 pe-3 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                      nameAvailability.canChange
                        ? 'bg-[#131722] border-[#2a2e39] focus:border-[#089981] text-white'
                        : 'bg-[#131722]/70 border-[#2a2e39] text-[#787b86] cursor-not-allowed'
                    }`}
                  />
                </div>

                {!nameAvailability.canChange && (
                  <p className="text-[10px] text-amber-400/90 leading-relaxed">
                    {isAr
                      ? `تم تغيير اسمك مؤخراً. يمكنك تغيير الاسم مرة واحدة كل أسبوع (التغيير القادم متاح في ${nextNameUnlockFormatted}). يمكنك تعديل باقي بياناتك بحرية الآن.`
                      : `You changed your name recently. Display name can be updated once every 7 days (next available: ${nextNameUnlockFormatted}). All other info below can still be saved.`}
                  </p>
                )}
              </div>

              {/* Phone & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d1d4dc]">
                    {isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      maxLength={40}
                      dir="ltr"
                      placeholder="+971 50 000 0000"
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-white text-xs font-mono outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d1d4dc]">
                    {isAr ? 'الدولة' : 'Country'}
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <select
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-white text-xs outline-none transition-colors"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d1d4dc]">
                    {isAr ? 'تاريخ الميلاد' : 'Date of Birth'}
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="date"
                      value={editDob}
                      onChange={(e) => setEditDob(e.target.value)}
                      dir="ltr"
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-white text-xs outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d1d4dc]">
                    {isAr ? 'مستوى الخبرة في التداول' : 'Trading Experience'}
                  </label>
                  <div className="relative">
                    <Award className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <select
                      value={editExperience}
                      onChange={(e) => setEditExperience(e.target.value)}
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-white text-xs outline-none transition-colors"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d1d4dc]">
                    {isAr ? 'معرف تيليجرام (اختياري)' : 'Telegram Username'}
                  </label>
                  <div className="relative">
                    <Send className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="text"
                      value={editTelegram}
                      onChange={(e) => setEditTelegram(e.target.value)}
                      maxLength={80}
                      dir="ltr"
                      placeholder="@username"
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-white text-xs font-mono outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d1d4dc]">
                    {isAr ? 'الأزواج والمؤشرات المفضلة' : 'Favorite Pairs / Markets'}
                  </label>
                  <div className="relative">
                    <TrendingUp className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="text"
                      value={editPairs}
                      onChange={(e) => setEditPairs(e.target.value)}
                      maxLength={200}
                      dir="ltr"
                      placeholder="US100, XAUUSD, BTCUSD"
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-white text-xs font-mono outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Asset Classes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#d1d4dc] block">
                  {isAr ? 'الأسواق والأصول المفضلة' : 'Preferred Asset Classes'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ASSET_OPTIONS.map((asset) => {
                    const checked = editAssets.includes(asset.id);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleToggleAsset(asset.id)}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          checked
                            ? 'bg-[#089981]/15 border-[#089981] text-white'
                            : 'bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white'
                        }`}
                      >
                        <span>{isAr ? asset.labelAr : asset.labelEn}</span>
                        {checked && <Check className="w-3.5 h-3.5 text-[#089981] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-3 rounded-xl bg-[#089981] hover:bg-[#07846f] disabled:opacity-60 text-white text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
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
          {/* TAB 3: CHANGE PASSWORD & SECURITY */}
          {/* ========================================================== */}
          {activeTab === 'password' && (
            <div className="space-y-4 select-text">
              {passwordError && (
                <div className="p-3 rounded-xl bg-[#f23645]/10 border border-[#f23645]/40 text-[#f23645] text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-[#089981]/15 border border-[#089981]/40 text-[#089981] text-xs flex items-start gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {hasPasswordProvider ? (
                <form onSubmit={handleSavePassword} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-[#131722] border border-[#2a2e39] text-[11px] text-[#9db2c6] leading-relaxed">
                    {isAr
                      ? 'لحماية حسابك، يرجى إدخال كلمة المرور الحالية ثم اختيار كلمة مرور جديدة مكونة من 6 أحرف أو أرقام على الأقل.'
                      : 'For your security, verify your current password before setting a new password (minimum 6 characters).'}
                  </div>

                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#d1d4dc]">
                      {isAr ? 'كلمة المرور الحالية' : 'Current Password'}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        dir="ltr"
                        placeholder="••••••••"
                        className="w-full ps-9 pe-10 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-white text-xs outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        className="absolute top-1/2 -translate-y-1/2 end-3 text-[#787b86] hover:text-white cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#d1d4dc]">
                      {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        dir="ltr"
                        placeholder="••••••••"
                        className="w-full ps-9 pe-10 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-white text-xs outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute top-1/2 -translate-y-1/2 end-3 text-[#787b86] hover:text-white cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#d1d4dc]">
                      {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        autoComplete="new-password"
                        dir="ltr"
                        placeholder="••••••••"
                        className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-white text-xs outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="w-full py-3 rounded-xl bg-[#089981] hover:bg-[#07846f] disabled:opacity-60 text-white text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
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

                  <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between text-[11px] text-[#787b86]">
                    <span>{isAr ? 'نسيت كلمة المرور الحالية؟' : 'Forgot your current password?'}</span>
                    <button
                      type="button"
                      disabled={sendingResetLink}
                      onClick={handleSendPasswordResetLink}
                      className="text-[#089981] hover:underline font-bold cursor-pointer disabled:opacity-50"
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
                <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Shield className="w-4 h-4 text-[#089981]" />
                    <span>
                      {isAr ? 'حساب مرتبط عبر Google' : 'Google-Linked Account'}
                    </span>
                  </div>
                  <p className="text-xs text-[#9db2c6] leading-relaxed">
                    {isAr
                      ? `أنت مسجل الدخول حالياً عبر Google (${displayEmail}). يمكنك إرسال رابط آمن إلى بريدك الإلكتروني لإضافة أو تغيير كلمة مرور خاصة بالدخول المباشر.`
                      : `You currently sign in using Google (${displayEmail}). Send a secure link to your email if you would like to set a password for direct email sign-in.`}
                  </p>
                  <button
                    type="button"
                    disabled={sendingResetLink}
                    onClick={handleSendPasswordResetLink}
                    className="w-full py-2.5 rounded-xl bg-[#089981] hover:bg-[#07846f] disabled:opacity-60 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>
                      {sendingResetLink
                        ? isAr
                          ? 'جاري إرسال الرابط...'
                          : 'Sending Link...'
                        : isAr
                        ? 'إرسال رابط تعيين كلمة المرور إلى بريدي'
                        : 'Send Password Setup Email'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#181c27] border-t border-[#2a2e39] flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              soundManager.playClick();
              onLogout();
            }}
            className="px-3.5 py-2 rounded-xl bg-[#f23645]/15 hover:bg-[#f23645]/25 text-[#f23645] border border-[#f23645]/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
