import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Gift,
  KeyRound,
  Mail,
  Megaphone,
  Pause,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Users
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { soundManager } from '../../utils/audio';
import {
  AdminAnnouncement,
  AnnouncementCtaType,
  AnnouncementType,
  BulkDmSegment,
  TargetAudienceSegment,
  createAdminPopupAnnouncement,
  deleteAnnouncement,
  getUserRemainingSubscriptionDays,
  sendBulkDirectMessageToUsers,
  subscribeToActiveAnnouncements,
  toggleAnnouncementActive
} from '../../services/macroEventsAndAnnouncementsService';

export interface BroadcastUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  tier?: 'free' | 'vip' | 'elite';
  isVip?: boolean;
  isElite?: boolean;
  vipExpiryDate?: string | null;
  eliteExpiryDate?: string | null;
  subscriptionEndDate?: string | null;
  grantedFeatures?: Partial<Record<string, string>>;
  isBanned?: boolean;
}

interface Props {
  users: BroadcastUserItem[];
  isAr: boolean;
  onShowFeedback: (type: 'success' | 'error' | 'info', message: string) => void;
}

const AVAILABLE_TABS: Array<{ id: string; labelAr: string; labelEn: string }> = [
  { id: 'on_open', labelAr: '🚀 عند فتح الموقع/التطبيق', labelEn: '🚀 On App Open' },
  { id: 'all', labelAr: '🌐 في جميع الأقسام والتبويبات', labelEn: '🌐 Every Tab (All)' },
  { id: 'signals', labelAr: '📡 قنوات الإشارات والبوت', labelEn: '📡 Signals & Bot Hub' },
  { id: 'chart', labelAr: '📈 الرسم البياني (الشارت)', labelEn: '📈 Live Chart' },
  { id: 'chat', labelAr: '💬 شات VIP المباشر', labelEn: '💬 VIP Live Chat' },
  { id: 'dm', labelAr: '✉️ الرسائل الخاصة (الوارد)', labelEn: '✉️ Direct Messages' },
  { id: 'ai', labelAr: '🤖 المستشار الذكي (AI)', labelEn: '🤖 AI Analyst' },
  { id: 'calendar', labelAr: '📅 التقويم الاقتصادي', labelEn: '📅 Economic Calendar' },
  { id: 'news', labelAr: '📰 الأخبار الاقتصادية', labelEn: '📰 Financial News' },
  { id: 'paper', labelAr: '💼 التداول التجريبي', labelEn: '💼 Paper Trading' },
  { id: 'academy', labelAr: '🎓 الأكاديمية التعليمية', labelEn: '🎓 Trading Academy' },
  { id: 'elite', labelAr: '💎 باقة Elite', labelEn: '💎 Elite Modules' }
];

