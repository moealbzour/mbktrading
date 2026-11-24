import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  CheckCheck,
  Crown,
  Edit2,
  Headphones,
  Lock,
  Mail,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Unlock,
  UserCheck,
  X
} from 'lucide-react';
import { ChatProfile, DmConversation, DmMessage, UserProfile } from '../../types/trading';
import {
  editDirectMessage,
  getDmConversationId,
  getOtherParticipantUid,
  markDmConversationRead,
  OFFICIAL_PLATFORM_PROFILE,
  OFFICIAL_PLATFORM_UID,
  OFFICIAL_PLATFORM_USERNAME,
  PLATFORM_INBOX_TOPICS,
  PlatformInboxTopic,
  sendDirectMessage,
  subscribeToDmConversations,
  subscribeToDmMessages,
  subscribeToOwnChatProfile,
  subscribeToPlatformInboxConversations,
  syncOwnChatProfile,
  updateDmPrivacySettings
} from '../../services/directMessageService';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { soundManager } from '../../utils/audio';
import { useSignalsContext } from '../../context/SignalsContext';
import { isUserCurrentlyOnline } from '../../utils/mobileNotifications';
import { hasStaffPermission, isSuperAdminUser } from '../../utils/rbac';

export interface DmTargetUser {
  uid: string;
  displayName: string;
  avatar?: string;
  role?: string;
  initialTopic?: PlatformInboxTopic;
  isPlatformTicket?: boolean;
}

