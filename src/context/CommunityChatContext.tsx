import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  limitToLast,
  onSnapshot,
  orderBy,
  query
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { soundManager } from '../utils/audio';
import { isDocumentDeleted } from '../utils/legacyDbRecovery';
import { subscribeToAuth } from '../services/firebaseAuthService';
import type { ChatMessageItem } from '../components/community/PublicTradingChat';

export interface ChatRoomSettingsState {
  isClosed: boolean;
  closedReason?: string | null;
  closedBy?: string | null;
  closedAt?: string | null;
  resetAtMs?: number | null;
}

export interface CommunityChatContextValue {
  messages: ChatMessageItem[];
  pinnedMessage: ChatMessageItem | null;
  chatRoomSettings: ChatRoomSettingsState;
  loading: boolean;
  acquireChatStream: () => void;
  releaseChatStream: () => void;
  removeMessageLocally: (messageId: string) => void;
  clearPinnedMessageLocally: () => void;
}

const DEFAULT_ROOM_SETTINGS: ChatRoomSettingsState = { isClosed: false };

const CommunityChatContext = createContext<CommunityChatContextValue>({
  messages: [],
  pinnedMessage: null,
  chatRoomSettings: DEFAULT_ROOM_SETTINGS,
  loading: true,
  acquireChatStream: () => {},
  releaseChatStream: () => {},
  removeMessageLocally: () => {},
  clearPinnedMessageLocally: () => {}
});

function readCachedMessages(): ChatMessageItem[] {
  try {
    localStorage.removeItem('mbk_cached_public_chat_v1');
    const cachedRaw = localStorage.getItem('mbk_cached_public_chat_v2');
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((m: ChatMessageItem) => m && m.id && !isDocumentDeleted(m.id));
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function mapDocToChatItem(docId: string, d: Record<string, any>): ChatMessageItem {
  const roleNormalized = (d.role || 'VIP').toString().toUpperCase();
  const avatarUrl = d.photoURL || d.avatar || '';
  const tsMs = typeof d.timestampMs === 'number' ? d.timestampMs : Date.now();

  return {
    id: docId,
    uid: d.uid || d.userId || '',
    user: d.displayName || d.user || 'VIP Trader',
    avatar: avatarUrl,
    role: roleNormalized,
    text: d.text || '',
    imageUrl: d.imageUrl || undefined,
    imageCaption: d.imageCaption || undefined,
    audioUrl: d.audioUrl || undefined,
    audioDurationSec: typeof d.audioDurationSec === 'number' ? d.audioDurationSec : undefined,
    tradeCard: d.tradeCard && typeof d.tradeCard === 'object' ? d.tradeCard : undefined,
    symbolTag: d.symbolTag || d.tradeCard?.symbol || undefined,
    replyTo: d.replyTo || undefined,
    isPinned: Boolean(d.isPinned),
    likes: Number(d.likes || 0),
    reactions: d.reactions || {},
    timestampMs: tsMs,
    editedAt: d.editedAt || undefined,
    time: d.createdAt?.toDate
      ? d.createdAt.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      : new Date(tsMs).toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit'
        })
  };
}

