import React, { useState } from 'react';
import { Ticket, ShieldCheck, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types/trading';
import { redeemActivationKey, KeyRedemptionResult } from '../utils/activationKeyService';
import { getFeatureLabel } from '../utils/entitlements';
import { auth } from '../lib/firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyCode: (code: string, result?: KeyRedemptionResult) => void;
  currentUser?: UserProfile | null;
  lang?: 'ar' | 'en';
}

export const PromoCodeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApplyCode,
  currentUser,
  lang = 'ar'
}) => {
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expiryInfo, setExpiryInfo] = useState<string | null>(null);
  const [redeemedResult, setRedeemedResult] = useState<KeyRedemptionResult | null>(null);

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMsg(isAr ? 'يرجى إدخال مفتاح تفعيل صالح' : 'Please enter a valid activation key');
      return;
    }

    const activeUid = currentUser?.uid || auth.currentUser?.uid;
    if (!activeUid || !auth.currentUser) {
      setErrorMsg(
        isAr
          ? 'يرجى تسجيل الدخول بحسابك أولاً لتفعيل رمز التفعيل'
          : 'Please sign in to your account first to redeem an activation key'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await redeemActivationKey(cleanCode, activeUid, currentUser?.email || auth.currentUser.email || undefined);

      soundManager.playProfitChime();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      const expiryFormatted =
        res.durationInDays >= 36500
          ? isAr
            ? 'مدى الحياة (Lifetime)'
            : 'Lifetime Access'
          : new Date(res.expiryDate).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

      setExpiryInfo(expiryFormatted);
      setRedeemedResult(res);
      setSuccess(true);

      setTimeout(() => {
        onApplyCode(cleanCode, res);
        setIsSubmitting(false);
        setSuccess(false);
        setRedeemedResult(null);
        setCode('');
        onClose();
      }, 1600);
    } catch (err: any) {
      soundManager.playClick();
      setErrorMsg(err.message || (isAr ? 'فشل التحقق من مفتاح التفعيل' : 'Failed to verify key'));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-[#131722]/45 dark:bg-black/80 dark:backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#FFFFFF] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#363a45] rounded-xl max-w-md w-full p-4 sm:p-6 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl relative text-[#131722] dark:text-[#d1d4dc] my-auto max-h-[92dvh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 end-4 p-1 rounded-md bg-[#EDF1F7] dark:bg-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white cursor-pointer transition-colors"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-lg bg-[#FDF6E3] dark:bg-amber-500/10 text-[#9A6700] dark:text-amber-400 flex items-center justify-center mx-auto mb-3 border border-[#EFE0B4] dark:border-amber-500/30">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#131722] dark:text-white">
            {isAr ? 'تفعيل باقة أو رمز تجريبي' : 'Redeem Activation / Trial Key'}
          </h3>
          <p className="text-xs text-[#787b86] mt-1.5 leading-relaxed">
            {isAr
              ? 'أدخل مفتاح التفعيل (VIP / Elite أو كود تجربة ميزة) الممنوح من الإدارة لفتحه فوراً على حسابك.'
              : 'Enter your single-use activation or trial key issued by an admin to unlock access immediately.'}
          </p>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#E6F5F2] dark:bg-[#089981]/20 border border-[#089981] text-[#089981] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-[#089981]">
              {redeemedResult?.grantTier === 'custom'
                ? isAr
                  ? 'تم تفعيل المزايا التجريبية بنجاح!'
                  : 'Trial Features Activated!'
                : redeemedResult?.grantTier === 'elite'
                ? isAr
                  ? 'تم تفعيل باقة Elite بنجاح!'
                  : 'Elite Tier Activated!'
                : isAr
                ? 'تم تفعيل مفتاح VIP بنجاح!'
                : 'VIP Activation Key Redeemed!'}
            </h4>
            {redeemedResult?.grantTier === 'custom' && redeemedResult.grantFeatures.length > 0 && (
              <div className="text-xs text-[#131722] dark:text-[#d1d4dc] bg-[#FFFFFF] dark:bg-[#131722] p-2.5 rounded-lg border border-[#E0E3EB] dark:border-[#2a2e39] space-y-1">
                {redeemedResult.grantFeatures.map((feat) => (
                  <div key={feat} className="font-semibold text-[#089981]">
                    ✓ {getFeatureLabel(feat, isAr)}
                  </div>
                ))}
              </div>
            )}
            {expiryInfo && (
              <p className="text-xs text-[#9A6700] dark:text-amber-400 font-mono font-bold bg-[#FDF6E3] dark:bg-amber-500/10 p-2 rounded-lg border border-[#EFE0B4] dark:border-amber-500/30">
                {isAr ? `الصلاحية: ${expiryInfo}` : `Valid until: ${expiryInfo}`}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[#131722] dark:text-[#d1d4dc] font-semibold">
                  {isAr ? 'مفتاح التفعيل (Activation Key):' : 'Activation Key:'}
                </label>
                <span className="text-[10px] text-[#787b86] font-mono">
                  e.g. MBK-30D-X9F2A8C1
                </span>
              </div>

              <input
                type="text"
                autoFocus
                placeholder={isAr ? 'أدخل رمز التفعيل الخاص بك' : 'Enter your activation key'}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                disabled={isSubmitting}
                className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#CBD2DF] dark:border-[#363a45] focus:border-amber-400 rounded-lg px-4 py-3 text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] font-mono text-center uppercase tracking-widest text-base font-bold focus:outline-none"
              />

              {errorMsg && (
                <div className="flex items-center gap-1.5 text-xs text-[#D93848] dark:text-[#f23645] mt-2 bg-[#FDECEE] dark:bg-[#f23645]/10 p-2.5 rounded-lg border border-[#F5C2C7] dark:border-[#f23645]/30">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-[#131722] hover:bg-[#2A2E39] text-white dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 dark:text-black font-bold text-sm dark:hover:brightness-110 transition-all cursor-pointer shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>{isAr ? 'جارِ التحقق من المفتاح...' : 'Verifying Key...'}</span>
              ) : (
                <span>{isAr ? 'تأكيد المفتاح وتفعيل VIP ↵' : 'Activate VIP Key ↵'}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
