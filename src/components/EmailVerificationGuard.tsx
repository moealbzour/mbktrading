import React, { useState } from 'react';
import {
  MailCheck,
  ShieldAlert,
  ArrowRight,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Mail,
  ChevronLeft
} from 'lucide-react';
import { UserProfile } from '../types/trading';
import { soundManager } from '../utils/audio';
import { resendCurrentEmailVerification, signOutUser } from '../services/firebaseAuthService';
import { auth } from '../lib/firebase';

interface Props {
  user: UserProfile;
  onLogout: () => void;
  onVerifiedSuccess: () => void;
  lang?: 'ar' | 'en';
}

export const EmailVerificationGuard: React.FC<Props> = ({
  user,
  onLogout,
  onVerifiedSuccess,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkNotice, setCheckNotice] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    soundManager.playClick();
    try {
      const sent = await resendCurrentEmailVerification();
      if (sent) {
        setResendSent(true);
        soundManager.playProfitChime();
        setTimeout(() => setResendSent(false), 5000);
      }
    } catch (err: any) {
      console.warn('Resend verification notice:', err);
    } finally {
      setResending(false);
    }
  };

  const handleCheckReload = async () => {
    setChecking(true);
    soundManager.playClick();
    setCheckNotice(null);

    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          soundManager.playProfitChime();
          onVerifiedSuccess();
          return;
        }
      }
      setCheckNotice(
        isAr
          ? 'لم يتم تأكيد البريد الإلكتروني بعد. يرجى الضغط على الرابط في رسالتك أولاً.'
          : 'Email not verified yet. Please click the link in your verification email.'
      );
    } catch (err) {
      console.warn('Check reload error:', err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen h-[100dvh] w-full bg-[#131722] text-[#d1d4dc] flex flex-col justify-between font-sans relative overflow-hidden select-none antialiased p-4 sm:p-6"
    >
      {/* Background Architectural Patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e222d_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute -top-40 start-1/3 w-[500px] h-[500px] bg-[#089981]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 end-1/3 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 relative z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-white font-mono font-black text-lg flex items-center justify-center shadow-lg">
            MBK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-wider">
                MBK TRADING DESK
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                SECURITY GUARD
              </span>
            </div>
            <span className="text-[10px] text-[#787b86] block font-mono">
              EMAIL VERIFICATION MANDATORY
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-3.5 py-2 rounded-xl bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-bold text-red-400 hover:text-red-300 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </header>

      {/* Main Guard Card */}
      <main className="w-full max-w-lg mx-auto my-auto py-8 relative z-20">
        <div className="bg-[#1e222d] border border-[#2a2e39] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl text-center space-y-6">
          <div className="absolute top-0 start-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-[#089981] to-cyan-500" />

          {/* Animated Security Mail Icon */}
          <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
            <MailCheck className="w-10 h-10 animate-pulse" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white">
              {isAr ? 'تأكيد البريد الإلكتروني مطلوب' : 'Email Verification Required'}
            </h1>
            <p className="text-xs text-[#787b86] mt-2 max-w-md mx-auto leading-relaxed">
              {isAr
                ? 'لحماية حسابك ومنع البريد المزعج، يجب تأكيد ملكية البريد الإلكتروني قبل الوصول إلى شارت ومؤشرات التداول.'
                : 'To protect your account and ensure trading environment security, please verify your email before accessing the desk.'}
            </p>

            <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#131722] border border-[#2a2e39] font-mono text-xs font-bold text-[#089981]">
              <Mail className="w-3.5 h-3.5 text-[#089981]" />
              <span>{user.email}</span>
            </div>
          </div>

          {/* Feedback Notices */}
          {resendSent && (
            <div className="p-3 rounded-xl bg-[#089981]/15 border border-[#089981]/40 text-[#089981] text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'تم إعادة إرسال رابط التأكيد بنجاح! افحص صندوق الرسائل' : 'Verification link sent successfully! Check your inbox.'}</span>
            </div>
          )}

          {checkNotice && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{checkNotice}</span>
            </div>
          )}

          {/* Step Instructions */}
          <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] text-start space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <span className="text-[#d1d4dc]">
                {isAr ? 'افتح صندوق البريد الإلكتروني الخاص بك وافحص الرسائل الواردة.' : 'Open your email inbox and look for the verification email.'}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <span className="text-[#d1d4dc]">
                {isAr ? 'انقر على رابط التأكيد لتفعيل حسابك مع MBK Trading.' : 'Click the verification link in the email to activate your profile.'}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <span className="text-[#d1d4dc]">
                {isAr ? 'اضغط على زر "تحقق وإعادة تحديث الحساب" أدناه.' : 'Click "Verify & Refresh Status" below to enter the platform.'}
              </span>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleCheckReload}
              disabled={checking}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#089981] to-[#067a67] hover:from-[#09a98e] hover:to-[#088a75] text-white font-bold text-xs shadow-lg shadow-[#089981]/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {checking ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>{isAr ? 'تحقق وإعادة تحديث الحالة' : 'Verify & Refresh Status'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3 px-4 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-amber-400 hover:text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {resending ? (
                <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              ) : (
                <>
                  <MailCheck className="w-4 h-4" />
                  <span>{isAr ? 'إعادة إرسال رابط التأكيد' : 'Resend Verification Email'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-2 text-center text-[11px] text-[#787b86] font-mono relative z-20 shrink-0">
        MBK Trading Desk Platform © 2026 • Verified Trader Environment Protection
      </footer>
    </div>
  );
};
