import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types/trading';
import {
  Crown,
  ShieldCheck,
  Send,
  Image,
  ExternalLink,
  Lock,
  Ticket,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { soundManager } from '../../utils/audio';

export interface VipChatMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  senderRole: 'RESEARCH_TEAM' | 'VIP_MEMBER' | 'FREE_USER';
  senderRoleLabel: string;
  content: string;
  chartUrl?: string;
  timestamp?: any;
  timeFormatted?: string;
  uid?: string;
}

// Initial high-fidelity seed messages if Firestore is empty
const SEED_VIP_MESSAGES: VipChatMessage[] = [
  {
    id: 'seed-1',
    senderName: 'فريق أبحاث MBK',
    senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    senderRole: 'RESEARCH_TEAM',
    senderRoleLabel: 'فريق أبحاث MBK',
    content: 'تحديث جلسة نيويورك: تم تأكيد سحب سيولة قاع لندن على مؤشر US100 عند 20,810. نراقب ارتداداً خوارزمياً نحو منطقة الفير فاليو جاب (FVG) عند 20,950.',
    chartUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
    timeFormatted: '15:42'
  },
  {
    id: 'seed-2',
    senderName: 'عمر القحطاني',
    senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    senderRole: 'VIP_MEMBER',
    senderRoleLabel: 'عضو VIP',
    content: 'صفقة الذهب المحققة صباح اليوم أغلقت بالكامل على الهدف الثاني (+164 نقطة)! التزام صارم بإدارة رأس المال كما أوصيتم.',
    timeFormatted: '15:48'
  },
  {
    id: 'seed-3',
    senderName: 'فهد المطيري',
    senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    senderRole: 'VIP_MEMBER',
    senderRoleLabel: 'عضو VIP',
    content: 'هل يوجد دخول جديد على زوج EURUSD بعد إعادة اختبار الـ Order Block اليومي؟',
    timeFormatted: '15:52'
  },
  {
    id: 'seed-4',
    senderName: 'فريق أبحاث MBK',
    senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    senderRole: 'RESEARCH_TEAM',
    senderRoleLabel: 'فريق أبحاث MBK',
    content: 'نعم فهد، تم تحديث إشارة بيع EURUSD في جدول الإشارات اللحظي. الهدف الأول 1.08420 مع وقف خسارة محكم 1.08950. بالتوفيق للجميع.',
    timeFormatted: '15:55'
  }
];

interface VipChatProps {
  currentUser: UserProfile;
  onOpenPromoModal: () => void;
  className?: string;
}

