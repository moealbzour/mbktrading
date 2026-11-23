import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getDmConversationId } from './directMessageService';
import { enrichMacroEvent } from '../utils/macroArabicTranslator';
import { triggerServerWebPush } from '../utils/mobileNotifications';

export type AnnouncementType = 'offer' | 'news' | 'event' | 'update';
export type TargetAudienceSegment = 'all' | 'free' | 'vip' | 'elite' | 'expiring_soon';
export type BulkDmSegment = 'all' | 'expiring_soon' | 'free' | 'vip' | 'elite' | 'expired';
export type AnnouncementCtaType = 'none' | 'plans' | 'promo' | 'calendar' | 'url';

export interface AdminAnnouncement {
  id: string;
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  type: AnnouncementType;
  targetTabs: string[]; // 'on_open', 'all', 'signals', 'chart', 'chat', 'dm', 'ai', 'calendar', 'news', 'paper', 'academy', 'elite'
  targetAudience: TargetAudienceSegment;
  ctaType?: AnnouncementCtaType;
  ctaLabel?: string;
  ctaUrl?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  timestampMs: number;
}

export interface MacroEconomicEvent {
  id: string;
  code: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  summaryAr: string;
  summaryEn: string;
  goldNasdaqImpactAr: string;
  goldNasdaqImpactEn: string;
  currency: string;
  countryCode: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  rawImpact: 'High' | 'Medium' | 'Low';
  actual: string;
  forecast: string;
  previous: string;
  revisedPrevious: string;
  unit: string;
  releaseTimeMs: number;
  dateIso: string;
  affectedPairs: string[];
  affectedAssets: string[];
}

interface RawCalendarApiEvent {
  id: string;
  title: string;
  currency: string;
  countryCode?: string;
  impact: 'High' | 'Medium' | 'Low';
  timestampMs: number;
  dateIso: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  revisedPrevious?: string;
  unit?: string;
}

const CLIENT_CALENDAR_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in-memory client cache
const PRIORITY_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'];

let cachedAllCalendarEvents: MacroEconomicEvent[] = [];
let lastCalendarFetchAtMs = 0;
let calendarInFlightPromise: Promise<MacroEconomicEvent[]> | null = null;
const macroEventSubscribers = new Set<(events: MacroEconomicEvent[]) => void>();
const fullCalendarSubscribers = new Set<(events: MacroEconomicEvent[]) => void>();

function mapRawApiEventToMacroEvent(raw: RawCalendarApiEvent): MacroEconomicEvent {
  const currency = (raw.currency || 'USD').toUpperCase();
  const countryCode = (raw.countryCode || currency.slice(0, 2)).toUpperCase();
  const rawImpact: 'High' | 'Medium' | 'Low' =
    raw.impact === 'High' ? 'High' : raw.impact === 'Medium' ? 'Medium' : 'Low';
  const impact: 'HIGH' | 'MEDIUM' | 'LOW' =
    rawImpact === 'High' ? 'HIGH' : rawImpact === 'Medium' ? 'MEDIUM' : 'LOW';

  const enriched = enrichMacroEvent({
    title: raw.title,
    currency,
    impact: rawImpact
  });

  const actual = raw.actual ? String(raw.actual).trim() : '';
  const forecast = raw.forecast ? String(raw.forecast).trim() : '—';
  const previous = raw.previous ? String(raw.previous).trim() : '—';
  const revisedPrevious = raw.revisedPrevious ? String(raw.revisedPrevious).trim() : '';
  const unit = raw.unit ? String(raw.unit).trim() : '';

  return {
    id: raw.id,
    code: enriched.code,
    titleAr: enriched.titleAr,
    titleEn: enriched.titleEn,
    descriptionAr: enriched.goldNasdaqImpactAr,
    descriptionEn: enriched.goldNasdaqImpactEn,
    summaryAr: enriched.summaryAr,
    summaryEn: enriched.summaryEn,
    goldNasdaqImpactAr: enriched.goldNasdaqImpactAr,
    goldNasdaqImpactEn: enriched.goldNasdaqImpactEn,
    currency,
    countryCode,
    impact,
    rawImpact,
    actual,
    forecast,
    previous,
    revisedPrevious,
    unit,
    releaseTimeMs: raw.timestampMs,
    dateIso: raw.dateIso || new Date(raw.timestampMs).toISOString(),
    affectedPairs: enriched.affectedAssets,
    affectedAssets: enriched.affectedAssets
  };
}

