import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types/trading';
import {
  Lock,
  Mail,
  User,
  Ticket,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Send,
  Sparkles,
  Crown
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  getFirebaseAuthErrorMessage
} from '../services/firebaseAuthService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  initialPromoCode?: string;
  onLoginSuccess: (user: UserProfile) => void;
  lang?: 'ar' | 'en';
}

export const AuthGateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultTab = 'signup',
  initialPromoCode = '',
  onLoginSuccess,
  lang = 'ar'
}) => {
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [promoCode, setPromoCode] = useState(initialPromoCode);
  const [showInviteCodeField, setShowInviteCodeField] = useState(Boolean(initialPromoCode));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAr = lang === 'ar';

  useEffect(() => {
    setTab(defaultTab);
    if (initialPromoCode) {
      setPromoCode(initialPromoCode);
      setShowInviteCodeField(true);
    }
    setErrorMessage(null);
  }, [defaultTab, initialPromoCode, isOpen]);

  if (!isOpen) return null;

  const handleQuickRoleLogin = async (username: string, pass: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass })
      });

      const data = await res.json();
      if (res.ok && data.user) {
        if (data.token) {
          localStorage.setItem('mbk_jwt_token', data.token);
        }
        const loggedUser: UserProfile = {
          uid: data.user.id || data.user.uid,
          name: data.user.name || data.user.displayName || username,
          email: data.user.email || `${username}@mbktrading.live`,
          role: data.user.role,
          isAdmin: data.user.role === 'ADMIN',
          planName: data.user.role === 'ADMIN' ? 'مدير المنصة (Administrator)' : data.user.role === 'VIP' ? 'عضوية VIP المفعلة' : 'الحساب المجاني (Standard)',
          avatar: data.user.avatar,
          unlockedTraders: ['mbk_master']
        };

        localStorage.setItem('mbk_user', JSON.stringify(loggedUser));
        soundManager.playProfitChime();
        if (loggedUser.role === 'VIP' || loggedUser.role === 'ADMIN') {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        }
        onLoginSuccess(loggedUser);
        onClose();
        return;
      } else {
        throw new Error(data.error || 'Failed to authenticate');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error logging in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const cleanTelegram = telegramUsername.trim()
        ? telegramUsername.startsWith('@')
          ? telegramUsername.trim()
          : `@${telegramUsername.trim()}`
        : '';

      // 1. Try SQLite Database Endpoint First
      const sqliteEndpoint = tab === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const sqlitePayload = tab === 'signup'
        ? {
            username: email.split('@')[0] || fullName.replace(/\s+/g, '').toLowerCase(),
            email: email.trim(),
            password,
            displayName: fullName.trim() || email.split('@')[0],
            role: promoCode ? 'VIP' : 'STANDARD'
          }
        : {
            username: email.trim(),
            password
          };

      try {
        const sqRes = await fetch(sqliteEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sqlitePayload)
        });

        if (sqRes.ok) {
          const sqData = await sqRes.json();
          if (sqData.token) {
            localStorage.setItem('mbk_jwt_token', sqData.token);
          }
          if (sqData.user) {
            const sqUser: UserProfile = {
              uid: sqData.user.id || sqData.user.uid,
              name: sqData.user.name || sqData.user.displayName || fullName || email.split('@')[0],
              email: sqData.user.email || email,
              role: sqData.user.role,
              isAdmin: sqData.user.role === 'ADMIN',
              planName: sqData.user.role === 'ADMIN' ? 'مدير المنصة (Admin)' : sqData.user.role === 'VIP' ? 'عضوية VIP' : 'الحساب المجاني (Standard)',
              avatar: sqData.user.avatar,
              telegramUsername: cleanTelegram,
              unlockedTraders: ['mbk_master']
            };

            localStorage.setItem('mbk_user', JSON.stringify(sqUser));
            soundManager.playProfitChime();
            if (sqUser.role === 'VIP' || sqUser.role === 'ADMIN') {
              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            }
            onLoginSuccess(sqUser);
            onClose();
            return;
          }
        }
      } catch (sqErr) {
        console.warn('SQLite auth endpoint attempt:', sqErr);
      }

      // 2. Fallback to Firebase Auth
      let user: UserProfile;
      if (tab === 'signup') {
        if (!fullName.trim()) {
          throw new Error(isAr ? 'يرجى كتابة الاسم الكامل.' : 'Please enter your full name.');
        }
        if (password.length < 6) {
          throw new Error(isAr ? 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.' : 'Password must be at least 6 characters.');
        }
        user = await signUpWithEmail(email, password, fullName, promoCode);
        user.telegramUsername = cleanTelegram;
      } else {
        user = await signInWithEmail(email, password, promoCode);
        if (cleanTelegram) {
          user.telegramUsername = cleanTelegram;
        }
      }

      // Ensure local storage has user info
      const fullUser: UserProfile = {
        ...user,
        telegramUsername: cleanTelegram || user.telegramUsername,
        unlockedTraders: user.unlockedTraders || ['mbk_master']
      };

      soundManager.playProfitChime();

      if (fullUser.role === 'VIP') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onLoginSuccess(fullUser);
      onClose();
    } catch (err: any) {
      console.warn('Auth notice:', err?.code || err?.message);
      soundManager.playClick();
      setErrorMessage(getFirebaseAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const user = await signInWithGoogle(promoCode);
      soundManager.playProfitChime();
      if (user.role === 'VIP') {
        confetti({ particleCount: 70, spread: 60 });
      }
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      console.warn('Google Auth notice:', err);
      soundManager.playClick();
      setErrorMessage(getFirebaseAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-md bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 sm:p-7 shadow-2xl text-[#d1d4dc] my-auto max-h-[92dvh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 rtl:left-auto rtl:right-4 p-2 text-[#787b86] hover:text-white rounded-lg hover:bg-[#2a2e39] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2a2e39] border border-[#363a45] mb-3">
            <span className="font-mono font-bold text-base text-white tracking-wider">MBK</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
            {tab === 'signup'
              ? isAr ? 'إنشاء حساب متداول جديد' : 'Create Trader Account'
              : isAr ? 'تسجيل الدخول إلى MBK Desk' : 'Sign In to MBK Desk'}
          </h2>
          <p className="text-xs text-[#787b86]">
            {tab === 'signup'
              ? isAr ? 'سجّل الآن للوصول الفوري إلى الإشارات، المحللين، وغرفة الأسواق' : 'Register now for instant access to signals, analysts & live desk'
              : isAr ? 'أهلاً بعودتك، أدخل بياناتك لمتابعة محفظتك وإشاراتك' : 'Welcome back, enter your credentials to resume trading'}
          </p>
        </div>

        {/* Tabs Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#131722] rounded-xl border border-[#2a2e39] mb-5">
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMessage(null);
              soundManager.playClick();
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === 'signup'
                ? 'bg-white text-[#131722] shadow-sm font-bold'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            {isAr ? 'إنشاء حساب جديد' : 'Create Account'}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
              soundManager.playClick();
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-[#131722] shadow-sm font-bold'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            {isAr ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-[#f23645]/10 border border-[#f23645]/30 rounded-xl text-xs text-[#f23645] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name (Sign Up only) */}
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#787b86] mb-1">
                {isAr ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute top-3 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-[#787b86]" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isAr ? 'مثال: محمد العمري' : 'e.g. John Doe'}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-9 py-2.5 text-xs text-white placeholder-[#787b86]/70 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-[#787b86] mb-1">
              {isAr ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="absolute top-3 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-[#787b86]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-9 py-2.5 text-xs text-white placeholder-[#787b86]/70 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Telegram Username (Sign Up) */}
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#787b86] mb-1 flex items-center justify-between">
                <span>{isAr ? 'معرف تيليجرام (اختياري للإشعارات الفورية)' : 'Telegram Username (Optional)'}</span>
                <span className="text-[10px] text-[#089981]">@username</span>
              </label>
              <div className="relative">
                <Send className="absolute top-3 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-[#787b86]" />
                <input
                  type="text"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="@trader_mbk"
                  dir="ltr"
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-9 py-2.5 text-xs text-white placeholder-[#787b86]/70 focus:outline-none focus:border-white transition-colors text-left"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-[#787b86] mb-1">
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute top-3 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-[#787b86]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-9 py-2.5 text-xs text-white placeholder-[#787b86]/70 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Invite / Promo Code Section */}
          {tab === 'login' ? (
            <div>
              {!showInviteCodeField ? (
                <button
                  type="button"
                  onClick={() => setShowInviteCodeField(true)}
                  className="text-[11px] text-[#089981] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>{isAr ? 'الدخول برمز دعوة VIP أو كود المحلل الخاص' : 'Enter VIP or Trader Invite Code'}</span>
                </button>
              ) : (
                <div className="pt-1">
                  <label className="block text-xs font-medium text-[#089981] mb-1 flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>{isAr ? 'رمز دعوة VIP أو كود المحلل' : 'VIP or Trader Invite Code'}</span>
                  </label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. VIP2026 or TRADER-CODE"
                    className="w-full bg-[#131722] border border-[#089981]/40 rounded-xl px-3 py-2 text-xs font-mono text-[#089981] placeholder-[#787b86]/70 uppercase focus:outline-none focus:border-[#089981] transition-colors"
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[#787b86] mb-1 flex items-center justify-between">
                <span>{isAr ? 'رمز دعوة VIP أو كود المحلل (اختياري)' : 'VIP / Trader Invite Code (Optional)'}</span>
                <span className="text-[10px] text-[#089981]">ترقية فورية</span>
              </label>
              <div className="relative">
                <Ticket className="absolute top-3 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-[#787b86]" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. VIP2026 / MBK2026"
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-9 py-2.5 text-xs font-mono text-white placeholder-[#787b86]/70 uppercase focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#131722]" />
            ) : (
              <>
                <span>
                  {tab === 'signup'
                    ? isAr ? 'إتمام التسجيل والدخول إلى Desk ↗' : 'Complete Registration & Launch Desk ↗'
                    : isAr ? 'تسجيل الدخول إلى Desk ↗' : 'Sign In to Desk ↗'}
                </span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2a2e39]"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-[#1e222d] px-2 text-[#787b86]">
              {isAr ? 'أو المتابعة عبر' : 'or continue with'}
            </span>
          </div>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] hover:border-[#363a45] text-xs font-semibold text-white transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isAr ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
        </button>

        {/* Quick Instant Role Logins for SQLite & RBAC Testing */}
        <div className="mt-3 pt-3 border-t border-[#2a2e39] space-y-1.5">
          <span className="text-[10px] text-[#787b86] font-mono block text-center uppercase tracking-wider">
            {isAr ? 'تجربة سريعة لرتب SQLite (RBAC)' : 'Quick Test Roles (SQLite Database)'}
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('admin', 'admin123')}
              className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="admin / admin123"
            >
              <Crown className="w-2.5 h-2.5" />
              <span>Admin 👑</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('vip_trader', 'vip123')}
              className="p-1.5 rounded-lg bg-[#089981]/15 hover:bg-[#089981]/25 border border-[#089981]/30 text-[#089981] text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="vip_trader / vip123"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>VIP 💎</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('trader', 'trader123')}
              className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#d1d4dc] text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="trader / trader123"
            >
              <User className="w-2.5 h-2.5" />
              <span>Standard</span>
            </button>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-5 pt-3 border-t border-[#2a2e39] flex items-center justify-center gap-1.5 text-[11px] text-[#787b86]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#089981]" />
          <span>{isAr ? 'تشفير آمن 256-bit • خصوصية تامة للبيانات والتداولات' : '256-bit encrypted • Complete privacy for data & trades'}</span>
        </div>
      </div>
    </div>
  );
};
