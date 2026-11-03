import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MarketIdea, MarketIdeaComment } from '../types/trading';

// Sample fallback ideas for immediate rich content if Firestore is empty
const INITIAL_MARKET_IDEAS: MarketIdea[] = [
  {
    id: 'idea-1',
    title: 'تحليل ناسداك US100: إعادة اختبار منطقة السيولة المؤسسية FVG واستهداف القمة التاريخية',
    content: 'يتحرك مؤشر ناسداك US100 في اتجاه صاعد قوي على الإطار الزمني 4 ساعات. بعد كسر المستوى المقاوم 20,650$ بنجاح، نشهد الآن إعادة اختبار متقنة لمنطقة الفجوة العادلة FVG. يُوصى بالبحث عن إشارات صعود عند 20,720$ مع إيقاف خسارة أسفل 20,580$ واستهداف 21,100$.',
    symbol: 'US100',
    sentiment: 'Bullish',
    chartUrl: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1000&auto=format&fit=crop&q=80',
    authorId: 'admin-1',
    authorName: 'فريق أبحاث MBK (Chief Analyst)',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    authorRole: 'ADMIN',
    likesCount: 38,
    likedBy: [],
    commentsCount: 2,
    comments: [
      {
        id: 'c1',
        authorName: 'طارق الحربي',
        authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        authorRole: 'VIP',
        text: 'تحليل في منتصف الهدف تماماً! دخلت شراء من 20,730$ وحققنا بيبس ممتاز مع افتتاح نيويورك.',
        createdAt: 'منذ ساعتين'
      },
      {
        id: 'c2',
        authorName: 'سارة العتيبي',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        authorRole: 'ANALYSER',
        text: 'ملاحظة ممتازة للـ FVG على الـ 15 دقيقة، تتوافق مع مؤشر السيولة الحجمية.',
        createdAt: 'منذ ساعة'
      }
    ],
    createdAt: 'منذ 3 ساعات',
    timestampMs: Date.now() - 3 * 3600 * 1000
  },
  {
    id: 'idea-2',
    title: 'تحليل الذهب XAUUSD: ارتداد حرج من خط الاتجاه الصاعد وقاع القناة 2,680$',
    content: 'يستقر الذهب بالقرب من حواجز الدعم الرئيسية عند 2,682$. تشير مؤشرات الزخم RSI وجود انحراف إيجابي (Bullish Divergence). سيناريو الصعود يظل قائماً بثبات التداولات أعلى 2,670$ نحو أهداف 2,715$ و 2,740$.',
    symbol: 'XAUUSD',
    sentiment: 'Bullish',
    chartUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1000&auto=format&fit=crop&q=80',
    authorId: 'analyst-2',
    authorName: 'محلل الذهب المعتمد (Gold Specialist)',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorRole: 'ANALYSER',
    likesCount: 52,
    likedBy: [],
    commentsCount: 1,
    comments: [
      {
        id: 'c3',
        authorName: 'خالد الغامدي',
        authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        authorRole: 'VIP',
        text: 'نتطلع لبيانات مؤشر أسعار المستهلك CPI اليوم لتأكيد الكسر.',
        createdAt: 'منذ 45 دقيقة'
      }
    ],
    createdAt: 'منذ 5 ساعات',
    timestampMs: Date.now() - 5 * 3600 * 1000
  },
  {
    id: 'idea-3',
    title: 'تحليل اليورو مقابل الدولار EURUSD: تصحيح هابط متوقع قبيل اجتماع البنك المركزي الأوروبي',
    content: 'يظهر زوج EURUSD علامات ضعف بعد العجز عن اختراق المقاومة 1.0920. تشكل نموذج القمة المزدوجة (Double Top) يدعم إعادة اختبار الدعم عند 1.0840 ثم 1.0790.',
    symbol: 'EURUSD',
    sentiment: 'Bearish',
    chartUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1000&auto=format&fit=crop&q=80',
    authorId: 'vip-3',
    authorName: 'فهد الشمري (Macro Scalper)',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    authorRole: 'VIP',
    likesCount: 24,
    likedBy: [],
    commentsCount: 0,
    comments: [],
    createdAt: 'منذ 8 ساعات',
    timestampMs: Date.now() - 8 * 3600 * 1000
  }
];

export const subscribeToMarketIdeas = (
  callback: (ideas: MarketIdea[]) => void
) => {
  if (!db) {
    callback(INITIAL_MARKET_IDEAS);
    return () => {};
  }

  try {
    const q = query(collection(db, 'market_ideas'), orderBy('timestampMs', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          callback(INITIAL_MARKET_IDEAS);
          return;
        }

        const list: MarketIdea[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || '',
            content: data.content || '',
            symbol: data.symbol || 'US100',
            sentiment: data.sentiment || 'Bullish',
            chartUrl: data.chartUrl || '',
            authorId: data.authorId || '',
            authorName: data.authorName || 'MBK Analyst',
            authorAvatar: data.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            authorRole: data.authorRole || 'FREE',
            likesCount: data.likesCount || 0,
            likedBy: data.likedBy || [],
            commentsCount: data.commentsCount || (data.comments ? data.comments.length : 0),
            comments: data.comments || [],
            createdAt: data.createdAt || 'الآن',
            timestampMs: data.timestampMs || Date.now()
          };
        });

        callback(list);
      },
      (error) => {
        console.warn('Market ideas live listener fallback to mock:', error);
        callback(INITIAL_MARKET_IDEAS);
      }
    );
  } catch (err) {
    console.warn('Market ideas query error:', err);
    callback(INITIAL_MARKET_IDEAS);
    return () => {};
  }
};

export const publishMarketIdeaToFirestore = async (idea: Omit<MarketIdea, 'id' | 'likesCount' | 'likedBy' | 'commentsCount' | 'comments' | 'createdAt' | 'timestampMs'>) => {
  const newIdeaPayload = {
    ...idea,
    likesCount: 0,
    likedBy: [],
    commentsCount: 0,
    comments: [],
    createdAt: 'الآن',
    timestampMs: Date.now()
  };

  if (!db) {
    return { id: `local-${Date.now()}`, ...newIdeaPayload };
  }

  const docRef = await addDoc(collection(db, 'market_ideas'), newIdeaPayload);
  return { id: docRef.id, ...newIdeaPayload };
};

export const toggleLikeMarketIdeaInFirestore = async (
  ideaId: string,
  userId: string,
  currentlyLiked: boolean
) => {
  if (!db || ideaId.startsWith('idea-') || ideaId.startsWith('local-')) return;

  const docRef = doc(db, 'market_ideas', ideaId);
  if (currentlyLiked) {
    await updateDoc(docRef, {
      likedBy: arrayRemove(userId)
    });
  } else {
    await updateDoc(docRef, {
      likedBy: arrayUnion(userId)
    });
  }
};

export const addCommentToMarketIdeaInFirestore = async (
  ideaId: string,
  comment: MarketIdeaComment
) => {
  if (!db || ideaId.startsWith('idea-') || ideaId.startsWith('local-')) return;

  const docRef = doc(db, 'market_ideas', ideaId);
  await updateDoc(docRef, {
    comments: arrayUnion(comment)
  });
};
