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
  TrendingDown,
  Filter,
  Check,
  X,
  Database,
  Sparkles,
  Clock,
  ArrowRight
} from 'lucide-react';
import { io } from 'socket.io-client';
import { soundManager } from '../../utils/audio';

export interface AdminUserRecord {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'VIP' | 'STANDARD';
  displayName: string;
  avatar?: string;
  createdAt: string;
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
  currentRole = 'ADMIN',
  isAdmin = true,
  lang = 'ar',
  onClose
}) => {
  const isAr = lang === 'ar';
  const roleUpper = (currentRole || '').toUpperCase();
  const hasAdminAccess = isAdmin || roleUpper === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'users' | 'news' | 'calendar' | 'overview'>('users');

  // ================= USERS STATE =================
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'STANDARD' | 'VIP' | 'ADMIN'>('ALL');
  const [isUpdatingUser, setIsUpdatingUser] = useState<string | null>(null);

  // New user modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'STANDARD' | 'VIP' | 'ADMIN'>('VIP');
  const [newDisplayName, setNewDisplayName] = useState('');

  // ================= NEWS STATE =================
  const [news, setNews] = useState<AdminNewsRecord[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSearch, setNewsSearch] = useState('');
  
  // Add / Edit News form
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsTitleAr, setNewsTitleAr] = useState('');
  const [newsTitleEn, setNewsTitleEn] = useState('');
  const [newsSource, setNewsSource] = useState('MBK Research');
  const [newsCategory, setNewsCategory] = useState('بنوك مركزية وفائدة');
  const [newsImpact, setNewsImpact] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [newsSentiment, setNewsSentiment] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('BULLISH');
  const [newsLink, setNewsLink] = useState('https://sa.investing.com/news');

  // ================= CALENDAR STATE =================
  const [calendarEvents, setCalendarEvents] = useState<AdminCalendarRecord[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calSearch, setCalSearch] = useState('');

  // Add / Edit Calendar form
  const [editingCalId, setEditingCalId] = useState<string | null>(null);
  const [calEventAr, setCalEventAr] = useState('');
  const [calEventEn, setCalEventEn] = useState('');
  const [calCountry, setCalCountry] = useState('الولايات المتحدة');
  const [calCurrency, setCalCurrency] = useState('USD');
  const [calTime, setCalTime] = useState('15:30');
  const [calImpact, setCalImpact] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [calActual, setCalActual] = useState('—');
  const [calForecast, setCalForecast] = useState('3.1%');
  const [calPrevious, setCalPrevious] = useState('3.2%');
  const [calDate, setCalDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Socket setup for instant admin sync
  useEffect(() => {
    const socket = io();

    socket.on('user_role_updated', (data: { userId: string; role: any }) => {
      setUsers(prev => prev.map(u => u.id === data.userId ? { ...u, role: data.role } : u));
    });

    socket.on('news_updated', () => {
      fetchNews();
    });

    socket.on('calendar_updated', () => {
      fetchCalendar();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch Users
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUsers(data.users);
      }
    } catch (err: any) {
      console.error('Fetch users error:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch News
  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const res = await fetch('/api/admin/news');
      if (res.ok) {
        const data = await res.json();
        if (data.news) setNews(data.news);
      }
    } catch (err: any) {
      console.error('Fetch news error:', err);
    } finally {
      setNewsLoading(false);
    }
  };

  // Fetch Calendar
  const fetchCalendar = async () => {
    setCalLoading(true);
    try {
      const res = await fetch('/api/admin/calendar');
      if (res.ok) {
        const data = await res.json();
        if (data.events) setCalendarEvents(data.events);
      }
    } catch (err: any) {
      console.error('Fetch calendar error:', err);
    } finally {
      setCalLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (hasAdminAccess) {
      fetchUsers();
      fetchNews();
      fetchCalendar();
    }
  }, [hasAdminAccess]);

  // ================= USER MANAGEMENT ACTIONS =================
  const handleToggleUserRole = async (user: AdminUserRecord) => {
    soundManager.playClick();
    const nextRole: 'STANDARD' | 'VIP' = user.role === 'VIP' ? 'STANDARD' : 'VIP';
    setIsUpdatingUser(user.id);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole })
      });

      if (res.ok) {
        soundManager.playProfitChime();
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: nextRole } : u));
        showFeedback(
          'success',
          isAr
            ? `تم تبديل رتبة المستخدم ${user.displayName || user.username} إلى ${nextRole === 'VIP' ? 'VIP مميز' : 'عادي Standard'}`
            : `Toggled user ${user.username} role to ${nextRole}`
        );
      } else {
        const data = await res.json();
        showFeedback('error', data.error || 'Failed to update user role');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setIsUpdatingUser(null);
    }
  };

  const handleSetRole = async (userId: string, targetRole: 'ADMIN' | 'VIP' | 'STANDARD') => {
    soundManager.playClick();
    setIsUpdatingUser(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole })
      });
      if (res.ok) {
        soundManager.playProfitChime();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u));
        showFeedback('success', isAr ? `تم تعيين الرتبة إلى ${targetRole}` : `Role set to ${targetRole}`);
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setIsUpdatingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(isAr ? `هل أنت متأكد من حذف الحساب "${username}" من قاعدة بيانات SQLite؟` : `Delete user "${username}" from SQLite?`)) {
      return;
    }
    soundManager.playClick();
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        showFeedback('info', isAr ? 'تم حذف المستخدم من النظام' : 'User deleted');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          displayName: newDisplayName || newUsername
        })
      });

      const data = await res.json();
      if (res.ok) {
        soundManager.playProfitChime();
        showFeedback('success', isAr ? 'تم تسجيل المستخدم وحفظه في SQLite' : 'User created in SQLite');
        setNewUsername('');
        setNewPassword('');
        setNewDisplayName('');
        setShowAddUserModal(false);
        fetchUsers();
      } else {
        showFeedback('error', data.error || 'Failed to create user');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // ================= NEWS ACTIONS =================
  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitleAr.trim()) {
      showFeedback('error', isAr ? 'يرجى إدخال عنوان الخبر' : 'News headline is required');
      return;
    }

    try {
      const payload = {
        title: newsTitleEn || newsTitleAr,
        titleAr: newsTitleAr,
        source: newsSource,
        category: newsCategory,
        impact: newsImpact,
        sentiment: newsSentiment,
        link: newsLink
      };

      if (editingNewsId) {
        // Edit existing
        const res = await fetch(`/api/admin/news/${editingNewsId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          soundManager.playProfitChime();
          showFeedback('success', isAr ? 'تم تحديث الخبر الاقتصادي ونشره لحظياً في شريط الأخبار' : 'News headline updated');
          resetNewsForm();
          fetchNews();
        } else {
          showFeedback('error', 'Error updating news');
        }
      } else {
        // Add new
        const res = await fetch('/api/admin/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          soundManager.playProfitChime();
          showFeedback('success', isAr ? 'تمت إضافة الخبر العاجل وحفظه في SQLite وبثه للشريط المباشر' : 'News headline saved and broadcast');
          resetNewsForm();
          fetchNews();
        } else {
          showFeedback('error', 'Error adding news');
        }
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleStartEditNews = (item: AdminNewsRecord) => {
    soundManager.playClick();
    setEditingNewsId(item.id);
    setNewsTitleAr(item.titleAr || item.title);
    setNewsTitleEn(item.title);
    setNewsSource(item.source);
    setNewsCategory(item.category);
    setNewsImpact(item.impact);
    setNewsSentiment(item.sentiment);
    setNewsLink(item.link);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetNewsForm = () => {
    setEditingNewsId(null);
    setNewsTitleAr('');
    setNewsTitleEn('');
    setNewsSource('MBK Research');
    setNewsCategory('بنوك مركزية وفائدة');
    setNewsImpact('HIGH');
    setNewsSentiment('BULLISH');
    setNewsLink('https://sa.investing.com/news');
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا الخبر من قاعدة البيانات؟' : 'Delete news item from SQLite?')) return;
    soundManager.playClick();
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' });
      if (res.ok) {
        soundManager.playClick();
        showFeedback('info', isAr ? 'تم حذف الخبر من الشريط' : 'News deleted');
        fetchNews();
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // ================= CALENDAR ACTIONS =================
  const handleSaveCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calEventAr.trim()) {
      showFeedback('error', isAr ? 'يرجى كتابة اسم الحدث الاقتصادي' : 'Calendar event name is required');
      return;
    }

    try {
      const payload = {
        event: calEventEn || calEventAr,
        eventAr: calEventAr,
        country: calCountry,
        currency: calCurrency,
        time: calTime,
        impact: calImpact,
        actual: calActual,
        forecast: calForecast,
        previous: calPrevious,
        date: calDate
      };

      if (editingCalId) {
        // Edit existing
        const res = await fetch(`/api/admin/calendar/${editingCalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          soundManager.playProfitChime();
          showFeedback('success', isAr ? 'تم تحديث بيانات الحدث الاقتصادي (الأرقام الفعلية والتقديرية)' : 'Calendar event updated');
          resetCalForm();
          fetchCalendar();
        }
      } else {
        // Add new
        const res = await fetch('/api/admin/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          soundManager.playProfitChime();
          showFeedback('success', isAr ? 'تمت إضافة الحدث الاقتصادي إلى جدول البيانات SQLite' : 'Calendar event added to SQLite');
          resetCalForm();
          fetchCalendar();
        }
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleStartEditCal = (item: AdminCalendarRecord) => {
    soundManager.playClick();
    setEditingCalId(item.id);
    setCalEventAr(item.eventAr || item.event);
    setCalEventEn(item.event);
    setCalCountry(item.country);
    setCalCurrency(item.currency);
    setCalTime(item.time);
    setCalImpact(item.impact);
    setCalActual(item.actual);
    setCalForecast(item.forecast);
    setCalPrevious(item.previous);
    setCalDate(item.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetCalForm = () => {
    setEditingCalId(null);
    setCalEventAr('');
    setCalEventEn('');
    setCalCountry('الولايات المتحدة');
    setCalCurrency('USD');
    setCalTime('15:30');
    setCalImpact('HIGH');
    setCalActual('—');
    setCalForecast('3.1%');
    setCalPrevious('3.2%');
    setCalDate(new Date().toISOString().split('T')[0]);
  };

  const handleDeleteCalendar = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا الحدث من التقويم الاقتصادي؟' : 'Delete calendar event?')) return;
    soundManager.playClick();
    try {
      const res = await fetch(`/api/admin/calendar/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('info', isAr ? 'تم حذف الحدث' : 'Calendar event deleted');
        fetchCalendar();
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Filtered views
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.displayName && u.displayName.toLowerCase().includes(userSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (userRoleFilter === 'ALL') return true;
    return u.role === userRoleFilter;
  });

  const filteredNews = news.filter(n =>
    (n.title && n.title.toLowerCase().includes(newsSearch.toLowerCase())) ||
    (n.titleAr && n.titleAr.includes(newsSearch)) ||
    (n.source && n.source.toLowerCase().includes(newsSearch.toLowerCase()))
  );

  const filteredCal = calendarEvents.filter(c =>
    (c.event && c.event.toLowerCase().includes(calSearch.toLowerCase())) ||
    (c.eventAr && c.eventAr.includes(calSearch)) ||
    (c.currency && c.currency.toLowerCase().includes(calSearch.toLowerCase()))
  );

  // Statistics
  const totalUsersCount = users.length;
  const vipUsersCount = users.filter(u => u.role === 'VIP').length;
  const standardUsersCount = users.filter(u => u.role === 'STANDARD').length;
  const adminUsersCount = users.filter(u => u.role === 'ADMIN').length;

  // ACCESS DENIED VIEW
  if (!hasAdminAccess) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center p-6 bg-[#0d1017]">
        <div className="max-w-md w-full bg-[#1e222d] border border-[#f23645]/40 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 start-0 w-full h-1 bg-[#f23645]" />
          <div className="w-16 h-16 rounded-2xl bg-[#f23645]/15 border border-[#f23645]/30 flex items-center justify-center text-[#f23645] mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isAr ? 'منطقة مقتصرة على الإدارة (Admin Only)' : 'Restricted Admin Access'}
          </h2>
          <p className="text-xs text-[#787b86] leading-relaxed mb-6">
            {isAr
              ? 'لوحة التحكم والعمليات مرتبطة مباشرة بجدول البيانات SQLite وإدارة المستخدمين، ومتاحة فقط للحسابات التي تحمل رتبة ADMIN.'
              : 'The Admin Control Center manages persistent SQLite tables and user RBAC permissions. It requires an ADMIN account.'}
          </p>
          <div className="p-3 bg-[#131722] rounded-xl border border-[#2a2e39] text-xs font-mono text-left mb-6 space-y-1">
            <div className="text-[#787b86]">User Role: <span className="text-[#f23645] font-bold">{currentRole}</span></div>
            <div className="text-[#787b86]">Status: <span className="text-[#f23645]">ACCESS_DENIED (403)</span></div>
            <div className="text-[#787b86]">Database: <span className="text-[#089981]">SQLite 3 (Persistent)</span></div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {isAr ? 'العودة إلى شاشة التداول' : 'Return to Trading Desk'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full flex flex-col bg-[#0d1017] text-[#d1d4dc] font-sans">
      {/* 1. TOP HEADER CONTROL BAR */}
      <header className="px-4 sm:px-6 py-3.5 bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {isAr ? 'مركز التحكم الإداري المؤسسي (Admin Control Center)' : 'Admin Control Center'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                SQLITE RBAC
              </span>
            </div>
            <p className="text-[11px] text-[#787b86]">
              {isAr
                ? 'إدارة قاعدة بيانات SQLite المباشرة: المستخدمين، شريط الأخبار العاجلة، والتقويم الاقتصادي'
                : 'Direct SQLite database management: Users, live news ticker, & economic calendar'}
            </p>
          </div>
        </div>

        {/* Status badges & close */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-[11px] font-mono text-[#089981]">
            <Database className="w-3.5 h-3.5" />
            <span className="font-bold">SQLite 3 Live</span>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              fetchUsers();
              fetchNews();
              fetchCalendar();
              showFeedback('info', isAr ? 'تمت إعادة مزامنة قاعدة البيانات' : 'Synced with database');
            }}
            className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
            title={isAr ? 'تحديث البيانات من SQLite' : 'Refresh from database'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
              title={isAr ? 'إغلاق اللوحة الإدارية' : 'Close Admin'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="px-4 sm:px-6 pt-4 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[#1e222d] border border-[#2a2e39] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#787b86] block">{isAr ? 'إجمالي المستخدمين' : 'Total Users'}</span>
            <span className="text-xl font-bold font-mono text-white">{totalUsersCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#1e222d] border border-[#2a2e39] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#787b86] block">{isAr ? 'أعضاء VIP' : 'VIP Members'}</span>
            <span className="text-xl font-bold font-mono text-[#089981]">{vipUsersCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#089981]/15 text-[#089981] flex items-center justify-center">
            <Crown className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#1e222d] border border-[#2a2e39] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#787b86] block">{isAr ? 'أخبار الشريط الحية' : 'News Headlines'}</span>
            <span className="text-xl font-bold font-mono text-amber-400">{news.length}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Newspaper className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#1e222d] border border-[#2a2e39] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#787b86] block">{isAr ? 'أحداث التقويم' : 'Calendar Events'}</span>
            <span className="text-xl font-bold font-mono text-cyan-400">{calendarEvents.length}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {feedback && (
        <div className="mx-4 sm:mx-6 my-2">
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
              feedback.type === 'success'
                ? 'bg-[#089981]/15 border-[#089981]/40 text-[#089981]'
                : feedback.type === 'error'
                ? 'bg-[#f23645]/15 border-[#f23645]/40 text-[#f23645]'
                : 'bg-blue-500/15 border-blue-500/40 text-blue-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : feedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. NAVIGATION TABS */}
      <div className="px-4 sm:px-6 pt-2 pb-3 border-b border-[#2a2e39] flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('users');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-[#089981] text-white shadow-lg shadow-[#089981]/20'
              : 'bg-[#1e222d] text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? 'إدارة المستخدمين والصلاحيات (Users & Roles)' : 'User Management'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/30">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('news');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'news'
              ? 'bg-[#089981] text-white shadow-lg shadow-[#089981]/20'
              : 'bg-[#1e222d] text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>{isAr ? 'شريط الأخبار الحية (Dynamic News Ticker)' : 'Dynamic News Ticker'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/30">
            {news.length}
          </span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('calendar');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'bg-[#089981] text-white shadow-lg shadow-[#089981]/20'
              : 'bg-[#1e222d] text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isAr ? 'التقويم الاقتصادي (Economic Calendar)' : 'Economic Calendar'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/30">
            {calendarEvents.length}
          </span>
        </button>
      </div>

      {/* 4. MAIN BODY CONTAINER */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {/* ============================================================== */}
        {/* SECTION 1: USER MANAGEMENT & ROLE TOGGLE */}
        {/* ============================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            {/* Action Bar */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[#787b86]" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={isAr ? 'ابحث باسم المستخدم أو البريد...' : 'Search by username or email...'}
                    className="w-full ps-9 pe-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden focus:border-[#089981]"
                  />
                </div>

                {/* Role Filter */}
                <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-xl border border-[#2a2e39]">
                  {(['ALL', 'VIP', 'STANDARD', 'ADMIN'] as const).map(rf => (
                    <button
                      key={rf}
                      onClick={() => setUserRoleFilter(rf)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        userRoleFilter === rf
                          ? 'bg-[#089981] text-white'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                    >
                      {rf === 'ALL' ? (isAr ? 'الكل' : 'All') : rf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add User Button */}
              <button
                onClick={() => {
                  soundManager.playClick();
                  setShowAddUserModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'تسجيل مستخدم جديد' : 'Add New User'}</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-[#131722] border-b border-[#2a2e39] text-[#787b86] font-semibold">
                      <th className="py-3 px-4">{isAr ? 'المستخدم' : 'User'}</th>
                      <th className="py-3 px-4">{isAr ? 'البريد الإلكتروني' : 'Email'}</th>
                      <th className="py-3 px-4">{isAr ? 'الرتبة الحالية' : 'Current Role'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'تبديل فوري (Standard ↔ VIP)' : 'Toggle Role'}</th>
                      <th className="py-3 px-4">{isAr ? 'تاريخ التسجيل' : 'Registered'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2e39]/60">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#787b86]">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#089981]" />
                          <span>{isAr ? 'جاري جلب المستخدمين من SQLite...' : 'Loading users from SQLite...'}</span>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#787b86]">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <span>{isAr ? 'لا يوجد مستخدمين مطابقين للبحث' : 'No users found matching query'}</span>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isVip = u.role === 'VIP';
                        const isAdminUser = u.role === 'ADMIN';
                        const isPending = isUpdatingUser === u.id;

                        return (
                          <tr key={u.id} className="hover:bg-[#131722]/60 transition-colors">
                            {/* User details */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                                  alt={u.username}
                                  className="w-8 h-8 rounded-full object-cover border border-[#2a2e39] shrink-0"
                                />
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>{u.displayName || u.username}</span>
                                    {isAdminUser && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                    )}
                                  </div>
                                  <div className="font-mono text-[10px] text-[#787b86]">@{u.username}</div>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="py-3 px-4 font-mono text-[#787b86]">
                              {u.email}
                            </td>

                            {/* Role Badge */}
                            <td className="py-3 px-4">
                              {isAdminUser ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                                  <span>ADMIN</span>
                                </span>
                              ) : isVip ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/40 shadow-sm shadow-[#089981]/10">
                                  <Crown className="w-3 h-3 text-[#089981]" />
                                  <span>VIP TRADER</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[#2a2e39] text-[#d1d4dc] border border-[#363a45]">
                                  <UserCheck className="w-3 h-3 text-[#787b86]" />
                                  <span>STANDARD</span>
                                </span>
                              )}
                            </td>

                            {/* Dynamic Toggle Button (Standard <-> VIP) */}
                            <td className="py-3 px-4 text-center">
                              {isAdminUser ? (
                                <span className="text-[11px] text-[#787b86] italic">
                                  {isAr ? 'حساب مدير رئيسي' : 'Super Admin'}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserRole(u)}
                                  disabled={isPending}
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                                    isVip
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                                      : 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40 hover:bg-[#089981]/30'
                                  }`}
                                  title={isAr ? 'انقر للتبديل الفوري بين Standard و VIP' : 'Click to toggle between Standard and VIP'}
                                >
                                  {isPending ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : isVip ? (
                                    <>
                                      <ToggleRight className="w-4 h-4 text-amber-400" />
                                      <span>{isAr ? 'تحويل إلى Standard' : 'Set to Standard'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="w-4 h-4 text-[#089981]" />
                                      <span>{isAr ? 'ترقية إلى VIP 🔥' : 'Upgrade to VIP'}</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>

                            {/* Created at */}
                            <td className="py-3 px-4 font-mono text-[11px] text-[#787b86]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US') : '—'}
                            </td>

                            {/* Actions (Delete or quick role assignment) */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {!isAdminUser && (
                                  <button
                                    onClick={() => handleSetRole(u.id, 'ADMIN')}
                                    className="p-1 rounded bg-[#131722] hover:bg-purple-900/40 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-1.5 cursor-pointer"
                                    title={isAr ? 'ترقية إلى Admin' : 'Promote to Admin'}
                                  >
                                    +Admin
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] border border-[#2a2e39] hover:border-[#f23645]/40 transition-colors cursor-pointer"
                                  title={isAr ? 'حذف من SQLite' : 'Delete user'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 2: DYNAMIC NEWS TICKER (Add, Edit, Delete SQLite Headlines) */}
        {/* ============================================================== */}
        {activeTab === 'news' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* News Form Card */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    {editingNewsId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {editingNewsId
                      ? (isAr ? 'تعديل خبر اقتصادي في SQLite' : 'Edit News Headline in SQLite')
                      : (isAr ? 'إضافة خبر عاجل جديد إلى شريط الأخبار' : 'Add Breaking News Headline to SQLite')}
                  </h3>
                </div>
                {editingNewsId && (
                  <button
                    onClick={resetNewsForm}
                    className="text-xs text-[#787b86] hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إلغاء التعديل' : 'Cancel Edit'}</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveNews} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Arabic Headline */}
                  <div>
                    <label className="block text-xs font-semibold text-[#d1d4dc] mb-1">
                      {isAr ? 'عنوان الخبر الاقتصادي (بالعربية) *' : 'Headline (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      value={newsTitleAr}
                      onChange={(e) => setNewsTitleAr(e.target.value)}
                      placeholder={isAr ? 'مثال: الفيدرالي الأمريكي يثبت الفائدة عند 5.25% مع إشارة لتخفيضين قادمين' : 'Enter Arabic headline...'}
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden focus:border-[#089981]"
                      required
                    />
                  </div>

                  {/* English Headline */}
                  <div>
                    <label className="block text-xs font-semibold text-[#d1d4dc] mb-1">
                      {isAr ? 'العنوان بالإنجليزية (اختياري)' : 'Headline (English)'}
                    </label>
                    <input
                      type="text"
                      value={newsTitleEn}
                      onChange={(e) => setNewsTitleEn(e.target.value)}
                      placeholder="e.g. Fed holds benchmark rate steady at 5.25%, signals rate cuts"
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden focus:border-[#089981]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Source */}
                  <div>
                    <label className="block text-xs font-semibold text-[#787b86] mb-1">
                      {isAr ? 'المصدر' : 'Source'}
                    </label>
                    <input
                      type="text"
                      value={newsSource}
                      onChange={(e) => setNewsSource(e.target.value)}
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#089981]"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-[#787b86] mb-1">
                      {isAr ? 'التصنيف' : 'Category'}
                    </label>
                    <select
                      value={newsCategory}
                      onChange={(e) => setNewsCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#089981]"
                    >
                      <option value="بنوك مركزية وفائدة">بنوك مركزية وفائدة (Central Banks)</option>
                      <option value="تضخم وأسعار مستهلكين">تضخم وأسعار مستهلكين (CPI Inflation)</option>
                      <option value="بيانات توظيف NFP">بيانات توظيف NFP (Labor & Jobs)</option>
                      <option value="الذهب والمعادن">الذهب والمعادن (Gold & Commodities)</option>
                      <option value="مؤشرات الأسهم ناسداك">مؤشرات الأسهم ناسداك (Indices & Equities)</option>
                      <option value="أخبار عاجلة">أخبار عاجلة (Breaking)</option>
                    </select>
                  </div>

                  {/* Impact */}
                  <div>
                    <label className="block text-xs font-semibold text-[#787b86] mb-1">
                      {isAr ? 'مستوى التأثير' : 'Market Impact'}
                    </label>
                    <select
                      value={newsImpact}
                      onChange={(e) => setNewsImpact(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#089981]"
                    >
                      <option value="HIGH">عالي التأثير 🔥 (HIGH)</option>
                      <option value="MEDIUM">متوسط التأثير ⚡ (MEDIUM)</option>
                      <option value="LOW">منخفض التأثير 🟢 (LOW)</option>
                    </select>
                  </div>

                  {/* Sentiment */}
                  <div>
                    <label className="block text-xs font-semibold text-[#787b86] mb-1">
                      {isAr ? 'التوجه / النبرة' : 'Sentiment'}
                    </label>
                    <select
                      value={newsSentiment}
                      onChange={(e) => setNewsSentiment(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#089981]"
                    >
                      <option value="BULLISH">صاعد إيجابي (BULLISH 🟢)</option>
                      <option value="BEARISH">هابط سلبي (BEARISH 🔴)</option>
                      <option value="NEUTRAL">محايد (NEUTRAL ⚪)</option>
                    </select>
                  </div>
                </div>

                {/* External Link */}
                <div>
                  <label className="block text-xs font-semibold text-[#787b86] mb-1">
                    {isAr ? 'رابط المقال / المصدر الكامل' : 'External Article Link'}
                  </label>
                  <input
                    type="url"
                    value={newsLink}
                    onChange={(e) => setNewsLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#089981]"
                  />
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  {editingNewsId && (
                    <button
                      type="button"
                      onClick={resetNewsForm}
                      className="px-4 py-2 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#089981] hover:bg-[#077d6a] text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {editingNewsId
                        ? (isAr ? 'حفظ التعديلات في SQLite ونشرها' : 'Save & Publish Edits')
                        : (isAr ? 'نشر الخبر في الشريط وحفظه في SQLite' : 'Save to SQLite & Broadcast')}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Existing News Headlines List */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-[#089981]" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {isAr ? 'عناوين شريط الأخبار المحفوظة في SQLite' : 'Headlines in SQLite news_items'}
                  </h3>
                </div>
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                  <input
                    type="text"
                    value={newsSearch}
                    onChange={(e) => setNewsSearch(e.target.value)}
                    placeholder={isAr ? 'تصفية الأخبار...' : 'Filter headlines...'}
                    className="w-full ps-8 pe-2.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white placeholder-[#787b86] focus:outline-hidden focus:border-[#089981]"
                  />
                </div>
              </div>

              <div className="divide-y divide-[#2a2e39]/60">
                {newsLoading ? (
                  <div className="py-12 text-center text-[#787b86]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#089981]" />
                    <span>{isAr ? 'جاري تحميل الأخبار من SQLite...' : 'Loading news from SQLite...'}</span>
                  </div>
                ) : filteredNews.length === 0 ? (
                  <div className="py-12 text-center text-[#787b86]">
                    <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>{isAr ? 'لا توجد أخبار مسجلة حالياً' : 'No news headlines found'}</span>
                  </div>
                ) : (
                  filteredNews.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-[#131722]/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.impact === 'HIGH' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-[#f23645]" />
                              <span>{isAr ? 'تأثير قوي' : 'HIGH IMPACT'}</span>
                            </span>
                          ) : item.impact === 'MEDIUM' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span>{isAr ? 'تأثير متوسط' : 'MED IMPACT'}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/40">
                              {isAr ? 'تأثير منخفض' : 'LOW IMPACT'}
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#2a2e39] text-[#d1d4dc]">
                            {item.category}
                          </span>

                          <span className="text-[11px] font-mono text-[#787b86]">
                            {item.source}
                          </span>

                          <span className="text-[10px] text-[#787b86] font-mono">
                            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white hover:text-[#089981] transition-colors leading-relaxed">
                          {item.titleAr || item.title}
                        </h4>

                        {item.titleAr && item.title !== item.titleAr && (
                          <p className="text-xs text-[#787b86] font-mono">
                            {item.title}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-colors"
                            title={isAr ? 'فتح الرابط الخارجي' : 'Open Link'}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          onClick={() => handleStartEditNews(item)}
                          className="p-1.5 rounded-lg bg-[#131722] hover:bg-amber-500/20 text-[#787b86] hover:text-amber-400 border border-[#2a2e39] hover:border-amber-500/40 transition-colors cursor-pointer"
                          title={isAr ? 'تعديل الخبر' : 'Edit News'}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteNews(item.id)}
                          className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] border border-[#2a2e39] hover:border-[#f23645]/40 transition-colors cursor-pointer"
                          title={isAr ? 'حذف الخبر' : 'Delete News'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 3: ECONOMIC CALENDAR MANAGEMENT (NFP, CPI, Rates in SQLite) */}
        {/* ============================================================== */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Event Form Card */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    {editingCalId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {editingCalId
                      ? (isAr ? 'تعديل حدث اقتصادي (الأرقام الفعلية والتوقعات)' : 'Edit Economic Event in SQLite')
                      : (isAr ? 'إضافة حدث جديد إلى التقويم الاقتصادي' : 'Add Economic Calendar Event to SQLite')}
                  </h3>
                </div>
                {editingCalId && (
                  <button
                    onClick={resetCalForm}
                    className="text-xs text-[#787b86] hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إلغاء التعديل' : 'Cancel Edit'}</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveCalendar} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Event Name Arabic */}
                  <div>
                    <label className="block text-xs font-semibold text-[#d1d4dc] mb-1">
                      {isAr ? 'اسم الحدث الاقتصادي (بالعربية) *' : 'Event Name (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      value={calEventAr}
                      onChange={(e) => setCalEventAr(e.target.value)}
                      placeholder={isAr ? 'مثال: تقرير الوظائف غير الزراعية الأمريكي (NFP)' : 'e.g. US Non-Farm Payrolls'}
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden focus:border-[#089981]"
                      required
                    />
                  </div>

                  {/* Event Name English */}
                  <div>
                    <label className="block text-xs font-semibold text-[#d1d4dc] mb-1">
                      {isAr ? 'اسم الحدث بالإنجليزية' : 'Event Name (English)'}
                    </label>
                    <input
                      type="text"
                      value={calEventEn}
                      onChange={(e) => setCalEventEn(e.target.value)}
                      placeholder="e.g. US Non-Farm Payrolls (NFP)"
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white placeholder-[#787b86] focus:outline-hidden focus:border-[#089981]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {/* Currency */}
                  <div>
                    <label className="block text-xs font-semibold text-[#787b86] mb-1">
                      {isAr ? 'العملة' : 'Currency'}
                    </label>
                    <select
                      value={calCurrency}
                      onChange={(e) => setCalCurrency(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-[#089981]"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="AUD">AUD</option>
                      <option value="CAD">CAD</option>
                      <option value="CHF">CHF</option>
                      <option value="OIL">OIL / XAU</option>
                    </select>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-xs font-semibold text-[#787b86] mb-1">
                      {isAr ? 'الدولة' : 'Country'}
                    </label>
                    <input
                      type="text"
                      value={calCountry}
                      onChange={(e) => setCalCountry(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#089981]"
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-xs font-semibold text-[#787b86] mb-1">
                      {isAr ? 'التوقيت' : 'Time'}
                    </label>
                    <input
                      type="text"
                      value={calTime}
                      onChange={(e) => setCalTime(e.target.value)}
                      placeholder="15:30"
                      className="w-full px-2.5 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-[#089981]"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-[#787b86] mb-1">
                      {isAr ? 'التاريخ' : 'Date'}
                    </label>
                    <input
                      type="date"
                      value={calDate}
                      onChange={(e) => setCalDate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-[#089981]"
                    />
                  </div>

                  {/* Impact */}
                  <div className="col-span-2 sm:col-span-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-[#787b86] mb-1">
                      {isAr ? 'الأهمية' : 'Impact'}
                    </label>
                    <select
                      value={calImpact}
                      onChange={(e) => setCalImpact(e.target.value as any)}
                      className="w-full px-2.5 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#089981]"
                    >
                      <option value="HIGH">عالي التأثير 🔥 (High Impact)</option>
                      <option value="MEDIUM">متوسط التأثير ⚡ (Medium Impact)</option>
                      <option value="LOW">منخفض التأثير 🟢 (Low Impact)</option>
                    </select>
                  </div>
                </div>

                {/* Values: Actual, Forecast, Previous */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-[#131722] rounded-xl border border-[#2a2e39]">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                      {isAr ? 'الفعلي (Actual) *عند الصدور*' : 'Actual (Upon Release)'}
                    </label>
                    <input
                      type="text"
                      value={calActual}
                      onChange={(e) => setCalActual(e.target.value)}
                      placeholder="— أو 185K أو 3.1%"
                      className="w-full px-3 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs font-mono font-bold text-emerald-400 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#d1d4dc] mb-1">
                      {isAr ? 'التقديري (Forecast)' : 'Forecast'}
                    </label>
                    <input
                      type="text"
                      value={calForecast}
                      onChange={(e) => setCalForecast(e.target.value)}
                      placeholder="3.1%"
                      className="w-full px-3 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-[#089981]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#787b86] mb-1">
                      {isAr ? 'السابق (Previous)' : 'Previous'}
                    </label>
                    <input
                      type="text"
                      value={calPrevious}
                      onChange={(e) => setCalPrevious(e.target.value)}
                      placeholder="3.2%"
                      className="w-full px-3 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs font-mono text-[#787b86] focus:outline-hidden focus:border-[#089981]"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  {editingCalId && (
                    <button
                      type="button"
                      onClick={resetCalForm}
                      className="px-4 py-2 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {editingCalId
                        ? (isAr ? 'حفظ التعديلات في SQLite وبث التحديث' : 'Save Event Changes')
                        : (isAr ? 'إضافة الحدث للتقويم وحفظه في SQLite' : 'Add to Calendar Table')}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Calendar Events Table */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {isAr ? 'أحداث التقويم الاقتصادي في جدول SQLite' : 'Events in SQLite calendar_events'}
                  </h3>
                </div>
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[#787b86]" />
                  <input
                    type="text"
                    value={calSearch}
                    onChange={(e) => setCalSearch(e.target.value)}
                    placeholder={isAr ? 'بحث في الأحداث...' : 'Filter events...'}
                    className="w-full ps-8 pe-2.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white placeholder-[#787b86] focus:outline-hidden focus:border-[#089981]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-[#131722] border-b border-[#2a2e39] text-[#787b86] font-semibold">
                      <th className="py-3 px-4">{isAr ? 'الحدث الاقتصادي' : 'Event'}</th>
                      <th className="py-3 px-4">{isAr ? 'العملة / الدولة' : 'Currency'}</th>
                      <th className="py-3 px-4">{isAr ? 'التاريخ والوقت' : 'Date & Time'}</th>
                      <th className="py-3 px-4">{isAr ? 'الأهمية' : 'Impact'}</th>
                      <th className="py-3 px-4 font-mono">{isAr ? 'التقديري' : 'Forecast'}</th>
                      <th className="py-3 px-4 font-mono">{isAr ? 'السابق' : 'Previous'}</th>
                      <th className="py-3 px-4 font-mono text-emerald-400">{isAr ? 'الفعلي' : 'Actual'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2e39]/60">
                    {calLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#787b86]">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                          <span>{isAr ? 'جاري جلب التقويم من SQLite...' : 'Loading calendar from SQLite...'}</span>
                        </td>
                      </tr>
                    ) : filteredCal.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#787b86]">
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <span>{isAr ? 'لا توجد أحداث اقتصادية مسجلة' : 'No calendar events found'}</span>
                        </td>
                      </tr>
                    ) : (
                      filteredCal.map((ev) => (
                        <tr key={ev.id} className="hover:bg-[#131722]/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <div>{ev.eventAr || ev.event}</div>
                            {ev.eventAr && ev.event !== ev.eventAr && (
                              <div className="text-[10px] text-[#787b86] font-mono">{ev.event}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                              {ev.currency}
                            </span>
                            <span className="ms-1.5 text-[#787b86] text-[11px]">{ev.country}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#d1d4dc]">
                            <div>{ev.time}</div>
                            <div className="text-[10px] text-[#787b86]">{ev.date}</div>
                          </td>
                          <td className="py-3 px-4">
                            {ev.impact === 'HIGH' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40 flex items-center gap-1 w-max">
                                <Flame className="w-3 h-3" />
                                <span>عالي 🔥</span>
                              </span>
                            ) : ev.impact === 'MEDIUM' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 w-max">
                                متوسط ⚡
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#089981]/20 text-[#089981] border border-[#089981]/40 w-max">
                                منخفض 🟢
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#d1d4dc]">{ev.forecast || '—'}</td>
                          <td className="py-3 px-4 font-mono text-[#787b86]">{ev.previous || '—'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {ev.actual && ev.actual !== '—' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                                {ev.actual}
                              </span>
                            ) : (
                              <span className="text-[#787b86]">قيد الانتظار</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleStartEditCal(ev)}
                                className="p-1.5 rounded-lg bg-[#131722] hover:bg-cyan-500/20 text-[#787b86] hover:text-cyan-400 border border-[#2a2e39] hover:border-cyan-500/40 transition-colors cursor-pointer"
                                title={isAr ? 'تعديل الحدث / النتيجة الفعلية' : 'Edit Event / Actual Value'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCalendar(ev.id)}
                                className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] border border-[#2a2e39] hover:border-[#f23645]/40 transition-colors cursor-pointer"
                                title={isAr ? 'حذف الحدث' : 'Delete Event'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
