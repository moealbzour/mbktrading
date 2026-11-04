import React, { useState, useEffect } from 'react';
import {
  MarketSymbol,
  MarketTicker,
  TradeSignal,
  ChatMessage,
  UserProfile
} from './types/trading';
import {
  INITIAL_TICKERS,
  INITIAL_SIGNALS,
  INITIAL_CHAT_MESSAGES,
  ECONOMIC_CALENDAR_ITEMS
} from './data/mockTradingData';
import { soundManager } from './utils/audio';
import {
  subscribeToAuth,
  signOutUser,
  applyFirestorePromoCode
} from './services/firebaseAuthService';

// Pages & Components
import { PublicLandingPage } from './components/PublicLandingPage';
import { ProtectedDashboard } from './components/ProtectedDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

import { PromoCodeModal } from './components/PromoCodeModal';
import { PartnerBrokerModal } from './components/PartnerBrokerModal';
import { NewSignalModal } from './components/NewSignalModal';
import { EmailVerificationGuard } from './components/EmailVerificationGuard';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

export default function App() {
  // Authentication & Flow State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('mbk_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [pageView, setPageView] = useState<'landing' | 'login' | 'register' | 'dashboard'>(() => {
    try {
      const saved = localStorage.getItem('mbk_user');
      if (saved) return 'dashboard';
    } catch {
      // ignore
    }
    return 'landing';
  });

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [brokerModalOpen, setBrokerModalOpen] = useState(false);
  const [newSignalModalOpen, setNewSignalModalOpen] = useState(false);

  // Market & Trading State
  const [tickers, setTickers] = useState<MarketTicker[]>(INITIAL_TICKERS);
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>('US100');
  const [onlineTraders, setOnlineTraders] = useState(284);
  const [isMuted, setIsMuted] = useState(false);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  // Real-time market prices from live financial feeds
  useEffect(() => {
    let isMounted = true;

    const fetchRealPrices = async () => {
      try {
        const res = await fetch('/api/market/real-prices');
        if (res.ok) {
          const data = await res.json();
          if (data.tickers && Array.isArray(data.tickers) && isMounted) {
            setTickers(data.tickers);
          }
        }
      } catch {
        // Keep current prices on network blips
      }
    };

    fetchRealPrices();
    const interval = setInterval(fetchRealPrices, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Validate JWT on load via /api/auth/me
  useEffect(() => {
    const token = localStorage.getItem('mbk_jwt_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.success && data.user) {
            const validUser: UserProfile = {
              uid: data.user.id || data.user.uid,
              id: data.user.id,
              username: data.user.username,
              name: data.user.name || data.user.displayName || data.user.username,
              email: data.user.email,
              role: data.user.role,
              planName: data.user.role === 'ADMIN' ? 'الادارة العليا (ADMIN)' : data.user.role === 'VIP' ? 'عضوية VIP مميزة' : 'الباقة العادية',
              avatar: data.user.avatar,
              subscriptionStatus: data.user.subscriptionStatus,
              subscriptionEndDate: data.user.subscriptionEndDate
            };
            setCurrentUser(validUser);
            localStorage.setItem('mbk_user', JSON.stringify(validUser));
          }
        })
        .catch(() => {
          // Keep local user if offline
        });
    }
  }, []);

  // Subscribe to live Firebase Auth state and Firestore user roles
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      if (user) {
        setCurrentUser(user);
        try {
          localStorage.setItem('mbk_user', JSON.stringify(user));
        } catch {
          // ignore
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Auth Handlers
  const handleOpenAuth = (tab: 'login' | 'signup') => {
    soundManager.playClick();
    if (tab === 'login') {
      setPageView('login');
    } else {
      setPageView('register');
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setPageView('dashboard');
    try {
      localStorage.setItem('mbk_user', JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    setCurrentUser(null);
    setPageView('landing');
    try {
      localStorage.removeItem('mbk_user');
      localStorage.removeItem('mbk_jwt_token');
    } catch {
      // ignore
    }
  };

  const handleDirectEnterDashboard = () => {
    if (currentUser) {
      setPageView('dashboard');
    } else {
      setPageView('register');
    }
  };

  // Promo code apply
  const handleApplyPromoCode = async (code: string) => {
    if (currentUser) {
      if (currentUser.uid) {
        try {
          await applyFirestorePromoCode(currentUser.uid, code);
        } catch (err) {
          console.warn('Failed to update Firestore role:', err);
        }
      }

      const updated: UserProfile = {
        ...currentUser,
        role: 'VIP',
        promoCode: code,
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        planName: `عضوية VIP مفعلة (${code})`
      };
      setCurrentUser(updated);
      try {
        localStorage.setItem('mbk_user', JSON.stringify(updated));
      } catch {
        // ignore
      }
    } else {
      const vipUser: UserProfile = {
        name: 'عضو VIP مفعل',
        email: 'vip.member@mbktrading.live',
        role: 'VIP',
        promoCode: code,
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        planName: `عضوية VIP مفعلة (${code})`,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
      };
      setCurrentUser(vipUser);
      setPageView('dashboard');
      try {
        localStorage.setItem('mbk_user', JSON.stringify(vipUser));
      } catch {
        // ignore
      }
    }
  };

  // Signal & Chat Handlers
  const handleAddSignal = (newSig: TradeSignal) => {
    setSignals((prev) => [newSig, ...prev]);
    const autoMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: {
        name: 'فريق أبحاث MBK (Certified Analysts)',
        roleAr: 'المحللون المعتمدون 👑',
        badge: 'FOUNDER',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      },
      content: `تنبيه إشارة معتمدة: [${newSig.type} ${newSig.symbol}] بسعر الدخول ${newSig.entryPrice}. الأهداف: TP1=${newSig.tp1} | TP2=${newSig.tp2}.`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      likes: 15
    };
    setChatMessages((prev) => [autoMsg, ...prev]);
  };

  const handleCopySignalToAccount = (sig: TradeSignal) => {
    soundManager.playClick();
  };

  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: {
        name: currentUser?.name || 'متداول MBK',
        roleAr: currentUser?.role === 'VIP' ? 'عضو VIP معتمد' : 'متداول مسجل',
        badge: currentUser?.role === 'VIP' ? 'VIP_PRO' : 'MEMBER',
        avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
      },
      content: text,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      likes: 0
    };
    setChatMessages((prev) => [...prev, newMsg]);

    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: {
          name: 'طارق الحربي',
          roleAr: 'مضارب سكالبينغ محترف',
          badge: 'SCALPER',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
        },
        content: 'معاك تماماً! ناسداك اليوم أعطى نقاط ممتازة مع افتتاح نيويورك. التوفيق للجميع 🚀',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        likes: 4
      };
      setChatMessages((prev) => [...prev, replyMsg]);
    }, 2500);
  };

  const handleLikeMessage = (id: string) => {
    setChatMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              likes: m.isLikedByMe ? m.likes - 1 : m.likes + 1,
              isLikedByMe: !m.isLikedByMe
            }
          : m
      )
    );
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#131722] text-[#d1d4dc] flex flex-col ${
        lang === 'ar' ? "font-['Cairo',sans-serif]" : "font-['Plus_Jakarta_Sans',sans-serif]"
      }`}
    >
      {/* Route Views */}
      {pageView === 'login' ? (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateRegister={() => setPageView('register')}
          onNavigateHome={() => setPageView('landing')}
          lang={lang}
        />
      ) : pageView === 'register' ? (
        <Register
          onRegisterSuccess={handleLoginSuccess}
          onNavigateLogin={() => setPageView('login')}
          onNavigateHome={() => setPageView('landing')}
          lang={lang}
        />
      ) : currentUser && currentUser.isBanned ? (
        <div className="min-h-screen bg-[#131722] text-[#d1d4dc] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-500 flex items-center justify-center text-3xl mb-4">
            🚫
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            {lang === 'ar' ? 'تم حظر حسابك من الوصول للمنصة' : 'Account Banned'}
          </h1>
          <p className="text-sm text-[#787b86] max-w-md mb-6 leading-relaxed">
            {lang === 'ar'
              ? 'تم تطبيق حظر شامل على حسابك بواسطة إدارة MBK Trading Hub. يرجى التواصل مع الدعم الفني لمزيد من التفاصيل.'
              : 'A global ban has been applied to your account by MBK Trading Hub management.'}
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {lang === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
          </button>
        </div>
      ) : currentUser && currentUser.isEmailVerified === false ? (
        <EmailVerificationGuard
          user={currentUser}
          onLogout={handleLogout}
          onVerifiedSuccess={() => {
            const updated = { ...currentUser, isEmailVerified: true };
            setCurrentUser(updated);
            try {
              localStorage.setItem('mbk_user', JSON.stringify(updated));
            } catch {
              // ignore
            }
          }}
          lang={lang}
        />
      ) : currentUser || pageView === 'dashboard' ? (
        <ProtectedDashboard
          user={
            currentUser || {
              name: 'متداول MBK',
              email: 'trader@mbktrading.live',
              role: 'STANDARD',
              planName: 'الباقة العادية'
            }
          }
          tickers={tickers}
          signals={signals}
          chatMessages={chatMessages}
          economicEvents={ECONOMIC_CALENDAR_ITEMS}
          selectedSymbol={selectedSymbol}
          onSelectSymbol={setSelectedSymbol}
          onAddSignal={handleAddSignal}
          onCopySignalToAccount={handleCopySignalToAccount}
          onSendMessage={handleSendMessage}
          onLikeMessage={handleLikeMessage}
          onLogout={handleLogout}
          onBackToHome={() => setPageView('landing')}
          onOpenBrokerModal={() => setBrokerModalOpen(true)}
          onOpenNewSignalModal={() => setNewSignalModalOpen(true)}
          onOpenPromoModal={() => setPromoModalOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onlineTraders={onlineTraders}
          lang={lang}
          onToggleLang={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
        />
      ) : (
        <PublicLandingPage
          tickers={tickers}
          winningSignals={signals}
          onOpenAuth={handleOpenAuth}
          onOpenBrokerModal={() => setBrokerModalOpen(true)}
          onOpenPromoModal={() => setPromoModalOpen(true)}
          onDirectEnterDashboard={handleDirectEnterDashboard}
          lang={lang}
          onToggleLang={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
        />
      )}

      {/* Global Modals */}
      <PromoCodeModal
        isOpen={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
        onApplyCode={handleApplyPromoCode}
        currentUser={currentUser}
        lang={lang}
      />

      <PartnerBrokerModal
        isOpen={brokerModalOpen}
        onClose={() => setBrokerModalOpen(false)}
        lang={lang}
      />

      <NewSignalModal
        isOpen={newSignalModalOpen}
        onClose={() => setNewSignalModalOpen(false)}
        onAddSignal={handleAddSignal}
      />

      {/* Mobile Web App PWA Add to Home Screen Prompt */}
      <PWAInstallPrompt lang={lang} />
    </div>
  );
}
