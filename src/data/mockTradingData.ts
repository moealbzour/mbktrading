import { MarketTicker } from '../types/trading';

export const INITIAL_TICKERS: MarketTicker[] = [
  {
    symbol: 'US100',
    nameAr: 'ناسداك 100 (عقود مؤشرات)',
    price: 29646.25,
    changePercent: -0.26,
    changeValue: -77.25,
    high: 29803.50,
    low: 29605.75,
    spread: 0.8,
    digits: 2,
    isUp: false,
    category: 'INDICES'
  },
  {
    symbol: 'XAUUSD',
    nameAr: 'الذهب مقابل الدولار (أونصة)',
    price: 4154.20,
    changePercent: -0.14,
    changeValue: -5.80,
    high: 4163.30,
    low: 4149.00,
    spread: 0.15,
    digits: 2,
    isUp: false,
    category: 'COMMODITIES'
  },
  {
    symbol: 'EURUSD',
    nameAr: 'اليورو مقابل الدولار',
    price: 1.1221,
    changePercent: +0.04,
    changeValue: +0.0004,
    high: 1.1225,
    low: 1.1215,
    spread: 0.1,
    digits: 5,
    isUp: true,
    category: 'FOREX'
  },
  {
    symbol: 'BTCUSD',
    nameAr: 'البيتكوين مقابل الدولار',
    price: 81598.06,
    changePercent: -0.30,
    changeValue: -246.37,
    high: 81844.43,
    low: 81503.60,
    spread: 2.0,
    digits: 2,
    isUp: false,
    category: 'CRYPTO'
  },
  {
    symbol: 'WTI',
    nameAr: 'نفط خام تكساس الخفيف',
    price: 98.53,
    changePercent: -0.01,
    changeValue: -0.01,
    high: 98.54,
    low: 98.04,
    spread: 0.03,
    digits: 2,
    isUp: false,
    category: 'COMMODITIES'
  },
  {
    symbol: 'GBPUSD',
    nameAr: 'الجنيه الإسترليني مقابل الدولار',
    price: 1.3316,
    changePercent: +0.07,
    changeValue: +0.0009,
    high: 1.3318,
    low: 1.3305,
    spread: 0.2,
    digits: 5,
    isUp: true,
    category: 'FOREX'
  }
];
