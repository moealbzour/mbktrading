import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type AcademySectionId =
  | 'shorts'
  | 'full_courses'
  | 'ideas_subjects'
  | 'paid_courses'
  | 'quantum_trading';

export type AcademyVideoKind = 'youtube_short' | 'youtube_video' | 'direct_mp4' | 'vimeo';

export interface AcademyVideoItem {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  section: AcademySectionId;
  videoUrl: string;
  embedUrl: string;
  videoKind: AcademyVideoKind;
  youtubeId?: string;
  thumbnailUrl?: string;
  durationLabelAr: string;
  durationLabelEn: string;
  topicTagAr: string;
  topicTagEn: string;
  isFreeAccess: boolean; // true for shorts (open for free), false for locked Elite courses
  priceUsd?: number;
  instructorName: string;
  sortOrder: number;
  isPublished: boolean;
  timestampMs: number;
}

export interface ParsedVideoLinkInfo {
  videoKind: AcademyVideoKind;
  embedUrl: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  isValid: boolean;
}

const ACADEMY_CACHE_KEY = 'mbk_academy_videos_cache_v2';
const ACADEMY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes quota-safe cache

let memoryCachedVideos: AcademyVideoItem[] | null = null;
let memoryCacheTimestampMs = 0;
let inFlightVideosPromise: Promise<AcademyVideoItem[]> | null = null;

/**
 * Empty by default as requested: no starter videos are pre-uploaded.
 * The Admin can add real YouTube Shorts or Course Videos anytime via the Admin Upload studio.
 */
export const DEFAULT_STARTER_ACADEMY_VIDEOS: AcademyVideoItem[] = [];

/**
 * Parses any YouTube Shorts URL, YouTube Watch/Share URL, Vimeo link, or direct MP4 video link
 * into a clean, privacy-enhanced embed URL that plays natively inside the website.
 */
export function parseAcademyVideoUrl(rawUrl: string): ParsedVideoLinkInfo {
  const cleaned = String(rawUrl || '').trim();
  if (!cleaned) {
    return { videoKind: 'youtube_short', embedUrl: '', isValid: false };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(cleaned);
  } catch {
    return { videoKind: 'youtube_short', embedUrl: '', isValid: false };
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return { videoKind: 'youtube_short', embedUrl: '', isValid: false };
  }

  const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = parsedUrl.pathname;

  // 1. YouTube Shorts, Watch, Embed, Live, or youtu.be links
  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'youtu.be'
  ) {
    let videoId = '';
    let isShort = false;

    if (host === 'youtu.be') {
      videoId = pathname.split('/').filter(Boolean)[0] || '';
    } else if (pathname.startsWith('/shorts/')) {
      videoId = pathname.replace('/shorts/', '').split('/')[0] || '';
      isShort = true;
    } else if (pathname.startsWith('/embed/')) {
      videoId = pathname.replace('/embed/', '').split('/')[0] || '';
    } else if (pathname.startsWith('/live/')) {
      videoId = pathname.replace('/live/', '').split('/')[0] || '';
    } else {
      videoId = parsedUrl.searchParams.get('v') || '';
    }

    videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (videoId.length >= 6) {
      return {
        videoKind: isShort ? 'youtube_short' : 'youtube_video',
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`,
        youtubeId: videoId,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        isValid: true
      };
    }
  }

  // 2. Vimeo links
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const segments = pathname.split('/').filter(Boolean);
    const vimeoId = segments[segments.length - 1] || '';
    if (/^\d+$/.test(vimeoId)) {
      return {
        videoKind: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoId}?dnt=1`,
        isValid: true
      };
    }
  }

  // 3. Direct MP4 / WebM / MOV CDN video URL
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cleaned)) {
    return {
      videoKind: 'direct_mp4',
      embedUrl: cleaned,
      isValid: true
    };
  }

  return {
    videoKind: 'youtube_video',
    embedUrl: cleaned,
    isValid: true
  };
}

function normalizeSection(raw: unknown): AcademySectionId {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'full_courses') return 'full_courses';
  if (val === 'ideas_subjects') return 'ideas_subjects';
  if (val === 'paid_courses') return 'paid_courses';
  if (val === 'quantum_trading') return 'quantum_trading';
  return 'shorts';
}

