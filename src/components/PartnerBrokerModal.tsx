import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Zap,
  Gift,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PartnerBrokerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121927] border border-amber-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Top Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
            <Gift className="w-3.5 h-3.5" />
            <span>عرض حصري من إدارة وفريق أبحاث MBKtrading</span>
          </div>

          <h3 className="text-xl font-black text-slate-100">
            احصل على اشتراك <span className="text-amber-400">VIP مجاني مدى الحياة</span>
          </h3>

          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            تداول مع وسيط ECN مرخص عالمياً يتمتع بأقل سبريد في السوق وسرعة تنفيذ خارقة عبر خوادم London LD4 واحصل على كافة خدمات المنصة مجاناً 100%!
          </p>
        </div>

        {/* Value Perks Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-xs">
          <div className="p-2.5 rounded-lg bg-[#0c121d] border border-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-200">إشارات حية عبر الويب وتيليجرام (قيمة $99/شهرياً)</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0c121d] border border-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-200">تشغيل البوت الآلي بالكامل (قيمة $149/شهرياً)</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0c121d] border border-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-200">كافة مؤشرات Pine Script (قيمة $450)</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0c121d] border border-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-200">نسخ الصفقات المباشر بدون عمولة أرباح (0%)</span>
          </div>
        </div>

        {/* 3 Step Activation Guide */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div className="flex-1 text-xs">
              <span className="font-bold text-slate-200 block mb-1">
                افتح حساب تداول ECN حقيقي عبر رابط الشراكة:
              </span>
              <a
                href="https://partner-broker.example.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
              >
                <span>فتح حساب مع الوسيط المعتمد</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div className="flex-1 text-xs">
              <span className="font-bold text-slate-200 block mb-1">
                تأكد من إدخال كود الوكالة المعتمد (Partner Code):
              </span>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-[#080d15] text-amber-400 font-mono font-black text-sm border border-amber-500/30">
                  {ibCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'تم النسخ!' : 'نسخ الكود'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div className="flex-1 text-xs">
              <span className="font-bold text-slate-200 block mb-1">
                تأكيد رقم الحساب للتفعيل الفوري التلقائي:
              </span>

              {verifiedSuccess ? (
                <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم تفعيل عضويتك VIP المجانية مدى الحياة بنجاح! مرحباً بك في النخبة.</span>
                </div>
              ) : (
                <form onSubmit={handleVerify} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="رقم حساب MT4 / MT5 (مثال: 5938210)"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    تفعيل VIP الآن
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-500 border-t border-slate-800 pt-3">
          إذا واجهتك أي صعوبة في نقل حسابك الحالي تحت وكالتنا، تواصل مباشرة مع دعم MBK على تيليجرام @MBKsupport
        </div>
      </div>
    </div>
  );
};
