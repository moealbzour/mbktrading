import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Crown,
  Sparkles,
  Heart,
  RefreshCw,
  Image as ImageIcon,
  Paperclip,
  X,
  Maximize2,
  Minimize2,
  Check,
  CheckCheck,
  Pin,
  Smile,
  Reply,
  Search,
  Download,
  ShieldCheck,
  Flame,
  ThumbsUp,
  Rocket,
  Target,
  ExternalLink,
  ChevronDown,
  Trash2,
  Radio
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { soundManager } from '../../utils/audio';

export interface ChatReplyTo {
  id: string;
  user: string;
  text: string;
  imageUrl?: string;
}

export interface ChatMessageItem {
  id: string;
  user: string;
  avatar: string;
  role: 'VIP' | 'FREE' | 'ANALYST' | 'ADMIN';
  text: string;
  imageUrl?: string;
  imageCaption?: string;
  time: string;
  likes: number;
  reactions?: Record<string, number>;
  symbolTag?: string;
  replyTo?: ChatReplyTo;
  isPinned?: boolean;
}

interface Props {
  currentUserName?: string;
  isVIP: boolean;
  userRole?: string;
  isAdmin?: boolean;
  lang?: 'ar' | 'en';
  isCompact?: boolean;
}

// Preset Analyst Chart Templates for 1-click admin sharing
const PRESET_ADMIN_CHARTS = [
  {
    nameAr: 'شارت الذهب 4H - كسر واختبار',
    nameEn: 'XAUUSD 4H Breakout Retest',
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1000&auto=format&fit=crop&q=80',
    caption: 'تحليل فني: كسر المقاومة 2,684$ وثبات أعلى خط الاتجاه الصاعد 🎯'
  },
  {
    nameAr: 'شارت الناسداك 15M - منطقة FVG',
    nameEn: 'US100 15M FVG Execution',
    url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1000&auto=format&fit=crop&q=80',
    caption: 'مناطق السيولة المؤسسية لـ US100 في افتتاح نيويورك'
  },
  {
    nameAr: 'شارت البيتكوين - نموذج العلم الصاعد',
    nameEn: 'BTCUSD Bull Flag Pattern',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&auto=format&fit=crop&q=80',
    caption: 'تجميع الحيتان واختراق المقاومة النفسية'
  }
];

const EMOJI_LIST = ['🔥', '❤️', '🚀', '🎯', '👍', '📉'];

