import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  Crown,
  KeyRound,
  LogOut,
  Mail,
  Award,
  Sparkles,
  CheckCircle2,
  Globe,
  Volume2,
  VolumeX,
  Headphones,
  Copy,
  Check
} from 'lucide-react';
import { UserProfile } from '../../types/trading';
import { soundManager } from '../../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onLogout: () => void;
  onOpenPromoModal: () => void;
  onOpenSupportModal?: () => void;
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
  onOpenSupportModal,
  lang = 'ar',
  onToggleLang,
  isMuted = false,
  onToggleMute
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const isVIP = user.role === 'VIP' || user.role === 'ADMIN';
  const isAdmin = user.role === 'ADMIN' || user.isAdmin;
  const [copiedUid, setCopiedUid] = useState(false);

  const handleCopyId = () => {
    soundManager.playClick();
    const idToCopy = user.uid || user.email || 'MBK-USER-9921';
    navigator.clipboard.writeText(idToCopy);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-[#181c27] to-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isAr ? 'الملف الشخصي والحساب' : 'User Profile & Account'}
              </h2>
              <p className="text-[10px] text-[#787b86]">
                {isAr ? 'تفاصيل العضوية والصلاحيات في MBK Desk' : 'Membership details & permissions'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-[#2a2e39]/60 hover:bg-[#363a45] text-[#787b86] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Main User Profile Card */}
          <div className="p-4 rounded-xl bg-[#131722] border border-[#2a2e39] relative overflow-hidden flex items-center gap-3">
            {/* Background Glow */}
            <div className={`absolute end-0 top-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${
              isVIP ? 'bg-amber-500' : 'bg-blue-500'
            }`} />

            {/* User Avatar */}
            <div className="relative shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/40 shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#2a2e39] text-white font-mono font-black text-xl flex items-center justify-center border-2 border-amber-500/30 shadow-md">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
              )}
              {isVIP && (
                <div className="absolute -bottom-1 -end-1 p-1 bg-amber-500 text-black rounded-lg shadow-sm" title="VIP">
                  <Crown className="w-3 h-3 fill-black" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-sm font-bold text-white truncate">
                  {user.name || user.email.split('@')[0]}
                </h3>

                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 shrink-0">
                    <Shield className="w-2.5 h-2.5" />
                    <span>ADMIN</span>
                  </span>
                ) : isVIP ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 shrink-0 font-mono">
                    <Crown className="w-2.5 h-2.5" />
                    <span>VIP MEMBER</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#2a2e39] text-[#787b86] shrink-0 font-mono">
                    STANDARD
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#787b86] truncate">
                <Mail className="w-3 h-3 text-[#089981] shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={handleCopyId}
                  className="text-[10px] text-[#787b86] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedUid ? (
                    <>
                      <Check className="w-3 h-3 text-[#089981]" />
                      <span className="text-[#089981] font-bold">{isAr ? 'تم نسخ المعرف' : 'Copied ID'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{isAr ? 'نسخ معرف الحساب' : 'Copy User ID'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Subscription / Plan Details */}
          <div className="p-3.5 rounded-xl bg-[#131722] border border-[#2a2e39] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#787b86] font-medium">{isAr ? 'خطة العضوية الحالية:' : 'Current Plan:'}</span>
              <span className="font-bold text-white font-mono">{user.planName || (isVIP ? 'عضوية VIP غير محدودة' : 'الباقة المجانية')}</span>
            </div>

            {user.promoCode && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2a2e39]/60">
                <span className="text-[#787b86] font-medium">{isAr ? 'كود التفعيل المستخدم:' : 'Activated Promo:'}</span>
                <span className="font-bold text-amber-400 font-mono">{user.promoCode}</span>
              </div>
            )}

            {!isVIP ? (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>{isAr ? 'ترقية العضوية إلى VIP' : 'Upgrade to VIP Access'}</span>
                </div>
                <p className="text-[11px] text-[#d1d4dc] leading-relaxed">
                  {isAr
                    ? 'افتح صفقات البوت الفورية، وشاهد أسعار الدخول والأهداف المحجوبة مباشرة على الشارت.'
                    : 'Unlock live bot signals, precise entry prices, stop loss levels & real-time notifications.'}
                </p>
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onClose();
                    onOpenPromoModal();
                  }}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs shadow-md hover:brightness-110 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تفعيل كود VIP أو الاشتراك' : 'Enter VIP Promo / Subscribe'}</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-[#089981]/10 border border-[#089981]/30 flex items-center gap-2 text-xs text-[#089981] font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{isAr ? 'جميع مزايا وبوتات MBK مفعلة بالكامل لحسابك' : 'All MBK signals & features are active'}</span>
              </div>
            )}
          </div>

          {/* Quick Preferences */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#787b86] px-1 block">
              {isAr ? 'إعدادات سريعة' : 'Quick Preferences'}
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Language Switch */}
              {onToggleLang && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onToggleLang();
                  }}
                  className="p-2.5 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] flex items-center justify-between text-[#d1d4dc] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
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
                  className="p-2.5 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] flex items-center justify-between text-[#d1d4dc] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {isMuted ? <VolumeX className="w-4 h-4 text-[#f23645]" /> : <Volume2 className="w-4 h-4 text-[#089981]" />}
                    <span>{isAr ? 'الصوت' : 'Audio'}</span>
                  </div>
                  <span className="font-bold text-white font-mono">{isMuted ? 'Muted' : 'On'}</span>
                </button>
              )}
            </div>

            {/* Support button */}
            {onOpenSupportModal && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenSupportModal();
                }}
                className="w-full p-2.5 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] flex items-center justify-between text-xs text-[#d1d4dc] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-[#089981]" />
                  <span>{isAr ? 'الدعم الفني والخدمة المباشرة' : 'Concierge Desk & Support'}</span>
                </div>
                <span className="text-[10px] text-[#089981] font-bold">24/7</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#181c27] border-t border-[#2a2e39] flex items-center justify-between">
          <button
            onClick={() => {
              soundManager.playClick();
              onLogout();
            }}
            className="px-3 py-2 rounded-xl bg-[#f23645]/15 hover:bg-[#f23645]/25 text-[#f23645] border border-[#f23645]/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
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
