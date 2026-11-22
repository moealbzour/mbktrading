import React, { useState } from 'react';
import { Bot, Lock } from 'lucide-react';
import { UserProfile } from '../../types/trading';
import { SmartAssistantChat } from './SmartAssistantChat';
import { EliteLockedModule } from '../common/EliteLockedModule';

interface Props {
  user?: UserProfile | null;
  isVIP: boolean;
  activeSymbol: string;
  currentPrice: number;
  onOpenPromoModal?: () => void;
  onOpenPlansModal?: () => void;
  lang?: 'ar' | 'en';
}

export const TradingViewAIPanel: React.FC<Props> = ({
  user,
  isVIP,
  activeSymbol,
  currentPrice,
  onOpenPromoModal,
  onOpenPlansModal,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [aiTab, setAiTab] = useState<'standard' | 'super'>('standard');

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="h-full flex flex-col bg-[#131722]">
      <div className="p-2 bg-[#1e222d] border-b border-[#2a2e39] flex items-center gap-1.5 shrink-0 text-xs">
        <button
          type="button"
          onClick={() => setAiTab('standard')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            aiTab === 'standard'
              ? 'bg-[#089981] text-white'
              : 'bg-[#131722] text-[#8a93a6] hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>{isAr ? 'Standard AI (VIP)' : 'Standard AI (VIP)'}</span>
        </button>
        <button
          type="button"
          onClick={() => setAiTab('super')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            aiTab === 'super'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-[#131722] text-[#8a93a6] hover:text-amber-300'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>🔒 {isAr ? 'Super AI (Elite)' : 'Super AI (Elite)'}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {aiTab === 'standard' ? (
          <SmartAssistantChat
            user={user}
            isVIP={isVIP}
            userRole={user?.role}
            activeSymbol={activeSymbol || 'US100'}
            currentPrice={Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 0}
            onOpenPromoModal={onOpenPromoModal}
            onOpenPlansModal={onOpenPlansModal}
            lang={lang}
          />
        ) : (
          <div className="p-3 h-full">
            <EliteLockedModule
              titleAr="المساعد الفائق (Super AI)"
              titleEn="Super AI"
              subtitleAr="المساعد الصوتي المباشر، تحليل الشارت بالرؤية الذكية، وإدارة المحافظ الآلية مخصصة لباقة Elite وقيد التطوير حالياً."
              subtitleEn="Live voice mentor, Chart Vision OCR, and autonomous portfolio AI are reserved for the Elite Tier."
              lang={lang}
              compact
              onViewPlans={onOpenPlansModal}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingViewAIPanel;