function mapDocToAcademyVideo(docId: string, d: Record<string, any>): AcademyVideoItem {
  const section = normalizeSection(d.section);
  const rawVideoUrl = String(d.videoUrl || d.embedUrl || '').trim();
  const parsed = parseAcademyVideoUrl(rawVideoUrl);

  const titleAr = String(d.titleAr || d.title || '').trim();
  const titleEn = String(d.titleEn || d.title || titleAr).trim();
  const descriptionAr = String(d.descriptionAr || d.description || '').trim();
  const descriptionEn = String(d.descriptionEn || d.description || descriptionAr).trim();

  const videoKind: AcademyVideoKind =
    d.videoKind === 'direct_mp4' ||
    d.videoKind === 'youtube_short' ||
    d.videoKind === 'youtube_video' ||
    d.videoKind === 'vimeo'
      ? d.videoKind
      : section === 'shorts' && parsed.videoKind === 'youtube_video'
      ? 'youtube_short'
      : parsed.videoKind;

  return {
    id: docId,
    titleAr: titleAr || titleEn || 'درس أكاديمية MBK',
    titleEn: titleEn || titleAr || 'MBK Academy Lesson',
    descriptionAr,
    descriptionEn,
    section,
    videoUrl: rawVideoUrl,
    embedUrl: String(d.embedUrl || parsed.embedUrl || rawVideoUrl).trim(),
    videoKind,
    youtubeId: d.youtubeId ? String(d.youtubeId).trim() : parsed.youtubeId,
    thumbnailUrl: d.thumbnailUrl
      ? String(d.thumbnailUrl).trim()
      : parsed.thumbnailUrl || undefined,
    durationLabelAr: String(
      d.durationLabelAr || (section === 'shorts' ? '0:60 شورت' : 'درس فيديو')
    ).trim(),
    durationLabelEn: String(
      d.durationLabelEn || (section === 'shorts' ? '0:60 Short' : 'Video Lesson')
    ).trim(),
    topicTagAr: String(d.topicTagAr || 'أكاديمية MBK').trim(),
    topicTagEn: String(d.topicTagEn || d.topicTagAr || 'MBK Academy').trim(),
    isFreeAccess: typeof d.isFreeAccess === 'boolean' ? d.isFreeAccess : section === 'shorts',
    priceUsd: Number.isFinite(Number(d.priceUsd)) ? Math.max(0, Number(d.priceUsd)) : undefined,
    instructorName: String(d.instructorName || 'MBK Institutional Desk').trim(),
    sortOrder: Number.isFinite(Number(d.sortOrder)) ? Number(d.sortOrder) : 0,
    isPublished: d.isPublished !== false,
    timestampMs: Number(d.timestampMs || Date.now())
  };
}

function sortAcademyVideos(list: AcademyVideoItem[]): AcademyVideoItem[] {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return b.timestampMs - a.timestampMs;
  });
}

function readLocalCache(nowMs: number): AcademyVideoItem[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ACADEMY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.cachedAtMs === 'number' &&
      nowMs - parsed.cachedAtMs < ACADEMY_CACHE_TTL_MS &&
      Array.isArray(parsed.videos)
    ) {
      return parsed.videos;
    }
  } catch {
    // ignore storage read error
  }
  return null;
}

function writeLocalCache(videos: AcademyVideoItem[], nowMs: number): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      ACADEMY_CACHE_KEY,
      JSON.stringify({
        cachedAtMs: nowMs,
        videos
      })
    );
  } catch {
    // ignore storage quota notice
  }
}

export function invalidateAcademyVideosCache(): void {
  memoryCachedVideos = null;
  memoryCacheTimestampMs = 0;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACADEMY_CACHE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Quota-safe one-shot fetch of Academy Videos & Shorts from Firestore `academy_videos`.
 * No fake starter videos are loaded; only real videos uploaded by the Admin are returned.
 */
export async function fetchAcademyVideos(forceRefresh: boolean = false): Promise<AcademyVideoItem[]> {
  const nowMs = Date.now();

  if (!forceRefresh) {
    if (
      memoryCachedVideos !== null &&
      nowMs - memoryCacheTimestampMs < ACADEMY_CACHE_TTL_MS
    ) {
      return memoryCachedVideos;
    }

    const localHit = readLocalCache(nowMs);
    if (localHit !== null) {
      memoryCachedVideos = localHit;
      memoryCacheTimestampMs = nowMs;
      return localHit;
    }
  }

  if (inFlightVideosPromise) {
    return inFlightVideosPromise;
  }

  inFlightVideosPromise = (async () => {
    try {
      const q = query(
        collection(db, 'academy_videos'),
        orderBy('timestampMs', 'desc'),
        limit(60)
      );
      const snap = await getDocs(q);
      const firestoreItems: AcademyVideoItem[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          firestoreItems.push(mapDocToAcademyVideo(docSnap.id, data));
        }
      });

      const sorted = sortAcademyVideos(firestoreItems);
      const completedAt = Date.now();
      memoryCachedVideos = sorted;
      memoryCacheTimestampMs = completedAt;
      writeLocalCache(sorted, completedAt);
      return sorted;
    } catch (err) {
      console.warn('[AcademyService] Could not fetch academy_videos:', err);
      return memoryCachedVideos || [];
    } finally {
      inFlightVideosPromise = null;
    }
  })();

  return inFlightVideosPromise;
}

