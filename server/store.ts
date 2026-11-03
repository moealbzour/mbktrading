import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson<T>(filename: string, defaultVal: T): T {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`[Store] Error reading ${filename}:`, err);
  }
  return defaultVal;
}

function saveJson<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[Store] Error writing ${filename}:`, err);
  }
}

// User Record Interface
export interface UserRecord {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'ADMIN' | 'VIP' | 'ANALYSER' | 'STANDARD';
  display_name: string;
  avatar: string;
  subscription_status: 'active' | 'expired' | 'none';
  subscription_end_date: string | null;
  created_at: string;
}

// Chat Record Interface
export interface ChatRecord {
  id: string;
  user_id: string | null;
  user_name: string;
  avatar: string | null;
  role: string;
  text: string;
  image_url: string | null;
  image_caption: string | null;
  symbol_tag: string | null;
  reply_to_json: string | null;
  is_pinned: number;
  likes: number;
  reactions_json: string | null;
  created_at: string;
  timestamp_ms: number;
}

// News Item Interface
export interface NewsRecord {
  id: string;
  title: string;
  title_ar: string;
  link: string;
  source: string;
  category: string;
  sentiment: string;
  impact: string;
  impact_score: number;
  created_at: string;
}

// Calendar Record Interface
export interface CalendarRecord {
  id: string;
  time: string;
  country: string;
  currency: string;
  event: string;
  event_ar: string;
  impact: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  date: string;
  created_at: string;
}

// Trading Idea Record Interface
export interface IdeaRecord {
  id: string;
  symbol: string;
  title_ar: string;
  title_en: string;
  action: string;
  entry_price: string;
  tp: string;
  sl: string;
  rr: string;
  author: string;
  strategy: string;
  timeframe: string;
  notes: string;
  created_at: string;
  timestamp_ms: number;
}

// Market Analysis Record Interface
export interface AnalysisRecord {
  id: string;
  title: string;
  title_ar: string;
  symbol: string;
  author: string;
  author_role: string;
  content: string;
  content_ar: string;
  sentiment: string;
  target_price: number | null;
  stop_level: number | null;
  chart_url: string | null;
  access_level: string;
  created_at: string;
  timestamp_ms: number;
}

// Initialize Initial Stores with Default Seeds
const now = new Date().toISOString();
const nowMs = Date.now();

const initialUsers: UserRecord[] = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    email: 'admin@mbktrading.live',
    password_hash: bcrypt.hashSync('admin123', 10),
    role: 'ADMIN',
    display_name: 'MBK Chief Admin (المشرف العام)',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    subscription_status: 'active',
    subscription_end_date: '2099-12-31T23:59:59.999Z',
    created_at: now
  },
  {
    id: 'usr-vip-1',
    username: 'vip_trader',
    email: 'vip@mbktrading.live',
    password_hash: bcrypt.hashSync('vip123', 10),
    role: 'VIP',
    display_name: 'م. طارق الأحمد (VIP Trader)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    subscription_status: 'active',
    subscription_end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: now
  },
  {
    id: 'usr-analyser-1',
    username: 'analyst',
    email: 'analyst@mbktrading.live',
    password_hash: bcrypt.hashSync('analyst123', 10),
    role: 'ANALYSER',
    display_name: 'م. كريم الشامسي (Senior Market Analyser)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    subscription_status: 'active',
    subscription_end_date: '2099-12-31T23:59:59.999Z',
    created_at: now
  },
  {
    id: 'usr-trader-1',
    username: 'trader',
    email: 'trader@mbktrading.live',
    password_hash: bcrypt.hashSync('trader123', 10),
    role: 'STANDARD',
    display_name: 'سامي الحجازي (Standard Member)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    subscription_status: 'none',
    subscription_end_date: null,
    created_at: now
  }
];

const initialChatMessages: ChatRecord[] = [
  {
    id: 'msg-init-pin',
    user_id: 'usr-admin-1',
    user_name: 'MBK Chief Admin',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    role: 'ADMIN',
    text: 'مرحباً بجميع متداولي المنصة! نرحب بكم في غرفة التداول الحية لمنصة MBK Institutional Trading. تم ربط التداولات الحية مباشرة مع Firestore. يرجى الالتزام بإدارة المخاطر وتجنب التداول وقت الأخبار الحساسة بدون وقف خسارة.',
    image_url: null,
    image_caption: null,
    symbol_tag: 'ALL',
    reply_to_json: null,
    is_pinned: 1,
    likes: 24,
    reactions_json: JSON.stringify({ '🔥': 14, '🚀': 8, '👏': 2 }),
    created_at: new Date(nowMs - 60 * 60 * 1000).toISOString(),
    timestamp_ms: nowMs - 60 * 60 * 1000
  },
  {
    id: 'msg-init-2',
    user_id: 'usr-analyser-1',
    user_name: 'كريم الشامسي (Senior Analyser)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'ANALYST',
    text: 'الذهب XAUUSD يتداول حالياً عند منطقة طلب قوية، ننتظر كسر قمة الـ 15 دقيقة لتفعيل إشارة شراء سريعة باتجاه 2,750$',
    image_url: null,
    image_caption: null,
    symbol_tag: 'XAUUSD',
    reply_to_json: null,
    is_pinned: 0,
    likes: 12,
    reactions_json: JSON.stringify({ '👍': 7, '🎯': 5 }),
    created_at: new Date(nowMs - 35 * 60 * 1000).toISOString(),
    timestamp_ms: nowMs - 35 * 60 * 1000
  },
  {
    id: 'msg-init-3',
    user_id: 'usr-vip-1',
    user_name: 'طارق الأحمد',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'VIP',
    text: 'تم تحقيق الهدف الأول لصفقة ناسداك US100 بفضل الله (+55 نقطة) وتم نقل وقف الخسارة إلى الدخول ✅',
    image_url: null,
    image_caption: null,
    symbol_tag: 'US100',
    reply_to_json: null,
    is_pinned: 0,
    likes: 19,
    reactions_json: JSON.stringify({ '🔥': 11, '💚': 8 }),
    created_at: new Date(nowMs - 12 * 60 * 1000).toISOString(),
    timestamp_ms: nowMs - 12 * 60 * 1000
  }
];

const initialNews: NewsRecord[] = [
  {
    id: 'news-init-1',
    title: 'Fed Chair Powell Signals Measured Rate Cuts as Labor Market Rebalances',
    title_ar: 'رئيس الفيدرالي باول يشير لخفض مدروس في الفائدة مع توازن سوق العمل الأمريكي',
    link: 'https://www.reuters.com/markets',
    source: 'Reuters Financial',
    category: 'البنوك المركزية',
    sentiment: 'BULLISH',
    impact: 'HIGH',
    impact_score: 3,
    created_at: new Date(nowMs - 10 * 60 * 1000).toISOString()
  },
  {
    id: 'news-init-2',
    title: 'Gold Touches Record Highs on Institutional Safe-Haven Inflows',
    title_ar: 'الذهب يلامس مستويات تاريخية جديدة مدفوعاً بتدفقات التحوط وصناديق الاستثمار',
    link: 'https://www.bloomberg.com/markets',
    source: 'Bloomberg Terminal',
    category: 'السلع والمعادن',
    sentiment: 'BULLISH',
    impact: 'HIGH',
    impact_score: 3,
    created_at: new Date(nowMs - 25 * 60 * 1000).toISOString()
  },
  {
    id: 'news-init-3',
    title: 'US Tech Equities Lead Nasdaq Rally Following Strong AI Earnings Guidance',
    title_ar: 'مؤشر ناسداك يقود الارتفاعات الأمريكية بدعم من نتائج وتوقعات قطاع الذكاء الاصطناعي',
    link: 'https://www.cnbc.com/markets',
    source: 'CNBC Pro',
    category: 'الأسهم الأمريكية',
    sentiment: 'BULLISH',
    impact: 'MEDIUM',
    impact_score: 2,
    created_at: new Date(nowMs - 50 * 60 * 1000).toISOString()
  }
];

const initialCalendar: CalendarRecord[] = [
  {
    id: 'cal-init-1',
    time: '15:30',
    country: 'USD',
    currency: 'USD',
    event: 'Core PCE Price Index (MoM)',
    event_ar: 'مؤشر أسعار نفقات الاستهلاك الشخصي الأساسي الأمريكي',
    impact: 'HIGH',
    actual: '0.3%',
    forecast: '0.2%',
    previous: '0.2%',
    date: new Date().toISOString().split('T')[0],
    created_at: now
  },
  {
    id: 'cal-init-2',
    time: '17:00',
    country: 'USD',
    currency: 'USD',
    event: 'ISM Manufacturing PMI',
    event_ar: 'مؤشر مديري المشتريات الصناعي الصادر عن معهد إدارة التوريدات',
    impact: 'HIGH',
    actual: '49.1',
    forecast: '48.5',
    previous: '47.4',
    date: new Date().toISOString().split('T')[0],
    created_at: now
  },
  {
    id: 'cal-init-3',
    time: '21:00',
    country: 'USD',
    currency: 'USD',
    event: 'FOMC Meeting Minutes',
    event_ar: 'محضر اجتماع اللجنة الفيدرالية للسوق المفتوحة',
    impact: 'HIGH',
    actual: null,
    forecast: null,
    previous: null,
    date: new Date().toISOString().split('T')[0],
    created_at: now
  }
];

const initialIdeas: IdeaRecord[] = [
  {
    id: 'idea-init-1',
    symbol: 'US100',
    title_ar: 'اختراق صاعد لمؤشر ناسداك فوق 20,850$',
    title_en: 'Bullish Breakout Idea on US100 Above 20,850$',
    action: 'BUY',
    entry_price: '20,810.00',
    tp: '21,150.00',
    sl: '20,680.00',
    rr: '1:2.8',
    author: 'MBK AI Algo Engine',
    strategy: 'MBK Scalp Breakout',
    timeframe: '15m',
    notes: 'اختراق مستوى السيولة اليومي مع إعادة اختبار الدعم.',
    created_at: new Date(nowMs - 15 * 60 * 1000).toISOString(),
    timestamp_ms: nowMs - 15 * 60 * 1000
  },
  {
    id: 'idea-init-2',
    symbol: 'XAUUSD',
    title_ar: 'استمرار الاتجاه الصاعد للذهب نحو 2,750$',
    title_en: 'Gold Bullish Trend Continuation towards $2,750',
    action: 'BUY',
    entry_price: '2,682.00',
    tp: '2,750.00',
    sl: '2,668.00',
    rr: '1:2.5',
    author: 'Precious Metals Desk',
    strategy: 'Institutional Order Block',
    timeframe: '1h',
    notes: 'دخول فوري من كتلة الأوامر بعد سحب سيولة قاع لندن.',
    created_at: new Date(nowMs - 10 * 60 * 1000).toISOString(),
    timestamp_ms: nowMs - 10 * 60 * 1000
  },
  {
    id: 'idea-init-3',
    symbol: 'BTCUSD',
    title_ar: 'انطلاق البيتكوين صوب مستويات 72,000$',
    title_en: 'Bitcoin Surge Rally Targeting $72,000',
    action: 'BUY',
    entry_price: '67,400.00',
    tp: '72,000.00',
    sl: '65,200.00',
    rr: '1:3.5',
    author: 'Crypto VIP AI',
    strategy: 'Alligator FVG Suite',
    timeframe: '15m',
    notes: 'تأكيد الشراء بعد تجميع السيولة اللحظية فوق الدعم.',
    created_at: new Date(nowMs - 5 * 60 * 1000).toISOString(),
    timestamp_ms: nowMs - 5 * 60 * 1000
  },
  {
    id: 'idea-init-4',
    symbol: 'EURUSD',
    title_ar: 'فرصة بيع ارتدادية لليورو من خط المقاومة',
    title_en: 'EURUSD Short Setup off Resistance Level',
    action: 'SELL',
    entry_price: '1.0845',
    tp: '1.0780',
    sl: '1.0880',
    rr: '1:2.0',
    author: 'FX Forex Macro Engine',
    strategy: 'London Liquidity Sweep',
    timeframe: '30m',
    notes: 'ارتداد هبوطي من منطقة المقاومة الفنية.',
    created_at: new Date(nowMs - 30 * 60 * 1000).toISOString(),
    timestamp_ms: nowMs - 30 * 60 * 1000
  }
];

const initialAnalysis: AnalysisRecord[] = [
  {
    id: 'ana-init-1',
    title: 'Nasdaq US100 Technical Roadmap Q2 2026',
    title_ar: 'خارطة طريق مؤشر ناسداك US100 الفنية والمستويات المحورية',
    symbol: 'US100',
    author: 'م. كريم الشامسي',
    author_role: 'Senior Market Analyser',
    content: 'The index continues its bullish momentum above key EMA support levels, targeting 21,200 as primary upside objective.',
    content_ar: 'يواصل مؤشر ناسداك مساره الصاعد مدعوماً بتماسك السيولة فوق 20,800 نقطة، ويستهدف 21,200 كنقطة محورية.',
    sentiment: 'BULLISH',
    target_price: 21200,
    stop_level: 20600,
    chart_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
    access_level: 'free',
    created_at: new Date(nowMs - 45 * 60 * 1000).toISOString(),
    timestamp_ms: nowMs - 45 * 60 * 1000
  }
];

// Memory Stores loaded from JSON
let users: UserRecord[] = loadJson('users.json', initialUsers);
let chatMessages: ChatRecord[] = loadJson('chat_messages.json', initialChatMessages);
let newsItems: NewsRecord[] = loadJson('news_items.json', initialNews);
let calendarEvents: CalendarRecord[] = loadJson('calendar_events.json', initialCalendar);
let tradingIdeas: IdeaRecord[] = loadJson('trading_ideas.json', initialIdeas);
let marketAnalysis: AnalysisRecord[] = loadJson('market_analysis.json', initialAnalysis);

// Export store accessors
export const store = {
  users: {
    getAll(): UserRecord[] {
      return [...users];
    },
    getById(id: string): UserRecord | undefined {
      return users.find((u) => u.id === id);
    },
    findByUsernameOrEmail(identifier: string): UserRecord | undefined {
      const clean = identifier.trim().toLowerCase();
      return users.find((u) => u.username.toLowerCase() === clean || (u.email && u.email.toLowerCase() === clean));
    },
    insert(user: UserRecord): UserRecord {
      users.push(user);
      saveJson('users.json', users);
      return user;
    },
    update(id: string, partial: Partial<UserRecord>): UserRecord | undefined {
      const idx = users.findIndex((u) => u.id === id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...partial };
        saveJson('users.json', users);
        return users[idx];
      }
      return undefined;
    },
    delete(id: string): boolean {
      const prevLen = users.length;
      users = users.filter((u) => u.id !== id);
      if (users.length !== prevLen) {
        saveJson('users.json', users);
        return true;
      }
      return false;
    }
  },

  chat: {
    getAll(): ChatRecord[] {
      return [...chatMessages].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    },
    getById(id: string): ChatRecord | undefined {
      return chatMessages.find((m) => m.id === id);
    },
    insert(msg: ChatRecord): ChatRecord {
      chatMessages.push(msg);
      // Keep up to 500 messages in memory
      if (chatMessages.length > 500) {
        chatMessages = chatMessages.slice(-500);
      }
      saveJson('chat_messages.json', chatMessages);
      return msg;
    },
    updateReactions(id: string, reactionsJson: string, likes: number): ChatRecord | undefined {
      const msg = chatMessages.find((m) => m.id === id);
      if (msg) {
        msg.reactions_json = reactionsJson;
        msg.likes = likes;
        saveJson('chat_messages.json', chatMessages);
        return msg;
      }
      return undefined;
    },
    pin(id: string, isPinned: boolean): ChatRecord | undefined {
      if (isPinned) {
        chatMessages.forEach((m) => {
          m.is_pinned = 0;
        });
      }
      const msg = chatMessages.find((m) => m.id === id);
      if (msg) {
        msg.is_pinned = isPinned ? 1 : 0;
        saveJson('chat_messages.json', chatMessages);
        return msg;
      }
      return undefined;
    },
    delete(id: string): boolean {
      const prevLen = chatMessages.length;
      chatMessages = chatMessages.filter((m) => m.id !== id);
      if (chatMessages.length !== prevLen) {
        saveJson('chat_messages.json', chatMessages);
        return true;
      }
      return false;
    }
  },

  news: {
    getAll(): NewsRecord[] {
      return [...newsItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    getById(id: string): NewsRecord | undefined {
      return newsItems.find((n) => n.id === id);
    },
    insert(item: NewsRecord): NewsRecord {
      newsItems.unshift(item);
      saveJson('news_items.json', newsItems);
      return item;
    },
    update(id: string, partial: Partial<NewsRecord>): NewsRecord | undefined {
      const idx = newsItems.findIndex((n) => n.id === id);
      if (idx !== -1) {
        newsItems[idx] = { ...newsItems[idx], ...partial };
        saveJson('news_items.json', newsItems);
        return newsItems[idx];
      }
      return undefined;
    },
    delete(id: string): boolean {
      const prevLen = newsItems.length;
      newsItems = newsItems.filter((n) => n.id !== id);
      if (newsItems.length !== prevLen) {
        saveJson('news_items.json', newsItems);
        return true;
      }
      return false;
    }
  },

  calendar: {
    getAll(): CalendarRecord[] {
      return [...calendarEvents];
    },
    getById(id: string): CalendarRecord | undefined {
      return calendarEvents.find((c) => c.id === id);
    },
    insert(event: CalendarRecord): CalendarRecord {
      calendarEvents.push(event);
      saveJson('calendar_events.json', calendarEvents);
      return event;
    },
    update(id: string, partial: Partial<CalendarRecord>): CalendarRecord | undefined {
      const idx = calendarEvents.findIndex((c) => c.id === id);
      if (idx !== -1) {
        calendarEvents[idx] = { ...calendarEvents[idx], ...partial };
        saveJson('calendar_events.json', calendarEvents);
        return calendarEvents[idx];
      }
      return undefined;
    },
    delete(id: string): boolean {
      const prevLen = calendarEvents.length;
      calendarEvents = calendarEvents.filter((c) => c.id !== id);
      if (calendarEvents.length !== prevLen) {
        saveJson('calendar_events.json', calendarEvents);
        return true;
      }
      return false;
    }
  },

  ideas: {
    getAll(): IdeaRecord[] {
      return [...tradingIdeas].sort((a, b) => b.timestamp_ms - a.timestamp_ms);
    },
    getBySymbol(symbol: string): IdeaRecord[] {
      const clean = symbol.toUpperCase();
      return tradingIdeas
        .filter((i) => i.symbol.toUpperCase().includes(clean) || clean.includes(i.symbol.toUpperCase()))
        .sort((a, b) => b.timestamp_ms - a.timestamp_ms);
    },
    insert(idea: IdeaRecord): IdeaRecord {
      tradingIdeas.unshift(idea);
      saveJson('trading_ideas.json', tradingIdeas);
      return idea;
    },
    delete(id: string): boolean {
      const prevLen = tradingIdeas.length;
      tradingIdeas = tradingIdeas.filter((i) => i.id !== id);
      if (tradingIdeas.length !== prevLen) {
        saveJson('trading_ideas.json', tradingIdeas);
        return true;
      }
      return false;
    }
  },

  analysis: {
    getAll(): AnalysisRecord[] {
      return [...marketAnalysis].sort((a, b) => b.timestamp_ms - a.timestamp_ms);
    },
    insert(item: AnalysisRecord): AnalysisRecord {
      marketAnalysis.unshift(item);
      saveJson('market_analysis.json', marketAnalysis);
      return item;
    },
    delete(id: string): boolean {
      const prevLen = marketAnalysis.length;
      marketAnalysis = marketAnalysis.filter((a) => a.id !== id);
      if (marketAnalysis.length !== prevLen) {
        saveJson('market_analysis.json', marketAnalysis);
        return true;
      }
      return false;
    }
  }
};
