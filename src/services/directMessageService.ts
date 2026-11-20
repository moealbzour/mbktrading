import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { auth, db, legacyDb } from '../lib/firebase';
import { ChatProfile, DmConversation, DmMessage, UserProfile } from '../types/trading';

const CACHED_CHAT_PROFILES_KEY = 'mbk_cached_chat_profiles_v1';
const CACHED_DM_CONVOS_KEY_PREFIX = 'mbk_cached_dm_convos_v1_';
const CACHED_DM_MSGS_KEY_PREFIX = 'mbk_cached_dm_msgs_v1_';
const SUPER_ADMIN_EMAIL = 'moe.albzour@gmail.com';

function readCachedArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function writeCachedArray<T>(key: string, items: T[]): void {
  try {
    if (items.length > 0) {
      localStorage.setItem(key, JSON.stringify(items));
    }
  } catch {
    // ignore
  }
}

export function getDmConversationId(uidA: string, uidB: string): string {
  return [uidA.trim(), uidB.trim()].sort().join('_');
}

export function getOtherParticipantUid(participants: string[], myUid: string): string {
  return participants.find((id) => id !== myUid) || myUid;
}

/**
 * Ensures the signed-in user has a lightweight, zero-PII directory entry in `chat_profiles/{uid}`
 * preserving their DM privacy setting (`allowDirectMessages`) and `blockedUids`.
 */
export async function syncOwnChatProfile(user: UserProfile): Promise<void> {
  const uid = user.uid || user.id;
  if (!uid) return;

  const ref = doc(db, 'chat_profiles', uid);
  const displayName = (user.name || user.email?.split('@')[0] || 'MBK Trader').trim().slice(0, 100);
  const avatar = (user.avatar || '').slice(0, 1000);
  const role = (user.role || 'FREE').toString().toUpperCase().slice(0, 40);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        displayName,
        avatar,
        role,
        allowDirectMessages: user.allowDirectMessages ?? true,
        blockedUids: [],
        updatedAt: new Date().toISOString()
      });
    } else {
      const existing = snap.data();
      if (
        existing.displayName !== displayName ||
        (existing.avatar || '') !== avatar ||
        (existing.role || '') !== role
      ) {
        await updateDoc(ref, {
          displayName,
          avatar,
          role,
          updatedAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('[DirectMessages] syncOwnChatProfile notice:', err);
  }
}

export async function updateDmPrivacySettings(
  uid: string,
  updates: { allowDirectMessages?: boolean; blockedUids?: string[] }
): Promise<void> {
  if (!uid) return;
  const ref = doc(db, 'chat_profiles', uid);
  const payload: Record<string, any> = {
    updatedAt: new Date().toISOString()
  };
  if (typeof updates.allowDirectMessages === 'boolean') {
    payload.allowDirectMessages = updates.allowDirectMessages;
  }
  if (Array.isArray(updates.blockedUids)) {
    payload.blockedUids = Array.from(new Set(updates.blockedUids)).slice(0, 200);
  }

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      displayName: 'MBK Trader',
      avatar: '',
      role: 'FREE',
      allowDirectMessages: updates.allowDirectMessages ?? true,
      blockedUids: updates.blockedUids ?? [],
      updatedAt: new Date().toISOString()
    });
  } else {
    await updateDoc(ref, payload);
  }
}

export function subscribeToOwnChatProfile(
  uid: string,
  onChange: (profile: ChatProfile | null) => void
): () => void {
  if (!uid) {
    onChange(null);
    return () => {};
  }
  const ref = doc(db, 'chat_profiles', uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const d = snap.data();
      onChange({
        uid: d.uid || snap.id,
        displayName: d.displayName || 'Trader',
        avatar: d.avatar || '',
        role: (d.role || 'FREE').toString().toUpperCase(),
        allowDirectMessages: d.allowDirectMessages !== false,
        blockedUids: Array.isArray(d.blockedUids) ? d.blockedUids : [],
        updatedAt: d.updatedAt
      });
    },
    (err) => {
      console.warn('[DirectMessages] subscribeToOwnChatProfile notice:', err?.message || err);
    }
  );
}