function filterFutureHighImpactEvents(
  events: MacroEconomicEvent[],
  nowMs: number = Date.now()
): MacroEconomicEvent[] {
  const futureHighOnly = events.filter(
    (ev) => ev.impact === 'HIGH' && ev.releaseTimeMs > nowMs
  );
  const priorityMatches = futureHighOnly.filter((ev) =>
    PRIORITY_CURRENCIES.includes(ev.currency.toUpperCase())
  );
  const others = futureHighOnly.filter(
    (ev) => !PRIORITY_CURRENCIES.includes(ev.currency.toUpperCase())
  );

  priorityMatches.sort((a, b) => a.releaseTimeMs - b.releaseTimeMs);
  others.sort((a, b) => a.releaseTimeMs - b.releaseTimeMs);

  return [...priorityMatches, ...others];
}

function notifyMacroSubscribers() {
  const highImpactFutureList = filterFutureHighImpactEvents(cachedAllCalendarEvents, Date.now());
  macroEventSubscribers.forEach((cb) => {
    try {
      cb(highImpactFutureList);
    } catch {
      // ignore subscriber callback error
    }
  });
  fullCalendarSubscribers.forEach((cb) => {
    try {
      cb(cachedAllCalendarEvents);
    } catch {
      // ignore subscriber callback error
    }
  });
}

/**
 * Fetches the full 14-day + recent real economic calendar from /api/market/calendar
 * and enriches every item with Arabic financial titles, summaries, and XAUUSD/US100 impact explanations.
 */
