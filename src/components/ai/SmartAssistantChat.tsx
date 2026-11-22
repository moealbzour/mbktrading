import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Lock, Crown, Ticket, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types/trading';
import { ELITE_LOCK_BADGE_TEXT, hasFeatureAccess } from '../../utils/entitlements';
import { soundManager } from '../../utils/audio';
import { auth } from '../../lib/firebase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  time: string;
  isError?: boolean;
}

export interface SmartAssistantChatProps {
  user?: UserProfile | null;
  isVIP?: boolean;
  userRole?: string;
  onOpenPromoModal?: () => void;
  onOpenPlansModal?: () => void;
  lang?: 'ar' | 'en';
  activeSymbol?: string;
  currentPrice?: number;
}

export const SmartAssistantChat: React.FC<SmartAssistantChatProps> = ({
  user,
  isVIP = false,
  userRole,
  onOpenPromoModal,
  onOpenPlansModal,
  lang = 'ar',
  activeSymbol = 'US100',
  currentPrice = 0
}) => {
  const isAr = lang === 'ar';

  const roleUpper = (user?.role || userRole || 'FREE').toUpperCase();
  const canUseStandardAi = user
    ? hasFeatureAccess(user, 'standardAi')
    : Boolean(isVIP || ['ADMIN', 'VIP', 'ELITE', 'MODERATOR', 'ANALYSER', 'ANALYST'].includes(roleUpper));

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'model',
      text: isAr
        ? 'أهلاً بك في المساعد الذكي القياسي (Standard AI Assistant) ضمن باقة VIP. اسألني أي سؤال حول التداول أو إدارة المخاطر أو مصطلحات السوق وسأجيبك مباشرة.'
        : 'Welcome to the Standard AI Assistant (VIP Tier). Ask any question about trading, risk management, or market concepts.',
      time: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading || !canUseStandardAi) return;

    soundManager.playClick();
    const recentHistory = messages
      .filter((m) => !m.isError && m.id !== 'welcome')
      .slice(-6)
      .map((m) => ({
        role: m.role,
        text: m.text
      }));

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query: trimmed,
          activeSymbol,
          currentPrice,
          lang,
          history: recentHistory
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        const authErrText = isAr
          ? 'انتهت صلاحية الجلسة، يرجى تحديث الصفحة أو إعادة تسجيل الدخول للمتابعة.'
          : 'Your session has expired. Please refresh the page or sign in again.';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            text: authErrText,
            time: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            isError: true
          }
        ]);
        return;
      }

      if (res.status === 429) {
        const rateErrText =
          typeof data?.error === 'string' && data.error.trim()
            ? data.error.trim()
            : isAr
            ? 'تم الوصول إلى حد الرسائل المسموح به مؤقتاً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.'
            : 'Rate limit or cooldown reached. Please wait a moment and try again.';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            text: rateErrText,
            time: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            isError: true
          }
        ]);
        return;
      }

      if (!res.ok || !data?.reply) {
        throw new Error(data?.error || 'AI generation failed');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: String(data.reply),
          time: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: isAr
            ? 'عذراً، حدث خطأ في الاتصال بالمستشار الذكي. يرجى المحاولة مرة أخرى.'
            : 'Sorry, a connection error occurred. Please try again.',
          time: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="h-full flex flex-col bg-[#131722] text-[#d1d4dc] overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#089981]/15 border border-[#089981]/35 flex items-center justify-center text-[#089981] shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {isAr ? 'المساعد الذكي القياسي (Standard AI)' : 'Standard AI Assistant'}
            </div>
            <div className="text-[10px] text-[#8a93a6] truncate">
              {isAr ? 'متاح لباقة VIP ($100/mo) وأكواد التجربة' : 'VIP Tier ($100/mo) & AI Trial'}
            </div>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 whitespace-nowrap shrink-0">
          🔒 Super AI · {isAr ? 'Elite قريباً' : 'Elite Soon'}
        </span>
      </div>

      {/* Super AI Elite Locked Banner */}
      <div className="px-3 py-2 bg-[#1a1e2b] border-b border-[#2a2e39] flex items-center justify-between gap-2 text-[10px] shrink-0">
        <div className="flex items-center gap-1.5 text-amber-300 font-semibold min-w-0">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            🔒 {isAr ? 'المساعد الفائق (Super AI - صوتي ورؤية الشارت):' : 'Super AI (Voice & Chart Vision):'}
          </span>
        </div>
        <span className="text-[9px] font-bold text-amber-300 whitespace-nowrap shrink-0">
          {ELITE_LOCK_BADGE_TEXT}
        </span>
      </div>

      {/* Main Content */}
      {!canUseStandardAi ? (
        <div className="flex-1 flex flex-col items-center justify-center p-5 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1e222d] border border-amber-500/35 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold text-white">
            {isAr ? 'المساعد الذكي متاح لباقة VIP ($100/mo)' : 'Standard AI Requires VIP Tier ($100/mo)'}
          </h3>
          <p className="text-xs text-[#8a93a6] max-w-xs leading-relaxed">
            {isAr
              ? 'قم بالترقية إلى باقة VIP أو فعّل رمز تجربة لميزة Standard AI للبدء بالمحادثة المباشرة.'
              : 'Upgrade to the VIP Tier or redeem a Standard AI trial key to start conversational assistance.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {onOpenPlansModal && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onOpenPlansModal();
                }}
                className="px-4 py-2 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{isAr ? 'ترقية إلى VIP' : 'Upgrade to VIP'}</span>
              </button>
            )}
            {onOpenPromoModal && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onOpenPromoModal();
                }}
                className="px-4 py-2 rounded-xl bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#d1d4dc] font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? 'تفعيل رمز تجربة' : 'Redeem Trial Key'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#089981] text-white'
                      : msg.isError
                      ? 'bg-[#f23645]/10 border border-[#f23645]/40 text-[#f23645]'
                      : 'bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc]'
                  }`}
                >
                  {msg.isError && <AlertCircle className="w-3.5 h-3.5 inline me-1.5" />}
                  {msg.text}
                </div>
                <span className="text-[10px] text-[#787b86] font-mono mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-start">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl px-3.5 py-2.5 text-xs text-[#8a93a6]">
                  {isAr ? 'جاري إنشاء الإجابة...' : 'Generating response...'}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="p-2.5 bg-[#1e222d] border-t border-[#2a2e39] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isAr ? 'اسأل المساعد الذكي...' : 'Ask the assistant...'}
              disabled={loading}
              className="flex-1 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#787b86] focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3.5 py-2.5 rounded-xl bg-[#089981] hover:bg-[#07846f] disabled:opacity-45 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isAr ? 'إرسال' : 'Send'}</span>
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default SmartAssistantChat;
