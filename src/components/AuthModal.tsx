import React, { useState } from 'react';
import { UserProfile } from '../types/trading';
import {
  Lock,
  Mail,
  User,
  Ticket,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Loader2
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
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultTab = 'signup',
  initialPromoCode = '',
  onLoginSuccess
}) => {
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [promoCode, setPromoCode] = useState(initialPromoCode);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setTab(defaultTab);
    if (initialPromoCode) {
      setPromoCode(initialPromoCode);
    }
    setErrorMessage(null);
  }, [defaultTab, initialPromoCode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      let user: UserProfile;
      if (tab === 'signup') {
        user = await signUpWithEmail(email, password, fullName, promoCode);
      } else {
        user = await signInWithEmail(email, password, promoCode);
      }

      soundManager.playProfitChime();

      if (user.role === 'VIP') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      console.warn('Firebase Auth notice:', err?.code || err?.message);
      soundManager.playClick();
      setErrorMessage(getFirebaseAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const user = await signInWithGoogle(promoCode);
      soundManager.playProfitChime();

      if (user.role === 'VIP') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      console.warn('Google Auth notice:', err?.code || err?.message);
      soundManager.playClick();
      setErrorMessage(getFirebaseAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const demoEmail = 'guest.trader@mbktrading.live';
      const demoPass = 'MBKtrader2026!';
      const user = await signInWithEmail(demoEmail, demoPass, promoCode || 'MBKVIP');
      soundManager.playProfitChime();
      if (user.role === 'VIP') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      console.warn('Demo login fallback notice:', err);
      // Seamless guest fallback profile
      const guestProfile: UserProfile = {
        uid: 'guest-' + Date.now(),
        name: 'متداول MBK الضيف',
        email: 'trader@mbktrading.live',
        role: 'VIP',
        planName: 'عضوية VIP التجريبية',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
      };
      soundManager.playProfitChime();
      onLoginSuccess(guestProfile);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121927] border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 left-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 p-0.5 mb-3 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#0d131f] rounded-[10px] flex items-center justify-center">
              <span className="font-extrabold text-cyan-400 font-mono text-base">MBK</span>
            </div>
          </div>

          <h3 className="text-lg font-black text-slate-100">
            {tab === 'signup' ? 'إنشاء حساب جديد في MBKtrading' : 'تسجيل الدخول إلى حسابك'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            منصة التداول المؤسسية — موثقة بواسطة Firebase Cloud Auth & Firestore
          </p>
        </div>

        {/* Error Alert Banner with Helpful Resolution Action */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs space-y-1.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="leading-tight font-medium">{errorMessage}</span>
            </div>
            {tab === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setErrorMessage(null);
                }}
                className="text-[11px] text-amber-300 font-bold hover:underline block mr-6 cursor-pointer"
              >
                👉 هل هذا بريد جديد؟ انقر هنا لإنشاء حسابك والدخول فوراً
              </button>
            )}
          </div>
        )}

        {/* Tabs: Sign Up vs Login */}
        <div className="flex bg-[#0a0f18] p-1 rounded-xl mb-4 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMessage(null);
            }}
            disabled={isLoading}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'signup'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            إنشاء حساب جديد
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            disabled={isLoading}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            تسجيل دخول
          </button>
        </div>

        {/* Quick Demo Trader Access */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full mb-3 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>دخول فوري كمتداول تجريبي (One-Click Demo Access)</span>
        </button>

        {/* Social Auth (Google) */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full mb-4 py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 hover:border-slate-600 cursor-pointer disabled:opacity-50"
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
          <span>تسجيل الدخول السريع عبر Google</span>
        </button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-slate-500 text-[11px]">أو عبر البريد الإلكتروني المباشر</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Standard Email / Password Form with Promo Code */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {tab === 'signup' && (
            <div>
              <label className="text-slate-300 block mb-1 font-medium">الاسم الكامل للمتداول:</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد الله"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-[#0a0f18] border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-300 block mb-1 font-medium">البريد الإلكتروني:</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#0a0f18] border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-medium">كلمة المرور:</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="•••••••• (6 خانات على الأقل)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#0a0f18] border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Dedicated Promo Code Input Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                <span>رمز الترويج / Promo Code (اختياري):</span>
              </label>
              <span className="text-[10px] text-amber-400 font-mono font-bold">تفعيل VIP فوري</span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="مثال: MBKVIP أو كود الوسيط المعتمد"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                className="w-full bg-[#0a0f18] border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono text-xs uppercase"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              يمنحك إدخال رمز ترويجي صالح أو كود الوسيط فتحاً فورياً لإشارات وتنبيهات VIP اللحظية في قاعدة بيانات Firestore.
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-black text-xs transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري معالجة الحساب في Firebase...</span>
              </>
            ) : (
              <>
                <span>
                  {tab === 'signup'
                    ? promoCode
                      ? 'إنشاء الحساب وتفعيل VIP الآن'
                      : 'إنشاء الحساب المجاني والدخول للوحة'
                    : 'تسجيل الدخول'}
                </span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>تشفير Google Firebase Auth المباشر • قاعدة بيانات Firestore آمنة</span>
        </div>
      </div>
    </div>
  );
};
