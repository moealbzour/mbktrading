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
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getDmConversationId } from './directMessageService';
import { enrichMacroEvent } from '../utils/macroArabicTranslator';
import { triggerServerWebPush } from '../utils/mobileNotifications';
import { recordAdminAuditLog } from './adminAuditService';

export type AnnouncementType = 'offer' | 'news' | 'event' | 'update';
export type TargetAudienceSegment = 'all' | 'free' | 'vip' | 'elite' | 'expiring_soon' | 'expired';
export type BulkDmSegment = 'all' | 'expiring_soon' | 'free' | 'vip' | 'elite' | 'expired';
export type AnnouncementCtaType =
  | 'none'
  | 'plans'
  | 'navigate_tab'
  | 'support_chat'
  | 'url'
  | 'promo'
  | 'calendar';
export type PopupPlacement = 'center_modal' | 'top_banner' | 'bottom_card' | 'bottom_right_toast';
export type PopupSurfaceStyle = 'dark_terminal' | 'high_contrast' | 'alert_border';
export type PopupDisplayFrequency = 'once_per_user' | 'once_per_session' | 'every_visit';
export type PopupTriggerLocation = 'global' | 'chart' | 'signals' | 'chat' | 'custom';

export interface AdminAnnouncement {
  id: string;
  senderName?: string;
  showLogo?: boolean;
  badgeText?: string;
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  bannerImageUrl?: string;
  type: AnnouncementType;
  accentColor?: string;
  surfaceStyle?: PopupSurfaceStyle;
  ctaColor?: string;
  placement?: PopupPlacement;
  triggerLocation?: PopupTriggerLocation;
  targetTabs: string[]; // 'on_open', 'all', 'signals', 'chart', 'chat', 'dm', 'ai', 'calendar', 'news', 'paper', 'academy', 'elite'
  targetAudience: TargetAudienceSegment;
  startAtMs?: number | null;
  endAtMs?: number | null;
  countdownEnabled?: boolean;
  countdownEndAtMs?: number | null;
  countdownLabel?: string;
  frequency?: PopupDisplayFrequency;
  ctaType?: AnnouncementCtaType;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaTargetTab?: string;
  sendWebPush?: boolean;
  views?: number;
  clicks?: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  timestampMs: number;
}

