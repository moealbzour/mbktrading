import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Crown,
  Sparkles,
  Heart,
  RefreshCw,
  Image as ImageIcon,
  Paperclip,
  X,
  Maximize2,
  Check,
  CheckCheck,
  Pin,
  Smile,
  Reply,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  Trash2,
  Lock,
  Unlock,
  RotateCcw,
  KeyRound,
  Ban,
  VolumeX,
  Mail,
  Mic,
  Square,
  Play,
  Pause,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Edit3,
  AtSign
} from 'lucide-react';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { soundManager } from '../../utils/audio';
import { UserProfile, MarketSymbol } from '../../types/trading';
import { markDocumentDeleted } from '../../utils/legacyDbRecovery';
import { useSignalsContext } from '../../context/SignalsContext';
import { useCommunityChat } from '../../context/CommunityChatContext';
import { isUserCurrentlyOnline, triggerServerWebPush } from '../../utils/mobileNotifications';
import { hasStaffPermission } from '../../utils/rbac';

export interface ChatReplyTo {
  id: string;
  user: string;
  text: string;
  imageUrl?: string;
}

export interface SharedTradeCardPayload {
  id?: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  entry: number | string;
  tp1: number | string;
  tp2?: number | string;
  sl: number | string;
  pips?: number;
  timeframe?: string;
  strategy?: string;
}

export interface ChatMessageItem {
  id: string;
  uid?: string;
  user: string;
  avatar: string;
  role: 'VIP' | 'FREE' | 'ANALYST' | 'ADMIN' | 'MODERATOR' | 'SALES' | string;
  text: string;
  imageUrl?: string;
  imageCaption?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  tradeCard?: SharedTradeCardPayload;
  time: string;
  likes: number;
  reactions?: Record<string, number>;
  symbolTag?: string;
  replyTo?: ChatReplyTo;
  isPinned?: boolean;
  timestampMs?: number;
  editedAt?: string;
}

interface ChatRoomSettingsState {
  isClosed: boolean;
  closedReason?: string | null;
  closedBy?: string | null;
  closedAt?: string | null;
  resetAtMs?: number | null;
}

interface Props {
  user?: UserProfile | null;
  currentUserName?: string;
  isVIP: boolean;
  userRole?: string;
  isAdmin?: boolean;
  isMutedFromChat?: boolean;
  lang?: 'ar' | 'en';
  isCompact?: boolean;
  onOpenPromoModal?: () => void;
  onOpenPlansModal?: () => void;
  onStartDirectMessage?: (target: { uid: string; displayName: string; avatar?: string; role: string }) => void;
  onSelectSymbol?: (sym: MarketSymbol) => void;
}

const MAX_CHAT_CHARS = 500;
const SPAM_MAX_ALLOWED_REPEAT = 2; // Repeating the same message more than 2 times triggers auto-delete
const SPAM_WINDOW_MS = 30 * 60 * 1000;