interface Props {
  user: UserProfile;
  lang?: 'ar' | 'en';
  initialTargetUser?: DmTargetUser | null;
  onClearInitialTarget?: () => void;
  isCompact?: boolean;
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

function renderRoleBadge(role?: string, isOfficialPlatform?: boolean) {
  if (isOfficialPlatform) {
    return (
      <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-black bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 inline-flex items-center gap-0.5 shrink-0">
        <Headphones className="w-2.5 h-2.5 text-[#10b981]" />
        <span>OFFICIAL DESK</span>
      </span>
    );
  }
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
  onClearInitialTarget,
  isCompact = false
}) => {
  const isAr = lang === 'ar';
  const myUid = auth.currentUser?.uid || user.uid || user.id || '';
  const myDisplayName = (user.name || user.email?.split('@')[0] || 'MBK Trader').trim();
  const isSuperAdmin = isSuperAdminUser(user);
  const isAdminUser = Boolean(
    isSuperAdmin ||
      hasStaffPermission(user, 'canAccessInbox')
  );

  const { dmConversations } = useSignalsContext();
  const [ownChatProfile, setOwnChatProfile] = useState<ChatProfile | null>(null);
  const [adminOversightMode, setAdminOversightMode] = useState<boolean>(false);
  const [adminConversations, setAdminConversations] = useState<DmConversation[]>([]);
  const [platformInboxConversations, setPlatformInboxConversations] = useState<DmConversation[]>([]);
  const [adminInboxFilter, setAdminInboxFilter] = useState<'ALL' | 'PLATFORM' | 'PERSONAL'>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<PlatformInboxTopic>('support');

  // Track both the selected partner UID and whether this thread is an official @mbktrading platform ticket
  const [selectedRecipientUid, setSelectedRecipientUid] = useState<string | null>(null);
  const [isViewingPlatformTicket, setIsViewingPlatformTicket] = useState<boolean>(false);
  const [selectedFallbackRecipient, setSelectedFallbackRecipient] = useState<DmTargetUser | null>(null);
  const [selectedRecipientProfile, setSelectedRecipientProfile] = useState<ChatProfile | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollDmToBottom = () => {
    const run = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };
    run();
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(run);
      window.setTimeout(run, 70);
    }
  };

  const showNotice = (type: 'error' | 'success', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Merge personal DMs with @mbktrading platform inbox threads (only attached when Messenger/Inbox panel is open)
  const conversations = useMemo(() => {
    const map = new Map<string, DmConversation>();
    for (const c of dmConversations) map.set(c.id, c);
    if (isAdminUser) {
      for (const c of platformInboxConversations) map.set(c.id, c);
    }
    if (isAdminUser && adminOversightMode) {
      for (const c of adminConversations) map.set(c.id, c);
    }
    return Array.from(map.values()).sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);
  }, [isAdminUser, adminOversightMode, adminConversations, platformInboxConversations, dmConversations]);

  // Sync own lightweight DM privacy profile so other users can message us if allowed
  useEffect(() => {
    if (!myUid) return;
    syncOwnChatProfile(user).catch(() => {});
  }, [myUid, user?.name, user?.role, user?.avatar]);

  // Subscribe to own DM privacy settings
  useEffect(() => {
    if (!myUid) return;
    const unsubOwn = subscribeToOwnChatProfile(myUid, setOwnChatProfile);
    return () => {
      unsubOwn();
    };
  }, [myUid]);

  // Attach @mbktrading support inbox listener (limit(20)) ONLY when Messenger/Inbox panel is open for authorized staff
  useEffect(() => {
    if (!myUid || !isAdminUser) {
      setPlatformInboxConversations([]);
      return;
    }
    const unsubPlatform = subscribeToPlatformInboxConversations(setPlatformInboxConversations);
    return () => {
      unsubPlatform();
    };
  }, [myUid, isAdminUser]);

  // Separate limit(20) listener ONLY when a Super Admin explicitly toggles Admin Oversight mode
  useEffect(() => {
    if (!myUid || !isSuperAdmin || !adminOversightMode) {
      setAdminConversations([]);
      return;
    }
    const unsubAdminConvos = subscribeToDmConversations(myUid, setAdminConversations, true);
    return () => {
      unsubAdminConvos();
    };
  }, [myUid, isSuperAdmin, adminOversightMode]);

  // Handle jump-to-DM from SupportDeskModal, PublicTradingChat, or Admin CRM
  useEffect(() => {
    if (!initialTargetUser?.uid) return;
    if (initialTargetUser.uid === myUid && initialTargetUser.uid !== OFFICIAL_PLATFORM_UID) return;

    const isOfficialTarget =
      initialTargetUser.uid === OFFICIAL_PLATFORM_UID || Boolean(initialTargetUser.isPlatformTicket);
    setSelectedRecipientUid(initialTargetUser.uid);
    setIsViewingPlatformTicket(isOfficialTarget);
    if (initialTargetUser.initialTopic) {
      setSelectedTopic(initialTargetUser.initialTopic);
    }
    setSelectedFallbackRecipient(initialTargetUser);
    onClearInitialTarget?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTargetUser?.uid, initialTargetUser?.initialTopic, initialTargetUser?.isPlatformTicket, myUid]);

  // Fetch single selected recipient's DM privacy settings on demand
  useEffect(() => {
    if (!selectedRecipientUid) {
      setSelectedRecipientProfile(null);
      return;
    }
    if (selectedRecipientUid === OFFICIAL_PLATFORM_UID) {
      setSelectedRecipientProfile(OFFICIAL_PLATFORM_PROFILE);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'chat_profiles', selectedRecipientUid))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data();
          setSelectedRecipientProfile({
            uid: d.uid || snap.id,
            displayName: d.displayName || 'Trader',
            avatar: d.avatar || '',
            role: (d.role || 'FREE').toString().toUpperCase(),
            allowDirectMessages: d.allowDirectMessages !== false,
            blockedUids: Array.isArray(d.blockedUids) ? d.blockedUids : [],
            updatedAt: d.updatedAt
          });
        } else {
          setSelectedRecipientProfile(null);
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedRecipientProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRecipientUid]);

  // Determine the conversation ID:
  // - If user is messaging @mbktrading -> getDmConversationId(myUid, 'mbktrading')
  // - If Admin is viewing a user's @mbktrading ticket -> getDmConversationId(selectedRecipientUid, 'mbktrading')
  // - Otherwise standard 1-to-1 DM -> getDmConversationId(myUid, selectedRecipientUid)
  const activeConvoId = useMemo(() => {
    if (!myUid || !selectedRecipientUid) return '';
    if (selectedRecipientUid === OFFICIAL_PLATFORM_UID) {
      return getDmConversationId(myUid, OFFICIAL_PLATFORM_UID);
    }
    if (isAdminUser && isViewingPlatformTicket) {
      return getDmConversationId(selectedRecipientUid, OFFICIAL_PLATFORM_UID);
    }
    return getDmConversationId(myUid, selectedRecipientUid);
  }, [myUid, selectedRecipientUid, isAdminUser, isViewingPlatformTicket]);

  // Subscribe to active thread messages
  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeToDmMessages(activeConvoId, setMessages);
    return () => unsub();
  }, [activeConvoId]);

  const activeConvo = useMemo(
    () => (activeConvoId ? conversations.find((c) => c.id === activeConvoId) || null : null),
    [activeConvoId, conversations]
  );
  const activeUserUnreadCount = activeConvo && myUid ? Number(activeConvo.unreadBy?.[myUid] || 0) : 0;
  const activePlatformUnreadCount =
    activeConvo && activeConvo.participants.includes(OFFICIAL_PLATFORM_UID)
      ? Number(activeConvo.unreadBy?.[OFFICIAL_PLATFORM_UID] || 0)
      : 0;

  // Auto-mark unread messages read when viewing thread (stabilized primitive dependencies)
  useEffect(() => {
    if (!activeConvoId || !myUid) return;

    if (isAdminUser && isViewingPlatformTicket && activePlatformUnreadCount > 0) {
      markDmConversationRead(activeConvoId, OFFICIAL_PLATFORM_UID).catch(() => {});
    }
    if (activeUserUnreadCount > 0) {
      markDmConversationRead(activeConvoId, myUid).catch(() => {});
    }
  }, [
    activeConvoId,
    myUid,
    isAdminUser,
    isViewingPlatformTicket,
    activePlatformUnreadCount,
    activeUserUnreadCount
  ]);

  useEffect(() => {
    scrollDmToBottom();
  }, [messages.length, activeConvoId]);

  const activeRecipient = useMemo(() => {
    if (!selectedRecipientUid) return null;
    if (selectedRecipientUid === OFFICIAL_PLATFORM_UID) {
      return OFFICIAL_PLATFORM_PROFILE;
    }

    const convo = conversations.find((c) => c.id === activeConvoId);
    const normalizeAdminDisplay = (name?: string, role?: string): string => {
      const cleaned = (name || '').trim();
      const isDummyManager =
        cleaned.toLowerCase() === 'manager' || cleaned.toLowerCase() === 'admin';
      if (isDummyManager || (!cleaned && (role || '').toUpperCase() === 'ADMIN')) {
        return 'MBK Trading';
      }
      return cleaned || 'Trader';
    };

    if (convo) {
      const convoRole = convo.participantRoles?.[selectedRecipientUid] || selectedRecipientProfile?.role || 'FREE';
      const convoNameRaw = convo.participantNames?.[selectedRecipientUid];
      const profileNameRaw = selectedRecipientProfile?.displayName;
      const chosenName = normalizeAdminDisplay(
        convoNameRaw && convoNameRaw.toLowerCase() !== 'manager' ? convoNameRaw : profileNameRaw,
        convoRole
      );
      const chosenAvatar =
        convo.participantAvatars?.[selectedRecipientUid] ||
        selectedRecipientProfile?.avatar ||
        ((convoRole || '').toUpperCase() === 'ADMIN' || chosenName.startsWith('MBK')
          ? '/mbk-logo.png'
          : '');

      return {
        uid: selectedRecipientUid,
        displayName: chosenName,
        avatar: chosenAvatar,
        role: convoRole,
        allowDirectMessages:
          selectedRecipientProfile?.uid === selectedRecipientUid
            ? selectedRecipientProfile.allowDirectMessages !== false
            : true,
        blockedUids:
          selectedRecipientProfile?.uid === selectedRecipientUid
            ? selectedRecipientProfile.blockedUids || []
            : []
      } as ChatProfile;
    }

    if (selectedRecipientProfile && selectedRecipientProfile.uid === selectedRecipientUid) {
      const normName = normalizeAdminDisplay(
        selectedRecipientProfile.displayName,
        selectedRecipientProfile.role
      );
      return {
        ...selectedRecipientProfile,
        displayName: normName,
        avatar:
          selectedRecipientProfile.avatar ||
          ((selectedRecipientProfile.role || '').toUpperCase() === 'ADMIN' ||
          normName.startsWith('MBK')
            ? '/mbk-logo.png'
            : '')
      };
    }

    if (selectedFallbackRecipient?.uid === selectedRecipientUid) {
      const normName = normalizeAdminDisplay(
        selectedFallbackRecipient.displayName,
        selectedFallbackRecipient.role
      );
      return {
        uid: selectedFallbackRecipient.uid,
        displayName: normName,
        avatar:
          selectedFallbackRecipient.avatar ||
          ((selectedFallbackRecipient.role || '').toUpperCase() === 'ADMIN' ||
          normName.startsWith('MBK')
            ? '/mbk-logo.png'
            : ''),
        role: selectedFallbackRecipient.role || 'FREE',
        allowDirectMessages: true,
        blockedUids: []
      } as ChatProfile;
    }

    return null;
  }, [selectedRecipientUid, selectedRecipientProfile, conversations, activeConvoId, selectedFallbackRecipient]);

  const myAllowDm = ownChatProfile ? ownChatProfile.allowDirectMessages !== false : true;
  const myBlockedUids = useMemo(() => ownChatProfile?.blockedUids || [], [ownChatProfile]);

  const isOfficialThreadForUser = selectedRecipientUid === OFFICIAL_PLATFORM_UID;
  const isOfficialTicketForAdmin = Boolean(
    isAdminUser && isViewingPlatformTicket && selectedRecipientUid && selectedRecipientUid !== OFFICIAL_PLATFORM_UID
  );

  const isRecipientBlockedByMe = Boolean(
    !isOfficialThreadForUser &&
      !isOfficialTicketForAdmin &&
      selectedRecipientUid &&
      myBlockedUids.includes(selectedRecipientUid)
  );
  const recipientAllowsDm =
    isOfficialThreadForUser || isOfficialTicketForAdmin
      ? true
      : activeRecipient
      ? activeRecipient.allowDirectMessages !== false
      : true;
  const hasRecipientBlockedMe = Boolean(
    !isOfficialThreadForUser &&
      !isOfficialTicketForAdmin &&
      activeRecipient &&
      Array.isArray(activeRecipient.blockedUids) &&
      activeRecipient.blockedUids.includes(myUid)
  );

  const canSendMessage = Boolean(
    selectedRecipientUid && !isRecipientBlockedByMe && recipientAllowsDm && !hasRecipientBlockedMe
  );

  // User's existing conversation with @mbktrading (if any)
  const myOfficialConvo = useMemo(() => {
    if (!myUid) return null;
    const officialConvoId = getDmConversationId(myUid, OFFICIAL_PLATFORM_UID);
    return conversations.find((c) => c.id === officialConvoId) || null;
  }, [conversations, myUid]);

  const platformUnreadForAdmin = useMemo(() => {
    if (!isAdminUser) return 0;
    return conversations.reduce((sum, c) => {
      if (c.participants.includes(OFFICIAL_PLATFORM_UID)) {
        return sum + Number(c.unreadBy?.[OFFICIAL_PLATFORM_UID] || 0);
      }
      return sum;
    }, 0);
  }, [conversations, isAdminUser]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((convo) => {
      const isPlatformTicket = convo.participants.includes(OFFICIAL_PLATFORM_UID);

      // Hide the user's own @mbktrading conversation from the regular list because it's pinned at the very top for non-admins
      if (!isAdminUser && isPlatformTicket) {
        return false;
      }

      if (isAdminUser) {
        if (adminInboxFilter === 'PLATFORM' && !isPlatformTicket) return false;
        if (adminInboxFilter === 'PERSONAL' && isPlatformTicket) return false;
      }

      const partnerUid = isPlatformTicket
        ? getOtherParticipantUid(convo.participants, OFFICIAL_PLATFORM_UID)
        : getOtherParticipantUid(convo.participants, myUid);
      const partnerName = convo.participantNames?.[partnerUid] || 'Trader';

      if (!q) return true;
      return (
        partnerName.toLowerCase().includes(q) ||
        convo.lastMessage.toLowerCase().includes(q) ||
        (isPlatformTicket && OFFICIAL_PLATFORM_USERNAME.includes(q))
      );
    });
  }, [conversations, myUid, searchQuery, isAdminUser, adminInboxFilter]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => {
      let count = Number(c.unreadBy?.[myUid] || 0);
      if (isAdminUser && c.participants.includes(OFFICIAL_PLATFORM_UID)) {
        count += Number(c.unreadBy?.[OFFICIAL_PLATFORM_UID] || 0);
      }
      return sum + count;
    }, 0);
  }, [conversations, myUid, isAdminUser]);

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
            ? 'تم تفعيل استقبال الرسائل الخاصة'
            : 'Direct Messages enabled'
          : isAr
          ? 'تم إيقاف استقبال الرسائل الخاصة'
          : 'Direct Messages disabled — users can no longer message you'
      );
    } catch (err: any) {
      showNotice('error', err?.message || (isAr ? 'تعذر تحديث الإعدادات' : 'Failed to update setting'));
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const handleToggleBlockRecipient = async () => {
    if (!myUid || !selectedRecipientUid || isOfficialThreadForUser || isOfficialTicketForAdmin || updatingPrivacy)
      return;
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
    const rawText = messageInput.trim().slice(0, 950);
    if (!rawText) return;

    // If a regular user is messaging @mbktrading, attach the selected Support/Suggestion/Question topic tag
    let finalText = rawText;
    if (isOfficialThreadForUser && !rawText.startsWith('[')) {
      const topicObj = PLATFORM_INBOX_TOPICS.find((t) => t.id === selectedTopic) || PLATFORM_INBOX_TOPICS[0];
      const tag = isAr ? topicObj.tagAr : topicObj.tagEn;
      finalText = `${tag} ${rawText}`.slice(0, 1000);
    }

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
        text: finalText,
        replyAsPlatformDesk: isOfficialTicketForAdmin
      });
      setMessageInput('');
      soundManager.playSuccess();
    } catch (err: any) {
      showNotice('error', err?.message || (isAr ? 'تعذر إرسال الرسالة الخاصة' : 'Could not send message'));
    } finally {
      setSending(false);
    }
  };

  const handleStartEditMessage = (msg: DmMessage) => {
    soundManager.playClick();
    setEditingMsgId(msg.id);
    setEditingText(msg.text || '');
  };

  const handleCancelEditMessage = () => {
    setEditingMsgId(null);
    setEditingText('');
  };

  const handleSaveEditMessage = async (msgId: string) => {
    const trimmed = editingText.trim().slice(0, 1000);
    if (!trimmed || !activeConvoId || savingEdit) return;
    setSavingEdit(true);
    try {
      const isLatestMessage = messages.length > 0 && messages[messages.length - 1]?.id === msgId;
      await editDirectMessage({
        convoId: activeConvoId,
        msgId,
        newText: trimmed,
        isLatestMessage
      });
      setEditingMsgId(null);
      setEditingText('');
      soundManager.playSuccess();
    } catch (err: any) {
      showNotice('error', err?.message || (isAr ? 'تعذر تعديل الرسالة' : 'Could not edit message'));
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div
      className={`${
        isCompact
          ? 'h-full w-full flex-1 min-h-0 bg-[#1e222d]'
          : 'h-[calc(100vh-140px)] min-h-[480px] w-full rounded-2xl border border-[#2a2e39] bg-[#1e222d] shadow-2xl'
      } overflow-hidden flex flex-col`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Bar: Header & Global DM Privacy Toggle */}
      <div
        className={`${
          isCompact ? 'px-2.5 py-2' : 'px-4 py-3'
        } bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-2 shrink-0`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#089981]/15 border border-[#089981]/40 flex items-center justify-center text-[#089981]">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-white">
                {isAr ? 'صندوق الوارد ودعم المنصة (Inbox)' : 'Platform & Direct Inbox'}
              </h2>
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#f23645] text-white">
                  {totalUnread}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#787b86]">
              {isAr
                ? 'الدعم الفني • الاقتراحات • الأسئلة والرسائل الخاصة'
                : 'Support • Suggestions • Questions & Direct Messages'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setAdminOversightMode((prev) => !prev);
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                adminOversightMode
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-[#1e222d] border-[#2a2e39] text-[#787b86] hover:text-white'
              }`}
              title={
                isAr
                  ? 'وضع إشراف الإدارة العليا (توسيع حد المحادثات إلى 50)'
                  : 'Super Admin Oversight Mode (Expanded limit(50) conversations)'
              }
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAr ? 'إشراف الإدارة (50)' : 'Admin Mode (50)'}</span>
            </button>
          )}

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
            title={isAr ? 'تبديل استقبال الرسائل الخاصة' : 'Toggle receiving direct messages'}
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

      {/* Split Workspace: Inbox Conversations List + Active Thread */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT/START: User's Direct Conversations Inbox */}
        <div
          className={`${
            isCompact ? 'w-full' : 'w-full md:w-72 lg:w-80 border-e border-[#2a2e39]'
          } bg-[#171b26] flex flex-col shrink-0 ${
            selectedRecipientUid ? (isCompact ? 'hidden' : 'hidden md:flex') : 'flex'
          }`}
        >
          {/* Inbox Header + Admin Filter + Search Input */}
          <div className="p-2.5 border-b border-[#2a2e39] space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <MessageCircle className="w-3.5 h-3.5 text-[#089981]" />
                <span>{isAr ? 'المحادثات وبريد المنصة' : 'Inbox & Support Desk'}</span>
              </div>
              <span className="text-[10px] font-mono text-[#787b86]">
                {filteredConversations.length + (!isAdminUser ? 1 : 0)}
              </span>
            </div>

            {/* Admin Inbox Filter Tabs (All / @mbktrading Platform Desk / Personal) */}
            {isAdminUser && (
              <div className="grid grid-cols-3 gap-1 bg-[#131722] p-1 rounded-xl border border-[#2a2e39] text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setAdminInboxFilter('ALL');
                  }}
                  className={`py-1 rounded-lg cursor-pointer transition-colors ${
                    adminInboxFilter === 'ALL'
                      ? 'bg-[#1c2432] text-white border border-[#2a3446]'
                      : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setAdminInboxFilter('PLATFORM');
                  }}
                  className={`py-1 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                    adminInboxFilter === 'PLATFORM'
                      ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                      : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  <span>@mbktrading</span>
                  {platformUnreadForAdmin > 0 && (
                    <span className="px-1 rounded-full bg-[#e11d48] text-white text-[9px] font-mono">
                      {platformUnreadForAdmin}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setAdminInboxFilter('PERSONAL');
                  }}
                  className={`py-1 rounded-lg cursor-pointer transition-colors ${
                    adminInboxFilter === 'PERSONAL'
                      ? 'bg-[#1c2432] text-white border border-[#2a3446]'
                      : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  {isAr ? 'خاصتي' : 'My DMs'}
                </button>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#787b86] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث في الرسائل أو التذاكر...' : 'Search inbox or tickets...'}
                className="w-full ps-8 pe-3 py-1.5 rounded-xl bg-[#131722] border border-[#2a2e39] focus:border-[#089981] text-xs text-white placeholder-[#787b86] focus:outline-none"
              />
            </div>
          </div>

          {/* Conversations List Body */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#2a2e39]/60">
            {/* PINNED TOP ROW FOR ALL TRADERS: Official @mbktrading Support, Suggestions & Questions Inbox */}
            {!isAdminUser && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSelectedRecipientUid(OFFICIAL_PLATFORM_UID);
                  setIsViewingPlatformTicket(true);
                  setSelectedFallbackRecipient({
                    uid: OFFICIAL_PLATFORM_UID,
                    displayName: OFFICIAL_PLATFORM_USERNAME,
                    role: 'ADMIN',
                    isPlatformTicket: true
                  });
                }}
                className={`w-full p-3 flex items-center gap-2.5 text-start transition-colors cursor-pointer ${
                  selectedRecipientUid === OFFICIAL_PLATFORM_UID
                    ? 'bg-[#10b981]/15 border-s-2 border-[#10b981]'
                    : 'bg-[#10b981]/5 hover:bg-[#1e222d]'
                }`}
              >
                <div className="relative w-10 h-10 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center font-black text-xs text-[#10b981] shrink-0 shadow-sm">
                  <Headphones className="w-5 h-5" />
                  <span
                    className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-[#10b981] ring-2 ring-[#171b26]"
                    title={isAr ? 'متصل الآن (Online)' : 'Online'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-black text-white truncate">
                        @{OFFICIAL_PLATFORM_USERNAME}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                        <span>{isAr ? 'متصل' : 'Online'}</span>
                      </span>
                      {renderRoleBadge('ADMIN', true)}
                    </div>
                    {myOfficialConvo?.lastMessageAtMs ? (
                      <span className="text-[10px] font-mono text-[#787b86] shrink-0">
                        {formatMessageTime(myOfficialConvo.lastMessageAtMs, isAr)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[11px] text-[#9db2c6] truncate">
                      {myOfficialConvo?.lastMessage
                        ? `${
                            myOfficialConvo.lastSenderUid === myUid
                              ? isAr
                                ? 'أنت: '
                                : 'You: '
                              : '@mbktrading: '
                          }${myOfficialConvo.lastMessage}`
                        : isAr
                        ? 'الدعم الفني • الاقتراحات • الأسئلة والاستفسارات'
                        : 'Support • Suggestions • Questions Desk'}
                    </span>
                    {Number(myOfficialConvo?.unreadBy?.[myUid] || 0) > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#f23645] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                        {Number(myOfficialConvo?.unreadBy?.[myUid] || 0)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )}

            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center space-y-2 text-[#787b86]">
                <MessageCircle className="w-8 h-8 mx-auto opacity-40 text-[#089981]" />
                <p className="text-xs font-bold text-white">
                  {isAdminUser
                    ? isAr
                      ? 'لا توجد رسائل أو تذاكر دعم حالياً'
                      : 'No support tickets or messages yet'
                    : isAr
                    ? 'اضغط على @mbktrading أعلاه للمراسلة'
                    : 'Click @mbktrading above to start a conversation'}
                </p>
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const isPlatformTicket = convo.participants.includes(OFFICIAL_PLATFORM_UID);
                const otherUid = isPlatformTicket
                  ? getOtherParticipantUid(convo.participants, OFFICIAL_PLATFORM_UID)
                  : getOtherParticipantUid(convo.participants, myUid);
                const otherRole = convo.participantRoles?.[otherUid] || 'FREE';
                const rawOtherName =
                  otherUid === OFFICIAL_PLATFORM_UID
                    ? OFFICIAL_PLATFORM_USERNAME
                    : convo.participantNames?.[otherUid] || 'Trader';
                const otherName =
                  rawOtherName.trim().toLowerCase() === 'manager' ||
                  rawOtherName.trim().toLowerCase() === 'admin'
                    ? 'MBK Trading'
                    : rawOtherName;
                const otherAvatar =
                  convo.participantAvatars?.[otherUid] ||
                  ((otherRole || '').toUpperCase() === 'ADMIN' || otherName.startsWith('MBK')
                    ? '/mbk-logo.png'
                    : '');
                const unread = isPlatformTicket && isAdminUser
                  ? Number(convo.unreadBy?.[OFFICIAL_PLATFORM_UID] || 0)
                  : Number(convo.unreadBy?.[myUid] || 0);
                const isActive =
                  selectedRecipientUid === otherUid &&
                  Boolean(isViewingPlatformTicket) === Boolean(isPlatformTicket);
                const isOtherOnline = isUserCurrentlyOnline({
                  uid: otherUid,
                  myUid,
                  lastActivityMs: convo.lastMessageAtMs,
                  role: otherRole
                });

                return (
                  <button
                    key={convo.id}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setSelectedRecipientUid(otherUid);
                      setIsViewingPlatformTicket(isPlatformTicket);
                      setSelectedFallbackRecipient({
                        uid: otherUid,
                        displayName: otherName,
                        avatar: otherAvatar,
                        role: otherRole,
                        isPlatformTicket
                      });
                    }}
                    className={`w-full p-3 flex items-center gap-2.5 text-start transition-colors cursor-pointer ${
                      isActive ? 'bg-[#089981]/15 border-s-2 border-[#089981]' : 'hover:bg-[#1e222d]'
                    }`}
                  >
                    <div className="relative w-9 h-9 shrink-0">
                      <div className="w-9 h-9 rounded-full bg-[#2a2e39] border border-[#363a45] flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                        {otherAvatar ? (
                          <img src={otherAvatar} alt={otherName} className="w-full h-full object-cover" />
                        ) : (
                          otherName[0]?.toUpperCase() || 'T'
                        )}
                      </div>
                      <span
                        className={`absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#171b26] ${
                          isOtherOnline ? 'bg-[#10b981]' : 'bg-[#64748b]'
                        }`}
                        title={
                          isOtherOnline
                            ? isAr
                              ? 'متصل الآن (Online)'
                              : 'Online'
                            : isAr
                            ? 'غير متصل (Offline)'
                            : 'Offline'
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">{otherName}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8.5px] font-bold shrink-0 ${
                              isOtherOnline
                                ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/35'
                                : 'bg-white/[0.04] text-[#8b95a5] border border-white/10'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOtherOnline ? 'bg-[#10b981] animate-pulse' : 'bg-[#64748b]'
                              }`}
                            />
                            <span>
                              {isOtherOnline
                                ? isAr
                                  ? 'متصل'
                                  : 'Online'
                                : isAr
                                ? 'غير متصل'
                                : 'Offline'}
                            </span>
                          </span>
                          {renderRoleBadge(otherRole, otherUid === OFFICIAL_PLATFORM_UID)}
                          {isAdminUser && isPlatformTicket && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 shrink-0">
                              @mbktrading
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-[#787b86] shrink-0">
                          {formatMessageTime(convo.lastMessageAtMs, isAr)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[11px] text-[#9db2c6] truncate">
                          {convo.lastSenderUid === OFFICIAL_PLATFORM_UID
                            ? '@mbktrading: '
                            : convo.lastSenderUid === myUid
                            ? isAr
                              ? 'أنت: '
                              : 'You: '
                            : ''}
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
            )}
          </div>
        </div>

        {/* RIGHT/END: Active DM Thread */}
        <div
          className={`flex-1 min-w-0 flex flex-col bg-[#131722] ${
            selectedRecipientUid ? 'flex' : isCompact ? 'hidden' : 'hidden md:flex'
          }`}
        >
          {!activeRecipient ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1e222d] border border-[#2a2e39] flex items-center justify-center text-[#089981]">
                <Headphones className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'بريد المنصة (@mbktrading)' : '@mbktrading Inbox'}
              </h3>
              {!isAdminUser && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setSelectedRecipientUid(OFFICIAL_PLATFORM_UID);
                    setIsViewingPlatformTicket(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#06080c] font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Headphones className="w-4 h-4" />
                  <span>{isAr ? 'مراسلة @mbktrading الآن' : 'Message @mbktrading Now'}</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="px-3 py-2 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedRecipientUid(null)}
                    className={`${
                      isCompact ? 'flex' : 'md:hidden'
                    } p-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-[#d1d4dc] hover:text-white cursor-pointer shrink-0`}
                    aria-label="Back"
                  >
                    {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  </button>

                  {(() => {
                    const lastThreadMsgMs =
                      messages.length > 0 ? messages[messages.length - 1]?.timestampMs || 0 : 0;
                    const isRecipientOnline = isUserCurrentlyOnline({
                      uid: isOfficialThreadForUser ? OFFICIAL_PLATFORM_UID : activeRecipient.uid,
                      myUid,
                      lastActivityMs: lastThreadMsgMs,
                      role: activeRecipient.role
                    });

                    return (
                      <>
                        <div className="relative w-9 h-9 shrink-0">
                          <div
                            className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs overflow-hidden ${
                              isOfficialThreadForUser
                                ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#10b981]'
                                : 'bg-[#2a2e39] border-[#363a45] text-white'
                            }`}
                          >
                            {isOfficialThreadForUser ? (
                              <Headphones className="w-4 h-4" />
                            ) : activeRecipient.avatar ? (
                              <img
                                src={activeRecipient.avatar}
                                alt={activeRecipient.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              activeRecipient.displayName[0]?.toUpperCase() || 'T'
                            )}
                          </div>
                          <span
                            className={`absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#1e222d] ${
                              isRecipientOnline ? 'bg-[#10b981]' : 'bg-[#64748b]'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {isOfficialThreadForUser
                                ? `@${OFFICIAL_PLATFORM_USERNAME}`
                                : activeRecipient.displayName}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${
                                isRecipientOnline
                                  ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/35'
                                  : 'bg-white/[0.04] text-[#8b95a5] border border-white/10'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isRecipientOnline ? 'bg-[#10b981] animate-pulse' : 'bg-[#64748b]'
                                }`}
                              />
                              <span>
                                {isRecipientOnline
                                  ? isAr
                                    ? 'متصل الآن'
                                    : 'Online'
                                  : isAr
                                  ? 'غير متصل'
                                  : 'Offline'}
                              </span>
                            </span>
                            {renderRoleBadge(activeRecipient.role, isOfficialThreadForUser)}
                            {isOfficialTicketForAdmin && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40">
                                @mbktrading
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#787b86] block">
                            {isOfficialThreadForUser || isOfficialTicketForAdmin
                              ? isAr
                                ? 'الدعم الفني • الاقتراحات • الأسئلة'
                                : 'Support • Suggestions • Questions'
                              : !recipientAllowsDm
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
                      </>
                    );
                  })()}
                </div>

                {/* Per-User Block / Unblock Button (hidden for official @mbktrading threads) */}
                {!isOfficialThreadForUser && !isOfficialTicketForAdmin && (
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
                )}
              </div>

              {/* Messages Feed */}
              <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-[#787b86] text-xs space-y-2 max-w-md mx-auto">
                    <Headphones className="w-8 h-8 opacity-50 text-[#10b981]" />
                    <p className="font-bold text-white">
                      {isOfficialThreadForUser
                        ? `@${OFFICIAL_PLATFORM_USERNAME}`
                        : isAr
                        ? `ابدأ محادثة مع ${activeRecipient.displayName}`
                        : `Start a chat with ${activeRecipient.displayName}`}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isFromPlatformDesk = msg.senderUid === OFFICIAL_PLATFORM_UID;
                    const isMine = isOfficialTicketForAdmin
                      ? isFromPlatformDesk
                      : msg.senderUid === myUid;

                    return (
                      <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow ${
                            isMine
                              ? 'bg-gradient-to-br from-[#089981]/30 to-[#065f46]/30 border border-[#089981]/40 text-white rounded-ee-sm'
                              : isFromPlatformDesk
                              ? 'bg-[#10b981]/15 border border-[#10b981]/40 text-white rounded-es-sm'
                              : 'bg-[#1e222d] border border-[#2a2e39] text-[#e1e4ea] rounded-es-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-mono font-bold ${
                                  isFromPlatformDesk ? 'text-[#10b981]' : 'text-[#8492a6]'
                                }`}
                              >
                                {isFromPlatformDesk
                                  ? `@${OFFICIAL_PLATFORM_USERNAME}`
                                  : (msg.senderName || '').trim().toLowerCase() === 'manager' ||
                                    (msg.senderName || '').trim().toLowerCase() === 'admin'
                                  ? 'MBK Trading'
                                  : msg.senderName}
                              </span>
                              {(isFromPlatformDesk ||
                                (msg.senderName || '').trim().toLowerCase() === 'manager' ||
                                (msg.senderName || '').startsWith('MBK')) && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-black bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 inline-flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>OFFICIAL</span>
                                </span>
                              )}
                              {isAdminUser && isFromPlatformDesk && msg.repliedByName && (
                                <span
                                  className="px-1.5 py-0.2 rounded text-[8px] font-mono font-semibold bg-[#131722] text-[#9db2c6] border border-[#2a2e39]"
                                  title={
                                    isAr
                                      ? 'خاص بطاقم الإدارة والدعم فقط (غير مرئي للعميل)'
                                      : 'Staff-only attribution (invisible to client)'
                                  }
                                >
                                  {isAr ? `رد بواسطة: ${msg.repliedByName}` : `By: ${msg.repliedByName}`}
                                </span>
                              )}
                            </div>

                            {isMine && editingMsgId !== msg.id && (
                              <button
                                type="button"
                                onClick={() => handleStartEditMessage(msg)}
                                className="px-1.5 py-0.5 rounded bg-black/25 hover:bg-amber-500/20 text-[10px] text-[#9db2c6] hover:text-amber-300 border border-white/10 hover:border-amber-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                                title={isAr ? 'تعديل الرسالة' : 'Edit message'}
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                                <span>{isAr ? 'تعديل' : 'Edit'}</span>
                              </button>
                            )}
                          </div>

                          {editingMsgId === msg.id ? (
                            <div className="space-y-1.5 mt-1 min-w-[200px]">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value.slice(0, 1000))}
                                rows={2}
                                className="w-full rounded-xl bg-[#0b0e14] border border-amber-500/40 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={handleCancelEditMessage}
                                  className="px-2 py-1 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[10px] font-bold text-[#9db2c6] flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                  <span>{isAr ? 'إلغاء' : 'Cancel'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={savingEdit || !editingText.trim()}
                                  onClick={() => handleSaveEditMessage(msg.id)}
                                  className="px-2.5 py-1 rounded-lg bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-[10px] font-bold text-[#06080c] flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{isAr ? 'حفظ' : 'Save'}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="break-words whitespace-pre-wrap">
                              {msg.text}
                              {msg.editedAt && (
                                <span className="ms-1.5 text-[9px] font-mono text-[#8b95a5] italic">
                                  {isAr ? '(تم التعديل)' : '(edited)'}
                                </span>
                              )}
                            </p>
                          )}

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

              {/* Topic Selector Bar when messaging @mbktrading (Support / Suggestion / Question) */}
              {isOfficialThreadForUser && (
                <div className="px-3 py-1.5 bg-[#171b26] border-t border-[#2a2e39] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                  <span className="text-[10px] text-[#787b86] font-bold shrink-0">
                    {isAr ? 'الموضوع:' : 'Topic:'}
                  </span>
                  {PLATFORM_INBOX_TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedTopic(topic.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                        selectedTopic === topic.id
                          ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50'
                          : 'bg-[#131722] text-[#787b86] border-[#2a2e39] hover:text-white'
                      }`}
                    >
                      {isAr ? topic.labelAr : topic.labelEn}
                    </button>
                  ))}
                </div>
              )}

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
                    maxLength={950}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value.slice(0, 950))}
                    placeholder={
                      isOfficialTicketForAdmin
                        ? isAr
                          ? `اكتب ردك الرسمي باسم @mbktrading إلى ${activeRecipient.displayName}...`
                          : `Reply as @mbktrading to ${activeRecipient.displayName}...`
                        : isOfficialThreadForUser
                        ? isAr
                          ? 'اكتب رسالتك للدعم الفني أو اقتراحك أو سؤالك إلى @mbktrading...'
                          : 'Write your support request, suggestion, or question to @mbktrading...'
                        : isAr
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
                    <span className="hidden sm:inline">
                      {isOfficialTicketForAdmin
                        ? isAr
                          ? 'رد باسم mbktrading'
                          : 'Reply as mbktrading'
                        : isAr
                        ? 'إرسال'
                        : 'Send'}
                    </span>
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