export async function fetchCalendarEvents(
  forceRefresh: boolean = false
): Promise<MacroEconomicEvent[]> {
  const nowMs = Date.now();
  if (
    !forceRefresh &&
    lastCalendarFetchAtMs > 0 &&
    nowMs - lastCalendarFetchAtMs < CLIENT_CALENDAR_CACHE_TTL_MS &&
    cachedAllCalendarEvents.length > 0
  ) {
    return cachedAllCalendarEvents;
  }

  if (calendarInFlightPromise) {
    return calendarInFlightPromise;
  }

  calendarInFlightPromise = (async () => {
    try {
      const res = await fetch('/api/market/calendar', {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) {
        throw new Error(`Calendar API HTTP ${res.status}`);
      }
      const data = await res.json();
      const rawEvents: RawCalendarApiEvent[] = Array.isArray(data?.events) ? data.events : [];

      const enrichedAll = rawEvents
        .filter((ev) => ev && typeof ev.timestampMs === 'number' && ev.timestampMs > 0)
        .map(mapRawApiEventToMacroEvent)
        .sort((a, b) => a.releaseTimeMs - b.releaseTimeMs);

      cachedAllCalendarEvents = enrichedAll;
      lastCalendarFetchAtMs = Date.now();
      notifyMacroSubscribers();
      return cachedAllCalendarEvents;
    } catch (err) {
      console.warn('[MacroCalendar] Real calendar fetch notice:', err);
      return cachedAllCalendarEvents;
    } finally {
      calendarInFlightPromise = null;
    }
  })();

  return calendarInFlightPromise;
}

export async function fetchUpcomingMacroEvents(
  forceRefresh: boolean = false
): Promise<MacroEconomicEvent[]> {
  const allEvents = await fetchCalendarEvents(forceRefresh);
  return filterFutureHighImpactEvents(allEvents, Date.now());
}

export function subscribeToCalendarEvents(
  onUpdate: (events: MacroEconomicEvent[]) => void
): () => void {
  fullCalendarSubscribers.add(onUpdate);
  onUpdate(cachedAllCalendarEvents);
  fetchCalendarEvents(false).catch(() => {});

  return () => {
    fullCalendarSubscribers.delete(onUpdate);
  };
}

export function subscribeToUpcomingMacroEvents(
  onUpdate: (events: MacroEconomicEvent[]) => void
): () => void {
  macroEventSubscribers.add(onUpdate);
  onUpdate(filterFutureHighImpactEvents(cachedAllCalendarEvents, Date.now()));
  fetchCalendarEvents(false).catch(() => {});

  return () => {
    macroEventSubscribers.delete(onUpdate);
  };
}

/**
 * Returns future High-impact economic events for the top radar cards and 1-hour pre-event popup.
 */
export function getUpcomingHighImpactEvents(nowMs: number = Date.now()): MacroEconomicEvent[] {
  if (
    typeof window !== 'undefined' &&
    Date.now() - lastCalendarFetchAtMs >= CLIENT_CALENDAR_CACHE_TTL_MS
  ) {
    fetchCalendarEvents(false).catch(() => {});
  }
  return filterFutureHighImpactEvents(cachedAllCalendarEvents, nowMs);
}

/**
 * Alias for getUpcomingHighImpactEvents to preserve compatibility across existing widgets.
 */
export function getUpcomingMacroEvents(nowMs: number = Date.now()): MacroEconomicEvent[] {
  return getUpcomingHighImpactEvents(nowMs);
}

/**
 * Translates common English financial RSS headlines into clear Arabic for Arabic mode
 */
export function translateFinancialHeadlineToArabic(englishTitle: string): string {
  if (!englishTitle) return '';
  // If already contains Arabic characters, return as-is
  if (/[\u0600-\u06FF]/.test(englishTitle)) {
    return englishTitle;
  }

  let text = englishTitle.trim();

  const phraseMap: Array<[RegExp, string]> = [
    [/\bBitcoin\b/gi, 'البيتكوين (BTC)'],
    [/\bEthereum\b/gi, 'الإيثيريوم (ETH)'],
    [/\bGold\b/gi, 'الذهب (XAUUSD)'],
    [/\bSpot Gold\b/gi, 'الذهب الفوري'],
    [/\bNasdaq\b/gi, 'مؤشر ناسداك (US100)'],
    [/\bS&P 500\b/gi, 'مؤشر S&P 500'],
    [/\bDow Jones\b/gi, 'مؤشر داو جونز'],
    [/\bFederal Reserve\b/gi, 'الاحتياطي الفيدرالي الأمريكي'],
    [/\bFed\b/gi, 'الفيدرالي'],
    [/\bFOMC\b/gi, 'لجنة الفيدرالي FOMC'],
    [/\bCPI\b/gi, 'بيانات التضخم CPI'],
    [/\bNFP\b/gi, 'بيانات الوظائف NFP'],
    [/\binflation\b/gi, 'التضخم'],
    [/\binterest rates?\b/gi, 'أسعار الفائدة'],
    [/\brate cut\b/gi, 'خفض الفائدة'],
    [/\brate hike\b/gi, 'رفع الفائدة'],
    [/\bCrude Oil\b/gi, 'النفط الخام'],
    [/\bOil\b/gi, 'النفط'],
    [/\bUS Dollar\b/gi, 'الدولار الأمريكي'],
    [/\bDollar\b/gi, 'الدولار'],
    [/\bWall Street\b/gi, 'وول ستريت'],
    [/\bETF inflows\b/gi, 'تدفقات صناديق ETF'],
    [/\bETF\b/gi, 'صناديق ETF'],
    [/\bsurges?\b/gi, 'يقفز بقوة'],
    [/\brall(y|ies)\b/gi, 'يواصل الصعود'],
    [/\bjumps?\b/gi, 'يرتفع'],
    [/\bgains?\b/gi, 'يحقق مكاسب'],
    [/\bdrops?\b/gi, 'يتراجع'],
    [/\bfalls?\b/gi, 'يهبط'],
    [/\bplunges?\b/gi, 'ينخفض بقوة'],
    [/\bbreaks? above\b/gi, 'يخترق مستوى'],
    [/\bholds? above\b/gi, 'يتماسك فوق'],
    [/\bahead of\b/gi, 'ترقباً لـ'],
    [/\bafter\b/gi, 'عقب'],
    [/\bmarket\b/gi, 'السوق'],
    [/\btraders\b/gi, 'المتداولين'],
    [/\binvestors\b/gi, 'المستثمرين'],
    [/\bprice\b/gi, 'سعر'],
    [/\banalysis\b/gi, 'تحليل'],
    [/\bforecast\b/gi, 'توقعات'],
    [/\bsupport\b/gi, 'مستوى الدعم'],
    [/\bresistance\b/gi, 'مستوى المقاومة']
  ];

  let matchedCount = 0;
  for (const [regex, replacement] of phraseMap) {
    if (regex.test(text)) {
      matchedCount++;
      text = text.replace(regex, replacement);
    }
  }

  if (matchedCount > 0) {
    return `📰 متابعة الأسواق: ${text}`;
  }
  return `📰 خبر عاجل من الأسواق العالمية: ${text}`;
}

const announcementSubscribers = new Set<(items: AdminAnnouncement[]) => void>();
let latestAnnouncementsList: AdminAnnouncement[] | null = null;
let sharedUnsubAnnouncements: (() => void) | null = null;

/**
 * Subscribe in real time to Admin Popup Announcements in Firestore (shared singleton listener)
 */
export function subscribeToActiveAnnouncements(
  onUpdate: (items: AdminAnnouncement[]) => void
): () => void {
  announcementSubscribers.add(onUpdate);
  if (latestAnnouncementsList !== null) {
    onUpdate(latestAnnouncementsList);
  }

  if (!sharedUnsubAnnouncements) {
    const q = query(collection(db, 'announcements'), orderBy('timestampMs', 'desc'), limit(10));
    sharedUnsubAnnouncements = onSnapshot(
      q,
      (snap) => {
        const list: AdminAnnouncement[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            title: d.title || '',
            titleEn: d.titleEn || d.title || '',
            message: d.message || '',
            messageEn: d.messageEn || d.message || '',
            type: (d.type as AnnouncementType) || 'offer',
            targetTabs: Array.isArray(d.targetTabs) ? d.targetTabs : ['on_open'],
            targetAudience: (d.targetAudience as TargetAudienceSegment) || 'all',
            ctaType: (d.ctaType as AnnouncementCtaType) || 'none',
            ctaLabel: d.ctaLabel || '',
            ctaUrl: d.ctaUrl || '',
            isActive: Boolean(d.isActive),
            createdBy: d.createdBy || '',
            createdAt: d.createdAt || new Date().toISOString(),
            timestampMs: Number(d.timestampMs || Date.now())
          });
        });
        latestAnnouncementsList = list;
        announcementSubscribers.forEach((cb) => {
          try {
            cb(list);
          } catch {
            // ignore
          }
        });
      },
      (err) => {
        console.warn('[Announcements] listener notice:', err?.message || err);
        announcementSubscribers.forEach((cb) => {
          try {
            cb(latestAnnouncementsList || []);
          } catch {
            // ignore
          }
        });
      }
    );
  }

  return () => {
    announcementSubscribers.delete(onUpdate);
    if (announcementSubscribers.size === 0 && sharedUnsubAnnouncements) {
      sharedUnsubAnnouncements();
      sharedUnsubAnnouncements = null;
      latestAnnouncementsList = null;
    }
  };
}

