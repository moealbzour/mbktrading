import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  Sparkles,
  Phone,
  Globe,
  Calendar,
  Award,
  Layers,
  TrendingUp,
  MailCheck,
  Check,
  RefreshCw
} from 'lucide-react';
import { UserProfile } from '../types/trading';
import { soundManager } from '../utils/audio';
import {
  registerWithFirebase,
  signInWithGooglePopup,
  saveGoogleUserOnboardingProfile,
  resendCurrentEmailVerification,
  getFirebaseAuthErrorMessage,
  UserOnboardingData
} from '../services/firebaseAuthService';

interface RegisterProps {
  onRegisterSuccess: (user: UserProfile) => void;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
  lang?: 'ar' | 'en';
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
  onNavigateHome,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  // Step Control (1: Account Credentials & Identity, 2: Trader Profile & Preferences, 3: Email Verification Screen)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
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
  const [googleUid, setGoogleUid] = useState<string | null>(null);

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
        // Two-Step Google Auth Onboarding Completion
        const updatedUser = await saveGoogleUserOnboardingProfile(googleUid, onboardingData);
        soundManager.playProfitChime();
        onRegisterSuccess(updatedUser);
      } else {
        // Standard Email Registration with Verification Trigger
        const { verificationSent } = await registerWithFirebase(
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
    setLoading(true);
    soundManager.playClick();
    try {
      const { userProfile, isNewUser, uid } = await signInWithGooglePopup();
      soundManager.playProfitChime();

      if (isNewUser) {
        // Route Google user to Step 2 to complete their Trader Profile & Preferences
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen h-[100dvh] w-full bg-[#131722] text-[#d1d4dc] flex flex-col justify-between font-sans relative overflow-x-hidden select-none antialiased"
    >
      {/* Background Glows & Architectural Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e222d_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute -top-40 end-1/4 w-[500px] h-[500px] bg-[#089981]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 start-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between relative z-20 shrink-0">
        <div onClick={onNavigateHome} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-white font-mono font-black text-lg flex items-center justify-center shadow-lg group-hover:border-[#089981] transition-all">
            MBK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-wider">
                MBK TRADING DESK
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/40">
                PRO ONBOARDING
              </span>
            </div>
            <span className="text-[10px] text-[#787b86] block font-mono">
              INSTITUTIONAL TRADER NETWORK
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

      {/* Main Container */}
      <main className="w-full max-w-6xl mx-auto px-4 py-4 sm:py-6 flex-1 flex items-center justify-center relative z-20">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column (Institutional Value Showcase) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col space-y-6 pe-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#089981]/10 border border-[#089981]/30 text-[#089981] text-xs font-bold w-fit">
              <ShieldCheck className="w-4 h-4" />
              <span>{isAr ? 'بيئة تداول معتمدة ومحمية' : 'Secure VIP Trading Ecosystem'}</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight">
              {isAr ? (
                <>
                  منظومة التحليل المؤسسي  
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#089981] via-[#00f2fe] to-cyan-400">
                    وإشارات التداول الذكية
                  </span>
                </>
              ) : (
                <>
                  Institutional Analytics &  
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#089981] via-[#00f2fe] to-cyan-400">
                    Smart Signals Network
                  </span>
                </>
              )}
            </h1>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#089981]/20 border border-[#089981]/40 text-[#089981] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isAr ? 'تحليلات عالية الدقة' : 'Institutional-Grade Analytics'}</h4>
                  <p className="text-[11px] text-[#787b86] leading-relaxed">{isAr ? 'استفد من خوارزميات التدفق النقدي ومؤشرات الشارت المتقدمة' : 'Access institutional liquidity metrics & TradingView Advanced Charts'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#089981]/20 border border-[#089981]/40 text-[#089981] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isAr ? 'تنبيهات البوت الآلية' : 'Automated Pine Script Webhooks'}</h4>
                  <p className="text-[11px] text-[#787b86] leading-relaxed">{isAr ? 'ربط مباشر مع استراتيجيات TradingView وبث لحظي عبر Telegram' : 'Direct execution pipeline streaming strategy signals to your desktop'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#089981]/20 border border-[#089981]/40 text-[#089981] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isAr ? 'توصيات الخبراء المباشرة' : 'Live Official Analyst Signals'}</h4>
                  <p className="text-[11px] text-[#787b86] leading-relaxed">{isAr ? 'قنوات توصيات حصرية لمشتركي VIP مع تحديد دقيق لنقاط الأهداف ووقف الخسارة' : 'Verified signal channels with entry targets and stop loss metrics'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Multi-Step Form Card */}
          <div className="col-span-1 lg:col-span-7 max-w-lg w-full mx-auto">
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 start-0 w-full h-1.5 bg-gradient-to-r from-[#089981] via-[#00f2fe] to-blue-600" />

              {/* Progress Indicator Steps (Only shown for Step 1 & 2) */}
              {step !== 3 && (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2a2e39]">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                      step === 1 ? 'bg-[#089981] text-white shadow-md shadow-[#089981]/30' : 'bg-[#089981]/20 text-[#089981]'
                    }`}>
                      1
                    </div>
                    <span className={`text-xs font-bold ${step === 1 ? 'text-white' : 'text-[#787b86]'}`}>
                      {isAr ? 'بيانات الحساب والرمز' : 'Account Credentials'}
                    </span>
                  </div>

                  <div className="w-8 h-0.5 bg-[#2a2e39]" />

                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                      step === 2 ? 'bg-[#089981] text-white shadow-md shadow-[#089981]/30' : 'bg-[#2a2e39] text-[#787b86]'
                    }`}>
                      2
                    </div>
                    <span className={`text-xs font-bold ${step === 2 ? 'text-white' : 'text-[#787b86]'}`}>
                      {isAr ? 'الملف والتفضيلات' : 'Trader Preferences'}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Notification */}
              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-[#f23645]/10 border border-[#f23645]/30 text-[#f23645] text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 1: ACCOUNT CREDENTIALS & IDENTITY */}
              {/* ========================================================= */}
              {step === 1 && (
                <form onSubmit={handleProceedToStep2} className="space-y-3.5">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-extrabold text-white">
                      {isAr ? 'إنشاء حساب متداول جديد' : 'Create Trader Profile'}
                    </h2>
                    <p className="text-xs text-[#787b86] mt-0.5">
                      {isAr ? 'أدخل البيانات الأساسية لإنشاء حسابك في المنصة' : 'Enter your identity details to initialize your workspace'}
                    </p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#d1d4dc] mb-1">
                      {isAr ? 'الاسم الكامل' : 'Full Name'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={isAr ? 'أحمد المنصوري' : 'Alex Mercer'}
                        className="w-full ps-10 pe-4 py-2.5 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-[#d1d4dc] mb-1">
                      {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="trader@domain.com"
                        className="w-full ps-10 pe-4 py-2.5 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden transition-all font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#d1d4dc] mb-1">
                        {isAr ? 'كلمة المرور *' : 'Password *'}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full ps-10 pe-10 py-2.5 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden transition-all font-mono"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-[#787b86] hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#d1d4dc] mb-1">
                        {isAr ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full ps-10 pe-4 py-2.5 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden transition-all font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Proceed Button */}
                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#089981] to-[#067a67] hover:from-[#09a98e] hover:to-[#088a75] text-white font-bold text-xs shadow-lg shadow-[#089981]/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
                  >
                    <span>{isAr ? 'المتابعة للخطوة التالية' : 'Proceed to Trader Preferences'}</span>
                    <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Quick Google Option */}
                  <div className="mt-4 pt-3 border-t border-[#2a2e39]">
                    <button
                      type="button"
                      onClick={handleGoogleRegister}
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
                    <h2 className="text-xl font-extrabold text-white">
                      {isAr ? 'تفضيلات وتفاصيل المتداول' : 'Trader Profile & Experience'}
                    </h2>
                    <p className="text-xs text-[#787b86] mt-0.5">
                      {isAr ? 'ساعدنا في تخصيص التنبيهات ورسومات الشارت المناسبة لأسلوبك' : 'Customize your asset classes and signal notifications'}
                    </p>
                  </div>

                  {/* Phone & Country Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#d1d4dc] mb-1">
                        {isAr ? 'رقم الهاتف' : 'Phone Number'}
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+971 50 123 4567"
                          className="w-full ps-10 pe-4 py-2.5 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#d1d4dc] mb-1">
                        {isAr ? 'دولة الإقامة' : 'Country of Residence'}
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full ps-10 pe-4 py-2.5 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white focus:outline-hidden transition-all appearance-none cursor-pointer"
                        >
                          {COUNTRIES_LIST.map((c) => (
                            <option key={c} value={c} className="bg-[#1e222d] text-white">
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
                      <label className="block text-xs font-bold text-[#d1d4dc] mb-1">
                        {isAr ? 'تاريخ الميلاد' : 'Date of Birth'}
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full ps-10 pe-4 py-2.5 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white focus:outline-hidden transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#d1d4dc] mb-1">
                        {isAr ? 'مستوى الخبرة في التداول' : 'Trading Experience'}
                      </label>
                      <div className="relative">
                        <Award className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                        <select
                          value={experienceLevel}
                          onChange={(e) => setExperienceLevel(e.target.value as any)}
                          className="w-full ps-10 pe-4 py-2.5 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white focus:outline-hidden transition-all appearance-none cursor-pointer"
                        >
                          <option value="Beginner" className="bg-[#1e222d] text-white">{isAr ? 'مبتدئ (0 - 1 سنة)' : 'Beginner (0 - 1 yr)'}</option>
                          <option value="Intermediate" className="bg-[#1e222d] text-white">{isAr ? 'متوسط (1 - 3 سنوات)' : 'Intermediate (1 - 3 yrs)'}</option>
                          <option value="Advanced" className="bg-[#1e222d] text-white">{isAr ? 'متقدم (3 - 5+ سنوات)' : 'Advanced (3 - 5+ yrs)'}</option>
                          <option value="Institutional" className="bg-[#1e222d] text-white">{isAr ? 'مؤسسي / محترف' : 'Institutional / Professional'}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Preferred Asset Classes (Checkboxes) */}
                  <div>
                    <label className="block text-xs font-bold text-[#d1d4dc] mb-1.5">
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
                                ? 'bg-[#089981]/15 border-[#089981] text-white'
                                : 'bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white'
                            }`}
                          >
                            <span>{isAr ? opt.labelAr : opt.labelEn}</span>
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isChecked ? 'bg-[#089981] border-[#089981] text-white' : 'border-[#2a2e39]'
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
                    <label className="block text-xs font-bold text-[#d1d4dc] mb-1">
                      {isAr ? 'الأزواج والرموز المفضلة' : 'Favorite Trading Pairs'}
                    </label>
                    <div className="relative">
                      <TrendingUp className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                      <input
                        type="text"
                        value={favoritePairs}
                        onChange={(e) => setFavoritePairs(e.target.value)}
                        placeholder="e.g. US100, XAUUSD, EURUSD, BTCUSD"
                        className="w-full ps-10 pe-4 py-2.5 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-3 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-bold text-[#787b86] hover:text-white transition-colors cursor-pointer"
                    >
                      {isAr ? 'السابق' : 'Back'}
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#089981] to-[#067a67] hover:from-[#09a98e] hover:to-[#088a75] text-white font-bold text-xs shadow-lg shadow-[#089981]/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{isAr ? 'إتمام التسجيل وإرسال كود التفعيل' : 'Complete Account Registration'}</span>
                          <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================= */}
              {/* STEP 3: EMAIL VERIFICATION INSTRUCTION SCREEN */}
              {/* ========================================================= */}
              {step === 3 && (
                <div className="py-4 text-center space-y-5 animate-in fade-in zoom-in-95">
                  <div className="w-16 h-16 rounded-3xl bg-[#089981]/20 border border-[#089981]/40 text-[#089981] flex items-center justify-center mx-auto shadow-xl shadow-[#089981]/20">
                    <MailCheck className="w-8 h-8 animate-bounce" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-white">
                      {isAr ? 'تم إرسال رابط التأكيد إلى بريدك' : 'Verify Your Email Address'}
                    </h2>
                    <p className="text-xs text-[#787b86] mt-1.5 max-w-sm mx-auto leading-relaxed">
                      {isAr
                        ? 'لحماية حسابك وضمان أمان المنظومة، قمنا بإرسال رسالة تفعيل إلى البريد الإلكتروني:'
                        : 'To complete your account security check, a verification link has been dispatched to:'}
                    </p>
                    <div className="mt-2 inline-block px-3 py-1.5 rounded-xl bg-[#131722] border border-[#2a2e39] font-mono text-xs font-bold text-[#089981]">
                      {registeredEmail || email}
                    </div>
                  </div>

                  {/* Verification Instructions List */}
                  <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] text-start space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#089981]/20 text-[#089981] font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <span className="text-[#d1d4dc]">
                        {isAr ? 'افتح صندوق الوارد في بريدك الإلكتروني.' : 'Check your email inbox (and spam folder if needed).'}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#089981]/20 text-[#089981] font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <span className="text-[#d1d4dc]">
                        {isAr ? 'انقر على رابط التأكيد المرفق بالرسالة.' : 'Click the verification link provided in the message.'}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#089981]/20 text-[#089981] font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </div>
                      <span className="text-[#d1d4dc]">
                        {isAr ? 'عد إلى هنا وقم بتسجيل الدخول مباشرة إلى المنصة.' : 'Return here and click Sign In to access your workspace.'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={onNavigateLogin}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#089981] to-[#067a67] hover:from-[#09a98e] hover:to-[#088a75] text-white font-bold text-xs shadow-lg shadow-[#089981]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{isAr ? 'الانتقال لصفحة تسجيل الدخول' : 'Go to Sign In Page'}</span>
                      <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 py-3 text-center text-[11px] text-[#787b86] font-mono relative z-20 shrink-0">
        MBK Trading Desk Platform © 2026 • Encrypted Institutional Onboarding & Verified Access
      </footer>
    </div>
  );
};