function normalizeChatTextForSpam(text?: string): string {
  return (text || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function isStaffMessageRole(role?: string): boolean {
  const r = (role || '').toUpperCase();
  return r === 'ADMIN' || r === 'MODERATOR';
}

const EMOJI_LIST = ['🔥', '❤️', '🚀', '🎯', '👍', '📉'];

export const PublicTradingChat: React.FC<Props> = ({
  user,
  currentUserName = 'Trader',
  isVIP = false,
  userRole = 'FREE',
  isAdmin = false,
  isMutedFromChat = false,
  lang = 'ar',
  isCompact = false,
  onOpenPromoModal,
  onOpenPlansModal,
  onStartDirectMessage,
  onSelectSymbol
}) => {
  const isAr = lang === 'ar';
  const { signals: liveSignals } = useSignalsContext();
  const {
    messages,
    pinnedMessage,
    chatRoomSettings,
    loading,
    acquireChatStream,
    releaseChatStream,
    removeMessageLocally,
    clearPinnedMessageLocally
  } = useCommunityChat();

  const [inputText, setInputText] = useState('');
  const [activeSymbolFilter, setActiveSymbolFilter] = useState<string>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [chatFeedback, setChatFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [moderatedUsers, setModeratedUsers] = useState<
    Record<string, { isBanned?: boolean; isMutedFromChat?: boolean }>
  >({});

  // Real-Chat Upgrade State: Trade Setup Card Attachment, Voice Note Recording & Trader Profile Card
  const [attachedTradeCard, setAttachedTradeCard] = useState<SharedTradeCardPayload | null>(null);
  const [showTradeCardModal, setShowTradeCardModal] = useState(false);
  const [customTradeSymbol, setCustomTradeSymbol] = useState<MarketSymbol>('XAUUSD');
  const [customTradeAction, setCustomTradeAction] = useState<'BUY' | 'SELL'>('BUY');
  const [customTradeEntry, setCustomTradeEntry] = useState('2682.00');
  const [customTradeTp1, setCustomTradeTp1] = useState('2694.00');
  const [customTradeSl, setCustomTradeSl] = useState('2673.00');

  // Voice Note Recording State (MediaRecorder API)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioDataUrl, setRecordedAudioDataUrl] = useState<string | null>(null);
  const [recordedAudioDuration, setRecordedAudioDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartSecRef = useRef<number>(0);

  // Interactive Trader Profile Card Modal State
  const [inspectedTrader, setInspectedTrader] = useState<{
    uid?: string;
    name: string;
    avatar?: string;
    role: string;
  } | null>(null);
  const [showActiveTradersDrawer, setShowActiveTradersDrawer] = useState(false);

  // General Chat is open to all authenticated non-banned users (Free, VIP, Elite, Staff)
  const roleUpper = (userRole || user?.role || 'FREE').toUpperCase();
  const isCurrentAdmin = Boolean(
    isAdmin ||
      user?.isAdmin ||
      ['ADMIN', 'MODERATOR'].includes(roleUpper) ||
      hasStaffPermission(user, 'canManageChat')
  );
  const canAccessChat = !user?.isBanned;

  // Derive active participants in the General Chat purely in memory from the live stream + current user (0 extra Firestore quota reads/writes)
  const activeChatParticipants = React.useMemo(() => {
    const map = new Map<
      string,
      { uid: string; name: string; avatar: string; role: string; lastActiveMs: number; isMe: boolean }
    >();
    const myUid = auth.currentUser?.uid || user?.uid || user?.id || '';
    if (myUid) {
      map.set(myUid, {
        uid: myUid,
        name: (user?.name || currentUserName || 'Trader').trim(),
        avatar: user?.avatar || auth.currentUser?.photoURL || '',
        role: isCurrentAdmin ? 'ADMIN' : roleUpper,
        lastActiveMs: Date.now(),
        isMe: true
      });
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const key = m.uid || m.user;
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          uid: m.uid || '',
          name: m.user || 'Trader',
          avatar: m.avatar || '',
          role: (m.role || 'FREE').toUpperCase(),
          lastActiveMs: m.timestampMs || 0,
          isMe: Boolean(myUid && m.uid === myUid)
        });
      }
    }
    return Array.from(map.values()).slice(0, 25);
  }, [messages, user, currentUserName, isCurrentAdmin, roleUpper]);

  // Image attachment & room moderation state (Admin/Moderator only)
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState<string>('');
  const [pendingBanTarget, setPendingBanTarget] = useState<{ uid: string; name: string } | null>(null);
  const [togglingChatLock, setTogglingChatLock] = useState(false);
  const [pendingResetConfirm, setPendingResetConfirm] = useState(false);
  const [resettingChat, setResettingChat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTypePopupOpen, setIsTypePopupOpen] = useState<boolean>(false);
  const autoDeletedSpamIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isTypePopupOpen) {
      const timer = setTimeout(() => {
        popupTextareaRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isTypePopupOpen]);

  const [replyingTo, setReplyingTo] = useState<ChatMessageItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string; user?: string } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Pure in-memory "Active Recently" presence derived from loaded message timestamps (0 reads, 0 HTTP polling)
  const myCurrentUid = auth.currentUser?.uid || user?.uid || user?.id || '';

  // Per-user last activity map derived in memory from messages (0 extra Firestore reads)
  const lastActivityByUidOrName = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of activeChatParticipants) {
      if (p.uid) map.set(p.uid, p.lastActiveMs);
      if (p.name) map.set(p.name.toLowerCase(), p.lastActiveMs);
    }
    return map;
  }, [activeChatParticipants]);

  const checkIsTraderOnline = React.useCallback(
    (uid?: string, name?: string, role?: string) => {
      const lastMs =
        (uid && lastActivityByUidOrName.get(uid)) ||
        (name && lastActivityByUidOrName.get(name.toLowerCase())) ||
        0;
      return isUserCurrentlyOnline({
        uid,
        myUid: myCurrentUid,
        lastActivityMs: lastMs,
        role
      });
    },
    [lastActivityByUidOrName, myCurrentUid]
  );

  // Track non-admin user reactions locally so regular users can only react 1x per emoji per message
  const USER_REACTIONS_STORAGE_KEY = 'mbk_user_chat_reactions_v1';
  const [userReactionsSet, setUserReactionsSet] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(USER_REACTIONS_STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
      return new Set();
    }
  });

  // @Mention Autocomplete State & Matcher
  const [manualMentionMenuOpen, setManualMentionMenuOpen] = useState(false);
  const mentionQueryMatch = React.useMemo(() => {
    const match = inputText.match(/(?:^|\s)@([^\s@]{0,28})$/);
    if (match) {
      return match[1].toLowerCase();
    }
    return manualMentionMenuOpen ? '' : null;
  }, [inputText, manualMentionMenuOpen]);

  const mentionCandidates = React.useMemo(() => {
    if (mentionQueryMatch === null) return [];
    const list: Array<{ uid: string; name: string; role: string; avatar: string; isOnline: boolean }> = [
      {
        uid: 'mbktrading',
        name: 'mbktrading',
        role: 'ADMIN',
        avatar: '',
        isOnline: true
      }
    ];
    const seen = new Set<string>(['mbktrading']);
    for (const p of activeChatParticipants) {
      const cleanName = (p.name || '').trim();
      if (!cleanName || seen.has(cleanName.toLowerCase())) continue;
      seen.add(cleanName.toLowerCase());
      list.push({
        uid: p.uid,
        name: cleanName,
        role: p.role,
        avatar: p.avatar,
        isOnline: checkIsTraderOnline(p.uid, cleanName, p.role)
      });
    }
    if (!mentionQueryMatch) return list.slice(0, 8);
    return list
      .filter((item) => item.name.toLowerCase().includes(mentionQueryMatch))
      .slice(0, 8);
  }, [mentionQueryMatch, activeChatParticipants, checkIsTraderOnline]);

  const handleInsertMention = (targetName: string) => {
    soundManager.playClick();
    const clean = targetName.trim();
    if (!clean) return;
    setInputText((prev) => {
      if (/(?:^|\s)@([^\s@]{0,28})$/.test(prev)) {
        return prev.replace(/@([^\s@]{0,28})$/, `@${clean} `).slice(0, MAX_CHAT_CHARS);
      }
      const prefix = prev && !prev.endsWith(' ') ? `${prev} ` : prev;
      return `${prefix}@${clean} `.slice(0, MAX_CHAT_CHARS);
    });
    setManualMentionMenuOpen(false);
  };

  const renderMessageTextWithMentions = (text: string) => {
    if (!text) return null;
    const myNameLower = (user?.name || currentUserName || '').trim().toLowerCase();
    // Split on @mentions (supporting Arabic/English letters, numbers, underscores, and spaces inside known participant names or single-token @handle)
    const knownNames = activeChatParticipants
      .map((p) => p.name.trim())
      .filter((n) => n.length > 1)
      .sort((a, b) => b.length - a.length);
    const escapedKnown = knownNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern =
      escapedKnown.length > 0
        ? new RegExp(`(@(?:mbktrading|${escapedKnown.join('|')}|[\\w\\u0600-\\u06FF._-]{2,25}))`, 'gi')
        : /(@(?:mbktrading|[\w\u0600-\u06FF._-]{2,25}))/gi;

    const parts = text.split(pattern);
    return parts.map((part, idx) => {
      if (part.startsWith('@') && part.length > 1) {
        const mentionedName = part.slice(1).trim().toLowerCase();
        const isMentioningMe =
          Boolean(myNameLower && mentionedName === myNameLower) ||
          (isCurrentAdmin && mentionedName === 'mbktrading');
        return (
          <span
            key={`mention-${idx}`}
            className={`inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded-md font-bold text-[11px] ${
              isMentioningMe
                ? 'bg-[#FDF6E3] dark:bg-amber-500/25 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/50 shadow-xs'
                : 'bg-[#E6F5F2] dark:bg-[#10b981]/20 text-[#089981] dark:text-[#10b981] border border-[#B3E2D9] dark:border-[#10b981]/40'
            }`}
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={`txt-${idx}`}>{part}</React.Fragment>;
    });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitiallyScrolledRef = useRef<boolean>(false);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState<number>(0);

  const showToastNotice = (type: 'error' | 'success', text: string) => {
    setChatFeedback({ type, text });
    setTimeout(() => setChatFeedback(null), 4000);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const performScroll = (b: ScrollBehavior) => {
      if (scrollRef.current) {
        if (b === 'auto') {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        } else {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: b
          });
        }
      }
    };

    performScroll(behavior);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => performScroll(behavior));
      window.setTimeout(() => performScroll('auto'), 70);
      window.setTimeout(() => performScroll('auto'), 220);
    }
    setShowScrollBottom(false);
    setNewMessagesWhileScrolled(0);
  };

  // 1a & 1b. Acquire shared ref-counted public_chat & settings/chat_room stream from CommunityChatContext
  useEffect(() => {
    acquireChatStream();
    return () => {
      releaseChatStream();
    };
  }, [acquireChatStream, releaseChatStream]);

  // 1c. Anti-Spam Auto-Delete Sweep (> 2 identical/repeated messages by non-staff user)
  useEffect(() => {
    if (!canAccessChat || messages.length === 0) return;

    const myUid = auth.currentUser?.uid;
    const recentByUserNorm = new Map<string, number[]>();
    let lastUid = '';
    let lastNorm = '';
    let consecutiveStreak = 0;

    const spamIdsToDelete: string[] = [];

    for (const msg of messages) {
      if (!msg.uid || isStaffMessageRole(msg.role)) continue;
      const norm = normalizeChatTextForSpam(msg.text);
      if (!norm) continue;

      const msgTs = typeof msg.timestampMs === 'number' ? msg.timestampMs : 0;
      const key = `${msg.uid}::${norm}`;
      const prevTimes = (recentByUserNorm.get(key) || []).filter(
        (ts) => msgTs === 0 || ts === 0 || msgTs - ts <= SPAM_WINDOW_MS
      );

      if (msg.uid === lastUid && norm === lastNorm) {
        consecutiveStreak += 1;
      } else {
        lastUid = msg.uid;
        lastNorm = norm;
        consecutiveStreak = 1;
      }

      const nextTimes = [...prevTimes, msgTs];
      recentByUserNorm.set(key, nextTimes);

      if (
        (nextTimes.length > SPAM_MAX_ALLOWED_REPEAT || consecutiveStreak > SPAM_MAX_ALLOWED_REPEAT) &&
        (isCurrentAdmin || msg.uid === myUid) &&
        !autoDeletedSpamIdsRef.current.has(msg.id)
      ) {
        spamIdsToDelete.push(msg.id);
      }
    }

    if (spamIdsToDelete.length > 0) {
      spamIdsToDelete.forEach((id) => autoDeletedSpamIdsRef.current.add(id));
      Promise.all(spamIdsToDelete.map((id) => deleteDoc(doc(db, 'public_chat', id)).catch(() => {})))
        .then(() => {
          showToastNotice(
            'error',
            isAr
              ? 'تم حذف رسالة سبام مكررة (>2 مرات) تلقائياً.'
              : 'Duplicate spam message (>2 times) was auto-deleted.'
          );
        })
        .catch(() => {});
    }
  }, [messages, canAccessChat, isCurrentAdmin, isAr]);

  // Always scroll down to the newest messages on initial load, new messages, or filter/layout changes
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (messages.length === 0) return;

    if (!hasInitiallyScrolledRef.current) {
      hasInitiallyScrolledRef.current = true;
      prevLastMessageIdRef.current = lastMessageId;
      scrollToBottom('auto');
      return;
    }

    if (lastMessageId !== prevLastMessageIdRef.current) {
      prevLastMessageIdRef.current = lastMessageId;
      scrollToBottom('smooth');
    } else {
      scrollToBottom('auto');
    }
  }, [messages.length, lastMessageId, activeSymbolFilter, isCompact]);

  const handleMessagesScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isUp);
    if (!isUp) {
      setNewMessagesWhileScrolled(0);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCurrentAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const resetFileInput = () => {
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!file.type.startsWith('image/')) {
      resetFileInput();
      showToastNotice('error', isAr ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file');
      return;
    }

    const MAX_RAW_BYTES = 1024 * 1024; // Strict < 1MB check
    const MAX_BASE64_BYTES = 1040000; // Buffer safely under firestore.rules 1,048,000 byte cap

    if (file.size >= MAX_RAW_BYTES) {
      resetFileInput();
      showToastNotice(
        'error',
        isAr
          ? 'حجم الصورة يتجاوز الحد المسموح (1 ميجابايت). يرجى ضغط الصورة قبل الرفع.'
          : 'Image exceeds the strict 1MB limit. Please compress the image before uploading.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;
      if (result.length > MAX_BASE64_BYTES) {
        resetFileInput();
        showToastNotice(
          'error',
          isAr
            ? 'حجم الصورة بعد الترميز يتجاوز حد الخادم (1MB). يرجى ضغط الصورة لتقليل أبعادها أو حجمها.'
            : 'Encoded image payload exceeds 1MB database limit. Please compress the image and try again.'
        );
        return;
      }
      setSelectedImage(result);
      soundManager.playClick();
    };
    reader.readAsDataURL(file);
    resetFileInput();
  };

  // Voice Note Recording Handlers (30-second compressed WebM/Opus audio)
  const startVoiceRecording = async () => {
    if (!canAccessChat || isMutedFromChat) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showToastNotice('error', isAr ? 'المتصفح لا يدعم تسجيل الملاحظات الصوتية' : 'Browser does not support audio recording');
      return;
    }

    try {
      soundManager.playClick();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 })
        : new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recordingStartSecRef.current = Date.now();
      setRecordingSeconds(0);
      setIsRecordingVoice(true);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordingChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setIsRecordingVoice(false);

        if (recordingChunksRef.current.length === 0) return;
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 750 * 1024) {
          showToastNotice(
            'error',
            isAr ? 'التسجيل الصوتي طويل جداً. يرجى تسجيل رسالة أقصر.' : 'Voice note exceeds size limit. Please record a shorter clip.'
          );
          return;
        }

        const durationSec = Math.max(1, Math.round((Date.now() - recordingStartSecRef.current) / 1000));
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          if (base64Audio) {
            setRecordedAudioDataUrl(base64Audio);
            setRecordedAudioDuration(durationSec);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);

      recordingTimerRef.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - recordingStartSecRef.current) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= 30 && mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 500);
    } catch (err: any) {
      console.warn('Voice note mic access error:', err);
      showToastNotice(
        'error',
        isAr
          ? 'يرجى السماح بصلاحية الميكروفون في المتصفح لتسجيل رسالة صوتية'
          : 'Please allow microphone access in your browser to record voice notes'
      );
    }
  };

  const stopVoiceRecording = () => {
    soundManager.playClick();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    soundManager.playClick();
    recordingChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
    setRecordedAudioDataUrl(null);
    setRecordedAudioDuration(0);
    setRecordingSeconds(0);
  };

  // 2. Write to Firestore 'public_chat' collection with anti-spam (>2 repeats) & temporary lock enforcement
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAccessChat || isMutedFromChat) return;

    if (chatRoomSettings.isClosed && !isCurrentAdmin) {
      showToastNotice(
        'error',
        isAr ? 'تم إغلاق غرفة الدردشة مؤقتاً من قبل الإدارة.' : 'Chat room is temporarily closed by administration.'
      );
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToastNotice('error', isAr ? 'يرجى تسجيل الدخول للمشاركة في الشات.' : 'Please sign in to post in chat.');
      return;
    }

    const textToSend = inputText.trim();
    if (textToSend.length > MAX_CHAT_CHARS) {
      showToastNotice(
        'error',
        isAr ? `الحد الأقصى للرسالة هو ${MAX_CHAT_CHARS} حرفاً.` : `Maximum message length is ${MAX_CHAT_CHARS} characters.`
      );
      return;
    }

    if ((!textToSend && !selectedImage && !recordedAudioDataUrl && !attachedTradeCard) || isSending) return;

    // Anti-Spam Gate: Prevent & auto-discard if repeated more than 2 times (> 2x)
    if (!isCurrentAdmin && textToSend && !recordedAudioDataUrl && !attachedTradeCard) {
      const normIncoming = normalizeChatTextForSpam(textToSend);
      const nowMs = Date.now();
      const recentMatches = messages.filter(
        (m) =>
          m.uid === currentUser.uid &&
          normalizeChatTextForSpam(m.text) === normIncoming &&
          (!m.timestampMs || nowMs - m.timestampMs <= SPAM_WINDOW_MS)
      );
      const myMsgs = messages.filter((m) => m.uid === currentUser.uid);
      const trailingSame =
        myMsgs.length >= SPAM_MAX_ALLOWED_REPEAT &&
        myMsgs
          .slice(-SPAM_MAX_ALLOWED_REPEAT)
          .every((m) => normalizeChatTextForSpam(m.text) === normIncoming);

      if (recentMatches.length >= SPAM_MAX_ALLOWED_REPEAT || trailingSame) {
        setInputText('');
        setIsTypePopupOpen(false);
        showToastNotice(
          'error',
          isAr
            ? 'تم حذف الرسالة تلقائياً: يُمنع تكرار نفس الرسالة أكثر من مرتين (Anti-Spam).'
            : 'Message auto-deleted: repeating the same message more than 2 times is not allowed.'
        );
        return;
      }
    }

    try {
      setIsSending(true);
      soundManager.playClick();

      const detectedTag = attachedTradeCard?.symbol
        ? attachedTradeCard.symbol
        : textToSend.includes('US100')
        ? 'US100'
        : textToSend.includes('XAU') || textToSend.includes('الذهب')
        ? 'XAUUSD'
        : textToSend.includes('EUR')
        ? 'EURUSD'
        : textToSend.includes('BTC')
        ? 'BTCUSD'
        : undefined;

      const userRoleToSend = isCurrentAdmin ? 'ADMIN' : (userRole || 'VIP').toUpperCase();

      const payload: Record<string, any> = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUserName,
        photoURL: currentUser.photoURL || null,
        role: userRoleToSend,
        text: textToSend.slice(0, MAX_CHAT_CHARS),
        imageUrl: isCurrentAdmin ? selectedImage || null : null,
        imageCaption: isCurrentAdmin ? imageCaption.trim().slice(0, 200) || null : null,
        audioUrl: recordedAudioDataUrl || null,
        audioDurationSec: recordedAudioDataUrl ? recordedAudioDuration || 1 : null,
        tradeCard: attachedTradeCard || null,
        symbolTag: detectedTag || null,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              user: replyingTo.user,
              text: replyingTo.text
                ? replyingTo.text.slice(0, 60)
                : replyingTo.tradeCard
                ? `[${replyingTo.tradeCard.action} ${replyingTo.tradeCard.symbol}]`
                : replyingTo.audioUrl
                ? isAr
                  ? '[ملاحظة صوتية 🎙️]'
                  : '[Voice Note 🎙️]'
                : isAr
                ? '[صورة تحليل فني]'
                : '[Chart Image]',
              imageUrl: replyingTo.imageUrl || null
            }
          : null,
        isPinned: false,
        likes: 0,
        reactions: {},
        createdAt: serverTimestamp(),
        timestampMs: Date.now()
      };

      const docRef = await addDoc(collection(db, 'public_chat'), payload);

      const senderLabel = (currentUser.displayName || currentUserName || 'متداول').trim().slice(0, 50);
      const pushBodyText = textToSend
        ? textToSend.slice(0, 180)
        : attachedTradeCard
        ? `📊 صفقة ${attachedTradeCard.action} ${attachedTradeCard.symbol} @ ${attachedTradeCard.entry}`
        : recordedAudioDataUrl
        ? '🎙️ رسالة صوتية جديدة في الشات'
        : selectedImage
        ? '🖼️ صورة تحليل فني جديدة في الشات'
        : 'رسالة جديدة في شات MBK';

      const hasMention = /@\S+/.test(textToSend);
      const nowChatPushMs = Date.now();
      const lastClientChatPushMs = Number(
        (window as any).__mbkLastPublicChatPushAtMs || 0
      );
      const shouldDispatchChatPush =
        isCurrentAdmin ||
        hasMention ||
        Boolean(attachedTradeCard) ||
        nowChatPushMs - lastClientChatPushMs >= 120_000;

      if (shouldDispatchChatPush) {
        (window as any).__mbkLastPublicChatPushAtMs = nowChatPushMs;
        triggerServerWebPush({
          title: isCurrentAdmin ? `💬 [إدارة MBK] ${senderLabel}` : `💬 ${senderLabel} • شات MBK`,
          body: pushBodyText,
          tag: `mbk-chat-${docRef.id}`,
          url: '/',
          audience: 'all',
          category: 'chat',
          excludeUid: currentUser.uid
        });
      }

      setInputText('');
      setSelectedImage(null);
      setImageCaption('');
      setRecordedAudioDataUrl(null);
      setRecordedAudioDuration(0);
      setAttachedTradeCard(null);
      setReplyingTo(null);
      setIsTypePopupOpen(false);
      scrollToBottom('smooth');
      soundManager.playProfitChime();
    } catch (err: any) {
      console.error('Send Firestore chat message error:', err);
      showToastNotice(
        'error',
        isAr ? 'تعذر إرسال الرسالة. تأكد من صلاحيات الحساب أو حالة الكتم.' : `Failed to send message: ${err?.message || err}`
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!canAccessChat) return;
    soundManager.playClick();
    setShowEmojiPickerFor(null);
    try {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;

      const uid = auth.currentUser?.uid || myCurrentUid || 'anon';
      const reactionKey = `${uid}_${messageId}_${emoji}`;
      const updatedReactions = { ...(msg.reactions || {}) };
      const currentEmojiCount = Number(updatedReactions[emoji] || 0);
      let nextLikes = Number(msg.likes || 0);

      // Admin can increment reaction numbers as much as they want; regular users can only react 1x per emoji (click again to remove)
      if (isCurrentAdmin) {
        updatedReactions[emoji] = currentEmojiCount + 1;
        if (emoji === '❤️') {
          nextLikes = nextLikes + 1;
        }
      } else {
        const hasAlreadyReacted = userReactionsSet.has(reactionKey);
        const nextSet = new Set(userReactionsSet);

        if (hasAlreadyReacted) {
          // Toggle off the user's single reaction
          nextSet.delete(reactionKey);
          const decremented = Math.max(0, currentEmojiCount - 1);
          if (decremented === 0) {
            delete updatedReactions[emoji];
          } else {
            updatedReactions[emoji] = decremented;
          }
          if (emoji === '❤️') {
            nextLikes = Math.max(0, nextLikes - 1);
          }
        } else {
          // Add 1 reaction for this user
          nextSet.add(reactionKey);
          updatedReactions[emoji] = currentEmojiCount + 1;
          if (emoji === '❤️') {
            nextLikes = nextLikes + 1;
          }
        }

        setUserReactionsSet(nextSet);
        try {
          localStorage.setItem(USER_REACTIONS_STORAGE_KEY, JSON.stringify(Array.from(nextSet).slice(-400)));
        } catch {
          // ignore
        }
      }

      const docRef = doc(db, 'public_chat', messageId);
      await updateDoc(docRef, {
        reactions: updatedReactions,
        likes: nextLikes
      });
    } catch (err) {
      console.warn('React message error:', err);
    }
  };

  const handlePinMessage = async (messageId: string, currentlyPinned?: boolean) => {
    if (!isCurrentAdmin) return;
    soundManager.playClick();
    try {
      const docRef = doc(db, 'public_chat', messageId);
      await updateDoc(docRef, { isPinned: !currentlyPinned });
      showToastNotice('success', isAr ? (!currentlyPinned ? 'تم تثبيت الرسالة' : 'تم إلغاء التثبيت') : 'Updated pin status');
    } catch (err: any) {
      console.error('Pin message error:', err);
      showToastNotice('error', err?.message || 'Pin failed');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!isCurrentAdmin) return;
    soundManager.playClick();
    try {
      markDocumentDeleted(messageId);
      await deleteDoc(doc(db, 'public_chat', messageId));
      removeMessageLocally(messageId);
      showToastNotice('success', isAr ? 'تم حذف الرسالة بنجاح' : 'Message deleted');
    } catch (err: any) {
      console.error('Delete message error:', err);
      showToastNotice('error', err?.message || 'Delete failed');
    }
  };

  const handleStartEditMessage = (msg: ChatMessageItem) => {
    soundManager.playClick();
    setEditingMessageId(msg.id);
    setEditingMessageText(msg.text || '');
  };

  const handleSaveEditMessage = async (messageId: string) => {
    const cleanText = editingMessageText.trim().slice(0, MAX_CHAT_CHARS);
    if (!cleanText || savingEdit) return;
    setSavingEdit(true);
    soundManager.playClick();
    try {
      await updateDoc(doc(db, 'public_chat', messageId), {
        text: cleanText,
        editedAt: new Date().toISOString()
      });
      setEditingMessageId(null);
      setEditingMessageText('');
      soundManager.playSuccess();
      showToastNotice('success', isAr ? 'تم تعديل الرسالة بنجاح' : 'Message updated');
    } catch (err: any) {
      showToastNotice('error', err?.message || (isAr ? 'تعذر تعديل الرسالة' : 'Could not edit message'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleChatLock = async () => {
    if (!isCurrentAdmin || togglingChatLock) return;
    soundManager.playClick();
    setTogglingChatLock(true);
    const nextClosed = !chatRoomSettings.isClosed;
    try {
      await setDoc(doc(db, 'settings', 'chat_room'), {
        isClosed: nextClosed,
        closedReason: null,
        closedBy: nextClosed ? auth.currentUser?.email || currentUserName : null,
        closedAt: nextClosed ? new Date().toISOString() : null,
        resetAtMs: chatRoomSettings.resetAtMs ?? null,
        updatedAt: new Date().toISOString()
      });
      soundManager.playSuccess();
      showToastNotice(
        'success',
        nextClosed
          ? isAr
            ? 'تم إغلاق غرفة الدردشة مؤقتاً للأعضاء'
            : 'Chat room temporarily closed for members'
          : isAr
          ? 'تم إعادة فتح غرفة الدردشة بنجاح'
          : 'Chat room reopened for members'
      );
    } catch (err: any) {
      console.error('Toggle chat lock error:', err);
      showToastNotice('error', err?.message || (isAr ? 'تعذر تحديث حالة إغلاق الغرفة' : 'Failed to toggle chat lock'));
    } finally {
      setTogglingChatLock(false);
    }
  };

  const handleResetChatMessages = async () => {
    if (!isCurrentAdmin || resettingChat) return;
    setResettingChat(true);
    soundManager.playClick();
    try {
      const snap = await getDocs(collection(db, 'public_chat'));
      const docs = snap.docs;
      const CHUNK_SIZE = 450;
      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        docs.slice(i, i + CHUNK_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      await setDoc(doc(db, 'settings', 'chat_room'), {
        isClosed: chatRoomSettings.isClosed,
        closedReason: chatRoomSettings.closedReason ?? null,
        closedBy: chatRoomSettings.closedBy ?? null,
        closedAt: chatRoomSettings.closedAt ?? null,
        resetAtMs: Date.now(),
        updatedAt: new Date().toISOString()
      });

      autoDeletedSpamIdsRef.current.clear();
      clearPinnedMessageLocally();
      setPendingResetConfirm(false);
      soundManager.playSuccess();
      showToastNotice(
        'success',
        isAr
          ? `تم تصفير الشات وحذف ${docs.length} رسالة بنجاح`
          : `Chat reset complete (${docs.length} messages cleared)`
      );
    } catch (err: any) {
      console.error('Reset chat messages error:', err);
      showToastNotice('error', err?.message || (isAr ? 'تعذر تصفير رسائل الشات' : 'Failed to reset chat messages'));
    } finally {
      setResettingChat(false);
    }
  };

  const handleToggleMuteUser = async (targetUid?: string, targetName?: string) => {
    if (!isCurrentAdmin || !targetUid || targetUid === auth.currentUser?.uid) return;
    soundManager.playClick();
    try {
      const userRef = doc(db, 'users', targetUid);
      let currentMuted = Boolean(moderatedUsers[targetUid]?.isMutedFromChat);
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          currentMuted = Boolean(snap.data().isMutedFromChat);
        }
      } catch {
        // Fallback to tracked toggle state
      }
      const nextMuted = !currentMuted;
      await updateDoc(userRef, {
        isMutedFromChat: nextMuted,
        updatedAt: new Date().toISOString()
      });
      setModeratedUsers((prev) => ({
        ...prev,
        [targetUid]: { ...prev[targetUid], isMutedFromChat: nextMuted }
      }));
      showToastNotice(
        'success',
        nextMuted
          ? isAr
            ? `تم كتم ${targetName || 'المتداول'} عن الدردشة`
            : `Muted ${targetName || 'user'} in chat`
          : isAr
          ? `تم فك الكتم عن ${targetName || 'المتداول'}`
          : `Unmuted ${targetName || 'user'}`
      );
    } catch (err: any) {
      console.error('Mute user error:', err);
      showToastNotice('error', err?.message || (isAr ? 'تعذر تحديث حالة الكتم' : 'Mute failed'));
    }
  };

  const applyBanUpdate = async (targetUid: string, targetName: string | undefined, nextBanned: boolean) => {
    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        isBanned: nextBanned,
        updatedAt: new Date().toISOString()
      });
      setModeratedUsers((prev) => ({
        ...prev,
        [targetUid]: { ...prev[targetUid], isBanned: nextBanned }
      }));
      showToastNotice(
        'success',
        nextBanned
          ? isAr
            ? `تم حظر ${targetName || 'المتداول'} من المنصة`
            : `Banned ${targetName || 'user'}`
          : isAr
          ? `تم إلغاء حظر ${targetName || 'المتداول'}`
          : `Unbanned ${targetName || 'user'}`
      );
    } catch (err: any) {
      console.error('Ban user error:', err);
      showToastNotice('error', err?.message || (isAr ? 'تعذر تحديث حالة الحظر' : 'Ban failed'));
    }
  };

  const handleToggleBanUser = async (targetUid?: string, targetName?: string) => {
    if (!isCurrentAdmin || !targetUid || targetUid === auth.currentUser?.uid) return;
    soundManager.playClick();
    let currentBanned = Boolean(moderatedUsers[targetUid]?.isBanned);
    try {
      const snap = await getDoc(doc(db, 'users', targetUid));
      if (snap.exists()) {
        currentBanned = Boolean(snap.data().isBanned);
      }
    } catch {
      // Fallback to tracked toggle state
    }
    const nextBanned = !currentBanned;
    if (nextBanned) {
      setPendingBanTarget({ uid: targetUid, name: targetName || targetUid });
      return;
    }
    await applyBanUpdate(targetUid, targetName, false);
  };

  const filtered = messages.filter((m) => {
    if (activeSymbolFilter !== 'ALL' && m.symbolTag !== activeSymbolFilter) return false;
    return true;
  });

  // VIP Lock Screen for Free / Non-VIP Users
  if (!canAccessChat) {
    return (
      <div
        className="h-full w-full flex-1 min-h-0 flex flex-col items-center justify-center p-5 text-center bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] select-none"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="max-w-sm w-full bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#EFE0B4] dark:border-amber-500/30 rounded-2xl p-6 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FDF6E3] dark:bg-amber-500/15 border border-[#EFE0B4] dark:border-amber-500/40 text-[#9A6700] dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#131722] dark:text-white">
              {isAr ? 'الشات العام' : 'General Chat'}
            </h3>
            <p className="text-xs text-[#787b86] mt-1.5 leading-relaxed">
              {isAr
                ? 'الشات العام متاح للأعضاء المشتركين.'
                : 'General Chat is available for active members.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {onOpenPlansModal && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onOpenPlansModal();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg"
              >
                <Crown className="w-4 h-4" />
                <span>{isAr ? 'ترقية إلى VIP ($100/mo)' : 'Upgrade to VIP ($100/mo)'}</span>
              </button>
            )}
            {onOpenPromoModal && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onOpenPromoModal();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#131722] font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isAr ? 'تفعيل مفتاح VIP للدخول' : 'Activate VIP Key to Enter'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full flex-1 min-h-0 flex flex-col overflow-hidden relative select-none bg-[#F8F9FD] dark:bg-[#1e222d]"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* 1. ROOM HEADER */}
      <div
        className={`border-b border-[#E0E3EB] dark:border-[#2a2e39] bg-[#FFFFFF]/95 dark:bg-[#131722]/95 flex items-center justify-between gap-1.5 shrink-0 ${
          isCompact ? 'px-2 py-2' : 'px-3 py-2.5 sm:py-3'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#E6F5F2] dark:bg-[#089981]/15 border border-[#B3E2D9] dark:border-[#089981]/40 flex items-center justify-center text-[#089981] shadow-sm shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2
                className={`font-bold text-[#131722] dark:text-white flex items-center gap-1 truncate ${
                  isCompact ? 'text-xs' : 'text-xs sm:text-sm'
                }`}
              >
                <span>{isAr ? 'الشات العام' : 'General Chat'}</span>
              </h2>

              {!isCompact && (
                chatRoomSettings.isClosed ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#FDECEE] dark:bg-rose-500/20 text-[#D93848] dark:text-rose-400 border border-[#F5C2C7] dark:border-rose-500/40 flex items-center gap-1 shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    <span>{isAr ? 'مغلق مؤقتاً' : 'LOCKED'}</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/40 flex items-center gap-1 shrink-0">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#089981] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#089981]" />
                    </span>
                    <span>LIVE</span>
                  </span>
                )
              )}
            </div>

            <p className="text-[10px] text-[#787b86] flex items-center gap-1.5 truncate mt-0.5">
              <span className="font-mono text-[#089981] font-bold">
                {isAr ? `${messages.length} رسالة` : `${messages.length} msgs`}
              </span>
              <span className="text-[#434651]">•</span>
              <span className={chatRoomSettings.isClosed ? 'text-[#D93848] dark:text-rose-400 font-bold' : 'text-[#089981] font-bold'}>
                {chatRoomSettings.isClosed
                  ? isAr
                    ? 'مغلق مؤقتاً'
                    : 'Closed'
                  : isAr
                  ? 'متصل'
                  : 'Online'}
              </span>
            </p>
          </div>
        </div>

        {/* Right Tools: Active in Chat Toggle + Admin Controls (Close/Open + Reset) + Quick Asset Filters */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setShowActiveTradersDrawer((prev) => !prev);
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
              showActiveTradersDrawer
                ? 'bg-[#089981] text-white border-[#089981]'
                : 'bg-[#F8F9FD] dark:bg-[#1e222d] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] text-[#089981] border-[#E0E3EB] dark:border-[#2a2e39]'
            }`}
            title={
              isAr
                ? 'عرض المتواجدين في الشات العام الآن'
                : 'View active traders in General Chat'
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span>
              {isAr
                ? `المتواجدون (${activeChatParticipants.length})`
                : `Active (${activeChatParticipants.length})`}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${
                showActiveTradersDrawer ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isCurrentAdmin && (
            <>
              <button
                type="button"
                disabled={togglingChatLock}
                onClick={handleToggleChatLock}
                title={
                  chatRoomSettings.isClosed
                    ? isAr
                      ? 'إعادة فتح الدردشة للأعضاء'
                      : 'Reopen Chat'
                    : isAr
                    ? 'إغلاق الدردشة مؤقتاً'
                    : 'Temporarily Close Chat'
                }
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shrink-0 ${
                  chatRoomSettings.isClosed
                    ? 'bg-[#E6F5F2] dark:bg-[#089981]/20 hover:bg-[#089981]/30 text-[#089981] border-[#B3E2D9] dark:border-[#089981]/50'
                    : 'bg-[#FDF6E3] dark:bg-amber-500/15 hover:bg-amber-500/25 text-[#9A6700] dark:text-amber-300 border-[#EFE0B4] dark:border-amber-500/40'
                }`}
              >
                {chatRoomSettings.isClosed ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {!isCompact && (
                  <span className="hidden sm:inline">
                    {chatRoomSettings.isClosed
                      ? isAr
                        ? 'فتح الشات'
                        : 'Open'
                      : isAr
                      ? 'إغلاق مؤقت'
                      : 'Lock'}
                  </span>
                )}
              </button>

              <button
                type="button"
                disabled={resettingChat}
                onClick={() => {
                  soundManager.playClick();
                  setPendingResetConfirm(true);
                }}
                title={isAr ? 'تصفير وحذف جميع رسائل الشات' : 'Reset / Clear All Messages'}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#FDECEE] dark:bg-[#f23645]/15 hover:bg-[#f23645]/25 text-[#D93848] dark:text-[#f23645] border border-[#F5C2C7] dark:border-[#f23645]/40 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                {!isCompact && <span className="hidden sm:inline">{isAr ? 'تصفير' : 'Reset'}</span>}
              </button>
            </>
          )}

          {!isCompact && (
            <div className="flex items-center gap-0.5 bg-[#F8F9FD] dark:bg-[#1e222d] p-0.5 rounded-lg border border-[#E0E3EB] dark:border-[#2a2e39] text-[10px] font-mono">
              {['ALL', 'XAUUSD', 'US100'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => setActiveSymbolFilter(sym)}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    activeSymbolFilter === sym
                      ? 'bg-[#131722] dark:bg-white text-white dark:text-[#131722] font-bold shadow-sm'
                      : 'text-[#787b86] hover:text-[#131722] dark:hover:text-white'
                  }`}
                >
                  {sym === 'ALL' ? (isAr ? 'الكل' : 'ALL') : sym}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Swipe-Down Active Chat Participants Strip (0 Extra Firestore Reads/Writes) */}
      {showActiveTradersDrawer && (
        <div className="bg-[#FFFFFF] dark:bg-[#161b26] border-b border-[#E0E3EB] dark:border-[#2a2e39] px-3 py-2.5 shrink-0 space-y-2 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#131722] dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#089981]" />
              <span>
                {isAr
                  ? `المتداولون المتواجدون في الشات الآن (${activeChatParticipants.length})`
                  : `Active Traders in General Chat (${activeChatParticipants.length})`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowActiveTradersDrawer(false)}
              className="text-[10px] text-[#787b86] hover:text-[#131722] dark:hover:text-white cursor-pointer flex items-center gap-1"
            >
              <span>{isAr ? 'إخفاء' : 'Hide'}</span>
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {activeChatParticipants.map((trader) => {
              const traderOnline = checkIsTraderOnline(trader.uid, trader.name, trader.role);
              return (
                <button
                  key={trader.uid || trader.name}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setInspectedTrader({
                      uid: trader.uid || undefined,
                      name: trader.name,
                      avatar: trader.avatar,
                      role: trader.role
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] hover:border-[#089981]/50 flex items-center gap-2 shrink-0 cursor-pointer transition-all"
                  title={
                    isAr
                      ? `اضغط لعرض بطاقة ${trader.name} أو إرسال رسالة خاصة`
                      : `Click to view ${trader.name}'s card or send DM`
                  }
                >
                  <div className="relative w-6 h-6 rounded-full bg-[#EDF1F7] dark:bg-[#2a2e39] border border-[#CBD2DF] dark:border-[#363a45] flex items-center justify-center text-[10px] font-bold text-[#131722] dark:text-white overflow-hidden shrink-0">
                    {trader.avatar ? (
                      <img src={trader.avatar} alt={trader.name} className="w-full h-full object-cover" />
                    ) : (
                      trader.name[0]?.toUpperCase() || 'T'
                    )}
                    <span
                      className={`absolute bottom-0 end-0 w-1.5 h-1.5 rounded-full ring-1 ring-[#131722] ${
                        traderOnline ? 'bg-[#089981]' : 'bg-[#64748b]'
                      }`}
                    />
                  </div>
                  <div className="text-start">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-[#131722] dark:text-white max-w-[110px] truncate">
                        {trader.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold ${
                          traderOnline
                            ? 'bg-[#E6F5F2] dark:bg-[#089981]/15 text-[#089981]'
                            : 'bg-[#F8F9FD] dark:bg-white/5 text-[#787b86]'
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            traderOnline ? 'bg-[#089981]' : 'bg-[#64748b]'
                          }`}
                        />
                        <span>{traderOnline ? (isAr ? 'متصل' : 'Online') : isAr ? 'غير متصل' : 'Offline'}</span>
                      </span>
                      {trader.isMe && (
                        <span className="text-[9px] text-[#089981] font-mono">
                          ({isAr ? 'أنت' : 'You'})
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-[#787b86] block">
                      {trader.role}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline Feedback Notice */}
      {chatFeedback && (
        <div
          className={`px-3 py-1.5 text-[11px] font-bold flex items-center justify-between border-b ${
            chatFeedback.type === 'error'
              ? 'bg-[#FDECEE] dark:bg-[#f23645]/15 border-[#F5C2C7] dark:border-[#f23645]/40 text-[#D93848] dark:text-[#f23645]'
              : 'bg-[#E6F5F2] dark:bg-[#089981]/15 border-[#B3E2D9] dark:border-[#089981]/40 text-[#089981]'
          }`}
        >
          <span>{chatFeedback.text}</span>
          <button onClick={() => setChatFeedback(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PINNED ANNOUNCEMENT BANNER */}
      {pinnedMessage && (
        <div className="bg-[#F8F9FD] dark:bg-[#1e222d] border-b border-[#E0E3EB] dark:border-[#2a2e39] px-2.5 py-1.5 flex items-center justify-between text-xs text-[#9A6700] dark:text-amber-300/90 gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-4 h-4 rounded bg-[#FDF6E3] dark:bg-amber-500/20 text-[#9A6700] dark:text-amber-400 flex items-center justify-center shrink-0">
              <Pin className="w-2.5 h-2.5 rotate-45" />
            </div>
            <div className="min-w-0 flex items-baseline gap-1">
              <span className="text-[10px] font-bold text-[#9A6700] dark:text-amber-400 whitespace-nowrap">
                {isAr ? 'مثبت:' : 'Pinned:'}
              </span>
              <span className="text-[11px] text-[#131722] dark:text-[#d1d4dc] truncate">{pinnedMessage.text}</span>
            </div>
          </div>
          {pinnedMessage.imageUrl && (
            <button
              onClick={() =>
                setLightboxImage({
                  url: pinnedMessage.imageUrl!,
                  caption: pinnedMessage.imageCaption,
                  user: pinnedMessage.user
                })
              }
              className="text-[10px] font-bold text-[#089981] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isAr ? 'عرض' : 'View'}
            </button>
          )}
        </div>
      )}

      {/* 2. LIVE MESSAGES STREAM */}
      <div
        ref={scrollRef}
        onScroll={handleMessagesScroll}
        className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 space-y-2.5 bg-[#FFFFFF]/90 dark:bg-[#131722]/50 bg-repeat overscroll-contain relative scroll-smooth"
        style={{
          backgroundImage: 'radial-gradient(#2a2e39 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px'
        }}
      >
        {loading && messages.length === 0 ? (
          <div className="text-center py-16 text-[#787b86] text-xs font-mono animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#089981]" />
            <span>{isAr ? 'جاري الاتصال بالشات العام...' : 'Connecting to General Chat...'}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#787b86] text-xs bg-[#F8F9FD] dark:bg-[#1e222d]/60 rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39] p-4 max-w-sm mx-auto">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#089981] opacity-60" />
            <p className="font-bold text-[#131722] dark:text-white mb-1">{isAr ? 'لا توجد رسائل مطابقة' : 'No messages found'}</p>
            <p className="text-[11px]">
              {isAr ? 'كن أول من يشارك رسالة في الشات العام!' : 'Be the first to post in General Chat!'}
            </p>
          </div>
        ) : (
          filtered.map((msg) => {
            const myUid = auth.currentUser?.uid;
            const isMe = Boolean(myUid && msg.uid === myUid) || msg.user === currentUserName;
            const isAdminOrAnalyst = msg.role === 'ADMIN' || msg.role === 'ANALYST' || msg.role === 'ANALYSER';
            const targetMod = msg.uid ? moderatedUsers[msg.uid] : undefined;
            const canModerateTarget = Boolean(isCurrentAdmin && msg.uid && msg.uid !== myUid);

            return (
              <div
                key={msg.id}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => {
                  setHoveredMessageId(null);
                  setShowEmojiPickerFor(null);
                }}
                className={`flex flex-col relative group ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Floating Quick Action Bar */}
                <div
                  className={`absolute -top-3 z-20 flex items-center gap-1 bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] px-1.5 py-0.5 rounded-full shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg transition-opacity ${
                    hoveredMessageId === msg.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  } ${isMe ? 'start-2' : 'end-2'}`}
                >
                  <button
                    onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                    className="p-1 hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] rounded-full text-[#787b86] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer"
                    title={isAr ? 'تفاعل بإيموجي' : 'React'}
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setReplyingTo(msg);
                    }}
                    className="p-1 hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] rounded-full text-[#787b86] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer"
                    title={isAr ? 'رد على الرسالة' : 'Reply'}
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleInsertMention(msg.user)}
                    className="p-1 hover:bg-[#089981]/20 rounded-full text-[#787b86] hover:text-[#089981] transition-colors cursor-pointer"
                    title={isAr ? `إشارة إلى @${msg.user}` : `Mention @${msg.user}`}
                  >
                    <AtSign className="w-3.5 h-3.5" />
                  </button>

                  {!isMe && msg.uid && onStartDirectMessage && (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        onStartDirectMessage({
                          uid: msg.uid!,
                          displayName: msg.user,
                          avatar: msg.avatar,
                          role: msg.role
                        });
                      }}
                      className="p-1 hover:bg-[#089981]/20 rounded-full text-[#787b86] hover:text-[#089981] transition-colors cursor-pointer"
                      title={isAr ? `رسالة خاصة إلى ${msg.user}` : `Direct message ${msg.user}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isCurrentAdmin && (
                    <>
                      <button
                        onClick={() => handlePinMessage(msg.id, msg.isPinned)}
                        className={`p-1 hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] rounded-full transition-colors cursor-pointer ${
                          msg.isPinned ? 'text-[#9A6700] dark:text-amber-400' : 'text-[#787b86] hover:text-[#9A6700] dark:hover:text-amber-400'
                        }`}
                        title={isAr ? (msg.isPinned ? 'إلغاء التثبيت' : 'تثبيت الرسالة') : 'Pin/Unpin'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      {canModerateTarget && (
                        <>
                          <button
                            onClick={() => handleToggleMuteUser(msg.uid, msg.user)}
                            className={`p-1 hover:bg-amber-500/20 rounded-full transition-colors cursor-pointer ${
                              targetMod?.isMutedFromChat ? 'text-[#9A6700] dark:text-amber-400' : 'text-[#787b86] hover:text-[#9A6700] dark:hover:text-amber-400'
                            }`}
                            title={isAr ? 'كتم / فك كتم المستخدم' : 'Mute / Unmute user'}
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleBanUser(msg.uid, msg.user)}
                            className={`p-1 hover:bg-[#f23645]/20 rounded-full transition-colors cursor-pointer ${
                              targetMod?.isBanned ? 'text-[#D93848] dark:text-[#f23645]' : 'text-[#787b86] hover:text-[#f23645]'
                            }`}
                            title={isAr ? 'حظر / إلغاء حظر المستخدم' : 'Ban / Unban user'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 hover:bg-[#f23645]/20 rounded-full text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer"
                        title={isAr ? 'حذف الرسالة' : 'Delete message'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Floating Emoji Picker Popover */}
                {showEmojiPickerFor === msg.id && (
                  <div
                    className={`absolute -top-10 z-30 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-full px-2 py-1 flex items-center gap-1.5 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl animate-fade-in ${
                      isMe ? 'start-2' : 'end-2'
                    }`}
                  >
                    {EMOJI_LIST.map((em) => (
                      <button
                        key={em}
                        onClick={() => handleReact(msg.id, em)}
                        className="text-sm hover:scale-125 transition-transform cursor-pointer p-0.5"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-2.5 sm:p-3 text-xs leading-relaxed transition-all shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-md relative ${
                    isMe
                      ? 'bg-[#E6F5F2] dark:bg-gradient-to-br dark:from-[#1e2e28] dark:to-[#16231f] border border-[#B3E2D9] dark:border-[#089981]/40 text-[#131722] dark:text-[#e1e4ea] rounded-ee-sm'
                      : isAdminOrAnalyst
                      ? 'bg-[#FDF6E3] dark:bg-gradient-to-br dark:from-[#1e222d] dark:to-[#1a1e29] border border-[#EFE0B4] dark:border-amber-500/35 text-[#131722] dark:text-white rounded-es-sm shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
                      : 'bg-[#FFFFFF] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#131722] dark:text-[#d1d4dc] rounded-es-sm'
                  }`}
                >
                  {msg.replyTo && (
                    <div className="mb-2 p-1.5 rounded-lg bg-[#FFFFFF]/95 dark:bg-[#131722]/80 border-s-4 border-[#089981] text-[11px] text-[#787b86] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-[#089981] block truncate">{msg.replyTo.user}</span>
                        <span className="truncate block text-[#4A5162] dark:text-white/80">{msg.replyTo.text}</span>
                      </div>
                      {msg.replyTo.imageUrl && (
                        <img
                          src={msg.replyTo.imageUrl}
                          alt="Thumbnail"
                          className="w-8 h-8 rounded object-cover shrink-0 border border-[#E0E3EB] dark:border-[#2a2e39]"
                        />
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      {(() => {
                        const isMsgUserOnline = checkIsTraderOnline(msg.uid, msg.user, msg.role);
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playClick();
                                setInspectedTrader({
                                  uid: msg.uid,
                                  name: msg.user,
                                  avatar: msg.avatar,
                                  role: msg.role
                                });
                              }}
                              className="flex items-center gap-1.5 min-w-0 hover:opacity-85 transition-opacity cursor-pointer"
                              title={isAr ? `عرض بطاقة المتداول ${msg.user}` : `View ${msg.user}'s Trader Card`}
                            >
                              <div className="relative shrink-0">
                                {msg.avatar ? (
                                  <img
                                    src={msg.avatar}
                                    alt={msg.user}
                                    className="w-5 h-5 rounded-full object-cover border border-[#CBD2DF] dark:border-[#363a45]"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-[#EDF1F7] dark:bg-[#2a2e39] border border-[#CBD2DF] dark:border-[#363a45] text-[10px] font-bold text-[#131722] dark:text-white flex items-center justify-center">
                                    {msg.user ? msg.user[0].toUpperCase() : 'M'}
                                  </div>
                                )}
                                <span
                                  className={`absolute -bottom-0.5 -end-0.5 w-2 h-2 rounded-full ring-1 ring-[#131722] ${
                                    isMsgUserOnline ? 'bg-[#089981]' : 'bg-[#64748b]'
                                  }`}
                                  title={
                                    isMsgUserOnline
                                      ? isAr
                                        ? 'متصل الآن'
                                        : 'Online'
                                      : isAr
                                      ? 'غير متصل'
                                      : 'Offline'
                                  }
                                />
                              </div>
                              <span className="font-bold text-[#131722] dark:text-white hover:text-[#089981] text-[11px] sm:text-xs truncate transition-colors">
                                {msg.user}
                              </span>
                            </button>

                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8px] font-bold border shrink-0 ${
                                isMsgUserOnline
                                  ? 'bg-[#E6F5F2] dark:bg-[#089981]/15 text-[#089981] border-[#B3E2D9] dark:border-[#089981]/35'
                                  : 'bg-[#F8F9FD] dark:bg-white/5 text-[#787b86] border-[#E0E3EB] dark:border-white/10'
                              }`}
                              title={
                                isMsgUserOnline
                                  ? isAr
                                    ? 'متصل الآن'
                                    : 'Online now'
                                  : isAr
                                  ? 'غير متصل'
                                  : 'Offline'
                              }
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isMsgUserOnline ? 'bg-[#089981] animate-pulse' : 'bg-[#64748b]'
                                }`}
                              />
                              <span>
                                {isMsgUserOnline
                                  ? isAr
                                    ? 'متصل'
                                    : 'Online'
                                  : isAr
                                  ? 'غير متصل'
                                  : 'Offline'}
                              </span>
                            </span>
                          </>
                        );
                      })()}

                      {(() => {
                        const r = (msg.role || 'VIP').toUpperCase();
                        if (r === 'ADMIN') {
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-black bg-[#FDECEE] dark:bg-rose-500/20 text-[#D93848] dark:text-rose-300 border border-[#F5C2C7] dark:border-rose-500/50 flex items-center gap-0.5 shrink-0">
                              <Crown className="w-2.5 h-2.5 text-[#D93848] dark:text-rose-400" />
                              <span>ADMIN</span>
                            </span>
                          );
                        }
                        if (r === 'VIP' || r === 'ELITE') {
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#FDF6E3] dark:bg-amber-500/20 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/50 flex items-center gap-0.5 shrink-0">
                              <Sparkles className="w-2.5 h-2.5 text-[#9A6700] dark:text-amber-400" />
                              <span>{r}</span>
                            </span>
                          );
                        }
                        if (r === 'MODERATOR' || r === 'SALES' || r === 'ANALYST' || r === 'ANALYSER') {
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#EDF1F7] dark:bg-cyan-500/20 text-[#1E53E5] dark:text-cyan-300 border border-[#CBD2DF] dark:border-cyan-500/50 flex items-center gap-0.5 shrink-0">
                              <ShieldCheck className="w-2.5 h-2.5 text-[#1E53E5] dark:text-cyan-400" />
                              <span>{r}</span>
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {msg.symbolTag && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#EDF1F7] dark:bg-cyan-500/15 text-[#1E53E5] dark:text-cyan-400 border border-[#CBD2DF] dark:border-cyan-500/30 shrink-0">
                          ${msg.symbolTag}
                        </span>
                      )}
                    </div>

                    <span className="text-[9px] text-[#787b86] font-mono shrink-0">{msg.time}</span>
                  </div>

                  {/* Embedded Interactive Trade Setup Card */}
                  {msg.tradeCard && (
                    <div className="mb-2 p-2.5 rounded-xl bg-[#FFFFFF]/95 dark:bg-[#131722]/90 border border-[#B3E2D9] dark:border-[#089981]/40 space-y-2">
                      <div className="flex items-center justify-between gap-2 border-b border-[#E0E3EB] dark:border-[#2a2e39] pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold flex items-center gap-1 ${
                              msg.tradeCard.action === 'BUY'
                                ? 'bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/40'
                                : 'bg-[#FDECEE] dark:bg-[#f23645]/20 text-[#D93848] dark:text-[#f23645] border border-[#F5C2C7] dark:border-[#f23645]/40'
                            }`}
                          >
                            {msg.tradeCard.action === 'BUY' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span>{msg.tradeCard.action}</span>
                          </span>
                          <span className="font-mono font-black text-[#131722] dark:text-white text-xs">
                            {msg.tradeCard.symbol}
                          </span>
                          {msg.tradeCard.timeframe && (
                            <span className="text-[9px] font-mono text-[#787b86] bg-[#F8F9FD] dark:bg-[#1e222d] px-1.5 py-0.5 rounded border border-[#E0E3EB] dark:border-[#2a2e39]">
                              {msg.tradeCard.timeframe}
                            </span>
                          )}
                        </div>

                        {onSelectSymbol && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              onSelectSymbol(msg.tradeCard!.symbol as MarketSymbol);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-[#089981] hover:bg-[#07846f] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <BarChart2 className="w-3 h-3" />
                            <span>{isAr ? 'فتح الشارت' : 'Load Chart'}</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center font-mono tabular-nums text-[10px]">
                        <div className="p-1.5 rounded-lg bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39]">
                          <span className="text-[8px] text-[#787b86] block">{isAr ? 'الدخول' : 'ENTRY'}</span>
                          <span className="font-bold text-[#131722] dark:text-white">{msg.tradeCard.entry}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-[#E6F5F2] dark:bg-[#089981]/10 border border-[#B3E2D9] dark:border-[#089981]/30">
                          <span className="text-[8px] text-[#089981] block">{isAr ? 'الهدف TP1' : 'TARGET TP1'}</span>
                          <span className="font-bold text-[#089981]">{msg.tradeCard.tp1}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-[#FDECEE] dark:bg-[#f23645]/10 border border-[#F5C2C7] dark:border-[#f23645]/30">
                          <span className="text-[8px] text-[#D93848] dark:text-[#f23645] block">{isAr ? 'الوقف SL' : 'STOP LOSS'}</span>
                          <span className="font-bold text-[#D93848] dark:text-[#f23645]">{msg.tradeCard.sl}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Embedded Voice Note Player */}
                  {msg.audioUrl && (
                    <div className="mb-2 p-2 rounded-xl bg-[#FFFFFF]/95 dark:bg-[#131722]/90 border border-[#B3E2D9] dark:border-[#089981]/35 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#E6F5F2] dark:bg-[#089981]/20 border border-[#B3E2D9] dark:border-[#089981]/40 text-[#089981] flex items-center justify-center shrink-0">
                        <Mic className="w-3.5 h-3.5" />
                      </div>
                      <audio
                        controls
                        src={msg.audioUrl}
                        className="h-8 w-full max-w-[230px] accent-[#089981]"
                      />
                      {msg.audioDurationSec && (
                        <span className="text-[10px] font-mono text-[#089981] font-bold shrink-0">
                          {msg.audioDurationSec}s
                        </span>
                      )}
                    </div>
                  )}

                  {msg.imageUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-[#E0E3EB] dark:border-[#2a2e39] bg-[#F8F9FD] dark:bg-black/40 group/img relative">
                      <img
                        src={msg.imageUrl}
                        alt="Chart Analysis"
                        onLoad={() => {
                          if (!showScrollBottom) {
                            scrollToBottom('auto');
                          }
                        }}
                        onClick={() =>
                          setLightboxImage({
                            url: msg.imageUrl!,
                            caption: msg.imageCaption || msg.text,
                            user: msg.user
                          })
                        }
                        className="w-full max-h-[280px] object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                      />

                      <button
                        onClick={() =>
                          setLightboxImage({
                            url: msg.imageUrl!,
                            caption: msg.imageCaption || msg.text,
                            user: msg.user
                          })
                        }
                        className="absolute bottom-2 end-2 px-2 py-1 rounded-lg bg-[#131722]/85 dark:bg-black/75 dark:backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 border border-white/20 opacity-95 hover:opacity-100 cursor-pointer shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg"
                      >
                        <Maximize2 className="w-3 h-3 text-[#26A69A] dark:text-[#089981]" />
                        <span>{isAr ? 'تكبير الشارت' : 'Zoom Chart'}</span>
                      </button>

                      {msg.imageCaption && (
                        <div className="p-2 bg-[#FFFFFF]/95 dark:bg-[#131722]/90 border-t border-[#E0E3EB] dark:border-[#2a2e39] text-[11px] font-mono text-[#9A6700] dark:text-amber-300/90 font-semibold">
                          📊 {msg.imageCaption}
                        </div>
                      )}
                    </div>
                  )}

                  {editingMessageId === msg.id ? (
                    <div className="space-y-2 mt-1">
                      <textarea
                        rows={2}
                        maxLength={MAX_CHAT_CHARS}
                        value={editingMessageText}
                        onChange={(e) => setEditingMessageText(e.target.value.slice(0, MAX_CHAT_CHARS))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEditMessage(msg.id);
                          } else if (e.key === 'Escape') {
                            setEditingMessageId(null);
                            setEditingMessageText('');
                          }
                        }}
                        className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#089981] rounded-xl p-2 text-xs text-[#131722] dark:text-white focus:outline-none resize-none"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setEditingMessageId(null);
                            setEditingMessageText('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white text-[10px] font-bold cursor-pointer"
                        >
                          {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          disabled={!editingMessageText.trim() || savingEdit}
                          onClick={() => handleSaveEditMessage(msg.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#089981] hover:bg-[#07846f] disabled:opacity-50 text-white text-[10px] font-bold cursor-pointer"
                        >
                          {savingEdit ? (isAr ? 'حفظ...' : 'Saving...') : isAr ? 'حفظ التعديل' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : msg.text ? (
                    <div>
                      <p className="text-xs text-[#131722] dark:text-[#e1e4ea] leading-relaxed break-words whitespace-pre-wrap">
                        {renderMessageTextWithMentions(msg.text)}
                      </p>
                      {msg.editedAt && (
                        <span className="text-[9px] text-[#787b86] italic block mt-0.5">
                          {isAr ? '(تم التعديل)' : '(edited)'}
                        </span>
                      )}
                    </div>
                  ) : null}

                  {/* Footer: Reactions + Admin/User quick actions */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-[#E0E3EB] dark:border-white/5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {msg.reactions &&
                        Object.entries(msg.reactions).map(([emoji, count]) => {
                          if (count <= 0) return null;
                          const hasReacted = userReactionsSet.has(`${msg.id}::${emoji}`);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReact(msg.id, emoji)}
                              title={
                                isCurrentAdmin
                                  ? isAr
                                    ? 'إدارة: اضغط لزيادة عداد التفاعل بلا حدود'
                                    : 'Admin: Click to increment reaction count freely'
                                  : hasReacted
                                  ? isAr
                                    ? 'اضغط لإلغاء تفاعلك (تفاعل واحد لكل عضو)'
                                    : 'Click to remove your reaction (1 per user)'
                                  : isAr
                                  ? 'اضغط للتفاعل'
                                  : 'Click to react'
                              }
                              className={`px-1.5 py-0.5 rounded-full border text-[10px] flex items-center gap-1 transition-colors cursor-pointer ${
                                hasReacted && !isCurrentAdmin
                                  ? 'bg-[#E6F5F2] dark:bg-[#089981]/20 border-[#089981] text-[#131722] dark:text-white'
                                  : 'bg-[#FFFFFF]/95 dark:bg-[#131722]/80 border-[#E0E3EB] dark:border-[#2a2e39] hover:border-[#089981]'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-mono text-[#787b86] text-[9px] font-bold">{count}</span>
                            </button>
                          );
                        })}

                      <button
                        onClick={() => handleReact(msg.id, '❤️')}
                        className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                          userReactionsSet.has(`${msg.id}::❤️`) && !isCurrentAdmin
                            ? 'text-[#D93848] dark:text-[#f23645] bg-[#FDECEE] dark:bg-[#f23645]/10'
                            : 'text-[#787b86] hover:text-[#f23645]'
                        }`}
                      >
                        <Heart className="w-3 h-3" />
                        {msg.likes > 0 && <span>{msg.likes}</span>}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#787b86]">
                      {isMe && msg.text && editingMessageId !== msg.id && (
                        <button
                          type="button"
                          onClick={() => handleStartEditMessage(msg)}
                          className="px-1.5 py-0.5 rounded-md bg-[#FFFFFF]/95 dark:bg-[#131722]/70 hover:bg-[#089981]/20 border border-[#E0E3EB] dark:border-[#2a2e39] hover:border-[#089981]/50 text-[#4A5162] dark:text-[#9db2c6] hover:text-[#089981] text-[9px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title={isAr ? 'تعديل الرسالة' : 'Edit message'}
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>{isAr ? 'تعديل' : 'Edit'}</span>
                        </button>
                      )}
                      {!isMe && msg.uid && onStartDirectMessage && (
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            onStartDirectMessage({
                              uid: msg.uid!,
                              displayName: msg.user,
                              avatar: msg.avatar,
                              role: msg.role
                            });
                          }}
                          className="px-1.5 py-0.5 rounded-md bg-[#FFFFFF]/95 dark:bg-[#131722]/70 hover:bg-[#089981]/20 border border-[#E0E3EB] dark:border-[#2a2e39] hover:border-[#089981]/50 text-[#4A5162] dark:text-[#9db2c6] hover:text-[#089981] text-[9px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title={isAr ? `مراسلة ${msg.user} على الخاص` : `DM ${msg.user}`}
                        >
                          <Mail className="w-2.5 h-2.5" />
                          <span>{isAr ? 'خاص' : 'DM'}</span>
                        </button>
                      )}
                      {(isCurrentAdmin || isMe) && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 rounded hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] cursor-pointer"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      {isMe ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#089981]" />
                      ) : (
                        <Check className="w-3 h-3 text-[#787b86]/60" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-1 w-full shrink-0" />
      </div>

      {/* FLOATING JUMP-TO-LATEST BUTTON */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-16 start-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-[#089981] hover:bg-[#07806c] text-white text-[11px] font-bold shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl flex items-center gap-1.5 border border-[#CBD2DF] dark:border-white/20 animate-bounce cursor-pointer select-none"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>{isAr ? 'أحدث الرسائل' : 'Latest messages'}</span>
          {newMessagesWhileScrolled > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#f23645] text-white text-[9px] flex items-center justify-center font-mono font-bold">
              {newMessagesWhileScrolled}
            </span>
          )}
        </button>
      )}

      {/* 3. ACTIVE REPLY PREVIEW BANNER */}
      {replyingTo && (
        <div className="p-2 border-t border-[#E0E3EB] dark:border-[#2a2e39] bg-[#FFFFFF] dark:bg-[#131722] flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 text-[#089981] shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-[#089981] text-[11px] block">
                {isAr ? `الرد على ${replyingTo.user}` : `Replying to ${replyingTo.user}`}
              </span>
              <span className="text-[10px] text-[#787b86] truncate block">
                {replyingTo.text || '[صورة تحليلية]'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded text-[#787b86] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4a. ATTACHED TRADE SETUP CARD PREVIEW */}
      {attachedTradeCard && (
        <div className="p-2.5 border-t border-[#E0E3EB] dark:border-[#2a2e39] bg-[#F8F9FD] dark:bg-[#1a1e28] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold ${
                attachedTradeCard.action === 'BUY'
                  ? 'bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/40'
                  : 'bg-[#FDECEE] dark:bg-[#f23645]/20 text-[#D93848] dark:text-[#f23645] border border-[#F5C2C7] dark:border-[#f23645]/40'
              }`}
            >
              {attachedTradeCard.action} {attachedTradeCard.symbol}
            </span>
            <span className="text-[11px] font-mono text-[#131722] dark:text-[#d1d4dc] truncate">
              E: {attachedTradeCard.entry} • TP: {attachedTradeCard.tp1} • SL: {attachedTradeCard.sl}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedTradeCard(null)}
            className="p-1 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] text-[#787b86] hover:text-[#f23645] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4b. RECORDED VOICE NOTE PREVIEW OR ACTIVE RECORDING BAR */}
      {(isRecordingVoice || recordedAudioDataUrl) && (
        <div className="p-2.5 border-t border-[#E0E3EB] dark:border-[#2a2e39] bg-[#F8F9FD] dark:bg-[#1a1e28] flex items-center justify-between gap-2.5 shrink-0">
          {isRecordingVoice ? (
            <>
              <div className="flex items-center gap-2 text-xs font-bold text-[#D93848] dark:text-[#f23645]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f23645] animate-ping" />
                <span>
                  {isAr ? 'جاري تسجيل ملاحظة صوتية...' : 'Recording voice note...'} ({recordingSeconds}s / 30s)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white text-[11px] font-bold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="px-2.5 py-1 rounded-lg bg-[#f23645] hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-white" />
                  <span>{isAr ? 'إيقاف وحفظ' : 'Stop'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#E6F5F2] dark:bg-[#089981]/20 border border-[#B3E2D9] dark:border-[#089981]/40 text-[#089981] flex items-center justify-center shrink-0">
                  <Mic className="w-3.5 h-3.5" />
                </div>
                <audio controls src={recordedAudioDataUrl!} className="h-8 w-full max-w-[220px]" />
                <span className="text-[10px] font-mono text-[#089981] font-bold shrink-0">
                  {recordedAudioDuration}s
                </span>
              </div>
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="p-1 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] text-[#787b86] hover:text-[#f23645] cursor-pointer"
                title={isAr ? 'حذف التسجيل' : 'Discard voice note'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* 4c. ATTACHED IMAGE PREVIEW (Admin Only) */}
      {selectedImage && isCurrentAdmin && (
        <div className="p-2.5 border-t border-[#E0E3EB] dark:border-[#2a2e39] bg-[#F8F9FD] dark:bg-[#1a1e28] flex items-center gap-3 shrink-0">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#089981] shrink-0">
            <img src={selectedImage} alt="Attachment Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-0.5 end-0.5 p-0.5 rounded-full bg-[#131722]/85 dark:bg-black/80 text-white hover:text-[#f23645] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-[#089981] flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              <span>{isAr ? 'تم إرفاق صورة الشارت' : 'Chart attached'}</span>
            </span>
            <input
              type="text"
              maxLength={200}
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value.slice(0, 200))}
              placeholder={isAr ? 'اكتب تعليقاً على الشارت (اختياري)...' : 'Add chart caption...'}
              className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] rounded px-2 py-1 text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] mt-1 focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#089981]"
            />
          </div>
        </div>
      )}

      {/* 5. COMPACT INPUT ROW */}
      {isMutedFromChat ? (
        <div className="p-3 border-t border-[#F5C2C7] dark:border-[#f23645]/40 bg-[#FDECEE] dark:bg-[#f23645]/10 text-[#D93848] dark:text-[#f23645] text-xs font-bold text-center flex items-center justify-center gap-2 shrink-0">
          <span>🔇</span>
          <span>
            {isAr
              ? 'حسابك مكتوم عن المشاركة في الشات بواسطة الإدارة'
              : 'Your account is muted from chat by administration.'}
          </span>
        </div>
      ) : chatRoomSettings.isClosed && !isCurrentAdmin ? (
        <div className="p-3 border-t border-[#EFE0B4] dark:border-amber-500/40 bg-[#FDF6E3] dark:bg-amber-500/10 text-[#9A6700] dark:text-amber-300 text-xs font-bold text-center flex items-center justify-center gap-2 shrink-0">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            {isAr
              ? 'تم إغلاق غرفة الدردشة مؤقتاً من قبل الإدارة. يمكنك متابعة القراءة حتى إعادة فتحها.'
              : 'Chat group is temporarily closed by admin. You can read messages until reopened.'}
          </span>
        </div>
      ) : (
        <>
          {chatRoomSettings.isClosed && isCurrentAdmin && (
            <div className="px-3 py-1.5 border-t border-[#EFE0B4] dark:border-amber-500/40 bg-[#FDF6E3] dark:bg-amber-500/15 text-[#9A6700] dark:text-amber-300 text-[11px] font-bold flex items-center justify-between gap-2 shrink-0">
              <span className="flex items-center gap-1.5 truncate">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {isAr
                    ? 'الغرفة مغلقة مؤقتاً للأعضاء (الإدارة فقط يمكنها النشر)'
                    : 'Chat temporarily closed for members (Admin posting active)'}
                </span>
              </span>
              <button
                type="button"
                disabled={togglingChatLock}
                onClick={handleToggleChatLock}
                className="px-2 py-0.5 rounded-lg bg-[#089981] hover:bg-[#07846f] text-white text-[10px] font-bold shrink-0 cursor-pointer"
              >
                {isAr ? 'فتح الشات' : 'Reopen'}
              </button>
            </div>
          )}
          {/* @Mention Autocomplete Dropdown (0 Firestore Reads/Writes) */}
          {mentionCandidates.length > 0 && (
            <div className="border-t border-[#E0E3EB] dark:border-[#2a2e39] bg-[#FFFFFF] dark:bg-[#131722] px-2.5 py-2 shrink-0 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl z-30 animate-in slide-in-from-bottom-1 duration-150">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-[#089981] flex items-center gap-1">
                  <AtSign className="w-3 h-3" />
                  <span>
                    {isAr
                      ? 'إشارة إلى متداول في الرسالة (@Mention):'
                      : 'Mention a trader in your message (@Mention):'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setManualMentionMenuOpen(false)}
                  className="text-[10px] text-[#787b86] hover:text-[#131722] dark:hover:text-white cursor-pointer flex items-center gap-0.5"
                >
                  <span>{isAr ? 'إغلاق' : 'Close'}</span>
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {mentionCandidates.map((cand) => (
                  <button
                    key={cand.uid || cand.name}
                    type="button"
                    onClick={() => handleInsertMention(cand.name)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#F8F9FD] dark:bg-[#1e222d] hover:bg-[#089981]/20 border border-[#E0E3EB] dark:border-[#2a2e39] hover:border-[#089981]/50 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                  >
                    <div className="relative w-5 h-5 rounded-full bg-[#EDF1F7] dark:bg-[#2a2e39] border border-[#CBD2DF] dark:border-[#363a45] flex items-center justify-center text-[9px] font-bold text-[#131722] dark:text-white overflow-hidden shrink-0">
                      {cand.avatar ? (
                        <img src={cand.avatar} alt={cand.name} className="w-full h-full object-cover" />
                      ) : (
                        cand.name[0]?.toUpperCase() || 'T'
                      )}
                      <span
                        className={`absolute bottom-0 end-0 w-1.5 h-1.5 rounded-full ring-1 ring-[#131722] ${
                          cand.isOnline ? 'bg-[#089981]' : 'bg-[#64748b]'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#131722] dark:text-white">@{cand.name}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        cand.isOnline ? 'bg-[#089981]' : 'bg-[#64748b]'
                      }`}
                      title={cand.isOnline ? (isAr ? 'متصل' : 'Online') : isAr ? 'غير متصل' : 'Offline'}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className="p-2 sm:p-2.5 border-t border-[#E0E3EB] dark:border-[#2a2e39] bg-[#F8F9FD] dark:bg-[#1a1e28] flex items-center gap-1.5 shrink-0 sticky bottom-0 z-30 shadow-[0_-1px_4px_rgba(19,23,34,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
          >
          {isCurrentAdmin && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                fileInputRef.current?.click();
              }}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                selectedImage
                  ? 'bg-[#089981] text-white border-[#089981]'
                  : 'bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] text-[#089981] border-[#E0E3EB] dark:border-[#2a2e39]'
              }`}
              title={isAr ? 'إرفاق صورة شارت من جهازك' : 'Attach chart image'}
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}

          {/* Share Interactive Trade Setup Card Button */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setShowTradeCardModal(true);
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              attachedTradeCard
                ? 'bg-[#089981] text-white border-[#089981]'
                : 'bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] text-[#9A6700] dark:text-amber-400 border-[#E0E3EB] dark:border-[#2a2e39]'
            }`}
            title={isAr ? 'مشاركة بطاقة صفقة أو توصية تداول' : 'Share Trade Setup Card'}
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          {/* Record Voice Note Button */}
          <button
            type="button"
            onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              isRecordingVoice
                ? 'bg-[#f23645] text-white border-[#f23645] animate-pulse'
                : recordedAudioDataUrl
                ? 'bg-[#089981] text-white border-[#089981]'
                : 'bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] text-[#089981] border-[#E0E3EB] dark:border-[#2a2e39]'
            }`}
            title={
              isRecordingVoice
                ? isAr
                  ? 'إيقاف التسجيل الصوتي'
                  : 'Stop Recording'
                : isAr
                ? 'تسجيل رسالة صوتية (30 ثانية)'
                : 'Record Voice Note (30s)'
            }
          >
            {isRecordingVoice ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* @Mention Quick Picker Button */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setManualMentionMenuOpen((prev) => !prev);
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              manualMentionMenuOpen || mentionQueryMatch !== null
                ? 'bg-[#089981] text-white border-[#089981]'
                : 'bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] text-[#089981] border-[#E0E3EB] dark:border-[#2a2e39]'
            }`}
            title={isAr ? 'إشارة إلى مستخدم (@Mention)' : 'Mention user (@Mention)'}
          >
            <AtSign className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 relative flex items-center">
            <input
              type="text"
              maxLength={MAX_CHAT_CHARS}
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHAT_CHARS))}
              placeholder={
                isAr
                  ? 'اكتب رسالة أو @ للإشارة إلى متداول...'
                  : 'Type a message or @ to mention a trader...'
              }
              className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl px-3 py-2 pe-16 text-xs text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] transition-all focus:outline-none"
            />
            <span
              className={`absolute end-8 text-[9px] font-mono pointer-events-none ${
                inputText.length >= MAX_CHAT_CHARS - 30 ? 'text-[#9A6700] dark:text-amber-400' : 'text-[#787b86]'
              }`}
            >
              {inputText.length}/{MAX_CHAT_CHARS}
            </span>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsTypePopupOpen(true);
              }}
              className="absolute end-2 text-[#787b86] hover:text-[#089981] transition-colors p-1 cursor-pointer"
              title={isAr ? 'تكبير في نافذة منبثقة' : 'Enlarge'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage && !recordedAudioDataUrl && !attachedTradeCard) || isSending}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-[#089981] hover:bg-[#07806c] disabled:opacity-40 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shrink-0"
            title={isAr ? 'إرسال' : 'Send'}
          >
            <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
            {!isCompact && <span className="hidden sm:inline">{isAr ? 'إرسال' : 'Send'}</span>}
          </button>
        </form>
        </>
      )}

      {/* 6. POP-UP TYPING MODAL */}
      {isTypePopupOpen && (
        <div
          className="absolute inset-0 z-50 bg-[#131722]/45 dark:bg-black/75 dark:backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsTypePopupOpen(false)}
        >
          <div
            className="bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-2xl w-full max-w-lg shadow-[0_4px_16px_rgba(19,23,34,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="px-3.5 py-2.5 border-b border-[#E0E3EB] dark:border-[#2a2e39] bg-[#FFFFFF] dark:bg-[#171b26] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#E6F5F2] dark:bg-[#089981]/20 border border-[#B3E2D9] dark:border-[#089981]/40 flex items-center justify-center text-[#089981]">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-[#131722] dark:text-white">
                  {isAr ? 'كتابة رسالة في الشات العام' : 'Compose General Chat Message'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsTypePopupOpen(false)}
                className="p-1 rounded-lg text-[#787b86] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-1.5 bg-[#FFFFFF] dark:bg-[#131722] border-b border-[#E0E3EB] dark:border-[#2a2e39]/60 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#089981] font-bold flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-[#089981]" />
                  <span>{isAr ? 'رموز:' : 'Tags:'}</span>
                </span>
                {['#XAUUSD', '#US100', '#EURUSD', '#BTC', '#OIL', '#US30'].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      setInputText((prev) =>
                        (prev ? `${prev} ${sym} ` : `${sym} `).slice(0, MAX_CHAT_CHARS)
                      );
                      popupTextareaRef.current?.focus();
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#F8F9FD] dark:bg-[#1e222d] hover:bg-[#089981]/20 hover:text-[#089981] hover:border-[#089981]/50 border border-[#E0E3EB] dark:border-[#2a2e39] text-[10px] font-mono text-[#4A5162] dark:text-[#9db2ce] transition-colors cursor-pointer shrink-0"
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-[#787b86] shrink-0 hidden sm:inline">
                {isAr ? 'Shift+Enter سطر جديد • Enter إرسال' : 'Shift+Enter newline • Enter send'}
              </span>
            </div>

            <div className="p-3 bg-[#F8F9FD] dark:bg-[#1a1e28] flex flex-col gap-2.5">
              {replyingTo && (
                <div className="p-2 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] flex items-center justify-between text-xs text-[#787b86]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Reply className="w-3.5 h-3.5 text-[#089981] shrink-0" />
                    <span className="truncate">
                      <span className="text-[#089981] font-semibold">{replyingTo.user}: </span>
                      {replyingTo.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-[#787b86] hover:text-[#131722] dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="relative">
                <textarea
                  ref={popupTextareaRef}
                  maxLength={MAX_CHAT_CHARS}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHAT_CHARS))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    } else if (e.key === 'Escape') {
                      setIsTypePopupOpen(false);
                    }
                  }}
                  rows={4}
                  placeholder={
                    isAr
                      ? 'اكتب رسالتك أو استفسارك هنا (بحد أقصى 500 حرف)...'
                      : 'Type your message here (max 500 chars)...'
                  }
                  className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] focus:border-[#1E53E5] dark:focus:border-[#089981] rounded-xl p-3 text-xs sm:text-sm text-[#131722] dark:text-white placeholder-[#787B86] dark:placeholder-[#787b86] focus:outline-none focus:ring-1 focus:ring-[#1E53E5]/30 dark:focus:ring-[#089981]/40 resize-none h-32 leading-relaxed shadow-inner"
                />
                <div
                  className={`absolute bottom-2 end-2 text-[10px] font-mono bg-[#FFFFFF]/95 dark:bg-[#131722]/90 px-1.5 py-0.5 rounded border border-[#E0E3EB] dark:border-[#2a2e39]/60 pointer-events-none ${
                    inputText.length >= MAX_CHAT_CHARS - 30 ? 'text-[#9A6700] dark:text-amber-400' : 'text-[#787b86]'
                  }`}
                >
                  {inputText.length}/{MAX_CHAT_CHARS}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {['🚀', '📈', '🔥', '💰', '👍', '📉', '⚡'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setInputText((prev) => `${prev} ${emoji}`.slice(0, MAX_CHAT_CHARS));
                        popupTextareaRef.current?.focus();
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] text-sm cursor-pointer transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {isCurrentAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        fileInputRef.current?.click();
                      }}
                      className="p-1.5 px-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#089981] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إرفاق شارت' : 'Attach'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-3.5 py-2.5 border-t border-[#E0E3EB] dark:border-[#2a2e39] bg-[#FFFFFF] dark:bg-[#171b26] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsTypePopupOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] text-xs font-semibold transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={(!inputText.trim() && !selectedImage) || isSending}
                className="px-4 py-1.5 rounded-xl bg-[#089981] hover:bg-[#07806c] disabled:opacity-40 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
                <span>{isAr ? 'إرسال الرسالة' : 'Send Message'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAN USER CONFIRMATION DIALOG (Admin Only) */}
      {pendingBanTarget && isCurrentAdmin && (
        <div
          className="fixed inset-0 z-50 bg-[#131722]/45 dark:bg-black/80 dark:backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPendingBanTarget(null)}
        >
          <div
            className="bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#F5C2C7] dark:border-rose-500/40 rounded-2xl p-5 max-w-sm w-full shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-2.5 text-[#D93848] dark:text-rose-400">
              <Ban className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-[#131722] dark:text-white">
                {isAr ? 'تأكيد حظر المستخدم' : 'Confirm User Ban'}
              </h3>
            </div>
            <p className="text-xs text-[#131722] dark:text-[#d1d4dc] leading-relaxed">
              {isAr
                ? `هل تريد حظر المستخدم "${pendingBanTarget.name}" نهائياً من دخول المنصة والمحادثة؟`
                : `Ban "${pendingBanTarget.name}" from platform and chat access?`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingBanTarget(null)}
                className="px-3.5 py-2 rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39] text-xs font-semibold text-[#787b86] hover:text-[#131722] dark:hover:text-white cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = pendingBanTarget;
                  setPendingBanTarget(null);
                  await applyBanUpdate(target.uid, target.name, true);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                {isAr ? 'تأكيد الحظر' : 'Confirm Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET CHAT CONFIRMATION DIALOG (Admin Only) */}
      {pendingResetConfirm && isCurrentAdmin && (
        <div
          className="fixed inset-0 z-50 bg-[#131722]/45 dark:bg-black/80 dark:backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !resettingChat && setPendingResetConfirm(false)}
        >
          <div
            className="bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#F5C2C7] dark:border-[#f23645]/40 rounded-2xl p-5 max-w-sm w-full shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-2.5 text-[#D93848] dark:text-[#f23645]">
              <RotateCcw className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-[#131722] dark:text-white">
                {isAr ? 'تأكيد تصفير رسائل الشات' : 'Confirm Chat Reset'}
              </h3>
            </div>
            <p className="text-xs text-[#131722] dark:text-[#d1d4dc] leading-relaxed">
              {isAr
                ? `هل أنت متأكد من حذف جميع الرسائل (${messages.length} رسالة) وتصفير سجل الدردشة بالكامل؟ لا يمكن التراجع عن هذه الخطوة.`
                : `Are you sure you want to permanently clear all ${messages.length} chat messages? This action cannot be undone.`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={resettingChat}
                onClick={() => setPendingResetConfirm(false)}
                className="px-3.5 py-2 rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39] text-xs font-semibold text-[#787b86] hover:text-[#131722] dark:hover:text-white cursor-pointer disabled:opacity-50"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={resettingChat}
                onClick={handleResetChatMessages}
                className="px-4 py-2 rounded-xl bg-[#f23645] hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resettingChat ? 'animate-spin' : ''}`} />
                <span>
                  {resettingChat
                    ? isAr
                      ? 'جاري التصفير...'
                      : 'Resetting...'
                    : isAr
                    ? 'تأكيد التصفير'
                    : 'Reset All'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN IMAGE LIGHTBOX */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-[#131722]/60 dark:bg-black/95 dark:backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in">
          <div className="flex items-center justify-between text-[#131722] dark:text-white pb-3 border-b border-[#E0E3EB] dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{lightboxImage.user || 'MBK Analyst'}</span>
              {lightboxImage.caption && (
                <span className="text-xs text-[#787b86] hidden sm:inline">• {lightboxImage.caption}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.url}
                target="_blank"
                rel="noreferrer"
                download="chart-analysis.jpg"
                className="p-2 rounded-lg bg-[#F8F9FD] dark:bg-[#1e222d] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] text-[#131722] dark:text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-[#089981]" />
                <span className="hidden sm:inline">{isAr ? 'فتح بالحجم الكامل' : 'Full Size'}</span>
              </a>

              <button
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-lg bg-[#F8F9FD] dark:bg-[#1e222d] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden">
            <img
              src={lightboxImage.url}
              alt="Fullscreen Chart"
              className="max-h-full max-w-full object-contain rounded-lg shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl"
            />
          </div>

          {lightboxImage.caption && (
            <div className="pt-3 border-t border-[#E0E3EB] dark:border-white/10 text-center text-xs text-[#9A6700] dark:text-amber-300 font-mono">
              📊 {lightboxImage.caption}
            </div>
          )}
        </div>
      )}

      {/* 7. TRADE SETUP CARD PICKER & BUILDER MODAL */}
      {showTradeCardModal && (
        <div
          className="fixed inset-0 z-50 bg-[#131722]/45 dark:bg-black/80 dark:backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowTradeCardModal(false)}
        >
          <div
            className="bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-2xl max-w-md w-full p-4 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between border-b border-[#E0E3EB] dark:border-[#2a2e39] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#E6F5F2] dark:bg-[#089981]/20 border border-[#B3E2D9] dark:border-[#089981]/40 text-[#089981] flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-[#131722] dark:text-white">
                  {isAr ? 'مشاركة بطاقة صفقة تفاعلية في الشات' : 'Share Interactive Trade Setup Card'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTradeCardModal(false)}
                className="p-1 rounded-lg text-[#787b86] hover:text-[#131722] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Option A: Quick-Pick from Live Signals */}
            {liveSignals && liveSignals.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#4A5162] dark:text-[#9db2c6] block">
                  {isAr ? 'اختر من الصفقات الجارية حالياً:' : 'Pick from active live signals:'}
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {liveSignals.slice(0, 6).map((sig) => (
                    <button
                      key={sig.id}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setAttachedTradeCard({
                          id: sig.id,
                          symbol: sig.symbol,
                          action: sig.action === 'SELL' ? 'SELL' : 'BUY',
                          entry: sig.entryPrice,
                          tp1: sig.tp1,
                          tp2: sig.tp2,
                          sl: sig.sl,
                          pips: sig.pips,
                          timeframe: sig.timeframe || '15m'
                        });
                        setShowTradeCardModal(false);
                      }}
                      className="w-full p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] hover:border-[#089981] flex items-center justify-between text-xs cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            sig.action === 'BUY'
                              ? 'bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981]'
                              : 'bg-[#FDECEE] dark:bg-[#f23645]/20 text-[#D93848] dark:text-[#f23645]'
                          }`}
                        >
                          {sig.action}
                        </span>
                        <span className="font-mono font-bold text-[#131722] dark:text-white">{sig.symbol}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#787b86]">
                        E: {sig.entryPrice} • TP: {sig.tp1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Option B: Custom Trade Setup Card */}
            <div className="space-y-2.5 pt-2 border-t border-[#E0E3EB] dark:border-[#2a2e39]">
              <span className="text-[11px] font-bold text-[#9A6700] dark:text-amber-400 block">
                {isAr ? 'أو أنشئ بطاقة صفقة مخصصة:' : 'Or create a custom trade setup card:'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#787b86] block mb-1">{isAr ? 'الزوج / الأصل' : 'Symbol'}</label>
                  <select
                    value={customTradeSymbol}
                    onChange={(e) => setCustomTradeSymbol(e.target.value as MarketSymbol)}
                    className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#131722] dark:text-white"
                  >
                    <option value="XAUUSD">XAUUSD (Gold)</option>
                    <option value="US100">US100 (Nasdaq)</option>
                    <option value="EURUSD">EURUSD</option>
                    <option value="BTCUSD">BTCUSD</option>
                    <option value="GBPUSD">GBPUSD</option>
                    <option value="WTI">WTI (Oil)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#787b86] block mb-1">{isAr ? 'نوع الأمر' : 'Direction'}</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomTradeAction('BUY')}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer border ${
                        customTradeAction === 'BUY'
                          ? 'bg-[#089981] text-white border-[#089981]'
                          : 'bg-[#FFFFFF] dark:bg-[#131722] text-[#787b86] border-[#E0E3EB] dark:border-[#2a2e39]'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomTradeAction('SELL')}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer border ${
                        customTradeAction === 'SELL'
                          ? 'bg-[#f23645] text-white border-[#f23645]'
                          : 'bg-[#FFFFFF] dark:bg-[#131722] text-[#787b86] border-[#E0E3EB] dark:border-[#2a2e39]'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-[#787b86] block mb-1">{isAr ? 'الدخول' : 'Entry'}</label>
                  <input
                    type="text"
                    value={customTradeEntry}
                    onChange={(e) => setCustomTradeEntry(e.target.value)}
                    className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-lg px-2 py-1.5 text-xs font-mono text-[#131722] dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#089981] block mb-1">{isAr ? 'الهدف TP1' : 'TP1'}</label>
                  <input
                    type="text"
                    value={customTradeTp1}
                    onChange={(e) => setCustomTradeTp1(e.target.value)}
                    className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#B3E2D9] dark:border-[#089981]/40 rounded-lg px-2 py-1.5 text-xs font-mono text-[#089981]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#D93848] dark:text-[#f23645] block mb-1">{isAr ? 'الوقف SL' : 'Stop Loss'}</label>
                  <input
                    type="text"
                    value={customTradeSl}
                    onChange={(e) => setCustomTradeSl(e.target.value)}
                    className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#F5C2C7] dark:border-[#f23645]/40 rounded-lg px-2 py-1.5 text-xs font-mono text-[#D93848] dark:text-[#f23645]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setAttachedTradeCard({
                    symbol: customTradeSymbol,
                    action: customTradeAction,
                    entry: customTradeEntry || '0',
                    tp1: customTradeTp1 || '0',
                    sl: customTradeSl || '0',
                    timeframe: '15m'
                  });
                  setShowTradeCardModal(false);
                }}
                className="w-full py-2 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white text-xs font-bold cursor-pointer transition-colors"
              >
                {isAr ? 'إرفاق بطاقة الصفقة بالرسالة' : 'Attach Trade Setup Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. CLICKABLE TRADER PROFILE POPOVER CARD MODAL */}
      {inspectedTrader && (
        <div
          className="fixed inset-0 z-50 bg-[#131722]/45 dark:bg-black/75 dark:backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setInspectedTrader(null)}
        >
          <div
            className="bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-2xl max-w-sm w-full p-5 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {inspectedTrader.avatar ? (
                    <img
                      src={inspectedTrader.avatar}
                      alt={inspectedTrader.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-[#089981]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-[#FFFFFF] dark:bg-[#131722] border-2 border-[#089981] text-[#131722] dark:text-white font-mono font-black text-lg flex items-center justify-center">
                      {inspectedTrader.name ? inspectedTrader.name[0].toUpperCase() : 'T'}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-[#1e222d] ${
                      checkIsTraderOnline(inspectedTrader.uid, inspectedTrader.name, inspectedTrader.role)
                        ? 'bg-[#089981]'
                        : 'bg-[#64748b]'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#131722] dark:text-white">{inspectedTrader.name}</h3>
                    {(() => {
                      const traderOnline = checkIsTraderOnline(
                        inspectedTrader.uid,
                        inspectedTrader.name,
                        inspectedTrader.role
                      );
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            traderOnline
                              ? 'bg-[#E6F5F2] dark:bg-[#089981]/15 text-[#089981] border-[#B3E2D9] dark:border-[#089981]/35'
                              : 'bg-[#F8F9FD] dark:bg-white/5 text-[#787b86] border-[#E0E3EB] dark:border-white/10'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              traderOnline ? 'bg-[#089981] animate-pulse' : 'bg-[#64748b]'
                            }`}
                          />
                          <span>
                            {traderOnline
                              ? isAr
                                ? 'متصل الآن'
                                : 'Online'
                              : isAr
                              ? 'غير متصل'
                              : 'Offline'}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/40">
                      {(inspectedTrader.role || 'TRADER').toUpperCase()}
                    </span>
                    <span className="text-[10px] text-[#787b86]">
                      {isAr ? 'عضو معتمد في MBK' : 'Verified MBK Member'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedTrader(null)}
                className="p-1 rounded-lg text-[#787b86] hover:text-[#131722] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E0E3EB] dark:border-[#2a2e39]">
              <button
                type="button"
                onClick={() => {
                  const target = inspectedTrader;
                  setInspectedTrader(null);
                  handleInsertMention(target.name);
                }}
                className="col-span-2 py-2 px-3 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#089981]/20 border border-[#E0E3EB] dark:border-[#2a2e39] hover:border-[#089981]/50 text-[#089981] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <AtSign className="w-3.5 h-3.5" />
                <span>
                  {isAr ? `إشارة إلى @${inspectedTrader.name} في الشات` : `Mention @${inspectedTrader.name} in Chat`}
                </span>
              </button>

              {inspectedTrader.uid &&
                inspectedTrader.uid !== auth.currentUser?.uid &&
                onStartDirectMessage && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      const target = inspectedTrader;
                      setInspectedTrader(null);
                      onStartDirectMessage({
                        uid: target.uid!,
                        displayName: target.name,
                        avatar: target.avatar,
                        role: target.role
                      });
                    }}
                    className="col-span-2 py-2.5 px-3 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إرسال رسالة خاصة (DM)' : 'Send Direct Message (DM)'}</span>
                  </button>
                )}

              {isCurrentAdmin &&
                inspectedTrader.uid &&
                inspectedTrader.uid !== auth.currentUser?.uid && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const target = inspectedTrader;
                        setInspectedTrader(null);
                        handleToggleMuteUser(target.uid, target.name);
                      }}
                      className="py-2 px-3 rounded-xl bg-[#FDF6E3] dark:bg-amber-500/15 hover:bg-amber-500/25 border border-[#EFE0B4] dark:border-amber-500/40 text-[#9A6700] dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>{isAr ? 'كتم / فك كتم' : 'Mute / Unmute'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = inspectedTrader;
                        setInspectedTrader(null);
                        handleToggleBanUser(target.uid, target.name);
                      }}
                      className="py-2 px-3 rounded-xl bg-[#FDECEE] dark:bg-[#f23645]/15 hover:bg-[#f23645]/25 border border-[#F5C2C7] dark:border-[#f23645]/40 text-[#D93848] dark:text-[#f23645] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حظر الحساب' : 'Ban User'}</span>
                    </button>
                  </>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
