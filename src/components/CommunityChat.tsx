import React, { useState } from 'react';
import { ChatMessage } from '../types/trading';
import {
  MessageSquare,
  Send,
  Heart,
  Crown,
  Shield,
  Zap,
  Image,
  ExternalLink,
  Users,
  Smile
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onLikeMessage: (id: string) => void;
}

export const CommunityChat: React.FC<Props> = ({
  messages,
  onSendMessage,
  onLikeMessage
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    soundManager.playClick();
    onSendMessage(inputText);
    setInputText('');
  };

  const renderBadge = (badge: ChatMessage['sender']['badge']) => {
    switch (badge) {
      case 'FOUNDER':
        return (
          <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3 text-amber-400" />
            <span>المؤسس (Founder)</span>
          </span>
        );
      case 'VIP_PRO':
        return (
          <span className="flex items-center gap-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>VIP ELITE</span>
          </span>
        );
      case 'SCALPER':
        return (
          <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>مضارب معتمد</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">
            عضو
          </span>
        );
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[700px]">
      {/* Header */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                غرفة نقاش مجتمع MBK VIP الحي
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>284 متداول أونلاين</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              محادثة مباشرة لتبادل صفقات السكالبينغ، كشوفات الأرباح، وتوجيهات فريق أبحاث MBK والمحللين المعتمدين
            </p>
          </div>
        </div>

        <a
          href="https://t.me"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600/30 transition-all text-xs font-bold"
        >
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span>قناة التليجرام الرسمية (1,000+ عضو)</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#0b0f17]">
        {messages.map((msg) => {
          const isFounder = msg.sender.badge === 'FOUNDER';

          return (
            <div
              key={msg.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isFounder
                  ? 'bg-gradient-to-r from-[#172338] to-[#121c2d] border-amber-500/30 shadow-md shadow-amber-500/5'
                  : 'bg-[#141b29] border-slate-800'
              }`}
            >
              {/* Message User Bar */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={msg.sender.avatar}
                    alt={msg.sender.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-200">{msg.sender.name}</span>
                      {renderBadge(msg.sender.badge)}
                    </div>
                    <span className="text-[10px] text-slate-500">{msg.sender.roleAr}</span>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
              </div>

              {/* Message Content */}
              <p className="text-xs text-slate-200 leading-relaxed font-sans pr-10">
                {msg.content}
              </p>

              {/* Likes and Reactions Bar */}
              <div className="flex items-center justify-end gap-2 mt-2 pt-1.5 border-t border-slate-800/60">
                <button
                  onClick={() => onLikeMessage(msg.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    msg.isLikedByMe
                      ? 'text-rose-400 bg-rose-500/10'
                      : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${msg.isLikedByMe ? 'fill-rose-400' : ''}`} />
                  <span>{msg.likes}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-[#0f172a] border-t border-slate-800 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          placeholder="شارك برأيك أو استفسر عن صفقة الآن..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
        />

        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-600/30 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>إرسال</span>
        </button>
      </form>
    </div>
  );
};
