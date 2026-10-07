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

// Tier Components
import { PublicLandingPage } from './components/PublicLandingPage';
import { ProtectedDashboard } from './components/ProtectedDashboard';
import { AuthModal } from './components/AuthModal';
import { PromoCodeModal } from './components/PromoCodeModal';
import { PartnerBrokerModal } from './components/PartnerBrokerModal';
import { NewSignalModal } from './components/NewSignalModal';

export default function App() {
  // Authentication & Flow State
  // Default is null (unauthenticated visitor viewing Public Landing Page)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('mbk_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'signup'>('signup');
  const [initialPromoCode, setInitialPromoCode] = useState('');
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [brokerModalOpen, setBrokerModalOpen] = useState(false);
  const [newSignalModalOpen, setNewSignalModalOpen] = useState(false);

  // Market & Trading State
  const [tickers, setTickers] = useState<MarketTicker[]>(INITIAL_TICKERS);
  const [signals, setSignals] = useState<TradeSignal[]>(INITIAL_SIGNALS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>('US100');
  const [onlineTraders, setOnlineTraders] = useState(284);
  const [isMuted, setIsMuted] = useState(false);

  // Sound Mute Toggle
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  // Periodic simulated ticker updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => {
          const delta = (Math.random() - 0.49) * (t.digits === 5 ? 0.0003 : t.digits === 2 ? 1.4 : 0.05);
          const newPrice = +(t.price + delta).toFixed(t.digits);
          return {
            ...t,
            price: newPrice,
            isUp: delta >= 0
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
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
  const handleOpenAuth = (tab: 'login' | 'signup', promo = '') => {
    setAuthDefaultTab(tab);
    setInitialPromoCode(promo);
    setAuthModalOpen(true);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
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
    try {
      localStorage.removeItem('mbk_user');
    } catch {
      // ignore
    }
  };

  // Direct Enter Dashboard (for quick preview/demo evaluation)
  const handleDirectEnterDashboard = () => {
    const demoUser: UserProfile = {
      name: 'متداول مسجل (Free Demo)',
      email: 'guest@mbktrading.live',
      role: 'FREE',
      planName: 'الحساب المجاني (Standard Free)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
    };
    handleLoginSuccess(demoUser);
  };

  // Promo code apply (instantly upgrade user to VIP and persist in Firestore!)
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
        planName: `عضوية VIP مفعلة (${code})`,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
      };
      setCurrentUser(vipUser);
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

    // Simulated community reply
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
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* TIER 1 vs TIER 2:
          - If NO currentUser: Render Public Landing Page
          - If currentUser: Render Protected Dashboard (Free or VIP based on user.role)
      */}
      {currentUser ? (
        <ProtectedDashboard
          user={currentUser}
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
          onOpenBrokerModal={() => setBrokerModalOpen(true)}
          onOpenNewSignalModal={() => setNewSignalModalOpen(true)}
          onOpenPromoModal={() => setPromoModalOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onlineTraders={onlineTraders}
        />
      ) : (
        <PublicLandingPage
          tickers={tickers}
          winningSignals={signals}
          onOpenAuth={handleOpenAuth}
          onOpenBrokerModal={() => setBrokerModalOpen(true)}
          onDirectEnterDashboard={handleDirectEnterDashboard}
        />
      )}

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authDefaultTab}
        initialPromoCode={initialPromoCode}
        onLoginSuccess={handleLoginSuccess}
      />

      <PromoCodeModal
        isOpen={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
        onApplyCode={handleApplyPromoCode}
        currentUser={currentUser}
      />

      <PartnerBrokerModal
        isOpen={brokerModalOpen}
        onClose={() => setBrokerModalOpen(false)}
      />

      <NewSignalModal
        isOpen={newSignalModalOpen}
        onClose={() => setNewSignalModalOpen(false)}
        onAddSignal={handleAddSignal}
      />
    </div>
  );
}
