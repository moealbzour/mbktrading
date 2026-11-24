import React, { useEffect, useState } from 'react';
import {
  Check,
  Crown,
  Gem,
  Lock,
  ShieldCheck,
  Ticket
} from 'lucide-react';
import { UserProfile } from '../../types/trading';
import {
  ELITE_LOCK_BADGE_TEXT,
  ELITE_UNRELEASED_FEATURES,
  getEffectiveTier
} from '../../utils/entitlements';
import {
  fetchPlanPricingSettings,
  getCachedPlanPricingSettings,
  PlanPricingSettings
} from '../../services/platformSettingsService';
import { soundManager } from '../../utils/audio';

interface PricingPlansProps {
  user?: UserProfile | null;
  onSelectPlan?: (plan: 'vip' | 'elite') => void;
  onOpenPromoModal: () => void;
  onOpenBrokerModal?: () => void;
  isVIP?: boolean;
  lang?: 'ar' | 'en';
}

export const PricingPlans: React.FC<PricingPlansProps> = ({
  user,
  onSelectPlan,
  onOpenPromoModal,
  isVIP,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const effectiveTier = user ? getEffectiveTier(user) : isVIP ? 'vip' : 'free';
  const [planPricing, setPlanPricing] = useState<PlanPricingSettings>(() =>
    getCachedPlanPricingSettings()
  );

  useEffect(() => {
    fetchPlanPricingSettings(false)
      .then((p) => setPlanPricing(p))
      .catch(() => {});
  }, []);

  const displayVipUsd = planPricing.syncToPublicPlans ? planPricing.vipMonthlyUsd : 100;
  const displayEliteUsd = planPricing.syncToPublicPlans ? planPricing.eliteMonthlyUsd : 500;

  const freeFeatures = isAr
    ? [
        'التوصيات العامة المجانية',
        'الشات العام (General Chat)',
        'حاسبة المخاطرة واللوت',
        'التداول التجريبي ($100K)',
        'التقويم الاقتصادي وأخبار MBK',
        'أكاديمية MBK'
      ]
    : [
        'Free Public Signals',
        'General Chat access',
        'Risk & position-size calculators',
        'Paper Trading ($100K)',
        'Economic Calendar & MBK News',
        'MBK Academy'
      ];

  const vipFeatures = isAr
    ? [
        'جميع مزايا الباقة المجانية',
        'تنبيهات بوت MBK الفورية بالكامل',
        'جميع توصيات VIP الكاملة (نقاط الدخول والأهداف)',
        'ذكاء MBK (MBK AI)'
      ]
    : [
        'All Free Tier tools included',
        'Full live MBK Bot alerts',
        'Full VIP Signals (Entries, TP1/TP2, SL)',
        'MBK AI Assistant'
      ];

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#2a2e39] p-5 sm:p-6 bg-[#1e222d] text-center max-w-3xl mx-auto space-y-2">
        <div className="text-xs font-bold text-[#089981]">
          MBK Trading
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          {isAr ? 'اختر خطة التداول المناسبة لك' : 'Choose Your Trading Plan'}
        </h2>
        <p className="text-xs sm:text-sm text-[#8a93a6] leading-relaxed">
          {isAr
            ? 'ابدأ مجاناً بالأدوات الأساسية، أو قم بالترقية إلى VIP و Elite، أو فعّل رمزاً ترويجياً أو تجربة مجانية لميزة محددة.'
            : 'Start free with core desk tools, upgrade to VIP or Elite, or redeem an activation / trial key.'}
        </p>
      </div>

      {/* 3-Tier Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* 1. FREE TIER ($0) */}
        <div className="rounded-2xl p-5 sm:p-6 border border-[#2a2e39] bg-[#1e222d] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-[#8a93a6]">
                {isAr ? 'للبداية والتدريب' : 'Essential Access'}
              </span>
              {effectiveTier === 'free' && (
                <span className="text-[11px] font-bold text-[#089981] whitespace-nowrap">
                  {isAr ? 'باقتك الحالية' : 'Current Plan'}
                </span>
              )}
            </div>

            <h3 className="text-lg font-extrabold text-white mb-1">
              {isAr ? 'الباقة المجانية (Free Tier)' : 'Free Tier'}
            </h3>
            <p className="text-xs text-[#787b86] mb-4">
              {isAr
                ? 'أدوات التداول الأساسية وبوت الإشارات المجاني'
                : 'Core market tools, Academy, and limited signals'}
            </p>

            <div className="mb-5 pb-4 border-b border-[#2a2e39] flex items-baseline gap-1.5 font-mono tabular-nums">
              <span className="text-3xl font-black text-white">$0</span>
              <span className="text-xs text-[#787b86]">
                {isAr ? '/ مجاناً دائماً' : '/ forever free'}
              </span>
            </div>

            <ul className="space-y-2.5 text-xs text-[#d1d4dc] mb-6">
              {freeFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#089981] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            disabled
            className="w-full py-3 px-4 rounded-xl bg-[#131722] border border-[#2a2e39] text-[#8a93a6] font-bold text-xs cursor-default whitespace-nowrap"
          >
            {effectiveTier === 'free'
              ? isAr
                ? 'مفعل حالياً ($0)'
                : 'Active Plan ($0)'
              : isAr
              ? 'مشمول في حسابك'
              : 'Included in Account'}
          </button>
        </div>

        {/* 2. VIP TIER ($100/mo) */}
        <div className="rounded-2xl p-5 sm:p-6 border-2 border-[#089981] bg-[#1e222d] flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-[#089981] flex items-center gap-1.5">
                <Crown className="w-4 h-4" />
                <span>{isAr ? 'الباقة الاحترافية' : 'Most Popular'}</span>
              </span>
              {effectiveTier === 'vip' && (
                <span className="text-[11px] font-bold text-amber-400 whitespace-nowrap">
                  {isAr ? 'مفعل حالياً' : 'Active'}
                </span>
              )}
            </div>

            <h3 className="text-lg font-extrabold text-white mb-1">
              {isAr ? 'باقة VIP المباشرة (VIP Tier)' : 'VIP Tier'}
            </h3>
            <p className="text-xs text-[#8a93a6] mb-4">
              {isAr
                ? 'بوت MBK + توصيات VIP + ذكاء MBK'
                : 'MBK Bot + VIP Signals + MBK AI'}
            </p>

            <div className="mb-5 pb-4 border-b border-[#2a2e39] flex items-baseline gap-1.5 font-mono tabular-nums">
              <span className="text-3xl font-black text-white">${displayVipUsd}</span>
              <span className="text-xs text-[#8a93a6]">{isAr ? '/ شهرياً' : '/ month'}</span>
            </div>

            <ul className="space-y-2.5 text-xs text-[#d1d4dc] mb-6">
              {vipFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#089981] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                if (onSelectPlan) {
                  onSelectPlan('vip');
                } else {
                  onOpenPromoModal();
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Crown className="w-4 h-4 shrink-0" />
              <span>
                {effectiveTier === 'vip'
                  ? isAr
                    ? 'تجديد / ترقية اشتراك VIP'
                    : 'Renew VIP Subscription'
                  : isAr
                  ? `اشترك في VIP ($${displayVipUsd}/mo)`
                  : `Subscribe to VIP ($${displayVipUsd}/mo)`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onOpenPromoModal();
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#d1d4dc] text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'لديك مفتاح تفعيل أو رمز تجريبي؟' : 'Redeem Activation / Trial Key'}</span>
            </button>
          </div>
        </div>

        {/* 3. ELITE TIER ($500/mo) */}
        <div className="rounded-2xl p-5 sm:p-6 border border-amber-500/50 bg-[#1e222d] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Gem className="w-4 h-4" />
                <span>{isAr ? 'النخبة المؤسسية' : 'Institutional Elite'}</span>
              </span>
              {effectiveTier === 'elite' && (
                <span className="text-[11px] font-bold text-amber-400 whitespace-nowrap">
                  {isAr ? 'مفعل حالياً' : 'Active'}
                </span>
              )}
            </div>

            <h3 className="text-lg font-extrabold text-white mb-1">
              {isAr ? 'باقة Elite المتكاملة (Elite Tier)' : 'Elite Tier'}
            </h3>
            <p className="text-xs text-[#8a93a6] mb-4">
              {isAr
                ? 'جميع مزايا VIP + الأدوات المؤسسية المتقدمة القادمة'
                : 'All VIP features + exclusive unreleased Elite modules'}
            </p>

            <div className="mb-5 pb-4 border-b border-[#2a2e39] flex items-baseline gap-1.5 font-mono tabular-nums">
              <span className="text-3xl font-black text-amber-400">${displayEliteUsd}</span>
              <span className="text-xs text-[#8a93a6]">{isAr ? '/ شهرياً' : '/ month'}</span>
            </div>

            <div className="space-y-2.5 text-xs mb-6">
              <div className="flex items-start gap-2 text-[#d1d4dc]">
                <Check className="w-4 h-4 text-[#089981] shrink-0 mt-0.5" />
                <span className="font-bold">
                  {isAr ? `كل ما هو مشمول في باقة VIP ($${displayVipUsd})` : 'Everything included in VIP Tier'}
                </span>
              </div>

              <div className="pt-2 border-t border-[#2a2e39]/70 space-y-2">
                {ELITE_UNRELEASED_FEATURES.map((mod) => (
                  <div
                    key={mod.key}
                    className="p-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>🔒 {isAr ? mod.titleAr : mod.titleEn}</span>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-300">
                      {ELITE_LOCK_BADGE_TEXT}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              if (onSelectPlan) {
                onSelectPlan('elite');
              } else {
                onOpenPromoModal();
              }
            }}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#131722] font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              {effectiveTier === 'elite'
                ? isAr
                  ? `إدارة باقة Elite ($${displayEliteUsd}/mo)`
                  : 'Manage Elite Plan'
                : isAr
                ? `اشترك في Elite ($${displayEliteUsd}/mo)`
                : `Subscribe to Elite ($${displayEliteUsd}/mo)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
