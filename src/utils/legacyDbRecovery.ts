import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import { auth, db, legacyDb } from '../lib/firebase';

const SUPER_ADMIN_EMAIL = 'moe.albzour@gmail.com';
const LEGACY_DB_NAME = 'ai-studio-mbktrading-5c717851-cdb4-4a97-a0f4-f006f13d6c7b';

export interface RecoveryStats {
  usersRecovered: number;
  signalsRecovered: number;
  botAlertsRecovered: number;
  publicChatRecovered: number;
  chatProfilesRecovered: number;
  dmConversationsRecovered: number;
  dmMessagesRecovered: number;
  activationKeysRecovered: number;
  legacyDbStatus: 'synced' | 'quota_locked' | 'idle';
}

const DELETED_DOC_IDS_KEY = 'mbk_deleted_doc_ids_v1';

export function markDocumentDeleted(id: string): void {
  if (!id) return;
  try {
    const cleanId = id.replace(/^bot-/, '');
    const raw = localStorage.getItem(DELETED_DOC_IDS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set(Array.isArray(list) ? list : []);
    set.add(id);
    set.add(cleanId);
    localStorage.setItem(DELETED_DOC_IDS_KEY, JSON.stringify(Array.from(set).slice(-500)));
  } catch {
    // ignore
  }
}

export function isDocumentDeleted(id: string): boolean {
  if (!id) return false;
  try {
    const cleanId = id.replace(/^bot-/, '');
    const raw = localStorage.getItem(DELETED_DOC_IDS_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return Array.isArray(list) && (list.includes(id) || list.includes(cleanId));
  } catch {
    return false;
  }
}

/**
 * Extracts cached Firestore documents from the browser's IndexedDB storage
 * for the legacy `ai-studio-mbktrading-5c717851-cdb4-4a97-a0f4-f006f13d6c7b` database,
 * even when the remote server is returning HTTP 429 Quota Exceeded!
 */
async function extractDocsFromLegacyIndexedDb(): Promise<{
  users: Record<string, any>[];
  signals: Record<string, any>[];
  bot_alerts: Record<string, any>[];
  public_chat: Record<string, any>[];
  chat_profiles: Record<string, any>[];
  dm_conversations: Record<string, any>[];
  dm_messages: { convoId: string; id: string; data: Record<string, any> }[];
  activation_keys: Record<string, any>[];
}> {
  const result = {
    users: [] as Record<string, any>[],
    signals: [] as Record<string, any>[],
    bot_alerts: [] as Record<string, any>[],
    public_chat: [] as Record<string, any>[],
    chat_profiles: [] as Record<string, any>[],
    dm_conversations: [] as Record<string, any>[],
    dm_messages: [] as { convoId: string; id: string; data: Record<string, any> }[],
    activation_keys: [] as Record<string, any>[]
  };

  if (typeof window === 'undefined' || !window.indexedDB) {
    return result;
  }

  try {
    // 1. Try reading from legacyDb via getDocsFromCache first if Firestore persistent cache was enabled on it
    const { getDocsFromCache } = await import('firebase/firestore');
    const tryCacheCol = async (colName: string) => {
      try {
        const snap = await getDocsFromCache(collection(legacyDb, colName));
        const items: Record<string, any>[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
        return items;
      } catch {
        return [];
      }
    };

    const [cUsers, cSignals, cBots, cChat, cProfiles, cKeys] = await Promise.all([
      tryCacheCol('users'),
      tryCacheCol('signals'),
      tryCacheCol('bot_alerts'),
      tryCacheCol('public_chat'),
      tryCacheCol('chat_profiles'),
      tryCacheCol('activation_keys')
    ]);

    result.users.push(...cUsers);
    result.signals.push(...cSignals);
    result.bot_alerts.push(...cBots);
    result.public_chat.push(...cChat);
    result.chat_profiles.push(...cProfiles);
    result.activation_keys.push(...cKeys);

    if (auth.currentUser?.uid) {
      try {
        const dmSnap = await getDocsFromCache(
          query(collection(legacyDb, 'dm_conversations'), where('participants', 'array-contains', auth.currentUser.uid))
        );
        for (const d of dmSnap.docs) {
          result.dm_conversations.push({ id: d.id, ...d.data() });
          try {
            const msgSnap = await getDocsFromCache(collection(legacyDb, 'dm_conversations', d.id, 'messages'));
            msgSnap.forEach((m) => {
              result.dm_messages.push({ convoId: d.id, id: m.id, data: m.data() });
            });
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore getDocsFromCache errors
  }

  // 2. Also scan raw IndexedDB databases matching firestore for any stored remoteDocuments
  try {
    if (typeof window.indexedDB.databases === 'function') {
      const dbs = await window.indexedDB.databases();
      for (const dbInfo of dbs) {
        const dbName = dbInfo.name || '';
        if (!dbName.includes('firestore')) continue;

        await new Promise<void>((resolve) => {
          const req = window.indexedDB.open(dbName);
          req.onerror = () => resolve();
          req.onsuccess = () => {
            const idb = req.result;
            if (!idb.objectStoreNames.contains('remoteDocuments')) {
              idb.close();
              resolve();
              return;
            }
            try {
              const tx = idb.transaction(['remoteDocuments'], 'readonly');
              const store = tx.objectStore('remoteDocuments');
              const getAllReq = store.getAll();
              getAllReq.onsuccess = () => {
                const rows = getAllReq.result || [];
                for (const row of rows) {
                  try {
                    const docObj = row?.document;
                    const namePath: string = docObj?.name || '';
                    const fields = docObj?.fields;
                    if (!namePath || !fields) continue;
                    const parsed = parseFirestoreRestFields(fields);
                    const parts = namePath.split('/documents/')[1]?.split('/') || [];
                    if (parts.length === 2) {
                      const [col, docId] = parts;
                      if (col in result) {
                        (result as any)[col].push({ id: docId, ...parsed });
                      }
                    } else if (parts.length === 4 && parts[0] === 'dm_conversations' && parts[2] === 'messages') {
                      result.dm_messages.push({
                        convoId: parts[1],
                        id: parts[3],
                        data: parsed
                      });
                    }
                  } catch {
                    // ignore row parse error
                  }
                }
                idb.close();
                resolve();
              };
              getAllReq.onerror = () => {
                idb.close();
                resolve();
              };
            } catch {
              idb.close();
              resolve();
            }
          };
        });
      }
    }
  } catch {
    // ignore raw IDB scan errors
  }

  return result;
}

function parseFirestoreRestFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = parseFirestoreRestValue(v);
  }
  return out;
}

function parseFirestoreRestValue(v: any): any {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return String(v.stringValue);
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) {
    const vals = v.arrayValue?.values || [];
    return vals.map(parseFirestoreRestValue);
  }
  if ('mapValue' in v) {
    return parseFirestoreRestFields(v.mapValue?.fields || {});
  }
  return v;
}

/**
 * Full Live & Local Cache Sync from `legacyDb` (ai-studio-mbktrading-5c717851-cdb4-4a97-a0f4-f006f13d6c7b)
 * into the active `(default)` Firestore database.
 */
let localIdbExtractedThisSession = false;
let activeSyncPromise: Promise<RecoveryStats> | null = null;

export async function syncAllLegacyDataToDefaultDb(forceFullRun = false): Promise<RecoveryStats> {
  // Never run bulk multi-collection reads automatically in the background; only run when explicitly requested by Admin
  if (!forceFullRun) {
    return {
      usersRecovered: 0,
      signalsRecovered: 0,
      botAlertsRecovered: 0,
      publicChatRecovered: 0,
      chatProfilesRecovered: 0,
      dmConversationsRecovered: 0,
      dmMessagesRecovered: 0,
      activationKeysRecovered: 0,
      legacyDbStatus: 'idle'
    };
  }
  if (activeSyncPromise) {
    return activeSyncPromise;
  }
  activeSyncPromise = runSyncAllLegacyDataInternal(forceFullRun).finally(() => {
    activeSyncPromise = null;
  });
  return activeSyncPromise;
}

async function runSyncAllLegacyDataInternal(forceFullRun = false): Promise<RecoveryStats> {
  const stats: RecoveryStats = {
    usersRecovered: 0,
    signalsRecovered: 0,
    botAlertsRecovered: 0,
    publicChatRecovered: 0,
    chatProfilesRecovered: 0,
    dmConversationsRecovered: 0,
    dmMessagesRecovered: 0,
    activationKeysRecovered: 0,
    legacyDbStatus: 'idle'
  };

  const currentUser = auth.currentUser;
  if (!currentUser) return stats;

  const isSuperAdmin =
    currentUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL && currentUser.emailVerified;

  // Step 1: Recover everything available in local IndexedDB cache from legacyDb once per session
  const localCache =
    !localIdbExtractedThisSession || forceFullRun
      ? await extractDocsFromLegacyIndexedDb()
      : {
          users: [],
          signals: [],
          bot_alerts: [],
          public_chat: [],
          chat_profiles: [],
          dm_conversations: [],
          dm_messages: [],
          activation_keys: []
        };
  localIdbExtractedThisSession = true;

  const rolePriority = (r?: string): number => {
    const up = (r || 'FREE').toString().toUpperCase();
    if (up === 'ADMIN') return 6;
    if (up === 'MODERATOR' || up === 'ANALYSER' || up === 'ANALYST' || up === 'SALES') return 5;
    if (up === 'ELITE') return 4;
    if (up === 'VIP') return 3;
    return 1;
  };

  const writeUserDoc = async (u: Record<string, any>) => {
    const uid = u.id || u.uid;
    if (!uid) return;
    if (!isSuperAdmin && uid !== currentUser.uid) return;

    const existingRef = doc(db, 'users', uid);
    const existingSnap = await getDoc(existingRef);
    if (existingSnap.exists()) {
      const exData = existingSnap.data();
      // NEVER overwrite or downgrade an existing user document in (default) that already has an equal or higher role!
      if (rolePriority(exData.role) >= rolePriority(u.role)) {
        // Only fill in missing non-role contact fields if blank in (default)
        const patch: Record<string, any> = {};
        if (!exData.phone && u.phone) patch.phone = u.phone;
        if (!exData.country && u.country) patch.country = u.country;
        if (!exData.dob && u.dob) patch.dob = u.dob;
        if (Object.keys(patch).length > 0) {
          await setDoc(existingRef, patch, { merge: true });
        }
        return;
      }
    }

    const { id: _id, ...data } = u;
    await setDoc(existingRef, { uid, ...data }, { merge: true });
    stats.usersRecovered++;
    if (!u.isBanned) {
      await setDoc(
        doc(db, 'chat_profiles', uid),
        {
          uid,
          displayName: String(u.displayName || u.username || u.email?.split('@')[0] || 'MBK Trader').slice(0, 100),
          avatar: String(u.avatar || '').slice(0, 1000),
          role: String(u.role || 'FREE').toUpperCase().slice(0, 40),
          allowDirectMessages: u.allowDirectMessages !== false,
          blockedUids: Array.isArray(u.blockedUids) ? u.blockedUids.slice(0, 200) : [],
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }
  };

  for (const u of localCache.users) {
    await writeUserDoc(u).catch(() => {});
  }

  if (isSuperAdmin) {
    for (const s of localCache.signals) {
      const sigId = s.id;
      if (!sigId || isDocumentDeleted(sigId)) continue;
      const { id: _id, ...data } = s;
      await setDoc(doc(db, 'signals', sigId), data, { merge: true })
        .then(() => {
          stats.signalsRecovered++;
        })
        .catch(() => {});
    }

    for (const k of localCache.activation_keys) {
      const code = k.code || k.id;
      if (!code) continue;
      const { id: _id, ...data } = k;
      await setDoc(doc(db, 'activation_keys', code), { code, ...data }, { merge: true })
        .then(() => {
          stats.activationKeysRecovered++;
        })
        .catch(() => {});
    }
  }

  for (const b of localCache.bot_alerts) {
    const alertId = b.id;
    if (!alertId || !String(alertId).startsWith('alert-') || isDocumentDeleted(alertId)) continue;
    await setDoc(doc(db, 'bot_alerts', alertId), {
      id: alertId,
      text: String(b.text || 'MBK Bot Alert').slice(0, 2000),
      chat_id: b.chat_id || null,
      timestamp: String(b.timestamp || new Date().toISOString()),
      timestampMs: Math.trunc(Number(b.timestampMs || Date.now()))
    })
      .then(() => {
        stats.botAlertsRecovered++;
      })
      .catch(() => {});
  }

  for (const p of localCache.chat_profiles) {
    const uid = p.uid || p.id;
    if (!uid) continue;
    if (!isSuperAdmin && uid !== currentUser.uid) continue;
    await setDoc(
      doc(db, 'chat_profiles', uid),
      {
        uid,
        displayName: String(p.displayName || 'MBK Trader').slice(0, 100),
        avatar: String(p.avatar || '').slice(0, 1000),
        role: String(p.role || 'FREE').toUpperCase().slice(0, 40),
        allowDirectMessages: p.allowDirectMessages !== false,
        blockedUids: Array.isArray(p.blockedUids) ? p.blockedUids.slice(0, 200) : [],
        updatedAt: p.updatedAt || new Date().toISOString()
      },
      { merge: true }
    )
      .then(() => {
        stats.chatProfilesRecovered++;
      })
      .catch(() => {});
  }

  for (const c of localCache.dm_conversations) {
    const convoId = c.id;
    if (!convoId) continue;
    const { id: _id, ...data } = c;
    await setDoc(doc(db, 'dm_conversations', convoId), { id: convoId, ...data }, { merge: true })
      .then(() => {
        stats.dmConversationsRecovered++;
      })
      .catch(() => {});
  }

  for (const dmMsg of localCache.dm_messages) {
    await setDoc(
      doc(db, 'dm_conversations', dmMsg.convoId, 'messages', dmMsg.id),
      dmMsg.data,
      { merge: true }
    )
      .then(() => {
        stats.dmMessagesRecovered++;
      })
      .catch(() => {});
  }

  // Step 2: Merge any new messages, DMs, trades, and users from the secondary database (legacyDb) into primary db
  try {
    const isAdminUser = isSuperAdmin || currentUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
    if (isAdminUser) {
      const legacyUsersSnap = await getDocs(query(collection(legacyDb, 'users'), limit(500)));
      stats.legacyDbStatus = 'synced';
      for (const uDoc of legacyUsersSnap.docs) {
        await writeUserDoc({ id: uDoc.id, ...uDoc.data() }).catch(() => {});
      }

      const legacySignalsSnap = await getDocs(
        query(collection(legacyDb, 'signals'), orderBy('timestampMs', 'desc'), limit(50))
      );
      for (const sDoc of legacySignalsSnap.docs) {
        if (isDocumentDeleted(sDoc.id)) continue;
        await setDoc(doc(db, 'signals', sDoc.id), sDoc.data(), { merge: true })
          .then(() => {
            stats.signalsRecovered++;
          })
          .catch(() => {});
      }
    }

    const legacyBotsSnap = await getDocs(
      query(collection(legacyDb, 'bot_alerts'), orderBy('timestampMs', 'desc'), limit(50))
    );
    stats.legacyDbStatus = 'synced';
    for (const bDoc of legacyBotsSnap.docs) {
      if (isDocumentDeleted(bDoc.id)) continue;
      const d = bDoc.data();
      if (bDoc.id.startsWith('alert-')) {
        await setDoc(doc(db, 'bot_alerts', bDoc.id), {
          id: bDoc.id,
          text: String(d.text || 'MBK Bot Alert').slice(0, 2000),
          chat_id: d.chat_id || null,
          timestamp: String(d.timestamp || new Date().toISOString()),
          timestampMs: Math.trunc(Number(d.timestampMs || Date.now()))
        })
          .then(() => {
            stats.botAlertsRecovered++;
          })
          .catch(() => {});
      }
    }

    const legacyProfilesSnap = await getDocs(query(collection(legacyDb, 'chat_profiles'), limit(200)));
    for (const pDoc of legacyProfilesSnap.docs) {
      const d = pDoc.data();
      if (isAdminUser || pDoc.id === currentUser.uid) {
        const existingProfileRef = doc(db, 'chat_profiles', pDoc.id);
        const existingProfileSnap = await getDoc(existingProfileRef).catch(() => null);
        if (existingProfileSnap && existingProfileSnap.exists()) {
          const exRole = existingProfileSnap.data()?.role;
          if (rolePriority(exRole) >= rolePriority(d.role)) {
            continue;
          }
        }
        await setDoc(
          existingProfileRef,
          {
            uid: d.uid || pDoc.id,
            displayName: String(d.displayName || 'MBK Trader').slice(0, 100),
            avatar: String(d.avatar || '').slice(0, 1000),
            role: String(d.role || 'FREE').toUpperCase().slice(0, 40),
            allowDirectMessages: d.allowDirectMessages !== false,
            blockedUids: Array.isArray(d.blockedUids) ? d.blockedUids.slice(0, 200) : [],
            updatedAt: d.updatedAt || new Date().toISOString()
          },
          { merge: true }
        )
          .then(() => {
            stats.chatProfilesRecovered++;
          })
          .catch(() => {});
      }
    }

    const legacyDmSnap = isAdminUser
      ? await getDocs(query(collection(legacyDb, 'dm_conversations'), limit(200)))
      : await getDocs(
          query(collection(legacyDb, 'dm_conversations'), where('participants', 'array-contains', currentUser.uid))
        );
    for (const dmDoc of legacyDmSnap.docs) {
      const d = dmDoc.data();
      const targetConvoRef = doc(db, 'dm_conversations', dmDoc.id);
      const existingConvoSnap = await getDoc(targetConvoRef).catch(() => null);
      if (existingConvoSnap && existingConvoSnap.exists()) {
        const exConvo = existingConvoSnap.data();
        if (Number(d.lastMessageAtMs || 0) > Number(exConvo.lastMessageAtMs || 0)) {
          await setDoc(targetConvoRef, { id: dmDoc.id, ...d }, { merge: true }).catch(() => {});
          stats.dmConversationsRecovered++;
        }
      } else {
        await setDoc(targetConvoRef, { id: dmDoc.id, ...d }, { merge: true })
          .then(() => {
            stats.dmConversationsRecovered++;
          })
          .catch(() => {});
      }

      const msgSnap = await getDocs(
        query(collection(legacyDb, 'dm_conversations', dmDoc.id, 'messages'), orderBy('timestampMs', 'asc'), limit(100))
      );
      for (const mDoc of msgSnap.docs) {
        if (isDocumentDeleted(mDoc.id)) continue;
        await setDoc(
          doc(db, 'dm_conversations', dmDoc.id, 'messages', mDoc.id),
          mDoc.data(),
          { merge: true }
        )
          .then(() => {
            stats.dmMessagesRecovered++;
          })
          .catch(() => {});
      }
    }
  } catch (err: any) {
    const msg = String(err?.message || err || '').toLowerCase();
    if (err?.code === 'resource-exhausted' || msg.includes('quota')) {
      stats.legacyDbStatus = 'quota_locked';
    }
  }

  return stats;
}

export interface MbkFullBackupSnapshot {
  version: string;
  createdAt: string;
  users: Record<string, any>[];
  signals: Record<string, any>[];
  bot_alerts: Record<string, any>[];
  public_chat: Record<string, any>[];
  chat_profiles: Record<string, any>[];
  dm_conversations: Record<string, any>[];
  dm_messages: { convoId: string; id: string; data: Record<string, any> }[];
  activation_keys: Record<string, any>[];
}

const HOURLY_BACKUP_STORAGE_KEY = 'mbk_hourly_auto_backup_v1';
const HOURLY_BACKUP_TIME_KEY = 'mbk_hourly_auto_backup_time';

export function getLastAutoBackupTime(): string | null {
  try {
    return localStorage.getItem(HOURLY_BACKUP_TIME_KEY);
  } catch {
    return null;
  }
}

export async function createFullBackupSnapshot(
  mirrorToSecondaryDb = true,
  useCacheOnly = false
): Promise<MbkFullBackupSnapshot> {
  const snapshot: MbkFullBackupSnapshot = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    users: [],
    signals: [],
    bot_alerts: [],
    public_chat: [],
    chat_profiles: [],
    dm_conversations: [],
    dm_messages: [],
    activation_keys: []
  };

  const { getDocsFromCache } = await import('firebase/firestore');

  const fetchCol = async (colName: string, maxDocs = 300): Promise<Record<string, any>[]> => {
    try {
      const q = query(collection(db, colName), limit(maxDocs));
      const snap = useCacheOnly
        ? await getDocsFromCache(q).catch(() => getDocs(q))
        : await getDocs(q);
      const list: Record<string, any>[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      return list;
    } catch {
      return [];
    }
  };

  const [users, signals, botAlerts, publicChat, chatProfiles, activationKeys] = await Promise.all([
    fetchCol('users', 500),
    fetchCol('signals', 200),
    fetchCol('bot_alerts', 150),
    fetchCol('public_chat', 200),
    fetchCol('chat_profiles', 500),
    fetchCol('activation_keys', 300)
  ]);

  snapshot.users = users;
  snapshot.signals = signals;
  snapshot.bot_alerts = botAlerts;
  snapshot.public_chat = publicChat;
  snapshot.chat_profiles = chatProfiles;
  snapshot.activation_keys = activationKeys;

  try {
    const dmSnap = await getDocs(query(collection(db, 'dm_conversations'), limit(150)));
    for (const d of dmSnap.docs) {
      snapshot.dm_conversations.push({ id: d.id, ...d.data() });
      try {
        const msgSnap = await getDocs(
          query(collection(db, 'dm_conversations', d.id, 'messages'), orderBy('timestampMs', 'asc'), limit(100))
        );
        msgSnap.forEach((m) => {
          snapshot.dm_messages.push({ convoId: d.id, id: m.id, data: m.data() });
        });
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(HOURLY_BACKUP_STORAGE_KEY, JSON.stringify(snapshot));
    localStorage.setItem(HOURLY_BACKUP_TIME_KEY, snapshot.createdAt);
  } catch {
    // ignore storage quota errors
  }

  // Also mirror critical records to the secondary database (legacyDb) as a hot-standby backup when available
  if (mirrorToSecondaryDb) {
    try {
      for (const u of snapshot.users.slice(0, 100)) {
        const uid = u.id || u.uid;
        if (uid) {
          const { id: _id, ...rest } = u;
          await setDoc(doc(legacyDb, 'users', uid), { uid, ...rest }, { merge: true }).catch(() => {});
        }
      }
      for (const s of snapshot.signals.slice(0, 50)) {
        if (s.id) {
          await setDoc(doc(legacyDb, 'signals', s.id), s, { merge: true }).catch(() => {});
        }
      }
    } catch {
      // ignore if standby db is currently quota locked
    }
  }

  return snapshot;
}

export async function restoreFromBackupSnapshot(snapshot: Partial<MbkFullBackupSnapshot>): Promise<number> {
  let totalRestored = 0;

  if (Array.isArray(snapshot.users)) {
    for (const u of snapshot.users) {
      const uid = u.id || u.uid;
      if (!uid) continue;
      const { id: _id, ...rest } = u;
      await setDoc(doc(db, 'users', uid), { uid, ...rest }, { merge: true })
        .then(() => {
          totalRestored++;
        })
        .catch(() => {});
    }
  }

  if (Array.isArray(snapshot.chat_profiles)) {
    for (const p of snapshot.chat_profiles) {
      const uid = p.id || p.uid;
      if (!uid) continue;
      const { id: _id, ...rest } = p;
      await setDoc(doc(db, 'chat_profiles', uid), { uid, ...rest }, { merge: true })
        .then(() => {
          totalRestored++;
        })
        .catch(() => {});
    }
  }

  if (Array.isArray(snapshot.signals)) {
    for (const s of snapshot.signals) {
      if (!s.id) continue;
      await setDoc(doc(db, 'signals', s.id), s, { merge: true })
        .then(() => {
          totalRestored++;
        })
        .catch(() => {});
    }
  }

  if (Array.isArray(snapshot.bot_alerts)) {
    for (const b of snapshot.bot_alerts) {
      if (!b.id) continue;
      await setDoc(doc(db, 'bot_alerts', b.id), b, { merge: true })
        .then(() => {
          totalRestored++;
        })
        .catch(() => {});
    }
  }

  if (Array.isArray(snapshot.public_chat)) {
    for (const c of snapshot.public_chat) {
      if (!c.id) continue;
      const { id: _id, ...rest } = c;
      await setDoc(doc(db, 'public_chat', c.id), rest, { merge: true })
        .then(() => {
          totalRestored++;
        })
        .catch(() => {});
    }
  }

  if (Array.isArray(snapshot.dm_conversations)) {
    for (const dm of snapshot.dm_conversations) {
      if (!dm.id) continue;
      await setDoc(doc(db, 'dm_conversations', dm.id), dm, { merge: true })
        .then(() => {
          totalRestored++;
        })
        .catch(() => {});
    }
  }

  if (Array.isArray(snapshot.dm_messages)) {
    for (const m of snapshot.dm_messages) {
      if (!m.convoId || !m.id || !m.data) continue;
      await setDoc(doc(db, 'dm_conversations', m.convoId, 'messages', m.id), m.data, { merge: true })
        .then(() => {
          totalRestored++;
        })
        .catch(() => {});
    }
  }

  if (Array.isArray(snapshot.activation_keys)) {
    for (const k of snapshot.activation_keys) {
      const code = k.code || k.id;
      if (!code) continue;
      const { id: _id, ...rest } = k;
      await setDoc(doc(db, 'activation_keys', code), { code, ...rest }, { merge: true })
        .then(() => {
          totalRestored++;
        })
        .catch(() => {});
    }
  }

  return totalRestored;
}

