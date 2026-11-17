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
  Mail
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
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
import { UserProfile } from '../../types/trading';
import { hasFeatureAccess } from '../../utils/entitlements';

export interface ChatReplyTo {
  id: string;
  user: string;
  text: string;
  imageUrl?: string;
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
  time: string;
  likes: number;
  reactions?: Record<string, number>;
  symbolTag?: string;
  replyTo?: ChatReplyTo;
  isPinned?: boolean;
  timestampMs?: number;
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
  onStartDirectMessage
}) => {
  const isAr = lang === 'ar';

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessageItem | null>(null);
  const [inputText, setInputText] = useState('');
  const [activeSymbolFilter, setActiveSymbolFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatFeedback, setChatFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [moderatedUsers, setModeratedUsers] = useState<
    Record<string, { isBanned?: boolean; isMutedFromChat?: boolean }>
  >({});

  // Genuine RBAC + tier/trial authorization checks
  const roleUpper = (userRole || user?.role || 'FREE').toUpperCase();
  const isCurrentAdmin = Boolean(isAdmin || user?.isAdmin || ['ADMIN', 'MODERATOR'].includes(roleUpper));
  const canAccessChat = Boolean(
    isCurrentAdmin ||
      (user
        ? hasFeatureAccess(user, 'vipChat')
        : isVIP || ['VIP', 'ELITE', 'ANALYST', 'ANALYSER'].includes(roleUpper))
  );

  // Image attachment & room moderation state (Admin/Moderator only)
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState<string>('');
  const [pendingBanTarget, setPendingBanTarget] = useState<{ uid: string; name: string } | null>(null);
  const [chatRoomSettings, setChatRoomSettings] = useState<ChatRoomSettingsState>({ isClosed: false });
  const [togglingChatLock, setTogglingChatLock] = useState(false);
  const [pendingResetConfirm, setPendingResetConfirm] = useState(false);
  const [resettingChat, setResettingChat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTypePopupOpen, setIsTypePopupOpen] = useState<boolean>(false);
  const isInitialSnapshotRef = useRef<boolean>(true);
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState<number>(0);

  const showToastNotice = (type: 'error' | 'success', text: string) => {
    setChatFeedback({ type, text });
    setTimeout(() => setChatFeedback(null), 4000);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
      setShowScrollBottom(false);
      setNewMessagesWhileScrolled(0);
    }
  };

  // 1a. Live Chat Room Settings Listener (temporary lock state + reset timestamp)
  useEffect(() => {
    if (!canAccessChat || !auth.currentUser) {
      setChatRoomSettings({ isClosed: false });
      return;
    }

    const roomRef = doc(db, 'settings', 'chat_room');
    const unsubRoom = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setChatRoomSettings({
            isClosed: Boolean(data.isClosed),
            closedReason: data.closedReason || null,
            closedBy: data.closedBy || null,
            closedAt: data.closedAt || null,
            resetAtMs: typeof data.resetAtMs === 'number' ? data.resetAtMs : null
          });
        } else {
          setChatRoomSettings({ isClosed: false });
        }
      },
      (err) => {
        console.warn('Chat room settings listener notice:', err?.message || err);
      }
    );

    return () => unsubRoom();
  }, [canAccessChat]);

  // 1b. Live Firestore Stream Listener (open / unlimited messages, chronological order)
  useEffect(() => {
    if (!canAccessChat || !auth.currentUser) {
      setMessages([]);
      setPinnedMessage(null);
      setLoading(false);
      isInitialSnapshotRef.current = true;
      return;
    }

    setLoading(true);
    isInitialSnapshotRef.current = true;

    const chatQuery = query(
      collection(db, 'public_chat'),
      orderBy('timestampMs', 'asc')
    );

    const unsubscribe = onSnapshot(
      chatQuery,
      (snapshot) => {
        // Play incoming message audio chime for new messages from other users
        if (!isInitialSnapshotRef.current) {
          const myUid = auth.currentUser?.uid;
          const hasNewForeignMsg = snapshot.docChanges().some((change) => {
            if (change.type !== 'added') return false;
            const d = change.doc.data();
            return d.uid && d.uid !== myUid;
          });
          if (hasNewForeignMsg) {
            try {
              soundManager.playSignalPing();
            } catch (audioErr) {
              console.warn('Chat audio chime notice:', audioErr);
            }
          }
        }
        isInitialSnapshotRef.current = false;

        const list: ChatMessageItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const roleNormalized = (d.role || 'VIP').toString().toUpperCase();
          const avatarUrl = d.photoURL || d.avatar || '';
          const tsMs = typeof d.timestampMs === 'number' ? d.timestampMs : Date.now();

          return {
            id: docSnap.id,
            uid: d.uid || d.userId || '',
            user: d.displayName || d.user || 'VIP Trader',
            avatar: avatarUrl,
            role: roleNormalized,
            text: d.text || '',
            imageUrl: d.imageUrl || undefined,
            imageCaption: d.imageCaption || undefined,
            symbolTag: d.symbolTag || undefined,
            replyTo: d.replyTo || undefined,
            isPinned: Boolean(d.isPinned),
            likes: Number(d.likes || 0),
            reactions: d.reactions || {},
            timestampMs: tsMs,
            time: d.createdAt?.toDate
              ? d.createdAt.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
              : new Date(tsMs).toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
          };
        });

        setMessages(list);
        const pinned = [...list].reverse().find((m) => m.isPinned) || null;
        setPinnedMessage(pinned);
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore public_chat listener notice:', err?.message || err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [canAccessChat]);

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

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom || messages.length <= 10) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        setShowScrollBottom(false);
        setNewMessagesWhileScrolled(0);
      } else {
        setNewMessagesWhileScrolled((prev) => prev + 1);
      }
    }
  }, [messages.length]);

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

    if ((!textToSend && !selectedImage) || isSending) return;

    // Anti-Spam Gate: Prevent & auto-discard if repeated more than 2 times (> 2x)
    if (!isCurrentAdmin && textToSend) {
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

      const detectedTag = textToSend.includes('US100')
        ? 'US100'
        : textToSend.includes('XAU') || textToSend.includes('الذهب')
        ? 'XAUUSD'
        : textToSend.includes('EUR')
        ? 'EURUSD'
        : textToSend.includes('BTC')
        ? 'BTCUSD'
        : undefined;

      const userRoleToSend = isCurrentAdmin ? 'ADMIN' : (userRole || 'VIP').toUpperCase();

      const payload = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUserName,
        photoURL: currentUser.photoURL || null,
        role: userRoleToSend,
        text: textToSend.slice(0, MAX_CHAT_CHARS),
        imageUrl: isCurrentAdmin ? selectedImage || null : null,
        imageCaption: isCurrentAdmin ? imageCaption.trim().slice(0, 200) || null : null,
        symbolTag: detectedTag || null,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              user: replyingTo.user,
              text: replyingTo.text ? replyingTo.text.slice(0, 60) : isAr ? '[صورة تحليل فني]' : '[Chart Image]',
              imageUrl: replyingTo.imageUrl || null
            }
          : null,
        isPinned: false,
        likes: 0,
        reactions: {},
        createdAt: serverTimestamp(),
        timestampMs: Date.now()
      };

      await addDoc(collection(db, 'public_chat'), payload);

      setInputText('');
      setSelectedImage(null);
      setImageCaption('');
      setReplyingTo(null);
      setIsTypePopupOpen(false);
      soundManager.playProfitChime();
    } catch (err: any) {
      console.error('Send Firestore chat message error:', err);
      showToastNotice(
        'error',
        isAr ? 'تعذر إرسال الرسالة. تأكد من صلاحيات VIP أو حالة الكتم.' : `Failed to send message: ${err?.message || err}`
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

      const updatedReactions = { ...(msg.reactions || {}) };
      updatedReactions[emoji] = (updatedReactions[emoji] || 0) + 1;
      const nextLikes = (msg.likes || 0) + 1;

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
      await deleteDoc(doc(db, 'public_chat', messageId));
      showToastNotice('success', isAr ? 'تم حذف الرسالة بنجاح' : 'Message deleted');
    } catch (err: any) {
      console.error('Delete message error:', err);
      showToastNotice('error', err?.message || 'Delete failed');
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
      setPinnedMessage(null);
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
        className="h-full w-full flex-1 min-h-0 flex flex-col items-center justify-center p-5 text-center bg-[#131722] border border-[#2a2e39] select-none"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="max-w-sm w-full bg-[#1e222d] border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              {isAr ? 'غرفة مجتمع أعضاء VIP الخاصة' : 'Private VIP Members Group Chat'}
            </h3>
            <p className="text-xs text-[#787b86] mt-1.5 leading-relaxed">
              {isAr
                ? 'تم حصر شات المجتمع المباشر للأعضاء النشطين والمحللين المعتمدين لضمان جودة النقاش والمتابعة اللحظية.'
                : 'Live trading room chat is exclusive to active VIP members and certified analysts.'}
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
                className="w-full py-2.5 px-4 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
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
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#131722] font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
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
      className="h-full w-full flex-1 min-h-0 flex flex-col overflow-hidden relative select-none bg-[#1e222d]"
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
        className={`border-b border-[#2a2e39] bg-[#131722]/95 flex items-center justify-between gap-1.5 shrink-0 ${
          isCompact ? 'px-2 py-2' : 'px-3 py-2.5 sm:py-3'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#089981]/15 border border-[#089981]/40 flex items-center justify-center text-[#089981] shadow-sm shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2
                className={`font-bold text-white flex items-center gap-1 truncate ${
                  isCompact ? 'text-xs' : 'text-xs sm:text-sm'
                }`}
              >
                <span>{isAr ? 'غرفة VIP المباشرة' : 'VIP Live Community'}</span>
              </h2>

              {!isCompact && (
                chatRoomSettings.isClosed ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1 shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    <span>{isAr ? 'مغلق مؤقتاً' : 'LOCKED'}</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/40 flex items-center gap-1 shrink-0">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#089981] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#089981]" />
                    </span>
                    <span>VIP LIVE</span>
                  </span>
                )
              )}
            </div>

            <p className="text-[10px] text-[#787b86] flex items-center gap-1.5 truncate mt-0.5">
              <span className="font-mono text-[#089981] font-bold">
                {isAr ? `${messages.length} رسالة (سجل مفتوح)` : `${messages.length} msgs (Open)`}
              </span>
              <span className="text-[#434651]">•</span>
              <span className={chatRoomSettings.isClosed ? 'text-rose-400 font-bold' : 'text-[#089981] font-bold'}>
                {chatRoomSettings.isClosed
                  ? isAr
                    ? 'مغلق مؤقتاً'
                    : 'Temp Closed'
                  : isAr
                  ? 'متصل (Live)'
                  : 'Connected'}
              </span>
            </p>
          </div>
        </div>

        {/* Right Tools: Admin Controls (Close/Open + Reset) + Quick Asset Filters */}
        <div className="flex items-center gap-1 shrink-0">
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
                    ? 'bg-[#089981]/20 hover:bg-[#089981]/30 text-[#089981] border-[#089981]/50'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
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
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#f23645]/15 hover:bg-[#f23645]/25 text-[#f23645] border border-[#f23645]/40 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                {!isCompact && <span className="hidden sm:inline">{isAr ? 'تصفير' : 'Reset'}</span>}
              </button>
            </>
          )}

          {!isCompact && (
            <div className="flex items-center gap-0.5 bg-[#1e222d] p-0.5 rounded-lg border border-[#2a2e39] text-[10px] font-mono">
              {['ALL', 'XAUUSD', 'US100'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => setActiveSymbolFilter(sym)}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    activeSymbolFilter === sym
                      ? 'bg-white text-[#131722] font-bold shadow-sm'
                      : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  {sym === 'ALL' ? (isAr ? 'الكل' : 'ALL') : sym}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inline Feedback Notice */}
      {chatFeedback && (
        <div
          className={`px-3 py-1.5 text-[11px] font-bold flex items-center justify-between border-b ${
            chatFeedback.type === 'error'
              ? 'bg-[#f23645]/15 border-[#f23645]/40 text-[#f23645]'
              : 'bg-[#089981]/15 border-[#089981]/40 text-[#089981]'
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
        <div className="bg-[#1e222d] border-b border-[#2a2e39] px-2.5 py-1.5 flex items-center justify-between text-xs text-amber-300/90 gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Pin className="w-2.5 h-2.5 rotate-45" />
            </div>
            <div className="min-w-0 flex items-baseline gap-1">
              <span className="text-[10px] font-bold text-amber-400 whitespace-nowrap">
                {isAr ? 'مثبت:' : 'Pinned:'}
              </span>
              <span className="text-[11px] text-[#d1d4dc] truncate">{pinnedMessage.text}</span>
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
        className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 space-y-2.5 bg-[#131722]/50 bg-repeat overscroll-contain relative scroll-smooth"
        style={{
          backgroundImage: 'radial-gradient(#2a2e39 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px'
        }}
      >
        {loading && messages.length === 0 ? (
          <div className="text-center py-16 text-[#787b86] text-xs font-mono animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#089981]" />
            <span>{isAr ? 'جاري الاتصال بغرفة VIP المباشرة...' : 'Connecting to VIP live chat...'}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#787b86] text-xs bg-[#1e222d]/60 rounded-xl border border-[#2a2e39] p-4 max-w-sm mx-auto">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#089981] opacity-60" />
            <p className="font-bold text-white mb-1">{isAr ? 'لا توجد رسائل مطابقة' : 'No messages found'}</p>
            <p className="text-[11px]">
              {isAr ? 'كن أول من يشارك تحليلاً أو سؤالاً في غرفة VIP!' : 'Be the first to post a setup in VIP chat!'}
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
                  className={`absolute -top-3 z-20 flex items-center gap-1 bg-[#1e222d] border border-[#2a2e39] px-1.5 py-0.5 rounded-full shadow-lg transition-opacity ${
                    hoveredMessageId === msg.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  } ${isMe ? 'start-2' : 'end-2'}`}
                >
                  <button
                    onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                    className="p-1 hover:bg-[#2a2e39] rounded-full text-[#787b86] hover:text-white transition-colors cursor-pointer"
                    title={isAr ? 'تفاعل بإيموجي' : 'React'}
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setReplyingTo(msg);
                    }}
                    className="p-1 hover:bg-[#2a2e39] rounded-full text-[#787b86] hover:text-white transition-colors cursor-pointer"
                    title={isAr ? 'رد على الرسالة' : 'Reply'}
                  >
                    <Reply className="w-3.5 h-3.5" />
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
                        className={`p-1 hover:bg-[#2a2e39] rounded-full transition-colors cursor-pointer ${
                          msg.isPinned ? 'text-amber-400' : 'text-[#787b86] hover:text-amber-400'
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
                              targetMod?.isMutedFromChat ? 'text-amber-400' : 'text-[#787b86] hover:text-amber-400'
                            }`}
                            title={isAr ? 'كتم / فك كتم المستخدم' : 'Mute / Unmute user'}
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleBanUser(msg.uid, msg.user)}
                            className={`p-1 hover:bg-[#f23645]/20 rounded-full transition-colors cursor-pointer ${
                              targetMod?.isBanned ? 'text-[#f23645]' : 'text-[#787b86] hover:text-[#f23645]'
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
                    className={`absolute -top-10 z-30 bg-[#131722] border border-[#2a2e39] rounded-full px-2 py-1 flex items-center gap-1.5 shadow-2xl animate-fade-in ${
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
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-2.5 sm:p-3 text-xs leading-relaxed transition-all shadow-md relative ${
                    isMe
                      ? 'bg-gradient-to-br from-[#1e2e28] to-[#16231f] border border-[#089981]/40 text-[#e1e4ea] rounded-ee-sm'
                      : isAdminOrAnalyst
                      ? 'bg-gradient-to-br from-[#1e222d] to-[#1a1e29] border border-amber-500/35 text-white rounded-es-sm shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
                      : 'bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] rounded-es-sm'
                  }`}
                >
                  {msg.replyTo && (
                    <div className="mb-2 p-1.5 rounded-lg bg-[#131722]/80 border-s-4 border-[#089981] text-[11px] text-[#787b86] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-[#089981] block truncate">{msg.replyTo.user}</span>
                        <span className="truncate block text-white/80">{msg.replyTo.text}</span>
                      </div>
                      {msg.replyTo.imageUrl && (
                        <img
                          src={msg.replyTo.imageUrl}
                          alt="Thumbnail"
                          className="w-8 h-8 rounded object-cover shrink-0 border border-[#2a2e39]"
                        />
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {msg.avatar ? (
                        <img
                          src={msg.avatar}
                          alt={msg.user}
                          className="w-5 h-5 rounded-full object-cover border border-[#363a45] shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#2a2e39] border border-[#363a45] text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                          {msg.user ? msg.user[0].toUpperCase() : 'M'}
                        </div>
                      )}
                      <span className="font-bold text-white text-[11px] sm:text-xs truncate">{msg.user}</span>

                      {(() => {
                        const r = (msg.role || 'VIP').toUpperCase();
                        if (r === 'ADMIN') {
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-0.5 shrink-0">
                              <Crown className="w-2.5 h-2.5 text-rose-400" />
                              <span>ADMIN</span>
                            </span>
                          );
                        }
                        if (r === 'VIP') {
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-0.5 shrink-0">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              <span>VIP</span>
                            </span>
                          );
                        }
                        if (r === 'MODERATOR' || r === 'SALES' || r === 'ANALYST' || r === 'ANALYSER') {
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 flex items-center gap-0.5 shrink-0">
                              <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                              <span>{r}</span>
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {msg.symbolTag && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
                          ${msg.symbolTag}
                        </span>
                      )}
                    </div>

                    <span className="text-[9px] text-[#787b86] font-mono shrink-0">{msg.time}</span>
                  </div>

                  {msg.imageUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-[#2a2e39] bg-black/40 group/img relative">
                      <img
                        src={msg.imageUrl}
                        alt="Chart Analysis"
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
                        className="absolute bottom-2 end-2 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 border border-white/20 opacity-90 hover:opacity-100 cursor-pointer shadow-lg"
                      >
                        <Maximize2 className="w-3 h-3 text-[#089981]" />
                        <span>{isAr ? 'تكبير الشارت' : 'Zoom Chart'}</span>
                      </button>

                      {msg.imageCaption && (
                        <div className="p-2 bg-[#131722]/90 border-t border-[#2a2e39] text-[11px] font-mono text-amber-300/90 font-semibold">
                          📊 {msg.imageCaption}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.text && (
                    <p className="text-xs text-[#e1e4ea] leading-relaxed break-words whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  )}

                  {/* Footer: Reactions + Admin quick moderation actions */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {msg.reactions &&
                        Object.entries(msg.reactions).map(([emoji, count]) =>
                          count > 0 ? (
                            <button
                              key={emoji}
                              onClick={() => handleReact(msg.id, emoji)}
                              className="px-1.5 py-0.5 rounded-full bg-[#131722]/80 border border-[#2a2e39] text-[10px] flex items-center gap-1 hover:border-[#089981] transition-colors cursor-pointer"
                            >
                              <span>{emoji}</span>
                              <span className="font-mono text-[#787b86] text-[9px] font-bold">{count}</span>
                            </button>
                          ) : null
                        )}

                      <button
                        onClick={() => handleReact(msg.id, '❤️')}
                        className="flex items-center gap-1 text-[10px] font-mono text-[#787b86] hover:text-[#f23645] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Heart className="w-3 h-3" />
                        {msg.likes > 0 && <span>{msg.likes}</span>}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#787b86]">
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
                          className="px-1.5 py-0.5 rounded-md bg-[#131722]/70 hover:bg-[#089981]/20 border border-[#2a2e39] hover:border-[#089981]/50 text-[#9db2c6] hover:text-[#089981] text-[9px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title={isAr ? `مراسلة ${msg.user} على الخاص` : `DM ${msg.user}`}
                        >
                          <Mail className="w-2.5 h-2.5" />
                          <span>{isAr ? 'خاص' : 'DM'}</span>
                        </button>
                      )}
                      {isCurrentAdmin && (
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
      </div>

      {/* FLOATING JUMP-TO-LATEST BUTTON */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-16 start-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-[#089981] hover:bg-[#07806c] text-white text-[11px] font-bold shadow-2xl flex items-center gap-1.5 border border-white/20 animate-bounce cursor-pointer select-none"
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
        <div className="p-2 border-t border-[#2a2e39] bg-[#131722] flex items-center justify-between gap-2 text-xs shrink-0">
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
            className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. ATTACHED IMAGE PREVIEW (Admin Only) */}
      {selectedImage && isCurrentAdmin && (
        <div className="p-2.5 border-t border-[#2a2e39] bg-[#1a1e28] flex items-center gap-3 shrink-0">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#089981] shrink-0">
            <img src={selectedImage} alt="Attachment Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-0.5 end-0.5 p-0.5 rounded-full bg-black/80 text-white hover:text-[#f23645] cursor-pointer"
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
              className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-xs text-white placeholder-[#787b86] mt-1 focus:outline-none focus:border-[#089981]"
            />
          </div>
        </div>
      )}

      {/* 5. COMPACT INPUT ROW */}
      {isMutedFromChat ? (
        <div className="p-3 border-t border-[#f23645]/40 bg-[#f23645]/10 text-[#f23645] text-xs font-bold text-center flex items-center justify-center gap-2 shrink-0">
          <span>🔇</span>
          <span>
            {isAr
              ? 'حسابك مكتوم عن المشاركة في الشات بواسطة الإدارة'
              : 'Your account is muted from chat by administration.'}
          </span>
        </div>
      ) : chatRoomSettings.isClosed && !isCurrentAdmin ? (
        <div className="p-3 border-t border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-bold text-center flex items-center justify-center gap-2 shrink-0">
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
            <div className="px-3 py-1.5 border-t border-amber-500/40 bg-amber-500/15 text-amber-300 text-[11px] font-bold flex items-center justify-between gap-2 shrink-0">
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
          <form
            onSubmit={handleSendMessage}
            className="p-2 sm:p-2.5 border-t border-[#2a2e39] bg-[#1a1e28] flex items-center gap-1.5 shrink-0 sticky bottom-0 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
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
                  : 'bg-[#131722] hover:bg-[#2a2e39] text-[#089981] border-[#2a2e39]'
              }`}
              title={isAr ? 'إرفاق صورة شارت من جهازك' : 'Attach chart image'}
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}

          <div className="flex-1 min-w-0 relative flex items-center">
            <input
              type="text"
              maxLength={MAX_CHAT_CHARS}
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHAT_CHARS))}
              placeholder={
                isAr
                  ? isCurrentAdmin
                    ? 'اكتب تحليلاً أو رسالة (حد أقصى 500 حرف)...'
                    : 'اكتب رسالة في غرفة VIP (حد أقصى 500 حرف)...'
                  : 'Type a message in VIP chat (max 500 chars)...'
              }
              className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl px-3 py-2 pe-16 text-xs text-white placeholder-[#787b86] transition-all focus:outline-none"
            />
            <span
              className={`absolute end-8 text-[9px] font-mono pointer-events-none ${
                inputText.length >= MAX_CHAT_CHARS - 30 ? 'text-amber-400' : 'text-[#787b86]'
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
            disabled={(!inputText.trim() && !selectedImage) || isSending}
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
          className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsTypePopupOpen(false)}
        >
          <div
            className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-lg shadow-[0_12px_40px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="px-3.5 py-2.5 border-b border-[#2a2e39] bg-[#171b26] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#089981]/20 border border-[#089981]/40 flex items-center justify-center text-[#089981]">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-white">
                  {isAr ? 'كتابة رسالة في غرفة VIP' : 'Compose VIP Chat Message'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsTypePopupOpen(false)}
                className="p-1 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-1.5 bg-[#131722] border-b border-[#2a2e39]/60 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
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
                    className="px-2 py-0.5 rounded-md bg-[#1e222d] hover:bg-[#089981]/20 hover:text-[#089981] hover:border-[#089981]/50 border border-[#2a2e39] text-[10px] font-mono text-[#9db2ce] transition-colors cursor-pointer shrink-0"
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-[#787b86] shrink-0 hidden sm:inline">
                {isAr ? 'Shift+Enter سطر جديد • Enter إرسال' : 'Shift+Enter newline • Enter send'}
              </span>
            </div>

            <div className="p-3 bg-[#1a1e28] flex flex-col gap-2.5">
              {replyingTo && (
                <div className="p-2 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center justify-between text-xs text-[#787b86]">
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
                    className="text-[#787b86] hover:text-white cursor-pointer"
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
                  className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-[#787b86] focus:outline-none focus:ring-1 focus:ring-[#089981]/40 resize-none h-32 leading-relaxed shadow-inner"
                />
                <div
                  className={`absolute bottom-2 end-2 text-[10px] font-mono bg-[#131722]/90 px-1.5 py-0.5 rounded border border-[#2a2e39]/60 pointer-events-none ${
                    inputText.length >= MAX_CHAT_CHARS - 30 ? 'text-amber-400' : 'text-[#787b86]'
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
                      className="p-1.5 rounded-lg hover:bg-[#2a2e39] text-sm cursor-pointer transition-colors"
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
                      className="p-1.5 px-2.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#089981] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إرفاق شارت' : 'Attach'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-3.5 py-2.5 border-t border-[#2a2e39] bg-[#171b26] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsTypePopupOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-[#2a2e39] text-[#787b86] hover:text-white hover:bg-[#2a2e39] text-xs font-semibold transition-all cursor-pointer"
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPendingBanTarget(null)}
        >
          <div
            className="bg-[#1e222d] border border-rose-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-2.5 text-rose-400">
              <Ban className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'تأكيد حظر المستخدم' : 'Confirm User Ban'}
              </h3>
            </div>
            <p className="text-xs text-[#d1d4dc] leading-relaxed">
              {isAr
                ? `هل تريد حظر المستخدم "${pendingBanTarget.name}" نهائياً من دخول المنصة والمحادثة؟`
                : `Ban "${pendingBanTarget.name}" from platform and chat access?`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingBanTarget(null)}
                className="px-3.5 py-2 rounded-xl border border-[#2a2e39] text-xs font-semibold text-[#787b86] hover:text-white cursor-pointer"
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !resettingChat && setPendingResetConfirm(false)}
        >
          <div
            className="bg-[#1e222d] border border-[#f23645]/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-2.5 text-[#f23645]">
              <RotateCcw className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'تأكيد تصفير رسائل الشات' : 'Confirm Chat Reset'}
              </h3>
            </div>
            <p className="text-xs text-[#d1d4dc] leading-relaxed">
              {isAr
                ? `هل أنت متأكد من حذف جميع الرسائل (${messages.length} رسالة) وتصفير سجل الدردشة بالكامل؟ لا يمكن التراجع عن هذه الخطوة.`
                : `Are you sure you want to permanently clear all ${messages.length} chat messages? This action cannot be undone.`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={resettingChat}
                onClick={() => setPendingResetConfirm(false)}
                className="px-3.5 py-2 rounded-xl border border-[#2a2e39] text-xs font-semibold text-[#787b86] hover:text-white cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in">
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
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
                className="p-2 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-[#089981]" />
                <span className="hidden sm:inline">{isAr ? 'فتح بالحجم الكامل' : 'Full Size'}</span>
              </a>

              <button
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-lg bg-[#1e222d] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden">
            <img
              src={lightboxImage.url}
              alt="Fullscreen Chart"
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>

          {lightboxImage.caption && (
            <div className="pt-3 border-t border-white/10 text-center text-xs text-amber-300 font-mono">
              📊 {lightboxImage.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
