import React, { useState } from 'react';
import { Globe, UserPlus, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2, Copy, ArrowLeft, Sun, Moon } from 'lucide-react';
import { UserProfile } from '../types/trading';
import { useTheme } from '../context/ThemeContext';
import { soundManager } from '../utils/audio';
import {
  loginWithFirebase,
  signInWithGooglePopup,
  sendFirebasePasswordReset,
  getFirebaseAuthErrorMessage
} from '../services/firebaseAuthService';
import { PublicTiersShowcase } from '../components/auth/PublicTiersShowcase';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateRegister: () => void;
  onGoogleNewUser?: (user: { uid: string; email: string; displayName: string }) => void;
  onNavigateHome?: () => void;
  lang?: 'ar' | 'en';
  onToggleLang?: () => void;
}

export const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onNavigateRegister,
  onGoogleNewUser,
  lang = 'ar',
  onToggleLang
}) => {
  const isAr = lang === 'ar';
  const { resolvedTheme, cycleThemeMode } = useTheme();
  const isLight = resolvedTheme === 'light';

  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);

  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

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
    setUnauthorizedHost(null);
    setLoading(true);
    soundManager.playClick();
    try {
      const { userProfile, isNewUser, uid } = await signInWithGooglePopup();
      soundManager.playProfitChime();
      if (isNewUser) {
        if (onGoogleNewUser) {
          onGoogleNewUser({
            uid,
            email: userProfile.email || '',
            displayName: userProfile.name || ''
          });
        } else {
          onNavigateRegister();
        }
      } else {
        onLoginSuccess(userProfile);
      }
    } catch (err: any) {
      console.warn('Google auth login notice:', err);
      setError(getFirebaseAuthErrorMessage(err));
      if (err?.code === 'auth/unauthorized-domain' && typeof window !== 'undefined') {
        setUnauthorizedHost(window.location.hostname);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    setUnauthorizedHost(null);

    const targetEmail = (resetEmail || emailInput).trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setError(isAr ? 'يرجى إدخال بريد إلكتروني صحيح لإرسال رابط الاستعادة.' : 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    soundManager.playClick();
    try {
      await sendFirebasePasswordReset(targetEmail);
      soundManager.playProfitChime();
      setResetSuccess(
        isAr
          ? `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${targetEmail}. يرجى فحص البريد الوارد أو الرسائل غير المرغوب فيها (Spam).`
          : `Password reset link dispatched to ${targetEmail}. Please check your inbox and spam folder.`
      );
    } catch (err: any) {
      console.warn('Password reset notice:', err);
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen w-full bg-[#F0F3FA] dark:bg-[#131722] text-[#131722] dark:text-[#d1d4dc] flex flex-col justify-between font-sans relative overflow-x-hidden select-none antialiased"
    >
      {/* Clean Subtle Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD2DF_1px,transparent_1px)] dark:bg-[radial-gradient(#1e222d_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="hidden dark:block absolute -top-40 start-1/4 w-[500px] h-[500px] bg-[#089981]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Clean 3-Zone Top Navigation Bar */}
      <header className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4 sm:gap-8 relative z-20 shrink-0 border-b border-[#E0E3EB] dark:border-[#2a2e39]/60">
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src="/mbk-logo.png"
            alt="MBK Trading"
            className="h-9 w-auto rounded-lg object-contain border border-[#E0E3EB] dark:border-white/10 shadow-sm"
          />
          <span className="text-base font-extrabold text-[#131722] dark:text-white tracking-tight whitespace-nowrap">
            MBK Trading
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#4A5162] dark:text-[#8a93a6]">
          <a href="#tiers-showcase-login" className="hover:text-[#131722] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
            {isAr ? 'الباقات والأسعار' : 'Plans & Pricing'}
          </a>
          <a href="#login-panel-card" className="hover:text-[#131722] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
            {isAr ? 'تسجيل الدخول' : 'Sign In'}
          </a>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              cycleThemeMode();
            }}
            title={isLight ? (isAr ? 'الوضع الداكن' : 'Switch to Dark Mode') : (isAr ? 'الوضع النهاري' : 'Switch to Light Mode')}
            aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#1e222d] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#131722] dark:text-[#d1d4dc] transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            {isLight ? <Moon className="w-3.5 h-3.5 text-[#131722]" /> : <Sun className="w-3.5 h-3.5 text-[#F0B90B]" />}
          </button>
          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="px-3 py-2 rounded-xl bg-[#FFFFFF] dark:bg-[#1e222d] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-xs font-semibold text-[#131722] dark:text-[#d1d4dc] hover:text-[#131722] dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-[#089981]" />
              <span>{isAr ? 'EN' : 'AR'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateRegister}
            className="px-4 py-2 rounded-xl bg-[#131722] hover:bg-[#2A2E39] dark:bg-[#089981] dark:hover:bg-[#07846f] text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إنشاء حساب جديد' : 'Create Account'}</span>
          </button>
        </div>
      </header>

      {/* Main Front Page Grid: 3-Tier Plans + Login Panel */}
      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 relative z-20">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left / Main Column: Always-Visible 3-Tier Plans */}
          <section id="tiers-showcase-login" className="lg:col-span-8 order-2 lg:order-1">
            <PublicTiersShowcase
              lang={lang}
              onFocusAuth={() => {
                onNavigateRegister();
              }}
            />
          </section>

          {/* Right Column: Institutional Auth Card */}
          <section id="login-panel-card" className="lg:col-span-4 order-1 lg:order-2 lg:sticky lg:top-6 w-full">
            <div className="bg-[#FFFFFF] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-2xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl relative overflow-hidden">
              {/* Header Accent Line */}
              <div className="absolute top-0 start-0 w-full h-1 bg-[#131722] dark:bg-gradient-to-r dark:from-[#089981] dark:via-[#00f2fe] dark:to-blue-600" />

              {/* Instant Mode Switcher (Create Account vs Sign In) */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F8F9FD] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-xl mb-5">
                <button
                  type="button"
                  onClick={onNavigateRegister}
                  className="py-2 px-3 rounded-lg text-xs font-bold text-[#4A5162] dark:text-[#8a93a6] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isAr ? 'إنشاء حساب جديد' : 'Create Account'}
                </button>
                <button
                  type="button"
                  className="py-2 px-3 rounded-lg text-xs font-bold bg-[#131722] dark:bg-[#089981] text-white cursor-default whitespace-nowrap"
                >
                  {isAr ? 'تسجيل الدخول' : 'Sign In'}
                </button>
              </div>

              {/* Form Title & Subtitle */}
              <div className="text-center mb-5">
                <div className="w-28 mx-auto mb-3 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-[#2a2e39] p-1.5 flex items-center justify-center shadow-inner">
                  <img
                    src="/mbk-logo.png"
                    alt="MBK Trading"
                    className="w-full h-auto object-contain rounded-lg"
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#131722] dark:text-white tracking-tight">
                  {isAr ? 'تسجيل الدخول' : 'Sign In'}
                </h2>
                <p className="text-xs text-[#787b86] mt-1">
                  {isAr ? 'مرحباً بك في MBK Trading' : 'Welcome to MBK Trading'}
                </p>
              </div>

              {/* Inline Styled Validation / Error Alert */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-[#FDECEE] dark:bg-[#f23645]/10 border border-[#F5C2C7] dark:border-[#f23645]/30 text-[#D93848] dark:text-[#f23645] text-xs font-medium space-y-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="leading-tight">{error}</span>
                  </div>
                  {unauthorizedHost && (
                    <div className="p-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#131722] dark:text-[#d1d4dc] text-[11px] space-y-1.5">
                      <p className="text-[#4A5162] dark:text-[#8a93a6]">
                        {isAr
                          ? 'أضف هذا النطاق في Firebase Console ← Authentication ← Settings ← Authorized domains:'
                          : 'Add this domain in Firebase Console → Authentication → Settings → Authorized domains:'}
                      </p>
                      <div className="flex items-center justify-between gap-2 bg-[#F8F9FD] dark:bg-[#1e222d] px-2.5 py-1.5 rounded border border-[#E0E3EB] dark:border-[#2a2e39] font-mono text-[#131722] dark:text-white">
                        <span className="truncate select-all">{unauthorizedHost}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(unauthorizedHost);
                            setCopiedDomain(true);
                            setTimeout(() => setCopiedDomain(false), 2000);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] hover:bg-[#089981]/30 font-bold shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedDomain ? (isAr ? 'تم النسخ' : 'Copied') : isAr ? 'نسخ' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {resetSuccess && (
                <div className="mb-5 p-3.5 rounded-xl bg-[#E6F5F2] dark:bg-[#089981]/15 border border-[#B3E2D9] dark:border-[#089981]/40 text-[#089981] text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{resetSuccess}</span>
                </div>
              )}

              {resetMode ? (
                <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] text-xs text-[#4A5162] dark:text-[#8a93a6] leading-relaxed">
                    {isAr
                      ? 'أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور.'
                      : 'Enter your registered email address and we will send a secure password reset link.'}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#131722] dark:text-[#d1d4dc]">
                      {isAr ? 'البريد الإلكتروني للاستعادة' : 'Account Email'}
                    </label>
                    <div className="relative rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39] focus-within:ring-2 focus-within:ring-[#1E53E5]/30 dark:focus-within:ring-[#089981]/40 focus-within:border-[#1E53E5] dark:focus-within:border-[#089981]">
                      <Mail className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="trader@domain.com"
                        className="w-full ps-10 pe-4 py-3 bg-[#FFFFFF] dark:bg-[#131722] border-0 rounded-xl text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] focus:outline-hidden font-mono"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#131722] hover:bg-[#2A2E39] dark:bg-gradient-to-r dark:from-[#089981] dark:to-[#067a67] dark:hover:from-[#09a98e] dark:hover:to-[#088a75] text-white font-bold text-xs shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg dark:shadow-[#089981]/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-[#CBD2DF] dark:border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isAr ? 'إرسال رابط إعادة التعيين' : 'Send Password Reset Email'}</span>
                        <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(false);
                      setError(null);
                      setResetSuccess(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#131722] dark:text-[#d1d4dc] text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                    <span>{isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#131722] dark:text-[#d1d4dc]">
                      {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <div className={`relative transition-all duration-200 rounded-xl ${
                      emailFocused ? 'ring-2 ring-[#1E53E5]/30 border-[#1E53E5] dark:ring-[#089981]/40 dark:border-[#089981]' : 'border-[#CBD2DF] dark:border-[#2a2e39]'
                    }`}>
                      <Mail className={`w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                        emailFocused ? 'text-[#1E53E5] dark:text-[#089981]' : 'text-[#787b86]'
                      }`} />
                      <input
                        type="text"
                        value={emailInput}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="trader@domain.com"
                        className="w-full ps-10 pe-4 py-3 bg-[#FFFFFF] dark:bg-[#131722] border border-inherit rounded-xl text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] focus:outline-hidden font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[#131722] dark:text-[#d1d4dc]">
                        {isAr ? 'كلمة المرور' : 'Password'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setError(null);
                          setResetSuccess(null);
                          setUnauthorizedHost(null);
                          setResetEmail(emailInput.includes('@') ? emailInput : '');
                          setResetMode(true);
                        }}
                        className="text-[11px] font-semibold text-[#089981] hover:underline cursor-pointer"
                      >
                        {isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                      </button>
                    </div>
                    <div className={`relative transition-all duration-200 rounded-xl ${
                      passFocused ? 'ring-2 ring-[#1E53E5]/30 border-[#1E53E5] dark:ring-[#089981]/40 dark:border-[#089981]' : 'border-[#CBD2DF] dark:border-[#2a2e39]'
                    }`}>
                      <Lock className={`w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                        passFocused ? 'text-[#1E53E5] dark:text-[#089981]' : 'text-[#787b86]'
                      }`} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onFocus={() => setPassFocused(true)}
                        onBlur={() => setPassFocused(false)}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full ps-10 pe-10 py-3 bg-[#FFFFFF] dark:bg-[#131722] border border-inherit rounded-xl text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] focus:outline-hidden font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[#787b86] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer"
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
                    className="w-full py-3.5 px-4 rounded-xl bg-[#131722] hover:bg-[#2A2E39] dark:bg-gradient-to-r dark:from-[#089981] dark:to-[#067a67] dark:hover:from-[#09a98e] dark:hover:to-[#088a75] text-white font-bold text-xs shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg dark:shadow-[#089981]/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50 active:scale-[0.99]"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-[#CBD2DF] dark:border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isAr ? 'تسجيل الدخول' : 'Sign In to Workspace'}</span>
                        <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Polished Google OAuth Login Option */}
              <div className="mt-5 pt-4 border-t border-[#E0E3EB] dark:border-[#2a2e39]">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] hover:border-[#089981]/40 text-[#131722] dark:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 group shadow-sm"
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
                  type="button"
                  onClick={onNavigateRegister}
                  className="text-[#089981] hover:text-[#09a98e] hover:underline font-bold cursor-pointer transition-colors"
                >
                  {isAr ? 'إنشاء حساب جديد' : 'Register Now'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-[11px] text-[#787b86] border-t border-[#E0E3EB] dark:border-[#2a2e39]/60 relative z-20 shrink-0">
        MBK Trading © 2026
      </footer>
    </div>
  );
};
