import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config
const configPath = path.resolve(__dirname, '..', 'firebase-applet-config.json');
const rawConfig = fs.readFileSync(configPath, 'utf-8');
const config = JSON.parse(rawConfig);

// Initialize Firebase Admin SDK using Application Default Credentials (ADC)
let adminDb: AdminFirestore | null = null;

try {
  const adminApp = !getAdminApps().length
    ? initAdminApp({
        credential: applicationDefault(),
        projectId: config.projectId
      })
    : getAdminApp();

  if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
    adminDb = getAdminFirestore(adminApp, config.firestoreDatabaseId);
  } else {
    adminDb = getAdminFirestore(adminApp);
  }
  adminDb.settings({ ignoreUndefinedProperties: true });
  console.log('[Firebase Admin SDK] Initialized with Application Default Credentials for:', config.firestoreDatabaseId || '(default)');
} catch (err: any) {
  console.warn('[Firebase Admin SDK] Notice on init:', err.message);
}

// Client SDK fallback to guarantee operation in sandbox environments
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

const clientApp = !getClientApps().length ? initClientApp(firebaseConfig) : getClientApps()[0];
const clientDb =
  config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
    ? getClientFirestore(clientApp, config.firestoreDatabaseId)
    : getClientFirestore(clientApp);

export { adminDb, clientDb };

export interface SignalRecord {
  id: string;
  symbol: string;
  nameAr?: string;
  action: 'BUY' | 'SELL';
  orderType: string;
  type: string;
  source: 'VIP_MANUAL' | 'BOT_WEBHOOK' | 'FREE_PUBLIC';
  sourceLabelAr: string;
  sourceLabelEn: string;
  status: 'RUNNING' | 'TP1_HIT' | 'TP2_HIT' | 'SL_HIT' | 'CLOSED' | 'TP_HIT';
  statusLabelAr: string;
  openTime: string;
  duration: string;
  pips: number;
  entryPrice: number;
  currentPrice: number;
  tp1: number;
  tp2: number;
  tp3?: number;
  sl: number;
  riskReward: string;
  strategy: string;
  timeframe: string;
  confidence: number;
  notesAr: string;
  notesEn: string;
  textMsg?: string;
  author: string;
  authorRole: string;
  accessLevel: 'free' | 'vip' | 'all';
  access_level: 'free' | 'vip' | 'all';
  isBotSignal?: boolean;
  isBlurredForFree: boolean;
  createdAt: string;
  timestampMs: number;
}

