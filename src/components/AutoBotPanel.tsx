import React from 'react';
import { BotState, BotStrategy, BotLogEntry } from '../types/trading';
import { EliteLockedModule } from './common/EliteLockedModule';

interface Props {
  botState?: BotState;
  botLogs?: BotLogEntry[];
  onToggleBot?: () => void;
  onUpdateStrategy?: (strat: BotStrategy) => void;
  onUpdateRisk?: (risk: number) => void;
  onUpdateLimit?: (limit: number) => void;
  onClearLogs?: () => void;
  onViewPlans?: () => void;
  lang?: 'ar' | 'en';
}

export const AutoBotPanel: React.FC<Props> = ({
  onViewPlans,
  lang = 'ar'
}) => {
  return (
    <EliteLockedModule
      titleAr="التداول الآلي الكامل (Auto Bot Trader)"
      titleEn="Auto Bot Trader"
      subtitleAr="التنفيذ الآلي الكامل للبوت على حسابات التداول مخصص لباقة Elite وهو قيد التطوير حالياً. يمكنك متابعة إشارات البوت من قناة الإشارات."
      subtitleEn="Autonomous Auto Bot execution reserved for the Elite Tier. Follow live bot alerts in the Signals Feed."
      lang={lang}
      onViewPlans={onViewPlans}
    />
  );
};

export default AutoBotPanel;
