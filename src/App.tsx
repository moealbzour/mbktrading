import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import {
  MarketSymbol,
  MarketTicker,
  UserProfile
} from './types/trading';
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

import { ThemeProvider } from './context/ThemeContext';

const REMOTE_VERSION_STORAGE_KEY = 'mbk_synced_remote_version';

const BASE_TICKER_METADATA: MarketTicker[] = [
  {
    symbol: 'XAUUSD',
    nameAr: 'الذهب مقابل الدولار (أونصة)',
    price: 0,
    changePercent: 0,
    changeValue: 0,
    high: 0,
    low: 0,
    spread: 0.15,
    digits: 2,
    isUp: true,
    category: 'COMMODITIES'
  },
  {
    symbol: 'US100',
    nameAr: 'ناسداك 100 (عقود مؤشرات)',
    price: 0,
    changePercent: 0,
    changeValue: 0,
    high: 0,
    low: 0,
    spread: 0.8,
    digits: 2,
    isUp: true,
    category: 'INDICES'
  },
  {
    symbol: 'EURUSD',
    nameAr: 'اليورو مقابل الدولار',
    price: 0,
    changePercent: 0,
    changeValue: 0,
    high: 0,
    low: 0,
    spread: 0.1,
    digits: 5,
    isUp: true,
    category: 'FOREX'
  },
  {
    symbol: 'BTCUSD',
    nameAr: 'البيتكوين مقابل الدولار',
    price: 0,
    changePercent: 0,
    changeValue: 0,
    high: 0,
    low: 0,
    spread: 2.0,
    digits: 2,
    isUp: true,
    category: 'CRYPTO'
  },
  {
    symbol: 'WTI',
    nameAr: 'نفط خام تكساس الخفيف',
    price: 0,
    changePercent: 0,
    changeValue: 0,
    high: 0,
    low: 0,
    spread: 0.03,
    digits: 2,
    isUp: true,
    category: 'COMMODITIES'
  },
  {
    symbol: 'GBPUSD',
    nameAr: 'الجنيه الإسترليني مقابل الدولار',
    price: 0,
    changePercent: 0,
    changeValue: 0,
    high: 0,
    low: 0,
    spread: 0.2,
    digits: 5,
    isUp: true,
    category: 'FOREX'
  }
];

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
  const [isApplyingRemoteUpdate, setIsApplyingRemoteUpdate] = useState(false);
  const isReloadingRef = useRef(false);
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

  // Market & Trading State (Real live server-cached quotes from /api/market/quotes)
  const [tickers, setTickers] = useState<MarketTicker[]>(BASE_TICKER_METADATA);
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>('XAUUSD');
  const [isMuted, setIsMuted] = useState(false);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    let isMounted = true;

    const fetchLiveQuotes = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      try {
        const res = await fetch('/api/market/quotes', {
          method: 'GET',
          headers: { Accept: 'application/json' }
        });
        if (!res.ok) return;
        const data = await res.json();
        const quotesList = Array.isArray(data?.quotes) ? data.quotes : [];
        if (!isMounted || quotesList.length === 0) return;

        const quotesBySymbol = new Map<string, any>();
        for (const q of quotesList) {
          if (q && q.symbol && typeof q.price === 'number' && q.price > 0) {
            quotesBySymbol.set(String(q.symbol).toUpperCase(), q);
          }
        }

        setTickers((prev) =>
          prev.map((item) => {
            const live = quotesBySymbol.get(item.symbol);
            if (!live) return item;
            const changeVal = typeof live.change === 'number' ? live.change : 0;
            const changePct = typeof live.changePercent === 'number' ? live.changePercent : 0;
            return {
              ...item,
              price: live.price,
              changeValue: changeVal,
              changePercent: changePct,
              high: typeof live.high === 'number' && live.high > 0 ? live.high : live.price,
              low: typeof live.low === 'number' && live.low > 0 ? live.low : live.price,
              isUp: changeVal >= 0
            };
          })
        );
      } catch {
        // ignore transient network error
      }
    };

    fetchLiveQuotes();

    const intervalId = setInterval(fetchLiveQuotes, 60000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLiveQuotes();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  // Remote Force-Update Listener (Admin 1-Click Push Update to all Laptop, Mobile & PWA Shortcut Users)
  useEffect(() => {
    const applyRemoteVersionIfNeeded = async (data: Record<string, any> | undefined) => {
      if (!data || isReloadingRef.current) return;
      const remoteVersionId = typeof data.versionId === 'string' ? data.versionId.trim() : '';
      if (!remoteVersionId) return;

      let localSyncedVersion: string | null = null;
      try {
        localSyncedVersion = localStorage.getItem(REMOTE_VERSION_STORAGE_KEY);
      } catch {
        // ignore
      }

      // First time recording the version on a fresh load that already has ?v= matching remoteVersionId
      const currentUrl = new URL(window.location.href);
      const urlVersionParam = currentUrl.searchParams.get('v');
      if (!localSyncedVersion && urlVersionParam === remoteVersionId) {
        try {
          localStorage.setItem(REMOTE_VERSION_STORAGE_KEY, remoteVersionId);
        } catch {
          // ignore
        }
        return;
      }

      if (localSyncedVersion !== remoteVersionId) {
        isReloadingRef.current = true;
        try {
          localStorage.setItem(REMOTE_VERSION_STORAGE_KEY, remoteVersionId);
          // Unfold any hidden/collapsed layout panels so new navigation tabs & DMs are immediately visible
          if (data.resetLayout !== false) {
            localStorage.setItem('mbk_tv_nav_rail_folded', 'false');
            localStorage.setItem('mbk_tv_sidebar_shrinked', 'false');
            localStorage.setItem('mbk_tv_bottom_panel_folded', 'false');
          }
        } catch {
          // ignore
        }

        // Purge caches & reload while keeping mbk_user signed in
        setIsApplyingRemoteUpdate(true);

        try {
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch {
          // ignore
        }

        try {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
              registrations.map(async (reg) => {
                try {
                  await reg.update();
                  if (reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                  }
                } catch {
                  // ignore
                }
              })
            );
          }
        } catch {
          // ignore
        }

        setTimeout(() => {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set('v', remoteVersionId);
          window.location.replace(nextUrl.toString());
        }, 700);
      }
    };

    const versionRef = doc(db, 'settings', 'app_version');
    const unsubVersion = onSnapshot(
      versionRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          try {
            localStorage.setItem('mbk_remote_app_version_info', JSON.stringify(data));
          } catch {
            // ignore
          }
          applyRemoteVersionIfNeeded(data);
        }
      },
      () => {
        // ignore snapshot permission/quota transient notice
      }
    );

    return () => {
      unsubVersion();
    };
  }, []);

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
    <ThemeProvider>
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

      {/* Remote Live Update Overlay */}
      {isApplyingRemoteUpdate && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1e222d] border border-[#089981] rounded-2xl px-6 py-5 max-w-sm w-full text-center shadow-2xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#089981]/20 border border-[#089981]/40 text-[#089981] flex items-center justify-center text-2xl mx-auto animate-bounce">
              🚀
            </div>
            <h3 className="text-sm font-extrabold text-white">
              {lang === 'ar'
                ? 'جاري تحديث المنصة للإصدار الجديد...'
                : 'Updating platform to the latest version...'}
            </h3>
            <p className="text-xs text-[#9ca3af]">
              {lang === 'ar'
                ? 'يتم الآن مسح الكاش القديم وتفعيل الميزات الجديدة تلقائياً دون تسجيل الخروج.'
                : 'Clearing old cache and syncing new features automatically while keeping you signed in.'}
            </p>
          </div>
        </div>
      )}
      </div>
    </ThemeProvider>
  );
}
