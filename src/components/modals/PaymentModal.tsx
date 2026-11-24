import React, { useEffect, useState } from 'react';
import { X, Lock, Headphones, CreditCard, ShieldCheck, Crown, Gem } from 'lucide-react';
import {
  fetchPlanPricingSettings,
  getCachedPlanPricingSettings,
  PlanPricingSettings
} from '../../services/platformSettingsService';
import { soundManager } from '../../utils/audio';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: 'vip' | 'elite';
  onContactSupport: () => void;
  lang?: 'ar' | 'en';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  selectedPlan,
  onContactSupport,
  lang = 'ar'
}) => {
  const [planPricing, setPlanPricing] = useState<PlanPricingSettings>(() =>
    getCachedPlanPricingSettings()
  );

  useEffect(() => {
    if (!isOpen) return;
    fetchPlanPricingSettings(false)
      .then((p) => setPlanPricing(p))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const isElite = selectedPlan === 'elite';
  const displayVipUsd = planPricing.syncToPublicPlans ? planPricing.vipMonthlyUsd : 100;
  const displayEliteUsd = planPricing.syncToPublicPlans ? planPricing.eliteMonthlyUsd : 500;

  const planTitle = isElite
    ? isAr
      ? `باقة Elite — $${displayEliteUsd} / شهرياً`
      : `Elite Tier — $${displayEliteUsd} / mo`
    : isAr
    ? `باقة VIP — $${displayVipUsd} / شهرياً`
    : `VIP Tier — $${displayVipUsd} / mo`;

  const paymentMethods = [
    {
      id: 'visa',
      name: 'Visa',
      subtitleAr: 'بطاقة فيزا الائتمانية والخصم',
      subtitleEn: 'Visa Credit & Debit Cards'
    },
    {
      id: 'mastercard',
      name: 'MasterCard',
      subtitleAr: 'بطاقة ماستركارد الدولية',
      subtitleEn: 'MasterCard International'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      subtitleAr: 'حساب باي بال الإلكتروني',
      subtitleEn: 'PayPal Express Checkout'
    }
  ];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none"
    >
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative text-[#d1d4dc] my-auto">
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          aria-label={isAr ? 'إغلاق' : 'Close'}
          className="absolute top-4 end-4 p-1.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Selected Plan Header */}
        <div className="text-center mb-5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border ${
              isElite
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-[#089981]/15 border-[#089981]/40 text-[#089981]'
            }`}
          >
            {isElite ? <Gem className="w-6 h-6" /> : <Crown className="w-6 h-6" />}
          </div>

          <h3 className="text-lg font-extrabold text-white">
            {isAr ? 'إتمام الاشتراك' : 'Subscription Checkout'}
          </h3>
          <p className="text-sm font-bold text-[#089981] font-mono tabular-nums mt-1">
            {planTitle}
          </p>
          <p className="text-xs text-[#787b86] mt-1.5 leading-relaxed">
            {isAr
              ? 'بوابات الدفع الإلكتروني المباشر قيد التفعيل النهائي. يرجى التواصل مع الدعم لتفعيل اشتراكك فوراً.'
              : 'Online card gateways are launching soon. Please contact support to activate your subscription immediately.'}
          </p>
        </div>

        {/* Disabled Payment Methods (Available Soon / قريباً) */}
        <div className="space-y-2.5 mb-5">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              aria-disabled="true"
              className="p-3.5 rounded-xl bg-[#131722]/80 border border-[#2a2e39] flex items-center justify-between gap-3 opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#1e222d] border border-[#2a2e39] flex items-center justify-center text-[#787b86] shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{method.name}</span>
                  </div>
                  <div className="text-[11px] text-[#787b86] truncate">
                    {isAr ? method.subtitleAr : method.subtitleEn}
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold whitespace-nowrap shrink-0">
                Available Soon / قريباً
              </span>
            </div>
          ))}
        </div>

        {/* Security Note */}
        <div className="p-3 rounded-xl bg-[#131722] border border-[#2a2e39] flex items-center gap-2 text-[11px] text-[#8a93a6] mb-5">
          <ShieldCheck className="w-4 h-4 text-[#089981] shrink-0" />
          <span>
            {isAr
              ? 'سيقوم فريق الدعم بإصدار مفتاح تفعيل خاص بحسابك فور تأكيد الاشتراك.'
              : 'Our support desk will issue an instant single-use activation key for your account.'}
          </span>
        </div>

        {/* ONLY Active Clickable Primary Action Button */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onClose();
            onContactSupport();
          }}
          className="w-full py-3.5 px-4 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#089981]/20"
        >
          <Headphones className="w-4 h-4 shrink-0" />
          <span>تواصل مع الدعم للاشتراك (Contact Support to Subscribe)</span>
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;