/**
 * Create a new Admin Popup Announcement or Macro Event Warning in Firestore
 */
export async function createAdminPopupAnnouncement(input: {
  title: string;
  message: string;
  type: AnnouncementType;
  targetTabs: string[];
  targetAudience: TargetAudienceSegment;
  ctaType?: AnnouncementCtaType;
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<AdminAnnouncement> {
  const nowMs = Date.now();
  const id = `ann-${nowMs}-${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = new Date(nowMs).toISOString();
  const createdBy = auth.currentUser?.email || 'admin';

  const record: AdminAnnouncement = {
    id,
    title: input.title.trim().slice(0, 200),
    message: input.message.trim().slice(0, 1500),
    type: input.type,
    targetTabs: input.targetTabs.length > 0 ? input.targetTabs : ['on_open'],
    targetAudience: input.targetAudience,
    ctaType: input.ctaType || 'none',
    ctaLabel: (input.ctaLabel || '').trim().slice(0, 100),
    ctaUrl: (input.ctaUrl || '').trim().slice(0, 500),
    isActive: true,
    createdBy,
    createdAt,
    timestampMs: nowMs
  };

  await setDoc(doc(db, 'announcements', id), record);

  const pushAudience =
    record.targetAudience === 'vip' || record.targetAudience === 'elite' ? 'vip' : 'all';
  triggerServerWebPush({
    title: `📣 إعلان MBK Trading: ${record.title}`,
    body: record.message.slice(0, 180),
    tag: `mbk-ann-${record.id}`,
    url: '/',
    audience: pushAudience,
    category: 'announcement',
    excludeUid: auth.currentUser?.uid || null
  });

  return record;
}

export async function toggleAnnouncementActive(id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, 'announcements', id), {
    isActive
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'announcements', id));
}

/**
 * Helper to compute how many days remain on a user's subscription
 */
export function getUserRemainingSubscriptionDays(user: {
  vipExpiryDate?: string | null;
  eliteExpiryDate?: string | null;
  subscriptionEndDate?: string | null;
  grantedFeatures?: Partial<Record<string, string>>;
}): number | null {
  const candidates: number[] = [];
  const rawDates = [
    user.eliteExpiryDate,
    user.vipExpiryDate,
    user.subscriptionEndDate,
    ...(user.grantedFeatures ? Object.values(user.grantedFeatures) : [])
  ];

  for (const iso of rawDates) {
    if (!iso || typeof iso !== 'string') continue;
    const ms = new Date(iso).getTime();
    if (!Number.isNaN(ms)) {
      candidates.push(ms);
    }
  }

  if (candidates.length === 0) return null;
  const maxExpiryMs = Math.max(...candidates);
  const diffDays = Math.ceil((maxExpiryMs - Date.now()) / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Send Direct Messages in bulk from the Admin to a selected user segment
 */
export async function sendBulkDirectMessageToUsers(params: {
  adminUid: string;
  adminName: string;
  recipients: Array<{
    uid: string;
    name: string;
    role?: string;
    remainingDays?: number | null;
  }>;
  messageTemplate: string;
}): Promise<{ sentCount: number; failedCount: number }> {
  const { adminUid, adminName, recipients, messageTemplate } = params;
  const cleanTemplate = messageTemplate.trim();
  if (!adminUid || !cleanTemplate) {
    throw new Error('الرسالة فارغة أو جلسة المشرف غير صالحة.');
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    if (!recipient.uid || recipient.uid === adminUid) continue;

    try {
      const personalizedText = cleanTemplate
        .replace(/\{name\}/gi, recipient.name || 'المتداول')
        .replace(
          /\{days\}/gi,
          recipient.remainingDays !== null && recipient.remainingDays !== undefined
            ? String(Math.max(0, recipient.remainingDays))
            : 'قليلة'
        )
        .slice(0, 1000);

      const convoId = getDmConversationId(adminUid, recipient.uid);
      const convoRef = doc(db, 'dm_conversations', convoId);
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const participants: [string, string] =
        adminUid < recipient.uid ? [adminUid, recipient.uid] : [recipient.uid, adminUid];

      await setDoc(
        convoRef,
        {
          id: convoId,
          participants,
          participantNames: {
            [adminUid]: adminName,
            [recipient.uid]: recipient.name || 'Trader'
          },
          participantAvatars: {
            [adminUid]: '',
            [recipient.uid]: ''
          },
          participantRoles: {
            [adminUid]: 'ADMIN',
            [recipient.uid]: (recipient.role || 'FREE').toUpperCase()
          },
          lastMessage: personalizedText.slice(0, 500),
          lastSenderUid: adminUid,
          lastMessageAtMs: nowMs,
          unreadBy: {
            [adminUid]: 0,
            [recipient.uid]: 1
          },
          updatedAt: nowIso
        },
        { merge: true }
      );

      const msgId = `msg-${nowMs}-${Math.random().toString(36).slice(2, 8)}`;
      const msgRef = doc(db, 'dm_conversations', convoId, 'messages', msgId);
      await setDoc(msgRef, {
        senderUid: adminUid,
        recipientUid: recipient.uid,
        senderName: adminName,
        text: personalizedText,
        timestampMs: nowMs,
        createdAt: nowIso,
        timestamp: serverTimestamp()
      });

      triggerServerWebPush({
        title: `🛡️ رسالة من ${adminName.slice(0, 60)}`,
        body: personalizedText.slice(0, 180),
        tag: `mbk-dm-${convoId}-${nowMs}`,
        url: '/',
        audience: 'targetUid',
        category: 'dm',
        targetUid: recipient.uid,
        excludeUid: adminUid
      });

      sentCount++;
    } catch (err) {
      console.warn(`[Bulk DM] Failed for user ${recipient.uid}:`, err);
      failedCount++;
    }
  }

  return { sentCount, failedCount };
}
