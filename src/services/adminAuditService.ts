import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type AdminAuditActionType =
  | 'USER_PLAN_UPDATED'
  | 'USER_EXPIRY_UPDATED'
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'USER_MUTED'
  | 'USER_UNMUTED'
  | 'USER_NOTE_ADDED'
  | 'USER_NOTE_DELETED'
  | 'STAFF_PERMISSIONS_UPDATED'
  | 'FEATURE_GRANT_UPDATED'
  | 'MANUAL_PAYMENT_LOGGED'
  | 'POPUP_PUBLISHED'
  | 'POPUP_UPDATED'
  | 'POPUP_STATUS_CHANGED'
  | 'POPUP_DELETED'
  | 'BULK_DM_SENT'
  | 'TEMPLATE_SAVED'
  | 'TEMPLATE_DELETED'
  | 'SUPPORT_INBOX_REPLY'
  | 'UPDATE_PLAN_PRICING'
  | 'SYSTEM_ACTION';

export interface AdminAuditLogEntry {
  id: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  action: AdminAuditActionType | string;
  targetUid: string;
  targetLabel: string;
  details: string;
  timestampMs: number;
  createdAt?: string;
}

export async function recordAdminAuditLog(params: {
  action: AdminAuditActionType | string;
  targetUid?: string;
  targetLabel?: string;
  details: string;
  actorNameOverride?: string;
}): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const nowMs = Date.now();
    const actorName =
      params.actorNameOverride ||
      currentUser.displayName ||
      currentUser.email?.split('@')[0] ||
      'Admin Staff';

    await addDoc(collection(db, 'admin_audit_logs'), {
      actorUid: currentUser.uid,
      actorName: actorName.slice(0, 120),
      actorEmail: (currentUser.email || '').slice(0, 180),
      action: String(params.action).slice(0, 80),
      targetUid: String(params.targetUid || '').slice(0, 128),
      targetLabel: String(params.targetLabel || '').slice(0, 180),
      details: String(params.details || '').slice(0, 800),
      timestampMs: nowMs,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[AdminAuditLog] Failed to record audit entry:', err);
  }
}

export async function fetchAdminAuditLogs(maxEntries = 100): Promise<AdminAuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'admin_audit_logs'),
      orderBy('timestampMs', 'desc'),
      limit(maxEntries)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, any>;
      let createdIso = '';
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        createdIso = data.createdAt.toDate().toISOString();
      } else if (typeof data.timestampMs === 'number') {
        createdIso = new Date(data.timestampMs).toISOString();
      }
      return {
        id: d.id,
        actorUid: String(data.actorUid || ''),
        actorName: String(data.actorName || 'Staff'),
        actorEmail: String(data.actorEmail || ''),
        action: String(data.action || 'SYSTEM_ACTION'),
        targetUid: String(data.targetUid || ''),
        targetLabel: String(data.targetLabel || ''),
        details: String(data.details || ''),
        timestampMs: Number(data.timestampMs || Date.now()),
        createdAt: createdIso
      };
    });
  } catch (err) {
    console.warn('[AdminAuditLog] Failed to fetch audit logs:', err);
    return [];
  }
}
