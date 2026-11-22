import React, { useEffect, useRef } from 'react';
import { MarketSymbol } from '../types/trading';
import { TRADINGVIEW_TICKERS } from './TradingViewChart';
import { useTheme } from '../context/ThemeContext';

interface Props {
  symbol: MarketSymbol;
  onSymbolChange?: (sym: MarketSymbol) => void;
  tickers?: any[];
  lang?: 'ar' | 'en';
}

export const TradingViewLiteChart: React.FC<Props> = ({
  symbol,
  lang = 'ar'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';
  const activeTickerInfo = TRADINGVIEW_TICKERS[symbol] || TRADINGVIEW_TICKERS.US100;
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const chartBgHex = isLight ? '#FFFFFF' : '#111726';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.async = true;

    const tvSymbol = activeTickerInfo.tvSymbol;

    const widgetConfig = {
      symbols: [
        [activeTickerInfo.label, `${tvSymbol}|1D`]
      ],
      chartOnly: false,
      hide_side_toolbar: true,
      width: '100%',
      height: '100%',
      locale: isAr ? 'ar' : 'en',
      colorTheme: isLight ? 'light' : 'dark',
      autosize: true,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: true,
      hideSymbolLogo: false,
      scalePosition: 'right',
      scaleMode: 'Normal',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Cairo', 'Segoe UI', sans-serif",
      fontSize: '10',
      noTimeScale: false,
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      chartType: 'area',
      headerFontSize: 'small',
      backgroundColor: chartBgHex,
      gridLineColor: isLight ? 'rgba(203, 213, 225, 0.5)' : 'rgba(42, 46, 57, 0.4)',
      widgetFontColor: isLight ? '#0f172a' : '#d1d4dc',
      lineWidth: 2,
      lineType: 0,
      dateRanges: [
        '1d|1',
        '1m|30',
        '3m|60',
        '12m|1D'
      ],
      upColor: '#089981',
      downColor: '#f23645',
      borderUpColor: '#089981',
      borderDownColor: '#f23645',
      wickUpColor: '#089981',
      wickDownColor: '#f23645'
    };

    script.innerHTML = JSON.stringify(widgetConfig);
    container.appendChild(script);

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [symbol, isAr, activeTickerInfo.tvSymbol, activeTickerInfo.label, isLight, chartBgHex]);

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden select-none relative"
      style={{ backgroundColor: chartBgHex }}
    >
      <div
        className="flex-1 w-full min-h-0 relative overflow-hidden"
        style={{ backgroundColor: chartBgHex }}
      >
        <div
          ref={containerRef}
          className="tradingview-widget-container w-full h-full"
        />
      </div>
    </div>
  );
};
