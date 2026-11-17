import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCheck,
  Crown,
  Lock,
  Mail,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Unlock,
  UserCheck,
  Users
} from 'lucide-react';
import { ChatProfile, DmConversation, DmMessage, UserProfile } from '../../types/trading';
import {
  getDmConversationId,
  getOtherParticipantUid,
  markDmConversationRead,
  sendDirectMessage,
  subscribeToChatDirectory,
  subscribeToDmConversations,
  subscribeToDmMessages,
  subscribeToOwnChatProfile,
  syncOwnChatProfile,
  updateDmPrivacySettings
} from '../../services/directMessageService';
import { soundManager } from '../../utils/audio';

export interface DmTargetUser {
  uid: string;
  displayName: string;
  avatar?: string;
  role?: string;
}

interface Props {
  user: UserProfile;
  lang?: 'ar' | 'en';
  initialTargetUser?: DmTargetUser | null;
  onClearInitialTarget?: () => void;
}

function formatMessageTime(tsMs: number, isAr: boolean): string {
  if (!tsMs) return '';
  try {
    return new Date(tsMs).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function renderRoleBadge(role?: string) {
  const r = (role || 'FREE').toUpperCase();
  if (r === 'ADMIN') {
    return (
      <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center gap-0.5 shrink-0">
        <Crown className="w-2.5 h-2.5 text-rose-400" />
        <span>ADMIN</span>
      </span>
    );
  }
  if (r === 'VIP' || r === 'ELITE') {
    return (
      <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-0.5 shrink-0">
        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
        <span>{r}</span>
      </span>
    );
  }
  if (['MODERATOR', 'SALES', 'ANALYST', 'ANALYSER'].includes(r)) {
    return (
      <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 inline-flex items-center gap-0.5 shrink-0">
        <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
        <span>{r}</span>
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#2a2e39] text-[#9db2c6] border border-[#363a45] shrink-0">
      FREE
    </span>
  );
}

export const DirectMessagesPanel: React.FC<Props> = ({
  user,
  lang = 'ar',
  initialTargetUser,
  onClearInitialTarget
}) => {
  const isAr = lang === 'ar';
  const myUid = user.uid || user.id || '';
  const myDisplayName = (user.name || user.email?.split('@')[0] || 'MBK Trader').trim();

  const [ownChatProfile, setOwnChatProfile] = useState<ChatProfile | null>(null);
  const [directory, setDirectory] = useState<ChatProfile[]>([]);
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [selectedRecipientUid, setSelectedRecipientUid] = useState<string | null>(null);
  const [selectedFallbackRecipient, setSelectedFallbackRecipient] = useState<DmTargetUser | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'members'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showNotice = (type: 'error' | 'success', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Sync own lightweight directory profile so other users can reach us
  useEffect(() => {
    if (!myUid) return;
    syncOwnChatProfile(user).catch(() => {});
  }, [myUid, user]);

  // Subscribe to own DM privacy settings, chat directory, and conversations
  useEffect(() => {
    if (!myUid) return;
    const unsubOwn = subscribeToOwnChatProfile(myUid, setOwnChatProfile);
    const unsubDir = subscribeToChatDirectory(setDirectory);
    const unsubConvos = subscribeToDmConversations(myUid, setConversations);
    return () => {
      unsubOwn();
      unsubDir();
      unsubConvos();
    };
  }, [myUid]);

  // Handle jump-to-DM from PublicTradingChat
  useEffect(() => {
    if (!initialTargetUser?.uid || initialTargetUser.uid === myUid) return;
    setSelectedRecipientUid(initialTargetUser.uid);
    setSelectedFallbackRecipient(initialTargetUser);
    setSidebarTab('chats');
    onClearInitialTarget?.();
  }, [initialTargetUser, myUid, onClearInitialTarget]);

  const activeConvoId = useMemo(() => {
    if (!myUid || !selectedRecipientUid) return '';
    return getDmConversationId(myUid, selectedRecipientUid);
  }, [myUid, selectedRecipientUid]);

  // Subscribe to active thread messages
  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeToDmMessages(activeConvoId, setMessages);
    return () => unsub();
  }, [activeConvoId]);

  // Auto-mark unread messages read when viewing thread
  useEffect(() => {
    if (!activeConvoId || !myUid) return;
    const activeConvo = conversations.find((c) => c.id === activeConvoId);
    if (activeConvo && Number(activeConvo.unreadBy?.[myUid] || 0) > 0) {
      markDmConversationRead(activeConvoId, myUid).catch(() => {});
    }
  }, [activeConvoId, myUid, conversations, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConvoId]);

  const directoryByUid = useMemo(() => {
    const map = new Map<string, ChatProfile>();
    directory.forEach((p) => map.set(p.uid, p));
    return map;
  }, [directory]);

  const activeRecipient = useMemo(() => {
    if (!selectedRecipientUid) return null;
    const dirProfile = directoryByUid.get(selectedRecipientUid);
    if (dirProfile) return dirProfile;

    const convo = conversations.find((c) => c.id === activeConvoId);
    if (convo) {
      return {
        uid: selectedRecipientUid,
        displayName: convo.participantNames?.[selectedRecipientUid] || 'Trader',
        avatar: convo.participantAvatars?.[selectedRecipientUid] || '',
        role: convo.participantRoles?.[selectedRecipientUid] || 'FREE',
        allowDirectMessages: true,
        blockedUids: []
      } as ChatProfile;
    }

    if (selectedFallbackRecipient?.uid === selectedRecipientUid) {
      return {
        uid: selectedFallbackRecipient.uid,
        displayName: selectedFallbackRecipient.displayName || 'Trader',
        avatar: selectedFallbackRecipient.avatar || '',
        role: selectedFallbackRecipient.role || 'FREE',
        allowDirectMessages: true,
        blockedUids: []
      } as ChatProfile;
    }

    return null;
  }, [selectedRecipientUid, directoryByUid, conversations, activeConvoId, selectedFallbackRecipient]);

  const myAllowDm = ownChatProfile ? ownChatProfile.allowDirectMessages !== false : true;
  const myBlockedUids = useMemo(() => ownChatProfile?.blockedUids || [], [ownChatProfile]);

  const isRecipientBlockedByMe = Boolean(
    selectedRecipientUid && myBlockedUids.includes(selectedRecipientUid)
  );
  const recipientAllowsDm = activeRecipient ? activeRecipient.allowDirectMessages !== false : true;
  const hasRecipientBlockedMe = Boolean(
    activeRecipient && Array.isArray(activeRecipient.blockedUids) && activeRecipient.blockedUids.includes(myUid)
  );

  const canSendMessage = Boolean(
    selectedRecipientUid && !isRecipientBlockedByMe && recipientAllowsDm && !hasRecipientBlockedMe
  );

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return directory.filter((p) => {
      if (p.uid === myUid) return false;
      if (!q) return true;
      return (
        p.displayName.toLowerCase().includes(q) ||
        (p.role || '').toLowerCase().includes(q)
      );
    });
  }, [directory, myUid, searchQuery]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((convo) => {
      const otherUid = getOtherParticipantUid(convo.participants, myUid);
      const otherProfile = directoryByUid.get(otherUid);
      const otherName = otherProfile?.displayName || convo.participantNames?.[otherUid] || 'Trader';
      if (!q) return true;
      return (
        otherName.toLowerCase().includes(q) ||
        convo.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [conversations, directoryByUid, myUid, searchQuery]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => sum + Number(c.unreadBy?.[myUid] || 0), 0);
  }, [conversations, myUid]);

  const handleToggleGlobalDm = async () => {
    if (!myUid || updatingPrivacy) return;
    soundManager.playClick();
    setUpdatingPrivacy(true);
    try {
      const next = !myAllowDm;
      await updateDmPrivacySettings(myUid, { allowDirectMessages: next });
      soundManager.playSuccess();
      showNotice(
        'success',
        next
          ? isAr
            ? 'تم تفعيل استقبال الرسائل الخاصة من الأعضاء'
            : 'Direct Messages enabled'
          : isAr
          ? 'تم إيقاف استقبال الرسائل الخاصة من جميع الأعضاء'
          : 'Direct Messages disabled — users can no longer message you'
      );
    } catch (err: any) {
      showNotice('error', err?.message || (isAr ? 'تعذر تحديث الإعدادات' : 'Failed to update setting'));
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const handleToggleBlockRecipient = async () => {
    if (!myUid || !selectedRecipientUid || updatingPrivacy) return;
    soundManager.playClick();
    setUpdatingPrivacy(true);
    try {
      const nextBlocked = isRecipientBlockedByMe
        ? myBlockedUids.filter((id) => id !== selectedRecipientUid)
        : [...myBlockedUids, selectedRecipientUid];
      await updateDmPrivacySettings(myUid, { blockedUids: nextBlocked });
      soundManager.playSuccess();
      showNotice(
        'success',
        isRecipientBlockedByMe
          ? isAr
            ? 'تم إلغاء الحظر — يمكن للمستخدم مراسلتك الآن'
            : 'User unblocked'
          : isAr
          ? 'تم حظر هذا المستخدم من إرسال رسائل خاصة إليك'
          : 'User blocked from sending you direct messages'
      );
    } catch (err: any) {
      showNotice('error', err?.message || (isAr ? 'تعذر تحديث حالة الحظر' : 'Failed to update block list'));
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myUid || !activeRecipient || !canSendMessage || sending) return;
    const text = messageInput.trim().slice(0, 1000);
    if (!text) return;

    setSending(true);
    soundManager.playClick();
    try {
      await sendDirectMessage({
        sender: {
          uid: myUid,
          displayName: myDisplayName,
          avatar: user.avatar || '',
          role: (user.role || 'FREE').toString().toUpperCase()
        },
        recipient: {
          uid: activeRecipient.uid,
          displayName: activeRecipient.displayName,
          avatar: activeRecipient.avatar || '',
          role: activeRecipient.role || 'FREE'
        },
        text
      });
      setMessageInput('');
      soundManager.playSuccess();
    } catch (err: any) {
      showNotice('error', err?.message || (isAr ? 'تعذر إرسال الرسالة الخاصة' : 'Could not send message'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="h-[calc(100vh-140px)] min-h-[480px] w-full rounded-2xl border border-[#2a2e39] bg-[#1e222d] overflow-hidden flex flex-col shadow-2xl"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Bar: Header & Global DM Privacy Toggle */}
      <div className="px-4 py-3 bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#089981]/15 border border-[#089981]/40 flex items-center justify-center text-[#089981]">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-white">
                {isAr ? 'الرسائل الخاصة المباشرة (DM)' : 'Direct Messages (DM)'}
              </h2>
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#f23645] text-white">
                  {totalUnread}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#787b86]">
              {isAr
                ? 'تواصل خاص مشفر بين المتداولين مع تحكم كامل بالخصوصية والحظر'
                : 'Private 1-to-1 trader messaging with full opt-in & block controls'}
            </p>
          </div>
        </div>

        {/* Global Allow / Stop DM Switch */}
        <button
          type="button"
          disabled={updatingPrivacy}
          onClick={handleToggleGlobalDm}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            myAllowDm
              ? 'bg-[#089981]/15 border-[#089981]/40 text-[#089981] hover:bg-[#089981]/25'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25'
          }`}
          title={
            isAr
              ? 'تبديل استقبال الرسائل الخاصة من الأعضاء'
              : 'Toggle receiving direct messages from other users'
          }
        >
          {myAllowDm ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          <span>
            {myAllowDm
              ? isAr
                ? 'استقبال الرسائل: مفتوح'
                : 'DMs Open: ON'
              : isAr
              ? 'استقبال الرسائل: موقوف'
              : 'DMs Blocked: OFF'}
          </span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`px-4 py-2 text-xs font-bold border-b shrink-0 ${
            feedback.type === 'error'
              ? 'bg-[#f23645]/15 border-[#f23645]/30 text-[#f23645]'
              : 'bg-[#089981]/15 border-[#089981]/30 text-[#089981]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Split Workspace: Sidebar List + Active Thread */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT/START: Conversations & Members Directory */}
        <div
          className={`w-full md:w-80 lg:w-96 border-e border-[#2a2e39] bg-[#171b26] flex flex-col shrink-0 ${
            selectedRecipientUid ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Tabs: Chats | Members */}
          <div className="p-2.5 border-b border-[#2a2e39] space-y-2">
            <div className="grid grid-cols-2 gap-1.5 bg-[#131722] p-1 rounded-xl border border-[#2a2e39]">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSidebarTab('chats');
                }}
                className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  sidebarTab === 'chats'
                    ? 'bg-[#089981] text-white shadow'
                    : 'text-[#787b86] hover:text-white'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{isAr ? 'المحادثات' : 'Chats'}</span>
                {totalUnread > 0 && (
                  <span className="px-1.5 rounded-full bg-[#f23645] text-white text-[9px] font-mono">
                    {totalUnread}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSidebarTab('members');
                }}
                className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  sidebarTab === 'members'
                    ? 'bg-[#089981] text-white shadow'
                    : 'text-[#787b86] hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isAr ? 'الأعضاء' : 'Members'}</span>
                <span className="text-[10px] opacity-80 font-mono">({Math.max(0, directory.length - 1)})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث باسم العضو أو المحادثة...' : 'Search trader or message...'}
                className="w-full ps-8 pe-3 py-1.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-xs text-white placeholder-[#787b86] focus:outline-none"
              />
            </div>
          </div>

          {/* List Body */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#2a2e39]/60">
            {sidebarTab === 'chats' ? (
              filteredConversations.length === 0 ? (
                <div className="p-6 text-center space-y-2.5 text-[#787b86]">
                  <MessageCircle className="w-8 h-8 mx-auto opacity-40 text-[#089981]" />
                  <p className="text-xs font-bold text-white">
                    {isAr ? 'لا توجد محادثات خاصة بعد' : 'No direct conversations yet'}
                  </p>
                  <p className="text-[11px]">
                    {isAr
                      ? 'اختر تبويب الأعضاء لبدء محادثة خاصة جديدة مع أي متداول.'
                      : 'Open the Members tab to start a private conversation.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('members')}
                    className="px-3 py-1.5 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'تصفح الأعضاء' : 'Browse Members'}
                  </button>
                </div>
              ) : (
                filteredConversations.map((convo) => {
                  const otherUid = getOtherParticipantUid(convo.participants, myUid);
                  const profile = directoryByUid.get(otherUid);
                  const otherName = profile?.displayName || convo.participantNames?.[otherUid] || 'Trader';
                  const otherAvatar = profile?.avatar || convo.participantAvatars?.[otherUid] || '';
                  const otherRole = profile?.role || convo.participantRoles?.[otherUid] || 'FREE';
                  const unread = Number(convo.unreadBy?.[myUid] || 0);
                  const isActive = selectedRecipientUid === otherUid;

                  return (
                    <button
                      key={convo.id}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedRecipientUid(otherUid);
                        setSelectedFallbackRecipient({
                          uid: otherUid,
                          displayName: otherName,
                          avatar: otherAvatar,
                          role: otherRole
                        });
                      }}
                      className={`w-full p-3 flex items-center gap-2.5 text-start transition-colors cursor-pointer ${
                        isActive ? 'bg-[#089981]/15 border-s-2 border-[#089981]' : 'hover:bg-[#1e222d]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#2a2e39] border border-[#363a45] flex items-center justify-center font-bold text-xs text-white overflow-hidden shrink-0">
                        {otherAvatar ? (
                          <img src={otherAvatar} alt={otherName} className="w-full h-full object-cover" />
                        ) : (
                          otherName[0]?.toUpperCase() || 'T'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{otherName}</span>
                          <span className="text-[10px] font-mono text-[#787b86] shrink-0">
                            {formatMessageTime(convo.lastMessageAtMs, isAr)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="text-[11px] text-[#9db2c6] truncate">
                            {convo.lastSenderUid === myUid ? (isAr ? 'أنت: ' : 'You: ') : ''}
                            {convo.lastMessage}
                          </span>
                          {unread > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#f23645] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : filteredMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#787b86]">
                {isAr ? 'لا يوجد أعضاء مطابقون لبحثك.' : 'No matching traders found.'}
              </div>
            ) : (
              filteredMembers.map((member) => {
                const blockedByMe = myBlockedUids.includes(member.uid);
                const dmClosed = member.allowDirectMessages === false;
                const isSelected = selectedRecipientUid === member.uid;

                return (
                  <button
                    key={member.uid}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setSelectedRecipientUid(member.uid);
                      setSelectedFallbackRecipient({
                        uid: member.uid,
                        displayName: member.displayName,
                        avatar: member.avatar,
                        role: member.role
                      });
                    }}
                    className={`w-full p-3 flex items-center justify-between gap-2 text-start transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#089981]/15 border-s-2 border-[#089981]' : 'hover:bg-[#1e222d]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#2a2e39] border border-[#363a45] flex items-center justify-center font-bold text-xs text-white overflow-hidden shrink-0">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.displayName} className="w-full h-full object-cover" />
                        ) : (
                          member.displayName[0]?.toUpperCase() || 'T'
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{member.displayName}</span>
                          {renderRoleBadge(member.role)}
                        </div>
                        <span className="text-[10px] text-[#787b86] block mt-0.5">
                          {blockedByMe
                            ? isAr
                              ? 'محظور بواسطتك'
                              : 'Blocked by you'
                            : dmClosed
                            ? isAr
                              ? 'أوقف استقبال الرسائل الخاصة'
                              : 'Direct messages paused'
                            : isAr
                            ? 'متاح للمراسلة الخاصة'
                            : 'Open for DMs'}
                        </span>
                      </div>
                    </div>

                    {blockedByMe || dmClosed ? (
                      <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-[#089981] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT/END: Active DM Thread */}
        <div
          className={`flex-1 min-w-0 flex flex-col bg-[#131722] ${
            selectedRecipientUid ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!activeRecipient ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1e222d] border border-[#2a2e39] flex items-center justify-center text-[#089981]">
                <Mail className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'اختر محادثة أو عضواً لبدء المراسلة' : 'Select a conversation or member'}
              </h3>
              <p className="text-xs text-[#787b86] max-w-sm leading-relaxed">
                {isAr
                  ? 'يمكنك إرسال رسائل خاصة فورية مع إشعارات صوتية وتنبيهات مباشرة، كما يمكنك إغلاق استقبال الرسائل أو حظر أي مرسل في أي وقت.'
                  : 'Send instant 1-to-1 messages with live sound & notification alerts, or toggle DM privacy / block any sender at any time.'}
              </p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="px-4 py-2.5 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedRecipientUid(null)}
                    className="md:hidden p-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-[#d1d4dc] hover:text-white cursor-pointer"
                    aria-label="Back"
                  >
                    {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  </button>

                  <div className="w-9 h-9 rounded-full bg-[#2a2e39] border border-[#363a45] flex items-center justify-center font-bold text-xs text-white overflow-hidden shrink-0">
                    {activeRecipient.avatar ? (
                      <img
                        src={activeRecipient.avatar}
                        alt={activeRecipient.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      activeRecipient.displayName[0]?.toUpperCase() || 'T'
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {activeRecipient.displayName}
                      </span>
                      {renderRoleBadge(activeRecipient.role)}
                    </div>
                    <span className="text-[10px] text-[#787b86] block">
                      {!recipientAllowsDm
                        ? isAr
                          ? 'أغلق استقبال الرسائل الخاصة'
                          : 'DMs turned off by user'
                        : isRecipientBlockedByMe
                        ? isAr
                          ? 'قمت بحظر هذا المستخدم'
                          : 'Blocked by you'
                        : isAr
                        ? 'محادثة خاصة مباشرة'
                        : 'Private Direct Thread'}
                    </span>
                  </div>
                </div>

                {/* Per-User Block / Unblock Button */}
                <button
                  type="button"
                  disabled={updatingPrivacy}
                  onClick={handleToggleBlockRecipient}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                    isRecipientBlockedByMe
                      ? 'bg-[#089981]/15 border-[#089981]/40 text-[#089981] hover:bg-[#089981]/25'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  {isRecipientBlockedByMe ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إلغاء الحظر' : 'Unblock'}</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حظر من الخاص' : 'Block DM'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-[#787b86] text-xs space-y-1">
                    <MessageCircle className="w-7 h-7 opacity-40 text-[#089981]" />
                    <p>
                      {isAr
                        ? `ابدأ محادثة خاصة مع ${activeRecipient.displayName}`
                        : `Start a private chat with ${activeRecipient.displayName}`}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderUid === myUid;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow ${
                            isMine
                              ? 'bg-gradient-to-br from-[#089981]/30 to-[#065f46]/30 border border-[#089981]/40 text-white rounded-ee-sm'
                              : 'bg-[#1e222d] border border-[#2a2e39] text-[#e1e4ea] rounded-es-sm'
                          }`}
                        >
                          <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                          <div className="mt-1 flex items-center justify-end gap-1 text-[9px] font-mono text-[#787b86]">
                            <span>{formatMessageTime(msg.timestampMs, isAr)}</span>
                            {isMine && <CheckCheck className="w-3 h-3 text-[#089981]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer or Privacy Lock Notice */}
              {!canSendMessage ? (
                <div className="p-3 border-t border-[#2a2e39] bg-[#1e222d] text-center text-xs font-bold text-amber-300 flex items-center justify-center gap-2 shrink-0">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    {isRecipientBlockedByMe
                      ? isAr
                        ? 'قمت بحظر هذا المستخدم — قم بإلغاء الحظر إذا أردت مراسلته.'
                        : 'You blocked this user — unblock them to send a message.'
                      : isAr
                      ? 'هذا المستخدم لا يستقبل رسائل خاصة حالياً.'
                      : 'This user is currently not accepting direct messages.'}
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={handleSend}
                  className="p-2.5 sm:p-3 border-t border-[#2a2e39] bg-[#1e222d] flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    maxLength={1000}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value.slice(0, 1000))}
                    placeholder={
                      isAr
                        ? `اكتب رسالة خاصة إلى ${activeRecipient.displayName}...`
                        : `Message ${activeRecipient.displayName}...`
                    }
                    className="flex-1 bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl px-3 py-2 text-xs text-white placeholder-[#787b86] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || sending}
                    className="px-3.5 py-2 rounded-xl bg-[#089981] hover:bg-[#07846f] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                  >
                    <Send className={`w-3.5 h-3.5 ${sending ? 'animate-pulse' : ''}`} />
                    <span className="hidden sm:inline">{isAr ? 'إرسال' : 'Send'}</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
