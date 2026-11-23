import React, { useEffect, useRef } from 'react';
import { MarketSymbol, MarketTicker } from '../../types/trading';

interface HeaderTickerProps {
  tickers?: MarketTicker[];
  onSelectSymbol?: (symbol: MarketSymbol) => void;
  className?: string;
  lang?: 'ar' | 'en';
}

export const HeaderTicker: React.FC<HeaderTickerProps> = ({
  className = '',
  lang = 'ar'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget -mt-3';
    widgetContainer.style.width = '100%';
    widgetContainer.style.height = '100%';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        {
          proName: 'CAPITALCOM:US100',
          title: 'US100'
        },
        {
          proName: 'OANDA:XAUUSD',
          title: isAr ? 'الذهب (XAUUSD)' : 'XAUUSD'
        },
        {
          proName: 'FX:EURUSD',
          title: 'EURUSD'
        },
        {
          proName: 'FX:GBPUSD',
          title: 'GBPUSD'
        },
        {
          proName: 'TVC:USOIL',
          title: 'WTI'
        },
        {
          proName: 'BINANCE:BTCUSDT',
          title: 'BTCUSD'
        }
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'regular',
      colorTheme: 'dark',
      locale: isAr ? 'ar' : 'en'
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container w-full h-full pointer-events-none select-none';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.pointerEvents = 'none';
    wrapper.appendChild(widgetContainer);
    wrapper.appendChild(script);

    container.appendChild(wrapper);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [isAr]);

  return (
    <div
      className={`w-full h-[42px] max-h-[42px] overflow-hidden flex flex-col justify-center bg-[#0b0e14] border-b border-[#1e2633] relative select-none z-30 ${className}`}
    >
      <div
        ref={containerRef}
        className="w-full h-full pointer-events-none select-none [&_.tradingview-widget-container]:h-full [&_.tradingview-widget-container]:pointer-events-none [&_iframe]:bg-transparent [&_iframe]:pointer-events-none"
      />
      {/* Transparent shield preventing any iframe click navigation to TradingView */}
      <div className="absolute inset-0 z-10 bg-transparent cursor-default" />
    </div>
  );
};