export const PublicTradingChat: React.FC<Props> = ({
  currentUserName = 'Trader',
  isVIP = false,
  userRole = 'FREE',
  isAdmin = false,
  lang = 'ar',
  isCompact = false
}) => {
  const isAr = lang === 'ar';

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessageItem | null>(null);
  // Real live connected count: default to 1 (current developer/user)
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [inputText, setInputText] = useState('');
  const [activeSymbolFilter, setActiveSymbolFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Admin permission state
  const [adminMode, setAdminMode] = useState<boolean>(() => {
    return isAdmin || userRole === 'ADMIN' || localStorage.getItem('mbk_chat_admin_mode') === 'true';
  });

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState<string>('');
  const [showPresetModal, setShowPresetModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTypePopupOpen, setIsTypePopupOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isTypePopupOpen) {
      const timer = setTimeout(() => {
        popupTextareaRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isTypePopupOpen]);

  // Active reply state (like WhatsApp)
  const [replyingTo, setReplyingTo] = useState<ChatMessageItem | null>(null);

  // Full-screen image lightbox modal
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string; user?: string } | null>(null);

  // Reaction picker hover state
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState<number>(0);

  const socketRef = useRef<Socket | null>(null);
  const isCurrentAdmin = adminMode || isAdmin || userRole === 'ADMIN';

  // Toggle admin test mode
  const handleToggleAdminMode = () => {
    soundManager.playClick();
    const next = !adminMode;
    setAdminMode(next);
    localStorage.setItem('mbk_chat_admin_mode', String(next));
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
      setShowScrollBottom(false);
      setNewMessagesWhileScrolled(0);
    }
  };

  // Connect to Socket.io on mount
  useEffect(() => {
    // Initial fetch from SQLite database API
    const fetchInitialData = async () => {
      try {
        const res = await fetch('/api/community/chat');
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages);
          }
          if (data.pinnedMessage) {
            setPinnedMessage(data.pinnedMessage);
          }
          if (typeof data.onlineCount === 'number') {
            setOnlineCount(data.onlineCount);
          }
        }
      } catch (err) {
        console.warn('Initial chat fetch notice:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Initialize Socket.io client
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketConnected(true);
      socket.emit('join_chat');
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    // Real Online Count received from Socket.io server
    socket.on('online_count', ({ onlineCount: realCount }: { onlineCount: number }) => {
      if (typeof realCount === 'number' && realCount >= 1) {
        setOnlineCount(realCount);
      }
    });

    // Chat history from SQLite
    socket.on('chat_history', (data: { messages: ChatMessageItem[]; onlineCount: number }) => {
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
        const pinned = data.messages.find(m => m.isPinned);
        if (pinned) setPinnedMessage(pinned);
      }
      if (typeof data.onlineCount === 'number') {
        setOnlineCount(data.onlineCount);
      }
      setLoading(false);
    });

    // Real-time new message broadcast
    socket.on('new_message', (newMsg: ChatMessageItem) => {
      setMessages((prev) => {
        // Avoid duplicate optimistic updates
        if (prev.some(m => m.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg];
      });

      if (newMsg.isPinned) {
        setPinnedMessage(newMsg);
      }

      soundManager.playClick();
    });

    // Real-time reaction update
    socket.on('message_reaction', ({ messageId, reactions, likes }: { messageId: string; reactions: Record<string, number>; likes: number }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            return { ...m, reactions, likes };
          }
          return m;
        })
      );
    });

    // Real-time pin update
    socket.on('message_pinned', ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            return { ...m, isPinned };
          }
          return isPinned ? { ...m, isPinned: false } : m;
        })
      );
      if (isPinned) {
        setMessages((prev) => {
          const found = prev.find(m => m.id === messageId);
          if (found) setPinnedMessage(found);
          return prev;
        });
      } else {
        setPinnedMessage(null);
      }
    });

    // Real-time message deletion
    socket.on('message_deleted', ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter(m => m.id !== id));
      setPinnedMessage((current) => (current && current.id === id ? null : current));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom || messages.length <= 10) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        setShowScrollBottom(false);
        setNewMessagesWhileScrolled(0);
      } else {
        setNewMessagesWhileScrolled(prev => prev + 1);
      }
    }
  }, [messages.length]);

  const handleMessagesScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isUp);
    if (!isUp) {
      setNewMessagesWhileScrolled(0);
    }
  };

  // Handle local image file upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(isAr ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert(isAr ? 'حجم الصورة كبير جداً (أقصى حد 8 ميجابايت)' : 'Image too large (max 8MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSelectedImage(result);
        soundManager.playClick();
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if ((!textToSend && !selectedImage) || isSending) return;

    try {
      setIsSending(true);
      soundManager.playClick();

      const detectedTag = textToSend.includes('US100')
        ? 'US100'
        : textToSend.includes('XAU') || textToSend.includes('الذهب')
        ? 'XAUUSD'
        : textToSend.includes('EUR')
        ? 'EURUSD'
        : textToSend.includes('BTC')
        ? 'BTCUSD'
        : undefined;

      const userRoleToSend = isCurrentAdmin ? 'ADMIN' : isVIP ? 'VIP' : 'FREE';

      const payload = {
        user: isCurrentAdmin ? `${currentUserName} (مشرف 👑)` : currentUserName,
        text: textToSend,
        role: userRoleToSend,
        imageUrl: selectedImage || undefined,
        imageCaption: imageCaption.trim() || undefined,
        symbolTag: detectedTag,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              user: replyingTo.user,
              text: replyingTo.text ? replyingTo.text.slice(0, 60) : (isAr ? '[صورة تحليل فني]' : '[Chart Image]'),
              imageUrl: replyingTo.imageUrl
            }
          : undefined
      };

      // Emit directly through real-time Socket.io
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('chat_message', payload);
      } else {
        // Fallback to SQLite REST API
        await fetch('/api/community/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setInputText('');
      setSelectedImage(null);
      setImageCaption('');
      setReplyingTo(null);
      setIsTypePopupOpen(false);
      soundManager.playProfitChime();
    } catch (err) {
      console.warn('Send message error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
    soundManager.playClick();
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('react_message', { messageId, emoji });
    } else {
      fetch('/api/community/chat/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji })
      });
    }
    setShowEmojiPickerFor(null);
  };

  const handlePinMessage = (messageId: string) => {
    if (!isCurrentAdmin) return;
    soundManager.playClick();
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('pin_message', { messageId, isPinned: true });
    } else {
      fetch('/api/community/chat/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, isPinned: true })
      });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!isCurrentAdmin) return;
    soundManager.playClick();
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('delete_message', { messageId });
    } else {
      fetch(`/api/community/chat/${messageId}`, { method: 'DELETE' });
    }
  };

  const filtered = messages.filter((m) => {
    if (activeSymbolFilter !== 'ALL' && m.symbolTag !== activeSymbolFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = m.text.toLowerCase().includes(q);
      const matchUser = m.user.toLowerCase().includes(q);
      const matchTag = m.symbolTag?.toLowerCase().includes(q);
      if (!matchText && !matchUser && !matchTag) return false;
    }
    return true;
  });

  return (
    <div
      className="h-full w-full flex-1 min-h-0 flex flex-col overflow-hidden relative select-none bg-[#1e222d]"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Hidden file input for image uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* 1. ROOM HEADER (Real Live SQLite & Socket.io Status) */}
      <div className={`border-b border-[#2a2e39] bg-[#131722]/95 flex items-center justify-between gap-1.5 shrink-0 ${
        isCompact ? 'px-2 py-2' : 'px-3 py-2.5 sm:py-3'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#089981]/15 border border-[#089981]/40 flex items-center justify-center text-[#089981] shadow-sm shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className={`font-bold text-white flex items-center gap-1 truncate ${
                isCompact ? 'text-xs' : 'text-xs sm:text-sm'
              }`}>
                <span>{isAr ? 'شات تداول MBK المباشر' : 'MBK Realtime Community'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping shrink-0" />
              </h2>

              {!isCompact && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/40 flex items-center gap-0.5 shrink-0">
                  <Radio className="w-2.5 h-2.5" />
                  <span>SQLITE & WEBSOCKET</span>
                </span>
              )}
            </div>

            {/* REAL ONLINE COUNT (No fake Math.sin, strictly live socket connections) */}
            <p className="text-[10px] text-[#787b86] flex items-center gap-1.5 truncate">
              <span className="text-[#089981] font-bold">●</span>
              <span className="font-semibold text-[#089981]">
                {onlineCount} {isAr ? 'متصل حالياً' : 'online now'}
              </span>
              <span className="text-[#434651]">•</span>
              <span className="text-[#9db2ce]">
                {isSocketConnected ? (isAr ? 'بث متصل (Live)' : 'Live WebSocket') : (isAr ? 'جاري الاتصال...' : 'Connecting...')}
              </span>
            </p>
          </div>
        </div>

        {/* Right Tools: Admin Mode Toggle + Asset Filter */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Admin Role Toggle */}
          <button
            onClick={handleToggleAdminMode}
            className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border shrink-0 ${
              isCurrentAdmin
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-[#1e222d] text-[#787b86] hover:text-white border-[#2a2e39]'
            }`}
            title={isAr ? 'تفعيل وضع المشرف لمشاركة الصور والشارتات' : 'Toggle Admin permissions'}
          >
            <Crown className="w-3 h-3 text-amber-400" />
            <span className={isCompact ? 'text-[9px]' : 'hidden sm:inline'}>
              {isAr ? (isCurrentAdmin ? 'وضع المشرف 👑' : 'تفعيل المشرف') : (isCurrentAdmin ? 'Admin' : 'Role')}
            </span>
          </button>

          {/* Quick Asset Filters */}
          {!isCompact && (
            <div className="flex items-center gap-0.5 bg-[#1e222d] p-0.5 rounded-lg border border-[#2a2e39] text-[10px] font-mono">
              {['ALL', 'XAUUSD', 'US100'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => setActiveSymbolFilter(sym)}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    activeSymbolFilter === sym
                      ? 'bg-white text-[#131722] font-bold shadow-sm'
                      : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  {sym === 'ALL' ? (isAr ? 'الكل' : 'ALL') : sym}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PINNED ANNOUNCEMENT BANNER */}
      {pinnedMessage && (
        <div className="bg-[#1e222d] border-b border-[#2a2e39] px-2.5 py-1.5 flex items-center justify-between text-xs text-amber-300/90 gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Pin className="w-2.5 h-2.5 rotate-45" />
            </div>
            <div className="min-w-0 flex items-baseline gap-1">
              <span className="text-[10px] font-bold text-amber-400 whitespace-nowrap">
                {isAr ? 'مثبت:' : 'Pinned:'}
              </span>
              <span className="text-[11px] text-[#d1d4dc] truncate">
                {pinnedMessage.text}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              if (pinnedMessage.imageUrl) {
                setLightboxImage({ url: pinnedMessage.imageUrl, caption: pinnedMessage.imageCaption, user: pinnedMessage.user });
              }
            }}
            className="text-[10px] font-bold text-[#089981] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isAr ? 'عرض' : 'View'}
          </button>
        </div>
      )}

      {/* 2. LIVE MESSAGES STREAM (SQLite Backed) */}
      <div
        ref={scrollRef}
        onScroll={handleMessagesScroll}
        className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 space-y-2.5 bg-[#131722]/50 bg-repeat overscroll-contain relative scroll-smooth"
        style={{
          backgroundImage: 'radial-gradient(#2a2e39 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px'
        }}
      >
        {loading && messages.length === 0 ? (
          <div className="text-center py-16 text-[#787b86] text-xs font-mono animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#089981]" />
            <span>{isAr ? 'جاري الاتصال بقاعدة بيانات SQLite وشبكة WebSockets...' : 'Connecting to live database stream...'}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#787b86] text-xs bg-[#1e222d]/60 rounded-xl border border-[#2a2e39] p-4 max-w-sm mx-auto">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#089981] opacity-60" />
            <p className="font-bold text-white mb-1">{isAr ? 'لا توجد رسائل مطابقة' : 'No messages found'}</p>
            <p className="text-[11px]">{isAr ? 'كن أول من يشارك تحليلاً أو سؤالاً في غرفة التداول!' : 'Be the first to post a market setup or thought!'}</p>
          </div>
        ) : (
          filtered.map((msg) => {
            const isMe = msg.user.includes(currentUserName) || msg.user === currentUserName;
            const isAdminOrAnalyst = msg.role === 'ADMIN' || msg.role === 'ANALYST';

            return (
              <div
                key={msg.id}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => {
                  setHoveredMessageId(null);
                  setShowEmojiPickerFor(null);
                }}
                className={`flex flex-col relative group ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Floating Quick Action Bar (Reply + React + Delete) */}
                <div
                  className={`absolute -top-3 z-20 flex items-center gap-1 bg-[#1e222d] border border-[#2a2e39] px-1.5 py-0.5 rounded-full shadow-lg transition-opacity ${
                    hoveredMessageId === msg.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  } ${isMe ? 'start-2' : 'end-2'}`}
                >
                  <button
                    onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                    className="p-1 hover:bg-[#2a2e39] rounded-full text-[#787b86] hover:text-white transition-colors cursor-pointer"
                    title={isAr ? 'تفاعل بإيموجي' : 'React with emoji'}
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setReplyingTo(msg);
                    }}
                    className="p-1 hover:bg-[#2a2e39] rounded-full text-[#787b86] hover:text-white transition-colors cursor-pointer"
                    title={isAr ? 'رد على الرسالة' : 'Reply to message'}
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>

                  {isCurrentAdmin && (
                    <>
                      <button
                        onClick={() => handlePinMessage(msg.id)}
                        className="p-1 hover:bg-[#2a2e39] rounded-full text-[#787b86] hover:text-amber-400 transition-colors cursor-pointer"
                        title={isAr ? 'تثبيت الرسالة' : 'Pin message'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 hover:bg-[#f23645]/20 rounded-full text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer"
                        title={isAr ? 'حذف من قاعدة البيانات' : 'Delete message'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Floating Emoji Picker Popover */}
                {showEmojiPickerFor === msg.id && (
                  <div
                    className={`absolute -top-10 z-30 bg-[#131722] border border-[#2a2e39] rounded-full px-2 py-1 flex items-center gap-1.5 shadow-2xl animate-fade-in ${
                      isMe ? 'start-2' : 'end-2'
                    }`}
                  >
                    {EMOJI_LIST.map((em) => (
                      <button
                        key={em}
                        onClick={() => handleReact(msg.id, em)}
                        className="text-sm hover:scale-125 transition-transform cursor-pointer p-0.5"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-2.5 sm:p-3 text-xs leading-relaxed transition-all shadow-md relative ${
                    isMe
                      ? 'bg-gradient-to-br from-[#1e2e28] to-[#16231f] border border-[#089981]/40 text-[#e1e4ea] rounded-ee-sm'
                      : isAdminOrAnalyst
                      ? 'bg-gradient-to-br from-[#1e222d] to-[#1a1e29] border border-amber-500/35 text-white rounded-es-sm shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
                      : 'bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] rounded-es-sm'
                  }`}
                >
                  {/* QUOTED REPLY BLOCK */}
                  {msg.replyTo && (
                    <div className="mb-2 p-1.5 rounded-lg bg-[#131722]/80 border-s-4 border-[#089981] text-[11px] text-[#787b86] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-[#089981] block truncate">{msg.replyTo.user}</span>
                        <span className="truncate block text-white/80">{msg.replyTo.text}</span>
                      </div>
                      {msg.replyTo.imageUrl && (
                        <img
                          src={msg.replyTo.imageUrl}
                          alt="Thumbnail"
                          className="w-8 h-8 rounded object-cover shrink-0 border border-[#2a2e39]"
                        />
                      )}
                    </div>
                  )}

                  {/* Header: User Info + Role Badges */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={msg.avatar}
                        alt={msg.user}
                        className="w-5 h-5 rounded-full object-cover border border-[#363a45] shrink-0"
                      />
                      <span className="font-bold text-white text-[11px] sm:text-xs truncate">{msg.user}</span>

                      {msg.role === 'ADMIN' && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-amber-500 text-black flex items-center gap-0.5 shrink-0">
                          <Crown className="w-2.5 h-2.5" />
                          ADMIN
                        </span>
                      )}
                      {msg.role === 'ANALYST' && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#089981] text-[#131722] shrink-0">
                          ANALYST
                        </span>
                      )}
                      {msg.role === 'VIP' && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center gap-0.5 shrink-0">
                          <Crown className="w-2 h-2" />
                          VIP
                        </span>
                      )}

                      {msg.symbolTag && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
                          ${msg.symbolTag}
                        </span>
                      )}
                    </div>

                    <span className="text-[9px] text-[#787b86] font-mono shrink-0">{msg.time}</span>
                  </div>

                  {/* SHARED IMAGE */}
                  {msg.imageUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-[#2a2e39] bg-black/40 group/img relative">
                      <img
                        src={msg.imageUrl}
                        alt="Chart Analysis"
                        onClick={() =>
                          setLightboxImage({
                            url: msg.imageUrl!,
                            caption: msg.imageCaption || msg.text,
                            user: msg.user
                          })
                        }
                        className="w-full max-h-[280px] object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                      />

                      <button
                        onClick={() =>
                          setLightboxImage({
                            url: msg.imageUrl!,
                            caption: msg.imageCaption || msg.text,
                            user: msg.user
                          })
                        }
                        className="absolute bottom-2 end-2 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 border border-white/20 opacity-90 hover:opacity-100 cursor-pointer shadow-lg"
                      >
                        <Maximize2 className="w-3 h-3 text-[#089981]" />
                        <span>{isAr ? 'تكبير الشارت' : 'Zoom Chart'}</span>
                      </button>

                      {msg.imageCaption && (
                        <div className="p-2 bg-[#131722]/90 border-t border-[#2a2e39] text-[11px] font-mono text-amber-300/90 font-semibold">
                          📊 {msg.imageCaption}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Text */}
                  {msg.text && (
                    <p className="text-xs text-[#e1e4ea] leading-relaxed break-words whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  )}

                  {/* Footer: Reactions Bar */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {msg.reactions &&
                        Object.entries(msg.reactions).map(([emoji, count]) =>
                          count > 0 ? (
                            <button
                              key={emoji}
                              onClick={() => handleReact(msg.id, emoji)}
                              className="px-1.5 py-0.5 rounded-full bg-[#131722]/80 border border-[#2a2e39] text-[10px] flex items-center gap-1 hover:border-[#089981] transition-colors cursor-pointer"
                            >
                              <span>{emoji}</span>
                              <span className="font-mono text-[#787b86] text-[9px] font-bold">{count}</span>
                            </button>
                          ) : null
                        )}

                      <button
                        onClick={() => handleReact(msg.id, '❤️')}
                        className="flex items-center gap-1 text-[10px] font-mono text-[#787b86] hover:text-[#f23645] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Heart className="w-3 h-3" />
                        {msg.likes > 0 && <span>{msg.likes}</span>}
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-[#787b86]">
                      {isMe ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#089981]" />
                      ) : (
                        <Check className="w-3 h-3 text-[#787b86]/60" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FLOATING JUMP-TO-LATEST MESSAGES BUTTON */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-16 start-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-[#089981] hover:bg-[#07806c] text-white text-[11px] font-bold shadow-2xl flex items-center gap-1.5 border border-white/20 animate-bounce cursor-pointer select-none"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>{isAr ? 'أحدث الرسائل' : 'Latest messages'}</span>
          {newMessagesWhileScrolled > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#f23645] text-white text-[9px] flex items-center justify-center font-mono font-bold">
              {newMessagesWhileScrolled}
            </span>
          )}
        </button>
      )}

      {/* 3. ACTIVE REPLY PREVIEW BANNER */}
      {replyingTo && (
        <div className="p-2 border-t border-[#2a2e39] bg-[#131722] flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 text-[#089981] shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-[#089981] text-[11px] block">{isAr ? `الرد على ${replyingTo.user}` : `Replying to ${replyingTo.user}`}</span>
              <span className="text-[10px] text-[#787b86] truncate block">{replyingTo.text || '[صورة تحليلية]'}</span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. ATTACHED IMAGE PREVIEW */}
      {selectedImage && (
        <div className="p-2.5 border-t border-[#2a2e39] bg-[#1a1e28] flex items-center gap-3 shrink-0">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#089981] shrink-0">
            <img src={selectedImage} alt="Attachment Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-0.5 end-0.5 p-0.5 rounded-full bg-black/80 text-white hover:text-[#f23645] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-[#089981] flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              <span>{isAr ? 'تم إرفاق صورة الشارت (ميزة المشرف)' : 'Chart attached (Admin feature)'}</span>
            </span>
            <input
              type="text"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              placeholder={isAr ? 'اكتب تعليقاً على الشارت (اختياري)...' : 'Add chart caption...'}
              className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-xs text-white placeholder-[#787b86] mt-1 focus:outline-none focus:border-[#089981]"
            />
          </div>
        </div>
      )}

      {/* 5. ORIGINAL COMPACT INPUT ROW (Fixed at bottom) */}
      <form
        onSubmit={handleSendMessage}
        className="p-2 sm:p-2.5 border-t border-[#2a2e39] bg-[#1a1e28] flex items-center gap-1.5 shrink-0 sticky bottom-0 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
      >
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              if (isCurrentAdmin) {
                fileInputRef.current?.click();
              } else {
                setShowPresetModal(true);
              }
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              selectedImage
                ? 'bg-[#089981] text-white border-[#089981]'
                : isCurrentAdmin
                ? 'bg-[#131722] hover:bg-[#2a2e39] text-[#089981] border-[#2a2e39]'
                : 'bg-[#131722] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border-[#2a2e39]'
            }`}
            title={
              isCurrentAdmin
                ? (isAr ? 'إرفاق صورة شارت من جهازك' : 'Attach chart image')
                : (isAr ? 'مشاركة شارتات التحليل' : 'Share chart')
            }
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        {isCurrentAdmin && !isCompact && (
          <button
            type="button"
            onClick={() => setShowPresetModal(true)}
            className="p-2 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title={isAr ? 'قوالب شارتات جاهزة' : 'Preset Chart Templates'}
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        )}

        {/* Directly typeable typing box (fixed at bottom, only messages scroll) */}
        <div className="flex-1 min-w-0 relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isAr
                ? (isCurrentAdmin ? 'اكتب تحليلاً أو رسالة للمتداولين...' : 'اكتب رسالة في الشات المباشر...')
                : 'Type a message in live chat...'
            }
            className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl px-3 py-2 pe-8 text-xs text-white placeholder-[#787b86] transition-all focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setIsTypePopupOpen(true);
            }}
            className="absolute end-2 text-[#787b86] hover:text-[#089981] transition-colors p-1"
            title={isAr ? 'تكبير في نافذة منبثقة' : 'Enlarge in popup'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="submit"
          disabled={(!inputText.trim() && !selectedImage) || isSending}
          className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-[#089981] hover:bg-[#07806c] disabled:opacity-40 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shrink-0"
          title={isAr ? 'إرسال' : 'Send'}
        >
          <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
          {!isCompact && <span className="hidden sm:inline">{isAr ? 'إرسال' : 'Send'}</span>}
        </button>
      </form>

      {/* 6. POP-UP TYPING MODAL (Click anywhere outside to return to original) */}
      {isTypePopupOpen && (
        <div
          className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsTypePopupOpen(false)}
        >
          <div
            className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-lg shadow-[0_12px_40px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="px-3.5 py-2.5 border-b border-[#2a2e39] bg-[#171b26] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#089981]/20 border border-[#089981]/40 flex items-center justify-center text-[#089981]">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{isAr ? 'كتابة رسالة / تحليل مباشر' : 'Compose Message / Analysis'}</span>
                    <span className="text-[10px] text-[#787b86] font-normal hidden sm:inline">
                      ({isAr ? 'انقر بالخارج للرجوع' : 'Click outside to close'})
                    </span>
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTypePopupOpen(false)}
                className="p-1 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer"
                title={isAr ? 'إغلاق والرجوع إلى الشات' : 'Close and return'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Hashtag Symbol Tags */}
            <div className="px-3 py-1.5 bg-[#131722] border-b border-[#2a2e39]/60 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#089981] font-bold flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-[#089981]" />
                  <span>{isAr ? 'رموز:' : 'Tags:'}</span>
                </span>
                {['#XAUUSD', '#US100', '#EURUSD', '#BTC', '#OIL', '#US30'].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => (prev ? `${prev} ${sym} ` : `${sym} `));
                      popupTextareaRef.current?.focus();
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#1e222d] hover:bg-[#089981]/20 hover:text-[#089981] hover:border-[#089981]/50 border border-[#2a2e39] text-[10px] font-mono text-[#9db2ce] transition-colors cursor-pointer shrink-0"
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-[#787b86] shrink-0 hidden sm:inline">
                {isAr ? 'Shift+Enter سطر جديد • Enter إرسال' : 'Shift+Enter newline • Enter send'}
              </span>
            </div>

            {/* Modal Body: Spacious Textarea */}
            <div className="p-3 bg-[#1a1e28] flex flex-col gap-2.5">
              {replyingTo && (
                <div className="p-2 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center justify-between text-xs text-[#787b86]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Reply className="w-3.5 h-3.5 text-[#089981] shrink-0" />
                    <span className="truncate">
                      <span className="text-[#089981] font-semibold">{replyingTo.user}: </span>
                      {replyingTo.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-[#787b86] hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {selectedImage && (
                <div className="p-2 rounded-lg bg-[#131722] border border-[#089981]/50 flex items-center gap-2.5">
                  <img src={selectedImage} alt="Attachment" className="w-12 h-12 object-cover rounded border border-[#2a2e39]" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-[#089981] block">
                      {isAr ? 'شارت مرفق جاهز للإرسال' : 'Attached chart ready'}
                    </span>
                    <input
                      type="text"
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      placeholder={isAr ? 'تعليق توضيحي للشارت (اختياري)...' : 'Chart caption...'}
                      className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 text-[11px] text-white placeholder-[#787b86] mt-1 focus:outline-none focus:border-[#089981]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="p-1 rounded-full text-[#787b86] hover:text-[#f23645]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="relative">
                <textarea
                  ref={popupTextareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    } else if (e.key === 'Escape') {
                      setIsTypePopupOpen(false);
                    }
                  }}
                  rows={4}
                  placeholder={
                    isAr
                      ? (isCurrentAdmin
                        ? 'اكتب تحليلك الفني المفصل، مستويات الدخول، وقف الخسارة، والأهداف هنا للمتداولين...'
                        : 'اكتب رسالتك أو استفسارك هنا بكل أريحية...')
                      : 'Type your message or technical analysis comfortably here...'
                  }
                  className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#089981] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-[#787b86] focus:outline-none focus:ring-1 focus:ring-[#089981]/40 resize-none h-32 leading-relaxed shadow-inner"
                />
                <div className="absolute bottom-2 end-2 text-[10px] text-[#787b86] bg-[#131722]/80 px-1.5 py-0.5 rounded border border-[#2a2e39]/60 pointer-events-none">
                  {inputText.length} {isAr ? 'حرف' : 'chars'}
                </div>
              </div>

              {/* Quick Emojis & Attachments inside popup */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {['🚀', '📈', '🔥', '💰', '👍', '📉', '⚡'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setInputText((prev) => `${prev} ${emoji}`);
                        popupTextareaRef.current?.focus();
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#2a2e39] text-sm cursor-pointer transition-colors"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      if (isCurrentAdmin) {
                        fileInputRef.current?.click();
                      } else {
                        setShowPresetModal(true);
                      }
                    }}
                    className="p-1.5 px-2.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#089981] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إرفاق شارت' : 'Attach'}</span>
                  </button>

                  {isCurrentAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowPresetModal(true)}
                      className="p-1.5 px-2.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-amber-400 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{isAr ? 'قوالب جاهزة' : 'Templates'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-3.5 py-2.5 border-t border-[#2a2e39] bg-[#171b26] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsTypePopupOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-[#2a2e39] text-[#787b86] hover:text-white hover:bg-[#2a2e39] text-xs font-semibold transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء والرجوع' : 'Cancel & Return'}
              </button>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={(!inputText.trim() && !selectedImage) || isSending}
                className="px-4 py-1.5 rounded-xl bg-[#089981] hover:bg-[#07806c] disabled:opacity-40 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
                <span>{isAr ? 'إرسال الرسالة (Enter)' : 'Send Message (Enter)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: PRESET CHARTS SELECTOR */}
      {showPresetModal && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 max-w-md w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#089981]" />
                <h3 className="text-xs font-bold text-white">
                  {isAr ? 'مشاركة شارتات التحليل الفني' : 'Share Technical Chart'}
                </h3>
              </div>
              <button
                onClick={() => setShowPresetModal(false)}
                className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isCurrentAdmin && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                <span className="font-bold block mb-0.5">{isAr ? 'تنبيه الصلاحيات:' : 'Permissions Notice:'}</span>
                <span>{isAr ? 'مشاركة الصور مخصصة للمشرفين والمحللين المعتمدين لضمان دقة التحليلات. يمكنك تفعيل «وضع المشرف» للتجربة الآن.' : 'Image sharing is reserved for Admins & Analysts. Enable Admin Mode to test.'}</span>
                <div className="mt-2">
                  <button
                    onClick={() => {
                      handleToggleAdminMode();
                      setShowPresetModal(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-bold text-[10px] cursor-pointer"
                  >
                    {isAr ? 'تفعيل وضع المشرف الآن' : 'Enable Admin Mode Now'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[11px] text-[#787b86] font-medium block">
                {isAr ? 'اختر شارت جاهز للمشاركة:' : 'Choose preset chart setup:'}
              </span>

              <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto">
                {PRESET_ADMIN_CHARTS.map((chart, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      soundManager.playClick();
                      setSelectedImage(chart.url);
                      setImageCaption(chart.caption);
                      setShowPresetModal(false);
                    }}
                    className="p-2 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] hover:border-[#089981] flex items-center gap-2.5 cursor-pointer transition-all group"
                  >
                    <img src={chart.url} alt={chart.nameAr} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-[#2a2e39]" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white group-hover:text-[#089981] block truncate">
                        {isAr ? chart.nameAr : chart.nameEn}
                      </span>
                      <span className="text-[10px] text-[#787b86] block truncate">
                        {chart.caption}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setShowPresetModal(false);
                  fileInputRef.current?.click();
                }}
                className="w-full py-2 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-dashed border-[#089981]/50 text-[#089981] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{isAr ? 'رفع صورة شارت من جهازك' : 'Upload custom chart from device'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL-SCREEN IMAGE LIGHTBOX */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in">
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{lightboxImage.user || 'MBK Analyst'}</span>
              {lightboxImage.caption && (
                <span className="text-xs text-[#787b86] hidden sm:inline">• {lightboxImage.caption}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.url}
                target="_blank"
                rel="noreferrer"
                download="chart-analysis.jpg"
                className="p-2 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title={isAr ? 'فتح الصورة بالحجم الكامل' : 'Open in new tab'}
              >
                <ExternalLink className="w-4 h-4 text-[#089981]" />
                <span className="hidden sm:inline">{isAr ? 'فتح بالحجم الكامل' : 'Full Size'}</span>
              </a>

              <button
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-lg bg-[#1e222d] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden">
            <img
              src={lightboxImage.url}
              alt="Fullscreen Chart"
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>

          {lightboxImage.caption && (
            <div className="pt-3 border-t border-white/10 text-center text-xs text-amber-300 font-mono">
              📊 {lightboxImage.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
