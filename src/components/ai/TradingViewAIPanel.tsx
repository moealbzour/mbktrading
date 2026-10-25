import React, { useState } from 'react';
import { Bot, Send, Crown } from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface Message {
  role: 'user' | 'model';
  text: string;
  time: string;
}

interface Props {
  isVIP: boolean;
  activeSymbol: string;
  currentPrice: number;
  onOpenPromoModal?: () => void;
  lang?: 'ar' | 'en';
}

const FREE_DEMO_SAMPLES = [
  {
    qAr: 'ما هو التحليل الهيكلي للذهب (XAUUSD) الآن؟',
    qEn: 'What is Gold structural breakdown right now?',
    aAr: `【تحليل الذكاء الاصطناعي المؤسسي — وضع العرض التجريبي】
• الأصل: الذهب (XAUUSD) | السعر المباشر: $2,684.40
• الاتجاه العام: صعودي قوي (Bullish Momentum) بنسبة ثقة 92%.
• سحب السيولة: تم تفريغ قاع جلسة لندن $2,668 بنجاح.
• منطقة الدخول المؤكدة: فجوة القيمة العادلة (FVG) بين 2,680$ و 2,682$.
• الأهداف: TP1 عند 2,692$ | TP2 عند 2,704$ | وقف الخسارة الحاسم: 2,674$.
(للحصول على استشارات مخصصة لصفقاتك وحساب اللوت، قم بالترقية إلى VIP).`,
    aEn: `[Institutional AI Breakdown - Demo Preview Mode]
• Asset: Spot Gold (XAUUSD) | Price: $2,684.40
• Bias: Bullish Order Flow (92% confidence) post London low sweep at $2,668.
• Target Entry: FVG between $2,680 and $2,682.
• Targets: TP1: $2,692 | TP2: $2,704 | Invalidation (SL): $2,674.
(Upgrade to VIP for unrestricted live AI consultations and custom lot sizing).`
  },
  {
    qAr: 'حلل كتل الأوامر (Order Blocks) لناسداك US100',
    qEn: 'Analyze Nasdaq US100 Order Blocks',
    aAr: `【تحليل كتل الأوامر المؤسسية — وضع العرض التجريبي】
• الأصل: ناسداك 100 (US100)
• كتلة أوامر الشراء (Bullish Order Block): رصد كتلة شرائية قوية عند 20,840 - 20,860 على شمعة الـ 15 دقيقة.
• نقطة الارتكاز: استمرار التداول فوق خط VWAP يؤكد تدفق السيولة المؤسسية.
• نسبة العائد للمخاطرة: 1 : 2.4.`,
    aEn: `[Order Block Analysis - Demo Preview Mode]
• Asset: Nasdaq 100 (US100)
• Bullish Order Block identified at 20,840 - 20,860 on 15m timeframe.
• Risk/Reward ratio: 1 : 2.4.`
  }
];

