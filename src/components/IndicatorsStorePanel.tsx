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
      titleAr="مؤشرات MBK الحصرية"
      titleEn="MBK Indicators"
      subtitleAr="مؤشرات MBK الحصرية مخصصة لباقة Elite وستُتاح قريباً."
      subtitleEn="Exclusive MBK indicators reserved for the Elite Tier."
      lang={lang}
      onViewPlans={onViewPlans}
    />
  );
};

export default IndicatorsStorePanel;
