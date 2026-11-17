import React from 'react';
import { X } from 'lucide-react';
import { UserProfile } from '../../types/trading';
import { PricingPlans } from '../tic/PricingPlans';
import { soundManager } from '../../utils/audio';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSelectPlan: (plan: 'vip' | 'elite') => void;
  onOpenPromoModal: () => void;
  lang?: 'ar' | 'en';
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  user,
  onSelectPlan,
  onOpenPromoModal,
  lang = 'ar'
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none"
    >
      <div className="bg-[#131722] border border-[#2a2e39] rounded-2xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92dvh] overflow-y-auto">
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          aria-label={isAr ? 'إغلاق' : 'Close'}
          className="sticky top-0 float-end p-2 rounded-xl bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <PricingPlans
          user={user}
          onSelectPlan={(plan) => {
            onClose();
            onSelectPlan(plan);
          }}
          onOpenPromoModal={() => {
            onClose();
            onOpenPromoModal();
          }}
          lang={lang}
        />
      </div>
    </div>
  );
};

export default SubscriptionPlansModal;
