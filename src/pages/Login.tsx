import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  TrendingUp,
  Activity,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import { UserProfile } from '../types/trading';
import { soundManager } from '../utils/audio';
import { loginWithFirebase, signInWithGooglePopup, getFirebaseAuthErrorMessage } from '../services/firebaseAuthService';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateRegister: () => void;
  onNavigateHome: () => void;
  lang?: 'ar' | 'en';
}

export const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onNavigateRegister,
  onNavigateHome,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = emailInput.trim();
    if (!cleanInput || !password.trim()) {
      setError(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please fill in both email and password');
      return;
    }

    const formattedEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@mbktrading.live`;

    setLoading(true);
    soundManager.playClick();

    try {
      const user = await loginWithFirebase(formattedEmail, password.trim());
      soundManager.playProfitChime();
      onLoginSuccess(user);
    } catch (err: any) {
      console.warn('Firebase Auth Login notice:', err);
      soundManager.playClick();
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    soundManager.playClick();
    try {
      const { userProfile, isNewUser } = await signInWithGooglePopup();
      soundManager.playProfitChime();
      if (isNewUser) {
        onNavigateRegister();
      } else {
        onLoginSuccess(userProfile);
      }
    } catch (err: any) {
      console.warn('Google auth login notice:', err);
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen h-[100dvh] w-full bg-[#131722] text-[#d1d4dc] flex flex-col justify-between font-sans relative overflow-hidden select-none antialiased"
    >
      {/* Institutional Background Glows & Grid Patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e222d_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute -top-40 start-1/4 w-[500px] h-[500px] bg-[#089981]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 end-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between relative z-20 shrink-0">
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-white font-mono font-black text-lg flex items-center justify-center shadow-lg group-hover:border-[#089981] transition-all">
            MBK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-wider">
                MBK TRADING DESK
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/40">
                PRO v4.0
              </span>
            </div>
            <span className="text-[10px] text-[#787b86] block font-mono">
              INSTITUTIONAL EXECUTION & SIGNAL HUB
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateHome}
          className="px-3.5 py-2 rounded-xl bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-bold text-[#d1d4dc] hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
          <ChevronLeft className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />
        </button>
      </header>

      {/* Main Grid Content Layout */}
      <main className="w-full max-w-6xl mx-auto px-4 py-4 sm:py-8 flex-1 flex items-center justify-center relative z-20">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left / Side Hero Features Column (Hidden on Small Mobile) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col space-y-6 pe-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#089981]/10 border border-[#089981]/30 text-[#089981] text-xs font-bold w-fit">
              <ShieldCheck className="w-4 h-4" />
              <span>{isAr ? 'منظومة حماية مشفرة عبر Firebase' : '256-bit Encrypted Firebase Authentication'}</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight">
              {isAr ? (
                <>
                  منصة التداول المؤسسي  
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#089981] via-[#00f2fe] to-cyan-400">
                    والإشارات اللحظية المباشرة
                  </span>
                </>
              ) : (
                <>
                  Institutional Desk &  
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#089981] via-[#00f2fe] to-cyan-400">
                    Real-time Trading Signals
                  </span>
                </>
              )}
            </h1>

            <p className="text-sm text-[#787b86] leading-relaxed max-w-lg">
              {isAr
                ? 'قم بتسجيل الدخول للوصول الفوري إلى رسومات TradingView المتقدمة، تحليلات الذكاء الاصطناعي، وبث صفقات البوت الفوري المربوط بقنوات Telegram.'
                : 'Sign in to access TradingView Advanced Charts, AI-driven market analysis, and real-time Pine Script bot signals connected with Telegram.'}
            </p>

            {/* Platform Metrics Showcase */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#2a2e39]">
              <div className="p-3 rounded-xl bg-[#1e222d]/60 border border-[#2a2e39]">
                <div className="flex items-center gap-1.5 text-[#089981] font-mono text-xs font-bold mb-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>99.98%</span>
                </div>
                <div className="text-[11px] text-[#787b86]">
                  {isAr ? 'زمن الاستجابة' : 'Execution Uptime'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1e222d]/60 border border-[#2a2e39]">
                <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs font-bold mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>LIVE</span>
                </div>
                <div className="text-[11px] text-[#787b86]">
                  {isAr ? 'إشارات Firestore' : 'Realtime Firestore'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1e222d]/60 border border-[#2a2e39]">
                <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>PRO</span>
                </div>
                <div className="text-[11px] text-[#787b86]">
                  {isAr ? 'شارت TradingView' : 'TV Advanced Chart'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Institutional Auth Card */}
          <div className="col-span-1 lg:col-span-6 max-w-md w-full mx-auto">
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              {/* Header Accent Line */}
              <div className="absolute top-0 start-0 w-full h-1.5 bg-gradient-to-r from-[#089981] via-[#00f2fe] to-blue-600" />

              {/* Form Title & Subtitle */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#089981]/15 border border-[#089981]/30 text-[#089981] flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {isAr ? 'تسجيل الدخول إلى المنصة' : 'Institutional Sign In'}
                </h2>
                <p className="text-xs text-[#787b86] mt-1">
                  {isAr
                    ? 'أدخل بيانات حسابك الموثق في MBK Trading Desk'
                    : 'Enter your credentials to access your MBK workspace'}
                </p>
              </div>

              {/* Inline Styled Validation / Error Alert */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-[#f23645]/10 border border-[#f23645]/30 text-[#f23645] text-xs font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              {/* Form with Sleek Floating Labels & Focus Transitions */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Email Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#d1d4dc]">
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <div className={`relative transition-all duration-200 rounded-xl ${
                    emailFocused ? 'ring-2 ring-[#089981]/40 border-[#089981]' : 'border-[#2a2e39]'
                  }`}>
                    <Mail className={`w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      emailFocused ? 'text-[#089981]' : 'text-[#787b86]'
                    }`} />
                    <input
                      type="text"
                      value={emailInput}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="trader@domain.com"
                      className="w-full ps-10 pe-4 py-3 bg-[#131722] border border-inherit rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#d1d4dc]">
                      {isAr ? 'كلمة المرور' : 'Password'}
                    </label>
                  </div>
                  <div className={`relative transition-all duration-200 rounded-xl ${
                    passFocused ? 'ring-2 ring-[#089981]/40 border-[#089981]' : 'border-[#2a2e39]'
                  }`}>
                    <Lock className={`w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      passFocused ? 'text-[#089981]' : 'text-[#787b86]'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onFocus={() => setPassFocused(true)}
                      onBlur={() => setPassFocused(false)}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full ps-10 pe-10 py-3 bg-[#131722] border border-inherit rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[#787b86] hover:text-white transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#089981] to-[#067a67] hover:from-[#09a98e] hover:to-[#088a75] text-white font-bold text-xs shadow-lg shadow-[#089981]/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50 active:scale-[0.99]"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isAr ? 'تسجيل الدخول' : 'Sign In to Workspace'}</span>
                      <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>
              </form>

              {/* Polished Google OAuth Login Option */}
              <div className="mt-5 pt-4 border-t border-[#2a2e39]">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] hover:border-[#089981]/40 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 group shadow-sm"
                >
                  <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isAr ? 'المتابعة بواسطة حساب Google' : 'Continue with Google'}</span>
                </button>
              </div>

              {/* Toggle to Register */}
              <div className="mt-6 text-center text-xs text-[#787b86]">
                <span>{isAr ? 'ليس لديك حساب بعد؟ ' : "Don't have an account yet? "}</span>
                <button
                  onClick={onNavigateRegister}
                  className="text-[#089981] hover:text-[#09a98e] hover:underline font-bold cursor-pointer transition-colors"
                >
                  {isAr ? 'إنشاء حساب جديد' : 'Register Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 py-3 text-center text-[11px] text-[#787b86] font-mono relative z-20 shrink-0">
        MBK Trading Desk Platform © 2026 • Encrypted Firebase Auth & Real-Time Firestore Registry
      </footer>
    </div>
  );
};