export function subscribeToChatDirectory(
  onChange: (profiles: ChatProfile[]) => void
): () => void {
  const initialCached = readCachedArray<ChatProfile>(CACHED_CHAT_PROFILES_KEY);
  if (initialCached.length > 0) {
    onChange(initialCached);
  }

  let secondaryProfiles: ChatProfile[] = [];
  let secondaryChecked = false;

  const mapDocToProfile = (docId: string, d: Record<string, any>): ChatProfile => ({
    uid: d.uid || docId,
    displayName: d.displayName || 'Trader',
    avatar: d.avatar || '',
    role: (d.role || 'FREE').toString().toUpperCase(),
    allowDirectMessages: d.allowDirectMessages !== false,
    blockedUids: Array.isArray(d.blockedUids) ? d.blockedUids : [],
    updatedAt: d.updatedAt
  });

  const deduplicateAndSortProfiles = (list: ChatProfile[]): ChatProfile[] => {
    const roleRank = (role?: string): number => {
      const r = (role || '').toUpperCase();
      if (r === 'ADMIN') return 5;
      if (r === 'MODERATOR' || r === 'ANALYSER' || r === 'ANALYST' || r === 'SALES') return 4;
      if (r === 'ELITE') return 3;
      if (r === 'VIP') return 2;
      return 1;
    };

    const dedupByName = new Map<string, ChatProfile>();
    for (const p of list) {
      if (!p || !p.uid) continue;
      const normName = (p.displayName || '').trim().toLowerCase();
      const key = normName || p.uid;
      const existing = dedupByName.get(key);
      if (!existing) {
        dedupByName.set(key, p);
      } else {
        const pScore = roleRank(p.role) * 10 + (p.avatar ? 2 : 0) + (p.uid === auth.currentUser?.uid ? 20 : 0);
        const exScore = roleRank(existing.role) * 10 + (existing.avatar ? 2 : 0) + (existing.uid === auth.currentUser?.uid ? 20 : 0);
        if (pScore > exScore) {
          dedupByName.set(key, p);
        }
      }
    }

    const uniqueList = Array.from(dedupByName.values());
    uniqueList.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return uniqueList;
  };

  let latestPrimaryProfiles: ChatProfile[] = [];

  const q = query(collection(db, 'chat_profiles'), orderBy('displayName', 'asc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      latestPrimaryProfiles = snap.docs.map((docSnap) => mapDocToProfile(docSnap.id, docSnap.data()));

      if (!secondaryChecked) {
        secondaryChecked = true;
        getDocs(query(collection(legacyDb, 'chat_profiles'), limit(100)))
          .then((secSnap) => {
            secondaryProfiles = secSnap.docs.map((d) => mapDocToProfile(d.id, d.data()));
            const merged = deduplicateAndSortProfiles([...latestPrimaryProfiles, ...secondaryProfiles]);
            writeCachedArray(CACHED_CHAT_PROFILES_KEY, merged);
            onChange(merged);
          })
          .catch(() => {});
      }

      const uniqueList = deduplicateAndSortProfiles([...latestPrimaryProfiles, ...secondaryProfiles]);
      writeCachedArray(CACHED_CHAT_PROFILES_KEY, uniqueList);
      onChange(uniqueList);
    },
    (err) => {
      console.warn('[DirectMessages] subscribeToChatDirectory notice:', err?.message || err);
      onChange(readCachedArray<ChatProfile>(CACHED_CHAT_PROFILES_KEY));
    }
  );
}

