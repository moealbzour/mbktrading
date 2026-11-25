import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Globe,
  Calendar,
  Award,
  TrendingUp,
  MailCheck,
  Check,
  Copy,
  Sun,
  Moon
} from 'lucide-react';
import { UserProfile } from '../types/trading';
import { useTheme } from '../context/ThemeContext';
import { PublicTiersShowcase } from '../components/auth/PublicTiersShowcase';
import { soundManager } from '../utils/audio';
import {
  registerWithFirebase,
  signInWithGooglePopup,
  saveGoogleUserOnboardingProfile,
  getFirebaseAuthErrorMessage,
  UserOnboardingData
} from '../services/firebaseAuthService';

interface RegisterProps {
  onRegisterSuccess: (user: UserProfile) => void;
  onNavigateLogin: () => void;
  initialGoogleUser?: { uid: string; email: string; displayName: string } | null;
  onNavigateHome?: () => void;
  lang?: 'ar' | 'en';
  onToggleLang?: () => void;
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

export const Register: React.FC<RegisterProps> = ({
  onRegisterSuccess,
  onNavigateLogin,
  initialGoogleUser = null,
  lang = 'ar',
  onToggleLang
}) => {
  const isAr = lang === 'ar';
  const { resolvedTheme, cycleThemeMode } = useTheme();
  const isLight = resolvedTheme === 'light';

  // Step Control (1: Account Credentials & Identity, 2: Trader Profile & Preferences, 3: Email Verification Screen)
  const [step, setStep] = useState<1 | 2 | 3>(initialGoogleUser ? 2 : 1);

  // Form State
  const [displayName, setDisplayName] = useState(initialGoogleUser?.displayName || '');
  const [email, setEmail] = useState(initialGoogleUser?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Expanded Onboarding Fields
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('الإمارات العربية المتحدة (UAE)');
  const [dob, setDob] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Institutional'>('Intermediate');
  const [selectedAssetClasses, setSelectedAssetClasses] = useState<string[]>(['Indices', 'Forex']);
  const [favoritePairs, setFavoritePairs] = useState('US100, XAUUSD');

  // Focus & State Handlers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Asset class options
  const assetOptions = [
    { id: 'Indices', labelAr: 'المؤشرات العالمية (Indices)', labelEn: 'Global Indices' },
    { id: 'Forex', labelAr: 'العملات الأجنبية (Forex)', labelEn: 'Forex Pairs' },
    { id: 'Crypto', labelAr: 'العملات الرقمية (Crypto)', labelEn: 'Crypto Assets' },
    { id: 'Commodities', labelAr: 'السلع والمعادن (Gold / Oil)', labelEn: 'Commodities & Metals' }
  ];

  const handleToggleAsset = (assetId: string) => {
    soundManager.playClick();
    setSelectedAssetClasses((prev) =>
      prev.includes(assetId) ? prev.filter((a) => a !== assetId) : [...prev, assetId]
    );
  };

  // Step 1 Validation & Proceed to Step 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      setError(isAr ? 'البريد الإلكتروني وكلمة المرور مطلوبان' : 'Email and password are required');
      return;
    }

    if (password.length < 6) {
      setError(isAr ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    soundManager.playClick();
    setStep(2);
  };

  // Google OAuth User State
  const [googleUid, setGoogleUid] = useState<string | null>(initialGoogleUser?.uid || null);

  useEffect(() => {
    if (initialGoogleUser?.uid) {
      setGoogleUid(initialGoogleUser.uid);
      if (initialGoogleUser.email) setEmail(initialGoogleUser.email);
      if (initialGoogleUser.displayName) setDisplayName(initialGoogleUser.displayName);
      setStep(2);
    }
  }, [initialGoogleUser]);

  // Final Registration Submission & Email Verification Trigger
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    soundManager.playClick();

    const onboardingData: UserOnboardingData = {
      phone: phone.trim(),
      country,
      dob,
      experienceLevel,
      assetClasses: selectedAssetClasses,
      favoritePairs: favoritePairs.trim()
    };

    try {
      if (googleUid) {
        const updatedUser = await saveGoogleUserOnboardingProfile(googleUid, onboardingData);
        soundManager.playProfitChime();
        onRegisterSuccess(updatedUser);
      } else {
        await registerWithFirebase(
          email.trim(),
          password.trim(),
          displayName.trim(),
          onboardingData
        );

        soundManager.playProfitChime();
        setRegisteredEmail(email.trim());
        setStep(3);
      }
    } catch (err: any) {
      console.warn('Firebase Auth Register error:', err);
      soundManager.playClick();
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Quick Registration with Two-Step Onboarding Check
  const handleGoogleRegister = async () => {
    setError(null);
    setUnauthorizedHost(null);
    setLoading(true);
    soundManager.playClick();
    try {
      const { userProfile, isNewUser, uid } = await signInWithGooglePopup();
      soundManager.playProfitChime();

      if (isNewUser) {
        setGoogleUid(uid);
        if (userProfile.email) setEmail(userProfile.email);
        if (userProfile.name) setDisplayName(userProfile.name);
        setStep(2);
      } else {
        onRegisterSuccess(userProfile);
      }
    } catch (err: any) {
      console.warn('Google auth register error:', err);
      setError(getFirebaseAuthErrorMessage(err));
      if (err?.code === 'auth/unauthorized-domain' && typeof window !== 'undefined') {
        setUnauthorizedHost(window.location.hostname);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen w-full bg-[#F0F3FA] dark:bg-[#131722] text-[#131722] dark:text-[#d1d4dc] flex flex-col justify-between font-sans relative overflow-x-hidden select-none antialiased"
    >
      {/* Subtle Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD2DF_1px,transparent_1px)] dark:bg-[radial-gradient(#1e222d_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="hidden dark:block absolute -top-40 end-1/4 w-[500px] h-[500px] bg-[#089981]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* 3-Zone Top Header Navigation */}
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
          <a href="#tiers-showcase" className="hover:text-[#131722] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
            {isAr ? 'الباقات والأسعار' : 'Plans & Pricing'}
          </a>
          <a href="#auth-panel-card" className="hover:text-[#131722] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
            {isAr ? 'إنشاء حساب' : 'Create Account'}
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
            onClick={onNavigateLogin}
            className="px-4 py-2 rounded-xl bg-[#FFFFFF] dark:bg-[#1e222d] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-xs font-bold text-[#131722] dark:text-white transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
          </button>
        </div>
      </header>

      {/* Main Front Page Container: 3-Tier Showcase + Registration Panel */}
      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 relative z-20">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left / Main Column: Always-Visible 3-Tier Plans (Free $0, VIP $100, Elite $500) */}
          <section id="tiers-showcase" className="lg:col-span-8 order-2 lg:order-1">
            <PublicTiersShowcase
              lang={lang}
              onFocusAuth={() => {
                document.getElementById('auth-panel-card')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </section>

          {/* Right Column: Registration Panel */}
          <section id="auth-panel-card" className="lg:col-span-4 order-1 lg:order-2 lg:sticky lg:top-6 w-full">
            <div className="bg-[#FFFFFF] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-2xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 start-0 w-full h-1 bg-[#131722] dark:bg-gradient-to-r dark:from-[#089981] dark:via-[#00f2fe] dark:to-blue-600" />

              {/* Instant Mode Switcher (Register vs Sign In) */}
              {step !== 3 && (
                <div className="grid grid-cols-2 gap-1 p-1 bg-[#F8F9FD] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-xl mb-5">
                  <button
                    type="button"
                    className="py-2 px-3 rounded-lg text-xs font-bold bg-[#131722] dark:bg-[#089981] text-white cursor-default whitespace-nowrap"
                  >
                    {isAr ? 'إنشاء حساب جديد' : 'Create Account'}
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateLogin}
                    className="py-2 px-3 rounded-lg text-xs font-bold text-[#4A5162] dark:text-[#8a93a6] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isAr ? 'تسجيل الدخول' : 'Sign In'}
                  </button>
                </div>
              )}

              {/* Progress Indicator Steps (Only shown for Step 1 & 2) */}
              {step !== 3 && (
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E0E3EB] dark:border-[#2a2e39]">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                      step === 1 ? 'bg-[#089981] text-white shadow-md shadow-none dark:shadow-[#089981]/30' : 'bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981]'
                    }`}>
                      1
                    </div>
                    <span className={`text-xs font-bold ${step === 1 ? 'text-[#131722] dark:text-white' : 'text-[#787b86]'}`}>
                      {isAr ? 'بيانات الحساب والرمز' : 'Account Credentials'}
                    </span>
                  </div>

                  <div className="w-8 h-0.5 bg-[#EDF1F7] dark:bg-[#2a2e39]" />

                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                      step === 2 ? 'bg-[#089981] text-white shadow-md shadow-none dark:shadow-[#089981]/30' : 'bg-[#EDF1F7] dark:bg-[#2a2e39] text-[#787b86]'
                    }`}>
                      2
                    </div>
                    <span className={`text-xs font-bold ${step === 2 ? 'text-[#131722] dark:text-white' : 'text-[#787b86]'}`}>
                      {isAr ? 'الملف والتفضيلات' : 'Trader Preferences'}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Notification */}
              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-[#FDECEE] dark:bg-[#f23645]/10 border border-[#F5C2C7] dark:border-[#f23645]/30 text-[#D93848] dark:text-[#f23645] text-xs font-medium space-y-2 animate-in fade-in">
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

              {/* ========================================================= */}
              {/* STEP 1: ACCOUNT CREDENTIALS & IDENTITY */}
              {/* ========================================================= */}
              {step === 1 && (
                <form onSubmit={handleProceedToStep2} className="space-y-3.5">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-extrabold text-[#131722] dark:text-white">
                      {isAr ? 'إنشاء حساب متداول جديد' : 'Create Trader Profile'}
                    </h2>
                    <p className="text-xs text-[#787b86] mt-0.5">
                      {isAr ? 'أدخل البيانات الأساسية لإنشاء حسابك في المنصة' : 'Enter your identity details to initialize your workspace'}
                    </p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                      {isAr ? 'الاسم الكامل' : 'Full Name'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={isAr ? 'أحمد المنصوري' : 'Alex Mercer'}
                        className="w-full ps-10 pe-4 py-2.5 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] focus:outline-hidden transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                      {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="trader@domain.com"
                        className="w-full ps-10 pe-4 py-2.5 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] focus:outline-hidden transition-all font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                        {isAr ? 'كلمة المرور *' : 'Password *'}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full ps-10 pe-10 py-2.5 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] focus:outline-hidden transition-all font-mono"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-[#787b86] hover:text-[#131722] dark:hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                        {isAr ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full ps-10 pe-4 py-2.5 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] focus:outline-hidden transition-all font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Proceed Button */}
                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl bg-[#131722] hover:bg-[#2A2E39] dark:bg-gradient-to-r dark:from-[#089981] dark:to-[#067a67] dark:hover:from-[#09a98e] dark:hover:to-[#088a75] text-white font-bold text-xs shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg dark:shadow-[#089981]/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
                  >
                    <span>{isAr ? 'المتابعة للخطوة التالية' : 'Proceed to Trader Preferences'}</span>
                    <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Quick Google Option */}
                  <div className="mt-4 pt-3 border-t border-[#E0E3EB] dark:border-[#2a2e39]">
                    <button
                      type="button"
                      onClick={handleGoogleRegister}
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#131722] dark:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{isAr ? 'التسجيل المباشر بـ Google' : 'Quick Register with Google'}</span>
                    </button>
                  </div>

                  {/* Switch to Login */}
                  <div className="mt-4 text-center text-xs text-[#787b86]">
                    <span>{isAr ? 'لديك حساب بالفعل؟ ' : 'Already registered? '}</span>
                    <button
                      type="button"
                      onClick={onNavigateLogin}
                      className="text-[#089981] hover:underline font-bold cursor-pointer"
                    >
                      {isAr ? 'تسجيل الدخول' : 'Sign In'}
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================= */}
              {/* STEP 2: EXPANDED TRADER PROFILE & PREFERENCES */}
              {/* ========================================================= */}
              {step === 2 && (
                <form onSubmit={handleFinalSubmit} className="space-y-3.5">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-extrabold text-[#131722] dark:text-white">
                      {isAr ? 'تفضيلات وتفاصيل المتداول' : 'Trader Profile & Experience'}
                    </h2>
                    <p className="text-xs text-[#787b86] mt-0.5">
                      {isAr ? 'ساعدنا في تخصيص التنبيهات ورسومات الشارت المناسبة لأسلوبك' : 'Customize your asset classes and signal notifications'}
                    </p>
                  </div>

                  {/* Phone & Country Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                        {isAr ? 'رقم الهاتف' : 'Phone Number'}
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+971 50 123 4567"
                          className="w-full ps-10 pe-4 py-2.5 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] focus:outline-hidden transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                        {isAr ? 'دولة الإقامة' : 'Country of Residence'}
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full ps-10 pe-4 py-2.5 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl text-xs text-[#131722] dark:text-white focus:outline-hidden transition-all appearance-none cursor-pointer"
                        >
                          {COUNTRIES_LIST.map((c) => (
                            <option key={c} value={c} className="bg-[#F8F9FD] dark:bg-[#1e222d] text-[#131722] dark:text-white">
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* DOB & Experience Level Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                        {isAr ? 'تاريخ الميلاد' : 'Date of Birth'}
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full ps-10 pe-4 py-2.5 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl text-xs text-[#131722] dark:text-white focus:outline-hidden transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                        {isAr ? 'مستوى الخبرة في التداول' : 'Trading Experience'}
                      </label>
                      <div className="relative">
                        <Award className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <select
                          value={experienceLevel}
                          onChange={(e) => setExperienceLevel(e.target.value as any)}
                          className="w-full ps-10 pe-4 py-2.5 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl text-xs text-[#131722] dark:text-white focus:outline-hidden transition-all appearance-none cursor-pointer"
                        >
                          <option value="Beginner" className="bg-[#F8F9FD] dark:bg-[#1e222d] text-[#131722] dark:text-white">{isAr ? 'مبتدئ (0 - 1 سنة)' : 'Beginner (0 - 1 yr)'}</option>
                          <option value="Intermediate" className="bg-[#F8F9FD] dark:bg-[#1e222d] text-[#131722] dark:text-white">{isAr ? 'متوسط (1 - 3 سنوات)' : 'Intermediate (1 - 3 yrs)'}</option>
                          <option value="Advanced" className="bg-[#F8F9FD] dark:bg-[#1e222d] text-[#131722] dark:text-white">{isAr ? 'متقدم (3 - 5+ سنوات)' : 'Advanced (3 - 5+ yrs)'}</option>
                          <option value="Institutional" className="bg-[#F8F9FD] dark:bg-[#1e222d] text-[#131722] dark:text-white">{isAr ? 'مؤسسي / محترف' : 'Institutional / Professional'}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Preferred Asset Classes (Checkboxes) */}
                  <div>
                    <label className="block text-xs font-bold text-[#131722] dark:text-[#d1d4dc] mb-1.5">
                      {isAr ? 'فئات الأصول المفضلة للتداول' : 'Preferred Asset Classes'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {assetOptions.map((opt) => {
                        const isChecked = selectedAssetClasses.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleToggleAsset(opt.id)}
                            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-[#E6F5F2] dark:bg-[#089981]/15 border-[#089981] text-[#131722] dark:text-white'
                                : 'bg-[#FFFFFF] dark:bg-[#131722] border-[#E0E3EB] dark:border-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white'
                            }`}
                          >
                            <span>{isAr ? opt.labelAr : opt.labelEn}</span>
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isChecked ? 'bg-[#089981] border-[#089981] text-white' : 'border-[#E0E3EB] dark:border-[#2a2e39]'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Favorite Trading Pairs */}
                  <div>
                    <label className="block text-xs font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                      {isAr ? 'الأزواج والرموز المفضلة' : 'Favorite Trading Pairs'}
                    </label>
                    <div className="relative">
                      <TrendingUp className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                      <input
                        type="text"
                        value={favoritePairs}
                        onChange={(e) => setFavoritePairs(e.target.value)}
                        placeholder="e.g. US100, XAUUSD, EURUSD, BTCUSD"
                        className="w-full ps-10 pe-4 py-2.5 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] focus:outline-hidden transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-3 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-xs font-bold text-[#787b86] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {isAr ? 'السابق' : 'Back'}
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 px-4 rounded-xl bg-[#131722] hover:bg-[#2A2E39] dark:bg-gradient-to-r dark:from-[#089981] dark:to-[#067a67] dark:hover:from-[#09a98e] dark:hover:to-[#088a75] text-white font-bold text-xs shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg dark:shadow-[#089981]/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-[#CBD2DF] dark:border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>
                            {googleUid
                              ? isAr
                                ? 'إتمام التسجيل والدخول للمنصة'
                                : 'Complete Registration & Enter'
                              : isAr
                              ? 'إتمام التسجيل وإرسال كود التفعيل'
                              : 'Complete Account Registration'}
                          </span>
                          <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>
                  </div>

                  {googleUid && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        setError(null);
                        setLoading(true);
                        try {
                          const updatedUser = await saveGoogleUserOnboardingProfile(googleUid, {
                            country,
                            experienceLevel,
                            assetClasses: selectedAssetClasses,
                            favoritePairs: favoritePairs.trim()
                          });
                          soundManager.playProfitChime();
                          onRegisterSuccess(updatedUser);
                        } catch (err: any) {
                          setError(getFirebaseAuthErrorMessage(err));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full py-2 text-[11px] font-semibold text-[#4A5162] dark:text-[#8a93a6] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {isAr ? 'تخطي والدخول مباشرة إلى المنصة ←' : 'Skip & Enter Workspace Now →'}
                    </button>
                  )}
                </form>
              )}

              {/* ========================================================= */}
              {/* STEP 3: EMAIL VERIFICATION INSTRUCTION SCREEN */}
              {/* ========================================================= */}
              {step === 3 && (
                <div className="py-4 text-center space-y-5 animate-in fade-in zoom-in-95">
                  <div className="w-16 h-16 rounded-3xl bg-[#E6F5F2] dark:bg-[#089981]/20 border border-[#B3E2D9] dark:border-[#089981]/40 text-[#089981] flex items-center justify-center mx-auto shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl shadow-none dark:shadow-[#089981]/20">
                    <MailCheck className="w-8 h-8 animate-bounce" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-[#131722] dark:text-white">
                      {isAr ? 'تم إرسال رابط التأكيد إلى بريدك' : 'Verify Your Email Address'}
                    </h2>
                    <p className="text-xs text-[#787b86] mt-1.5 max-w-sm mx-auto leading-relaxed">
                      {isAr
                        ? 'لحماية حسابك وضمان أمان المنظومة، قمنا بإرسال رسالة تفعيل إلى البريد الإلكتروني:'
                        : 'To complete your account security check, a verification link has been dispatched to:'}
                    </p>
                    <div className="mt-2 inline-block px-3 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] font-mono text-xs font-bold text-[#089981]">
                      {registeredEmail || email}
                    </div>
                  </div>

                  {/* Verification Instructions List */}
                  <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] text-start space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <span className="text-[#131722] dark:text-[#d1d4dc]">
                        {isAr ? 'افتح صندوق الوارد في بريدك الإلكتروني.' : 'Check your email inbox (and spam folder if needed).'}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <span className="text-[#131722] dark:text-[#d1d4dc]">
                        {isAr ? 'انقر على رابط التأكيد المرفق بالرسالة.' : 'Click the verification link provided in the message.'}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </div>
                      <span className="text-[#131722] dark:text-[#d1d4dc]">
                        {isAr ? 'عد إلى هنا وقم بتسجيل الدخول مباشرة إلى المنصة.' : 'Return here and click Sign In to access your workspace.'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={onNavigateLogin}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#131722] hover:bg-[#2A2E39] dark:bg-gradient-to-r dark:from-[#089981] dark:to-[#067a67] dark:hover:from-[#09a98e] dark:hover:to-[#088a75] text-white font-bold text-xs shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg dark:shadow-[#089981]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{isAr ? 'الانتقال لصفحة تسجيل الدخول' : 'Go to Sign In Page'}</span>
                      <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              )}
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