export const AdminBroadcastsTab: React.FC<Props> = ({ users, isAr, onShowFeedback }) => {
  // ================= 1. POPUP ANNOUNCEMENTS STATE =================
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState<AnnouncementType>('offer');
  const [selectedTabs, setSelectedTabs] = useState<string[]>(['on_open', 'all']);
  const [targetAudience, setTargetAudience] = useState<TargetAudienceSegment>('all');
  const [ctaType, setCtaType] = useState<AnnouncementCtaType>('plans');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [isPublishingPopup, setIsPublishingPopup] = useState(false);

  // ================= 2. BULK DIRECT MESSAGES STATE =================
  const [dmSegment, setDmSegment] = useState<BulkDmSegment>('all');
  const [dmMessageText, setDmMessageText] = useState('');
  const [isSendingBulkDm, setIsSendingBulkDm] = useState(false);

  useEffect(() => {
    const unsub = subscribeToActiveAnnouncements((list) => {
      setAnnouncements(list);
    });
    return () => unsub();
  }, []);

  const toggleTabSelection = (tabId: string) => {
    soundManager.playClick();
    setSelectedTabs((prev) => {
      if (prev.includes(tabId)) {
        const filtered = prev.filter((t) => t !== tabId);
        return filtered.length > 0 ? filtered : ['on_open'];
      }
      return [...prev, tabId];
    });
  };

  const applyPopupPreset = (preset: 'cpi_warning' | 'fed_warning' | 'vip_offer' | 'expiring_offer') => {
    soundManager.playClick();
    if (preset === 'cpi_warning') {
      setPopupType('event');
      setPopupTitle(
        isAr
          ? '⚠️ تحذير هام: متبقي ساعة واحدة على صدور بيانات التضخم الأمريكية (CPI)!'
          : '⚠️ Warning: 1 Hour Remaining Until US CPI Inflation Release!'
      );
      setPopupMessage(
        isAr
          ? 'تنبيه لجميع المتداولين: ستصدر بيانات مؤشر أسعار المستهلكين الأمريكي (CPI) خلال أقل من ساعة. يتوقع تقلبات سعرية قوية جداً على الذهب XAUUSD والناسداك US100 والدولار. يرجى تأمين الصفقات المفتوحة والالتزام بإدارة المخاطر.'
          : 'Attention Traders: US CPI inflation data releases in less than 1 hour. Expect high volatility on XAUUSD, US100, and USD pairs. Secure open positions and manage your stop-loss levels.'
      );
      setSelectedTabs(['on_open', 'all']);
      setTargetAudience('all');
      setCtaType('calendar');
      setCtaLabel(isAr ? 'فتح التقويم الاقتصادي' : 'Open Economic Calendar');
    } else if (preset === 'fed_warning') {
      setPopupType('event');
      setPopupTitle(
        isAr
          ? '⚠️ تحذير الفيدرالي: متبقي ساعة واحدة على قرار الفائدة الأمريكية (FOMC)!'
          : '⚠️ Fed Warning: 1 Hour Until Federal Reserve Rate Decision (FOMC)!'
      );
      setPopupMessage(
        isAr
          ? 'سيصدر قرار الفائدة من البنك الاحتياطي الفيدرالي الأمريكي والمؤتمر الصحفي لجيروم باول بعد ساعة واحدة. احذر من الانزلاقات السعرية وقم بحماية أرباحك.'
          : 'The Federal Reserve interest rate decision and Chair Powell press conference begin in 1 hour. Protect your capital and watch key liquidity levels.'
      );
      setSelectedTabs(['on_open', 'all']);
      setTargetAudience('all');
      setCtaType('calendar');
      setCtaLabel(isAr ? 'متابعة الحدث في التقويم' : 'View Event in Calendar');
    } else if (preset === 'vip_offer') {
      setPopupType('offer');
      setPopupTitle(
        isAr
          ? '🔥 عرض خاص لفترة محدودة: انضم إلى نخبة متداولي VIP اليوم!'
          : '🔥 Limited-Time Offer: Upgrade to VIP Trading Access Today!'
      );
      setPopupMessage(
        isAr
          ? 'احصل على وصول فوري لتوصيات المحللين المباشرة، وبث روبوت TradingView Webhook اللحظي، وغرفة شات النخبة VIP، والمستشار الذكي.'
          : 'Unlock real-time analyst setups, automated TradingView Webhook Bot alerts, VIP live chat, and the AI Market Analyst.'
      );
      setSelectedTabs(['on_open', 'signals', 'chart']);
      setTargetAudience('free');
      setCtaType('plans');
      setCtaLabel(isAr ? 'عرض الباقات والترقية الآن' : 'View VIP Plans');
    } else if (preset === 'expiring_offer') {
      setPopupType('offer');
      setPopupTitle(
        isAr
          ? '⏰ تذكير هام: اشتراكك في باقة VIP قارب على الانتهاء!'
          : '⏰ Reminder: Your VIP Subscription Is Expiring Soon!'
      );
      setPopupMessage(
        isAr
          ? 'جدد اشتراكك الآن قبل انتهاء المدة لضمان استمرار وصول توصيات VIP وتنبيهات البوت الآلي وغرفة الشات بدون أي انقطاع.'
          : 'Renew your subscription now to keep uninterrupted access to VIP signals, TradingView bot alerts, and the VIP chat room.'
      );
      setSelectedTabs(['on_open', 'all']);
      setTargetAudience('expiring_soon');
      setCtaType('plans');
      setCtaLabel(isAr ? 'تجديد الاشتراك الآن' : 'Renew Subscription');
    }
  };

  const handlePublishPopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!popupTitle.trim() || !popupMessage.trim()) return;
    setIsPublishingPopup(true);
    soundManager.playClick();
    try {
      await createAdminPopupAnnouncement({
        title: popupTitle,
        message: popupMessage,
        type: popupType,
        targetTabs: selectedTabs,
        targetAudience,
        ctaType,
        ctaLabel,
        ctaUrl
      });
      soundManager.playProfitChime();
      onShowFeedback(
        'success',
        isAr
          ? 'تم نشر النافذة المنبثقة (Popup) بنجاح وستظهر فوراً للمستخدمين المستهدفين!'
          : 'Popup announcement published live to target users!'
      );
      setPopupTitle('');
      setPopupMessage('');
    } catch (err: any) {
      onShowFeedback('error', err?.message || (isAr ? 'فشل نشر الإعلان المنبثق' : 'Failed to publish popup'));
    } finally {
      setIsPublishingPopup(false);
    }
  };

  // Compute matching users for Bulk DM segment
  const matchingDmRecipients = useMemo(() => {
    const currentAdminUid = auth.currentUser?.uid;
    return users
      .filter((u) => {
        if (u.isBanned) return false;
        if (currentAdminUid && u.id === currentAdminUid) return false;
        const remDays = getUserRemainingSubscriptionDays(u);
        const isElite = u.tier === 'elite' || Boolean(u.isElite) || u.role === 'ELITE';
        const isVip = isElite || u.tier === 'vip' || Boolean(u.isVip) || u.role === 'VIP';

        if (dmSegment === 'all') return true;
        if (dmSegment === 'expiring_soon') {
          return remDays !== null && remDays > 0 && remDays <= 7;
        }
        if (dmSegment === 'expired') {
          return remDays !== null && remDays <= 0;
        }
        if (dmSegment === 'free') {
          return !isVip && (remDays === null || remDays <= 0);
        }
        if (dmSegment === 'vip') {
          return isVip && (remDays === null || remDays > 0);
        }
        if (dmSegment === 'elite') {
          return isElite && (remDays === null || remDays > 0);
        }
        return true;
      })
      .map((u) => ({
        uid: u.id,
        name: u.name || u.email.split('@')[0] || 'Trader',
        email: u.email,
        role: u.role,
        remainingDays: getUserRemainingSubscriptionDays(u)
      }));
  }, [users, dmSegment]);

  const applyDmTemplate = (tpl: 'expiring' | 'offer' | 'macro' | 'general') => {
    soundManager.playClick();
    if (tpl === 'expiring') {
      setDmSegment('expiring_soon');
      setDmMessageText(
        isAr
          ? 'مرحباً {name} 👋،\nنود تذكيرك بأن اشتراكك الفعال في منصة MBK Trading سينتهي خلال {days} أيام.\nيمكنك التجديد الآن أو التواصل مع الدعم لضمان استمرار وصول توصيات VIP وتنبيهات البوت الآلي وغرفة الشات دون انقطاع.'
          : 'Hello {name} 👋,\nYour MBK Trading subscription expires in {days} days. Renew now to keep uninterrupted access to VIP signals, TradingView bot alerts, and live VIP chat.'
      );
    } else if (tpl === 'offer') {
      setDmSegment('free');
      setDmMessageText(
        isAr
          ? 'مرحباً {name} 🔥،\nعرض خاص وحصري لك من إدارة MBK Trading!\nقم بترقية حسابك إلى باقة VIP اليوم واحصل على وصول فوري لتوصيات النخبة، وبث روبوت TradingView Webhook اللحظي، وغرفة الشات المباشرة.'
          : 'Hello {name} 🔥,\nExclusive offer from MBK Trading! Upgrade your account to VIP today and unlock real-time VIP trade signals, automated TradingView bot alerts, and VIP community chat.'
      );
    } else if (tpl === 'macro') {
      setDmSegment('all');
      setDmMessageText(
        isAr
          ? 'تنبيه هام للمتداول {name} ⚠️:\nترقبوا اليوم صدور بيانات اقتصادية هامة جداً (CPI / الفيدرالي). يرجى متابعة قسم التقويم الاقتصادي وقناة الإشارات وتأمين الصفقات المفتوحة.'
          : 'Important Alert for {name} ⚠️:\nMajor macroeconomic data (CPI / Federal Reserve) releases today. Please check the Economic Calendar and Signals Hub and secure your open trades.'
      );
    } else {
      setDmSegment('all');
      setDmMessageText(
        isAr
          ? 'مرحباً {name} 📢،\nإعلان جديد من إدارة MBK Trading: تم تحديث المنصة وإضافة ميزات جديدة. نتمنى لك تداولاً موفقاً ومربحاً!'
          : 'Hello {name} 📢,\nOfficial announcement from MBK Trading: New platform features and setups are now live. Wishing you profitable trading!'
      );
    }
  };

  const handleSendBulkDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmMessageText.trim()) return;
    if (matchingDmRecipients.length === 0) {
      onShowFeedback(
        'error',
        isAr ? 'لا يوجد مستخدمين مطابقين لهذه الفئة حالياً.' : 'No matching users found in this segment.'
      );
      return;
    }

    const adminUser = auth.currentUser;
    if (!adminUser) {
      onShowFeedback('error', isAr ? 'يرجى تسجيل الدخول بحساب المشرف أولاً.' : 'Please sign in as Admin first.');
      return;
    }

    setIsSendingBulkDm(true);
    soundManager.playClick();
    try {
      const adminName = adminUser.displayName || (isAr ? 'إدارة MBK Trading' : 'MBK Trading Admin');
      const { sentCount, failedCount } = await sendBulkDirectMessageToUsers({
        adminUid: adminUser.uid,
        adminName,
        recipients: matchingDmRecipients,
        messageTemplate: dmMessageText
      });

      soundManager.playProfitChime();
      onShowFeedback(
        'success',
        isAr
          ? `تم إرسال الرسالة الخاصة بنجاح إلى ${sentCount} مستخدم في صندوق الوارد (DM)!${
              failedCount > 0 ? ` (تعذر الإرسال لـ ${failedCount})` : ''
            }`
          : `Successfully sent Direct Message to ${sentCount} users!${
              failedCount > 0 ? ` (${failedCount} failed)` : ''
            }`
      );
      setDmMessageText('');
    } catch (err: any) {
      onShowFeedback('error', err?.message || (isAr ? 'فشل إرسال الرسائل الجماعية' : 'Bulk DM failed'));
    } finally {
      setIsSendingBulkDm(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ======================================================================= */}
      {/* SECTION 1: POPUP ANNOUNCEMENTS & 1-HOUR MACRO EVENT WARNING STUDIO */}
      {/* ======================================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#2a2e39]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {isAr
                  ? 'إرسال النوافذ المنبثقة الفورية (Popups) وتحذيرات الأخبار والعروض'
                  : 'Live Popup Announcements, Offers & Macro Event Warnings'}
              </h3>
              <p className="text-xs text-[#787b86] mt-0.5">
                {isAr
                  ? 'أرسل إشعاراً منبثقاً يظهر للمتداولين عند فتح التطبيق أو داخل أي قسم تختاره (مع تنبيه صوتي وإشعار هاتف)'
                  : 'Push an instant popup card when users open the app or visit specific tabs (with sound chime & mobile notification)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              window.dispatchEvent(new CustomEvent('mbk-trigger-macro-warning', { detail: { code: 'CPI' } }));
              onShowFeedback(
                'info',
                isAr
                  ? 'تم إطلاق معاينة نافذة تحذير الـ 60 دقيقة لخبر CPI الآن أسفل الشاشة!'
                  : 'Triggered 1-hour CPI warning popup preview!'
              );
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>{isAr ? 'معاينة تنبيه CPI (قبل ساعة)' : 'Preview 1h CPI Popup'}</span>
          </button>
        </div>

        {/* Quick 1-Click Templates */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[#787b86] block">
            {isAr ? 'قوالب سريعة جاهزة بضغطة واحدة:' : 'Quick 1-Click Presets:'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyPopupPreset('cpi_warning')}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{isAr ? '⚠️ تحذير CPI (باقي ساعة)' : '⚠️ 1-Hour CPI Warning'}</span>
            </button>

            <button
              type="button"
              onClick={() => applyPopupPreset('fed_warning')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isAr ? '🏦 تحذير الفيدرالي FOMC' : '🏦 Fed Rate Warning'}</span>
            </button>

            <button
              type="button"
              onClick={() => applyPopupPreset('vip_offer')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>{isAr ? '🔥 عرض ترقية VIP للمجانيين' : '🔥 VIP Offer for Free Users'}</span>
            </button>

            <button
              type="button"
              onClick={() => applyPopupPreset('expiring_offer')}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isAr ? '⏰ تنبيه قرب انتهاء الاشتراك' : '⏰ Expiring Subscription Alert'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handlePublishPopup} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Popup Style Type */}
            <div>
              <label className="block text-[11px] font-bold text-[#787b86] mb-1.5">
                {isAr ? 'نوع النافذة المنبثقة' : 'Popup Category'}
              </label>
              <select
                value={popupType}
                onChange={(e) => setPopupType(e.target.value as AnnouncementType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs font-bold text-white focus:outline-hidden cursor-pointer"
              >
                <option value="offer">{isAr ? '🔥 عرض خاص / خصم (Offer)' : '🔥 Special Offer'}</option>
                <option value="event">{isAr ? '⚠️ تحذير خبر اقتصادي هام (CPI / Fed)' : '⚠️ Macro Event Warning'}</option>
                <option value="news">{isAr ? '📢 إعلان أو خبر هام (Announcement)' : '📢 Official News'}</option>
                <option value="update">{isAr ? '🚀 تحديث جديد بالمنصة (Update)' : '🚀 Platform Update'}</option>
              </select>
            </div>

            {/* Target Audience Segment */}
            <div>
              <label className="block text-[11px] font-bold text-[#787b86] mb-1.5">
                {isAr ? 'الفئة المستهدفة بالظهور' : 'Target User Segment'}
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as TargetAudienceSegment)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs font-bold text-white focus:outline-hidden cursor-pointer"
              >
                <option value="all">{isAr ? '👥 جميع المستخدمين (All Users)' : '👥 All Users'}</option>
                <option value="free">{isAr ? '🆓 الأعضاء المجانيين فقط (Free Tier)' : '🆓 Free Users Only'}</option>
                <option value="expiring_soon">
                  {isAr ? '⏰ من ينتهي اشتراكهم قريباً (<= 7 أيام)' : '⏰ Expiring Soon (<= 7 Days)'}
                </option>
                <option value="vip">{isAr ? '👑 أعضاء VIP و Elite' : '👑 VIP & Elite Members'}</option>
                <option value="elite">{isAr ? '💎 أعضاء Elite فقط' : '💎 Elite Members Only'}</option>
              </select>
            </div>

            {/* CTA Button Action */}
            <div>
              <label className="block text-[11px] font-bold text-[#787b86] mb-1.5">
                {isAr ? 'زر الإجراء داخل النافذة (اختياري)' : 'Popup Action Button (CTA)'}
              </label>
              <select
                value={ctaType}
                onChange={(e) => setCtaType(e.target.value as AnnouncementCtaType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs font-bold text-white focus:outline-hidden cursor-pointer"
              >
                <option value="plans">{isAr ? '👑 فتح نافذة الباقات والترقية' : '👑 Open Subscription Plans'}</option>
                <option value="promo">{isAr ? '🔑 فتح نافذة تفعيل الكود' : '🔑 Open Promo Code Modal'}</option>
                <option value="calendar">{isAr ? '📅 فتح التقويم الاقتصادي' : '📅 Open Economic Calendar'}</option>
                <option value="url">{isAr ? '🔗 رابط خارجي مخصص' : '🔗 Custom External URL'}</option>
                <option value="none">{isAr ? '❌ بدون زر إضافي (إغلاق فقط)' : '❌ Dismiss Button Only'}</option>
              </select>
            </div>
          </div>

          {ctaType !== 'none' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#787b86] mb-1">
                  {isAr ? 'نص الزر داخل النافذة:' : 'CTA Button Label:'}
                </label>
                <input
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder={isAr ? 'مثال: اشترك الآن / فتح التقويم' : 'e.g. Upgrade Now'}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs text-white focus:outline-hidden"
                />
              </div>
              {ctaType === 'url' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#787b86] mb-1">
                    {isAr ? 'الرابط الخارجي (https://...):' : 'Target URL (https://...):'}
                  </label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://t.me/..."
                    dir="ltr"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs text-white font-mono focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* Target Tabs Multi-Select */}
          <div>
            <label className="block text-[11px] font-bold text-[#787b86] mb-1.5">
              {isAr
                ? 'اختر الأقسام والتبويبات التي ستظهر فيها النافذة المنبثقة:'
                : 'Select Tabs Where This Popup Will Appear:'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TABS.map((tab) => {
                const isSelected = selectedTabs.includes(tab.id);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => toggleTabSelection(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#089981] text-white border-[#089981] shadow-sm'
                        : 'bg-[#1e222d] text-[#9db2c6] border-[#2a2e39] hover:text-white'
                    }`}
                  >
                    {isAr ? tab.labelAr : tab.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#787b86] mb-1">
                {isAr ? 'عنوان الإشعار المنبثق:' : 'Popup Headline / Title:'}
              </label>
              <input
                type="text"
                value={popupTitle}
                onChange={(e) => setPopupTitle(e.target.value)}
                placeholder={
                  isAr
                    ? 'مثال: 🔥 عرض خاص على اشتراك VIP أو ⚠️ تحذير بيانات التضخم CPI بعد ساعة!'
                    : 'e.g. Special VIP Offer or 1-Hour CPI Release Warning'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs font-bold text-white focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#787b86] mb-1">
                {isAr ? 'محتوى الرسالة المنبثقة:' : 'Popup Message Content:'}
              </label>
              <textarea
                rows={3}
                value={popupMessage}
                onChange={(e) => setPopupMessage(e.target.value)}
                placeholder={
                  isAr
                    ? 'اكتب تفاصيل العرض أو الإعلان أو التحذير ليظهر للمستخدمين كنافذة منبثقة...'
                    : 'Write the announcement, offer, or event warning message...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs text-white focus:outline-hidden"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPublishingPopup}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow-lg hover:brightness-110 cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isPublishingPopup ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <BellRing className="w-4 h-4" />
            )}
            <span>
              {isAr
                ? '🚀 نشر وإطلاق النافذة المنبثقة الآن لجميع الأقسام المختارة'
                : '🚀 Publish Live Popup Announcement Now'}
            </span>
          </button>
        </form>

        {/* Active / Past Announcements List */}
        {announcements.length > 0 && (
          <div className="pt-4 border-t border-[#2a2e39] space-y-2.5">
            <h4 className="text-xs font-bold text-white">
              {isAr ? `الإعلانات المنبثقة الحالية (${announcements.length})` : `Published Popups (${announcements.length})`}
            </h4>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-3 rounded-xl bg-[#181c27] border border-[#2a2e39] flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          ann.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-[#2a2e39] text-[#787b86]'
                        }`}
                      >
                        {ann.isActive ? (isAr ? 'نشط الآن' : 'ACTIVE') : isAr ? 'متوقف' : 'PAUSED'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-mono">
                        {ann.targetAudience.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[#787b86] font-mono">
                        {ann.targetTabs.join(', ')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white truncate">{ann.title}</p>
                    <p className="text-[11px] text-[#8a93a6] line-clamp-1">{ann.message}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleAnnouncementActive(ann.id, !ann.isActive)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {ann.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{ann.isActive ? (isAr ? 'إيقاف' : 'Pause') : isAr ? 'تفعيل' : 'Activate'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAnnouncement(ann.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 cursor-pointer"
                      title={isAr ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* SECTION 2: SEGMENTED BULK DIRECT MESSAGES (INBOX DM BROADCASTER) */}
      {/* ======================================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#131722] border border-[#2a2e39] space-y-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#2a2e39]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {isAr
                  ? 'إرسال رسائل خاصة جماعية (Direct Messages) للمستخدمين أو لفئة محددة'
                  : 'Send Bulk Direct Messages (Inbox DMs) to All Users or Specific Segments'}
              </h3>
              <p className="text-xs text-[#787b86] mt-0.5">
                {isAr
                  ? 'أرسل إعلانات، عروض خاصة، أو تذكيرات قرب انتهاء الاشتراك مباشرة إلى صندوق رسائل المستخدمين (مع عداد الرسائل غير المقروءة)'
                  : 'Deliver direct messages straight into users’ DM inboxes with unread badge counters and notifications'}
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/35 text-purple-300 text-xs font-mono font-bold flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>
              {matchingDmRecipients.length} {isAr ? 'مستلم مطابق' : 'Matching Recipients'}
            </span>
          </div>
        </div>

        {/* Segment Selector */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-[#787b86]">
            {isAr ? 'اختر الفئة المستهدفة بالرسائل الخاصة:' : 'Select Recipient Segment:'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              {
                id: 'all' as BulkDmSegment,
                labelAr: '👥 جميع المستخدمين المسجلين',
                labelEn: '👥 All Registered Users'
              },
              {
                id: 'expiring_soon' as BulkDmSegment,
                labelAr: '⏰ من ينتهي اشتراكهم قريباً (<= 7 أيام)',
                labelEn: '⏰ Subscription Expiring Soon (<= 7d)'
              },
              {
                id: 'free' as BulkDmSegment,
                labelAr: '🆓 الأعضاء المجانيين (لإرسال العروض)',
                labelEn: '🆓 Free Users (For Offers & Ads)'
              },
              {
                id: 'vip' as BulkDmSegment,
                labelAr: '👑 المشتركين في باقة VIP',
                labelEn: '👑 Active VIP Subscribers'
              },
              {
                id: 'elite' as BulkDmSegment,
                labelAr: '💎 المشتركين في باقة Elite',
                labelEn: '💎 Active Elite Subscribers'
              },
              {
                id: 'expired' as BulkDmSegment,
                labelAr: '⌛ المشتركين المنتهية اشتراكاتهم',
                labelEn: '⌛ Expired Subscriptions'
              }
            ].map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setDmSegment(seg.id);
                }}
                className={`p-3 rounded-xl text-xs font-bold text-start transition-all cursor-pointer border flex items-center justify-between ${
                  dmSegment === seg.id
                    ? 'bg-purple-600/25 text-white border-purple-500 shadow-md'
                    : 'bg-[#1e222d] text-[#9db2c6] border-[#2a2e39] hover:text-white'
                }`}
              >
                <span>{isAr ? seg.labelAr : seg.labelEn}</span>
                {dmSegment === seg.id && <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* 1-Click DM Templates */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-[#787b86] block">
            {isAr
              ? 'قوالب رسائل جاهزة (يمكنك استخدام {name} لاسم المتداول و {days} للأيام المتبقية):'
              : 'Ready Message Templates (supports {name} and {days} placeholders):'}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyDmTemplate('expiring')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold cursor-pointer"
            >
              {isAr ? '⏰ قالب تذكير قرب انتهاء الاشتراك' : '⏰ Expiring Subscription Template'}
            </button>
            <button
              type="button"
              onClick={() => applyDmTemplate('offer')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold cursor-pointer"
            >
              {isAr ? '🔥 قالب عرض خاص وترقية VIP' : '🔥 Special VIP Offer Template'}
            </button>
            <button
              type="button"
              onClick={() => applyDmTemplate('macro')}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-xs font-bold cursor-pointer"
            >
              {isAr ? '⚠️ قالب تحذير خبر CPI / الفيدرالي' : '⚠️ CPI / Fed Alert Template'}
            </button>
            <button
              type="button"
              onClick={() => applyDmTemplate('general')}
              className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/35 text-blue-300 text-xs font-bold cursor-pointer"
            >
              {isAr ? '📢 قالب إعلان عام للجميع' : '📢 General Announcement Template'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSendBulkDm} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#787b86] mb-1">
              {isAr ? 'نص الرسالة الخاصة:' : 'Direct Message Text:'}
            </label>
            <textarea
              rows={4}
              value={dmMessageText}
              onChange={(e) => setDmMessageText(e.target.value)}
              placeholder={
                isAr
                  ? 'اكتب رسالتك هنا... سيتم إرسالها كرسالة خاصة (DM) لكل مستخدم في الفئة المختارة.'
                  : 'Write your message here... It will be delivered to each selected user’s DM inbox.'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs text-white focus:outline-hidden"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSendingBulkDm || matchingDmRecipients.length === 0}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSendingBulkDm ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {isAr
                ? `📨 إرسال الرسالة الخاصة الآن إلى (${matchingDmRecipients.length}) مستخدم`
                : `📨 Send Direct Message to (${matchingDmRecipients.length}) Users Now`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