/**
 * Create or update an Academy Video / Short in Firestore `academy_videos` (Admin only).
 */
export async function saveAcademyVideo(
  input: Partial<AcademyVideoItem> & {
    titleAr: string;
    videoUrl: string;
    section: AcademySectionId;
  }
): Promise<AcademyVideoItem> {
  const nowMs = Date.now();
  const cleanId =
    input.id && /^[a-zA-Z0-9_-]+$/.test(input.id.trim())
      ? input.id.trim()
      : `acad-${nowMs}-${Math.random().toString(36).slice(2, 7).replace(/[^a-z0-9]/g, '0')}`;

  const section = normalizeSection(input.section);
  const parsed = parseAcademyVideoUrl(input.videoUrl);
  if (!parsed.isValid || !parsed.embedUrl) {
    throw new Error('Invalid video URL. Please provide a valid YouTube Short, YouTube Video, Vimeo, or direct MP4 URL.');
  }

  const titleAr = input.titleAr.trim().slice(0, 180);
  const titleEn = (input.titleEn || titleAr).trim().slice(0, 180);
  const descriptionAr = (input.descriptionAr || '').trim().slice(0, 1500);
  const descriptionEn = (input.descriptionEn || descriptionAr).trim().slice(0, 1500);

  const videoKind: AcademyVideoKind =
    section === 'shorts' && parsed.videoKind === 'youtube_video'
      ? 'youtube_short'
      : parsed.videoKind;

  const item: AcademyVideoItem = {
    id: cleanId,
    titleAr,
    titleEn,
    descriptionAr,
    descriptionEn,
    section,
    videoUrl: input.videoUrl.trim().slice(0, 600),
    embedUrl: parsed.embedUrl,
    videoKind,
    ...(parsed.youtubeId ? { youtubeId: parsed.youtubeId } : {}),
    ...(input.thumbnailUrl?.trim()
      ? { thumbnailUrl: input.thumbnailUrl.trim().slice(0, 600) }
      : parsed.thumbnailUrl
      ? { thumbnailUrl: parsed.thumbnailUrl }
      : {}),
    durationLabelAr: (
      input.durationLabelAr || (section === 'shorts' ? '0:60 شورت' : 'محاضرة فيديو')
    )
      .trim()
      .slice(0, 60),
    durationLabelEn: (
      input.durationLabelEn ||
      input.durationLabelAr ||
      (section === 'shorts' ? '0:60 Short' : 'Video Module')
    )
      .trim()
      .slice(0, 60),
    topicTagAr: (input.topicTagAr || 'أكاديمية MBK').trim().slice(0, 80),
    topicTagEn: (input.topicTagEn || input.topicTagAr || 'MBK Academy').trim().slice(0, 80),
    isFreeAccess:
      typeof input.isFreeAccess === 'boolean' ? input.isFreeAccess : section === 'shorts',
    ...(Number.isFinite(Number(input.priceUsd)) && Number(input.priceUsd) > 0
      ? { priceUsd: Math.max(0, Number(input.priceUsd)) }
      : {}),
    instructorName: (input.instructorName || 'MBK Institutional Desk').trim().slice(0, 80),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    isPublished: input.isPublished !== false,
    timestampMs: input.timestampMs && input.timestampMs > 0 ? input.timestampMs : nowMs
  };

  await setDoc(doc(db, 'academy_videos', cleanId), item);
  invalidateAcademyVideosCache();
  return item;
}

/**
 * Delete an Academy Video from Firestore `academy_videos` (Admin only).
 */
export async function deleteAcademyVideo(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, 'academy_videos', id));
  invalidateAcademyVideosCache();
}
