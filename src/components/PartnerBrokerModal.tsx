import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Gift
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export const PartnerBrokerModal: React.FC<Props> = ({ isOpen, onClose, lang = 'ar' }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const ibCode = 'MBK-VIP-FREE';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ibCode);
    setCopiedCode(true);
    soundManager.playClick();
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) return;
    soundManager.playProfitChime();
    setVerifiedSuccess(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#1e222d] border border-[#363a45] rounded-xl max-w-xl w-full p-4 sm:p-6 shadow-2xl relative text-[#d1d4dc] my-auto max-h-[92dvh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-1 rounded-md bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Top Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a2e39] text-[#089981] border border-[#363a45] text-xs font-semibold">
            <Gift className="w-3.5 h-3.5" />
            <span>{isAr ? 'عرض حصري من MBKtrading' : 'Exclusive Partner Offer from MBKtrading'}</span>
          </div>

          <h3 className="text-xl font-bold text-white">
            {isAr ? 'احصل على اشتراك ' : 'Get '}
            <span className="text-[#089981]">{isAr ? 'VIP مجاني مدى الحياة' : 'Lifetime Free VIP'}</span>
          </h3>

          <p className="text-xs text-[#787b86] max-w-md mx-auto leading-relaxed">
            {isAr
              ? 'تداول مع وسيط معتمد ذو تنفيذ مؤسسي وسبريد منخفض واحصل على كافة خدمات المنصة ومؤشرات Pine Script مجاناً 100%.'
              : 'Trade with an institutional regulated broker with ultra-low spreads and receive 100% free lifetime access to all MBK signals and tools.'}
          </p>
        </div>

        {/* Value Perks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 text-xs">
          <div className="p-3 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#089981] shrink-0" />
            <span className="text-[#d1d4dc]">
              {isAr ? 'إشارات حية عبر الويب وتيليجرام (قيمة $99/شهرياً)' : 'Live signals via Web & Telegram ($99/mo value)'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#089981] shrink-0" />
            <span className="text-[#d1d4dc]">
              {isAr ? 'مستشار الذكاء الاصطناعي ومختبر الباك تيست' : 'AI Advisor & Backtest Lab access'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#089981] shrink-0" />
            <span className="text-[#d1d4dc]">
              {isAr ? 'حارس الحساب المموّل وإدارة المخاطر' : 'Prop Guardrails & risk alerts'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#089981] shrink-0" />
            <span className="text-[#d1d4dc]">
              {isAr ? 'غرفة نقاش المتداولين والمحللين المعتمدين' : 'Member discussion with verified analysts'}
            </span>
          </div>
        </div>

        {/* 3 Step Instructions */}
        <div className="bg-[#131722] border border-[#2a2e39] rounded-lg p-4 mb-6 space-y-3 text-xs">
          <h4 className="font-semibold text-white">
            {isAr ? 'خطوات التفعيل البسيطة (3 خطوات):' : 'Simple Setup Steps (3 Steps):'}
          </h4>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded bg-[#2a2e39] text-white flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
            <p className="text-[#787b86]">
              {isAr
                ? 'افتح حساب تداول حقيقي مع الوسيط المعتمد عبر الرابط الرسمي أدناه.'
                : 'Open a live trading account with the accredited partner broker.'}
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded bg-[#2a2e39] text-white flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
            <div className="flex-1">
              <span className="text-[#787b86]">
                {isAr ? 'أدخل رمز الشريك المعتمد (Partner Code):' : 'Enter the partner IB code:'}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <code className="bg-[#2a2e39] text-white px-2.5 py-1 rounded font-mono font-bold text-xs border border-[#363a45]">
                  {ibCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="px-2 py-1 rounded bg-[#2a2e39] hover:bg-[#363a45] text-xs text-[#d1d4dc] hover:text-white border border-[#363a45] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCode ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded bg-[#2a2e39] text-white flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
            <p className="text-[#787b86]">
              {isAr
                ? 'قم بتمويل حسابك بما لا يقل عن $250 وأدخل رقم الحساب لتأكيد تفعيل VIP الفوري.'
                : 'Fund with $250+ and submit your account ID below to activate instant VIP status.'}
            </p>
          </div>
        </div>

        {/* Verification Form */}
        {verifiedSuccess ? (
          <div className="p-4 rounded-lg bg-[#089981]/10 border border-[#089981]/30 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-[#089981] font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>{isAr ? 'تم استلام طلب التحقق بنجاح!' : 'Verification Request Received!'}</span>
            </div>
            <p className="text-xs text-[#787b86]">
              {isAr
                ? 'سيتم تدقيق رقم الحساب وربطه وتفعيل اشتراكك خلال دقائق. يمكنك أيضاً مراسلتنا على تيليجرام.'
                : 'Your account will be verified and connected within minutes. You can also contact support on Telegram.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#d1d4dc] mb-1">
                {isAr ? 'رقم حساب التداول لدى الوسيط:' : 'Broker Trading Account ID:'}
              </label>
              <input
                type="text"
                placeholder={isAr ? 'أدخل رقم الحساب (مثال: 8820419)' : 'e.g. 8820419'}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-[#131722] border border-[#363a45] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#787b86] font-mono focus:outline-none focus:border-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer"
              >
                {isAr ? 'تأكيد الحساب وتفعيل VIP ↵' : 'Confirm Account & Activate VIP ↵'}
              </button>
              <a
                href="https://t.me/mbktrading"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2.5 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-white border border-[#363a45] text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isAr ? 'الدعم الفني' : 'Support'}</span>
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
