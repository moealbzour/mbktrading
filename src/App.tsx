import React, { useState, useEffect, useRef } from 'react';
import {
  MarketSymbol,
  MarketTicker,
  UserProfile
} from './types/trading';
import { INITIAL_TICKERS } from './data/mockTradingData';
import { soundManager } from './utils/audio';
import {
  subscribeToAuth,
  signOutUser
} from './services/firebaseAuthService';
import { KeyRedemptionResult } from './utils/activationKeyService';

// Pages & Components
import { MotionSplashScreen } from './components/MotionSplashScreen';
import { ProtectedDashboard } from './components/ProtectedDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

import { PromoCodeModal } from './components/PromoCodeModal';
import { EmailVerificationGuard } from './components/EmailVerificationGuard';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { NotificationPermissionPrompt } from './components/common/NotificationPermissionPrompt';
import { ExitConfirmationModal } from './components/common/ExitConfirmationModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('mbk_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [pageView, setPageView] = useState<'splash' | 'login' | 'register' | 'dashboard'>(() => {
    try {
      const saved = localStorage.getItem('mbk_user');
      if (saved) return 'dashboard';
    } catch {
      // ignore
    }
    return 'splash';
  });

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [pendingGoogleOnboarding, setPendingGoogleOnboarding] = useState<{
    uid: string;
    email: string;
    displayName: string;
  } | null>(null);
  const pendingGoogleOnboardingRef = useRef<{
    uid: string;
    email: string;
    displayName: string;
  } | null>(null);

  // Market & Trading State
  const [tickers] = useState<MarketTicker[]>(INITIAL_TICKERS);
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>('US100');
  const [isMuted, setIsMuted] = useState(false);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  // Intercept back button / shortcut exit with confirmation
  useEffect(() => {
    try {
      window.history.pushState({ app: 'mbk_trading' }, '');
    } catch {
      // ignore
    }

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      try {
        window.history.pushState({ app: 'mbk_trading' }, '');
      } catch {
        // ignore
      }
      setExitModalOpen(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleConfirmExit = () => {
    setExitModalOpen(false);
    try {
      window.close();
      window.history.go(-2);
    } catch {
      // fallback
    }
  };

  // Subscribe to live Firebase Auth state and Firestore user roles
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      if (user) {
        setCurrentUser(user);
        setPageView((prev) => {
          if (pendingGoogleOnboardingRef.current || prev === 'register') {
            return prev;
          }
          if (prev === 'splash' || prev === 'login') {
            return 'dashboard';
          }
          return prev;
        });
        try {
          localStorage.setItem('mbk_user', JSON.stringify(user));
        } catch {
          // ignore
        }
      } else {
        setCurrentUser(null);
        pendingGoogleOnboardingRef.current = null;
        setPendingGoogleOnboarding(null);
        setPageView((prev) => (prev === 'dashboard' ? 'login' : prev));
        try {
          localStorage.removeItem('mbk_user');
        } catch {
          // ignore
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    pendingGoogleOnboardingRef.current = null;
    setPendingGoogleOnboarding(null);
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
    setPageView('login');
    try {
      localStorage.removeItem('mbk_user');
      localStorage.removeItem('mbk_jwt_token');
      localStorage.removeItem('mbk_vip_access');
      localStorage.removeItem('mbk_vip_expiry');
      localStorage.removeItem('mbk_vip_key');
      localStorage.removeItem('mbk_bot_unlocked');
      localStorage.removeItem('mbk_chat_admin_mode');
    } catch {
      // ignore
    }
  };

  const handleApplyPromoCode = (code: string, result?: KeyRedemptionResult) => {
    if (!currentUser) {
      setPageView('login');
      return;
    }

    const grantTier = result?.grantTier || 'vip';
    let updated: UserProfile;

    if (grantTier === 'custom' && result?.grantFeatures?.length) {
      const nextFeatures = { ...(currentUser.grantedFeatures || {}) };
      for (const feat of result.grantFeatures) {
        nextFeatures[feat] = result.expiryDate;
      }
      updated = {
        ...currentUser,
        grantedFeatures: nextFeatures,
        promoCode: code,
        activationKey: code
      };
    } else if (grantTier === 'elite') {
      updated = {
        ...currentUser,
        role: currentUser.isAdmin ? currentUser.role : 'VIP',
        tier: 'elite',
        isVip: true,
        vipAccess: true,
        isElite: true,
        promoCode: code,
        activationKey: code,
        subscriptionStatus: 'active',
        subscriptionEndDate: result?.expiryDate || currentUser.subscriptionEndDate || null,
        vipExpiryDate: result?.expiryDate || currentUser.vipExpiryDate || null,
        eliteExpiryDate: result?.expiryDate || currentUser.eliteExpiryDate || null,
        planName: currentUser.isAdmin ? currentUser.planName : 'باقة Elite المؤسسية ($500/mo)'
      };
    } else {
      updated = {
        ...currentUser,
        role: currentUser.isAdmin ? currentUser.role : 'VIP',
        tier: currentUser.tier === 'elite' ? 'elite' : 'vip',
        isVip: true,
        vipAccess: true,
        promoCode: code,
        activationKey: code,
        subscriptionStatus: 'active',
        subscriptionEndDate: result?.expiryDate || currentUser.subscriptionEndDate || null,
        vipExpiryDate: result?.expiryDate || currentUser.vipExpiryDate || null,
        planName: currentUser.isAdmin ? currentUser.planName : 'باقة VIP ($100/mo)'
      };
    }

    setCurrentUser(updated);
    try {
      localStorage.setItem('mbk_user', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#131722] text-[#d1d4dc] flex flex-col ${
        lang === 'ar' ? "font-['Cairo',sans-serif]" : "font-['Plus_Jakarta_Sans',sans-serif]"
      }`}
    >
      {/* Route Views: Splash -> Login / Register -> Authenticated Dashboard */}
      {pageView === 'login' ? (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateRegister={() => {
            pendingGoogleOnboardingRef.current = null;
            setPendingGoogleOnboarding(null);
            setPageView('register');
          }}
          onGoogleNewUser={(googleUser) => {
            pendingGoogleOnboardingRef.current = googleUser;
            setPendingGoogleOnboarding(googleUser);
            setPageView('register');
          }}
          lang={lang}
          onToggleLang={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
        />
      ) : pageView === 'register' ? (
        <Register
          onRegisterSuccess={handleLoginSuccess}
          onNavigateLogin={() => {
            pendingGoogleOnboardingRef.current = null;
            setPendingGoogleOnboarding(null);
            setPageView('login');
          }}
          initialGoogleUser={pendingGoogleOnboarding}
          lang={lang}
          onToggleLang={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
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
              ? 'تم تطبيق حظر شامل على حسابك بواسطة إدارة MBK Trading. يرجى التواصل مع الدعم الفني لمزيد من التفاصيل.'
              : 'A global ban has been applied to your account by MBK Trading management.'}
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
      ) : currentUser ? (
        <ProtectedDashboard
          user={currentUser}
          tickers={tickers}
          selectedSymbol={selectedSymbol}
          onSelectSymbol={setSelectedSymbol}
          onLogout={handleLogout}
          onOpenPromoModal={() => setPromoModalOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          lang={lang}
          onToggleLang={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
        />
      ) : (
        <MotionSplashScreen
          onComplete={() => setPageView('register')}
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

      <ExitConfirmationModal
        isOpen={exitModalOpen}
        onConfirmExit={handleConfirmExit}
        onCancel={() => setExitModalOpen(false)}
        lang={lang}
      />

      {/* Mobile Web App PWA Add to Home Screen Prompt */}
      <PWAInstallPrompt lang={lang} />

      {/* Re-prompt every visit if user hasn't allowed notifications yet */}
      {currentUser && !currentUser.isBanned && currentUser.isEmailVerified !== false && (
        <NotificationPermissionPrompt lang={lang} />
      )}
    </div>
  );
}
