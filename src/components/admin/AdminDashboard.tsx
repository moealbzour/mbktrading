import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Newspaper,
  Calendar,
  Crown,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Flame,
  Search,
  Lock,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Zap,
  TrendingUp,
  Filter,
  Check,
  X,
  Database,
  Sparkles,
  Clock,
  ArrowRight,
  Send,
  Phone,
  Globe,
  DollarSign,
  Ban,
  VolumeX,
  MessageSquare,
  Award,
  Calendar as CalendarIcon,
  Sliders
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { soundManager } from '../../utils/audio';

import { SubscriptionCountdown } from '../common/SubscriptionCountdown';
import { PublishingCenter } from './PublishingCenter';

export interface AdminUserRecord {
  id: string;
  uid: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'MODERATOR' | 'SALES' | 'VIP' | 'FREE' | string;
  displayName: string;
  avatar?: string;
  phone?: string;
  country?: string;
  dob?: string;
  experienceLevel?: string;
  assetClasses?: string[];
  favoritePairs?: string;
  totalPaid?: number;
  isBanned?: boolean;
  isMutedFromChat?: boolean;
  subscriptionStatus?: 'active' | 'expired' | 'none';
  subscriptionEndDate?: string | null;
  createdAt?: string;
  lastActiveAt?: string;
}

export interface AdminNewsRecord {
  id: string;
  title: string;
  titleAr?: string;
  link: string;
  source: string;
  category: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  impactScore?: number;
  createdAt: string;
}

export interface AdminCalendarRecord {
  id: string;
  time: string;
  country: string;
  currency: string;
  event: string;
  eventAr?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actual: string;
  forecast: string;
  previous: string;
  date: string;
  createdAt?: string;
}

interface Props {
  currentRole?: string;
  isAdmin?: boolean;
  lang?: 'ar' | 'en';
  onClose?: () => void;
}

