import React, { useState, useEffect } from 'react';
import {
  Headphones,
  X,
  Send,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
  Crown
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  isVIP?: boolean;
  userName?: string;
}

export const SupportDeskModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lang = 'ar',
  isVIP = false,
  userName = ''
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'faq'>('channels');
  const [platformSettings, setPlatformSettings] = useState<PlatformContactSettings>(DEFAULT_PLATFORM_SETTINGS);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToPlatformSettings((nextSettings) => {
      setPlatformSettings(nextSettings);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const whatsappMessage = isAr
    ? `مرحباً فريق MBK DESK${userName ? ` (${userName})` : ''}، أرغب في الاستفسار عن الاشتراك والدعم.`
    : `Hello MBK DESK team${userName ? ` (${userName})` : ''}, I would like to inquire about subscriptions and support.`;
  const whatsappUrl = buildWhatsAppUrl(platformSettings.whatsappNumber, whatsappMessage);
  const telegramUrl = normalizeTelegramUrl(platformSettings.telegramUrl);
  const telegramHandle = formatTelegramHandle(platformSettings.telegramUrl);
  const supportEmail = platformSettings.supportEmail || DEFAULT_PLATFORM_SETTINGS.supportEmail;

  const faqs = isAr
    ? [
        {
          q: 'كيف يتم ترقية الحساب إلى باقة VIP؟',
          a: 'يمكنك الترقية فوراً عبر إدخال مفتاح التفعيل الخاص بك (Activation Key) أو التواصل مع فريق الدعم عبر الواتساب أو التيليجرام لتفعيل اشتراكك.'
        },
        {
          q: 'كم يستغرق فريق الدعم الفني للرد على الاستفسارات؟',
          a: 'متوسط سرعة الرد هو أقل من 5 دقائق لأعضاء VIP و 15 دقيقة لباقي المتداولين على مدار 24 ساعة طوال أيام الأسبوع.'
        },
        {
          q: 'هل التوصيات مرسلة بشكل لحظي مع تنبيهات صوتية؟',
          a: 'نعم، يتم بث التوصيات مباشرة مع أهداف الربح ونقاط وقف الخسارة وإشعار صوتي فوري في قنوات التوصيات والروبوت.'
        },
        {
          q: 'كيف يمكنني مشاركة الشارتات في الشات؟',
          a: 'مشاركة الصور مخصصة للمشرفين والمحللين المعتمدين لضمان جودة التحليلات، ويمكن طلب تفعيل دور المحلل عبر التواصل مع الدعم.'
        }
      ]
    : [
        {
          q: 'How can I upgrade to VIP?',
          a: 'You can upgrade immediately by redeeming a single-use VIP Activation Key or contacting our concierge support desk via WhatsApp or Telegram.'
        },
        {
          q: 'How fast is the support team response?',
          a: 'Average response time is under 5 minutes for VIP members and 15 minutes for public traders, available 24/7.'
        },
        {
          q: 'Are signals sent in real time with audio alerts?',
          a: 'Yes, signals are broadcast instantly with Take-Profit, Stop-Loss, and distinct audio notifications.'
        },
        {
          q: 'Can I share chart pictures in the chat?',
          a: 'Image uploads are reserved for certified analysts and admins to maintain channel quality. Contact support to request analyst role.'
        }
      ];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none"
    >
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative text-[#d1d4dc] my-auto max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#2a2e39] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#089981]/15 border border-[#089981]/40 flex items-center justify-center text-[#089981] shadow-sm">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isAr ? 'مكتب الدعم والمساعدة 24/7' : '24/7 Concierge Support'}
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
                  ? 'فريق متخصص لمساعدتك في التوصيات، الاشتراكات، والاستفسارات الفنية'
                  : 'Direct assistance for signals, subscriptions & account support'}
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
            <span>{isAr ? 'قنوات التواصل المباشرة' : 'Direct Channels'}</span>
          </button>

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

        {/* Tab 1: Direct Channels */}
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
                      ? (isAr ? 'أولوية قصوى لمشتركي VIP خلال أقل من 3 دقائق' : 'VIP Priority Queue (< 3 mins)')
                      : (isAr ? 'متوسط الرد خلال 10 دقائق على مدار الساعة' : 'Average response < 10 mins 24/7')}
                  </div>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#089981] animate-ping" />
            </div>

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
                      {isAr ? 'جاري تحديث رقم الواتساب من الإدارة — استخدم البريد الإلكتروني أدناه' : 'WhatsApp number pending Admin configuration — use email below'}
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

        {/* Tab 2: FAQs */}
        {activeTab === 'faq' && (
          <div className="space-y-2.5 overflow-y-auto flex-1 min-h-0 pr-0.5">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#131722] border border-[#2a2e39] space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-[#089981]">Q:</span>
                  <span>{faq.q}</span>
                </div>
                <div className="text-[11px] text-[#787b86] leading-relaxed">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
