import React from 'react';
import {
  UserProfile,
  MarketSymbol,
  MarketTicker,
  TradeSignal,
  ChatMessage,
  EconomicNewsItem
} from '../types/trading';
import { TradingViewWorkspace } from './layout/TradingViewWorkspace';

export type DashboardTab =
  | 'signals'
  | 'traders'
  | 'indicators'
  | 'copy_trading'
  | 'ai_agent'
  | 'journal'
  | 'admin';

interface Props {
  user: UserProfile;
  tickers: MarketTicker[];
  signals: TradeSignal[];
  chatMessages: ChatMessage[];
  economicEvents: EconomicNewsItem[];
  selectedSymbol: MarketSymbol;
  onSelectSymbol: (sym: MarketSymbol) => void;
  onAddSignal: (sig: TradeSignal) => void;
  onCopySignalToAccount: (sig: TradeSignal) => void;
  onSendMessage: (text: string) => void;
  onLikeMessage: (id: string) => void;
  onLogout: () => void;
  onBackToHome?: () => void;
  onOpenBrokerModal: () => void;
  onOpenNewSignalModal: () => void;
  onOpenPromoModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onlineTraders: number;
  lang?: 'ar' | 'en';
  onToggleLang?: () => void;
}

export const ProtectedDashboard: React.FC<Props> = ({
  user,
  tickers,
  selectedSymbol,
  onSelectSymbol,
  onLogout,
  onBackToHome,
  onOpenBrokerModal,
  onOpenPromoModal,
  isMuted,
  onToggleMute,
  lang = 'ar',
  onToggleLang
}) => {
  return (
    <TradingViewWorkspace
      user={user}
      tickers={tickers}
      selectedSymbol={selectedSymbol}
      onSelectSymbol={onSelectSymbol}
      isMuted={isMuted}
      onToggleMute={onToggleMute}
      onLogout={onLogout}
      onBackToHome={onBackToHome}
      onOpenBrokerModal={onOpenBrokerModal}
      onOpenPromoModal={onOpenPromoModal}
      lang={lang}
      onToggleLang={onToggleLang}
    />
  );
};
