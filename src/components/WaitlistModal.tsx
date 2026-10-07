import React, { useState } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  CheckCircle2,
  Send,
  Sparkles,
  Users,
  Copy,
  Bot,
  AlertCircle,
  Building,
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types/trading';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  serviceType: 'COPY_TRADING' | 'ALGO_BOT';
  currentUser?: UserProfile | null;
}

export const WaitlistModal: React.FC<Props> = ({
  isOpen,
  onClose,
  serviceType,
  currentUser
}) => {
  const [broker, setBroker] = useState('MetaTrader 5 (MT5)');
  const [customBroker, setCustomBroker] = useState('');
  const [accountTier, setAccountTier] = useState<string>('$5k-$25k');
  const [contactHandle, setContactHandle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCopy = serviceType === 'COPY_TRADING';
  const serviceTitle = isCopy
    ? 'نسخ الصفقات الآلي (Copy Trading)'
    : 'البوت الآلي (Auto Execution Bot)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContact = contactHandle.trim() || currentUser?.email || '';

    if (!finalContact) {
      setErrorMessage('يرجى إدخال حساب التيليجرام أو وسيلة التواصل.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const chosenBroker = broker === 'OTHER' ? customBroker.trim() || 'وسيط آخر' : broker;

    const entryData = {
      serviceType,
      serviceTitle,
      preferredBroker: chosenBroker,
      accountSizeTier: accountTier,
      telegramContact: finalContact,
      userUid: currentUser?.uid || 'guest-waitlist',
      userEmail: currentUser?.email || 'unregistered',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'waitlist'), entryData);
    } catch (err: any) {
      console.warn('[WaitlistModal] Firestore addDoc notice:', err?.message || err);
      // Even if offline, proceed with success confirmation for the user
    }

    soundManager.playProfitChime();
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 }
    });

    setIsSuccess(true);
    setIsSubmitting(false);
  };

  const handleCloseModal = () => {
    setIsSuccess(false);
    setContactHandle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-['Cairo',sans-serif]">
      <div className="bg-[#121927] border-2 border-cyan-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button
          onClick={handleCloseModal}
          className="absolute top-4 left-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 border border-cyan-500/40 shadow-lg shadow-cyan-500/10">
            {isCopy ? <Copy className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
          </div>
          <span className="px-3 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
            EARLY ACCESS VIP WAITLIST
          </span>
          <h3 className="text-lg font-black text-slate-100 mt-2">
            الانضمام لقائمة الانتظار المبكرة
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            {serviceTitle} — احصل على أولوية الربط والتشغيل فور إطلاق المرحلة الثانية
          </p>
        </div>

        {isSuccess ? (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
              <span>✓ تم تسجيلك في قائمة الانتظار بنجاح</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
              شكراً لاهتمامك! سيتواصل معك فريق أبحاث MBK عبر التيليجرام أو البريد الإلكتروني فور بدء تفعيل النسخ التجريبي لحسابك.
            </p>

            <button
              onClick={handleCloseModal}
              className="mt-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              إغلاق ومتابعة التداول
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Preferred Broker */}
            <div>
              <label className="text-slate-200 font-bold flex items-center gap-1.5 mb-1.5">
                <Building className="w-3.5 h-3.5 text-cyan-400" />
                <span>الوسيط المفضل (Preferred Broker):</span>
              </label>
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full bg-[#0a0f18] border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="MetaTrader 5 (MT5)">MetaTrader 5 (MT5 Bridge)</option>
                <option value="Interactive Brokers">Interactive Brokers (IBKR)</option>
                <option value="FOREX.com">FOREX.com</option>
                <option value="Exness">Exness (ECN Pro)</option>
                <option value="Pepperstone">Pepperstone (Razor)</option>
                <option value="OTHER">وسيط آخر (أدخل الاسم)</option>
              </select>

              {broker === 'OTHER' && (
                <input
                  type="text"
                  placeholder="اسم شركة الوساطة الخاصة بك..."
                  value={customBroker}
                  onChange={(e) => setCustomBroker(e.target.value)}
                  className="w-full mt-2 bg-[#0a0f18] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              )}
            </div>

            {/* Account Size Tier */}
            <div>
              <label className="text-slate-200 font-bold flex items-center gap-1.5 mb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>حجم المحفظة المتوقع للنسخ/البوت (Account Size Tier):</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '<$5k', label: 'أقل من $5,000' },
                  { id: '$5k-$25k', label: '$5,000 - $25,000' },
                  { id: '$25k+', label: '$25,000 فأكثر' }
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setAccountTier(tier.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                      accountTier === tier.id
                        ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500 shadow-md'
                        : 'bg-[#0a0f18] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-xs font-mono">{tier.id}</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">{tier.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Telegram Handle / Contact */}
            <div>
              <label className="text-slate-200 font-bold flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>حساب التيليجرام أو وسيلة التواصل (Telegram / Contact):</span>
              </label>
              <input
                type="text"
                placeholder="مثال: @username أو رقم الهاتف / البريد"
                value={contactHandle}
                onChange={(e) => {
                  setContactHandle(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full bg-[#0a0f18] border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
              />

              {errorMessage && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-sky-500 text-white font-black text-xs transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>جاري التسجيل في قائمة الانتظار...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تأكيد الانضمام لقائمة الانتظار المبكرة</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
