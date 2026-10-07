import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Globe,
  Zap,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Copy,
  Check,
  User,
  Calculator,
  Target,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Activity,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { AISentimentService } from '../services/aiSentimentService';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
  sources?: Array<{ title: string; uri: string }>;
}

const PRESET_PROMPTS = [
  '🔍 ما هي مناطق السيولة والدعوم الحالية للذهب (XAUUSD)؟',
  '📊 خطة افتتاح جلسة نيويورك لمؤشر ناسداك (US100)',
  '⚖️ احسب لي حجم اللوت المناسب لحساب $5,000 ومخاطرة 1%',
  '🌐 ابحث عن أحدث تصريحات الفيدرالي وتأثيرها على الأسواق',
  '🎯 كيف أحدد مناطق الفير فاليو جاب (FVG) على فريم 15 دقيقة؟'
];

export const AITraderChatbot: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'calculator' | 'validator'>('chat');

  // --- Chat State ---
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: `مرحباً بك في «مساعد MBK الذكي لخدمة المتداولين» 🤖

أنا محركك المالي المباشر لتحليل الأسواق، اقتناص السيولة، وإدارة المخاطر. أعمل بمحرك **Gemini 3.1 Flash-Lite** — الخيار الأوفر تكلفة والأسرع استجابة عالمياً لضمان خدمة مستمرة دون انقطاع، مع إمكانية استخدام **Google Search Grounding** للبحث اللحظي في الأسواق العالمية.

اختر إحدى الأدوات من الأعلى أو اسأل عن أي شارت وترتيب صفقات:`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.1-flash-lite (Cost-Optimized)'
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Calculator State ---
  const [calcBalance, setCalcBalance] = useState<number>(5000);
  const [calcRiskPct, setCalcRiskPct] = useState<number>(1.0);
  const [calcSlPips, setCalcSlPips] = useState<number>(25);
  const [calcSymbol, setCalcSymbol] = useState<'XAUUSD' | 'US100' | 'EURUSD'>('XAUUSD');

  // --- Setup Validator State ---
  const [valSymbol, setValSymbol] = useState<'US100' | 'XAUUSD' | 'EURUSD'>('US100');
  const [valAction, setValAction] = useState<'BUY' | 'SELL'>('BUY');
  const [valEntry, setValEntry] = useState<number>(20850);
  const [valSl, setValSl] = useState<number>(20800);
  const [valTp, setValTp] = useState<number>(20970);
  const [isValidating, setIsValidating] = useState(false);
  const [valResult, setValResult] = useState<{
    rrRatio: string;
    pipsRisk: number;
    pipsReward: number;
    recommendedLot: number;
    maxRiskUsd: number;
    potentialGainUsd: number;
    aiCritique: string;
    modelUsed: string;
  } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeSubTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isLoading, activeSubTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    soundManager.playClick();

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            text: m.text
          })),
          useSearch,
          query
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'model',
          text: data.reply,
          timestamp: data.timestamp || new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          modelUsed: data.modelUsed,
          sources: data.sources
        };
        setMessages((prev) => [...prev, aiMessage]);
        soundManager.playSignalPing();
      } else {
        throw new Error('فشل الرد من الخادم');
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: 'تم تطبيق نظام الأمان الاحتياطي: يُرجى الالتزام بمستويات الدعم والمقاومة المحددة في الشارت وألا تتجاوز نسبة المخاطرة 1% لكل صفقة.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.1-flash-lite (Cost-Optimized Fallback)'
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    soundManager.playClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    soundManager.playClick();
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: 'model',
        text: 'تمت إعادة ضبط المحادثة. أنا جاهز لخدمتك في إدارة صفقاتك وتحليل حركة الأسواق.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.1-flash-lite (Cost-Optimized)'
      }
    ]);
  };

  // Calculator Math
  const calcRiskUsd = +(calcBalance * (calcRiskPct / 100)).toFixed(2);
  let calculatedLot = 0.01;
  if (calcSymbol === 'XAUUSD') {
    // 1 pip on gold = $0.10 move = $10 per 1 standard lot
    calculatedLot = calcSlPips > 0 ? +(calcRiskUsd / (calcSlPips * 10)).toFixed(2) : 0.01;
  } else if (calcSymbol === 'EURUSD') {
    calculatedLot = calcSlPips > 0 ? +(calcRiskUsd / (calcSlPips * 10)).toFixed(2) : 0.01;
  } else {
    // US100 index point
    calculatedLot = calcSlPips > 0 ? +(calcRiskUsd / (calcSlPips * 2)).toFixed(2) : 0.1;
  }
  if (calculatedLot < 0.01) calculatedLot = 0.01;

  // Setup Validator Action
  const handleRunValidation = async () => {
    soundManager.playClick();
    setIsValidating(true);
    try {
      const result = await AISentimentService.validateTradeSetup({
        symbol: valSymbol,
        action: valAction,
        entryPrice: valEntry,
        slPrice: valSl,
        tpPrice: valTp,
        accountBalance: calcBalance,
        riskPercentage: calcRiskPct
      });
      setValResult(result);
      soundManager.playSignalPing();
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[650px] relative">
      {/* 1. CHAT HEADER & TRADER SERVICES NAVIGATION */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-emerald-500 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-[#0d131f] rounded-[10px] flex items-center justify-center text-cyan-400">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                مساعد MBK لخدمات المتداولين (AI Trader Engine)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Gemini 3.1 Flash-Lite • Best Low-Cost Option
              </span>
            </div>
            <p className="text-xs text-slate-400">
              بنية ذكاء اصطناعي فائقة السرعة وأقلها تكلفة عالمياً لتقديم خدمات تحليل الشارتات وحساب المخاطر لجميع المتداولين مجاناً
            </p>
          </div>
        </div>

        {/* Trader Service Tabs */}
        <div className="flex items-center bg-[#090d16] p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveSubTab('chat');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSubTab === 'chat'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>استشارات التداول (Chat)</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveSubTab('calculator');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSubTab === 'calculator'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>حاسبة اللوت والمخاطرة</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveSubTab('validator');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSubTab === 'validator'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>مدقق خطة الصفقة (R:R)</span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT: 1. CHAT ASSISTANT */}
      {activeSubTab === 'chat' && (
        <>
          {/* Controls Bar */}
          <div className="px-4 py-2 bg-[#0c121d] border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">محرك التحليل:</span>
              <span className="bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded text-[11px] font-mono text-cyan-300">
                gemini-3.1-flash-lite (زمن استجابة &lt;0.5ث • استهلاك رمزي)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setUseSearch(!useSearch);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  useSearch
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{useSearch ? 'بيانات الويب الحية مفعلة (Search Grounding)' : 'تفعيل البحث المباشر في الأخبار'}</span>
              </button>

              <button
                onClick={handleClearChat}
                title="إعادة ضبط المحادثة"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0b0f17]/95">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-md ${
                      isUser
                        ? 'bg-cyan-600 text-white'
                        : 'bg-[#1e293b] text-cyan-400 border border-slate-700'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed transition-all shadow-md ${
                      isUser
                        ? 'bg-cyan-600/90 text-white rounded-tr-none'
                        : 'bg-[#141b29] text-slate-200 border border-slate-800 rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-white/10 text-[10px] opacity-80 font-mono">
                      <span>{isUser ? 'أنت (المتداول)' : 'مساعد MBK الذكي'}</span>
                      <div className="flex items-center gap-2">
                        {msg.modelUsed && (
                          <span className="bg-slate-900/60 px-1.5 py-0.5 rounded text-cyan-300">
                            {msg.modelUsed}
                          </span>
                        )}
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                    <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                      {msg.text}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/80 space-y-1.5">
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>المصادر والبيانات المباشرة (Google Search Grounding):</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src, i) => (
                            <a
                              key={i}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-slate-300 bg-slate-900/90 hover:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/60 flex items-center gap-1 transition-colors"
                            >
                              <span className="truncate max-w-[200px]">{src.title}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-cyan-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isUser && (
                      <div className="mt-2.5 flex justify-end">
                        <button
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>نسخ التحليل</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#1e293b] text-cyan-400 border border-slate-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-[#141b29] border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>محرك Gemini 3.1 Flash-Lite يصيغ التحليل اللحظي لخدمتك بأعلى سرعة...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 bg-[#0d131f] border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-slate-400 shrink-0 font-bold">خدمات سريعة:</span>
            {PRESET_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="text-[11px] text-slate-300 bg-slate-900/80 hover:bg-slate-800 hover:text-cyan-300 px-3 py-1 rounded-full border border-slate-700/60 whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#0f172a] border-t border-slate-800 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                useSearch
                  ? 'اسأل عن بيانات التضخم، تصريحات الفيدرالي، أو أسعار الأسواق اللحظية...'
                  : 'اسأل عن تحليل فني، حساب حجم اللوت، أو إدارة المخاطرة...'
              }
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />

            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-md shadow-cyan-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5 rotate-180" />
            </button>
          </form>
        </>
      )}

      {/* 2. TAB CONTENT: 2. POSITION SIZE & LOT CALCULATOR */}
      {activeSubTab === 'calculator' && (
        <div className="flex-1 p-6 overflow-y-auto bg-[#0b0f17] space-y-6">
          <div className="bg-[#131c2e] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  حاسبة حجم اللوت الصارم (Institutional Lot Sizer)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                قاعدة MBK الذهبية: أقصى مخاطرة 1% - 1.5%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Asset Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">الأصل المالي</label>
                <select
                  value={calcSymbol}
                  onChange={(e) => setCalcSymbol(e.target.value as any)}
                  className="w-full bg-[#0c121d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="XAUUSD">الذهب XAUUSD (10$ للنقطة/لوت)</option>
                  <option value="US100">ناسداك US100 (عقود الفروقات)</option>
                  <option value="EURUSD">اليورو دولار EURUSD</option>
                </select>
              </div>

              {/* Capital */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">رصيد الحساب ($)</label>
                <input
                  type="number"
                  value={calcBalance}
                  onChange={(e) => setCalcBalance(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0c121d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Risk % */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">نسبة المخاطرة (%)</label>
                <div className="flex items-center gap-1.5">
                  {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setCalcRiskPct(pct)}
                      className={`flex-1 py-2 text-xs rounded-lg font-bold border transition-all cursor-pointer ${
                        calcRiskPct === pct
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                          : 'bg-[#0c121d] text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* SL Pips */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">وقف الخسارة (بالنقاط)</label>
                <input
                  type="number"
                  value={calcSlPips}
                  onChange={(e) => setCalcSlPips(parseFloat(e.target.value) || 1)}
                  className="w-full bg-[#0c121d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-[#0c121d] border border-slate-800 rounded-xl p-4 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">المخاطرة النقدية القصوى</span>
                <span className="text-xl font-black text-rose-400 font-mono">${calcRiskUsd}</span>
                <span className="text-[10px] text-slate-500 block mt-1">({calcRiskPct}% من المحفظة)</span>
              </div>

              <div className="bg-[#0c121d] border border-emerald-500/30 rounded-xl p-4 text-center bg-emerald-950/20">
                <span className="text-[11px] text-emerald-400 block mb-1 font-bold">حجم اللوت الموصى به بدقة</span>
                <span className="text-3xl font-black text-emerald-400 font-mono tracking-wide">{calculatedLot}</span>
                <span className="text-[10px] text-emerald-300/80 block mt-1">لوت قياسي (Lot Size)</span>
              </div>

              <div className="bg-[#0c121d] border border-slate-800 rounded-xl p-4 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">الهدف المقترح (1:2)</span>
                <span className="text-xl font-black text-cyan-400 font-mono">+${(calcRiskUsd * 2).toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 block mt-1">عند تحقيق {calcSlPips * 2} نقطة</span>
              </div>
            </div>

            {/* AI Action CTA */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>احمِ حسابك من الطمع ومخاطر المارجن كول. لا تتجاوز هذا اللوت تحت أي ظرف.</span>
              </div>

              <button
                onClick={() => {
                  setActiveSubTab('chat');
                  handleSendMessage(`احسب لي خطة تداول مفصلة على ${calcSymbol} برصيد $${calcBalance} ومخاطرة ${calcRiskPct}% ووقف خسارة ${calcSlPips} نقطة.`);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-xs hover:from-emerald-500 hover:to-cyan-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/30"
              >
                <span>طلب تحليل خطة الدخول من الذكاء الاصطناعي</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB CONTENT: 3. TRADE SETUP VALIDATOR */}
      {activeSubTab === 'validator' && (
        <div className="flex-1 p-6 overflow-y-auto bg-[#0b0f17] space-y-6">
          <div className="bg-[#131c2e] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  مدقق خطة الصفقة اللحظي (Trade Setup Validator)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                Powered by Gemini 3.1 Flash-Lite
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Symbol */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الأصل</label>
                <select
                  value={valSymbol}
                  onChange={(e) => setValSymbol(e.target.value as any)}
                  className="w-full bg-[#0c121d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="US100">US100 (نازداك)</option>
                  <option value="XAUUSD">XAUUSD (الذهب)</option>
                  <option value="EURUSD">EURUSD</option>
                </select>
              </div>

              {/* Action */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">نوع الصفقة</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setValAction('BUY')}
                    className={`flex-1 py-2 text-xs rounded-lg font-bold border transition-all cursor-pointer ${
                      valAction === 'BUY'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-[#0c121d] text-slate-400 border-slate-800'
                    }`}
                  >
                    شراء BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setValAction('SELL')}
                    className={`flex-1 py-2 text-xs rounded-lg font-bold border transition-all cursor-pointer ${
                      valAction === 'SELL'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-[#0c121d] text-slate-400 border-slate-800'
                    }`}
                  >
                    بيع SELL
                  </button>
                </div>
              </div>

              {/* Entry */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">سعر الدخول</label>
                <input
                  type="number"
                  value={valEntry}
                  onChange={(e) => setValEntry(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0c121d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              {/* SL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">وقف الخسارة (SL)</label>
                <input
                  type="number"
                  value={valSl}
                  onChange={(e) => setValSl(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0c121d] border border-rose-700/60 rounded-xl px-3 py-2 text-xs text-rose-300 font-mono"
                />
              </div>

              {/* TP */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الهدف (TP)</label>
                <input
                  type="number"
                  value={valTp}
                  onChange={(e) => setValTp(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0c121d] border border-emerald-700/60 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunValidation}
                disabled={isValidating}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                <span>{isValidating ? 'جاري التدقيق الخوارزمي...' : 'تدقيق الصفقة الآن (Gemini Flash-Lite)'}</span>
              </button>
            </div>

            {/* Validation Output */}
            {valResult && (
              <div className="mt-4 p-4 bg-[#0c121d] border border-indigo-500/30 rounded-xl space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">نسبة العائد للمخاطرة (R:R)</span>
                    <span className="text-base font-bold text-cyan-400 font-mono">{valResult.rrRatio}</span>
                  </div>
                  <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">نقاط الوقف vs الهدف</span>
                    <span className="text-base font-bold text-slate-200 font-mono">{valResult.pipsRisk} / {valResult.pipsReward}</span>
                  </div>
                  <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">اللوت الآمن المقترح</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">{valResult.recommendedLot}</span>
                  </div>
                  <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">المخاطرة المقابلة</span>
                    <span className="text-base font-bold text-rose-400 font-mono">${valResult.maxRiskUsd}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#111827] rounded-lg border border-slate-800">
                  <span className="text-[10px] text-indigo-400 font-bold block mb-1">
                    تقرير مدقق الصفقات المؤسسي ({valResult.modelUsed}):
                  </span>
                  <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                    {valResult.aiCritique}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