export async function saveSignalToFirestore(signal: Partial<SignalRecord>): Promise<SignalRecord> {
  const signalId = signal.id || `sig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const nowMs = signal.timestampMs || Date.now();
  const createdAt = signal.createdAt || new Date(nowMs).toISOString();

  const isGold = signal.symbol?.includes('XAU') || signal.symbol?.includes('GOLD');
  const isForex = signal.symbol?.includes('EUR') || signal.symbol?.includes('GBP');
  const nameAr = isGold
    ? 'الذهب أونصة'
    : signal.symbol === 'US100'
    ? 'ناسداك 100'
    : isForex
    ? 'اليورو دولار'
    : signal.symbol === 'BTCUSD'
    ? 'البيتكوين'
    : signal.symbol || 'US100';

  const cleanAccess = (signal.accessLevel || signal.access_level || 'free').toLowerCase() as 'free' | 'vip' | 'all';
  const isVip = cleanAccess === 'vip';
  const source = isVip
    ? 'VIP_MANUAL'
    : signal.authorRole === 'ADMIN' && signal.author?.includes('Bot')
    ? 'BOT_WEBHOOK'
    : 'FREE_PUBLIC';

  const sourceLabelAr = source === 'BOT_WEBHOOK' ? 'بوت TradingView Webhook' : isVip ? 'محلل VIP المعتمد' : 'تحليل عام';
  const sourceLabelEn = source === 'BOT_WEBHOOK' ? 'TradingView Bot' : isVip ? 'VIP Certified Analyst' : 'Public Research';

  const entry = Number(signal.entryPrice || 0);
  const tp1 = Number(signal.tp1 || 0);
  const tp2 = Number(signal.tp2 || (tp1 > 0 ? tp1 * 1.01 : 0));
  const tp3 = signal.tp3 !== undefined ? Number(signal.tp3) : undefined;
  const sl = Number(signal.sl || 0);

  const diff = signal.action === 'SELL' ? entry - tp1 : tp1 - entry;
  const pips =
    signal.pips !== undefined
      ? signal.pips
      : Math.abs(isGold ? Math.round(diff * 10) : isForex ? Math.round(diff * 10000) : Math.round(diff));

  const risk = Math.abs(entry - sl);
  const reward = Math.abs((tp3 || tp2) - entry);
  const riskReward = risk > 0 ? `1:${(reward / risk).toFixed(1)}` : '1:2.4';

  const fullSignal: SignalRecord = {
    id: signalId,
    symbol: signal.symbol || 'US100',
    nameAr,
    action: (signal.action || 'BUY').toUpperCase() as 'BUY' | 'SELL',
    orderType: (signal.orderType || signal.action || 'BUY').toUpperCase(),
    type: (signal.type || signal.action || 'BUY').toUpperCase(),
    source: (signal.source as any) || source,
    sourceLabelAr: signal.sourceLabelAr || sourceLabelAr,
    sourceLabelEn: signal.sourceLabelEn || sourceLabelEn,
    status: (signal.status || 'RUNNING') as any,
    statusLabelAr: signal.statusLabelAr || (signal.status === 'RUNNING' ? 'صفقة جارية الآن ⚡' : 'هدف محقق بالكامل 🎯'),
    openTime: signal.openTime || new Date(nowMs).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    duration: signal.duration || 'الآن',
    pips,
    entryPrice: entry,
    currentPrice: Number(signal.currentPrice || entry),
    tp1,
    tp2,
    ...(tp3 !== undefined ? { tp3 } : {}),
    sl,
    riskReward,
    strategy: signal.strategy || 'MBK Institutional Strategy',
    timeframe: signal.timeframe || '15m',
    confidence: signal.confidence || 92,
    notesAr: signal.notesAr || 'إشارة تداول مؤسسية مع تأكيد شروط الدخول وإدارة المخاطر.',
    notesEn: signal.notesEn || 'Institutional trade setup with strict risk parameters.',
    ...(signal.textMsg ? { textMsg: signal.textMsg } : {}),
    author: signal.author || 'MBK Analyst',
    authorRole: signal.authorRole || 'ANALYSER',
    accessLevel: cleanAccess,
    access_level: cleanAccess,
    isBotSignal: signal.isBotSignal !== undefined ? signal.isBotSignal : source === 'BOT_WEBHOOK',
    isBlurredForFree: isVip,
    createdAt,
    timestampMs: nowMs
  };

  // Try Firebase Admin SDK first
  if (adminDb) {
    try {
      await adminDb.collection('signals').doc(signalId).set(fullSignal);
      console.log(`[Firebase Admin SDK] Signal saved: ${signalId}`);
      return fullSignal;
    } catch (err: any) {
      console.warn('[Firebase Admin SDK] Write fallback to Client SDK:', err.message);
    }
  }

  // Fallback to Firebase Client SDK
  const docRef = doc(clientDb, 'signals', signalId);
  await setDoc(docRef, fullSignal);
  console.log(`[Firebase Client SDK] Signal saved: ${signalId}`);
  return fullSignal;
}

export async function getSignalsFromFirestore(limitCount: number = 100): Promise<SignalRecord[]> {
  // Try Firebase Admin SDK first
  if (adminDb) {
    try {
      const snapshot = await adminDb.collection('signals').orderBy('timestampMs', 'desc').limit(limitCount).get();
      if (!snapshot.empty) {
        return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }));
      }
    } catch (err: any) {
      console.warn('[Firebase Admin SDK] Read fallback to Client SDK:', err.message);
    }
  }

  // Fallback to Firebase Client SDK
  const signalsRef = collection(clientDb, 'signals');
  const q = query(signalsRef, orderBy('timestampMs', 'desc'), limit(limitCount));
  const querySnapshot = await getDocs(q);
  const results: SignalRecord[] = [];
  querySnapshot.forEach((docSnap) => {
    results.push({ id: docSnap.id, ...(docSnap.data() as any) });
  });
  return results;
}

export async function deleteSignalFromFirestore(id: string): Promise<boolean> {
  if (adminDb) {
    try {
      await adminDb.collection('signals').doc(id).delete();
      return true;
    } catch (err: any) {
      console.warn('[Firebase Admin SDK] Delete fallback:', err.message);
    }
  }
  await deleteDoc(doc(clientDb, 'signals', id));
  return true;
}

export async function updateSignalStatusInFirestore(
  id: string,
  status: string,
  pips?: number
): Promise<boolean> {
  const updateData: any = { status };
  if (pips !== undefined) updateData.pips = pips;

  if (adminDb) {
    try {
      await adminDb.collection('signals').doc(id).update(updateData);
      return true;
    } catch (err: any) {
      console.warn('[Firebase Admin SDK] Update fallback:', err.message);
    }
  }
  await updateDoc(doc(clientDb, 'signals', id), updateData);
  return true;
}

// Seed initial signals into Firestore if collection has < 3 signals
export async function seedInitialSignalsIfEmpty(): Promise<void> {
  try {
    const existing = await getSignalsFromFirestore(5);
    if (existing.length >= 3) {
      console.log(`[Firestore] Found ${existing.length} existing signals. Seeding not needed.`);
      return;
    }

    console.log('[Firestore] Seeding initial signals to Firestore signals collection...');
    const nowMs = Date.now();

    const seeds: Partial<SignalRecord>[] = [
      {
        id: 'sig-today-1',
        symbol: 'US100',
        action: 'BUY',
        entryPrice: 20875.0,
        tp1: 20950.0,
        tp2: 21040.0,
        sl: 20810.0,
        strategy: 'TradingView Webhook Engine v5.2',
        timeframe: '15m',
        notesAr: 'كسر فني لسيولة القمة وإعادة اختبار خط الفوليوم اللحظي VWAP.',
        notesEn: 'Technical breakout of top liquidity with VWAP retest.',
        author: 'TradingView Webhook Bot',
        authorRole: 'ADMIN',
        accessLevel: 'vip',
        access_level: 'vip',
        status: 'RUNNING',
        pips: 48.5,
        confidence: 94,
        createdAt: new Date(nowMs - 22 * 60 * 1000).toISOString(),
        timestampMs: nowMs - 22 * 60 * 1000
      },
      {
        id: 'sig-today-2',
        symbol: 'XAUUSD',
        action: 'BUY',
        entryPrice: 2682.0,
        tp1: 2690.0,
        tp2: 2698.5,
        sl: 2674.0,
        strategy: 'Institutional Order Block & NY Sweep',
        timeframe: '15m',
        notesAr: 'شراء بعد احترام كتلة الطلب المؤسسية وتراجع عوائد السندات.',
        notesEn: 'Buy off institutional demand block with treasury yields declining.',
        author: 'م. كريم الشامسي',
        authorRole: 'ANALYSER',
        accessLevel: 'vip',
        access_level: 'vip',
        status: 'RUNNING',
        pips: 22.0,
        confidence: 95,
        createdAt: new Date(nowMs - 10 * 60 * 1000).toISOString(),
        timestampMs: nowMs - 10 * 60 * 1000
      },
      {
        id: 'sig-today-3',
        symbol: 'US100',
        action: 'BUY',
        entryPrice: 20890.5,
        tp1: 20960.0,
        tp2: 21050.0,
        sl: 20825.0,
        strategy: 'MBK Scalp Breakout & FVG',
        timeframe: '15m',
        notesAr: 'تم اقتناص كامل الهدف الثاني بنجاح آلي +160 نقطة عبر إشارة Pine Script.',
        notesEn: 'Full TP2 reached successfully for +160 pips.',
        author: 'فريق أبحاث MBK',
        authorRole: 'ADMIN',
        accessLevel: 'free',
        access_level: 'free',
        status: 'TP1_HIT',
        pips: 160.0,
        confidence: 94,
        createdAt: new Date(nowMs - 75 * 60 * 1000).toISOString(),
        timestampMs: nowMs - 75 * 60 * 1000
      },
      {
        id: 'sig-today-4',
        symbol: 'EURUSD',
        action: 'BUY',
        entryPrice: 1.0840,
        tp1: 1.0875,
        tp2: 1.0910,
        sl: 1.0815,
        strategy: 'London Session Liquidity Sweep',
        timeframe: '1h',
        notesAr: 'صفقة عامة: تم سحب سيولة قاع لندن وإعادة اختبار خط 21 EMA.',
        notesEn: 'Public Setup: London low sweep with 21 EMA confirmation.',
        author: 'م. طارق الأحمد',
        authorRole: 'ANALYSER',
        accessLevel: 'free',
        access_level: 'free',
        status: 'RUNNING',
        pips: 35.0,
        confidence: 88,
        createdAt: new Date(nowMs - 35 * 60 * 1000).toISOString(),
        timestampMs: nowMs - 35 * 60 * 1000
      },
      {
        id: 'sig-today-5',
        symbol: 'BTCUSD',
        action: 'BUY',
        entryPrice: 67400.0,
        tp1: 68500.0,
        tp2: 71000.0,
        sl: 66200.0,
        strategy: 'Crypto VIP FVG Suite',
        timeframe: '15m',
        notesAr: 'انطلاق قوي للبيتكوين بعد تجميع السيولة اللحظية فوق الدعم.',
        notesEn: 'Bitcoin breakout after liquidity accumulation.',
        author: 'Crypto VIP Desk',
        authorRole: 'ADMIN',
        accessLevel: 'vip',
        access_level: 'vip',
        status: 'RUNNING',
        pips: 220.0,
        confidence: 93,
        createdAt: new Date(nowMs - 5 * 60 * 1000).toISOString(),
        timestampMs: nowMs - 5 * 60 * 1000
      }
    ];

    for (const seed of seeds) {
      await saveSignalToFirestore(seed);
    }
    console.log('[Firestore] Seeded initial signals successfully!');
  } catch (err: any) {
    console.error('[Firestore] Error seeding initial signals:', err.message);
  }
}

// Seed initial market ideas into Firestore if collection has < 3 documents
export async function seedInitialMarketIdeasIfEmpty(): Promise<void> {
  try {
    let existingCount = 0;
    if (adminDb) {
      try {
        const snap = await adminDb.collection('market_ideas').limit(5).get();
        existingCount = snap.size;
      } catch (err: any) {
        console.warn('[Firestore] Admin SDK check market_ideas notice:', err.message);
      }
    } else {
      const q = query(collection(clientDb, 'market_ideas'), limit(5));
      const snap = await getDocs(q);
      existingCount = snap.size;
    }

    if (existingCount >= 3) {
      console.log(`[Firestore] Found ${existingCount} existing market ideas. Seeding not needed.`);
      return;
    }

    console.log('[Firestore] Seeding initial high-quality market ideas to market_ideas collection...');
    const nowMs = Date.now();

    // Fetch live RSS news items or fallback rich articles
    let fetchedArticles: any[] = [];
    try {
      const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss', {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'ok' && Array.isArray(data.items)) {
          fetchedArticles = data.items.slice(0, 5);
        }
      }
    } catch {
      // fallback to built-in seeds
    }

    const defaultSeedIdeas: any[] = [
      {
        id: 'idea-seed-1',
        title: 'تحليل ناسداك US100: إعادة اختبار منطقة السيولة المؤسسية FVG واستهداف القمة التاريخية',
        content: 'يتحرك مؤشر ناسداك US100 في اتجاه صاعد قوي على الإطار الزمني 4 ساعات. بعد كسر المستوى المقاوم 20,650$ بنجاح، نشهد الآن إعادة اختبار متقنة لمنطقة الفجوة العادلة FVG. يُوصى بالبحث عن إشارات صعود عند 20,720$ مع إيقاف خسارة أسفل 20,580$ واستهداف 21,100$.',
        symbol: 'US100',
        sentiment: 'Bullish',
        chartUrl: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1000&auto=format&fit=crop&q=80',
        authorId: 'desk-1',
        authorName: 'MBK Trading Desk',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        authorRole: 'ADMIN',
        likesCount: 42,
        likedBy: [],
        commentsCount: 1,
        comments: [
          {
            id: 'c1',
            authorName: 'طارق الحربي',
            authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
            authorRole: 'VIP',
            text: 'تحليل ممتاز كالعادة من الديسك! تم الدخول مع اختراق الـ FVG بنجاح.',
            createdAt: 'منذ ساعتين'
          }
        ],
        createdAt: new Date(nowMs - 2 * 3600 * 1000).toISOString(),
        timestampMs: nowMs - 2 * 3600 * 1000
      },
      {
        id: 'idea-seed-2',
        title: 'تحليل الذهب XAUUSD: ارتداد حرج من خط الاتجاه الصاعد وقاع القناة 2,680$',
        content: 'يستقر الذهب بالقرب من حواجز الدعم الرئيسية عند 2,682$. تشير مؤشرات الزخم RSI وجود انحراف إيجابي (Bullish Divergence). سيناريو الصعود يظل قائماً بثبات التداولات أعلى 2,670$ نحو أهداف 2,715$ و 2,740$.',
        symbol: 'XAUUSD',
        sentiment: 'Bullish',
        chartUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1000&auto=format&fit=crop&q=80',
        authorId: 'desk-2',
        authorName: 'MBK Gold Desk',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        authorRole: 'ADMIN',
        likesCount: 58,
        likedBy: [],
        commentsCount: 0,
        comments: [],
        createdAt: new Date(nowMs - 4 * 3600 * 1000).toISOString(),
        timestampMs: nowMs - 4 * 3600 * 1000
      },
      {
        id: 'idea-seed-3',
        title: 'تحليل اليورو مقابل الدولار EURUSD: تصحيح هابط متوقع قبيل اجتماع البنك المركزي الأوروبي',
        content: 'يظهر زوج EURUSD علامات ضعف بعد العجز عن اختراق المقاومة 1.0920. تشكل نموذج القمة المزدوجة (Double Top) يدعم إعادة اختبار الدعم عند 1.0840 ثم 1.0790.',
        symbol: 'EURUSD',
        sentiment: 'Bearish',
        chartUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1000&auto=format&fit=crop&q=80',
        authorId: 'desk-3',
        authorName: 'MBK FX Desk',
        authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        authorRole: 'ADMIN',
        likesCount: 31,
        likedBy: [],
        commentsCount: 0,
        comments: [],
        createdAt: new Date(nowMs - 6 * 3600 * 1000).toISOString(),
        timestampMs: nowMs - 6 * 3600 * 1000
      }
    ];

    if (fetchedArticles.length > 0) {
      fetchedArticles.forEach((art, idx) => {
        const titleLower = (art.title || '').toLowerCase();
        let sentiment = 'Neutral';
        if (titleLower.includes('surge') || titleLower.includes('gain') || titleLower.includes('bull') || titleLower.includes('high')) {
          sentiment = 'Bullish';
        } else if (titleLower.includes('drop') || titleLower.includes('bear') || titleLower.includes('fall') || titleLower.includes('crash')) {
          sentiment = 'Bearish';
        }

        const symbol = titleLower.includes('bitcoin') || titleLower.includes('btc')
          ? 'BTCUSD'
          : titleLower.includes('gold')
          ? 'XAUUSD'
          : titleLower.includes('euro') || titleLower.includes('eur')
          ? 'EURUSD'
          : 'US100';

        const cleanContent = art.description
          ? art.description.replace(/<[^>]*>?/gm, '').slice(0, 300) + '...'
          : art.title;

        defaultSeedIdeas.push({
          id: `idea-rss-${idx}-${nowMs}`,
          title: art.title,
          content: `${cleanContent}\n\nالمصدر الإخباري الأصلي: CoinTelegraph / MBK External Wire`,
          symbol,
          sentiment,
          chartUrl: art.thumbnail || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&auto=format&fit=crop&q=80',
          authorId: 'external-wire',
          authorName: 'MBK Trading Desk (Wire)',
          authorAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          authorRole: 'ADMIN',
          likesCount: 20 + idx * 5,
          likedBy: [],
          commentsCount: 0,
          comments: [],
          createdAt: art.pubDate || new Date(nowMs - (idx + 1) * 3600 * 1000).toISOString(),
          timestampMs: nowMs - (idx + 1) * 3600 * 1000
        });
      });
    }

    for (const idea of defaultSeedIdeas) {
      if (adminDb) {
        try {
          await adminDb.collection('market_ideas').doc(idea.id).set(idea);
        } catch {
          await setDoc(doc(clientDb, 'market_ideas', idea.id), idea);
        }
      } else {
        await setDoc(doc(clientDb, 'market_ideas', idea.id), idea);
      }
    }

    console.log('[Firestore] Seeded market_ideas collection successfully!');
  } catch (err: any) {
    console.error('[Firestore] Error seeding market_ideas:', err.message);
  }
}
