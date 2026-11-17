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
  Sliders
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
    role: string;
    tier?: 'free' | 'vip' | 'elite';
    isVip?: boolean;
    vipAccess?: boolean;
    isElite?: boolean;
    eliteExpiryDate?: string | null;
    grantedFeatures?: Partial<Record<FeatureKey, string>>;
    subscriptionStatus?: string;
    subscriptionEndDate?: string | null;
    createdAt?: any;
  } | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

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
  }, [currentUserAuth, user.uid, user.id, user.email]);

  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const mergedProfile: Partial<UserProfile> = {
    ...user,
    role: firestoreUserData?.role || user.role,
    tier: firestoreUserData?.tier || user.tier,
    isVip: firestoreUserData?.isVip ?? user.isVip,
    vipAccess: firestoreUserData?.vipAccess ?? user.vipAccess,
    isElite: firestoreUserData?.isElite ?? user.isElite,
    vipExpiryDate: firestoreUserData?.subscriptionEndDate ?? user.vipExpiryDate,
    eliteExpiryDate: firestoreUserData?.eliteExpiryDate ?? user.eliteExpiryDate,
    subscriptionEndDate: firestoreUserData?.subscriptionEndDate ?? user.subscriptionEndDate,
    grantedFeatures: firestoreUserData?.grantedFeatures ?? user.grantedFeatures
  };

  const rawRole = (mergedProfile.role || 'free').toString().toLowerCase();
  const effectiveTier = getEffectiveTier(mergedProfile);
  const activeTrials = getActiveTrialFeatures(mergedProfile);

  const isAdmin = rawRole === 'admin' || user.isAdmin === true;
  const isStaff = isAdmin || ['moderator', 'sales', 'analyser', 'analyst'].includes(rawRole) || user.isStaff === true;
  const isAnalyser = rawRole === 'analyser' || rawRole === 'analyst';
  const isEliteMember = !isAdmin && effectiveTier === 'elite';
  const isVIP = isAdmin || effectiveTier === 'vip' || effectiveTier === 'elite';
  const isFree = !isVIP && !isAnalyser && !isAdmin;

  const effectiveEndDate =
    effectiveTier === 'elite'
      ? mergedProfile.eliteExpiryDate || mergedProfile.subscriptionEndDate
      : mergedProfile.subscriptionEndDate || mergedProfile.vipExpiryDate;

  const handleCopyId = () => {
    soundManager.playClick();
    const idToCopy = user.uid || user.id || user.email || '';
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className="bg-[#1e222d] border border-[#2a2e39] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
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
                {isAr ? 'البطاقة الرقمية ومعلومات الحساب' : 'Digital ID Card & Profile'}
              </h2>
              <p className="text-[10px] text-[#787b86]">
                {isAr ? 'تفاصيل العضوية والصلاحيات في MBK Desk' : 'Verified credentials & system access'}
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

        {/* Content Scroll Container */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* ========================================================== */}
          {/* HIGH-END DIGITAL ID CARD WITH GLOWING BADGES & EMV CHIP */}
          {/* ========================================================== */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#131722] via-[#1a1e2b] to-[#131722] border border-[#2a2e39] p-5 shadow-xl overflow-hidden group">
            {/* Holographic Subtle Circuit Pattern Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#089981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

            {/* Glowing Accent Ring Background */}
            <div className={`absolute -top-12 -end-12 w-36 h-36 rounded-full blur-3xl opacity-30 pointer-events-none transition-all ${
              isAdmin
                ? 'bg-red-500'
                : isVIP
                ? 'bg-amber-400'
                : isAnalyser
                ? 'bg-blue-500'
                : 'bg-slate-500'
            }`} />

            {/* Card Header Row: EMV Chip & Role Badge */}
            <div className="flex items-center justify-between mb-4 relative z-10">
              {/* Metallic EMV Chip Icon */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-amber-400 to-yellow-600 border border-amber-200/50 flex items-center justify-center shadow-inner relative overflow-hidden">
                  <Cpu className="w-5 h-5 text-amber-950 opacity-80" />
                  <div className="absolute inset-0 bg-white/20 -skew-x-12 pointer-events-none" />
                </div>
                <span className="text-[10px] font-mono font-extrabold text-[#787b86] tracking-widest uppercase">
                  MBK SECURE ID
                </span>
              </div>

              {/* Distinct Role / Subscription Tier Badges */}
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
                    alt={user.name}
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
                  <div className={`w-14 h-14 rounded-2xl bg-[#1e222d] text-white font-mono font-black text-xl flex items-center justify-center border-2 shadow-lg ${
                    isAdmin
                      ? 'border-red-500 text-red-400 shadow-red-500/20'
                      : isVIP
                      ? 'border-amber-400 text-amber-400 shadow-amber-400/20'
                      : isAnalyser
                      ? 'border-cyan-400 text-cyan-400 shadow-cyan-400/20'
                      : 'border-[#363a45] text-[#787b86]'
                  }`}>
                    {user.name ? user.name[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                )}
                {isVIP && (
                  <div className="absolute -bottom-1 -end-1 p-1 bg-amber-400 text-black rounded-lg shadow-sm" title="VIP Account">
                    <Crown className="w-3 h-3 fill-black" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-base font-extrabold text-white truncate leading-tight">
                  {user.name || user.email.split('@')[0]}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-[#787b86] truncate font-mono">
                  <Mail className="w-3.5 h-3.5 text-[#089981] shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>

                {/* Account UID & Copy Action */}
                <div className="flex items-center gap-2 pt-1">
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
                          ID: {user.uid ? `${user.uid.slice(0, 10)}...` : user.email}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
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
                      ? (isAr ? 'صلاحيات المسؤول الإداري (ADMIN)' : 'Administrator Permissions Active')
                      : (isAr ? `صلاحيات فريق العمل (${rawRole.toUpperCase()})` : `Staff Permissions Active (${rawRole.toUpperCase()})`)}
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

          {/* ========================================================== */}
          {/* SUBSCRIPTION & MEMBERSHIP DETAILS */}
          {/* ========================================================== */}
          <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#787b86] font-medium">{isAr ? 'نوع الباقة والتفعيل:' : 'Active Plan Status:'}</span>
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
              <span className="text-[#787b86] font-medium">{isAr ? 'مدة صلاحية الاشتراك:' : 'Subscription Expiry:'}</span>
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
                <span className="text-[#787b86] font-medium">{isAr ? 'كود التفعيل المستخدم:' : 'Applied Activation Code:'}</span>
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
              {/* Language Switch */}
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

              {/* Sound Toggle */}
              {onToggleMute && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onToggleMute();
                  }}
                  className="p-3 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] flex items-center justify-between text-[#d1d4dc] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isMuted ? <VolumeX className="w-4 h-4 text-[#f23645]" /> : <Volume2 className="w-4 h-4 text-[#089981]" />}
                    <span>{isAr ? 'الصوت' : 'Audio'}</span>
                  </div>
                  <span className="font-bold text-white font-mono">{isMuted ? 'Muted' : 'On'}</span>
                </button>
              )}
            </div>

            {/* Support Desk Trigger */}
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
