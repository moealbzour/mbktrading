import React from 'react';
import {
  Sparkles,
  Check,
  ShieldCheck,
  Zap,
  Ticket,
  Bot,
  Layers,
  ArrowRight
} from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface Props {
  onOpenPromoModal: () => void;
  onOpenBrokerModal: () => void;
  isVIP?: boolean;
}

export const PricingPlans: React.FC<Props> = ({ onOpenPromoModal, onOpenBrokerModal, isVIP }) => {
  const plans = [
    {
      id: 'starter',
      name: 'Starter Desk',
      nameAr: 'الحساب المجاني (Starter)',
      price: '$0',
      period: 'مدى الحياة',
      badge: 'متاح للجميع',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
      description: 'مثالي للمبتدئين لتتبع جلسات الأسواق والأجندة والمحفظة التجريبية',
      features: [
        'غرفة الأسواق وجلسات التداول (MBK Desk)',
        'الأجندة الاقتصادية عالية التأثير مع العد التنازلي',
        'محفظة التداول الافتراضية ($100,000 Paper Trading)',
        'سجل الصفقات اليدوي الأساسي',
        'مخطط الرسوم البيانية اللحظية (TradingView)',
        'غرفة النقاش العامة'
      ],
      ctaText: 'حسابك الحالي',
      ctaDisabled: true
    },
    {
      id: 'pro',
      name: 'Pro Trader',
      nameAr: 'باقة المحترفين (Pro Trader)',
      price: '$29',
      period: '/ شهرياً (أو مجاناً برمز VIP)',
      badge: 'الأكثر شعبية ⭐',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      description: 'مزامنة حسابات الوسطاء، مختبر الباك تيست، ومستشار الذكاء الاصطناعي',
      features: [
        'جميع مزايا باقة Starter Desk',
        'المزامنة التلقائية مع MT4 / MT5 / Bybit / Binance',
        'مختبر الباك تيست والمحاكاة الإحصائية (Backtest Lab)',
        'مستشار الذكاء الاصطناعي المؤسسي (AI Advisor)',
        'تصدير واستيراد بيانات CSV غير محدود',
        'إشارات التداول المؤسسية اللحظية (SMC Signals)',
        'دعم فني سريع عبر التلغرام'
      ],
      isPopular: true,
      ctaText: isVIP ? 'مفعلة في حسابك 👑' : 'تفعيل بالرمز الترويجي / الوسيط',
      ctaHighlight: true
    },
    {
      id: 'elite',
      name: 'Elite AI',
      nameAr: 'باقة النخبة (Elite AI)',
      price: '$59',
      period: '/ شهرياً (أو عبر شراكة الوسيط)',
      badge: 'الذكاء الاصطناعي الكامل 🤖',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: 'المدرب السلوكي الشامل، تحليل عادات التداول، ومكتبة Playbooks غير المحدودة',
      features: [
        'جميع مزايا باقة Pro Trader',
        'مراجعة الصفقات بالذكاء الاصطناعي (30/60/90-Day AI Trade Review)',
        'تقرير المدرب السلوكي الأسبوعي (Weekly AI Coach)',
        'رؤية الشارت المؤسسية (AI Chart Vision)',
        'مكتبة نماذج التداول الكاملة وتخصيص Playbooks غير محدود',
        'غرفة تحليلات VIP الحية المتصلة بقاعدة البيانات',
        'أولوية الربط في البوت الآلي ونسخ الصفقات'
      ],
      ctaText: isVIP ? 'مفعلة لك بالكامل 👑' : 'ترقية إلى Elite AI الآن'
    }
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-2xl border border-slate-800 p-6 bg-gradient-to-br from-slate-900/95 via-[#0e1628] to-slate-900/95 shadow-2xl text-center max-w-3xl mx-auto space-y-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
          MBK TRADING PRICING & TIERS
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-100">
          خطط الاشتراك ومستويات العضوية المؤسسية
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          اختر الباقة المناسبة لاحتياجاتك، أو احصل على تفعيل مجاني فوري عبر إدخال الرمز الترويجي (Promo Code) أو عبر شراكة الوسيط المعتمد.
        </p>
      </div>

      {/* 3 PLANS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl p-6 border flex flex-col justify-between transition-all relative ${
              plan.isPopular
                ? 'bg-[#101828] border-cyan-500 shadow-2xl shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                : 'bg-[#0f1422] border-slate-800 shadow-xl'
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 font-black text-[10px] px-3 py-0.5 rounded-full shadow-md">
                الخيار الأفضل للمتداولين
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${plan.badgeColor}`}>
                  {plan.badge}
                </span>
                <span className="font-mono text-xs text-slate-400">{plan.name}</span>
              </div>

              <h3 className="text-base font-black text-slate-100 mb-1">{plan.nameAr}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{plan.description}</p>

              <div className="mb-6 flex items-baseline gap-1.5 border-b border-slate-800/80 pb-4">
                <span className="text-3xl font-black font-mono text-slate-100">{plan.price}</span>
                <span className="text-xs text-slate-400 font-mono">{plan.period}</span>
              </div>

              {/* FEATURES LIST */}
              <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <button
                disabled={plan.ctaDisabled && !isVIP}
                onClick={() => {
                  soundManager.playClick();
                  if (plan.id === 'starter') return;
                  onOpenPromoModal();
                }}
                className={`w-full py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  plan.isPopular
                    ? 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-cyan-600/25'
                    : plan.id === 'elite'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>{plan.ctaText}</span>
              </button>

              <button
                onClick={onOpenBrokerModal}
                className="w-full text-center text-[11px] text-slate-400 hover:text-cyan-400 mt-2.5 transition-colors cursor-pointer"
              >
                تفعيل مجاني عبر حساب وسيط معتمد ➔
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
