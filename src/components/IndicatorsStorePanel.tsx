import React from 'react';
import { MBKIndicator } from '../types/trading';
import { EliteLockedModule } from './common/EliteLockedModule';

interface Props {
  indicators?: MBKIndicator[];
  onViewPlans?: () => void;
  lang?: 'ar' | 'en';
}

export const IndicatorsStorePanel: React.FC<Props> = ({
  onViewPlans,
  lang = 'ar'
}) => {
  return (
    <EliteLockedModule
      titleAr="متجر المؤشرات الحصرية (Indicators Store)"
      titleEn="Indicators Store"
      subtitleAr="حزمة مؤشرات Pine Script المؤسسية الحصرية لمنصة TradingView مخصصة لباقة Elite وستُتاح قريباً."
      subtitleEn="Proprietary institutional Pine Script TradingView indicators reserved for the Elite Tier."
      lang={lang}
      onViewPlans={onViewPlans}
    />
  );
};

export default IndicatorsStorePanel;
