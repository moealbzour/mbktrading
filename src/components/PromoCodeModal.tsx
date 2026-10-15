import React, { useState } from 'react';
import { Ticket, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/trading';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyCode: (code: string) => void;
  currentUser?: UserProfile | null;
  lang?: 'ar' | 'en';
}

const VALID_PROMO_CODES = [
  'MBK2026',
  'VIP2026',
  'TELEGRAMVIP',
  'IBPARTNER',
  'MBKVIP',
  'ALPHA2026'
];

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

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMsg(isAr ? 'يرجى إدخال رمز ترويجي صالح' : 'Please enter a valid promo code');
      return;
    }

    const isValid =
      VALID_PROMO_CODES.includes(cleanCode) ||
      cleanCode.startsWith('MBK') ||
      cleanCode.startsWith('VIP') ||
      cleanCode.startsWith('IB');

    if (!isValid) {
      setErrorMsg(
        isAr
          ? 'الرمز غير صالح. الرموز المعتمدة: MBK2026, VIP2026, TELEGRAMVIP, IBPARTNER'
          : 'Invalid promo code. Approved codes: MBK2026, VIP2026, TELEGRAMVIP, IBPARTNER'
      );
      soundManager.playClick();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (currentUser?.uid) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          role: 'VIP',
          promoCode: cleanCode,
          planName: `عضوية VIP مفعلة (${cleanCode})`,
          updatedAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.warn('[PromoCodeModal] Firestore update notice:', err?.message || err);
    }

    soundManager.playProfitChime();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setSuccess(true);

    setTimeout(() => {
      onApplyCode(cleanCode);
      setIsSubmitting(false);
      setSuccess(false);
      setCode('');
      onClose();
    }, 1100);
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#1e222d] border border-[#363a45] rounded-xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative text-[#d1d4dc] my-auto max-h-[92dvh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 end-4 p-1 rounded-md bg-[#2a2e39] text-[#787b86] hover:text-white cursor-pointer transition-colors"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-lg bg-[#2a2e39] text-[#089981] flex items-center justify-center mx-auto mb-3 border border-[#363a45]">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">
            {isAr ? 'ترقية الحساب وتفعيل عضوية VIP' : 'Upgrade Account & Activate VIP'}
          </h3>
          <p className="text-xs text-[#787b86] mt-1.5 leading-relaxed">
            {isAr
              ? 'أدخل رمز الترويج لفتح كامل الإشارات الحية وميزات MBK Desk المتقدمة فورياً.'
              : 'Enter promo code to instantly unlock all live signals and advanced MBK Desk features.'}
          </p>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#089981]/20 border border-[#089981] text-[#089981] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-[#089981]">
              {isAr ? 'تم تفعيل عضوية VIP بنجاح!' : 'VIP Membership Activated!'}
            </h4>
            <p className="text-xs text-[#787b86]">
              {isAr
                ? 'تم تحديث حسابك وفتح كافة الإشارات وأدوات التحليل المتقدمة.'
                : 'Your account has been updated with full access to live signals and tools.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[#d1d4dc] font-semibold">
                  {isAr ? 'رمز الترويج (Promo Code):' : 'Promo Code:'}
                </label>
                <span className="text-[10px] text-[#787b86] font-mono">
                  MBK2026 • VIP2026 • IBPARTNER
                </span>
              </div>

              <input
                type="text"
                autoFocus
                placeholder={isAr ? 'مثال: MBK2026' : 'e.g. MBK2026'}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                disabled={isSubmitting}
                className="w-full bg-[#131722] border border-[#363a45] focus:border-white rounded-lg px-4 py-3 text-white placeholder-[#787b86] font-mono text-center uppercase tracking-widest text-base font-bold focus:outline-none"
              />

              {errorMsg && (
                <div className="flex items-center gap-1.5 text-xs text-[#f23645] mt-2 bg-[#f23645]/10 p-2.5 rounded-lg border border-[#f23645]/30">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-sm transition-all cursor-pointer shadow flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>{isAr ? 'جارِ التحقق...' : 'Verifying...'}</span>
              ) : (
                <span>{isAr ? 'تأكيد وتفعيل العضوية ↵' : 'Confirm & Activate VIP ↵'}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
