import React, { useState } from 'react';
import { CreditCard, Check, Zap, Crown, ShieldCheck, Flame } from 'lucide-react';

interface Props {
  onOpenBrokerModal: () => void;
}

export const SubscriptionPanel: React.FC<Props> = ({ onOpenBrokerModal }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'partner-broker',
      nameAr: 'شراكة الوسيط المعتمد (مجاناً مدى الحياة)',
      badge: 'الأكثر شعبية وتوفيراً 🔥',
      price: 0,
      priceDesc: 'مجاناً 100% مدى الحياة',
      popular: true,
      perks: [
        'إشارات تداول ناسداك والذهب اللحظية',
        'تفعيل بوت التداول الآلي MT5 بدون قيود',
        'خدمة نسخ الصفقات بدون اقتطاع أرباح (0%)',
        'كافة مؤشرات MBK في تريدنج فيو مجاناً',
        'دخول غرفة VIP الخاصة وقناة التليجرام',
        'دعم فني مباشر على مدار الساعة'
      ],
      ctaText: 'احصل على VIP مجاناً عبر الوسيط',
      action: onOpenBrokerModal
    },
    {
      id: 'vip-pass',
      nameAr: 'اشتراك VIP المباشر (Direct Pass)',
      badge: 'دفع شهري مستقل',
      price: billingCycle === 'monthly' ? 99 : 790,
      priceDesc: billingCycle === 'monthly' ? 'شهرياً' : 'سنوياً (وفر شهرين)',
      popular: false,
      perks: [
        'إشارات تداول ناسداك والذهب اللحظية',
        'تفعيل بوت التداول الآلي بحسابك الخاص',
        'دخول غرفة نقاش مجتمع MBK',
        'تحليلات الذكاء الاصطناعي اليومية',
        'الدفع عبر البطاقة البنكية أو USDT'
      ],
      ctaText: 'اشترك بالدفع المباشر (Crypto / Card)',
      action: () => alert('تم توجيهك لبوابة الدفع الآمنة (Crypto USDT TRC20 / Stripe)...')
    }
  ];

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>خطط الاشتراك وترقية حسابات VIP</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Exclusive Access
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              اختر خطة الاشتراك المناسبة لك أو استفد من الشراكة الرسمية للتفعيل المجاني
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                p.popular
                  ? 'bg-gradient-to-b from-[#182337] to-[#111827] border-amber-500/50 shadow-xl shadow-amber-500/10 relative'
                  : 'bg-[#141b29] border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${
                      p.popular
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-100 mb-1">{p.nameAr}</h3>

                <div className="my-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-100 font-mono">
                    ${p.price}
                  </span>
                  <span className="text-xs text-slate-400 font-sans">{p.priceDesc}</span>
                </div>

                <div className="space-y-2.5 my-6">
                  {p.perks.map((perk, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-200">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={p.action}
                className={`w-full py-3 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer ${
                  p.popular
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/25'
                }`}
              >
                {p.ctaText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