export function subscribeToDmConversations(
  uid: string,
  onChange: (conversations: DmConversation[]) => void
): () => void {
  if (!uid) {
    onChange([]);
    return () => {};
  }
  const cacheKey = `${CACHED_DM_CONVOS_KEY_PREFIX}${uid}`;
  const initialCached = readCachedArray<DmConversation>(cacheKey);
  if (initialCached.length > 0) {
    onChange(initialCached);
  }

  const mapDocToConvo = (docId: string, d: Record<string, any>): DmConversation => ({
    id: docId,
    participants: Array.isArray(d.participants) ? d.participants : [],
    participantNames: d.participantNames || {},
    participantAvatars: d.participantAvatars || {},
    participantRoles: d.participantRoles || {},
    lastMessage: d.lastMessage || '',
    lastSenderUid: d.lastSenderUid || '',
    lastMessageAtMs: Number(d.lastMessageAtMs || 0),
    unreadBy: d.unreadBy || {},
    updatedAt: d.updatedAt
  });

  const secondaryConvosMap = new Map<string, DmConversation>();
  let latestPrimaryConvos: DmConversation[] = [];
  let secondaryChecked = false;

  const mergeConvos = (primaryList: DmConversation[]): DmConversation[] => {
    const byId = new Map<string, DmConversation>();
    primaryList.forEach((c) => byId.set(c.id, c));
    secondaryConvosMap.forEach((secConvo, id) => {
      const existing = byId.get(id);
      if (!existing || secConvo.lastMessageAtMs > existing.lastMessageAtMs) {
        byId.set(id, secConvo);
      }
    });
    const combined = Array.from(byId.values());
    combined.sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);
    return combined;
  };

  const q = query(collection(db, 'dm_conversations'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      latestPrimaryConvos = snap.docs.map((docSnap) => mapDocToConvo(docSnap.id, docSnap.data()));

      if (!secondaryChecked) {
        secondaryChecked = true;
        getDocs(query(collection(legacyDb, 'dm_conversations'), where('participants', 'array-contains', uid)))
          .then((secSnap) => {
            const primaryById = new Map(latestPrimaryConvos.map((c) => [c.id, c]));
            secSnap.docs.forEach((sDoc) => {
              const convo = mapDocToConvo(sDoc.id, sDoc.data());
              secondaryConvosMap.set(sDoc.id, convo);
              const ex = primaryById.get(sDoc.id);
              if (!ex || convo.lastMessageAtMs > ex.lastMessageAtMs) {
                setDoc(doc(db, 'dm_conversations', sDoc.id), { id: sDoc.id, ...sDoc.data() }, { merge: true }).catch(() => {});
              }
            });
            const merged = mergeConvos(latestPrimaryConvos);
            writeCachedArray(cacheKey, merged);
            onChange(merged);
          })
          .catch(() => {});
      }

      const list = mergeConvos(latestPrimaryConvos);
      writeCachedArray(cacheKey, list);
      onChange(list);
    },
    (err) => {
      console.warn('[DirectMessages] subscribeToDmConversations notice:', err?.message || err);
      onChange(readCachedArray<DmConversation>(cacheKey));
    }
  );
}

export function subscribeToDmMessages(
  convoId: string,
  onChange: (messages: DmMessage[]) => void
): () => void {
  if (!convoId) {
    onChange([]);
    return () => {};
  }
  const cacheKey = `${CACHED_DM_MSGS_KEY_PREFIX}${convoId}`;
  const initialCached = readCachedArray<DmMessage>(cacheKey);
  if (initialCached.length > 0) {
    onChange(initialCached);
  }

  const mapDocToMsg = (docId: string, d: Record<string, any>): DmMessage => ({
    id: docId,
    senderUid: d.senderUid || '',
    recipientUid: d.recipientUid || '',
    senderName: d.senderName || 'Trader',
    text: d.text || '',
    timestampMs: Number(d.timestampMs || 0),
    createdAt: d.createdAt
  });

  const secondaryMsgsMap = new Map<string, DmMessage>();
  let latestPrimaryMsgs: DmMessage[] = [];
  let secondaryChecked = false;

  const mergeMsgs = (primaryList: DmMessage[]): DmMessage[] => {
    const byId = new Map<string, DmMessage>();
    primaryList.forEach((m) => byId.set(m.id, m));
    secondaryMsgsMap.forEach((m, id) => {
      if (!byId.has(id)) byId.set(id, m);
    });
    const combined = Array.from(byId.values());
    combined.sort((a, b) => a.timestampMs - b.timestampMs);
    return combined;
  };

  const q = query(
    collection(db, 'dm_conversations', convoId, 'messages'),
    orderBy('timestampMs', 'asc'),
    limitToLast(60)
  );
  return onSnapshot(
    q,
    (snap) => {
      latestPrimaryMsgs = snap.docs.map((docSnap) => mapDocToMsg(docSnap.id, docSnap.data()));

      if (!secondaryChecked) {
        secondaryChecked = true;
        getDocs(
          query(
            collection(legacyDb, 'dm_conversations', convoId, 'messages'),
            orderBy('timestampMs', 'asc'),
            limitToLast(60)
          )
        )
          .then((secSnap) => {
            const primaryIds = new Set(latestPrimaryMsgs.map((m) => m.id));
            secSnap.docs.forEach((mDoc) => {
              const msg = mapDocToMsg(mDoc.id, mDoc.data());
              secondaryMsgsMap.set(mDoc.id, msg);
              if (!primaryIds.has(mDoc.id)) {
                setDoc(doc(db, 'dm_conversations', convoId, 'messages', mDoc.id), mDoc.data(), { merge: true }).catch(() => {});
              }
            });
            const merged = mergeMsgs(latestPrimaryMsgs);
            writeCachedArray(cacheKey, merged);
            onChange(merged);
          })
          .catch(() => {});
      }

      const list = mergeMsgs(latestPrimaryMsgs);
      writeCachedArray(cacheKey, list);
      onChange(list);
    },
    (err) => {
      console.warn('[DirectMessages] subscribeToDmMessages notice:', err?.message || err);
      onChange(readCachedArray<DmMessage>(cacheKey));
    }
  );
}

