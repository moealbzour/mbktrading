import React, { useState } from 'react';
import { Ticket, ShieldCheck, CheckCircle2, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
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
}

// Approved VIP Promo codes
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
  currentUser
}) => {
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMsg('يرجى إدخال رمز ترويجي صالح');
      return;
    }

    // Check if code is in the allowed list or valid prefix
    const isValid =
      VALID_PROMO_CODES.includes(cleanCode) ||
      cleanCode.startsWith('MBK') ||
      cleanCode.startsWith('VIP') ||
      cleanCode.startsWith('IB');

    if (!isValid) {
      setErrorMsg(
        'الرمز المدخل غير صالح. الرموز المعتمدة: MBK2026, VIP2026, TELEGRAMVIP, IBPARTNER'
      );
      soundManager.playClick();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // If user has a Firebase UID, update users/{uid} in Firestore in real time!
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

    // Play victory sound & celebratory confetti
    soundManager.playProfitChime();
    confetti({
      particleCount: 120,
      spread: 80,
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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-['Cairo',sans-serif]">
      <div className="bg-[#121927] border-2 border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 left-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/40 shadow-lg shadow-amber-500/10">
            <Ticket className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-100">
            ترقية الحساب وتفعيل عضوية VIP الفورية
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            أدخل رمز الترويج لفتح كامل الإشارات الحية، وغرفة نقاش VIP، والتوصيات المحجوبة في لوحة التحكم فورياً.
          </p>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h4 className="text-base font-black text-emerald-400">
              تم تفعيل عضوية VIP بنجاح! 👑
            </h4>
            <p className="text-xs text-slate-300">
              تم تحديث حسابك وفتح كافة الإشارات الحية وغرف التحليلات بدون الحاجة لإعادة تحميل الصفحة.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-200 font-bold">رمز الترويج (Promo Code):</label>
                <span className="text-[10px] text-amber-400 font-mono">
                  MBK2026 • VIP2026 • TELEGRAMVIP • IBPARTNER
                </span>
              </div>

              <input
                type="text"
                autoFocus
                placeholder="أدخل الرمز هنا (مثال: MBK2026)"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                disabled={isSubmitting}
                className="w-full bg-[#0a0f18] border-2 border-amber-500/60 rounded-xl px-4 py-3 text-amber-300 placeholder-slate-600 font-mono text-center uppercase tracking-widest text-base font-black focus:outline-none focus:border-amber-400 shadow-inner"
              />

              {errorMsg && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400">رموز سريعة:</span>
              {['MBK2026', 'VIP2026', 'TELEGRAMVIP', 'IBPARTNER'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setCode(p);
                    setErrorMsg(null);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>جاري التحقق والتفعيل...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تفعيل VIP وفتح الصفقات فوراً</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="text-center text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800">
          عميل لدى أحد شركائنا؟ يمكنك تفعيل عضويتك مجاناً عبر تواصل مباشر مع فريق الدعم في التيليجرام.
        </div>
      </div>
    </div>
  );
};
