import {
  doc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { FeatureKey } from './entitlements';

export type KeyGrantTier = 'vip' | 'elite' | 'custom';

export interface ActivationKeyRecord {
  code: string;
  durationInDays: number;
  durationLabel: string;
  status: 'active' | 'used' | 'revoked';
  keyType?: 'vip' | 'elite' | 'trial';
  grantTier?: KeyGrantTier;
  grantFeatures?: FeatureKey[];
  createdAt?: string;
  createdBy?: string;
  usedByUserId?: string;
  usedByUserEmail?: string;
  usedAt?: string;
}

export interface KeyRedemptionResult {
  success: boolean;
  code: string;
  durationInDays: number;
  durationLabel: string;
  expiryDate: string;
  grantTier: KeyGrantTier;
  grantFeatures: FeatureKey[];
}

export function formatKeyDurationLabel(days: number): string {
  if (days >= 36500) return 'Lifetime';
  if (days === 365) return '365 Days';
  if (days === 90) return '90 Days';
  if (days === 30) return '30 Days';
  if (days === 14) return '14 Days';
  if (days === 7) return '7 Days';
  if (days === 3) return '3 Days';
  if (days === 1) return '24 Hours';
  return `${days} Days`;
}

export async function redeemActivationKey(
  inputCode: string,
  userId?: string,
  userEmail?: string
): Promise<KeyRedemptionResult> {
  const cleanCode = inputCode.trim().toUpperCase();
  if (!cleanCode || !/^[A-Z0-9_-]{4,64}$/.test(cleanCode)) {
    throw new Error('يرجى إدخال مفتاح تفعيل صالح');
  }

  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid || !auth.currentUser) {
    throw new Error('يجب تسجيل الدخول بحسابك أولاً قبل تفعيل مفتاح التفعيل');
  }

  const resolvedEmail = userEmail || auth.currentUser.email || '';
  const keyRef = doc(db, 'activation_keys', cleanCode);
  const userRef = doc(db, 'users', currentUid);

  const result = await runTransaction(db, async (tx) => {
    const keySnap = await tx.get(keyRef);
    const userSnap = await tx.get(userRef);

    if (!keySnap.exists()) {
      throw new Error('مفتاح التفعيل غير صحيح أو غير موجود في قاعدة البيانات');
    }

    const keyData = keySnap.data();
    if (keyData.status === 'used') {
      throw new Error('مفتاح التفعيل هذا تم استخدامه سابقاً ولا يمكن إعادة استخدامه');
    }
    if (keyData.status !== 'active') {
      throw new Error('مفتاح التفعيل هذا غير صالح أو تم إلغاؤه');
    }

    if (userSnap.exists() && userSnap.data()?.isBanned) {
      throw new Error('لا يمكن تفعيل العضوية على حساب محظور');
    }

    const durationInDays = Number(keyData.durationInDays || 30);
    const durationLabel = keyData.durationLabel || formatKeyDurationLabel(durationInDays);
    const grantTier: KeyGrantTier =
      keyData.grantTier === 'elite' || keyData.grantTier === 'custom'
        ? keyData.grantTier
        : 'vip';
    const grantFeatures: FeatureKey[] = Array.isArray(keyData.grantFeatures)
      ? keyData.grantFeatures.filter((f: any) =>
          ['botSignals', 'vipSignals', 'vipChat', 'standardAi'].includes(f)
        )
      : [];

    const existingUser = userSnap.exists() ? userSnap.data() : {};
    const existingEndStr =
      grantTier === 'elite'
        ? existingUser?.eliteExpiryDate || existingUser?.subscription_end_date
        : existingUser?.subscription_end_date ||
          existingUser?.subscriptionEndDate ||
          existingUser?.vipExpiryDate;

    const existingEndMs = existingEndStr ? new Date(existingEndStr).getTime() : 0;
    const baseTimeMs =
      grantTier !== 'custom' && !Number.isNaN(existingEndMs) && existingEndMs > Date.now()
        ? existingEndMs
        : Date.now();

    const expiryTimestamp = baseTimeMs + durationInDays * 24 * 60 * 60 * 1000;
    const expiryDate = new Date(expiryTimestamp).toISOString();
    const usedAtIso = new Date().toISOString();

    tx.update(keyRef, {
      status: 'used',
      usedByUserId: currentUid,
      usedByUserEmail: resolvedEmail,
      usedAt: usedAtIso
    });

    if (grantTier === 'custom' && grantFeatures.length > 0) {
      const prevGranted: Record<string, string> =
        existingUser?.grantedFeatures && typeof existingUser.grantedFeatures === 'object'
          ? { ...existingUser.grantedFeatures }
          : {};

      const updatedGranted: Record<string, string> = { ...prevGranted };
      for (const feat of grantFeatures) {
        const curFeatEnd = prevGranted[feat] ? new Date(prevGranted[feat]).getTime() : 0;
        const featBase = !Number.isNaN(curFeatEnd) && curFeatEnd > Date.now() ? curFeatEnd : Date.now();
        updatedGranted[feat] = new Date(
          featBase + durationInDays * 24 * 60 * 60 * 1000
        ).toISOString();
      }

      if (userSnap.exists()) {
        tx.update(userRef, {
          grantedFeatures: updatedGranted,
          activationKey: cleanCode,
          updatedAt: serverTimestamp()
        });
      } else {
        tx.set(userRef, {
          email: resolvedEmail,
          role: 'free',
          tier: 'free',
          isVip: false,
          vipAccess: false,
          isElite: false,
          grantedFeatures: updatedGranted,
          activationKey: cleanCode,
          isBanned: false,
          isMutedFromChat: false,
          emailVerified: Boolean(auth.currentUser?.emailVerified),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } else if (grantTier === 'elite') {
      const elitePayload = {
        role: 'vip',
        tier: 'elite',
        isVip: true,
        vipAccess: true,
        isElite: true,
        vipExpiryDate: expiryDate,
        eliteExpiryDate: expiryDate,
        subscription_status: 'active',
        subscription_end_date: expiryDate,
        activationKey: cleanCode,
        updatedAt: serverTimestamp()
      };

      if (userSnap.exists()) {
        tx.update(userRef, elitePayload);
      } else {
        tx.set(userRef, {
          email: resolvedEmail,
          ...elitePayload,
          grantedFeatures: {},
          isBanned: false,
          isMutedFromChat: false,
          emailVerified: Boolean(auth.currentUser?.emailVerified),
          createdAt: serverTimestamp()
        });
      }
    } else {
      const currentTier = existingUser?.tier === 'elite' ? 'elite' : 'vip';
      const vipPayload: Record<string, any> = {
        role: 'vip',
        tier: currentTier,
        isVip: true,
        vipAccess: true,
        vipExpiryDate: expiryDate,
        subscription_status: 'active',
        subscription_end_date: expiryDate,
        activationKey: cleanCode,
        updatedAt: serverTimestamp()
      };

      if (userSnap.exists()) {
        tx.update(userRef, vipPayload);
      } else {
        tx.set(userRef, {
          email: resolvedEmail,
          ...vipPayload,
          isElite: false,
          grantedFeatures: {},
          isBanned: false,
          isMutedFromChat: false,
          emailVerified: Boolean(auth.currentUser?.emailVerified),
          createdAt: serverTimestamp()
        });
      }
    }

    return {
      success: true,
      code: cleanCode,
      durationInDays,
      durationLabel,
      expiryDate,
      grantTier,
      grantFeatures
    };
  });

  try {
    localStorage.removeItem('mbk_vip_access');
    localStorage.removeItem('mbk_vip_expiry');
    localStorage.removeItem('mbk_vip_key');
    localStorage.removeItem('mbk_bot_unlocked');
  } catch {
    // ignore storage errors
  }

  return result;
}

export function isVipAccessActive(userRole?: string, vipExpiryDate?: string | null): boolean {
  const roleLower = (userRole || '').toLowerCase();
  if (['admin', 'analyser', 'analyst', 'moderator'].includes(roleLower)) {
    return true;
  }

  if (vipExpiryDate) {
    const exp = new Date(vipExpiryDate);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() > Date.now()) {
      return true;
    }
  }

  return (roleLower === 'vip' || roleLower === 'elite') && !vipExpiryDate;
}
