import React from 'react';
import { CopyTradingMaster } from '../types/trading';
import { EliteLockedModule } from './common/EliteLockedModule';

interface Props {
  masterProfile?: CopyTradingMaster;
  onViewPlans?: () => void;
  lang?: 'ar' | 'en';
}

export const CopyTradingPanel: React.FC<Props> = ({
  onViewPlans,
  lang = 'ar'
}) => {
  return (
    <EliteLockedModule
      titleAr="نسخ الصفقات المؤسسي (Copy Trading)"
      titleEn="Copy Trading"
      subtitleAr="نظام ربط ونسخ الصفقات التلقائي مع حسابات MT4/MT5 مخصص لباقة Elite وهو قيد التطوير حالياً."
      subtitleEn="Automated MT4/MT5 Copy-Trading execution reserved for the Elite Tier."
      lang={lang}
      onViewPlans={onViewPlans}
    />
  );
};

export default CopyTradingPanel;
