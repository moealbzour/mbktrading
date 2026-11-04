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
const INITIAL_MARKET_IDEAS: MarketIdea[] = [];

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