export async function markDmConversationRead(convoId: string, uid: string): Promise<void> {
  if (!convoId || !uid) return;
  try {
    const convoRef = doc(db, 'dm_conversations', convoId);
    const snap = await getDoc(convoRef);
    if (!snap.exists()) return;
    const existingUnread = snap.data().unreadBy || {};
    if (existingUnread[uid] === 0) return;
    await updateDoc(convoRef, {
      [`unreadBy.${uid}`]: 0,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[DirectMessages] markDmConversationRead notice:', err);
  }
}

export async function sendDirectMessage(params: {
  sender: { uid: string; displayName: string; avatar?: string; role: string };
  recipient: { uid: string; displayName: string; avatar?: string; role: string };
  text: string;
}): Promise<string> {
  const { sender, recipient, text } = params;
  const cleanText = text.trim().slice(0, 1000);
  if (!cleanText) {
    throw new Error('لا يمكن إرسال رسالة فارغة.');
  }
  if (!sender.uid || !recipient.uid || sender.uid === recipient.uid) {
    throw new Error('معرف المستلم غير صالح.');
  }

  // Verify recipient DM preference and block list before writing
  const recipientProfileSnap = await getDoc(doc(db, 'chat_profiles', recipient.uid));
  if (recipientProfileSnap.exists()) {
    const rData = recipientProfileSnap.data();
    if (rData.allowDirectMessages === false) {
      throw new Error('قام هذا المستخدم بإيقاف استقبال الرسائل الخاصة.');
    }
    if (Array.isArray(rData.blockedUids) && rData.blockedUids.includes(sender.uid)) {
      throw new Error('لا يمكنك إرسال رسائل خاصة إلى هذا المستخدم.');
    }
  }

  const convoId = getDmConversationId(sender.uid, recipient.uid);
  const participants = [sender.uid, recipient.uid].sort();
  const convoRef = doc(db, 'dm_conversations', convoId);
  const existingSnap = await getDoc(convoRef);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const existingUnread = existingSnap.exists() ? existingSnap.data().unreadBy || {} : {};
  const nextRecipientUnread = Number(existingUnread[recipient.uid] || 0) + 1;

  const convoPayload: Record<string, any> = {
    id: convoId,
    participants,
    participantNames: {
      [sender.uid]: sender.displayName.slice(0, 100),
      [recipient.uid]: recipient.displayName.slice(0, 100)
    },
    participantAvatars: {
      [sender.uid]: (sender.avatar || '').slice(0, 1000),
      [recipient.uid]: (recipient.avatar || '').slice(0, 1000)
    },
    participantRoles: {
      [sender.uid]: (sender.role || 'FREE').toUpperCase().slice(0, 40),
      [recipient.uid]: (recipient.role || 'FREE').toUpperCase().slice(0, 40)
    },
    lastMessage: cleanText.slice(0, 500),
    lastSenderUid: sender.uid,
    lastMessageAtMs: nowMs,
    unreadBy: {
      [sender.uid]: 0,
      [recipient.uid]: nextRecipientUnread
    },
    updatedAt: nowIso
  };

  if (!existingSnap.exists()) {
    await setDoc(convoRef, convoPayload);
  } else {
    await updateDoc(convoRef, convoPayload);
  }

  await addDoc(collection(db, 'dm_conversations', convoId, 'messages'), {
    senderUid: sender.uid,
    recipientUid: recipient.uid,
    senderName: sender.displayName.slice(0, 100),
    text: cleanText,
    timestampMs: nowMs,
    createdAt: nowIso
  });

  return convoId;
}
