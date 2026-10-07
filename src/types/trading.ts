export interface UserProfile {
  uid?: string;
  name: string;
  email: string;
  role: 'FREE' | 'VIP';
  promoCode?: string;
  planName: string;
  avatar?: string;
}

export type MarketSymbol = 'US100' | 'XAUUSD' | 'EURUSD' | 'BTCUSD' | 'WTI' | 'GBPUSD';

export interface MarketTicker {
  symbol: MarketSymbol;
  nameAr: string;
  price: number;
  changePercent: number;
  changeValue: number;
  high: number;
  low: number;
  spread: number;
  digits: number;
  isUp: boolean;
  category: 'INDICES' | 'COMMODITIES' | 'FOREX' | 'CRYPTO';
}

export type SignalType = 'BUY' | 'SELL';
export type SignalStatus = 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'SL_HIT' | 'CLOSED';

export interface TradeSignal {
  id: string;
  symbol: MarketSymbol;
  type: SignalType;
  entryPrice: number;
  tp1: number;
  tp2: number;
  sl: number;
  currentPrice: number;
  pips: number;
  status: SignalStatus;
  riskReward: string;
  timeframe: string;
  confidence: number;
  strategyName: string;
  createdAt: string;
  verifiedWebhook: boolean;
  notesAr: string;
}

export type BotStrategy = 
  | 'SCALPING_NASDAQ'
  | 'GOLD_TREND_RIDER'
  | 'LONDON_BREAKOUT'
  | 'MBK_ALLIGATOR_FLOW';

export interface BotState {
  isRunning: boolean;
  selectedStrategy: BotStrategy;
  riskPercentage: number;
  tradeLimit: number;
  tp1Ratio: number;
  tp2Ratio: number;
  stopLossPoints: number;
  trailingStopActive: boolean;
  todayPnL: number;
  winRate: number;
  totalTradesToday: number;
  successfulTrades: number;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING';
  mt5Server: string;
  accountBalance: number;
  equity: number;
}

export interface BotLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'TRADE' | 'ALERT' | 'SUCCESS';
  message: string;
}

export interface CopyTradingMaster {
  name: string;
  title: string;
  allTimeGain: string;
  monthlyGain: string;
  winRate: number;
  totalCopiers: number;
  currentDrawdown: string;
  profitSharePercent: number;
  minCapital: number;
  recommendedCapital: number;
  isSynced: boolean;
  copierMultiplier: number;
  managedEquity: string;
}

export interface MBKIndicator {
  id: string;
  name: string;
  nameAr: string;
  version: string;
  badge: string;
  rating: number;
  reviewCount: number;
  priceUsd: number;
  partnerBrokerFree: boolean;
  summaryAr: string;
  featuresAr: string[];
  pineScriptSnippet: string;
  compatiblePlatforms: string[];
}

export interface AISessionReport {
  sessionId: 'asia' | 'london' | 'ny';
  sessionNameAr: string;
  sessionTimeUtc: string;
  lastUpdated: string;
  us100: {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    pivot: number;
    resistance: number[];
    support: number[];
    catalystsAr: string[];
    actionPlanAr: string;
  };
  gold: {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    pivot: number;
    resistance: number[];
    support: number[];
    catalystsAr: string[];
    actionPlanAr: string;
  };
  macroSummaryAr: string;
}

export interface TechnicalBreakdown {
  id: string;
  titleAr: string;
  symbol: MarketSymbol;
  timeframe: string;
  author: string;
  publishedAt: string;
  coverImage: string;
  direction: 'BULLISH' | 'BEARISH';
  keyZonesAr: { name: string; price: string; role: string }[];
  summaryAr: string;
  targetPrice: number;
  invalidationLevel: number;
}

export interface ChatMessage {
  id: string;
  sender: {
    name: string;
    roleAr: string;
    badge: 'FOUNDER' | 'VIP_PRO' | 'SCALPER' | 'MEMBER';
    avatar: string;
  };
  content: string;
  timestamp: string;
  signalAttachment?: {
    symbol: MarketSymbol;
    type: SignalType;
    pips: string;
  };
  likes: number;
  isLikedByMe?: boolean;
}

export interface EconomicNewsItem {
  id: string;
  titleAr: string;
  country: string;
  currency: string;
  timeAr: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actual?: string;
  forecast: string;
  previous: string;
}
