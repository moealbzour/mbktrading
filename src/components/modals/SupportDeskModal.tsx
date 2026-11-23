import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Headphones,
  X,
  Send,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
  Crown,
  Mail,
  CheckCheck,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Check
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PlatformContactSettings,
  buildWhatsAppUrl,
  formatTelegramHandle,
  normalizeTelegramUrl,
  subscribeToPlatformSettings
} from '../../services/platformSettingsService';
import {
  editDirectMessage,
  getDmConversationId,
  getOtherParticipantUid,
  markDmConversationRead,
  OFFICIAL_PLATFORM_UID,
  OFFICIAL_PLATFORM_USERNAME,
  PLATFORM_INBOX_TOPICS,
  PlatformInboxTopic,
  sendDirectMessage,
  subscribeToDmMessages
} from '../../services/directMessageService';
import { DmConversation, DmMessage, UserProfile } from '../../types/trading';
import { useSignalsContext } from '../../context/SignalsContext';
import { auth } from '../../lib/firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  isVIP?: boolean;
  userName?: string;
  user?: UserProfile | null;
  onOpenFullInbox?: (topic?: PlatformInboxTopic, targetUid?: string, targetName?: string) => void;
}

function formatMessageTime(tsMs: number, isAr: boolean): string {
  if (!tsMs) return '';
  try {
    return new Date(tsMs).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export const SupportDeskModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lang = 'ar',
  isVIP = false,
  userName = '',
  user = null,
  onOpenFullInbox
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'inbox' | 'faq'>('channels');
  const [platformSettings, setPlatformSettings] = useState<PlatformContactSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [selectedTopic, setSelectedTopic] = useState<PlatformInboxTopic>('support');
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Reuse dmConversations from SignalsContext (0 duplicate Firestore listeners)
  const { dmConversations } = useSignalsContext();
  const [selectedAdminTicketUser, setSelectedAdminTicketUser] = useState<{
    uid: string;
    displayName: string;
    role: string;
  } | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const isAr = lang === 'ar';
  const myUid = auth.currentUser?.uid || user?.uid || user?.id || '';
  const myDisplayName = (user?.name || userName || user?.email?.split('@')[0] || 'MBK Trader').trim();
  const myRole = (user?.role || (isVIP ? 'VIP' : 'FREE')).toString().toUpperCase();
  const isAdminUser = Boolean(
    user?.isAdmin ||
      myRole === 'ADMIN' ||
      auth.currentUser?.email?.toLowerCase() === 'moe.albzour@gmail.com'
  );

  const adminTickets = useMemo<DmConversation[]>(() => {
    if (!isAdminUser) return [];
    return dmConversations.filter((c) => c.participants.includes(OFFICIAL_PLATFORM_UID));
  }, [isAdminUser, dmConversations]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToPlatformSettings((nextSettings) => {
      setPlatformSettings(nextSettings);
    });
    return () => unsub();
  }, [isOpen]);

  const activeConvoId = useMemo(() => {
    if (!myUid) return '';
    if (isAdminUser) {
      if (!selectedAdminTicketUser?.uid) return '';
      return getDmConversationId(selectedAdminTicketUser.uid, OFFICIAL_PLATFORM_UID);
    }
    return getDmConversationId(myUid, OFFICIAL_PLATFORM_UID);
  }, [myUid, isAdminUser, selectedAdminTicketUser]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'inbox' || !activeConvoId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeToDmMessages(activeConvoId, (nextMsgs) => {
      setMessages(nextMsgs);
      if (isAdminUser) {
        markDmConversationRead(activeConvoId, OFFICIAL_PLATFORM_UID).catch(() => {});
      } else if (myUid) {
        markDmConversationRead(activeConvoId, myUid).catch(() => {});
      }
    });
    return () => unsub();
  }, [isOpen, activeTab, activeConvoId, isAdminUser, myUid]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages.length, activeTab, activeConvoId]);

  if (!isOpen) return null;

  const whatsappMessage = isAr
    ? `مرحباً فريق MBK DESK${userName ? ` (${userName})` : ''}، أرغب في الاستفسار عن الاشتراك والدعم.`
    : `Hello MBK DESK team${userName ? ` (${userName})` : ''}, I would like to inquire about subscriptions and support.`;
  const whatsappUrl = buildWhatsAppUrl(platformSettings.whatsappNumber, whatsappMessage);
  const telegramUrl = normalizeTelegramUrl(platformSettings.telegramUrl);
  const telegramHandle = formatTelegramHandle(platformSettings.telegramUrl);
  const supportEmail = platformSettings.supportEmail || DEFAULT_PLATFORM_SETTINGS.supportEmail;

  const totalAdminUnread = adminTickets.reduce(
    (sum, c) => sum + Number(c.unreadBy?.[OFFICIAL_PLATFORM_UID] || 0),
    0
  );

  const handleOpenInboxTopic = (topic: PlatformInboxTopic) => {
    soundManager.playClick();
    setSelectedTopic(topic);
    setActiveTab('inbox');
  };

  const handleSendPlatformMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myUid || sending) return;
    const raw = messageInput.trim().slice(0, 950);
    if (!raw) return;

    setSending(true);
    setFeedback(null);
    soundManager.playClick();

    try {
      if (isAdminUser) {
        if (!selectedAdminTicketUser) return;
        await sendDirectMessage({
          sender: {
            uid: myUid,
            displayName: myDisplayName,
            avatar: user?.avatar || '',
            role: 'ADMIN'
          },
          recipient: {
            uid: selectedAdminTicketUser.uid,
            displayName: selectedAdminTicketUser.displayName,
            avatar: '',
            role: selectedAdminTicketUser.role || 'FREE'
          },
          text: raw,
          replyAsPlatformDesk: true
        });
      } else {
        const topicObj =
          PLATFORM_INBOX_TOPICS.find((t) => t.id === selectedTopic) || PLATFORM_INBOX_TOPICS[0];
        const tag = isAr ? topicObj.tagAr : topicObj.tagEn;
        const finalText = raw.startsWith('[') ? raw : `${tag} ${raw}`.slice(0, 1000);

        await sendDirectMessage({
          sender: {
            uid: myUid,
            displayName: myDisplayName,
            avatar: user?.avatar || '',
            role: myRole
          },
          recipient: {
            uid: OFFICIAL_PLATFORM_UID,
            displayName: OFFICIAL_PLATFORM_USERNAME,
            avatar: '',
            role: 'ADMIN'
          },
          text: finalText
        });
      }
      setMessageInput('');
      soundManager.playSuccess();
    } catch (err: any) {
      setFeedback(err?.message || (isAr ? 'تعذر إرسال الرسالة' : 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  const handleStartEditMessage = (msg: DmMessage) => {
    soundManager.playClick();
    setEditingMsgId(msg.id);
    setEditingText(msg.text || '');
  };

  const handleCancelEditMessage = () => {
    setEditingMsgId(null);
    setEditingText('');
  };

  const handleSaveEditMessage = async (msgId: string) => {
    const trimmed = editingText.trim().slice(0, 1000);
    if (!trimmed || !activeConvoId || savingEdit) return;
    setSavingEdit(true);
    try {
      const isLatestMessage = messages.length > 0 && messages[messages.length - 1]?.id === msgId;
      await editDirectMessage({
        convoId: activeConvoId,
        msgId,
        newText: trimmed,
        isLatestMessage
      });
      setEditingMsgId(null);
      setEditingText('');
      soundManager.playSuccess();
    } catch (err: any) {
      setFeedback(err?.message || (isAr ? 'تعذر تعديل الرسالة' : 'Failed to edit message'));
    } finally {
      setSavingEdit(false);
    }
  };

  const faqs = isAr
    ? [
        {
          q: 'كيف يتم ترقية الحساب إلى باقة VIP؟',
          a: 'يمكنك الترقية فوراً عبر إدخال مفتاح التفعيل الخاص بك (Activation Key) أو التواصل مع فريق الدعم عبر صندوق بريد المنصة (@mbktrading) أو الواتساب أو التيليجرام.'
        },
        {
          q: 'كم يستغرق فريق الدعم الفني للرد على الاستفسارات؟',
          a: 'متوسط سرعة الرد هو أقل من 5 دقائق لأعضاء VIP و 15 دقيقة لباقي المتداولين على مدار 24 ساعة طوال أيام الأسبوع.'
        },
        {
          q: 'هل التوصيات مرسلة بشكل لحظي مع تنبيهات صوتية؟',
          a: 'نعم، يتم بث التوصيات مباشرة مع أهداف الربح ونقاط وقف الخسارة وإشعار صوتي فوري في قنوات التوصيات والروبوت.'
        }
      ]
    : [
        {
          q: 'How can I upgrade to VIP?',
          a: 'You can upgrade immediately by redeeming a single-use VIP Activation Key or messaging our concierge desk via the @mbktrading Inbox, WhatsApp, or Telegram.'
        },
        {
          q: 'How fast is the support team response?',
          a: 'Average response time is under 5 minutes for VIP members and 15 minutes for public traders, available 24/7.'
        },
        {
          q: 'Are signals sent in real time with audio alerts?',
          a: 'Yes, signals are broadcast instantly with Take-Profit, Stop-Loss, and distinct audio notifications.'
        }
      ];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none"
    >
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl relative text-[#d1d4dc] my-auto max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#2a2e39] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#089981]/15 border border-[#089981]/40 flex items-center justify-center text-[#089981] shadow-sm">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isAr ? 'مكتب الدعم والاقتراحات 24/7' : '24/7 Support & Suggestions Desk'}
                </h3>
                {isVIP && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    VIP PRIORITY
                  </span>
                )}
              </div>
              <p className="text-xs text-[#787b86]">
                {isAr
                  ? 'بريد المنصة المباشر (@mbktrading)، واتساب، تيليجرام، والأسئلة الشائعة'
                  : 'Official @mbktrading Platform Inbox, WhatsApp, Telegram & FAQs'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-xl border border-[#2a2e39] my-3 shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'channels'
                ? 'bg-white text-[#131722] shadow-sm font-bold'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#089981]" />
            <span>{isAr ? 'قنوات التواصل' : 'Channels'}</span>
          </button>

          {myUid && (
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('inbox');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'inbox'
                  ? 'bg-[#10b981] text-[#06080c] shadow-sm font-bold'
                  : 'text-[#787b86] hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isAr ? 'بريد @mbktrading' : '@mbktrading Inbox'}</span>
              {isAdminUser && totalAdminUnread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#e11d48] text-white text-[9px] font-mono font-bold">
                  {totalAdminUnread}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'faq'
                ? 'bg-white text-[#131722] shadow-sm font-bold'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'الأسئلة الشائعة' : 'FAQs'}</span>
          </button>
        </div>

        {/* Tab 1: Direct Channels (Platform Inbox @mbktrading + WhatsApp + Telegram + Email) */}
        {activeTab === 'channels' && (
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-0.5">
            {/* VIP Fast-track banner */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#089981]/15 to-[#089981]/5 border border-[#089981]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#089981]" />
                <div>
                  <div className="text-xs font-bold text-white">
                    {isAr ? 'استجابة سريعة ومضمونة' : 'Live Concierge Active'}
                  </div>
                  <div className="text-[11px] text-[#787b86]">
                    {isVIP
                      ? isAr
                        ? 'أولوية قصوى لمشتركي VIP خلال أقل من 3 دقائق'
                        : 'VIP Priority Queue (< 3 mins)'
                      : isAr
                      ? 'متوسط الرد خلال 10 دقائق على مدار الساعة'
                      : 'Average response < 10 mins 24/7'}
                  </div>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#089981] animate-ping" />
            </div>

            {/* NEW: Official Platform Inbox (@mbktrading) for Support, Suggestions & Questions */}
            {myUid && (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#10b981]/15 via-[#131722] to-[#131722] border border-[#10b981]/40 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 flex items-center justify-center font-bold shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>
                          {isAr
                            ? 'صندوق بريد المنصة المباشر (@mbktrading)'
                            : 'Platform Support Inbox (@mbktrading)'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40">
                          IN-APP
                        </span>
                      </div>
                      <div className="text-xs text-[#8b95a5]">
                        {isAr
                          ? 'الدعم الفني • الاقتراحات • الأسئلة'
                          : 'Support • Suggestions • Questions'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenInboxTopic('support')}
                    className="text-xs font-bold text-[#06080c] px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] transition-colors shrink-0 cursor-pointer"
                  >
                    {isAr ? 'فتح البريد' : 'Open Inbox'}
                  </button>
                </div>

                {/* Quick Topic Triggers: Support / Suggestions / Questions */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {PLATFORM_INBOX_TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => handleOpenInboxTopic(topic.id)}
                      className="py-1.5 px-2 rounded-lg bg-[#0b0e14]/90 hover:bg-[#10b981]/20 border border-[#2a2e39] hover:border-[#10b981]/50 text-[11px] font-bold text-[#edf0f5] hover:text-[#10b981] transition-all cursor-pointer text-center"
                    >
                      {isAr ? topic.labelAr : topic.labelEn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic WhatsApp Support */}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-[#131722] hover:bg-[#25D366]/15 border border-[#2a2e39] hover:border-[#25D366]/50 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center font-bold">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-[#25D366] transition-colors flex items-center gap-1.5">
                      <span>{isAr ? 'الدعم الفوري عبر واتساب (WhatsApp)' : 'Instant WhatsApp Concierge'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs text-[#787b86] font-mono" dir="ltr">
                      {platformSettings.whatsappNumber}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#25D366] px-2.5 py-1 rounded bg-[#25D366]/10 border border-[#25D366]/20 shrink-0">
                  {isAr ? 'تواصل الآن' : 'Connect'}
                </span>
              </a>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#131722] border border-[#2a2e39] opacity-75 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366]/70 flex items-center justify-center font-bold">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {isAr ? 'الدعم الفوري عبر واتساب (WhatsApp)' : 'WhatsApp Support'}
                    </div>
                    <div className="text-xs text-[#787b86]">
                      {isAr
                        ? 'جاري تحديث رقم الواتساب من الإدارة — استخدم بريد المنصة (@mbktrading) أعلاه'
                        : 'WhatsApp number pending Admin configuration — use @mbktrading Inbox above'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Telegram Official Channel & Support */}
            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-[#131722] hover:bg-[#229ED9]/15 border border-[#2a2e39] hover:border-[#229ED9]/50 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#229ED9]/20 text-[#229ED9] flex items-center justify-center font-bold">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-[#229ED9] transition-colors flex items-center gap-1.5">
                      <span>{isAr ? 'قناة وتيليجرام الدعم الرسمي (Telegram)' : 'Official Telegram Support'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs text-[#787b86]">
                      {telegramHandle ? `${telegramHandle} • ` : ''}
                      {isAr ? 'إشعارات فورية ودعم مباشر' : 'Instant updates and direct support'}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#229ED9] px-2.5 py-1 rounded bg-[#229ED9]/10 border border-[#229ED9]/20 shrink-0">
                  {isAr ? 'انضمام' : 'Join'}
                </span>
              </a>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#131722] border border-[#2a2e39] opacity-75 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#229ED9]/10 text-[#229ED9]/70 flex items-center justify-center font-bold">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {isAr ? 'قناة وتيليجرام الدعم الرسمي (Telegram)' : 'Official Telegram Support'}
                    </div>
                    <div className="text-xs text-[#787b86]">
                      {isAr ? 'جاري تحديث رابط التيليجرام من الإدارة' : 'Telegram link pending Admin configuration'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Email Support */}
            <div className="p-3 rounded-xl bg-[#131722] border border-[#2a2e39] flex items-center justify-between text-xs">
              <div>
                <span className="text-[#787b86]">{isAr ? 'البريد الإلكتروني المباشر:' : 'Email Desk:'} </span>
                <span className="text-white font-mono font-bold">{supportEmail}</span>
              </div>
              <span className="text-[#089981] font-mono text-[11px]">24/7 Available</span>
            </div>
          </div>
        )}

        {/* Tab 2: Live In-Modal @mbktrading Platform Inbox (Support, Suggestions & Questions) */}
        {activeTab === 'inbox' && myUid && (
          <div className="flex-1 min-h-[340px] flex flex-col bg-[#131722] rounded-xl border border-[#2a2e39] overflow-hidden">
            {/* Top Bar inside Inbox Tab */}
            <div className="px-3 py-2 bg-[#171b26] border-b border-[#2a2e39] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {isAdminUser && selectedAdminTicketUser && (
                  <button
                    type="button"
                    onClick={() => setSelectedAdminTicketUser(null)}
                    className="p-1 rounded-lg bg-[#131722] border border-[#2a2e39] text-[#d1d4dc] hover:text-white cursor-pointer"
                  >
                    {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  </button>
                )}
                <div className="w-7 h-7 rounded-lg bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981] shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span>
                      {isAdminUser
                        ? selectedAdminTicketUser
                          ? `${selectedAdminTicketUser.displayName} (@mbktrading)`
                          : isAr
                          ? 'تذاكر بريد المنصة الموحد (@mbktrading)'
                          : 'All @mbktrading Support & Suggestion Tickets'
                        : `@${OFFICIAL_PLATFORM_USERNAME}`}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-black bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40">
                      OFFICIAL
                    </span>
                  </div>
                  <div className="text-[10px] text-[#787b86] truncate">
                    {isAr
                      ? 'الدعم الفني • الاقتراحات • الأسئلة والاستفسارات'
                      : 'Support • Suggestions • Questions'}
                  </div>
                </div>
              </div>

              {onOpenFullInbox && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onOpenFullInbox(
                      selectedTopic,
                      isAdminUser && selectedAdminTicketUser
                        ? selectedAdminTicketUser.uid
                        : OFFICIAL_PLATFORM_UID,
                      isAdminUser && selectedAdminTicketUser
                        ? selectedAdminTicketUser.displayName
                        : OFFICIAL_PLATFORM_USERNAME
                    );
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#363a45] text-[10px] font-bold text-[#10b981] cursor-pointer shrink-0"
                >
                  {isAr ? 'فتح في صندوق الوارد الكامل ↗' : 'Open Full Inbox ↗'}
                </button>
              )}
            </div>

            {feedback && (
              <div className="px-3 py-1.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-300 text-[11px] font-bold">
                {feedback}
              </div>
            )}

            {/* Admin Ticket List (when no specific user ticket is selected yet) */}
            {isAdminUser && !selectedAdminTicketUser ? (
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#2a2e39]/60">
                {adminTickets.length === 0 ? (
                  <div className="p-8 text-center text-[#787b86] text-xs space-y-2">
                    <Mail className="w-8 h-8 mx-auto opacity-40 text-[#10b981]" />
                    <p className="font-bold text-white">
                      {isAr
                        ? 'لا توجد تذاكر دعم أو اقتراحات واردة حالياً'
                        : 'No incoming support or suggestion tickets yet'}
                    </p>
                  </div>
                ) : (
                  adminTickets.map((convo) => {
                    const traderUid = getOtherParticipantUid(convo.participants, OFFICIAL_PLATFORM_UID);
                    const traderName = convo.participantNames?.[traderUid] || 'Trader';
                    const traderRole = convo.participantRoles?.[traderUid] || 'FREE';
                    const unread = Number(convo.unreadBy?.[OFFICIAL_PLATFORM_UID] || 0);

                    return (
                      <button
                        key={convo.id}
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setSelectedAdminTicketUser({
                            uid: traderUid,
                            displayName: traderName,
                            role: traderRole
                          });
                        }}
                        className="w-full p-3 flex items-center justify-between gap-2 hover:bg-[#1e222d] text-start transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{traderName}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#2a2e39] text-[#9db2c6]">
                              {traderRole}
                            </span>
                            {unread > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#e11d48] text-white text-[9px] font-mono font-bold">
                                {unread}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8b95a5] truncate mt-0.5">
                            {convo.lastSenderUid === OFFICIAL_PLATFORM_UID ? '@mbktrading: ' : ''}
                            {convo.lastMessage}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-[#787b86] shrink-0">
                          {formatMessageTime(convo.lastMessageAtMs, isAr)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <>
                {/* Active Thread Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 min-h-[210px] max-h-[300px] overflow-y-auto p-3 space-y-2"
                >
                  {messages.length === 0 ? (
                    <div className="h-full py-8 flex flex-col items-center justify-center text-center text-[#787b86] text-xs space-y-1.5">
                      <Headphones className="w-7 h-7 text-[#10b981] opacity-60" />
                      <p className="font-bold text-white">@{OFFICIAL_PLATFORM_USERNAME}</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isFromPlatform = msg.senderUid === OFFICIAL_PLATFORM_UID;
                      const isMine = isAdminUser ? isFromPlatform : msg.senderUid === myUid;

                      return (
                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                              isMine
                                ? 'bg-gradient-to-br from-[#089981]/30 to-[#065f46]/30 border border-[#089981]/40 text-white rounded-ee-sm'
                                : isFromPlatform
                                ? 'bg-[#10b981]/15 border border-[#10b981]/40 text-white rounded-es-sm'
                                : 'bg-[#1e222d] border border-[#2a2e39] text-[#e1e4ea] rounded-es-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span
                                className={`text-[10px] font-mono font-bold ${
                                  isFromPlatform ? 'text-[#10b981]' : 'text-[#8492a6]'
                                }`}
                              >
                                {isFromPlatform ? `@${OFFICIAL_PLATFORM_USERNAME}` : msg.senderName}
                              </span>
                              {isMine && editingMsgId !== msg.id && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditMessage(msg)}
                                  className="px-1.5 py-0.5 rounded bg-black/25 hover:bg-amber-500/20 text-[10px] text-[#9db2c6] hover:text-amber-300 border border-white/10 hover:border-amber-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                                  title={isAr ? 'تعديل الرسالة' : 'Edit message'}
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                  <span>{isAr ? 'تعديل' : 'Edit'}</span>
                                </button>
                              )}
                            </div>

                            {editingMsgId === msg.id ? (
                              <div className="space-y-1.5 mt-1 min-w-[200px]">
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value.slice(0, 1000))}
                                  rows={2}
                                  className="w-full rounded-xl bg-[#0b0e14] border border-amber-500/40 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleCancelEditMessage}
                                    className="px-2 py-1 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[10px] font-bold text-[#9db2c6] flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>{isAr ? 'إلغاء' : 'Cancel'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingEdit || !editingText.trim()}
                                    onClick={() => handleSaveEditMessage(msg.id)}
                                    className="px-2.5 py-1 rounded-lg bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-[10px] font-bold text-[#06080c] flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>{isAr ? 'حفظ' : 'Save'}</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="break-words whitespace-pre-wrap">
                                {msg.text}
                                {msg.editedAt && (
                                  <span className="ms-1.5 text-[9px] font-mono text-[#8b95a5] italic">
                                    {isAr ? '(تم التعديل)' : '(edited)'}
                                  </span>
                                )}
                              </p>
                            )}

                            <div className="mt-1 flex items-center justify-end gap-1 text-[9px] font-mono text-[#787b86]">
                              <span>{formatMessageTime(msg.timestampMs, isAr)}</span>
                              {isMine && <CheckCheck className="w-3 h-3 text-[#089981]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Topic Selector for Non-Admin Users */}
                {!isAdminUser && (
                  <div className="px-3 py-1.5 bg-[#171b26] border-t border-[#2a2e39] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                    <span className="text-[10px] text-[#787b86] font-bold shrink-0">
                      {isAr ? 'التصنيف:' : 'Category:'}
                    </span>
                    {PLATFORM_INBOX_TOPICS.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setSelectedTopic(topic.id);
                        }}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                          selectedTopic === topic.id
                            ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50'
                            : 'bg-[#131722] text-[#787b86] border-[#2a2e39] hover:text-white'
                        }`}
                      >
                        {isAr ? topic.labelAr : topic.labelEn}
                      </button>
                    ))}
                  </div>
                )}

                {/* Message Composer */}
                <form
                  onSubmit={handleSendPlatformMessage}
                  className="p-2.5 bg-[#1e222d] border-t border-[#2a2e39] flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    maxLength={950}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value.slice(0, 950))}
                    placeholder={
                      isAdminUser
                        ? isAr
                          ? `الرد باسم @mbktrading على ${selectedAdminTicketUser?.displayName || ''}...`
                          : `Reply as @mbktrading to ${selectedAdminTicketUser?.displayName || ''}...`
                        : isAr
                        ? 'اكتب رسالتك للدعم أو اقتراحك أو سؤالك هنا...'
                        : 'Write your support message, suggestion, or question...'
                    }
                    className="flex-1 bg-[#131722] border border-[#2a2e39] focus:border-[#10b981] rounded-xl px-3 py-2 text-xs text-white placeholder-[#787b86] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || sending}
                    className="px-3.5 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-[#06080c] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isAdminUser
                        ? isAr
                          ? 'رد كـ mbktrading'
                          : 'Reply as mbktrading'
                        : isAr
                        ? 'إرسال'
                        : 'Send'}
                    </span>
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* Tab 3: FAQs */}
        {activeTab === 'faq' && (
          <div className="space-y-2.5 overflow-y-auto flex-1 min-h-0 pr-0.5">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#131722] border border-[#2a2e39] space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-[#089981]">Q:</span>
                  <span>{faq.q}</span>
                </div>
                <div className="text-[11px] text-[#787b86] leading-relaxed">{faq.a}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