export const VipChat: React.FC<VipChatProps> = ({
  currentUser,
  onOpenPromoModal,
  className = ''
}) => {
  const [messages, setMessages] = useState<VipChatMessage[]>(SEED_VIP_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [chartUrlInput, setChartUrlInput] = useState('');
  const [showChartInput, setShowChartInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionLive, setConnectionLive] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isVip = currentUser.role?.toUpperCase() === 'VIP';

  // Format firestore timestamp safely
  const formatTime = (ts: any): string => {
    if (!ts) return new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    if (ts instanceof Timestamp) {
      return ts.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }
    if (ts.toDate && typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }
    return new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  // Real-time Firestore onSnapshot listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      const q = query(
        collection(db, 'chat_messages'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setConnectionLive(true);
          if (!snapshot.empty) {
            const fetched: VipChatMessage[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                senderName: data.senderName || 'متداول MBK',
                senderAvatar:
                  data.senderAvatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                senderRole: data.senderRole || 'VIP_MEMBER',
                senderRoleLabel:
                  data.senderRole === 'RESEARCH_TEAM' ? 'فريق أبحاث MBK' : 'عضو VIP',
                content: data.content || '',
                chartUrl: data.chartUrl || undefined,
                timestamp: data.timestamp,
                timeFormatted: formatTime(data.timestamp),
                uid: data.uid
              };
            });
            // Reverse so earliest is top, latest is bottom
            setMessages(fetched.reverse());
          } else {
            // Keep seed messages if collection is currently fresh
            setMessages(SEED_VIP_MESSAGES);
          }
        },
        (error) => {
          console.warn('[VipChat] Firestore onSnapshot listener notice:', error.message);
          setConnectionLive(false);
          // Fall back gracefully to institutional seed history
          setMessages(SEED_VIP_MESSAGES);
        }
      );
    } catch (err) {
      console.warn('[VipChat] Listener setup error:', err);
      setConnectionLive(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVip) {
      onOpenPromoModal();
      return;
    }

    const text = inputText.trim();
    if (!text || isSubmitting) return;

    soundManager.playClick();
    setIsSubmitting(true);

    const isMbkResearch =
      currentUser.email?.includes('admin') ||
      currentUser.email?.includes('research') ||
      currentUser.email === 'moe.albzour@gmail.com';

    const newMessageData = {
      senderName: currentUser.name || 'عضو VIP',
      senderAvatar:
        currentUser.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      senderRole: isMbkResearch ? 'RESEARCH_TEAM' : 'VIP_MEMBER',
      senderRoleLabel: isMbkResearch ? 'فريق أبحاث MBK' : 'عضو VIP',
      content: text,
      chartUrl: chartUrlInput.trim() || null,
      timestamp: serverTimestamp(),
      uid: currentUser.uid || 'user-vip'
    };

    try {
      await addDoc(collection(db, 'chat_messages'), newMessageData);
      soundManager.playSignalPing();
      setInputText('');
      setChartUrlInput('');
      setShowChartInput(false);
    } catch (err) {
      console.warn('[VipChat] Firestore addDoc fallback:', err);
      // Client optimistic add
      const optimisticMsg: VipChatMessage = {
        id: `local-${Date.now()}`,
        senderName: currentUser.name || 'عضو VIP',
        senderAvatar:
          currentUser.avatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        senderRole: isMbkResearch ? 'RESEARCH_TEAM' : 'VIP_MEMBER',
        senderRoleLabel: isMbkResearch ? 'فريق أبحاث MBK' : 'عضو VIP',
        content: text,
        chartUrl: chartUrlInput.trim() || undefined,
        timeFormatted: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      soundManager.playSignalPing();
      setInputText('');
      setChartUrlInput('');
      setShowChartInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px] relative font-['Cairo',sans-serif] ${className}`}
    >
      {/* 1. HEADER */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-600 to-emerald-500 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-[#0d131f] rounded-[10px] flex items-center justify-center text-amber-400">
              <Crown className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-100">
                غرفة نقاش مجتمع MBK VIP الحصرية
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Real-Time Firestore</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              نقاشات حية مباشرة ومشاركة للشارتات بين أعضاء VIP ونخبة محللي فريق أبحاث MBK
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isVip ? (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>أنت عضو VIP موثق</span>
            </span>
          ) : (
            <button
              onClick={onOpenPromoModal}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>تفعيل عضوية VIP</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CHAT FEED CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b0f17] relative">
        {/* FREE USER BLURRED OVERLAY */}
        {!isVip && (
          <div className="absolute inset-0 bg-[#0b0f17]/85 backdrop-blur-[6px] z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-3 shadow-xl shadow-amber-500/10">
              <Lock className="w-7 h-7" />
            </div>

            <h4 className="text-base font-black text-slate-100 mb-2">
              غرفة النقاش المباشر مجانية لأعضاء VIP
            </h4>

            <p className="text-xs text-slate-300 max-w-md leading-relaxed mb-5">
              يشارك فريق أبحاث MBK والمحللون المعتمدون كشوفات الصفقات اللحظية ومناطق سحب السيولة الحصرية. أدخل رمز التفعيل أو رمز الشراكة لفتح الغرفة فوراً مجاناً.
            </p>

            <button
              onClick={onOpenPromoModal}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/30 transition-all flex items-center gap-2 cursor-pointer transform hover:scale-105"
            >
              <Ticket className="w-4 h-4" />
              <span>أدخل رمز الترويج للتفعيل الفوري (Promo Code)</span>
            </button>

            <div className="mt-4 flex items-center gap-4 text-[11px] text-slate-400 font-mono">
              <span>الرموز المعتمدة: MBK2026 • VIP2026 • TELEGRAMVIP</span>
            </div>
          </div>
        )}

        {/* MESSAGES LIST */}
        {messages.map((msg) => {
          const isResearch = msg.senderRole === 'RESEARCH_TEAM';

          return (
            <div
              key={msg.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isResearch
                  ? 'bg-gradient-to-r from-[#182338] via-[#121c2d] to-[#141d2e] border-amber-500/40 shadow-lg shadow-amber-500/5'
                  : 'bg-[#131b29] border-slate-800'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className={`w-8 h-8 rounded-full object-cover border ${
                      isResearch ? 'border-amber-400 shadow-sm' : 'border-emerald-400/80'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">{msg.senderName}</span>

                      {/* ROLE BADGES: MBK Research (Gold) vs VIP Member (Green) */}
                      {isResearch ? (
                        <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>فريق أبحاث MBK</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>عضو VIP</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">{msg.timeFormatted}</span>
              </div>

              {/* Message Text */}
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>

              {/* Shared Chart Screenshot Attachment */}
              {msg.chartUrl && (
                <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900/60 max-w-md">
                  <img
                    src={msg.chartUrl}
                    alt="مخطط فني مرفق"
                    className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="p-1.5 px-3 bg-[#0a0f18] text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800">
                    <span className="flex items-center gap-1 text-cyan-400 font-mono">
                      <ExternalLink className="w-3 h-3" />
                      <span>شارت تحليلي مرفق</span>
                    </span>
                    <a
                      href={msg.chartUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
                    >
                      عرض بالحجم الكامل
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. INPUT FORM (VIP ONLY / LOCKED FOR FREE) */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-[#0f172a] border-t border-slate-800 flex flex-col gap-2 shrink-0"
      >
        {showChartInput && (
          <div className="flex items-center gap-2 bg-[#090d16] p-2 rounded-xl border border-slate-800 animate-in slide-in-from-bottom-2">
            <Image className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="url"
              placeholder="رابط لقطة الشارت (TradingView Screenshot URL)..."
              value={chartUrlInput}
              onChange={(e) => setChartUrlInput(e.target.value)}
              disabled={!isVip || isSubmitting}
              className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setShowChartInput(false)}
              className="text-xs text-slate-400 hover:text-white px-2"
            >
              إلغاء
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Attach Chart Button */}
          <button
            type="button"
            onClick={() => {
              if (!isVip) {
                onOpenPromoModal();
                return;
              }
              setShowChartInput(!showChartInput);
            }}
            title="إرفاق رابط شارت"
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              showChartInput
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Image className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isVip
                ? 'اكتب رسالتك أو استفسارك الفني في غرفة VIP المباشرة...'
                : 'غرفة النقاش متاحة فقط لأعضاء VIP — أدخل رمز التفعيل للمشاركة'
            }
            disabled={!isVip || isSubmitting}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!isVip || !inputText.trim() || isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <span>إرسال</span>
            <Send className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </form>
    </div>
  );
};
