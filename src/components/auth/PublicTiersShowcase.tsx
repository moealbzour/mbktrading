import React, { useState } from 'react';
import { Check, Crown, Gem, Lock, Headphones } from 'lucide-react';
import { ELITE_LOCK_BADGE_TEXT, ELITE_UNRELEASED_FEATURES } from '../../utils/entitlements';
import { soundManager } from '../../utils/audio';
import { PaymentModal } from '../modals/PaymentModal';
import { SupportDeskModal } from '../modals/SupportDeskModal';

interface PublicTiersShowcaseProps {
  lang?: 'ar' | 'en';
  onFocusAuth?: () => void;
}

export const PublicTiersShowcase: React.FC<PublicTiersShowcaseProps> = ({
  lang = 'ar',
  onFocusAuth
}) => {
  const isAr = lang === 'ar';
  const [paymentModalPlan, setPaymentModalPlan] = useState<'vip' | 'elite' | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const freeFeatures = isAr
    ? [
        'التوصيات العامة المجانية',
        'الشات العام (General Chat)',
        'حاسبة المخاطرة واللوت',
        'التداول التجريبي ($100K)',
        'التقويم الاقتصادي والأخبار',
        'أكاديمية MBK'
      ]
    : [
        'Free Public Signals',
        'General Chat access',
        'Position Size & Risk Calculator',
        'Paper Trading ($100K)',
        'Economic Calendar & MBK News',
        'MBK Academy'
      ];

  const vipFeatures = isAr
    ? [
        'جميع مزايا الباقة المجانية ($0)',
        'تنبيهات بوت MBK الفورية',
        'توصيات VIP الكاملة (الدخول والأهداف وSL)',
        'ذكاء MBK (MBK AI)'
      ]
    : [
        'All Free Tier ($0) tools included',
        'Live MBK Bot alerts',
        'Full VIP Signals (Entries, TP, SL)',
        'MBK AI Assistant'
      ];

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-5">
      {/* Editorial Intro Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#4A5162] dark:text-[#8a93a6]">
          <span className="text-[#089981] font-bold">MBK Trading</span>
          <span aria-hidden="true">·</span>
          <span>{isAr ? 'بوت MBK • توصيات • شات عام • أخبار' : 'MBK Bot • Signals • General Chat • News'}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131722] dark:text-white leading-tight [text-wrap:balance]">
          {isAr
            ? 'اختر الباقة المناسبة وابدأ التداول بثقة'
            : 'Choose Your Membership Tier & Start Trading'}
        </h1>

        <p className="text-xs sm:text-sm text-[#4A5162] dark:text-[#8a93a6] leading-relaxed max-w-2xl">
          {isAr
            ? 'اطّلع على جميع مزايا الباقات الثلاث بوضوح قبل إنشاء حسابك أو تسجيل الدخول. يمكنك البدء مجاناً فوراً أو الترقية إلى VIP و Elite.'
            : 'Compare all three plans clearly while creating your account. Start immediately on the Free plan or subscribe to VIP or Elite.'}
        </p>
      </div>

      {/* 3-Tier Cards Grid (Always Fully Visible Directly on Front Page) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* 1. FREE TIER ($0) */}
        <article className="rounded-2xl p-4 sm:p-5 bg-[#FFFFFF] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 text-[11px] font-semibold text-[#4A5162] dark:text-[#8a93a6]">
              <span>{isAr ? 'الباقة الأساسية' : 'Starter Plan'}</span>
              <span className="font-mono tabular-nums text-[#089981]">$0</span>
            </div>

            <h2 className="text-base font-extrabold text-[#131722] dark:text-white">
              {isAr ? 'Free — الباقة المجانية' : 'Free Tier'}
            </h2>
            <div className="mt-2 mb-4 pb-3 border-b border-[#E0E3EB] dark:border-[#2a2e39] flex items-baseline gap-1 font-mono tabular-nums">
              <span className="text-2xl font-black text-[#131722] dark:text-white">$0</span>
              <span className="text-[11px] text-[#787b86]">
                {isAr ? '/ مجاناً دائماً' : '/ forever'}
              </span>
            </div>

            <ul className="space-y-2 text-xs text-[#131722] dark:text-[#d1d4dc] mb-5">
              {freeFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#089981] shrink-0 mt-0.5" />
                  <span className="leading-snug">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onFocusAuth?.();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#131722] dark:text-white font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            {isAr ? 'ابدأ مجاناً ($0)' : 'Start Free ($0)'}
          </button>
        </article>

        {/* 2. VIP TIER ($100/mo) */}
        <article className="rounded-2xl p-4 sm:p-5 bg-[#FFFFFF] dark:bg-[#1e222d] border-2 border-[#089981] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 text-[11px] font-bold text-[#089981]">
              <span className="flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'الأكثر طلباً' : 'Most Popular'}</span>
              </span>
              <span className="font-mono tabular-nums">$100/mo</span>
            </div>

            <h2 className="text-base font-extrabold text-[#131722] dark:text-white">
              {isAr ? 'VIP — الباقة الاحترافية' : 'VIP Tier'}
            </h2>
            <div className="mt-2 mb-4 pb-3 border-b border-[#E0E3EB] dark:border-[#2a2e39] flex items-baseline gap-1 font-mono tabular-nums">
              <span className="text-2xl font-black text-[#131722] dark:text-white">$100</span>
              <span className="text-[11px] text-[#4A5162] dark:text-[#8a93a6]">{isAr ? '/ شهرياً' : '/ month'}</span>
            </div>

            <ul className="space-y-2 text-xs text-[#131722] dark:text-[#d1d4dc] mb-5">
              {vipFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#089981] shrink-0 mt-0.5" />
                  <span className="leading-snug">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setPaymentModalPlan('vip');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Crown className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'اشترك في VIP ($100)' : 'Subscribe VIP ($100)'}</span>
          </button>
        </article>

        {/* 3. ELITE TIER ($500/mo) */}
        <article className="rounded-2xl p-4 sm:p-5 bg-[#FFFFFF] dark:bg-[#1e222d] border border-[#EFE0B4] dark:border-amber-500/50 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 text-[11px] font-bold text-[#9A6700] dark:text-amber-400">
              <span className="flex items-center gap-1">
                <Gem className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'النخبة المؤسسية' : 'Institutional'}</span>
              </span>
              <span className="font-mono tabular-nums">$500/mo</span>
            </div>

            <h2 className="text-base font-extrabold text-[#131722] dark:text-white">
              {isAr ? 'Elite — باقة النخبة' : 'Elite Tier'}
            </h2>
            <div className="mt-2 mb-4 pb-3 border-b border-[#E0E3EB] dark:border-[#2a2e39] flex items-baseline gap-1 font-mono tabular-nums">
              <span className="text-2xl font-black text-[#9A6700] dark:text-amber-400">$500</span>
              <span className="text-[11px] text-[#4A5162] dark:text-[#8a93a6]">{isAr ? '/ شهرياً' : '/ month'}</span>
            </div>

            <div className="space-y-2 text-xs mb-5">
              <div className="flex items-start gap-2 text-[#131722] dark:text-[#d1d4dc]">
                <Check className="w-3.5 h-3.5 text-[#089981] shrink-0 mt-0.5" />
                <span className="font-bold leading-snug">
                  {isAr ? 'جميع مزايا باقة VIP ($100)' : 'Everything in VIP ($100)'}
                </span>
              </div>

              <div className="pt-2 border-t border-[#E0E3EB] dark:border-[#2a2e39]/80 divide-y divide-[#E0E3EB] dark:divide-[#2a2e39]/60">
                {ELITE_UNRELEASED_FEATURES.map((mod) => (
                  <div key={mod.key} className="py-2 first:pt-1 last:pb-0">
                    <div className="text-[11px] font-bold text-[#131722] dark:text-white flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-[#9A6700] dark:text-amber-400 shrink-0" />
                      <span>🔒 {isAr ? mod.titleAr : mod.titleEn}</span>
                    </div>
                    <div className="text-[10px] text-[#9A6700] dark:text-amber-300 mt-0.5 leading-snug">
                      {ELITE_LOCK_BADGE_TEXT}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setPaymentModalPlan('elite');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#131722] font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Headphones className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'اشترك في Elite ($500)' : 'Subscribe Elite ($500)'}</span>
          </button>
        </article>
      </div>

      {/* Checkout Modal for Visitors clicking VIP / Elite */}
      <PaymentModal
        isOpen={Boolean(paymentModalPlan)}
        onClose={() => setPaymentModalPlan(null)}
        selectedPlan={paymentModalPlan || 'vip'}
        onContactSupport={() => setSupportModalOpen(true)}
        lang={lang}
      />

      <SupportDeskModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        lang={lang}
      />
    </div>
  );
};
