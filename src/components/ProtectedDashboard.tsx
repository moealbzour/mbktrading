import React from 'react';
import {
  UserProfile,
  MarketSymbol,
  MarketTicker
} from '../types/trading';
import { TradingViewWorkspace } from './layout/TradingViewWorkspace';

interface Props {
  user: UserProfile;
  tickers: MarketTicker[];
  selectedSymbol: MarketSymbol;
  onSelectSymbol: (sym: MarketSymbol) => void;
  onLogout: () => void;
  onBackToHome?: () => void;
  onOpenPromoModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
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
      onOpenPromoModal={onOpenPromoModal}
      lang={lang}
      onToggleLang={onToggleLang}
    />
  );
};
