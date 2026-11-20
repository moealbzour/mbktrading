import { collection, doc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
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

  // 2. Also scan raw IndexedDB databases matching firestore / ai-studio-mbktrading for any stored remoteDocuments
  try {
    if (typeof window.indexedDB.databases === 'function') {
      const dbs = await window.indexedDB.databases();
      for (const dbInfo of dbs) {
        const dbName = dbInfo.name || '';
        if (!dbName.includes('firestore') || !dbName.includes(LEGACY_DB_NAME)) continue;

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
export async function syncAllLegacyDataToDefaultDb(): Promise<RecoveryStats> {
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

  // Step 1: Recover everything available in local IndexedDB cache from legacyDb right now
  const localCache = await extractDocsFromLegacyIndexedDb();

  const writeUserDoc = async (u: Record<string, any>) => {
    const uid = u.id || u.uid;
    if (!uid) return;
    if (!isSuperAdmin && uid !== currentUser.uid) return;
    const { id: _id, ...data } = u;
    await setDoc(doc(db, 'users', uid), { uid, ...data }, { merge: true });
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
      if (!sigId) continue;
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
    if (!alertId || !String(alertId).startsWith('alert-')) continue;
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

  for (const m of localCache.public_chat) {
    const msgId = m.id;
    if (!msgId) continue;
    if (!isSuperAdmin && m.uid !== currentUser.uid) continue;
    const { id: _id, ...data } = m;
    await setDoc(doc(db, 'public_chat', msgId), data, { merge: true })
      .then(() => {
        stats.publicChatRecovered++;
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

  // Step 2: Query live `legacyDb` over the network (succeeds immediately as soon as daily read quota resets or if upgraded)
  try {
    if (isSuperAdmin) {
      const legacyUsersSnap = await getDocs(query(collection(legacyDb, 'users'), limit(500)));
      stats.legacyDbStatus = 'synced';
      for (const uDoc of legacyUsersSnap.docs) {
        await writeUserDoc({ id: uDoc.id, ...uDoc.data() }).catch(() => {});
      }

      const legacySignalsSnap = await getDocs(
        query(collection(legacyDb, 'signals'), orderBy('timestampMs', 'desc'), limit(100))
      );
      for (const sDoc of legacySignalsSnap.docs) {
        await setDoc(doc(db, 'signals', sDoc.id), sDoc.data(), { merge: true })
          .then(() => {
            stats.signalsRecovered++;
          })
          .catch(() => {});
      }

      const legacyKeysSnap = await getDocs(query(collection(legacyDb, 'activation_keys'), limit(300)));
      for (const kDoc of legacyKeysSnap.docs) {
        await setDoc(doc(db, 'activation_keys', kDoc.id), kDoc.data(), { merge: true })
          .then(() => {
            stats.activationKeysRecovered++;
          })
          .catch(() => {});
      }
    }

    const legacyBotsSnap = await getDocs(
      query(collection(legacyDb, 'bot_alerts'), orderBy('timestampMs', 'desc'), limit(50))
    );
    stats.legacyDbStatus = 'synced';
    for (const bDoc of legacyBotsSnap.docs) {
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

    const legacyChatSnap = await getDocs(
      query(collection(legacyDb, 'public_chat'), orderBy('timestampMs', 'desc'), limit(100))
    );
    for (const cDoc of legacyChatSnap.docs) {
      const d = cDoc.data();
      if (isSuperAdmin || d.uid === currentUser.uid) {
        await setDoc(doc(db, 'public_chat', cDoc.id), d, { merge: true })
          .then(() => {
            stats.publicChatRecovered++;
          })
          .catch(() => {});
      }
    }

    const legacyProfilesSnap = await getDocs(query(collection(legacyDb, 'chat_profiles'), limit(200)));
    for (const pDoc of legacyProfilesSnap.docs) {
      const d = pDoc.data();
      if (isSuperAdmin || pDoc.id === currentUser.uid) {
        await setDoc(
          doc(db, 'chat_profiles', pDoc.id),
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

    const legacyDmSnap = await getDocs(
      query(collection(legacyDb, 'dm_conversations'), where('participants', 'array-contains', currentUser.uid))
    );
    for (const dmDoc of legacyDmSnap.docs) {
      const d = dmDoc.data();
      await setDoc(doc(db, 'dm_conversations', dmDoc.id), { id: dmDoc.id, ...d }, { merge: true })
        .then(() => {
          stats.dmConversationsRecovered++;
        })
        .catch(() => {});

      const msgSnap = await getDocs(
        query(collection(legacyDb, 'dm_conversations', dmDoc.id, 'messages'), orderBy('timestampMs', 'asc'), limit(100))
      );
      for (const mDoc of msgSnap.docs) {
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