export const CommunityChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => readCachedMessages());
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessageItem | null>(() => {
    const cached = readCachedMessages();
    return [...cached].reverse().find((m) => m.isPinned) || null;
  });
  const [chatRoomSettings, setChatRoomSettings] = useState<ChatRoomSettingsState>(DEFAULT_ROOM_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const subscriberCountRef = useRef<number>(0);
  const [activeAuthUid, setActiveAuthUid] = useState<string>('');
  const [canAccessChat, setCanAccessChat] = useState<boolean>(false);
  const isInitialSnapshotRef = useRef<boolean>(true);

  useEffect(() => {
    const unsub = subscribeToAuth((profile) => {
      if (!profile) {
        setActiveAuthUid('');
        setCanAccessChat(false);
        return;
      }
      setActiveAuthUid(profile.uid || profile.id || auth.currentUser?.uid || '');
      setCanAccessChat(!profile.isBanned);
    });
    return () => unsub();
  }, []);

  const acquireChatStream = useCallback(() => {
    subscriberCountRef.current += 1;
    setSubscriberCount(subscriberCountRef.current);
  }, []);

  const releaseChatStream = useCallback(() => {
    subscriberCountRef.current = Math.max(0, subscriberCountRef.current - 1);
    setSubscriberCount(subscriberCountRef.current);
  }, []);

  const removeMessageLocally = useCallback((messageId: string) => {
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== messageId);
      try {
        localStorage.setItem('mbk_cached_public_chat_v2', JSON.stringify(next));
      } catch {
        // ignore
      }
      const nextPinned = [...next].reverse().find((m) => m.isPinned) || null;
      setPinnedMessage(nextPinned);
      return next;
    });
  }, []);

  const clearPinnedMessageLocally = useCallback(() => {
    setPinnedMessage(null);
  }, []);

  // Ref-counted shared Firestore listeners: ONLY active when at least 1 chat view is mounted
  useEffect(() => {
    if (subscriberCount <= 0) {
      return;
    }

    if (!canAccessChat || !activeAuthUid) {
      setMessages([]);
      setPinnedMessage(null);
      setChatRoomSettings(DEFAULT_ROOM_SETTINGS);
      setLoading(false);
      isInitialSnapshotRef.current = true;
      return;
    }

    setLoading(true);
    isInitialSnapshotRef.current = true;

    const cached = readCachedMessages();
    if (cached.length > 0) {
      setMessages(cached);
      const pinned = [...cached].reverse().find((m) => m.isPinned) || null;
      setPinnedMessage(pinned);
    }

    // 1. Single shared listener for doc(db, 'settings', 'chat_room')
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
          setChatRoomSettings(DEFAULT_ROOM_SETTINGS);
        }
      },
      (err) => {
        console.warn('[CommunityChatContext] Chat room settings listener notice:', err?.message || err);
      }
    );

    // 2. Single shared listener for public_chat (orderBy('timestampMs', 'asc'), limitToLast(60))
    const chatQuery = query(
      collection(db, 'public_chat'),
      orderBy('timestampMs', 'asc'),
      limitToLast(60)
    );

    const unsubChat = onSnapshot(
      chatQuery,
      (snapshot) => {
        if (!isInitialSnapshotRef.current) {
          const myUid = auth.currentUser?.uid || activeAuthUid;
          const hasNewForeignMsg = snapshot.docChanges().some((change) => {
            if (change.type !== 'added') return false;
            const d = change.doc.data();
            return d.uid && d.uid !== myUid;
          });
          if (hasNewForeignMsg) {
            try {
              soundManager.playSignalPing();
            } catch (audioErr) {
              console.warn('[CommunityChatContext] Chat audio chime notice:', audioErr);
            }
          }
        }
        isInitialSnapshotRef.current = false;

        const list: ChatMessageItem[] = snapshot.docs
          .filter((docSnap) => !isDocumentDeleted(docSnap.id))
          .map((docSnap) => mapDocToChatItem(docSnap.id, docSnap.data()))
          .sort((a, b) => (a.timestampMs || 0) - (b.timestampMs || 0));

        setMessages(list);
        try {
          localStorage.setItem('mbk_cached_public_chat_v2', JSON.stringify(list));
        } catch {
          // ignore
        }
        const pinned = [...list].reverse().find((m) => m.isPinned) || null;
        setPinnedMessage(pinned);
        setLoading(false);
      },
      (err) => {
        console.warn('[CommunityChatContext] Firestore public_chat listener notice:', err?.message || err);
        setLoading(false);
      }
    );

    return () => {
      unsubRoom();
      unsubChat();
    };
  }, [subscriberCount > 0, canAccessChat, activeAuthUid]);

  return (
    <CommunityChatContext.Provider
      value={{
        messages,
        pinnedMessage,
        chatRoomSettings,
        loading,
        acquireChatStream,
        releaseChatStream,
        removeMessageLocally,
        clearPinnedMessageLocally
      }}
    >
      {children}
    </CommunityChatContext.Provider>
  );
};

export const useCommunityChat = () => useContext(CommunityChatContext);
