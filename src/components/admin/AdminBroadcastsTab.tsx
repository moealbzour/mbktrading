import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Bookmark,
  BookmarkPlus,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  Eye,
  Flame,
  Gift,
  Image as ImageIcon,
  KeyRound,
  Layout,
  Mail,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
  Timer,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { soundManager } from '../../utils/audio';
import {
  AdminAnnouncement,
  AdminSavedTemplate,
  AnnouncementCtaType,
  AnnouncementType,
  BulkDmSegment,
  PopupDisplayFrequency,
  PopupPlacement,
  PopupSurfaceStyle,
  PopupTriggerLocation,
  TargetAudienceSegment,
  createAdminPopupAnnouncement,
  deleteAdminTemplate,
  deleteAnnouncement,
  getUserRemainingSubscriptionDays,
  normalizeBrandSenderName,
  saveAdminTemplate,
  sendBulkDirectMessageToUsers,
  subscribeToActiveAnnouncements,
  subscribeToAdminTemplates,
  toggleAnnouncementActive,
  updateAdminPopupAnnouncement
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

const SENDER_PRESET_CHIPS = ['MBK Trading', 'MBK VIP Desk', 'MBK Support'] as const;

const ACCENT_COLOR_PRESETS: Array<{ hex: string; labelAr: string; labelEn: string }> = [
  { hex: '#26A69A', labelAr: 'أخضر MBK', labelEn: 'MBK Green' },
  { hex: '#EF5350', labelAr: 'أحمر تنبيه', labelEn: 'Alert Red' },
  { hex: '#F0B90B', labelAr: 'ذهبي VIP', labelEn: 'Gold VIP' },
  { hex: '#2962FF', labelAr: 'أزرق مؤسسي', labelEn: 'Inst. Blue' }
];

const AVAILABLE_TABS: Array<{ id: string; labelAr: string; labelEn: string }> = [
  { id: 'on_open', labelAr: 'عند فتح التطبيق', labelEn: 'On App Open' },
  { id: 'all', labelAr: 'جميع الأقسام', labelEn: 'Every Tab (Global)' },
  { id: 'signals', labelAr: 'بوت وتوصيات MBK', labelEn: 'Signals & Bot Hub' },
  { id: 'chart', labelAr: 'الشارت الرئيسي', labelEn: 'Chart / Dashboard' },
  { id: 'chat', labelAr: 'غرفة الشات', labelEn: 'Trading Chat' },
  { id: 'dm', labelAr: 'صندوق الوارد (Inbox)', labelEn: 'Direct Inbox' },
  { id: 'ai', labelAr: 'ذكاء MBK', labelEn: 'MBK AI' },
  { id: 'calendar', labelAr: 'التقويم الاقتصادي', labelEn: 'Economic Calendar' },
  { id: 'news', labelAr: 'أخبار الأسواق', labelEn: 'Market News' },
  { id: 'paper', labelAr: 'التداول التجريبي', labelEn: 'Paper Trading' },
  { id: 'academy', labelAr: 'الأكاديمية', labelEn: 'Academy' },
  { id: 'elite', labelAr: 'قسم Elite', labelEn: 'Elite Hub' }
];

const NAVIGABLE_TARGET_TABS: Array<{ id: string; labelAr: string; labelEn: string }> = [
  { id: 'signals', labelAr: 'قسم التوصيات والبوت', labelEn: 'Signals & Bot Hub' },
  { id: 'chart', labelAr: 'الشارت الرئيسي', labelEn: 'Main Chart' },
  { id: 'chat', labelAr: 'الشات العام', labelEn: 'Trading Chat' },
  { id: 'dm', labelAr: 'صندوق الوارد والدعم', labelEn: 'Inbox & Support' },
  { id: 'calendar', labelAr: 'التقويم الاقتصادي', labelEn: 'Economic Calendar' },
  { id: 'academy', labelAr: 'أكاديمية MBK', labelEn: 'MBK Academy' },
  { id: 'elite', labelAr: 'بوابة Elite', labelEn: 'Elite Portal' },
  { id: 'paper', labelAr: 'التداول التجريبي', labelEn: 'Paper Trading' }
];

function toDateTimeLocalString(ms?: number | null): string {
  if (!ms || ms <= 0) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function parseDateTimeLocalString(val: string): number | null {
  if (!val || !val.trim()) return null;
  const ms = new Date(val).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function formatCountdownParts(targetMs: number | null | undefined, nowMs: number) {
  if (!targetMs || targetMs <= nowMs) {
    return { expired: true, dd: '00', hh: '00', mm: '00', ss: '00', totalLeftMs: 0 };
  }
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    expired: false,
    dd: pad(days),
    hh: pad(hours),
    mm: pad(mins),
    ss: pad(secs),
    totalLeftMs: targetMs - nowMs
  };
}

export const AdminBroadcastsTab: React.FC<Props> = ({ users, isAr, onShowFeedback }) => {
  const [activeSubTab, setActiveSubTab] = useState<'popups' | 'bulk_dm' | 'templates'>('popups');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // ================= 1. POPUP STUDIO STATE =================
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [editingPopupId, setEditingPopupId] = useState<string | null>(null);

  // Content & Official Branding
  const [senderName, setSenderName] = useState<string>('MBK Trading');
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [badgeText, setBadgeText] = useState<string>('OFFICIAL ANNOUNCEMENT');
  const [popupType, setPopupType] = useState<AnnouncementType>('offer');
  const [popupTitle, setPopupTitle] = useState<string>('');
  const [popupMessage, setPopupMessage] = useState<string>('');
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('');

  // Appearance & Colors
  const [accentColor, setAccentColor] = useState<string>('#26A69A');
  const [surfaceStyle, setSurfaceStyle] = useState<PopupSurfaceStyle>('dark_terminal');
  const [ctaColor, setCtaColor] = useState<string>('#26A69A');

  // Placement, Trigger & Audience
  const [placement, setPlacement] = useState<PopupPlacement>('center_modal');
  const [triggerLocation, setTriggerLocation] = useState<PopupTriggerLocation>('global');
  const [selectedTabs, setSelectedTabs] = useState<string[]>(['on_open', 'all']);
  const [targetAudience, setTargetAudience] = useState<TargetAudienceSegment>('all');

  // Scheduling, Countdown & Frequency
  const [scheduleMode, setScheduleMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [startAtLocal, setStartAtLocal] = useState<string>('');
  const [endAtLocal, setEndAtLocal] = useState<string>('');
  const [countdownEnabled, setCountdownEnabled] = useState<boolean>(false);
  const [countdownEndLocal, setCountdownEndLocal] = useState<string>(() =>
    toDateTimeLocalString(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [countdownLabel, setCountdownLabel] = useState<string>(
    isAr ? 'ينتهي العرض خلال' : 'Offer ends in'
  );
  const [frequency, setFrequency] = useState<PopupDisplayFrequency>('once_per_session');

  // CTA Action & Web Push
  const [ctaType, setCtaType] = useState<AnnouncementCtaType>('plans');
  const [ctaLabel, setCtaLabel] = useState<string>(
    isAr ? 'عرض الباقات والترقية الآن' : 'View Plans & Upgrade'
  );
  const [ctaUrl, setCtaUrl] = useState<string>('');
  const [ctaTargetTab, setCtaTargetTab] = useState<string>('signals');
  const [sendPopupWebPush, setSendPopupWebPush] = useState<boolean>(false);
  const [isPublishingPopup, setIsPublishingPopup] = useState<boolean>(false);

  // ================= 2. BRANDED BULK DIRECT MESSAGES STATE =================
  const [dmSenderName, setDmSenderName] = useState<string>('MBK Trading');
  const [dmShowLogo, setDmShowLogo] = useState<boolean>(true);
  const [dmBannerImageUrl, setDmBannerImageUrl] = useState<string>('');
  const [dmSegment, setDmSegment] = useState<BulkDmSegment>('all');
  const [dmTitle, setDmTitle] = useState<string>('');
  const [dmMessageText, setDmMessageText] = useState<string>('');
  const [dmSendWebPush, setDmSendWebPush] = useState<boolean>(true);
  const [isSendingBulkDm, setIsSendingBulkDm] = useState<boolean>(false);

  // ================= 3. CUSTOM SAVED TEMPLATES STATE =================
  const [savedTemplates, setSavedTemplates] = useState<AdminSavedTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [savingTemplateModalType, setSavingTemplateModalType] = useState<'popup' | 'dm' | null>(
    null
  );
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);

  useEffect(() => {
    const unsubAnn = subscribeToActiveAnnouncements(
      (list) => {
        setAnnouncements(list);
      },
      { isAdminManager: true }
    );
    const unsubTpl = subscribeToAdminTemplates((tpls) => {
      setSavedTemplates(tpls);
    });
    return () => {
      unsubAnn();
      unsubTpl();
    };
  }, []);

  // Tick every 1 second ONLY when Popup Studio is showing a live countdown preview or active countdown banner
  const hasActiveCountdownBanner = useMemo(
    () =>
      activeSubTab === 'popups' &&
      announcements.some(
        (ann) =>
          ann.isActive &&
          Boolean(ann.countdownEnabled) &&
          typeof ann.countdownEndAtMs === 'number' &&
          ann.countdownEndAtMs > Date.now()
      ),
    [activeSubTab, announcements]
  );

  const shouldTickCountdown =
    activeSubTab === 'popups' && (countdownEnabled || hasActiveCountdownBanner);

  useEffect(() => {
    if (!shouldTickCountdown) return;
    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [shouldTickCountdown]);

  const popupTemplates = useMemo(
    () => savedTemplates.filter((t) => t.templateType === 'popup'),
    [savedTemplates]
  );
  const dmTemplates = useMemo(
    () => savedTemplates.filter((t) => t.templateType === 'dm'),
    [savedTemplates]
  );

  // Helper to check if a user matches a given segment
  const doesUserMatchSegment = (
    u: BroadcastUserItem,
    segment: TargetAudienceSegment | BulkDmSegment
  ): boolean => {
    if (u.isBanned) return false;
    const remDays = getUserRemainingSubscriptionDays(u);
    const isElite = u.tier === 'elite' || Boolean(u.isElite) || u.role === 'ELITE';
    const isVip = isElite || u.tier === 'vip' || Boolean(u.isVip) || u.role === 'VIP';

    if (segment === 'all') return true;
    if (segment === 'expiring_soon') {
      return remDays !== null && remDays > 0 && remDays <= 7;
    }
    if (segment === 'expired') {
      return remDays !== null && remDays <= 0;
    }
    if (segment === 'free') {
      return !isVip && (remDays === null || remDays <= 0);
    }
    if (segment === 'vip') {
      return isVip && (remDays === null || remDays > 0);
    }
    if (segment === 'elite') {
      return isElite && (remDays === null || remDays > 0);
    }
    return true;
  };

  const matchingPopupAudienceCount = useMemo(() => {
    return users.filter((u) => doesUserMatchSegment(u, targetAudience)).length;
  }, [users, targetAudience]);

  const matchingDmRecipients = useMemo(() => {
    const currentAdminUid = auth.currentUser?.uid;
    return users
      .filter((u) => {
        if (currentAdminUid && u.id === currentAdminUid) return false;
        return doesUserMatchSegment(u, dmSegment);
      })
      .map((u) => ({
        uid: u.id,
        name: u.name || u.email.split('@')[0] || 'Trader',
        email: u.email,
        role: u.role,
        remainingDays: getUserRemainingSubscriptionDays(u)
      }));
  }, [users, dmSegment]);

  // Handle Trigger Location Preset Change
  const handleSelectTriggerLocation = (loc: PopupTriggerLocation) => {
    soundManager.playClick();
    setTriggerLocation(loc);
    if (loc === 'global') {
      setSelectedTabs(['on_open', 'all']);
    } else if (loc === 'chart') {
      setSelectedTabs(['chart']);
    } else if (loc === 'signals') {
      setSelectedTabs(['signals']);
    } else if (loc === 'chat') {
      setSelectedTabs(['chat', 'dm']);
    }
  };

  const toggleTabSelection = (tabId: string) => {
    soundManager.playClick();
    setTriggerLocation('custom');
    setSelectedTabs((prev) => {
      if (prev.includes(tabId)) {
        const filtered = prev.filter((t) => t !== tabId);
        return filtered.length > 0 ? filtered : ['on_open'];
      }
      return [...prev, tabId];
    });
  };

  const handleSetQuickCountdownHours = (hours: number) => {
    soundManager.playClick();
    setCountdownEnabled(true);
    const targetMs = Date.now() + hours * 60 * 60 * 1000;
    setCountdownEndLocal(toDateTimeLocalString(targetMs));
  };

  const resetPopupForm = () => {
    setEditingPopupId(null);
    setSenderName('MBK Trading');
    setShowLogo(true);
    setBadgeText('OFFICIAL ANNOUNCEMENT');
    setPopupType('offer');
    setPopupTitle('');
    setPopupMessage('');
    setBannerImageUrl('');
    setAccentColor('#26A69A');
    setSurfaceStyle('dark_terminal');
    setCtaColor('#26A69A');
    setPlacement('center_modal');
    setTriggerLocation('global');
    setSelectedTabs(['on_open', 'all']);
    setTargetAudience('all');
    setScheduleMode('immediate');
    setStartAtLocal('');
    setEndAtLocal('');
    setCountdownEnabled(false);
    setCountdownEndLocal(toDateTimeLocalString(Date.now() + 24 * 60 * 60 * 1000));
    setCountdownLabel(isAr ? 'ينتهي العرض خلال' : 'Offer ends in');
    setFrequency('once_per_session');
    setCtaType('plans');
    setCtaLabel(isAr ? 'عرض الباقات والترقية الآن' : 'View Plans & Upgrade');
    setCtaUrl('');
    setCtaTargetTab('signals');
    setSendPopupWebPush(false);
  };

  const loadPopupIntoStudio = (ann: AdminAnnouncement, isDuplicate = false) => {
    soundManager.playClick();
    setActiveSubTab('popups');
    setEditingPopupId(isDuplicate ? null : ann.id);
    setSenderName(normalizeBrandSenderName(ann.senderName));
    setShowLogo(ann.showLogo !== false);
    setBadgeText(ann.badgeText || '');
    setPopupType(ann.type || 'offer');
    setPopupTitle(isDuplicate ? `${ann.title} (Copy)` : ann.title);
    setPopupMessage(ann.message);
    setBannerImageUrl(ann.bannerImageUrl || '');
    setAccentColor(ann.accentColor || '#26A69A');
    setSurfaceStyle(ann.surfaceStyle || 'dark_terminal');
    setCtaColor(ann.ctaColor || ann.accentColor || '#26A69A');
    setPlacement(ann.placement || 'center_modal');
    setTriggerLocation(ann.triggerLocation || 'custom');
    setSelectedTabs(
      Array.isArray(ann.targetTabs) && ann.targetTabs.length > 0
        ? ann.targetTabs
        : ['on_open', 'all']
    );
    setTargetAudience(ann.targetAudience || 'all');

    if (ann.startAtMs && ann.startAtMs > Date.now()) {
      setScheduleMode('scheduled');
      setStartAtLocal(toDateTimeLocalString(ann.startAtMs));
    } else {
      setScheduleMode('immediate');
      setStartAtLocal('');
    }
    setEndAtLocal(ann.endAtMs ? toDateTimeLocalString(ann.endAtMs) : '');
    setCountdownEnabled(Boolean(ann.countdownEnabled));
    setCountdownEndLocal(
      ann.countdownEndAtMs
        ? toDateTimeLocalString(ann.countdownEndAtMs)
        : toDateTimeLocalString(Date.now() + 24 * 60 * 60 * 1000)
    );
    setCountdownLabel(ann.countdownLabel || (isAr ? 'ينتهي العرض خلال' : 'Offer ends in'));
    setFrequency(ann.frequency || 'once_per_session');
    setCtaType(ann.ctaType || 'none');
    setCtaLabel(ann.ctaLabel || '');
    setCtaUrl(ann.ctaUrl || '');
    setCtaTargetTab(ann.ctaTargetTab || 'signals');
    setSendPopupWebPush(Boolean(ann.sendWebPush));

    onShowFeedback(
      'info',
      isDuplicate
        ? isAr
          ? 'تم نسخ إعدادات النافذة المنبثقة إلى الاستوديو لتعديلها ونشرها.'
          : 'Duplicated popup settings into Studio.'
        : isAr
        ? 'تم تحميل النافذة المنبثقة في الاستوديو للتعديل.'
        : 'Loaded popup into Studio for editing.'
    );
  };

  const applySavedTemplate = (tpl: AdminSavedTemplate) => {
    soundManager.playClick();
    const p = tpl.payload || {};
    if (tpl.templateType === 'popup') {
      setActiveSubTab('popups');
      setEditingPopupId(null);
      setSenderName(normalizeBrandSenderName(p.senderName || 'MBK Trading'));
      setShowLogo(p.showLogo !== false);
      setBadgeText(typeof p.badgeText === 'string' ? p.badgeText : 'OFFICIAL ANNOUNCEMENT');
      setPopupType((p.type as AnnouncementType) || 'offer');
      setPopupTitle(p.title || '');
      setPopupMessage(p.message || '');
      setBannerImageUrl(p.bannerImageUrl || '');
      setAccentColor(p.accentColor || '#26A69A');
      setSurfaceStyle((p.surfaceStyle as PopupSurfaceStyle) || 'dark_terminal');
      setCtaColor(p.ctaColor || p.accentColor || '#26A69A');
      setPlacement((p.placement as PopupPlacement) || 'center_modal');
      setTriggerLocation((p.triggerLocation as PopupTriggerLocation) || 'global');
      setSelectedTabs(
        Array.isArray(p.targetTabs) && p.targetTabs.length > 0 ? p.targetTabs : ['on_open', 'all']
      );
      setTargetAudience((p.targetAudience as TargetAudienceSegment) || 'all');
      setCountdownEnabled(Boolean(p.countdownEnabled));
      if (p.countdownHoursFromNow) {
        setCountdownEndLocal(
          toDateTimeLocalString(Date.now() + Number(p.countdownHoursFromNow) * 3600 * 1000)
        );
      } else if (p.countdownEndAtMs) {
        setCountdownEndLocal(toDateTimeLocalString(Number(p.countdownEndAtMs)));
      }
      setCountdownLabel(p.countdownLabel || (isAr ? 'ينتهي العرض خلال' : 'Offer ends in'));
      setFrequency((p.frequency as PopupDisplayFrequency) || 'once_per_session');
      setCtaType((p.ctaType as AnnouncementCtaType) || 'plans');
      setCtaLabel(p.ctaLabel || '');
      setCtaUrl(p.ctaUrl || '');
      setCtaTargetTab(p.ctaTargetTab || 'signals');
      setSendPopupWebPush(Boolean(p.sendWebPush));
      onShowFeedback(
        'info',
        isAr ? `تم تحميل قالب النافذة: ${tpl.name}` : `Loaded popup template: ${tpl.name}`
      );
    } else {
      setActiveSubTab('bulk_dm');
      setDmSenderName(normalizeBrandSenderName(p.senderName || 'MBK Trading'));
      setDmShowLogo(p.showLogo !== false);
      setDmBannerImageUrl(p.bannerImageUrl || '');
      setDmSegment((p.dmSegment as BulkDmSegment) || 'all');
      setDmTitle(p.dmTitle || '');
      setDmMessageText(p.dmMessageText || '');
      setDmSendWebPush(p.sendWebPush !== false);
      onShowFeedback(
        'info',
        isAr ? `تم تحميل قالب الرسائل: ${tpl.name}` : `Loaded DM template: ${tpl.name}`
      );
    }
  };

  const handleOpenSaveTemplateModal = (type: 'popup' | 'dm', existingTpl?: AdminSavedTemplate) => {
    soundManager.playClick();
    setSavingTemplateModalType(type);
    if (existingTpl) {
      setEditingTemplateId(existingTpl.id);
      setNewTemplateName(existingTpl.name);
    } else {
      setEditingTemplateId(null);
      setNewTemplateName(
        type === 'popup'
          ? popupTitle.trim().slice(0, 50) || (isAr ? 'قالب نافذة منبثقة مخصص' : 'Custom Popup Template')
          : dmTitle.trim().slice(0, 50) || (isAr ? 'قالب رسالة خاصة مخصص' : 'Custom Bulk DM Template')
      );
    }
  };

  const handleConfirmSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savingTemplateModalType || !newTemplateName.trim()) return;
    setIsSavingTemplate(true);
    soundManager.playClick();
    try {
      const payload =
        savingTemplateModalType === 'popup'
          ? {
              senderName: normalizeBrandSenderName(senderName),
              showLogo,
              badgeText,
              type: popupType,
              title: popupTitle,
              message: popupMessage,
              bannerImageUrl,
              accentColor,
              surfaceStyle,
              ctaColor,
              placement,
              triggerLocation,
              targetTabs: selectedTabs,
              targetAudience,
              countdownEnabled,
              countdownEndAtMs: parseDateTimeLocalString(countdownEndLocal),
              countdownLabel,
              frequency,
              ctaType,
              ctaLabel,
              ctaUrl,
              ctaTargetTab,
              sendWebPush: sendPopupWebPush
            }
          : {
              senderName: normalizeBrandSenderName(dmSenderName),
              showLogo: dmShowLogo,
              bannerImageUrl: dmBannerImageUrl,
              dmSegment,
              dmTitle,
              dmMessageText,
              sendWebPush: dmSendWebPush
            };

      await saveAdminTemplate({
        id: editingTemplateId || undefined,
        name: newTemplateName.trim(),
        templateType: savingTemplateModalType,
        payload
      });

      soundManager.playProfitChime();
      onShowFeedback(
        'success',
        isAr ? 'تم حفظ القالب المخصص بنجاح في قاعدة البيانات.' : 'Custom template saved to Firestore.'
      );
      setSavingTemplateModalType(null);
      setEditingTemplateId(null);
      setNewTemplateName('');
    } catch (err: any) {
      onShowFeedback(
        'error',
        err?.message || (isAr ? 'تعذر حفظ القالب' : 'Failed to save template')
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handlePublishOrUpdatePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!popupTitle.trim() || !popupMessage.trim()) return;
    setIsPublishingPopup(true);
    soundManager.playClick();

    const startAtMs =
      scheduleMode === 'scheduled' ? parseDateTimeLocalString(startAtLocal) : null;
    const endAtMs = parseDateTimeLocalString(endAtLocal);
    const countdownEndAtMs = countdownEnabled
      ? parseDateTimeLocalString(countdownEndLocal)
      : null;

    const payload = {
      senderName: normalizeBrandSenderName(senderName),
      showLogo,
      badgeText,
      title: popupTitle,
      message: popupMessage,
      bannerImageUrl,
      type: popupType,
      accentColor,
      surfaceStyle,
      ctaColor,
      placement,
      triggerLocation,
      targetTabs: selectedTabs,
      targetAudience,
      startAtMs,
      endAtMs,
      countdownEnabled,
      countdownEndAtMs,
      countdownLabel,
      frequency,
      ctaType,
      ctaLabel,
      ctaUrl,
      ctaTargetTab,
      sendWebPush: sendPopupWebPush
    };

    try {
      if (editingPopupId) {
        await updateAdminPopupAnnouncement(editingPopupId, payload);
        soundManager.playProfitChime();
        onShowFeedback(
          'success',
          isAr
            ? 'تم تحديث النافذة المنبثقة بنجاح وتطبيق التعديلات مباشرة!'
            : 'Popup announcement updated live!'
        );
        setEditingPopupId(null);
      } else {
        await createAdminPopupAnnouncement(payload);
        soundManager.playProfitChime();
        onShowFeedback(
          'success',
          scheduleMode === 'scheduled' && startAtMs && startAtMs > Date.now()
            ? isAr
              ? 'تم جدولة النافذة المنبثقة بنجاح وستظهر تلقائياً في الموعد المحدد!'
              : 'Popup scheduled and will go live at the start time!'
            : isAr
            ? 'تم نشر النافذة المنبثقة بنجاح وستظهر فوراً للمستخدمين المستهدفين!'
            : 'Popup announcement published live to target users!'
        );
      }
      resetPopupForm();
    } catch (err: any) {
      onShowFeedback(
        'error',
        err?.message || (isAr ? 'فشل حفظ الإعلان المنبثق' : 'Failed to save popup')
      );
    } finally {
      setIsPublishingPopup(false);
    }
  };

  const handleSendBulkDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmMessageText.trim()) return;
    if (matchingDmRecipients.length === 0) {
      onShowFeedback(
        'error',
        isAr
          ? 'لا يوجد مستخدمين مطابقين لهذه الفئة حالياً.'
          : 'No matching users found in this segment.'
      );
      return;
    }

    const adminUser = auth.currentUser;
    if (!adminUser) {
      onShowFeedback(
        'error',
        isAr ? 'يرجى تسجيل الدخول بحساب المشرف أولاً.' : 'Please sign in as Admin first.'
      );
      return;
    }

    setIsSendingBulkDm(true);
    soundManager.playClick();
    try {
      const officialSender = normalizeBrandSenderName(dmSenderName);
      const { sentCount, failedCount } = await sendBulkDirectMessageToUsers({
        adminUid: adminUser.uid,
        senderName: officialSender,
        showLogo: dmShowLogo,
        bannerImageUrl: dmBannerImageUrl,
        title: dmTitle,
        sendWebPush: dmSendWebPush,
        segmentLabel: dmSegment,
        recipients: matchingDmRecipients,
        messageTemplate: dmMessageText
      });

      soundManager.playProfitChime();
      onShowFeedback(
        'success',
        isAr
          ? `تم إرسال الرسالة الرسمية باسم (${officialSender}) إلى ${sentCount} مستخدم في صندوق الوارد!${
              failedCount > 0 ? ` (تعذر الإرسال لـ ${failedCount})` : ''
            }`
          : `Delivered official DM from "${officialSender}" to ${sentCount} users!${
              failedCount > 0 ? ` (${failedCount} failed)` : ''
            }`
      );
      setDmTitle('');
      setDmMessageText('');
    } catch (err: any) {
      onShowFeedback(
        'error',
        err?.message || (isAr ? 'فشل إرسال الرسائل الجماعية' : 'Bulk DM failed')
      );
    } finally {
      setIsSendingBulkDm(false);
    }
  };

  const insertDmVariable = (variable: '{name}' | '{days}') => {
    soundManager.playClick();
    setDmMessageText((prev) => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${variable} `);
  };

  // Compute live preview countdown parts
  const previewCountdownTargetMs = useMemo(() => {
    if (!countdownEnabled) return null;
    return parseDateTimeLocalString(countdownEndLocal);
  }, [countdownEnabled, countdownEndLocal]);

  const previewCountdown = useMemo(
    () => formatCountdownParts(previewCountdownTargetMs, nowMs),
    [previewCountdownTargetMs, nowMs]
  );

  // Determine Popup Lifecycle Status for Manager Table
  const getPopupLifecycleStatus = (
    ann: AdminAnnouncement
  ): {
    code: 'ACTIVE' | 'SCHEDULED' | 'PAUSED' | 'EXPIRED';
    labelAr: string;
    labelEn: string;
    badgeClass: string;
  } => {
    if (!ann.isActive) {
      return {
        code: 'PAUSED',
        labelAr: 'متوقف مؤقتاً',
        labelEn: 'PAUSED',
        badgeClass: 'bg-[#F8F9FD] dark:bg-[#1E222D] text-[#4A5162] dark:text-[#94A3B8] border-[#E0E3EB] dark:border-[#2A2E39]'
      };
    }
    const isEndExpired = Boolean(ann.endAtMs && ann.endAtMs <= nowMs);
    const isCountdownExpired = Boolean(
      ann.countdownEnabled && ann.countdownEndAtMs && ann.countdownEndAtMs <= nowMs
    );
    if (isEndExpired || isCountdownExpired) {
      return {
        code: 'EXPIRED',
        labelAr: 'منتهي الصلاحية',
        labelEn: 'EXPIRED',
        badgeClass: 'bg-[#FDECEE] dark:bg-[#EF5350]/15 text-[#D93848] dark:text-[#EF5350] border-[#F5C2C7] dark:border-[#EF5350]/40'
      };
    }
    if (ann.startAtMs && ann.startAtMs > nowMs) {
      return {
        code: 'SCHEDULED',
        labelAr: 'مجدول قريباً',
        labelEn: 'SCHEDULED',
        badgeClass: 'bg-[#FDF6E3] dark:bg-[#F0B90B]/15 text-[#9A6700] dark:text-[#F0B90B] border-[#EFE0B4] dark:border-[#F0B90B]/40'
      };
    }
    return {
      code: 'ACTIVE',
      labelAr: 'نشط الآن',
      labelEn: 'ACTIVE',
      badgeClass: 'bg-[#E6F5F2] dark:bg-[#26A69A]/15 text-[#089981] dark:text-[#26A69A] border-[#B3E2D9] dark:border-[#26A69A]/40'
    };
  };

  const previewResolvedDmTitle = useMemo(() => {
    if (!dmTitle.trim()) return '';
    return dmTitle
      .replace(/\{name\}/gi, isAr ? 'أحمد العتيبي' : 'Ahmad Trader')
      .replace(/\{days\}/gi, '5');
  }, [dmTitle, isAr]);

  const previewResolvedDmBody = useMemo(() => {
    const raw =
      dmMessageText.trim() ||
      (isAr
        ? 'مرحباً {name}، نود إعلامك بأحدث عروض وتحديثات منصة MBK Trading...'
        : 'Hello {name}, check out the latest updates from MBK Trading...');
    return raw
      .replace(/\{name\}/gi, isAr ? 'أحمد العتيبي' : 'Ahmad Trader')
      .replace(/\{days\}/gi, '5');
  }, [dmMessageText, isAr]);

  return (
    <div className="space-y-5 text-[#131722] dark:text-[#E2E8F0]">
      {/* ======================================================================= */}
      {/* TOP SUB-NAVIGATION BAR (POPUPS STUDIO / BULK DMS / SAVED TEMPLATES)     */}
      {/* ======================================================================= */}
      <div className="bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveSubTab('popups');
            }}
            className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border ${
              activeSubTab === 'popups'
                ? 'bg-[#26A69A] text-white border-[#26A69A]'
                : 'bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white border-[#E0E3EB] dark:border-[#2A2E39]'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>{isAr ? 'استوديو النوافذ المنبثقة (Popups Studio)' : 'Pro Popups Studio'}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                activeSubTab === 'popups'
                  ? 'bg-black/20 text-white'
                  : 'bg-[#FFFFFF] dark:bg-black/25 text-[#131722] dark:text-[#94A3B8] border border-[#E0E3EB] dark:border-transparent'
              }`}
            >
              {announcements.filter((a) => getPopupLifecycleStatus(a).code === 'ACTIVE').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveSubTab('bulk_dm');
            }}
            className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border ${
              activeSubTab === 'bulk_dm'
                ? 'bg-[#26A69A] text-white border-[#26A69A]'
                : 'bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white border-[#E0E3EB] dark:border-[#2A2E39]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{isAr ? 'الرسائل الخاصة الجماعية (Branded Bulk DMs)' : 'Branded Bulk DMs'}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                activeSubTab === 'bulk_dm'
                  ? 'bg-black/20 text-white'
                  : 'bg-[#FFFFFF] dark:bg-black/25 text-[#131722] dark:text-[#94A3B8] border border-[#E0E3EB] dark:border-transparent'
              }`}
            >
              {matchingDmRecipients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveSubTab('templates');
            }}
            className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border ${
              activeSubTab === 'templates'
                ? 'bg-[#F0B90B] text-black border-[#F0B90B]'
                : 'bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white border-[#E0E3EB] dark:border-[#2A2E39]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isAr ? 'القوالب المخصصة المحفوظة' : 'Saved Templates'}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                activeSubTab === 'templates'
                  ? 'bg-black/15 text-black'
                  : 'bg-[#FFFFFF] dark:bg-black/20 text-[#131722] dark:text-[#94A3B8] border border-[#E0E3EB] dark:border-transparent'
              }`}
            >
              {savedTemplates.length}
            </span>
          </button>
        </div>

        {/* Official Brand Identity Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39]">
          <img
            src="/mbk-logo.png"
            alt="MBK Trading"
            className="w-5 h-5 rounded object-contain bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39]"
          />
          <span className="text-[11px] font-bold text-[#131722] dark:text-white">MBK Trading</span>
          <span className="px-1.5 py-0.2 rounded bg-[#E6F5F2] dark:bg-[#26A69A]/15 text-[#089981] dark:text-[#26A69A] border border-[#B3E2D9] dark:border-[#26A69A]/30 text-[9px] font-mono font-bold inline-flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" />
            <span>VERIFIED DESK</span>
          </span>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: PRO POPUP STUDIO (SPLIT-SCREEN BUILDER + LIVE PREVIEW + MANAGER) */}
      {/* ======================================================================= */}
      {activeSubTab === 'popups' && (
        <div className="space-y-5">
          {/* Saved Templates Quick Bar */}
          <div className="bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#4A5162] dark:text-[#94A3B8] flex items-center gap-1 me-1">
                <Bookmark className="w-3.5 h-3.5 text-[#9A6700] dark:text-[#F0B90B]" />
                <span>{isAr ? 'قوالب النوافذ المحفوظة:' : 'Saved Popup Templates:'}</span>
              </span>
              {popupTemplates.length === 0 ? (
                <span className="text-[11px] text-[#787B86] dark:text-[#64748B]">
                  {isAr
                    ? 'لا توجد قوالب محفوظة بعد — صمم نافذتك واضغط حفظ كقالب.'
                    : 'No saved templates yet — configure below and click Save as Template.'}
                </span>
              ) : (
                popupTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="inline-flex items-center rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => applySavedTemplate(tpl)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#131722] dark:text-[#E2E8F0] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D] transition-colors cursor-pointer"
                    >
                      {tpl.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAdminTemplate(tpl.id, tpl.name)}
                      className="px-1.5 py-1 text-[#787B86] dark:text-[#64748B] hover:text-[#EF5350] hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D] border-s border-[#E0E3EB] dark:border-[#2A2E39] cursor-pointer"
                      title={isAr ? 'حذف القالب' : 'Delete template'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenSaveTemplateModal('popup')}
                className="px-3 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#9A6700] dark:text-[#F0B90B] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{isAr ? 'حفظ الإعداد الحالي كقالب' : 'Save Current Setup as Template'}</span>
              </button>
            </div>
          </div>

          {/* Editing Existing Popup Banner */}
          {editingPopupId && (
            <div className="p-3 rounded-lg bg-[#FDF6E3] dark:bg-[#F0B90B]/10 border border-[#EFE0B4] dark:border-[#F0B90B]/40 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#9A6700] dark:text-[#F0B90B]">
                <Edit3 className="w-4 h-4" />
                <span>
                  {isAr
                    ? `وضع تعديل النافذة المنبثقة النشطة (${editingPopupId})`
                    : `Editing Existing Popup (${editingPopupId})`}
                </span>
              </div>
              <button
                type="button"
                onClick={resetPopupForm}
                className="px-3 py-1 rounded bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-semibold text-[#131722] dark:text-white cursor-pointer"
              >
                {isAr ? 'إلغاء التعديل وإنشاء نافذة جديدة' : 'Cancel Edit & New Popup'}
              </button>
            </div>
          )}

          {/* SPLIT-SCREEN STUDIO: BUILDER (7 COLS) + LIVE PREVIEW (5 COLS) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* LEFT/START: BUILDER FORM */}
            <form
              onSubmit={handlePublishOrUpdatePopup}
              className="xl:col-span-7 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-lg p-4 sm:p-5 space-y-5"
            >
              {/* 1. Official Brand Identity & Content */}
              <div className="space-y-3.5 pb-4 border-b border-[#E0E3EB] dark:border-[#2A2E39]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#131722] dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                    <span>
                      {isAr
                        ? '1. الهوية الرسمية والمحتوى (Content & Official Branding)'
                        : '1. Official Brand Identity & Content'}
                    </span>
                  </h4>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#131722] dark:text-[#E2E8F0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLogo}
                      onChange={(e) => setShowLogo(e.target.checked)}
                      className="accent-[#26A69A] w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>{isAr ? 'إظهار شعار MBK الرسمي' : 'Show Official MBK Logo'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7 space-y-1.5">
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8]">
                      {isAr ? 'اسم الجهة المُرسلة (Sender Identity)' : 'Official Sender Display Name'}
                    </label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {SENDER_PRESET_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setSenderName(chip);
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border cursor-pointer ${
                            senderName === chip
                              ? 'bg-[#26A69A] text-white border-[#26A69A]'
                              : 'bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white border-[#E0E3EB] dark:border-[#2A2E39]'
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="MBK Trading"
                      className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] focus:border-[#1E53E5] dark:focus:border-[#26A69A] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8]">
                      {isAr ? 'شارة التصنيف العلوية (Badge / Tag)' : 'Top Badge / Tag Text'}
                    </label>
                    <select
                      value={popupType}
                      onChange={(e) => {
                        const nextType = e.target.value as AnnouncementType;
                        setPopupType(nextType);
                        if (nextType === 'offer') {
                          setBadgeText(isAr ? 'عرض خاص وحصري' : 'EXCLUSIVE OFFER');
                          setAccentColor('#F0B90B');
                          setCtaColor('#F0B90B');
                        } else if (nextType === 'event') {
                          setBadgeText(isAr ? 'تحذير خبر اقتصادي هام' : 'MACRO EVENT ALERT');
                          setAccentColor('#EF5350');
                          setCtaColor('#EF5350');
                        } else if (nextType === 'update') {
                          setBadgeText(isAr ? 'تحديث جديد بالمنصة' : 'PLATFORM UPDATE');
                          setAccentColor('#2962FF');
                          setCtaColor('#2962FF');
                        } else {
                          setBadgeText(isAr ? 'إعلان رسمي' : 'OFFICIAL ANNOUNCEMENT');
                          setAccentColor('#26A69A');
                          setCtaColor('#26A69A');
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden cursor-pointer mb-1.5"
                    >
                      <option value="offer">{isAr ? 'عرض خاص / خصم (Offer)' : 'Special Offer'}</option>
                      <option value="event">{isAr ? 'تحذير خبر اقتصادي (Macro Event)' : 'Macro Event Alert'}</option>
                      <option value="news">{isAr ? 'إعلان رسمي (Official News)' : 'Official Announcement'}</option>
                      <option value="update">{isAr ? 'تحديث بالمنصة (Update)' : 'Platform Update'}</option>
                    </select>
                    <input
                      type="text"
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      placeholder={isAr ? 'مثال: عرض VIP حصري' : 'e.g. VIP SPECIAL OFFER'}
                      className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] focus:border-[#1E53E5] dark:focus:border-[#26A69A] text-xs text-[#131722] dark:text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                    {isAr ? 'عنوان النافذة المنبثقة (Headline)' : 'Popup Headline / Title'}
                  </label>
                  <input
                    type="text"
                    value={popupTitle}
                    onChange={(e) => setPopupTitle(e.target.value)}
                    placeholder={
                      isAr
                        ? 'مثال: عرض خاص لفترة محدودة على باقة VIP أو تنبيه بيانات التضخم CPI'
                        : 'e.g. Limited-Time VIP Upgrade Offer or US CPI Release Alert'
                    }
                    className="w-full px-3.5 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] focus:border-[#1E53E5] dark:focus:border-[#26A69A] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                    {isAr ? 'نص الرسالة والتفاصيل (Rich Body Text)' : 'Popup Body Content'}
                  </label>
                  <textarea
                    rows={3}
                    value={popupMessage}
                    onChange={(e) => setPopupMessage(e.target.value)}
                    placeholder={
                      isAr
                        ? 'اكتب تفاصيل الإعلان أو العرض هنا...'
                        : 'Write the full announcement, offer details, or risk warning...'
                    }
                    className="w-full px-3.5 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] focus:border-[#1E53E5] dark:focus:border-[#26A69A] text-xs text-[#131722] dark:text-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#4A5162] dark:text-[#94A3B8]" />
                    <span>
                      {isAr
                        ? 'رابط صورة أو بانر علوي اختياري (Banner Image URL)'
                        : 'Optional Header / Banner Image URL'}
                    </span>
                  </label>
                  <input
                    type="url"
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] focus:border-[#1E53E5] dark:focus:border-[#26A69A] text-xs font-mono text-[#131722] dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 2. Appearance & Colors */}
              <div className="space-y-3.5 pb-4 border-b border-[#E0E3EB] dark:border-[#2A2E39]">
                <h4 className="text-xs font-bold text-[#131722] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#9A6700] dark:text-[#F0B90B]" />
                  <span>
                    {isAr
                      ? '2. المظهر والألوان (Appearance, Surface & Accent Colors)'
                      : '2. Appearance, Surface & Accent Colors'}
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Accent Color */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1.5">
                      {isAr ? 'اللون الرئيسي (Accent)' : 'Accent Color'}
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {ACCENT_COLOR_PRESETS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setAccentColor(c.hex);
                            setCtaColor(c.hex);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold border flex items-center gap-1 cursor-pointer ${
                            accentColor.toUpperCase() === c.hex
                              ? 'border-white bg-[#F8F9FD] dark:bg-[#1E222D] text-[#131722] dark:text-white'
                              : 'border-[#E0E3EB] dark:border-[#2A2E39] bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8]'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{isAr ? c.labelAr : c.labelEn}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-8 h-8 rounded bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        dir="ltr"
                        className="flex-1 px-2.5 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-mono text-[#131722] dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Surface Style */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1.5">
                      {isAr ? 'نمط الخلفية والحدود (Surface)' : 'Surface Style'}
                    </label>
                    <div className="space-y-1.5">
                      {(
                        [
                          {
                            id: 'dark_terminal',
                            ar: 'تيرمينال داكن مؤسسي (#131722)',
                            en: 'Dark Terminal (#131722)'
                          },
                          {
                            id: 'high_contrast',
                            ar: 'تباين عالي داكن (#0B0E11)',
                            en: 'High Contrast Deep (#0B0E11)'
                          },
                          {
                            id: 'alert_border',
                            ar: 'إطار تنبيه بارز ومشبع',
                            en: 'Highlighted Alert Border'
                          }
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setSurfaceStyle(st.id);
                          }}
                          className={`w-full px-3 py-1.5 rounded-md text-[11px] font-semibold text-start border flex items-center justify-between cursor-pointer ${
                            surfaceStyle === st.id
                              ? 'bg-[#F8F9FD] dark:bg-[#1E222D] text-[#131722] dark:text-white border-[#26A69A]'
                              : 'bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8] border-[#E0E3EB] dark:border-[#2A2E39]'
                          }`}
                        >
                          <span>{isAr ? st.ar : st.en}</span>
                          {surfaceStyle === st.id && (
                            <Check className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button Color */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1.5">
                      {isAr ? 'لون زر الإجراء (CTA Color)' : 'CTA Button Color'}
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {ACCENT_COLOR_PRESETS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setCtaColor(c.hex);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold border flex items-center gap-1 cursor-pointer ${
                            ctaColor.toUpperCase() === c.hex
                              ? 'border-white bg-[#F8F9FD] dark:bg-[#1E222D] text-[#131722] dark:text-white'
                              : 'border-[#E0E3EB] dark:border-[#2A2E39] bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8]'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.hex}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={ctaColor}
                        onChange={(e) => setCtaColor(e.target.value)}
                        className="w-8 h-8 rounded bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={ctaColor}
                        onChange={(e) => setCtaColor(e.target.value)}
                        dir="ltr"
                        className="flex-1 px-2.5 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-mono text-[#131722] dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Placement, Trigger Location & Target Audience */}
              <div className="space-y-3.5 pb-4 border-b border-[#E0E3EB] dark:border-[#2A2E39]">
                <h4 className="text-xs font-bold text-[#131722] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Layout className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                  <span>
                    {isAr
                      ? '3. موضع الظهور، القسم المستهدف، والجمهور (Placement & Audience)'
                      : '3. Placement, Trigger Location & Target Audience'}
                  </span>
                </h4>

                {/* Placement Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1.5">
                    {isAr ? 'موضع النافذة على الشاشة (Screen Placement)' : 'Screen Placement'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        {
                          id: 'center_modal',
                          ar: 'نافذة وسط الشاشة (Center Modal)',
                          en: 'Center Modal'
                        },
                        {
                          id: 'top_banner',
                          ar: 'شريط علوي عريض (Top Banner)',
                          en: 'Top Banner Bar'
                        },
                        {
                          id: 'bottom_card',
                          ar: 'بطاقة سفلية عائمة (Bottom Card)',
                          en: 'Bottom Floating Card'
                        },
                        {
                          id: 'bottom_right_toast',
                          ar: 'إشعار زاوية (Corner Toast)',
                          en: 'Bottom-Right Toast'
                        }
                      ] as const
                    ).map((pl) => (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setPlacement(pl.id);
                        }}
                        className={`p-2.5 rounded-md text-xs font-bold border text-center cursor-pointer transition-colors ${
                          placement === pl.id
                            ? 'bg-[#E6F5F2] dark:bg-[#26A69A]/15 text-[#089981] dark:text-[#26A69A] border-[#26A69A]'
                            : 'bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white border-[#E0E3EB] dark:border-[#2A2E39]'
                        }`}
                      >
                        {isAr ? pl.ar : pl.en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trigger Location & Audience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1.5">
                      {isAr ? 'مكان الظهور داخل المنصة (Where to Show)' : 'Where to Show (Trigger Location)'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'global', ar: 'في كل مكان (Global)', en: 'Anywhere (Global)' },
                          { id: 'chart', ar: 'الشارت / اللوحة', en: 'Chart / Dashboard' },
                          { id: 'signals', ar: 'التوصيات والبوت', en: 'Signals & Bot Hub' },
                          { id: 'chat', ar: 'غرفة الشات والخاص', en: 'Trading Chat' }
                        ] as const
                      ).map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSelectTriggerLocation(loc.id)}
                          className={`px-2.5 py-2 rounded-md text-[11px] font-bold border text-start cursor-pointer ${
                            triggerLocation === loc.id
                              ? 'bg-[#F8F9FD] dark:bg-[#1E222D] text-[#131722] dark:text-white border-[#26A69A]'
                              : 'bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8] border-[#E0E3EB] dark:border-[#2A2E39]'
                          }`}
                        >
                          {isAr ? loc.ar : loc.en}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8]">
                        {isAr ? 'الجمهور المستهدف (Target Audience)' : 'Target Audience Segment'}
                      </label>
                      <span className="text-[11px] font-mono tabular-nums text-[#089981] dark:text-[#26A69A] font-bold">
                        {matchingPopupAudienceCount} {isAr ? 'مستخدم مطابق' : 'matching users'}
                      </span>
                    </div>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value as TargetAudienceSegment)}
                      className="w-full px-3 py-2.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">{isAr ? 'جميع المستخدمين (All Users)' : 'All Users'}</option>
                      <option value="free">
                        {isAr ? 'الأعضاء المجانيين فقط (Free Users Only)' : 'Free Users Only'}
                      </option>
                      <option value="vip">{isAr ? 'أعضاء VIP و Elite' : 'VIP Members'}</option>
                      <option value="elite">{isAr ? 'أعضاء باقة Elite فقط' : 'Elite Members Only'}</option>
                      <option value="expiring_soon">
                        {isAr ? 'من ينتهي اشتراكهم قريباً (<= 7 أيام)' : 'Expiring Soon (<= 7 Days)'}
                      </option>
                      <option value="expired">
                        {isAr ? 'المشتركون المنتهية اشتراكاتهم (Expired)' : 'Expired Users'}
                      </option>
                    </select>
                  </div>
                </div>

                {/* Fine-Grained Tab Multi-Select */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#787B86] dark:text-[#64748B] mb-1.5">
                    {isAr
                      ? 'تخصيص الأقسام الدقيقة (اختياري — يتم ضبطها تلقائياً مع الاختيار أعلاه):'
                      : 'Fine-grained tab triggers (auto-synced with trigger location above):'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_TABS.map((tab) => {
                      const isSelected = selectedTabs.includes(tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => toggleTabSelection(tab.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#E6F5F2] dark:bg-[#26A69A]/20 text-[#089981] dark:text-[#26A69A] border-[#26A69A]'
                              : 'bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#787B86] dark:text-[#64748B] hover:text-[#131722] dark:hover:text-white border-[#E0E3EB] dark:border-[#2A2E39]'
                          }`}
                        >
                          {isAr ? tab.labelAr : tab.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. Scheduling, Live Offer Countdown Timer & Frequency */}
              <div className="space-y-3.5 pb-4 border-b border-[#E0E3EB] dark:border-[#2A2E39]">
                <h4 className="text-xs font-bold text-[#131722] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Timer className="w-4 h-4 text-[#9A6700] dark:text-[#F0B90B]" />
                  <span>
                    {isAr
                      ? '4. الجدولة، مؤقت العد التنازلي المباشر، وتكرار الظهور'
                      : '4. Scheduling, Live Offer Countdown & Display Frequency'}
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                      {isAr ? 'توقيت النشر' : 'Publish Schedule'}
                    </label>
                    <select
                      value={scheduleMode}
                      onChange={(e) =>
                        setScheduleMode(e.target.value as 'immediate' | 'scheduled')
                      }
                      className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="immediate">
                        {isAr ? 'نشر فوري الآن (Immediately)' : 'Publish Immediately'}
                      </option>
                      <option value="scheduled">
                        {isAr ? 'تحديد تاريخ ووقت البدء' : 'Custom Start Date & Time'}
                      </option>
                    </select>
                  </div>

                  {scheduleMode === 'scheduled' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                        {isAr ? 'تاريخ ووقت البدء' : 'Start Date & Time'}
                      </label>
                      <input
                        type="datetime-local"
                        value={startAtLocal}
                        onChange={(e) => setStartAtLocal(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-mono text-[#131722] dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                      {isAr ? 'تاريخ الانتهاء التلقائي (اختياري)' : 'Auto-Expire Date & Time (Optional)'}
                    </label>
                    <input
                      type="datetime-local"
                      value={endAtLocal}
                      onChange={(e) => setEndAtLocal(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-mono text-[#131722] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                      {isAr ? 'تكرار الظهور للمستخدم (Frequency)' : 'Display Frequency'}
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as PopupDisplayFrequency)}
                      className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="once_per_user">
                        {isAr ? 'مرة واحدة لكل مستخدم (دائم)' : 'Once per user (persistent)'}
                      </option>
                      <option value="once_per_session">
                        {isAr ? 'مرة واحدة في كل جلسة' : 'Once per session'}
                      </option>
                      <option value="every_visit">
                        {isAr ? 'في كل زيارة حتى الإغلاق' : 'Every visit until dismissed'}
                      </option>
                    </select>
                  </div>
                </div>

                {/* Live Offer Countdown Timer Box */}
                <div className="p-3 rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#131722] dark:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={countdownEnabled}
                        onChange={(e) => setCountdownEnabled(e.target.checked)}
                        className="accent-[#F0B90B] w-4 h-4 cursor-pointer"
                      />
                      <Clock className="w-3.5 h-3.5 text-[#9A6700] dark:text-[#F0B90B]" />
                      <span>
                        {isAr
                          ? 'تفعيل مؤقت العد التنازلي المباشر للعرض (DD : HH : MM : SS)'
                          : 'Enable Live Offer Countdown Timer (DD : HH : MM : SS)'}
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { h: 1, label: '+1h' },
                        { h: 6, label: '+6h' },
                        { h: 24, label: '+24h' },
                        { h: 48, label: '+48h' },
                        { h: 168, label: '+7d' }
                      ].map((q) => (
                        <button
                          key={q.h}
                          type="button"
                          onClick={() => handleSetQuickCountdownHours(q.h)}
                          className="px-2 py-0.5 rounded bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[10px] font-mono font-bold text-[#9A6700] dark:text-[#F0B90B] cursor-pointer"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {countdownEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                          {isAr ? 'عنوان العد التنازلي' : 'Countdown Label'}
                        </label>
                        <input
                          type="text"
                          value={countdownLabel}
                          onChange={(e) => setCountdownLabel(e.target.value)}
                          placeholder={isAr ? 'ينتهي العرض خلال' : 'Offer ends in'}
                          className="w-full px-3 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs text-[#131722] dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                          {isAr
                            ? 'تاريخ ووقت انتهاء العداد (تختفي النافذة تلقائياً عند الصفر)'
                            : 'Countdown Target End Date & Time (auto-hides at 00:00)'}
                        </label>
                        <input
                          type="datetime-local"
                          value={countdownEndLocal}
                          onChange={(e) => setCountdownEndLocal(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-mono text-[#131722] dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. CTA Action & Web Push Trigger */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-[#131722] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                  <span>
                    {isAr
                      ? '5. زر الإجراء التفاعلي وإشعار الهاتف (CTA Action & Web Push)'
                      : '5. CTA Button Action & Web Push Dispatch'}
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                      {isAr ? 'نوع إجراء الزر (CTA Action Type)' : 'CTA Action Type'}
                    </label>
                    <select
                      value={ctaType}
                      onChange={(e) => setCtaType(e.target.value as AnnouncementCtaType)}
                      className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="plans">
                        {isAr ? 'فتح نافذة الباقات والترقية (Plans Modal)' : 'Open Upgrade / Plans Modal'}
                      </option>
                      <option value="navigate_tab">
                        {isAr ? 'الانتقال إلى قسم داخل المنصة (Navigate to Tab)' : 'Navigate to App Tab'}
                      </option>
                      <option value="support_chat">
                        {isAr ? 'فتح محادثة الدعم الفني (@mbktrading)' : 'Open @mbktrading Support Chat'}
                      </option>
                      <option value="url">
                        {isAr ? 'رابط خارجي / واتساب / تيليجرام (External URL)' : 'External URL / WhatsApp / Telegram'}
                      </option>
                      <option value="promo">
                        {isAr ? 'فتح نافذة تفعيل الكود (Promo Code Modal)' : 'Open Promo Code Modal'}
                      </option>
                      <option value="calendar">
                        {isAr ? 'فتح التقويم الاقتصادي (Economic Calendar)' : 'Open Economic Calendar'}
                      </option>
                      <option value="none">
                        {isAr ? 'إغلاق فقط (Close Only)' : 'Close Only (No Extra CTA)'}
                      </option>
                    </select>
                  </div>

                  {ctaType !== 'none' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                        {isAr ? 'نص الزر (CTA Label)' : 'CTA Button Label'}
                      </label>
                      <input
                        type="text"
                        value={ctaLabel}
                        onChange={(e) => setCtaLabel(e.target.value)}
                        placeholder={isAr ? 'مثال: اشترك الآن / تواصل مع الدعم' : 'e.g. Upgrade Now'}
                        className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>

                {ctaType === 'navigate_tab' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                      {isAr ? 'اختر القسم الذي سينتقل إليه المستخدم:' : 'Target App Tab:'}
                    </label>
                    <select
                      value={ctaTargetTab}
                      onChange={(e) => setCtaTargetTab(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-bold text-[#131722] dark:text-white cursor-pointer"
                    >
                      {NAVIGABLE_TARGET_TABS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {isAr ? t.labelAr : t.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {ctaType === 'url' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                      {isAr
                        ? 'الرابط الخارجي (https://... أو رابط واتساب / تيليجرام):'
                        : 'External URL (https://... or WhatsApp / Telegram link):'}
                    </label>
                    <input
                      type="url"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://t.me/..."
                      dir="ltr"
                      className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-mono text-[#131722] dark:text-white"
                    />
                  </div>
                )}

                {/* Web Push Checkbox */}
                <div className="p-3 rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#131722] dark:text-[#E2E8F0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendPopupWebPush}
                      onChange={(e) => setSendPopupWebPush(e.target.checked)}
                      className="accent-[#26A69A] w-4 h-4 cursor-pointer"
                    />
                    <BellRing className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
                    <span>
                      {isAr
                        ? 'إرسال إشعار خلفية للهواتف (Web Push Notification) بالتزامن مع النشر الفوري'
                        : 'Also dispatch background Web Push notification (/api/push/send) on immediate publish'}
                    </span>
                  </label>
                </div>

                {/* Submit / Save Actions */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={isPublishingPopup}
                    className="flex-1 py-2.5 px-5 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPublishingPopup ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <BellRing className="w-4 h-4" />
                    )}
                    <span>
                      {editingPopupId
                        ? isAr
                          ? 'حفظ التعديلات وتحديث النافذة المنبثقة'
                          : 'Save Changes & Update Live Popup'
                        : scheduleMode === 'scheduled'
                        ? isAr
                          ? 'جدولة النافذة المنبثقة الآن'
                          : 'Schedule Popup Announcement'
                        : isAr
                        ? 'نشر وإطلاق النافذة المنبثقة الآن'
                        : 'Publish Live Popup Announcement Now'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSaveTemplateModal('popup')}
                    className="py-2.5 px-4 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#131722] dark:text-[#E2E8F0] font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5 text-[#9A6700] dark:text-[#F0B90B]" />
                    <span>{isAr ? 'حفظ كقالب' : 'Save Template'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* RIGHT/END: INTERACTIVE LIVE PREVIEW PANEL */}
            <div className="xl:col-span-5 xl:sticky xl:top-4 space-y-4">
              <div className="bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E0E3EB] dark:border-[#2A2E39] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                    <span className="text-xs font-bold text-[#131722] dark:text-white uppercase tracking-wider">
                      {isAr ? 'معاينة حية ومباشرة (Live Studio Preview)' : 'Interactive Live Preview'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] text-[10px] font-mono text-[#4A5162] dark:text-[#94A3B8]">
                    {placement.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                {/* Simulated Screen Viewport */}
                <div className="relative min-h-[380px] rounded-lg bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-4 flex flex-col justify-between overflow-hidden">
                  {/* Subtle Terminal Grid Header Mock */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#787B86] dark:text-[#64748B] border-b border-[#E0E3EB] dark:border-[#2A2E39]/60 pb-2">
                    <span>MBK TERMINAL • XAUUSD / US100</span>
                    <span>AUDIENCE: {targetAudience.toUpperCase()}</span>
                  </div>

                  {/* Placement Wrapper inside Preview Viewport */}
                  <div
                    className={`my-auto flex w-full ${
                      placement === 'top_banner'
                        ? 'items-start'
                        : placement === 'bottom_card'
                        ? 'items-end justify-center'
                        : placement === 'bottom_right_toast'
                        ? 'items-end justify-end'
                        : 'items-center justify-center'
                    }`}
                  >
                    {/* RENDERED POPUP CARD PREVIEW */}
                    <div
                      className={`w-full transition-all rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl ${
                        surfaceStyle === 'high_contrast'
                          ? 'bg-[#FFFFFF] dark:bg-[#0B0E11]'
                          : 'bg-[#FFFFFF] dark:bg-[#131722]'
                      }`}
                      style={{
                        borderWidth: surfaceStyle === 'alert_border' ? '2px' : '1px',
                        borderStyle: 'solid',
                        borderColor:
                          surfaceStyle === 'alert_border'
                            ? accentColor
                            : 'var(--mbk-border)'
                      }}
                    >
                      {/* Top Accent Bar */}
                      <div
                        className="h-1 w-full"
                        style={{ backgroundColor: accentColor }}
                      />

                      {/* Optional Banner Image */}
                      {bannerImageUrl.trim() && (
                        <div className="w-full h-32 bg-[#F0F3FA] dark:bg-[#0B0E11] border-b border-[#E0E3EB] dark:border-[#2A2E39] overflow-hidden">
                          <img
                            src={bannerImageUrl}
                            alt="Banner"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="p-4 space-y-3">
                        {/* Brand Header Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {showLogo && (
                              <img
                                src="/mbk-logo.png"
                                alt="MBK Trading"
                                className="w-7 h-7 rounded-md object-contain bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-0.5 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[#131722] dark:text-white truncate">
                                  {normalizeBrandSenderName(senderName)}
                                </span>
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold inline-flex items-center gap-0.5 shrink-0"
                                  style={{
                                    backgroundColor: `${accentColor}22`,
                                    color: accentColor,
                                    border: `1px solid ${accentColor}55`
                                  }}
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  <span>VERIFIED</span>
                                </span>
                              </div>
                              {badgeText.trim() && (
                                <span
                                  className="inline-block text-[9px] font-mono font-bold uppercase tracking-wider mt-0.5"
                                  style={{ color: accentColor }}
                                >
                                  {badgeText}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="p-1 rounded bg-[#F8F9FD] dark:bg-[#1E222D] text-[#787B86] dark:text-[#64748B]">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        </div>

                        {/* Title & Body */}
                        <div className="space-y-1.5">
                          <h5 className="text-sm font-bold text-[#131722] dark:text-white leading-snug">
                            {popupTitle.trim() ||
                              (isAr
                                ? 'عنوان النافذة المنبثقة يظهر هنا...'
                                : 'Popup Headline Appears Here...')}
                          </h5>
                          <p className="text-xs text-[#4A5162] dark:text-[#94A3B8] leading-relaxed whitespace-pre-wrap break-words">
                            {popupMessage.trim() ||
                              (isAr
                                ? 'تفاصيل الإعلان أو العرض الخاص أو تحذير الأخبار الاقتصادية ستظهر هنا بوضوح للمتداولين.'
                                : 'Your announcement details, offer description, or macro warning body text will render here.')}
                          </p>
                        </div>

                        {/* Real-Time Ticking Countdown Timer in Preview */}
                        {countdownEnabled && (
                          <div className="p-2.5 rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#131722] dark:text-[#E2E8F0]">
                              <Clock className="w-3.5 h-3.5" style={{ color: accentColor }} />
                              <span>
                                {countdownLabel || (isAr ? 'ينتهي العرض خلال' : 'Offer ends in')}
                              </span>
                            </div>

                            {previewCountdown.expired ? (
                              <span className="px-2 py-0.5 rounded bg-[#FDECEE] dark:bg-[#EF5350]/20 text-[#D93848] dark:text-[#EF5350] text-[10px] font-mono font-bold">
                                {isAr ? 'انتهى الوقت (00:00:00)' : 'EXPIRED (00:00:00)'}
                              </span>
                            ) : (
                              <div
                                className="flex items-center gap-1 font-mono tabular-nums text-xs font-bold"
                                dir="ltr"
                              >
                                {[
                                  { val: previewCountdown.dd, unit: 'D' },
                                  { val: previewCountdown.hh, unit: 'H' },
                                  { val: previewCountdown.mm, unit: 'M' },
                                  { val: previewCountdown.ss, unit: 'S' }
                                ].map((part, idx) => (
                                  <React.Fragment key={part.unit}>
                                    {idx > 0 && <span className="text-[#787B86] dark:text-[#64748B]">:</span>}
                                    <span
                                      className="px-1.5 py-0.5 rounded bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#131722] dark:text-white"
                                      style={{ borderColor: `${accentColor}55` }}
                                    >
                                      {part.val}
                                      <span className="text-[9px] text-[#4A5162] dark:text-[#94A3B8] ms-0.5">
                                        {part.unit}
                                      </span>
                                    </span>
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* CTA Buttons Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {ctaType !== 'none' && (
                            <span
                              className="px-3.5 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 shadow"
                              style={{
                                backgroundColor: ctaColor,
                                color:
                                  ctaColor.toUpperCase() === '#F0B90B' ? '#0B0E11' : '#FFFFFF'
                              }}
                            >
                              <span>
                                {ctaLabel.trim() ||
                                  (isAr ? 'عرض التفاصيل' : 'Take Action')}
                              </span>
                            </span>
                          )}
                          <span className="px-3 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#4A5162] dark:text-[#94A3B8] text-[11px] font-semibold">
                            {isAr ? 'إغلاق' : 'Dismiss'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview Footer Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[#787B86] dark:text-[#64748B] border-t border-[#E0E3EB] dark:border-[#2A2E39]/60 pt-2">
                    <span>FREQ: {frequency.toUpperCase()}</span>
                    <span>
                      PUSH: {sendPopupWebPush ? 'ENABLED' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* ACTIVE & SCHEDULED POPUPS MANAGER TABLE (LIVE KILL SWITCH & METRICS) */}
          {/* =================================================================== */}
          <div className="bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-lg p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E0E3EB] dark:border-[#2A2E39] pb-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#131722] dark:text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                  <span>
                    {isAr
                      ? `إدارة النوافذ المنبثقة النشطة والمجدولة (${announcements.length})`
                      : `Active & Scheduled Popups Manager (${announcements.length})`}
                  </span>
                </h4>
                <p className="text-[11px] text-[#787B86] dark:text-[#64748B]">
                  {isAr
                    ? 'تحكم فوري: إيقاف مؤقت، استئناف، تعديل، نسخ، أو حذف نهائي من شاشات المستخدمين'
                    : 'Live Kill Switch: Pause, resume, edit, duplicate, or delete popups in real time'}
                </p>
              </div>
            </div>

            {announcements.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#787B86] dark:text-[#64748B]">
                {isAr
                  ? 'لا توجد نوافذ منبثقة منشورة حالياً.'
                  : 'No popups published yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#E0E3EB] dark:border-[#2A2E39] rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11]">
                <table className="w-full text-start text-xs border-collapse">
                  <thead className="bg-[#FFFFFF] dark:bg-[#131722] border-b border-[#E0E3EB] dark:border-[#2A2E39] text-[#787B86] dark:text-[#64748B] font-mono text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'النافذة والمُرسل' : 'Popup & Sender'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الموضع والجمهور' : 'Placement & Audience'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'العداد / الجدولة' : 'Countdown / Schedule'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الإحصائيات' : 'Metrics'}</th>
                      <th className="py-2.5 px-3 text-end">{isAr ? 'إجراءات فورية' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E3EB] dark:divide-[#2A2E39]">
                    {announcements.map((ann) => {
                      const status = getPopupLifecycleStatus(ann);
                      const cd =
                        ann.countdownEnabled && ann.countdownEndAtMs
                          ? formatCountdownParts(ann.countdownEndAtMs, nowMs)
                          : null;

                      return (
                        <tr key={ann.id} className="hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D]/60">
                          {/* Status */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${status.badgeClass}`}
                            >
                              {isAr ? status.labelAr : status.labelEn}
                            </span>
                          </td>

                          {/* Title & Brand */}
                          <td className="py-2.5 px-3 max-w-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: ann.accentColor || '#26A69A' }}
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#131722] dark:text-white truncate">
                                  {ann.title}
                                </div>
                                <div className="text-[10px] text-[#4A5162] dark:text-[#94A3B8] truncate">
                                  {normalizeBrandSenderName(ann.senderName)} •{' '}
                                  {ann.message.slice(0, 60)}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Placement & Audience */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[10px]">
                            <div className="text-[#131722] dark:text-[#E2E8F0] font-bold uppercase">
                              {(ann.placement || 'center_modal').replace(/_/g, ' ')}
                            </div>
                            <div className="text-[#4A5162] dark:text-[#94A3B8]">
                              AUD: {ann.targetAudience.toUpperCase()} • TABS:{' '}
                              {ann.targetTabs.slice(0, 3).join(', ')}
                            </div>
                          </td>

                          {/* Countdown / Expiry */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums text-[11px]">
                            {cd ? (
                              cd.expired ? (
                                <span className="text-[#D93848] dark:text-[#EF5350] font-bold">00:00:00 (EXPIRED)</span>
                              ) : (
                                <span className="text-[#9A6700] dark:text-[#F0B90B] font-bold">
                                  {cd.dd}d : {cd.hh}h : {cd.mm}m : {cd.ss}s
                                </span>
                              )
                            ) : ann.endAtMs ? (
                              <span className="text-[#4A5162] dark:text-[#94A3B8]">
                                {isAr ? 'ينتهي: ' : 'Ends: '}
                                {new Date(ann.endAtMs).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[#787B86] dark:text-[#64748B]">
                                {isAr ? 'مستمر' : 'Continuous'}
                              </span>
                            )}
                          </td>

                          {/* Views & Clicks */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums text-[11px]">
                            <div className="flex items-center gap-3">
                              <span className="text-[#131722] dark:text-[#E2E8F0]" title="Views">
                                <Eye className="w-3 h-3 inline me-1 text-[#4A5162] dark:text-[#94A3B8]" />
                                {ann.views || 0}
                              </span>
                              <span className="text-[#089981] dark:text-[#26A69A]" title="CTA Clicks">
                                <MousePointerClick className="w-3 h-3 inline me-1" />
                                {ann.clicks || 0}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-end whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleAnnouncementActive(ann.id, !ann.isActive, ann.title)
                                }
                                className="px-2.5 py-1 rounded bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#131722] dark:text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                title={ann.isActive ? 'Pause' : 'Resume'}
                              >
                                {ann.isActive ? (
                                  <>
                                    <Pause className="w-3 h-3 text-[#9A6700] dark:text-[#F0B90B]" />
                                    <span>{isAr ? 'إيقاف' : 'Pause'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 text-[#089981] dark:text-[#26A69A]" />
                                    <span>{isAr ? 'تفعيل' : 'Resume'}</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => loadPopupIntoStudio(ann, false)}
                                className="p-1.5 rounded bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#131722] dark:text-[#E2E8F0] hover:text-[#131722] dark:hover:text-white cursor-pointer"
                                title={isAr ? 'تعديل في الاستوديو' : 'Edit in Studio'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => loadPopupIntoStudio(ann, true)}
                                className="p-1.5 rounded bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white cursor-pointer"
                                title={isAr ? 'نسخ (Duplicate)' : 'Duplicate'}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteAnnouncement(ann.id, ann.title)}
                                className="p-1.5 rounded bg-[#FDECEE] dark:bg-[#EF5350]/15 hover:bg-[#EF5350] border border-[#F5C2C7] dark:border-[#EF5350]/30 text-[#D93848] dark:text-[#EF5350] hover:text-white cursor-pointer"
                                title={isAr ? 'حذف نهائي' : 'Delete immediately'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: BRANDED BULK DIRECT MESSAGES (COMPOSER + LIVE INBOX PREVIEW)     */}
      {/* ======================================================================= */}
      {activeSubTab === 'bulk_dm' && (
        <div className="space-y-5">
          {/* Saved DM Templates Quick Bar */}
          <div className="bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#4A5162] dark:text-[#94A3B8] flex items-center gap-1 me-1">
                <Bookmark className="w-3.5 h-3.5 text-[#9A6700] dark:text-[#F0B90B]" />
                <span>{isAr ? 'قوالب الرسائل المحفوظة:' : 'Saved Bulk DM Templates:'}</span>
              </span>
              {dmTemplates.length === 0 ? (
                <span className="text-[11px] text-[#787B86] dark:text-[#64748B]">
                  {isAr
                    ? 'لا توجد قوالب رسائل محفوظة — اكتب رسالتك واضغط حفظ كقالب.'
                    : 'No saved DM templates yet — compose below and click Save as Template.'}
                </span>
              ) : (
                dmTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="inline-flex items-center rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => applySavedTemplate(tpl)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#131722] dark:text-[#E2E8F0] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D] transition-colors cursor-pointer"
                    >
                      {tpl.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAdminTemplate(tpl.id, tpl.name)}
                      className="px-1.5 py-1 text-[#787B86] dark:text-[#64748B] hover:text-[#EF5350] hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D] border-s border-[#E0E3EB] dark:border-[#2A2E39] cursor-pointer"
                      title={isAr ? 'حذف القالب' : 'Delete template'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => handleOpenSaveTemplateModal('dm')}
              className="px-3 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#9A6700] dark:text-[#F0B90B] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{isAr ? 'حفظ الرسالة الحالية كقالب' : 'Save Current DM as Template'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* LEFT/START: BULK DM COMPOSER */}
            <form
              onSubmit={handleSendBulkDm}
              className="xl:col-span-7 bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-lg p-4 sm:p-5 space-y-5"
            >
              {/* Official Brand Identity Controls */}
              <div className="space-y-3.5 pb-4 border-b border-[#E0E3EB] dark:border-[#2A2E39]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#131722] dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                    <span>
                      {isAr
                        ? '1. الهوية الرسمية للمُرسل (Official Brand Sender Identity)'
                        : '1. Official Brand Sender Identity'}
                    </span>
                  </h4>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#131722] dark:text-[#E2E8F0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dmShowLogo}
                      onChange={(e) => setDmShowLogo(e.target.checked)}
                      className="accent-[#26A69A] w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>{isAr ? 'إرفاق شعار MBK الرسمي' : 'Include Official MBK Logo'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-7 space-y-1.5">
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8]">
                      {isAr ? 'اسم مكتب الإرسال الرسمي' : 'Official Desk Display Name'}
                    </label>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {SENDER_PRESET_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setDmSenderName(chip);
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border cursor-pointer ${
                            dmSenderName === chip
                              ? 'bg-[#26A69A] text-white border-[#26A69A]'
                              : 'bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white border-[#E0E3EB] dark:border-[#2A2E39]'
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={dmSenderName}
                      onChange={(e) => setDmSenderName(e.target.value)}
                      placeholder="MBK Trading"
                      className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] focus:border-[#1E53E5] dark:focus:border-[#26A69A] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                      {isAr ? 'رابط صورة مرفقة (اختياري)' : 'Optional Banner Image URL'}
                    </label>
                    <input
                      type="url"
                      value={dmBannerImageUrl}
                      onChange={(e) => setDmBannerImageUrl(e.target.value)}
                      placeholder="https://..."
                      dir="ltr"
                      className="w-full px-3 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-mono text-[#131722] dark:text-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Audience Segment Selector */}
              <div className="space-y-3 pb-4 border-b border-[#E0E3EB] dark:border-[#2A2E39]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#131722] dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                    <span>
                      {isAr
                        ? '2. شريحة المستلمين المستهدفة (Target Recipient Segment)'
                        : '2. Target Recipient Segment'}
                    </span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded bg-[#E6F5F2] dark:bg-[#26A69A]/15 border border-[#B3E2D9] dark:border-[#26A69A]/40 text-[#089981] dark:text-[#26A69A] text-xs font-mono tabular-nums font-bold">
                    {matchingDmRecipients.length} {isAr ? 'مستلم مطابق' : 'Matched Users'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'all', ar: 'جميع المستخدمين (All)', en: 'All Users' },
                      {
                        id: 'expiring_soon',
                        ar: 'ينتهي خلال <= 7 أيام',
                        en: 'Expiring <= 7 Days'
                      },
                      { id: 'free', ar: 'الأعضاء المجانيين (Free)', en: 'Free Users' },
                      { id: 'vip', ar: 'مشتركو باقة VIP', en: 'VIP Subscribers' },
                      { id: 'elite', ar: 'مشتركو باقة Elite', en: 'Elite Subscribers' },
                      { id: 'expired', ar: 'المنتهية اشتراكاتهم (Expired)', en: 'Expired Users' }
                    ] as const
                  ).map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setDmSegment(seg.id);
                      }}
                      className={`p-2.5 rounded-md text-xs font-bold text-start border flex items-center justify-between cursor-pointer transition-colors ${
                        dmSegment === seg.id
                          ? 'bg-[#E6F5F2] dark:bg-[#26A69A]/15 text-[#131722] dark:text-white border-[#26A69A]'
                          : 'bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white border-[#E0E3EB] dark:border-[#2A2E39]'
                      }`}
                    >
                      <span>{isAr ? seg.ar : seg.en}</span>
                      {dmSegment === seg.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Message Composer */}
              <div className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#131722] dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#9A6700] dark:text-[#F0B90B]" />
                    <span>
                      {isAr
                        ? '3. عنوان ونص الرسالة الخاصة (Title & Personalized Message)'
                        : '3. Title & Personalized Message Composer'}
                    </span>
                  </h4>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#4A5162] dark:text-[#94A3B8]">
                      {isAr ? 'إدراج متغير ذكي:' : 'Insert variable:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => insertDmVariable('{name}')}
                      className="px-2 py-0.5 rounded bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[11px] font-mono font-bold text-[#089981] dark:text-[#26A69A] cursor-pointer"
                    >
                      + {'{name}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertDmVariable('{days}')}
                      className="px-2 py-0.5 rounded bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[11px] font-mono font-bold text-[#9A6700] dark:text-[#F0B90B] cursor-pointer"
                    >
                      + {'{days}'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                    {isAr ? 'عنوان الرسالة (Headline — اختياري)' : 'Message Title / Subject (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={dmTitle}
                    onChange={(e) => setDmTitle(e.target.value)}
                    placeholder={
                      isAr
                        ? 'مثال: تذكير بتجديد اشتراكك في MBK Trading أو عرض VIP خاص لك'
                        : 'e.g. Official VIP Renewal Reminder or Exclusive Offer for {name}'
                    }
                    className="w-full px-3.5 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] focus:border-[#1E53E5] dark:focus:border-[#26A69A] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1">
                    {isAr ? 'محتوى الرسالة الخاصة' : 'Direct Message Content'}
                  </label>
                  <textarea
                    rows={5}
                    value={dmMessageText}
                    onChange={(e) => setDmMessageText(e.target.value)}
                    placeholder={
                      isAr
                        ? 'مرحباً {name}، نود إعلامك بأن اشتراكك يتبقى عليه {days} أيام...'
                        : 'Hello {name}, your subscription has {days} days remaining...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] focus:border-[#1E53E5] dark:focus:border-[#26A69A] text-xs text-[#131722] dark:text-white focus:outline-hidden"
                    required
                  />
                </div>

                {/* Web Push Toggle */}
                <div className="p-3 rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#131722] dark:text-[#E2E8F0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dmSendWebPush}
                      onChange={(e) => setDmSendWebPush(e.target.checked)}
                      className="accent-[#26A69A] w-4 h-4 cursor-pointer"
                    />
                    <BellRing className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
                    <span>
                      {isAr
                        ? 'إرسال إشعار هاتف فوري (Background Web Push) لكل مستلم'
                        : 'Also dispatch real-time background Web Push notification to each recipient'}
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={isSendingBulkDm || matchingDmRecipients.length === 0}
                    className="flex-1 py-2.5 px-5 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingBulkDm ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>
                      {isAr
                        ? `إرسال الرسالة الرسمية الآن إلى (${matchingDmRecipients.length}) مستخدم`
                        : `Send Official Direct Message to (${matchingDmRecipients.length}) Users`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSaveTemplateModal('dm')}
                    className="py-2.5 px-4 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#131722] dark:text-[#E2E8F0] font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5 text-[#9A6700] dark:text-[#F0B90B]" />
                    <span>{isAr ? 'حفظ كقالب' : 'Save Template'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* RIGHT/END: LIVE USER INBOX DM PREVIEW */}
            <div className="xl:col-span-5 xl:sticky xl:top-4 space-y-4">
              <div className="bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E0E3EB] dark:border-[#2A2E39] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                    <span className="text-xs font-bold text-[#131722] dark:text-white uppercase tracking-wider">
                      {isAr
                        ? 'معاينة ظهور الرسالة في صندوق وارد المتداول (Inbox Preview)'
                        : 'Live User Inbox Thread Preview'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] text-[10px] font-mono text-[#089981] dark:text-[#26A69A]">
                    VERIFIED DM
                  </span>
                </div>

                {/* Simulated User Inbox Conversation Header + Bubble */}
                <div className="rounded-lg bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] overflow-hidden">
                  {/* Simulated Thread Header */}
                  <div className="px-3.5 py-2.5 bg-[#F8F9FD] dark:bg-[#1E222D] border-b border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-9 h-9 rounded-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-center overflow-hidden shrink-0">
                        {dmShowLogo ? (
                          <img
                            src="/mbk-logo.png"
                            alt="MBK Trading"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <span className="text-xs font-bold text-[#131722] dark:text-white">M</span>
                        )}
                        <span className="absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full bg-[#26A69A] ring-2 ring-[#1E222D]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#131722] dark:text-white">
                            {normalizeBrandSenderName(dmSenderName)}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#E6F5F2] dark:bg-[#26A69A]/20 text-[#089981] dark:text-[#26A69A] border border-[#B3E2D9] dark:border-[#26A69A]/40 inline-flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />
                            <span>OFFICIAL</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-[#4A5162] dark:text-[#94A3B8] block">
                          {isAr ? 'مكتب الإدارة الرسمي • متصل الآن' : 'Official Desk • Online'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Message Bubble */}
                  <div className="p-4 space-y-3">
                    <div className="max-w-[92%] rounded-xl rounded-es-sm bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-[#089981] dark:text-[#26A69A]">
                            {normalizeBrandSenderName(dmSenderName)}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#E6F5F2] dark:bg-[#26A69A]/15 text-[#089981] dark:text-[#26A69A] border border-[#B3E2D9] dark:border-[#26A69A]/30">
                            VERIFIED
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#787B86] dark:text-[#64748B]">NOW</span>
                      </div>

                      {previewResolvedDmTitle && (
                        <div className="text-xs font-bold text-[#131722] dark:text-white pb-1 border-b border-[#E0E3EB] dark:border-[#2A2E39]">
                          📌 {previewResolvedDmTitle}
                        </div>
                      )}

                      <p className="text-xs text-[#131722] dark:text-[#E2E8F0] leading-relaxed whitespace-pre-wrap break-words">
                        {previewResolvedDmBody}
                      </p>

                      {dmBannerImageUrl.trim() && (
                        <div className="pt-1">
                          <img
                            src={dmBannerImageUrl}
                            alt="Attachment"
                            className="w-full max-h-36 object-cover rounded border border-[#E0E3EB] dark:border-[#2A2E39]"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sample Matched Recipients Preview */}
                <div className="p-3 rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8]">
                    <span>{isAr ? 'عينة من المستلمين المطابقين:' : 'Sample Matching Recipients:'}</span>
                    <span className="font-mono tabular-nums text-[#089981] dark:text-[#26A69A]">
                      {matchingDmRecipients.length}
                    </span>
                  </div>
                  {matchingDmRecipients.length === 0 ? (
                    <div className="text-[11px] text-[#787B86] dark:text-[#64748B]">
                      {isAr ? 'لا يوجد مستخدمون في هذه الفئة.' : 'No users in this segment.'}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {matchingDmRecipients.slice(0, 18).map((r) => (
                        <span
                          key={r.uid}
                          className="px-2 py-0.5 rounded bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] text-[10px] font-mono text-[#131722] dark:text-[#E2E8F0]"
                        >
                          {r.name}
                          {r.remainingDays !== null && r.remainingDays !== undefined
                            ? ` (${r.remainingDays}d)`
                            : ''}
                        </span>
                      ))}
                      {matchingDmRecipients.length > 18 && (
                        <span className="px-2 py-0.5 rounded bg-[#F8F9FD] dark:bg-[#1E222D] text-[10px] font-mono text-[#4A5162] dark:text-[#94A3B8]">
                          +{matchingDmRecipients.length - 18} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 3: SAVED TEMPLATES MANAGER (admin_templates CRUD)                   */}
      {/* ======================================================================= */}
      {activeSubTab === 'templates' && (
        <div className="bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E0E3EB] dark:border-[#2A2E39] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#131722] dark:text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#9A6700] dark:text-[#F0B90B]" />
                <span>
                  {isAr
                    ? `مكتبة القوالب المخصصة المحفوظة (${savedTemplates.length})`
                    : `Custom Saved Templates Library (${savedTemplates.length})`}
                </span>
              </h3>
              <p className="text-xs text-[#787B86] dark:text-[#64748B]">
                {isAr
                  ? 'احفظ قوالب النوافذ المنبثقة والرسائل الخاصة المفضلة لديك في قاعدة البيانات وحمّلها أو عدّلها بضغطة واحدة'
                  : 'Manage your custom Firestore-persisted Popup and Bulk DM templates'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('popups');
                  handleOpenSaveTemplateModal('popup');
                }}
                className="px-3 py-1.5 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'حفظ قالب نافذة جديد' : 'New Popup Template'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('bulk_dm');
                  handleOpenSaveTemplateModal('dm');
                }}
                className="px-3 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#131722] dark:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'حفظ قالب رسالة خاصة' : 'New Bulk DM Template'}</span>
              </button>
            </div>
          </div>

          {savedTemplates.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#787B86] dark:text-[#64748B]">
              {isAr
                ? 'لا توجد قوالب محفوظة حالياً.'
                : 'No saved templates yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedTemplates.map((tpl) => {
                const isPopup = tpl.templateType === 'popup';
                const p = tpl.payload || {};
                return (
                  <div
                    key={tpl.id}
                    className="p-3.5 rounded-lg bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            isPopup
                              ? 'bg-[#E6F5F2] dark:bg-[#26A69A]/15 text-[#089981] dark:text-[#26A69A] border-[#B3E2D9] dark:border-[#26A69A]/40'
                              : 'bg-[#FDF6E3] dark:bg-[#F0B90B]/15 text-[#9A6700] dark:text-[#F0B90B] border-[#EFE0B4] dark:border-[#F0B90B]/40'
                          }`}
                        >
                          {isPopup ? 'POPUP TEMPLATE' : 'BULK DM TEMPLATE'}
                        </span>
                        <span className="text-[10px] font-mono text-[#787B86] dark:text-[#64748B]">
                          {normalizeBrandSenderName(p.senderName)}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-[#131722] dark:text-white">{tpl.name}</h4>
                      <p className="text-[11px] text-[#4A5162] dark:text-[#94A3B8] line-clamp-2">
                        {isPopup
                          ? `${p.title || ''} — ${p.message || ''}`
                          : `${p.dmTitle ? `[${p.dmTitle}] ` : ''}${p.dmMessageText || ''}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E0E3EB] dark:border-[#2A2E39]">
                      <button
                        type="button"
                        onClick={() => applySavedTemplate(tpl)}
                        className="flex-1 py-1.5 px-3 rounded bg-[#26A69A] hover:bg-[#1E8E82] text-white text-[11px] font-bold cursor-pointer"
                      >
                        {isAr ? 'تحميل في الاستوديو' : 'Load into Studio'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          applySavedTemplate(tpl);
                          handleOpenSaveTemplateModal(tpl.templateType, tpl);
                        }}
                        className="p-1.5 rounded bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#131722] dark:text-[#E2E8F0] cursor-pointer"
                        title={isAr ? 'إعادة تسمية / تحديث القالب' : 'Rename / Overwrite Template'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAdminTemplate(tpl.id, tpl.name)}
                        className="p-1.5 rounded bg-[#FDECEE] dark:bg-[#EF5350]/15 hover:bg-[#EF5350] border border-[#F5C2C7] dark:border-[#EF5350]/30 text-[#D93848] dark:text-[#EF5350] hover:text-white cursor-pointer"
                        title={isAr ? 'حذف القالب' : 'Delete Template'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: SAVE / UPDATE CUSTOM TEMPLATE                                    */}
      {/* ======================================================================= */}
      {savingTemplateModalType && (
        <div className="fixed inset-0 z-50 bg-[#131722]/45 dark:bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmSaveTemplate}
            className="bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-lg max-w-md w-full p-5 space-y-4 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E0E3EB] dark:border-[#2A2E39] pb-3">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-[#9A6700] dark:text-[#F0B90B]" />
                <h4 className="text-sm font-bold text-[#131722] dark:text-white">
                  {editingTemplateId
                    ? isAr
                      ? 'تحديث القالب المحفوظ'
                      : 'Update Saved Template'
                    : isAr
                    ? 'حفظ الإعداد الحالي كقالب مخصص'
                    : 'Save Current Setup as Custom Template'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSavingTemplateModalType(null)}
                className="p-1 rounded hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A5162] dark:text-[#94A3B8] mb-1.5">
                {isAr ? 'اسم القالب المخصص:' : 'Template Name:'}
              </label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder={
                  isAr ? 'مثال: عرض نهاية الأسبوع VIP' : 'e.g. Weekend VIP Flash Offer'
                }
                className="w-full px-3.5 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] focus:border-[#1E53E5] dark:focus:border-[#26A69A] text-xs font-bold text-[#131722] dark:text-white focus:outline-hidden"
                required
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSavingTemplateModalType(null)}
                className="px-4 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] text-xs font-semibold text-[#131722] dark:text-[#E2E8F0] cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSavingTemplate || !newTemplateName.trim()}
                className="px-5 py-2 rounded-md bg-[#26A69A] hover:bg-[#1E8E82] text-xs font-bold text-white cursor-pointer disabled:opacity-50"
              >
                {isSavingTemplate
                  ? isAr
                    ? 'جاري الحفظ...'
                    : 'Saving...'
                  : isAr
                  ? 'حفظ القالب الآن'
                  : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