export const TradingViewAIPanel: React.FC<Props> = ({
  isVIP,
  activeSymbol,
  currentPrice,
  onOpenPromoModal,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: isAr
        ? `أهلاً بك! أنا المحرك الذكي للتحليل الفني المؤسسي.
الأصل النشط: ${activeSymbol} ($${currentPrice}).
يمكنك سؤالي عن كتل الأوامر Order Blocks، فجوات FVG، سحب السيولة، أو حساب نسبة المخاطرة واللوت.`
        : `Welcome! MBK AI Agent active for ${activeSymbol} ($${currentPrice}). Ask me about order blocks, FVGs, liquidity sweeps, or lot sizing.`,
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendPrompt = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    soundManager.playClick();

    // If Free User: Provide guided demo response with upgrade banner
    if (!isVIP) {
      const matchingSample = FREE_DEMO_SAMPLES.find((s) => s.qAr === textToSend || s.qEn === textToSend) || FREE_DEMO_SAMPLES[0];
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          text: textToSend,
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        },
        {
          role: 'model',
          text: isAr ? matchingSample.aAr : matchingSample.aEn,
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setInputQuery('');
      return;
    }

    // VIP User: Call live backend Gemini AI endpoint
    try {
      setLoading(true);
      const userMsg: Message = {
        role: 'user',
        text: textToSend,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputQuery('');

      const res = await fetch('/api/gemini/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          activeSymbol,
          currentPrice,
          messages: messages.map((m) => ({ role: m.role, text: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: data.reply || (isAr ? 'تم تحليل هيكل السوق بنجاح.' : 'Analysis completed.'),
            time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        soundManager.playProfitChime();
      }
    } catch (err) {
      console.warn('AI request error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl flex flex-col h-full min-h-0 flex-1 shadow-xl overflow-hidden">
      {/* 1. ULTRA-COMPACT SINGLE ROW HEADER */}
      <div className="px-2 py-1 border-b border-[#2a2e39] bg-[#131722]/90 flex items-center justify-between shrink-0 min-h-[30px]">
        <div className="flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-[#089981]" />
          {isVIP ? (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#089981] text-[#131722]">
              VIP ACTIVE
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping" />
              <span>ONLINE AI</span>
            </span>
          )}
        </div>

        {!isVIP && (
          <button
            onClick={() => {
              soundManager.playClick();
              if (onOpenPromoModal) onOpenPromoModal();
            }}
            className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-[9px] flex items-center gap-0.5 shadow-sm hover:brightness-110 cursor-pointer shrink-0"
          >
            <Crown className="w-2.5 h-2.5" />
            <span>{isAr ? 'ترقية VIP' : 'Upgrade'}</span>
          </button>
        )}
      </div>

      {/* 2. CHAT HISTORY FEED (EXPANDS TO FILL RECOVERED SPACE) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 bg-[#131722]/40">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] rounded-lg p-2 text-xs leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-white text-[#131722] font-semibold shadow-sm'
                  : 'bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc]'
              }`}
            >
              {m.text}
            </div>
            <span className="text-[9px] text-[#787b86] font-mono mt-0.5 px-0.5">
              {m.time}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-2 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-[#787b86] w-fit">
            <span className="w-2 h-2 rounded-full bg-[#089981] animate-ping" />
            <span>{isAr ? 'جاري التحليل واستخراج كتل الأوامر...' : 'Analyzing SMC order flow...'}</span>
          </div>
        )}
      </div>

      {/* 3. QUICK PROMPT PILLS */}
      <div className="p-1.5 border-t border-[#2a2e39] bg-[#131722]/90 space-y-1 shrink-0">
        <div className="flex items-center justify-between text-[9px] font-mono text-[#787b86] px-0.5">
          <span>{isAr ? 'أسئلة نموذجية:' : 'Quick Queries:'}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {FREE_DEMO_SAMPLES.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPrompt(isAr ? s.qAr : s.qEn)}
              className="px-2 py-0.5 rounded bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-[10px] text-[#d1d4dc] hover:text-white transition-colors cursor-pointer text-start truncate max-w-full"
            >
              {isAr ? s.qAr : s.qEn}
            </button>
          ))}
        </div>
      </div>

      {/* 4. INPUT BAR */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendPrompt(); }} className="p-1.5 border-t border-[#2a2e39] bg-[#1e222d] flex items-center gap-1.5 shrink-0">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={
            isAr
              ? 'اسأل الذكاء الاصطناعي عن أي أصل أو كتل الأوامر...'
              : 'Ask AI about setups, Order Blocks, or lot sizing...'
          }
          className="flex-1 bg-[#131722] border border-[#2a2e39] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#787b86] focus:outline-none focus:border-[#089981]"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || loading}
          className="px-3 py-1.5 rounded-lg bg-white text-[#131722] hover:bg-[#d1d4dc] disabled:opacity-40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
