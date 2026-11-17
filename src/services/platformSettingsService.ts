import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { OperationType, reportFirestoreError } from '../utils/firestoreError';

export interface PlatformContactSettings {
  whatsappNumber: string;
  telegramUrl: string;
  supportEmail: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformContactSettings = {
  whatsappNumber: '',
  telegramUrl: '',
  supportEmail: 'support@mbktrading.live'
};

export function extractWhatsAppDigits(raw: string): string {
  return (raw || '').replace(/[^0-9]/g, '');
}

export function buildWhatsAppUrl(rawNumber: string, prefillText?: string): string {
  const digits = extractWhatsAppDigits(rawNumber);
  if (!digits || digits.length < 7) return '';
  const query = prefillText ? `?text=${encodeURIComponent(prefillText)}` : '';
  return `https://wa.me/${digits}${query}`;
}

export function normalizeTelegramUrl(rawInput: string): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^(t\.me|telegram\.me)\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  const cleanHandle = trimmed.replace(/^@+/, '').replace(/[^a-zA-Z0-9_/+]/g, '');
  return cleanHandle ? `https://t.me/${cleanHandle}` : '';
}

export function formatTelegramHandle(rawInput: string): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@')) return trimmed;
  const match = trimmed.match(/(?:t\.me|telegram\.me)\/([^/?#]+)/i);
  if (match && match[1]) {
    return match[1].startsWith('+') ? trimmed : `@${match[1]}`;
  }
  return `@${trimmed.replace(/^@+/, '')}`;
}

function mapDocToSettings(data?: Record<string, any>): PlatformContactSettings {
  if (!data) return { ...DEFAULT_PLATFORM_SETTINGS };
  return {
    whatsappNumber: typeof data.whatsappNumber === 'string' ? data.whatsappNumber.trim() : '',
    telegramUrl: typeof data.telegramUrl === 'string' ? data.telegramUrl.trim() : '',
    supportEmail:
      typeof data.supportEmail === 'string' && data.supportEmail.trim()
        ? data.supportEmail.trim()
        : DEFAULT_PLATFORM_SETTINGS.supportEmail,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined
  };
}

export async function fetchPlatformSettings(): Promise<PlatformContactSettings> {
  const ref = doc(db, 'settings', 'platform');
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? mapDocToSettings(snap.data()) : { ...DEFAULT_PLATFORM_SETTINGS };
  } catch (err) {
    console.warn('[PlatformSettings] Could not fetch settings/platform:', err);
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
}

export function subscribeToPlatformSettings(
  onChange: (settings: PlatformContactSettings) => void
): () => void {
  const ref = doc(db, 'settings', 'platform');
  return onSnapshot(
    ref,
    (snap) => {
      onChange(snap.exists() ? mapDocToSettings(snap.data()) : { ...DEFAULT_PLATFORM_SETTINGS });
    },
    (err) => {
      console.warn('[PlatformSettings] Listener notice:', err?.message || err);
      onChange({ ...DEFAULT_PLATFORM_SETTINGS });
    }
  );
}

export async function savePlatformSettings(
  input: Pick<PlatformContactSettings, 'whatsappNumber' | 'telegramUrl' | 'supportEmail'>
): Promise<PlatformContactSettings> {
  const cleanWhatsapp = (input.whatsappNumber || '').trim().slice(0, 40);
  const cleanTelegram = normalizeTelegramUrl(input.telegramUrl || '').slice(0, 300);
  const cleanEmail = (input.supportEmail || DEFAULT_PLATFORM_SETTINGS.supportEmail).trim().slice(0, 200);

  const payload: PlatformContactSettings = {
    whatsappNumber: cleanWhatsapp,
    telegramUrl: cleanTelegram,
    supportEmail: cleanEmail,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || auth.currentUser?.uid || 'admin'
  };

  try {
    await setDoc(doc(db, 'settings', 'platform'), payload);
    return payload;
  } catch (err) {
    const { message } = reportFirestoreError(err, OperationType.WRITE, 'settings/platform');
    throw new Error(message);
  }
}