export interface AdminSavedTemplate {
  id: string;
  name: string;
  templateType: 'popup' | 'dm';
  payload: Record<string, any>;
  createdBy: string;
  updatedAt: string;
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

export function normalizeBrandSenderName(raw?: string): string {
  const cleaned = (raw || '').trim();
  if (!cleaned || cleaned.toLowerCase() === 'manager' || cleaned.toLowerCase() === 'admin') {
    return 'MBK Trading';
  }
  return cleaned.slice(0, 60);
}

const announcementSubscribers = new Set<(items: AdminAnnouncement[]) => void>();
let latestAnnouncementsList: AdminAnnouncement[] | null = null;
let sharedUnsubAnnouncements: (() => void) | null = null;

function mapDocToAnnouncement(docId: string, d: Record<string, any>): AdminAnnouncement {
  return {
    id: docId,
    senderName: normalizeBrandSenderName(d.senderName),
    showLogo: d.showLogo !== false,
    badgeText: typeof d.badgeText === 'string' ? d.badgeText : '',
    title: d.title || '',
    titleEn: d.titleEn || d.title || '',
    message: d.message || '',
    messageEn: d.messageEn || d.message || '',
    bannerImageUrl: typeof d.bannerImageUrl === 'string' ? d.bannerImageUrl : '',
    type: (d.type as AnnouncementType) || 'offer',
    accentColor: typeof d.accentColor === 'string' && d.accentColor ? d.accentColor : '#26A69A',
    surfaceStyle: (d.surfaceStyle as PopupSurfaceStyle) || 'dark_terminal',
    ctaColor: typeof d.ctaColor === 'string' && d.ctaColor ? d.ctaColor : d.accentColor || '#26A69A',
    placement: (d.placement as PopupPlacement) || 'center_modal',
    triggerLocation: (d.triggerLocation as PopupTriggerLocation) || 'global',
    targetTabs: Array.isArray(d.targetTabs) && d.targetTabs.length > 0 ? d.targetTabs : ['on_open', 'all'],
    targetAudience: (d.targetAudience as TargetAudienceSegment) || 'all',
    startAtMs: typeof d.startAtMs === 'number' && d.startAtMs > 0 ? d.startAtMs : null,
    endAtMs: typeof d.endAtMs === 'number' && d.endAtMs > 0 ? d.endAtMs : null,
    countdownEnabled: Boolean(d.countdownEnabled),
    countdownEndAtMs:
      typeof d.countdownEndAtMs === 'number' && d.countdownEndAtMs > 0 ? d.countdownEndAtMs : null,
    countdownLabel: typeof d.countdownLabel === 'string' ? d.countdownLabel : '',
    frequency: (d.frequency as PopupDisplayFrequency) || 'once_per_session',
    ctaType: (d.ctaType as AnnouncementCtaType) || 'none',
    ctaLabel: d.ctaLabel || '',
    ctaUrl: d.ctaUrl || '',
    ctaTargetTab: typeof d.ctaTargetTab === 'string' ? d.ctaTargetTab : 'signals',
    sendWebPush: Boolean(d.sendWebPush),
    views: Number(d.views || 0),
    clicks: Number(d.clicks || 0),
    isActive: Boolean(d.isActive),
    createdBy: d.createdBy || '',
    createdAt: d.createdAt || new Date().toISOString(),
    timestampMs: Number(d.timestampMs || Date.now())
  };
}

let currentAnnouncementsLimit = 5;

/**
 * Subscribe to Admin Popup Announcements in Firestore (shared singleton listener, bounded to limit(5) for end-user clients)
 */
export function subscribeToActiveAnnouncements(
  onUpdate: (items: AdminAnnouncement[]) => void,
  options?: { isAdminManager?: boolean }
): () => void {
  const requestedLimit = options?.isAdminManager ? 25 : 5;
  announcementSubscribers.add(onUpdate);
  if (latestAnnouncementsList !== null) {
    onUpdate(latestAnnouncementsList);
  }

  // Upgrade listener limit only when an Admin opens the Popup Studio manager
  if (sharedUnsubAnnouncements && requestedLimit > currentAnnouncementsLimit) {
    sharedUnsubAnnouncements();
    sharedUnsubAnnouncements = null;
  }

  if (!sharedUnsubAnnouncements) {
    currentAnnouncementsLimit = Math.max(currentAnnouncementsLimit, requestedLimit);
    const q = query(
      collection(db, 'announcements'),
      orderBy('timestampMs', 'desc'),
      limit(currentAnnouncementsLimit)
    );
    sharedUnsubAnnouncements = onSnapshot(
      q,
      (snap) => {
        const list: AdminAnnouncement[] = [];
        snap.forEach((docSnap) => {
          list.push(mapDocToAnnouncement(docSnap.id, docSnap.data()));
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
      currentAnnouncementsLimit = 5;
    }
  };
}

export interface PopupUpsertInput {
  senderName?: string;
  showLogo?: boolean;
  badgeText?: string;
  title: string;
  message: string;
  bannerImageUrl?: string;
  type: AnnouncementType;
  accentColor?: string;
  surfaceStyle?: PopupSurfaceStyle;
  ctaColor?: string;
  placement?: PopupPlacement;
  triggerLocation?: PopupTriggerLocation;
  targetTabs: string[];
  targetAudience: TargetAudienceSegment;
  startAtMs?: number | null;
  endAtMs?: number | null;
  countdownEnabled?: boolean;
  countdownEndAtMs?: number | null;
  countdownLabel?: string;
  frequency?: PopupDisplayFrequency;
  ctaType?: AnnouncementCtaType;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaTargetTab?: string;
  sendWebPush?: boolean;
  isActive?: boolean;
}

/**
 * Create a new Admin Popup Announcement in Firestore
 */
export async function createAdminPopupAnnouncement(
  input: PopupUpsertInput
): Promise<AdminAnnouncement> {
  const nowMs = Date.now();
  const id = `ann-${nowMs}-${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = new Date(nowMs).toISOString();
  const createdBy = auth.currentUser?.email || 'admin';
  const senderName = normalizeBrandSenderName(input.senderName);

  const record: AdminAnnouncement = {
    id,
    senderName,
    showLogo: input.showLogo !== false,
    badgeText: (input.badgeText || '').trim().slice(0, 60),
    title: input.title.trim().slice(0, 200),
    message: input.message.trim().slice(0, 1500),
    bannerImageUrl: (input.bannerImageUrl || '').trim().slice(0, 500),
    type: input.type,
    accentColor: (input.accentColor || '#26A69A').trim().slice(0, 20),
    surfaceStyle: input.surfaceStyle || 'dark_terminal',
    ctaColor: (input.ctaColor || input.accentColor || '#26A69A').trim().slice(0, 20),
    placement: input.placement || 'center_modal',
    triggerLocation: input.triggerLocation || 'global',
    targetTabs: input.targetTabs.length > 0 ? input.targetTabs : ['on_open', 'all'],
    targetAudience: input.targetAudience,
    startAtMs: input.startAtMs && input.startAtMs > 0 ? input.startAtMs : null,
    endAtMs: input.endAtMs && input.endAtMs > 0 ? input.endAtMs : null,
    countdownEnabled: Boolean(input.countdownEnabled),
    countdownEndAtMs:
      input.countdownEnabled && input.countdownEndAtMs && input.countdownEndAtMs > 0
        ? input.countdownEndAtMs
        : null,
    countdownLabel: (input.countdownLabel || '').trim().slice(0, 80),
    frequency: input.frequency || 'once_per_session',
    ctaType: input.ctaType || 'none',
    ctaLabel: (input.ctaLabel || '').trim().slice(0, 100),
    ctaUrl: (input.ctaUrl || '').trim().slice(0, 500),
    ctaTargetTab: (input.ctaTargetTab || 'signals').trim().slice(0, 40),
    sendWebPush: Boolean(input.sendWebPush),
    views: 0,
    clicks: 0,
    isActive: input.isActive !== false,
    createdBy,
    createdAt,
    timestampMs: nowMs
  };

  await setDoc(doc(db, 'announcements', id), record);

  const isScheduledFuture = Boolean(record.startAtMs && record.startAtMs > nowMs + 60_000);
  if (record.sendWebPush && record.isActive && !isScheduledFuture) {
    const pushAudience =
      record.targetAudience === 'vip' || record.targetAudience === 'elite' ? 'vip' : 'all';
    triggerServerWebPush({
      title: `📣 ${senderName}: ${record.title}`,
      body: record.message.slice(0, 180),
      tag: `mbk-ann-${record.id}`,
      url: '/',
      audience: pushAudience,
      category: 'announcement',
      excludeUid: auth.currentUser?.uid || null
    });
  }

  await recordAdminAuditLog({
    action: 'POPUP_PUBLISHED',
    targetUid: id,
    targetLabel: record.title.slice(0, 80),
    details: `Published popup [${record.placement}] by ${senderName} for audience=${record.targetAudience} (webPush=${Boolean(record.sendWebPush)})`
  });

  return record;
}

/**
 * Update an existing Admin Popup Announcement in Firestore
 */
export async function updateAdminPopupAnnouncement(
  id: string,
  input: PopupUpsertInput
): Promise<void> {
  const senderName = normalizeBrandSenderName(input.senderName);
  const updates: Record<string, any> = {
    id,
    senderName,
    showLogo: input.showLogo !== false,
    badgeText: (input.badgeText || '').trim().slice(0, 60),
    title: input.title.trim().slice(0, 200),
    message: input.message.trim().slice(0, 1500),
    bannerImageUrl: (input.bannerImageUrl || '').trim().slice(0, 500),
    type: input.type,
    accentColor: (input.accentColor || '#26A69A').trim().slice(0, 20),
    surfaceStyle: input.surfaceStyle || 'dark_terminal',
    ctaColor: (input.ctaColor || input.accentColor || '#26A69A').trim().slice(0, 20),
    placement: input.placement || 'center_modal',
    triggerLocation: input.triggerLocation || 'global',
    targetTabs: input.targetTabs.length > 0 ? input.targetTabs : ['on_open', 'all'],
    targetAudience: input.targetAudience,
    startAtMs: input.startAtMs && input.startAtMs > 0 ? input.startAtMs : null,
    endAtMs: input.endAtMs && input.endAtMs > 0 ? input.endAtMs : null,
    countdownEnabled: Boolean(input.countdownEnabled),
    countdownEndAtMs:
      input.countdownEnabled && input.countdownEndAtMs && input.countdownEndAtMs > 0
        ? input.countdownEndAtMs
        : null,
    countdownLabel: (input.countdownLabel || '').trim().slice(0, 80),
    frequency: input.frequency || 'once_per_session',
    ctaType: input.ctaType || 'none',
    ctaLabel: (input.ctaLabel || '').trim().slice(0, 100),
    ctaUrl: (input.ctaUrl || '').trim().slice(0, 500),
    ctaTargetTab: (input.ctaTargetTab || 'signals').trim().slice(0, 40),
    sendWebPush: Boolean(input.sendWebPush)
  };

  if (typeof input.isActive === 'boolean') {
    updates.isActive = input.isActive;
  }

  await updateDoc(doc(db, 'announcements', id), updates);

  await recordAdminAuditLog({
    action: 'POPUP_UPDATED',
    targetUid: id,
    targetLabel: updates.title.slice(0, 80),
    details: `Updated popup [${updates.placement}] for audience=${updates.targetAudience}`
  });
}

export async function toggleAnnouncementActive(
  id: string,
  isActive: boolean,
  titleLabel?: string
): Promise<void> {
  await updateDoc(doc(db, 'announcements', id), {
    isActive
  });
  await recordAdminAuditLog({
    action: 'POPUP_STATUS_CHANGED',
    targetUid: id,
    targetLabel: (titleLabel || id).slice(0, 80),
    details: `${isActive ? 'Resumed / Activated' : 'Paused'} popup announcement`
  });
}

export async function deleteAnnouncement(id: string, titleLabel?: string): Promise<void> {
  await deleteDoc(doc(db, 'announcements', id));
  await recordAdminAuditLog({
    action: 'POPUP_DELETED',
    targetUid: id,
    targetLabel: (titleLabel || id).slice(0, 80),
    details: `Deleted popup announcement (${id})`
  });
}

/**
 * Safely increment popup views or clicks at most once per user per popup
 */
export async function incrementAnnouncementMetric(
  id: string,
  metric: 'views' | 'clicks'
): Promise<void> {
  if (!id || typeof window === 'undefined') return;
  const uid = auth.currentUser?.uid || 'anon';
  const guardKey = `mbk_popup_metric_${metric}_${id}_${uid}`;
  try {
    if (localStorage.getItem(guardKey) === '1') {
      return;
    }
    localStorage.setItem(guardKey, '1');
  } catch {
    // ignore storage errors
  }

  try {
    await updateDoc(doc(db, 'announcements', id), {
      [metric]: increment(1)
    });
  } catch {
    // ignore non-critical counter error
  }
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
 * Send Direct Messages in bulk from the Official Brand Identity to a selected user segment
 */
export async function sendBulkDirectMessageToUsers(params: {
  adminUid: string;
  adminName?: string;
  senderName?: string;
  showLogo?: boolean;
  bannerImageUrl?: string;
  title?: string;
  sendWebPush?: boolean;
  segmentLabel?: string;
  recipients: Array<{
    uid: string;
    name: string;
    role?: string;
    remainingDays?: number | null;
  }>;
  messageTemplate: string;
}): Promise<{ sentCount: number; failedCount: number }> {
  const {
    adminUid,
    adminName,
    senderName,
    showLogo = true,
    bannerImageUrl,
    title,
    sendWebPush = true,
    segmentLabel,
    recipients,
    messageTemplate
  } = params;

  const cleanTemplate = messageTemplate.trim();
  if (!adminUid || !cleanTemplate) {
    throw new Error('الرسالة فارغة أو جلسة المشرف غير صالحة.');
  }

  const officialSenderName = normalizeBrandSenderName(senderName || adminName || 'MBK Trading');
  const officialAvatar = showLogo !== false ? '/mbk-logo.png' : '';
  const cleanTitle = (title || '').trim();
  const cleanBanner = (bannerImageUrl || '').trim();

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    if (!recipient.uid || recipient.uid === adminUid) continue;

    try {
      const resolvedTitle = cleanTitle
        ? cleanTitle
            .replace(/\{name\}/gi, recipient.name || 'المتداول')
            .replace(
              /\{days\}/gi,
              recipient.remainingDays !== null && recipient.remainingDays !== undefined
                ? String(Math.max(0, recipient.remainingDays))
                : 'قليلة'
            )
        : '';

      const resolvedBody = cleanTemplate
        .replace(/\{name\}/gi, recipient.name || 'المتداول')
        .replace(
          /\{days\}/gi,
          recipient.remainingDays !== null && recipient.remainingDays !== undefined
            ? String(Math.max(0, recipient.remainingDays))
            : 'قليلة'
        );

      const composedParts: string[] = [];
      if (resolvedTitle) {
        composedParts.push(`📌 ${resolvedTitle}`);
      }
      composedParts.push(resolvedBody);
      if (cleanBanner) {
        composedParts.push(`🖼️ ${cleanBanner}`);
      }

      const personalizedText = composedParts.join('\n\n').slice(0, 1000);

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
            [adminUid]: officialSenderName,
            [recipient.uid]: recipient.name || 'Trader'
          },
          participantAvatars: {
            [adminUid]: officialAvatar,
            [recipient.uid]: ''
          },
          participantRoles: {
            [adminUid]: 'ADMIN',
            [recipient.uid]: (recipient.role || 'FREE').toUpperCase()
          },
          lastMessage: (resolvedTitle ? `${resolvedTitle} — ${resolvedBody}` : resolvedBody).slice(
            0,
            500
          ),
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
        senderName: officialSenderName,
        text: personalizedText,
        timestampMs: nowMs,
        createdAt: nowIso,
        timestamp: serverTimestamp()
      });

      if (sendWebPush) {
        triggerServerWebPush({
          title: resolvedTitle
            ? `${officialSenderName}: ${resolvedTitle.slice(0, 60)}`
            : `رسالة رسمية من ${officialSenderName.slice(0, 60)}`,
          body: resolvedBody.slice(0, 180),
          tag: `mbk-dm-${convoId}-${nowMs}`,
          url: '/',
          audience: 'targetUid',
          category: 'dm',
          targetUid: recipient.uid,
          excludeUid: adminUid
        });
      }

      sentCount++;
    } catch (err) {
      console.warn(`[Bulk DM] Failed for user ${recipient.uid}:`, err);
      failedCount++;
    }
  }

  await recordAdminAuditLog({
    action: 'BULK_DM_SENT',
    targetLabel: segmentLabel || 'bulk_segment',
    details: `Sent Branded Bulk DM as "${officialSenderName}" to ${sentCount} users (${failedCount} failed, webPush=${Boolean(sendWebPush)})`
  });

  return { sentCount, failedCount };
}

// ============================================================================
// CUSTOM SAVED TEMPLATES (Firestore `admin_templates` collection)
// ============================================================================
const STARTER_TEMPLATES_SEEDED_KEY = 'mbk_admin_templates_seeded_v2';

const DEFAULT_STARTER_TEMPLATES: Array<Omit<AdminSavedTemplate, 'createdBy' | 'updatedAt' | 'timestampMs'>> = [
  {
    id: 'tpl-popup-vip-offer',
    name: 'عرض ترقية باقة VIP (Popup)',
    templateType: 'popup',
    payload: {
      senderName: 'MBK VIP Desk',
      showLogo: true,
      badgeText: 'VIP EXCLUSIVE OFFER',
      title: 'عرض خاص لفترة محدودة: انضم إلى نخبة متداولي VIP اليوم',
      message:
        'احصل على وصول فوري لتوصيات الذهب والناسداك المباشرة، وتنبيهات بوت MBK الآلي، وغرفة التداول الاحترافية.',
      type: 'offer',
      accentColor: '#F0B90B',
      surfaceStyle: 'dark_terminal',
      ctaColor: '#F0B90B',
      placement: 'center_modal',
      triggerLocation: 'global',
      targetTabs: ['on_open', 'all'],
      targetAudience: 'free',
      countdownEnabled: true,
      countdownHoursFromNow: 24,
      countdownLabel: 'ينتهي العرض خلال',
      frequency: 'once_per_session',
      ctaType: 'plans',
      ctaLabel: 'عرض الباقات والترقية الآن',
      sendWebPush: false
    }
  },
  {
    id: 'tpl-popup-macro-alert',
    name: 'تحذير خبر اقتصادي هام CPI / FOMC (Popup)',
    templateType: 'popup',
    payload: {
      senderName: 'MBK Trading',
      showLogo: true,
      badgeText: 'HIGH-IMPACT MACRO ALERT',
      title: 'تنبيه هام: بيانات اقتصادية عالية التأثير خلال ساعة',
      message:
        'يرجى الانتباه لتقلبات السيولة المرتقبة على الذهب (XAUUSD) ومؤشر الناسداك (US100) وتأمين الصفقات المفتوحة.',
      type: 'event',
      accentColor: '#EF5350',
      surfaceStyle: 'alert_border',
      ctaColor: '#EF5350',
      placement: 'top_banner',
      triggerLocation: 'global',
      targetTabs: ['on_open', 'all'],
      targetAudience: 'all',
      countdownEnabled: false,
      frequency: 'once_per_session',
      ctaType: 'calendar',
      ctaLabel: 'فتح التقويم الاقتصادي',
      sendWebPush: true
    }
  },
  {
    id: 'tpl-dm-expiry-reminder',
    name: 'تذكير قرب انتهاء الاشتراك (Bulk DM)',
    templateType: 'dm',
    payload: {
      senderName: 'MBK VIP Desk',
      showLogo: true,
      dmSegment: 'expiring_soon',
      dmTitle: 'تذكير بتجديد اشتراكك في MBK Trading',
      dmMessageText:
        'مرحباً {name}،\nنود تذكيرك بأن اشتراكك الفعال في منصة MBK Trading سينتهي خلال {days} أيام.\nيمكنك التجديد الآن أو مراسلة مكتب الدعم لضمان استمرار وصول توصيات VIP وتنبيهات البوت دون انقطاع.',
      sendWebPush: true
    }
  }
];

export function subscribeToAdminTemplates(
  onUpdate: (templates: AdminSavedTemplate[]) => void
): () => void {
  const q = query(collection(db, 'admin_templates'), orderBy('timestampMs', 'desc'), limit(100));
  return onSnapshot(
    q,
    async (snap) => {
      if (snap.empty) {
        let alreadySeeded = false;
        try {
          alreadySeeded = localStorage.getItem(STARTER_TEMPLATES_SEEDED_KEY) === '1';
        } catch {
          // ignore
        }
        if (!alreadySeeded && auth.currentUser) {
          try {
            localStorage.setItem(STARTER_TEMPLATES_SEEDED_KEY, '1');
            const nowMs = Date.now();
            const nowIso = new Date(nowMs).toISOString();
            const email = auth.currentUser.email || 'admin';
            for (let i = 0; i < DEFAULT_STARTER_TEMPLATES.length; i++) {
              const item = DEFAULT_STARTER_TEMPLATES[i];
              await setDoc(doc(db, 'admin_templates', item.id), {
                ...item,
                createdBy: email,
                updatedAt: nowIso,
                timestampMs: nowMs - i * 1000
              });
            }
            return;
          } catch {
            // fallback to empty if permission denied
          }
        }
      }

      const list: AdminSavedTemplate[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          name: String(d.name || 'Untitled Template'),
          templateType: d.templateType === 'dm' ? 'dm' : 'popup',
          payload: d.payload && typeof d.payload === 'object' ? d.payload : {},
          createdBy: String(d.createdBy || ''),
          updatedAt: String(d.updatedAt || new Date().toISOString()),
          timestampMs: Number(d.timestampMs || Date.now())
        });
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('[AdminTemplates] listener notice:', err?.message || err);
      onUpdate([]);
    }
  );
}

export async function saveAdminTemplate(params: {
  id?: string;
  name: string;
  templateType: 'popup' | 'dm';
  payload: Record<string, any>;
}): Promise<AdminSavedTemplate> {
  const nowMs = Date.now();
  const id = params.id || `tpl-${params.templateType}-${nowMs}-${Math.random().toString(36).slice(2, 6)}`;
  const updatedAt = new Date(nowMs).toISOString();
  const createdBy = auth.currentUser?.email || 'admin';

  const record: AdminSavedTemplate = {
    id,
    name: params.name.trim().slice(0, 120),
    templateType: params.templateType,
    payload: params.payload,
    createdBy,
    updatedAt,
    timestampMs: nowMs
  };

  await setDoc(doc(db, 'admin_templates', id), record, { merge: true });

  await recordAdminAuditLog({
    action: 'TEMPLATE_SAVED',
    targetUid: id,
    targetLabel: record.name,
    details: `Saved ${record.templateType.toUpperCase()} template "${record.name}"`
  });

  return record;
}

export async function deleteAdminTemplate(id: string, nameLabel?: string): Promise<void> {
  try {
    localStorage.setItem(STARTER_TEMPLATES_SEEDED_KEY, '1');
  } catch {
    // ignore
  }
  await deleteDoc(doc(db, 'admin_templates', id));
  await recordAdminAuditLog({
    action: 'TEMPLATE_DELETED',
    targetUid: id,
    targetLabel: (nameLabel || id).slice(0, 80),
    details: `Deleted saved template "${nameLabel || id}"`
  });
}

