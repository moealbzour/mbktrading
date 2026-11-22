import React from 'react';
import { MessageSquare, Mail, Users, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile, MarketSymbol } from '../../types/trading';
import { PublicTradingChat } from './PublicTradingChat';
import { DirectMessagesPanel, DmTargetUser } from './DirectMessagesPanel';
import { soundManager } from '../../utils/audio';

export type MessengerSubTab = 'general' | 'dm';

interface UnifiedMessengerHubProps {
  user: UserProfile;
  currentUserName?: string;
  isVIP: boolean;
  userRole?: string;
  isAdmin?: boolean;
  isMutedFromChat?: boolean;
  lang?: 'ar' | 'en';
  isCompact?: boolean;
  activeTab: MessengerSubTab;
  onSelectTab: (tab: MessengerSubTab) => void;
  unreadChatCount?: number;
  unreadDmCount?: number;
  dmTargetUser: DmTargetUser | null;
  onStartDirectMessage: (target: DmTargetUser) => void;
  onClearInitialTarget?: () => void;
  onClearDmTarget?: () => void;
  onOpenPromoModal?: () => void;
  onOpenPlansModal?: () => void;
  onSelectSymbol?: (sym: MarketSymbol) => void;
}

export const UnifiedMessengerHub: React.FC<UnifiedMessengerHubProps> = ({
  user,
  currentUserName,
  isVIP,
  userRole,
  isAdmin,
  isMutedFromChat,
  lang = 'ar',
  isCompact = false,
  activeTab,
  onSelectTab,
  unreadChatCount = 0,
  unreadDmCount = 0,
  dmTargetUser,
  onStartDirectMessage,
  onClearInitialTarget,
  onClearDmTarget,
  onOpenPromoModal,
  onOpenPlansModal,
  onSelectSymbol
}) => {
  const isAr = lang === 'ar';
  const roleUpper = (userRole || user.role || '').toUpperCase();
  const isAdminOrMod =
    Boolean(isAdmin) ||
    Boolean(user.isAdmin) ||
    ['ADMIN', 'MODERATOR'].includes(roleUpper) ||
    user.email?.toLowerCase() === 'moe.albzour@gmail.com';

  return (
    <div
      className="h-full w-full flex-1 min-h-0 flex flex-col bg-[#10141c] overflow-hidden select-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Unified Messenger Switcher Bar */}
      <div className="px-2.5 sm:px-3 py-1.5 bg-[#0a0d12] border-b border-[#1e2633] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-0.5 bg-[#10141c] p-0.5 rounded-[3px] border border-[#1e2633]">
          {/* Tab 1: General Trading Floor */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onSelectTab('general');
            }}
            className={`px-2.5 py-1 rounded-[2px] text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer relative ${
              activeTab === 'general'
                ? 'bg-[#1c2432] text-[#edf0f5] font-semibold border border-[#2a3446]'
                : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'قاعة المتداولين (الشات العام)' : 'Trading Floor'}</span>
            {unreadChatCount > 0 && activeTab !== 'general' && (
              <span className="min-w-[16px] h-4 px-1 rounded-[2px] bg-[#10b981] text-[#0a0d12] text-[9px] font-mono font-bold flex items-center justify-center">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </button>

          {/* Tab 2: Direct Messages Inbox */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onSelectTab('dm');
            }}
            className={`px-2.5 py-1 rounded-[2px] text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer relative ${
              activeTab === 'dm'
                ? 'bg-[#1c2432] text-[#edf0f5] font-semibold border border-[#2a3446]'
                : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'صندوق الوارد (الرسائل الخاصة)' : 'Inbox (Direct Messages)'}</span>
            {unreadDmCount > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-[2px] bg-[#e11d48] text-white text-[9px] font-mono font-bold flex items-center justify-center">
                {unreadDmCount > 99 ? '99+' : unreadDmCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Desk Status Indicator */}
        {!isCompact && (
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-[#8492a6]">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10b981]" />
            <span>{isAr ? 'غرفة التداول المباشرة' : 'COMMUNICATIONS DESK'}</span>
          </div>
        )}
      </div>

      {/* Active Messenger Viewport */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'general' ? (
          <PublicTradingChat
            user={user}
            currentUserName={currentUserName || user.name || user.email.split('@')[0]}
            isVIP={isVIP}
            userRole={userRole || user.role}
            isAdmin={isAdminOrMod}
            isMutedFromChat={isMutedFromChat ?? user.isMutedFromChat}
            onOpenPromoModal={onOpenPromoModal}
            onOpenPlansModal={onOpenPlansModal}
            onStartDirectMessage={(target) => {
              onStartDirectMessage(target);
              onSelectTab('dm');
            }}
            onSelectSymbol={onSelectSymbol}
            lang={lang}
            isCompact={isCompact}
          />
        ) : (
          <DirectMessagesPanel
            user={user}
            lang={lang}
            initialTargetUser={dmTargetUser}
            onClearInitialTarget={onClearInitialTarget || onClearDmTarget || (() => {})}
            isCompact={isCompact}
          />
        )}
      </div>
    </div>
  );
};
