import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Newspaper,
  Calendar,
  Crown,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Flame,
  Search,
  Lock,
  UserCheck
} from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'VIP' | 'STANDARD';
  displayName: string;
  avatar?: string;
  createdAt: string;
}

interface NewsRecord {
  id: string;
  title: string;
  titleAr?: string;
  link: string;
  source: string;
  category: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  impactScore: number;
  createdAt: string;
}

interface CalendarRecord {
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
  createdAt: string;
}

interface Props {
  currentRole?: string;
  lang?: 'ar' | 'en';
  onClose?: () => void;
}

export const AdminManagementPanel: React.FC<Props> = ({
  currentRole = 'ADMIN',
  lang = 'ar',
  onClose
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'users' | 'news' | 'calendar'>('users');

  // Users State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'STANDARD' | 'VIP' | 'ADMIN'>('VIP');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // News State
  const [news, setNews] = useState<NewsRecord[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsTitleAr, setNewsTitleAr] = useState('');
  const [newsSource, setNewsSource] = useState('MBK Research');
  const [newsCategory, setNewsCategory] = useState('بنوك مركزية وفائدة');
  const [newsImpact, setNewsImpact] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [newsSentiment, setNewsSentiment] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('BULLISH');
  const [newsLink, setNewsLink] = useState('https://sa.investing.com/news');

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarRecord[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calEventAr, setCalEventAr] = useState('');
  const [calCountry, setCalCountry] = useState('الولايات المتحدة');
  const [calCurrency, setCalCurrency] = useState('USD');
  const [calTime, setCalTime] = useState('15:30');
  const [calImpact, setCalImpact] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [calActual, setCalActual] = useState('—');
  const [calForecast, setCalForecast] = useState('3.1%');
  const [calPrevious, setCalPrevious] = useState('3.2%');

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Fetch Users
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUsers(data.users);
      }
    } catch {
      // ignore
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
    } catch {
      // ignore
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
    } catch {
      // ignore
    } finally {
      setCalLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'news') fetchNews();
    if (activeTab === 'calendar') fetchCalendar();
  }, [activeTab]);

  // Handle Role Change
  const handleUpdateRole = async (userId: string, newRole: 'ADMIN' | 'VIP' | 'STANDARD') => {
    soundManager.playClick();
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        soundManager.playProfitChime();
        showFeedback('success', isAr ? `تم تحديث رتبة المستخدم إلى ${newRole}` : `User role updated to ${newRole}`);
        fetchUsers();
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا المستخدم من قاعدة البيانات؟' : 'Delete user from database?')) return;
    soundManager.playClick();
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('success', isAr ? 'تم حذف المستخدم' : 'User deleted');
        fetchUsers();
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserUsername || !newUserPassword) return;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUserUsername,
          password: newUserPassword,
          role: newUserRole,
          displayName: newUserDisplayName || newUserUsername
        })
      });

      const data = await res.json();
      if (res.ok) {
        soundManager.playProfitChime();
        showFeedback('success', isAr ? 'تم إنشاء الحساب بنجاح في SQLite' : 'User created in SQLite');
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserDisplayName('');
        setShowAddUserModal(false);
        fetchUsers();
      } else {
        showFeedback('error', data.error || 'Failed to create user');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Add News
  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitleAr.trim()) return;

    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newsTitleAr,
          titleAr: newsTitleAr,
          source: newsSource,
          category: newsCategory,
          impact: newsImpact,
          sentiment: newsSentiment,
          link: newsLink
        })
      });

      if (res.ok) {
        soundManager.playProfitChime();
        showFeedback('success', isAr ? 'تمت إضافة الخبر الاقتصادي وحفظه في SQLite' : 'News saved to SQLite');
        setNewsTitleAr('');
        fetchNews();
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Delete News
  const handleDeleteNews = async (id: string) => {
    soundManager.playClick();
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('success', isAr ? 'تم حذف الخبر' : 'News item deleted');
        fetchNews();
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Add Calendar Event
  const handleAddCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calEventAr.trim()) return;

    try {
      const res = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: calEventAr,
          eventAr: calEventAr,
          country: calCountry,
          currency: calCurrency,
          time: calTime,
          impact: calImpact,
          actual: calActual,
          forecast: calForecast,
          previous: calPrevious,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (res.ok) {
        soundManager.playProfitChime();
        showFeedback('success', isAr ? 'تمت إضافة الحدث الاقتصادي للتقويم في SQLite' : 'Event saved to SQLite');
        setCalEventAr('');
        fetchCalendar();
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Handle Delete Calendar
  const handleDeleteCalendar = async (id: string) => {
    soundManager.playClick();
    try {
      const res = await fetch(`/api/admin/calendar/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('success', isAr ? 'تم حذف الحدث الاقتصادي' : 'Event deleted');
        fetchCalendar();
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full text-white"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. HEADER */}
      <div className="p-3.5 sm:p-4 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{isAr ? 'لوحة تحكم المشرف (Admin Control Center)' : 'Admin Control Center'}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/40">
                SQLITE LIVE
              </span>
            </h2>
            <p className="text-[11px] text-[#787b86]">
              {isAr ? 'إدارة رتب المستخدمين (RBAC)، وتحديث قواعد بيانات الأخبار والتقويم الاقتصادي لحظياً' : 'Manage RBAC roles, News feeds, and Economic Calendar'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#1e222d] p-1 rounded-xl border border-[#2a2e39] text-xs">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('users');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#089981] text-white shadow'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isAr ? 'المستخدمين والرتب' : 'Users & Roles'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('news');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'news'
                ? 'bg-[#089981] text-white shadow'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>{isAr ? 'شريط الأخبار' : 'News Database'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('calendar');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[#089981] text-white shadow'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isAr ? 'التقويم الاقتصادي' : 'Calendar DB'}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`px-4 py-2 text-xs font-bold flex items-center justify-between border-b ${
            feedback.type === 'success'
              ? 'bg-[#089981]/20 border-[#089981]/40 text-[#089981]'
              : 'bg-[#f23645]/20 border-[#f23645]/40 text-[#f23645]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {/* 2. TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: USERS & RBAC MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-sm bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-1.5">
                <Search className="w-4 h-4 text-[#787b86]" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={isAr ? 'بحث عن مستخدم بالاسم أو الرتبة...' : 'Search user by name or role...'}
                  className="bg-transparent text-xs text-white placeholder-[#787b86] focus:outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  className="p-2 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
                  title={isAr ? 'تحديث القائمة' : 'Refresh'}
                >
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3 py-2 rounded-xl bg-[#089981] hover:bg-[#07806c] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'إضافة مستخدم جديد' : 'New User'}</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#131722] border border-[#2a2e39] rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[#2a2e39] text-[#787b86] font-medium bg-[#1e222d]/60">
                    <th className="p-3">{isAr ? 'المستخدم' : 'User'}</th>
                    <th className="p-3">{isAr ? 'اسم العرض' : 'Display Name'}</th>
                    <th className="p-3">{isAr ? 'الرتبة الحالية' : 'Role'}</th>
                    <th className="p-3">{isAr ? 'تغيير الرتبة (RBAC)' : 'Change Role'}</th>
                    <th className="p-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2e39]/60 font-mono">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#1e222d]/40 transition-colors">
                      <td className="p-3 font-sans">
                        <div className="flex items-center gap-2">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                            alt={u.username}
                            className="w-7 h-7 rounded-full object-cover border border-[#2a2e39]"
                          />
                          <div>
                            <span className="font-bold text-white block">{u.username}</span>
                            <span className="text-[10px] text-[#787b86] font-mono">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-sans text-[#d1d4dc]">
                        {u.displayName || u.username}
                      </td>

                      <td className="p-3">
                        {u.role === 'ADMIN' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black flex items-center gap-1 w-max">
                            <Crown className="w-2.5 h-2.5" />
                            ADMIN
                          </span>
                        ) : u.role === 'VIP' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center gap-1 w-max">
                            <Crown className="w-2.5 h-2.5" />
                            VIP
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700/50 text-slate-300 border border-slate-600/40 w-max block">
                            STANDARD
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateRole(u.id, 'STANDARD')}
                            className={`px-2 py-1 rounded text-[10px] font-sans font-bold cursor-pointer transition-all ${
                              u.role === 'STANDARD'
                                ? 'bg-slate-600 text-white'
                                : 'bg-[#1e222d] text-[#787b86] hover:text-white border border-[#2a2e39]'
                            }`}
                          >
                            Standard
                          </button>
                          <button
                            onClick={() => handleUpdateRole(u.id, 'VIP')}
                            className={`px-2 py-1 rounded text-[10px] font-sans font-bold cursor-pointer transition-all ${
                              u.role === 'VIP'
                                ? 'bg-amber-500 text-black'
                                : 'bg-[#1e222d] text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
                            }`}
                          >
                            VIP
                          </button>
                          <button
                            onClick={() => handleUpdateRole(u.id, 'ADMIN')}
                            className={`px-2 py-1 rounded text-[10px] font-sans font-bold cursor-pointer transition-all ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-500 text-black'
                                : 'bg-[#1e222d] text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                            }`}
                          >
                            Admin
                          </button>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer"
                          title={isAr ? 'حذف المستخدم' : 'Delete user'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: NEWS DATABASE MANAGEMENT */}
        {activeTab === 'news' && (
          <div className="space-y-4">
            {/* Create News Item Card */}
            <form onSubmit={handleAddNews} className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#089981]" />
                <span>{isAr ? 'إضافة خبر اقتصادي جديد إلى قاعدة بيانات SQLite' : 'Add New Economic News Item'}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-[#787b86] block mb-1">
                    {isAr ? 'عنوان الخبر المالي / العاجل *' : 'Headline *'}
                  </label>
                  <input
                    type="text"
                    value={newsTitleAr}
                    onChange={(e) => setNewsTitleAr(e.target.value)}
                    placeholder={isAr ? 'مثال: الفيدرالي الأمريكي يثبت الفائدة عند 5.25% مع إشارات تيسيرية...' : 'Headline...'}
                    className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-2 text-xs text-white placeholder-[#787b86] focus:outline-none focus:border-[#089981]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'المصدر' : 'Source'}</label>
                  <input
                    type="text"
                    value={newsSource}
                    onChange={(e) => setNewsSource(e.target.value)}
                    className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'التصنيف' : 'Category'}</label>
                  <input
                    type="text"
                    value={newsCategory}
                    onChange={(e) => setNewsCategory(e.target.value)}
                    className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'درجة التأثير' : 'Impact'}</label>
                  <select
                    value={newsImpact}
                    onChange={(e) => setNewsImpact(e.target.value as any)}
                    className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
                  >
                    <option value="HIGH">عالي التأثير 🔥 (High Impact)</option>
                    <option value="MEDIUM">متوسط التأثير ⚡ (Medium Impact)</option>
                    <option value="LOW">منخفض التأثير (Low Impact)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'المعنويات' : 'Sentiment'}</label>
                  <select
                    value={newsSentiment}
                    onChange={(e) => setNewsSentiment(e.target.value as any)}
                    className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
                  >
                    <option value="BULLISH">صعودي (Bullish)</option>
                    <option value="BEARISH">هبوطي (Bearish)</option>
                    <option value="NEUTRAL">محايد (Neutral)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#089981] hover:bg-[#07806c] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'حفظ ونشر الخبر فوراً' : 'Save & Publish News'}</span>
                </button>
              </div>
            </form>

            {/* News List */}
            <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center justify-between">
                <span>{isAr ? 'الأخبار المسجلة حالياً في SQLite' : 'Saved News in SQLite'} ({news.length})</span>
                <button
                  onClick={fetchNews}
                  className="text-[11px] text-[#089981] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                </button>
              </h4>

              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {news.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[#089981] text-[10px]">{item.source}</span>
                        <span className="text-[10px] text-[#787b86]">• {item.category}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          item.impact === 'HIGH'
                            ? 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {item.impact}
                        </span>
                      </div>
                      <p className="text-white font-semibold truncate">{item.titleAr || item.title}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteNews(item.id)}
                      className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer shrink-0"
                      title={isAr ? 'حذف الخبر' : 'Delete news'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ECONOMIC CALENDAR MANAGEMENT */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            {/* Create Calendar Event Form */}
            <form onSubmit={handleAddCalendar} className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#089981]" />
                <span>{isAr ? 'إضافة حدث جديد للتقويم الاقتصادي في SQLite' : 'Add Economic Calendar Event'}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-[#787b86] block mb-1">
                    {isAr ? 'اسم الحدث الاقتصادي *' : 'Event Name *'}
                  </label>
                  <input
                    type="text"
                    value={calEventAr}
                    onChange={(e) => setCalEventAr(e.target.value)}
                    placeholder={isAr ? 'مثال: مؤشر أسعار المستهلكين الأمريكي (CPI) الشهري' : 'Event name...'}
                    className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-2 text-xs text-white placeholder-[#787b86] focus:outline-none focus:border-[#089981]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'التوقيت' : 'Time'}</label>
                  <input
                    type="text"
                    value={calTime}
                    onChange={(e) => setCalTime(e.target.value)}
                    className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'العملة' : 'Currency'}</label>
                  <input
                    type="text"
                    value={calCurrency}
                    onChange={(e) => setCalCurrency(e.target.value)}
                    className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'التقديري' : 'Forecast'}</label>
                  <input
                    type="text"
                    value={calForecast}
                    onChange={(e) => setCalForecast(e.target.value)}
                    className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'السابق' : 'Previous'}</label>
                  <input
                    type="text"
                    value={calPrevious}
                    onChange={(e) => setCalPrevious(e.target.value)}
                    className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#089981] hover:bg-[#07806c] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'حفظ في التقويم' : 'Save Event'}</span>
                </button>
              </div>
            </form>

            {/* Calendar Events List */}
            <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center justify-between">
                <span>{isAr ? 'أحداث التقويم المحفوظة' : 'Saved Calendar Events'} ({calendarEvents.length})</span>
                <button
                  onClick={fetchCalendar}
                  className="text-[11px] text-[#089981] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                </button>
              </h4>

              <div className="space-y-2 max-h-[350px] overflow-y-auto font-mono">
                {calendarEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-cyan-400">{ev.currency}</span>
                        <span className="text-[#787b86] font-sans">• {ev.time}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#f23645]/20 text-[#f23645]">
                          {ev.impact}
                        </span>
                      </div>
                      <p className="text-white font-sans font-bold truncate">{ev.eventAr || ev.event}</p>
                      <div className="flex items-center gap-3 text-[10px] text-[#787b86] mt-1 font-mono">
                        <span>التقديري: {ev.forecast}</span>
                        <span>السابق: {ev.previous}</span>
                        <span>الفعلي: {ev.actual}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteCalendar(ev.id)}
                      className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#f23645]/20 text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer shrink-0"
                      title={isAr ? 'حذف الحدث' : 'Delete event'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD USER IN SQLITE */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddUser}
            className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 max-w-sm w-full space-y-3 shadow-2xl"
          >
            <h3 className="text-xs font-bold text-white flex items-center gap-2 pb-2 border-b border-[#2a2e39]">
              <UserCheck className="w-4 h-4 text-[#089981]" />
              <span>{isAr ? 'إنشاء حساب مستخدم جديد في SQLite' : 'Create New User in SQLite'}</span>
            </h3>

            <div>
              <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'اسم المستخدم (Username) *' : 'Username *'}</label>
              <input
                type="text"
                value={newUserUsername}
                onChange={(e) => setNewUserUsername(e.target.value)}
                required
                className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'اسم العرض' : 'Display Name'}</label>
              <input
                type="text"
                value={newUserDisplayName}
                onChange={(e) => setNewUserDisplayName(e.target.value)}
                className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'كلمة المرور *' : 'Password *'}</label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
                className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#787b86] block mb-1">{isAr ? 'الرتبة (Role)' : 'Role'}</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
                className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
              >
                <option value="STANDARD">Standard (مجاني)</option>
                <option value="VIP">VIP Trader (عضوية مميزة)</option>
                <option value="ADMIN">ADMIN (مشرف النظام)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2a2e39]">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-3 py-1.5 rounded-xl bg-[#131722] hover:bg-[#2a2e39] text-[#787b86] text-xs font-bold cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#089981] hover:bg-[#07806c] text-white text-xs font-bold cursor-pointer shadow"
              >
                {isAr ? 'حفظ في SQLite' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
