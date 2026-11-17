import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatProfile, DmConversation, DmMessage, UserProfile } from '../types/trading';

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
  const q = query(collection(db, 'chat_profiles'), orderBy('displayName', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: ChatProfile[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          uid: d.uid || docSnap.id,
          displayName: d.displayName || 'Trader',
          avatar: d.avatar || '',
          role: (d.role || 'FREE').toString().toUpperCase(),
          allowDirectMessages: d.allowDirectMessages !== false,
          blockedUids: Array.isArray(d.blockedUids) ? d.blockedUids : [],
          updatedAt: d.updatedAt
        };
      });
      onChange(list);
    },
    (err) => {
      console.warn('[DirectMessages] subscribeToChatDirectory notice:', err?.message || err);
      onChange([]);
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
  const q = query(collection(db, 'dm_conversations'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: DmConversation[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          participants: Array.isArray(d.participants) ? d.participants : [],
          participantNames: d.participantNames || {},
          participantAvatars: d.participantAvatars || {},
          participantRoles: d.participantRoles || {},
          lastMessage: d.lastMessage || '',
          lastSenderUid: d.lastSenderUid || '',
          lastMessageAtMs: Number(d.lastMessageAtMs || 0),
          unreadBy: d.unreadBy || {},
          updatedAt: d.updatedAt
        };
      });
      list.sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);
      onChange(list);
    },
    (err) => {
      console.warn('[DirectMessages] subscribeToDmConversations notice:', err?.message || err);
      onChange([]);
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
  const q = query(
    collection(db, 'dm_conversations', convoId, 'messages'),
    orderBy('timestampMs', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: DmMessage[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          senderUid: d.senderUid || '',
          recipientUid: d.recipientUid || '',
          senderName: d.senderName || 'Trader',
          text: d.text || '',
          timestampMs: Number(d.timestampMs || 0),
          createdAt: d.createdAt
        };
      });
      onChange(list);
    },
    (err) => {
      console.warn('[DirectMessages] subscribeToDmMessages notice:', err?.message || err);
      onChange([]);
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