export const AdminDashboard: React.FC<Props> = ({
  currentRole = 'free',
  isAdmin = false,
  lang = 'ar',
  onClose
}) => {
  const isAr = lang === 'ar';
  const [firestoreRole, setFirestoreRole] = useState<string | null>(null);

  // Check logged-in user's role from Firestore 'users' collection
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (authUser) => {
      if (!authUser) {
        setFirestoreRole(null);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', authUser.uid);
        const unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (authUser.email?.toLowerCase() === 'moe.albzour@gmail.com') {
            setFirestoreRole('admin');
            return;
          }
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFirestoreRole((data.role || 'free').toString().toLowerCase());
          } else {
            setFirestoreRole('free');
          }
        }, (err) => {
          console.warn('Admin role Firestore check notice:', err);
        });

        return () => unsubDoc();
      } catch (err) {
        console.warn('Error setting up admin role listener:', err);
      }
    });

    return () => unsubAuth();
  }, []);

  // Staff roles allowed to access dashboard: admin, moderator, sales
  const effectiveRole = (firestoreRole || currentRole || '').toString().toLowerCase();
  const isStaff = ['admin', 'moderator', 'sales'].includes(effectiveRole);
  const isFullAdmin = effectiveRole === 'admin';

  const [activeTab, setActiveTab] = useState<'users' | 'news' | 'calendar' | 'overview' | 'publishing'>('users');

  // ================= USERS & CRM STATE =================
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterTab, setUserFilterTab] = useState<'ALL' | 'EXPIRING_SOON' | 'VIP' | 'BANNED' | 'MUTED' | 'FREE' | 'STAFF'>('ALL');
  
  // CRM Profile Inspector Modal State
  const [inspectUser, setInspectUser] = useState<AdminUserRecord | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('299');
  const [paymentDurationInput, setPaymentDurationInput] = useState<'30' | '90' | '180' | '365' | 'lifetime'>('30');
  const [paymentNotesInput, setPaymentNotesInput] = useState<string>('');
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ================= REAL-TIME FIRESTORE USER CRM LISTENER =================
  useEffect(() => {
    if (!isStaff) return;
    setUsersLoading(true);

    try {
      const usersColRef = collection(db, 'users');
      const unsub = onSnapshot(usersColRef, (snapshot) => {
        const loadedUsers: AdminUserRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const userRole = (data.role || 'free').toString().toUpperCase();
          const subEndDate = data.subscription_end_date || data.subscriptionEndDate || null;
          let subStatus = data.subscription_status || data.subscriptionStatus || (userRole === 'VIP' ? 'active' : 'none');

          if (subEndDate && new Date(subEndDate) < new Date() && userRole === 'VIP') {
            subStatus = 'expired';
          }

          loadedUsers.push({
            id: docSnap.id,
            uid: docSnap.id,
            username: data.email ? data.email.split('@')[0] : docSnap.id.slice(0, 8),
            email: data.email || 'N/A',
            role: userRole,
            displayName: data.displayName || data.email?.split('@')[0] || 'MBK Member',
            avatar: data.avatar || undefined,
            phone: data.phone || '',
            country: data.country || '',
            dob: data.dob || '',
            experienceLevel: data.experienceLevel || '',
            assetClasses: data.assetClasses || [],
            favoritePairs: data.favoritePairs || '',
            totalPaid: Number(data.totalPaid || 0),
            isBanned: Boolean(data.isBanned),
            isMutedFromChat: Boolean(data.isMutedFromChat),
            subscriptionStatus: subStatus as any,
            subscriptionEndDate: subEndDate,
            createdAt: data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt).toLocaleDateString() : '2026',
            lastActiveAt: data.updatedAt ? new Date(data.updatedAt.seconds ? data.updatedAt.seconds * 1000 : data.updatedAt).toLocaleTimeString() : undefined
          });
        });

        setUsers(loadedUsers);
        setUsersLoading(false);
      }, (err) => {
        console.warn('Firestore CRM users subscription notice:', err);
        setUsersLoading(false);
      });

      return () => unsub();
    } catch (err) {
      console.warn('CRM setup error:', err);
      setUsersLoading(false);
    }
  }, [isStaff]);

  // ================= EXPIRING SOON ALERTS COMPUTATION (Next 72 Hours) =================
  const expiringSoonUsers = users.filter((u) => {
    if (!u.subscriptionEndDate) return false;
    const endDate = new Date(u.subscriptionEndDate);
    const now = new Date();
    const diffHours = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours >= -24 && diffHours <= 72; // Expiring within 3 days or expired in last 24h
  });

  // ================= GRANULAR BAN & CHAT MUTE ACTIONS =================
  const handleToggleGlobalBan = async (targetUser: AdminUserRecord) => {
    if (targetUser.role === 'ADMIN' && !isFullAdmin) {
      showFeedback('error', isAr ? 'لا يمكنك حظر حسابات الإدارة العليا' : 'Cannot ban superadmin account');
      return;
    }

    soundManager.playClick();
    const nextBanned = !targetUser.isBanned;

    try {
      const userRef = doc(db, 'users', targetUser.id);
      await updateDoc(userRef, { isBanned: nextBanned });
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? nextBanned ? `تم تفعيل الحظر الشامل للحساب ${targetUser.displayName}` : `تم رفع الحظر عن الحساب ${targetUser.displayName}`
          : `Toggled ban status for ${targetUser.email}`
      );
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleToggleChatMute = async (targetUser: AdminUserRecord) => {
    soundManager.playClick();
    const nextMuted = !targetUser.isMutedFromChat;

    try {
      const userRef = doc(db, 'users', targetUser.id);
      await updateDoc(userRef, { isMutedFromChat: nextMuted });
      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? nextMuted ? `تم كتم المستخدم ${targetUser.displayName} من الشات` : `تم إلغاء كتم المستخدم ${targetUser.displayName}`
          : `Toggled chat mute status for ${targetUser.email}`
      );
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleSetRole = async (targetUserId: string, newRole: string) => {
    soundManager.playClick();
    if (!isFullAdmin && newRole === 'ADMIN') {
      showFeedback('error', isAr ? 'فقط الإدارة العليا يمكنها تعيين رتبة ADMIN' : 'Only full admin can promote to ADMIN');
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { role: newRole.toLowerCase() });
      soundManager.playProfitChime();
      showFeedback('success', isAr ? `تم تعيين الرتبة إلى ${newRole}` : `Role updated to ${newRole}`);
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // ================= LOG MANUAL PAYMENT & RENEWAL =================
  const handleLogManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectUser) return;

    const amountNum = parseFloat(paymentAmountInput) || 0;
    setIsLoggingPayment(true);
    soundManager.playClick();

    try {
      let daysToAdd = 30;
      if (paymentDurationInput === '90') daysToAdd = 90;
      else if (paymentDurationInput === '180') daysToAdd = 180;
      else if (paymentDurationInput === '365') daysToAdd = 365;
      else if (paymentDurationInput === 'lifetime') daysToAdd = 36500;

      const currentEnd = inspectUser.subscriptionEndDate ? new Date(inspectUser.subscriptionEndDate) : new Date();
      const startDate = currentEnd > new Date() ? currentEnd : new Date();
      const newEndDate = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      const userRef = doc(db, 'users', inspectUser.id);
      const nextTotalPaid = (inspectUser.totalPaid || 0) + amountNum;

      await updateDoc(userRef, {
        totalPaid: nextTotalPaid,
        role: 'vip',
        subscription_status: 'active',
        subscription_end_date: newEndDate,
        updatedAt: serverTimestamp()
      });

      soundManager.playProfitChime();
      showFeedback(
        'success',
        isAr
          ? `تم تسجيل الدفعة بقيمة $${amountNum} وتجديد اشتراك VIP للحساب بنجاح!`
          : `Logged $${amountNum} payment and extended VIP access!`
      );

      setInspectUser((prev) =>
        prev
          ? {
              ...prev,
              totalPaid: nextTotalPaid,
              role: 'VIP',
              subscriptionStatus: 'active',
              subscriptionEndDate: newEndDate
            }
          : null
      );
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setIsLoggingPayment(false);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const query = userSearch.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(query) ||
      u.displayName.toLowerCase().includes(query) ||
      (u.phone && u.phone.includes(query)) ||
      (u.country && u.country.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (userFilterTab === 'EXPIRING_SOON') {
      if (!u.subscriptionEndDate) return false;
      const endDate = new Date(u.subscriptionEndDate);
      const diffHours = (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      return diffHours >= -24 && diffHours <= 72;
    }
    if (userFilterTab === 'VIP') return u.role === 'VIP';
    if (userFilterTab === 'FREE') return u.role === 'FREE' || u.role === 'STANDARD';
    if (userFilterTab === 'BANNED') return u.isBanned;
    if (userFilterTab === 'MUTED') return u.isMutedFromChat;
    if (userFilterTab === 'STAFF') return ['ADMIN', 'MODERATOR', 'SALES'].includes(u.role);

    return true;
  });

  // Calculate Metrics
  const totalRevenueAll = users.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0);
  const totalVipCount = users.filter((u) => u.role === 'VIP').length;
  const totalBannedCount = users.filter((u) => u.isBanned).length;

  // ACCESS DENIED VIEW IF NOT STAFF
  if (!isStaff) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center p-6 bg-[#0d1017]">
        <div className="max-w-md w-full bg-[#1e222d] border border-[#f23645]/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 start-0 w-full h-1.5 bg-[#f23645]" />
          <div className="w-16 h-16 rounded-2xl bg-[#f23645]/15 border border-[#f23645]/30 flex items-center justify-center text-[#f23645] mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isAr ? 'منطقة مقتصرة على فريق الإدارة والمبيعات' : 'Restricted CRM & Admin Access'}
          </h2>
          <p className="text-xs text-[#787b86] leading-relaxed mb-6">
            {isAr
              ? 'لوحة التحكم وإدارة العملاء مقتصرة فقط على رتب (ADMIN, MODERATOR, SALES).'
              : 'This CRM Dashboard is strictly reserved for Admin, Moderator, and Sales roles.'}
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {isAr ? 'العودة إلى منصة التداول' : 'Return to Trading Workspace'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full flex flex-col bg-[#0d1017] text-[#d1d4dc] font-sans select-none antialiased">
      {/* 1. TOP HEADER CONTROL BAR */}
      <header className="px-4 sm:px-6 py-3.5 bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#089981]/30 to-[#00f2fe]/10 border border-[#089981]/40 flex items-center justify-center text-[#089981] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {isAr ? 'مركز إدارة العملاء والمبيعات (MBK CRM & Admin)' : 'MBK CRM & Executive Dashboard'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                {effectiveRole.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-[#787b86]">
              {isAr
                ? 'إدارة اشتراكات المستخدمين، تتبع المبيعات، حظر الحسابات، وتنفيذ التجديدات المباشرة'
                : 'Manage user profiles, track revenue, control bans/mutes, & process renewals'}
            </p>
          </div>
        </div>

        {/* Global Action controls */}
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isAr ? 'خروج من اللوحة' : 'Close Dashboard'}
            </button>
          )}
        </div>
      </header>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between transition-all ${
          feedback.type === 'success' ? 'bg-[#089981] text-white' : feedback.type === 'error' ? 'bg-[#f23645] text-white' : 'bg-blue-600 text-white'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="cursor-pointer hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dashboard Sub-Nav Tabs */}
      <div className="px-4 sm:px-6 py-2 bg-[#181c27] border-b border-[#2a2e39] flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#089981] text-white shadow-md'
              : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? 'إدارة العملاء والاشتراكات (CRM)' : 'User CRM & Subscriptions'}</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/30 font-mono">{users.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('publishing')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'publishing'
              ? 'bg-[#089981] text-white shadow-md'
              : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'مركز نشر التوصيات والصفقات' : 'Publishing Center'}</span>
        </button>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">

        {/* ========================================================================= */}
        {/* 2. PRIORITY 3-DAY EXPIRATION ALERTS WIDGET */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#131722] to-amber-500/10 border border-amber-500/40 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
                <Clock className="w-5 h-5 animate-pulse text-amber-400 shrink-0" />
                <span>
                  {isAr
                    ? `⚠️ تنبيه المبيعات: ${expiringSoonUsers.length} عميل تنتهي عضويتهم خلال 72 ساعة`
                    : `⚠️ Priority Sales Alerts: ${expiringSoonUsers.length} VIP Subscriptions Expiring in 72 Hours`}
                </span>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold border border-amber-500/40">
                RENEWAL TEAM DESK
              </span>
            </div>

            {expiringSoonUsers.length === 0 ? (
              <p className="text-xs text-[#787b86] italic">
                {isAr ? 'لا يوجد اشتراكات قريبة من الانتهاء حالياً.' : 'No VIP subscriptions expiring in the next 72 hours.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {expiringSoonUsers.map((u) => {
                  const cleanPhone = u.phone ? u.phone.replace(/[^0-9]/g, '') : '';
                  return (
                    <div key={u.id} className="p-3 rounded-xl bg-[#131722] border border-amber-500/30 flex items-center justify-between gap-2 shadow-sm">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate">{u.displayName}</span>
                          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                            EXPIRING
                          </span>
                        </div>
                        <p className="text-[10px] text-[#787b86] font-mono truncate">{u.phone || u.email}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 transition-colors"
                            title="WhatsApp Contact"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          onClick={() => setInspectUser(u)}
                          className="px-2 py-1 rounded-lg bg-amber-500 text-black font-extrabold text-[10px] hover:brightness-110 cursor-pointer shadow-sm"
                        >
                          {isAr ? 'تجديد' : 'Renew'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Overview Stats Cards */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-1">
              <span className="text-[11px] text-[#787b86] font-bold block">{isAr ? 'إجمالي العملاء' : 'Total Accounts'}</span>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">{users.length}</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-1">
              <span className="text-[11px] text-amber-400 font-bold block">{isAr ? 'أعضاء VIP الفاعلون' : 'Active VIP Members'}</span>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">{totalVipCount}</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-1">
              <span className="text-[11px] text-emerald-400 font-bold block">{isAr ? 'إجمالي الإيرادات المحصلة' : 'Total Revenue Collected'}</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">${totalRevenueAll.toLocaleString()}</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-1">
              <span className="text-[11px] text-red-400 font-bold block">{isAr ? 'الحسابات المحظورة' : 'Global Banned Users'}</span>
              <div className="text-xl sm:text-2xl font-black text-red-400 font-mono">{totalBannedCount}</div>
            </div>
          </div>
        )}

        {/* TAB 1: USER CRM TABLE */}
        {activeTab === 'users' && (
          <div className="bg-[#131722] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-xl space-y-4 p-4">
            {/* Table Search & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={isAr ? 'بحث باسم العميل، البريد، أو الهاتف...' : 'Search by name, email, or phone...'}
                  className="w-full ps-10 pe-4 py-2 bg-[#1e222d] border border-[#2a2e39] focus:border-[#089981] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['ALL', 'EXPIRING_SOON', 'VIP', 'FREE', 'BANNED', 'MUTED', 'STAFF'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setUserFilterTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                      userFilterTab === tab
                        ? 'bg-[#089981] text-white shadow-sm'
                        : 'bg-[#1e222d] text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                    }`}
                  >
                    {tab === 'ALL'
                      ? (isAr ? 'الكل' : 'All')
                      : tab === 'EXPIRING_SOON'
                      ? (isAr ? '⚡ ينتهي قريباً' : 'Expiring Soon')
                      : tab === 'VIP'
                      ? 'VIP'
                      : tab === 'FREE'
                      ? (isAr ? 'مجاني' : 'Free')
                      : tab === 'BANNED'
                      ? (isAr ? '🚫 محظور' : 'Banned')
                      : tab === 'MUTED'
                      ? (isAr ? '🔇 مكتوم' : 'Muted')
                      : (isAr ? 'الطاقم' : 'Staff')}
                  </button>
                ))}
              </div>
            </div>

            {/* User CRM Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#2a2e39] bg-[#181c27] text-[#787b86] font-mono text-[11px]">
                    <th className="py-3 px-3 text-start">{isAr ? 'العميل' : 'Trader'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الهاتف والدولة' : 'Contact & Country'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الخبرة والأصول' : 'Trading Background'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الإيراد المحصل' : 'Total Revenue'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الرتبة والصلاحيات' : 'Role'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'الحظر والكتم' : 'Ban / Mute Controls'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2e39]/50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#787b86] italic">
                        {isAr ? 'لا يوجد عملاء يطابقون خيارات البحث الحالية.' : 'No users match the current filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#1e222d]/60 transition-colors group">
                        {/* Trader Identity */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#2a2e39] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-[#363a45]">
                              {u.displayName ? u.displayName[0].toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">{u.displayName}</span>
                              <span className="text-[10px] text-[#787b86] font-mono truncate block">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Contact & Country */}
                        <td className="py-3 px-3 font-mono">
                          <div className="space-y-0.5">
                            <span className="text-white block truncate">{u.phone || '—'}</span>
                            <span className="text-[10px] text-[#787b86] block truncate">{u.country || 'Global'}</span>
                          </div>
                        </td>

                        {/* Trading Background */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span className="text-amber-400 font-bold block text-[11px]">
                              {u.experienceLevel || 'Beginner'}
                            </span>
                            <span className="text-[10px] text-[#787b86] truncate block">
                              {u.assetClasses && u.assetClasses.length > 0 ? u.assetClasses.join(', ') : 'Indices, Forex'}
                            </span>
                          </div>
                        </td>

                        {/* Revenue */}
                        <td className="py-3 px-3 font-mono">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                            ${(u.totalPaid || 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3 px-3 font-mono">
                          {u.role === 'ADMIN' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                              ADMIN
                            </span>
                          ) : u.role === 'VIP' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              VIP MEMBER
                            </span>
                          ) : u.role === 'MODERATOR' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              MODERATOR
                            </span>
                          ) : u.role === 'SALES' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              SALES
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2a2e39] text-[#787b86]">
                              FREE
                            </span>
                          )}
                        </td>

                        {/* Ban / Mute Toggles */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {/* Ban Toggle */}
                            <button
                              onClick={() => handleToggleGlobalBan(u)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                u.isBanned
                                  ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                  : 'bg-[#1e222d] text-[#787b86] hover:text-white border-[#2a2e39]'
                              }`}
                              title={u.isBanned ? 'Banned from Platform' : 'Click to Ban'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>

                            {/* Chat Mute Toggle */}
                            <button
                              onClick={() => handleToggleChatMute(u)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                u.isMutedFromChat
                                  ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                                  : 'bg-[#1e222d] text-[#787b86] hover:text-white border-[#2a2e39]'
                              }`}
                              title={u.isMutedFromChat ? 'Muted from Community Chat' : 'Click to Mute Chat'}
                            >
                              <VolumeX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-end">
                          <button
                            onClick={() => {
                              soundManager.playClick();
                              setInspectUser(u);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#089981]/20 hover:bg-[#089981] text-[#089981] hover:text-white font-bold text-xs transition-all cursor-pointer"
                          >
                            {isAr ? 'فحص الملف' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PUBLISHING CENTER */}
        {activeTab === 'publishing' && (
          <div className="bg-[#131722] border border-[#2a2e39] rounded-2xl p-4 sm:p-6 shadow-xl">
            <PublishingCenter lang={lang} currentUserRole={effectiveRole} />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. DETAILED PROFILE INSPECTOR & MANUAL PAYMENT CRM MODAL */}
      {/* ========================================================================= */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div
            className="bg-[#1e222d] border border-[#2a2e39] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#181c27] border-b border-[#2a2e39] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                  CRM
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? `ملف العميل: ${inspectUser.displayName}` : `CRM Inspector: ${inspectUser.displayName}`}
                  </h3>
                  <p className="text-[10px] text-[#787b86] font-mono">UID: {inspectUser.id}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectUser(null)}
                className="p-1.5 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-[#787b86] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Core Details Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] text-xs">
                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
                  <span className="font-bold text-white font-mono truncate block">{inspectUser.email}</span>
                </div>

                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'رقم الهاتف' : 'Phone'}</span>
                  <span className="font-bold text-white font-mono block">{inspectUser.phone || '—'}</span>
                </div>

                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'الدولة' : 'Country'}</span>
                  <span className="font-bold text-white block">{inspectUser.country || 'Global'}</span>
                </div>

                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'مستوى الخبرة' : 'Experience'}</span>
                  <span className="font-bold text-amber-400 block">{inspectUser.experienceLevel || 'Beginner'}</span>
                </div>

                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'الأصول المفضلة' : 'Preferred Assets'}</span>
                  <span className="font-bold text-white block truncate">
                    {inspectUser.assetClasses && inspectUser.assetClasses.length > 0 ? inspectUser.assetClasses.join(', ') : 'Indices, Forex'}
                  </span>
                </div>

                <div>
                  <span className="text-[#787b86] text-[10px] block">{isAr ? 'إجمالي المدفوعات' : 'Lifetime Paid'}</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">${(inspectUser.totalPaid || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Role Setter Controls */}
              <div className="p-4 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-2">
                <span className="text-xs font-bold text-white block">{isAr ? 'تعيين رتبة العضوية' : 'Change User Role'}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {(['FREE', 'VIP', 'SALES', 'MODERATOR', 'ADMIN'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleSetRole(inspectUser.id, r)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        inspectUser.role === r
                          ? 'bg-[#089981] text-white shadow-md'
                          : 'bg-[#1e222d] text-[#787b86] hover:text-white border border-[#2a2e39]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Payment Logger & VIP Extension Form */}
              <form onSubmit={handleLogManualPayment} className="p-4 rounded-2xl bg-gradient-to-br from-[#131722] to-[#181c27] border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <DollarSign className="w-4 h-4" />
                  <span>{isAr ? 'تسجيل دفعة تفعيل وتجديد عضوية VIP' : 'Log Manual Payment & Renew VIP'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#787b86] font-bold mb-1">
                      {isAr ? 'المبلغ المستلم ($)' : 'Amount Paid ($)'}
                    </label>
                    <input
                      type="number"
                      value={paymentAmountInput}
                      onChange={(e) => setPaymentAmountInput(e.target.value)}
                      placeholder="299"
                      className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded-xl text-xs text-white font-mono focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#787b86] font-bold mb-1">
                      {isAr ? 'مدة التمديد' : 'Extension Duration'}
                    </label>
                    <select
                      value={paymentDurationInput}
                      onChange={(e) => setPaymentDurationInput(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded-xl text-xs text-white font-mono focus:outline-hidden cursor-pointer"
                    >
                      <option value="30">{isAr ? '+30 يوم' : '+30 Days'}</option>
                      <option value="90">{isAr ? '+90 يوم (3 أشهر)' : '+90 Days'}</option>
                      <option value="180">{isAr ? '+180 يوم (6 أشهر)' : '+180 Days'}</option>
                      <option value="365">{isAr ? '+365 يوم (سنة)' : '+365 Days'}</option>
                      <option value="lifetime">{isAr ? 'مدى الحياة (Lifetime)' : 'Lifetime'}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingPayment}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow-md hover:brightness-110 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoggingPayment ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-4 h-4 fill-black" />
                      <span>{isAr ? 'تسجيل الدفعة وتمديد VIP' : 'Log Payment & Extend VIP'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#181c27] border-t border-[#2a2e39] flex items-center justify-between shrink-0">
              <button
                onClick={() => setInspectUser(null)}
                className="px-4 py-2 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-bold transition-colors cursor-pointer ms-auto"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
