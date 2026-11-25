import React, { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Lock,
  Unlock,
  Share2,
  Check,
  Plus,
  Edit3,
  Trash2,
  X,
  Film,
  BookOpen,
  Lightbulb,
  Crown,
  Atom,
  Clock,
  Sparkles,
  ShieldCheck,
  HardDrive,
  ExternalLink,
  Copy,
  CheckCircle2,
  RefreshCw,
  Video,
  Headphones,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import { UserProfile } from '../../types/trading';
import {
  AcademySectionId,
  AcademyVideoItem,
  deleteAcademyVideo,
  fetchAcademyVideos,
  parseAcademyVideoUrl,
  saveAcademyVideo
} from '../../services/academyService';

export interface TradingAcademyPanelProps {
  lang?: 'ar' | 'en';
  userProfile?: UserProfile | null;
  isAdmin?: boolean;
  onOpenPlans?: () => void;
  onContactSupport?: () => void;
}

interface CourseSubjectCard {
  id: string;
  moduleCode: string;
  titleAr: string;
  titleEn: string;
  durationAr: string;
  durationEn: string;
  summaryAr: string;
  summaryEn: string;
  visualType: 'structure' | 'liquidity' | 'fvg' | 'macro' | 'sessions' | 'risk' | 'scalp' | 'prop' | 'quant' | 'orderflow' | 'algo' | 'portfolio';
  accentColor: string;
  chartLabel: string;
}

interface AcademyTrackConfig {
  id: AcademySectionId;
  titleAr: string;
  titleEn: string;
  shortAr: string;
  shortEn: string;
  badgeAr: string;
  badgeEn: string;
  isFreeDefault: boolean;
  priceTagAr: string;
  priceTagEn: string;
  descriptionAr: string;
  descriptionEn: string;
  extendedOverviewAr: string;
  extendedOverviewEn: string;
  curriculumPointsAr: string[];
  curriculumPointsEn: string[];
  subjects: CourseSubjectCard[];
  icon: React.ComponentType<{ className?: string }>;
}

const ACADEMY_TRACKS: AcademyTrackConfig[] = [
  {
    id: 'shorts',
    titleAr: 'شورتات وريلز التداول التعليمية (Shorts & Reels)',
    titleEn: 'Short Learning Videos & Reels (Free Main Feed)',
    shortAr: 'شورتات تعليمية (مجاني)',
    shortEn: 'Learning Shorts (Free)',
    badgeAr: 'مفتوح مجاناً • الصفحة الرئيسية',
    badgeEn: 'FREE OPEN • MAIN PAGE',
    isFreeDefault: true,
    priceTagAr: 'مجاني ($0)',
    priceTagEn: 'Free ($0)',
    descriptionAr:
      'الصفحة الرئيسية المفتوحة لأكاديمية MBK: مقاطع تعليمية قصيرة ومباشرة (YouTube Shorts & Reels) تعمل داخل مشغل الموقع لتوضيح أهم فرص السيولة، قراءة الشموع المؤسسية، وإدارة المخاطر اليومية بسرعة ووضوح.',
    descriptionEn:
      'The open main feed of MBK Academy: vertical YouTube Shorts & Reels embedded natively inside the website covering liquidity sweeps, institutional price action, and risk discipline.',
    extendedOverviewAr:
      'صُمم هذا القسم ليكون مرجعاً يومياً سريعاً ومفتوحاً لجميع المتداولين بدون قيود، مع إمكانية مشاركة رابط أي فيديو مباشرة من موقعك إلى منصات التواصل الاجتماعي.',
    extendedOverviewEn:
      'Engineered as an always-open daily micro-learning hub for every trader, with 1-click website link sharing to WhatsApp, Telegram, X, and social platforms.',
    curriculumPointsAr: [
      'تضمين مباشر لمقاطع YouTube Shorts و Reels داخل الموقع بجودة عالية.',
      'مشاركة رابط الفيديو من موقعك مباشرة إلى واتساب وتيليجرام وإكس بضغطة زر.',
      'مواضيع مركّزة في 60 ثانية: قنص السيولة، فجوات السعر FVG، وحماية رأس المال.'
    ],
    curriculumPointsEn: [
      'Direct in-app playback of YouTube Shorts & Reels without leaving the terminal.',
      'One-click sharing of your website link to WhatsApp, Telegram, and X.',
      'Focused 60-second breakdowns on Gold, Nasdaq, and risk management.'
    ],
    subjects: [
      {
        id: 'short-sub-1',
        moduleCode: 'SHORT 01',
        titleAr: 'قنص السيولة اليومية على الذهب (XAUUSD Sweep)',
        titleEn: 'Daily Gold Liquidity Sweeps (XAUUSD)',
        durationAr: '60 ثانية • تطبيق سريع',
        durationEn: '60 Sec • Micro-Lesson',
        summaryAr: 'كيف تكتشف مصيدة ضرب ستوبات المتداولين قبل الانعكاس الحقيقي على الذهب.',
        summaryEn: 'Spotting retail stop-runs before true institutional reversal on Gold.',
        visualType: 'liquidity',
        accentColor: '#10b981',
        chartLabel: 'XAUUSD • SWEEP'
      },
      {
        id: 'short-sub-2',
        moduleCode: 'SHORT 02',
        titleAr: 'فجوات القيمة العادلة (FVG) على الناسداك US100',
        titleEn: 'Nasdaq US100 Fair Value Gap (FVG) Entries',
        durationAr: '45 ثانية • نموذج دخول',
        durationEn: '45 Sec • Entry Model',
        summaryAr: 'تحديد الفجوة السعرية المؤسسية عالية الاحتمالية بعد شمعة الدفع القوية.',
        summaryEn: 'Identifying high-probability institutional imbalance zones after displacement.',
        visualType: 'fvg',
        accentColor: '#38bdf8',
        chartLabel: 'US100 • FVG'
      },
      {
        id: 'short-sub-3',
        moduleCode: 'SHORT 03',
        titleAr: 'معادلة الـ 1% لحساب اللوت قبل فتح الصفقة',
        titleEn: 'The 1% Dynamic Lot-Sizing Formula',
        durationAr: '50 ثانية • إدارة مخاطر',
        durationEn: '50 Sec • Risk Control',
        summaryAr: 'طريقة ضبط حجم العقد بناءً على نقاط وقف الخسارة لحماية الحساب من التراجع.',
        summaryEn: 'Calculating exact lot size from stop-loss distance to prevent account drawdown.',
        visualType: 'risk',
        accentColor: '#f59e0b',
        chartLabel: 'RISK • 1% RULE'
      }
    ],
    icon: Film
  },
  {
    id: 'full_courses',
    titleAr: 'الدورات التدريبية الكاملة (Full Institutional Courses)',
    titleEn: 'Full Institutional Trading Courses',
    shortAr: 'الدورات الكاملة',
    shortEn: 'Full Courses',
    badgeAr: 'مغلق • تواصل مع الدعم للتسجيل أو Elite',
    badgeEn: 'LOCKED • CONTACT SUPPORT TO ENROLL',
    isFreeDefault: false,
    priceTagAr: 'التسجيل عبر الدعم / باقة Elite',
    priceTagEn: 'Enroll via Support / Elite Plan',
    descriptionAr:
      'المنهج الأكاديمي الشامل لإتقان التداول المؤسسي (Smart Money Concepts & Institutional Price Action) من الأساسيات وحتى بناء نظام تداول احترافي متكامل على الذهب (XAUUSD)، المؤشرات الأمريكية (US100)، والعملات الرئيسية.',
    descriptionEn:
      'The complete A-to-Z institutional curriculum mastering Smart Money Concepts (SMC), multi-timeframe market structure, liquidity engineering, and full execution playbooks across Gold, Nasdaq, and FX.',
    extendedOverviewAr:
      'تغطي هذه الدورة الكاملة كيفية قراءة الشارت بعقلية صناع السوق والبنوك المركزية: أين تتجمع أوامر وقف الخسارة؟ كيف تميز بين الكسر الحقيقي للهيكل (BOS) وتغيير الاتجاه المؤسسي (CHoCH)؟ وكيف تربط فريم 4 ساعات مع فريم 15 دقيقة و5 دقائق للدخول بدقة قنص عالية ونسبة عائد إلى مخاطرة لا تقل عن 1:3.',
    extendedOverviewEn:
      'This comprehensive curriculum trains you to read price delivery through an institutional lens: mapping external/internal liquidity pools, confirming true Break of Structure (BOS) vs. Change of Character (CHoCH), and aligning 4H bias with 15M/5M execution for 1:3+ Risk-to-Reward setups.',
    curriculumPointsAr: [
      'هيكلة السوق المتقدمة (Advanced Market Structure): تحديد القمم والقيعان المحمية، كسر الهيكل BOS، وأول إشارة انعكاس CHoCH.',
      'خرائط السيولة ومناطق التمركز (Liquidity & Order Blocks): سيولة الجلسات الآسيوية ولندن، مناطق الطلب والعرض المؤسسية، وفجوات FVG.',
      'بناء خطة التداول وإدارة رأس المال: قائمة التحقق قبل الدخول (Pre-Trade Checklist)، وتوزيع الأهداف TP1 / TP2 / TP3.'
    ],
    curriculumPointsEn: [
      'Advanced Market Structure: protected swing highs/lows, true BOS continuation, and early CHoCH reversals.',
      'Liquidity & Order Block Mapping: Asian/London range sweeps, institutional mitigation blocks, and FVG refinement.',
      'Execution Playbook & Risk Architecture: pre-trade validation checklist and partial take-profit scaling.'
    ],
    subjects: [
      {
        id: 'fc-sub-1',
        moduleCode: 'MODULE 01',
        titleAr: 'هيكلة السوق المؤسسية وكسر الهيكل (BOS & CHoCH)',
        titleEn: 'Institutional Market Structure (BOS & CHoCH)',
        durationAr: '4 محاضرات • تأسيس متقدم',
        durationEn: '4 Lectures • Core Structure',
        summaryAr:
          'قراءة الاتجاه الحقيقي على فريم اليومي و4 ساعات، والتمييز بين التصحيح السعري والانعكاس الكامل للاتجاه.',
        summaryEn:
          'Mapping true Daily/4H trend delivery and distinguishing internal pullbacks from full structural reversals.',
        visualType: 'structure',
        accentColor: '#10b981',
        chartLabel: '4H / 15M • BOS & CHoCH'
      },
      {
        id: 'fc-sub-2',
        moduleCode: 'MODULE 02',
        titleAr: 'هندسة السيولة ومصائد صناع السوق (Liquidity Sweeps)',
        titleEn: 'Liquidity Engineering & Inducement Traps',
        durationAr: '3 محاضرات • سيولة البنوك',
        durationEn: '3 Lectures • Liquidity Pools',
        summaryAr:
          'تحديد مناطق تجمع السيولة (Buy-Side & Sell-Side Liquidity) والقمم/القيعان المتساوية (EQH/EQL) قبل الدخول.',
        summaryEn:
          'Locating Buy-Side/Sell-Side liquidity pools, Equal Highs/Lows (EQH/EQL), and institutional inducement.',
        visualType: 'liquidity',
        accentColor: '#f59e0b',
        chartLabel: 'BSL / SSL • LIQUIDITY'
      },
      {
        id: 'fc-sub-3',
        moduleCode: 'MODULE 03',
        titleAr: 'البلوكات المؤسسية وفجوات القيمة العادلة (OB & FVG)',
        titleEn: 'Order Blocks, Breaker Blocks & Fair Value Gaps',
        durationAr: '4 محاضرات • نماذج الدخول',
        durationEn: '4 Lectures • Precision Entry',
        summaryAr:
          'دمج البلوك المؤسسي (Order Block) مع فجوة السعر (FVG) ومستويات الخصم والتشبع (Premium & Discount).',
        summaryEn:
          'Combining institutional Order Blocks with Fair Value Gaps inside Premium & Discount Fibonacci arrays.',
        visualType: 'fvg',
        accentColor: '#38bdf8',
        chartLabel: 'OB + FVG • CONFLUENCE'
      },
      {
        id: 'fc-sub-4',
        moduleCode: 'MODULE 04',
        titleAr: 'مزامنة الفريمات وخطة التنفيذ اليومية الكاملة',
        titleEn: 'Multi-Timeframe Alignment & Daily Execution Plan',
        durationAr: '3 محاضرات • خطة العمل',
        durationEn: '3 Lectures • Trading Plan',
        summaryAr:
          'الانتقال المنظم من تحليل فريم 4H إلى تأكيد الدخول على فريم 5M مع إدارة الصفقة وحجز الأرباح.',
        summaryEn:
          'Step-by-step top-down workflow from 4H bias to 5M trigger execution and active stop-loss trailing.',
        visualType: 'risk',
        accentColor: '#a855f7',
        chartLabel: 'HTF → LTF • EXECUTION'
      }
    ],
    icon: BookOpen
  },
  {
    id: 'ideas_subjects',
    titleAr: 'أفكار ومواضيع التداول المتخصصة (Ideas & Subjects)',
    titleEn: 'Specialized Trading Ideas & Core Subjects',
    shortAr: 'أفكار ومواضيع',
    shortEn: 'Ideas & Subjects',
    badgeAr: 'مغلق • تواصل مع الدعم للتسجيل أو Elite',
    badgeEn: 'LOCKED • CONTACT SUPPORT TO ENROLL',
    isFreeDefault: false,
    priceTagAr: 'التسجيل عبر الدعم / باقة Elite',
    priceTagEn: 'Enroll via Support / Elite Plan',
    descriptionAr:
      'موسوعة المواضيع التطبيقية والأفكار الاحترافية التي تربط التحليل الفني بالتحليل الأساسي (Macroeconomics)، توقيت السيولة بين الجلسات العالمية، والانضباط النفسي للمتداول أثناء تقلبات السوق.',
    descriptionEn:
      'An applied library of specialized trading subjects connecting technical setups with Macroeconomic catalysts, session timing mechanics, intermarket correlations, and trader psychology.',
    extendedOverviewAr:
      'لا يكفي حفظ النماذج الفنية وحدها؛ هذا القسم يشرح لك "لماذا ومتى" يتحرك الذهب والناسداك بقوة. ستتعلم كيف تقرأ بيانات التضخم الأمريكية (CPI)، تقارير الوظائف (NFP)، وقرارات الفيدرالي (FOMC)، وكيف تستخدم علاقة مؤشر الدولار (DXY) وعوائد السندات الأمريكية (US10Y) كفلتر لتأكيد صفقاتك.',
    extendedOverviewEn:
      'Chart patterns alone are not enough—this track teaches you WHY and WHEN Gold and Nasdaq expand. Master CPI, NFP, and FOMC news playbooks, DXY & US10Y Treasury Yield correlations, and session killzones.',
    curriculumPointsAr: [
      'تداول الأخبار والماكرو: قراءة الفارق بين الأرقام المتوقعة والفعلية لبيانات التضخم والفائدة وتأثيرها الفوري على الذهب.',
      'خريطة الجلسات العالمية (Killzones): تلاعب افتتاح لندن (Judas Swing) والانفجار السعري في تداخل نيويورك.',
      'الارتباطات بين الأسواق (Intermarket Analysis) وسيكولوجية التعافي من الخسائر المتتالية.'
    ],
    curriculumPointsEn: [
      'Macro News Playbooks: trading CPI, NFP & FOMC deviations safely without getting slipped by initial whipsaws.',
      'Session Killzones: London Open Judas Swing manipulation vs. New York Overlap liquidity expansion.',
      'Intermarket Correlations (DXY, US10Y, XAUUSD, US100) and institutional mindset discipline.'
    ],
    subjects: [
      {
        id: 'is-sub-1',
        moduleCode: 'SUBJECT 01',
        titleAr: 'دليل تداول أخبار الفيدرالي والتضخم (CPI, NFP & FOMC)',
        titleEn: 'Macro Catalyst Playbook: CPI, NFP & FOMC Releases',
        durationAr: 'موضوع تطبيقي • ماكرو',
        durationEn: 'Deep Dive • Macro News',
        summaryAr:
          'كيفية التعامل مع الشمعة الأولى للخبر وانتظار سحب السيولة المزدوج قبل الدخول مع الاتجاه الحقيقي.',
        summaryEn:
          'Navigating the initial news spike and waiting for post-release liquidity sweeps before entering.',
        visualType: 'macro',
        accentColor: '#f59e0b',
        chartLabel: 'MACRO • CPI / FOMC'
      },
      {
        id: 'is-sub-2',
        moduleCode: 'SUBJECT 02',
        titleAr: 'أسرار الجلسات: افتتاح لندن وتداخل نيويورك (Killzones)',
        titleEn: 'Session Killzones: London Open & NY Overlap',
        durationAr: 'موضوع تطبيقي • التوقيت',
        durationEn: 'Deep Dive • Session Timing',
        summaryAr:
          'فهم دورة اليوم السعرية (AMD: التجميع الآسيوي، التلاعب في لندن، والتوزيع في نيويورك).',
        summaryEn:
          'Mastering the daily AMD cycle: Asian Accumulation, London Manipulation, and NY Distribution.',
        visualType: 'sessions',
        accentColor: '#38bdf8',
        chartLabel: 'AMD • KILLZONES'
      },
      {
        id: 'is-sub-3',
        moduleCode: 'SUBJECT 03',
        titleAr: 'علاقة الدولار (DXY) وعوائد السندات مع الذهب والناسداك',
        titleEn: 'Intermarket Correlation: DXY, US10Y Yields & Gold',
        durationAr: 'موضوع تطبيقي • ارتباط الأسواق',
        durationEn: 'Deep Dive • Correlations',
        summaryAr:
          'استخدام دايفرجنس السيولة (SMT Divergence) بين الذهب ومؤشر الدولار لكشف الانعكاسات المبكرة.',
        summaryEn:
          'Using Smart Money Technique (SMT) divergence between DXY, US10Y, and XAUUSD to confirm reversals.',
        visualType: 'structure',
        accentColor: '#10b981',
        chartLabel: 'SMT • DXY vs XAUUSD'
      },
      {
        id: 'is-sub-4',
        moduleCode: 'SUBJECT 04',
        titleAr: 'سيكولوجية المتداول المحترف وإدارة الانفعالات',
        titleEn: 'Institutional Execution Psychology & Discipline',
        durationAr: 'موضوع تطبيقي • سيكولوجية',
        durationEn: 'Deep Dive • Mindset',
        summaryAr:
          'القواعد الصارمة للتخلص من التداول الانتقامي (Revenge Trading) والخوف من فوات الفرصة (FOMO).',
        summaryEn:
          'Practical rules to eliminate Revenge Trading, FOMO, and premature trade exits.',
        visualType: 'risk',
        accentColor: '#ec4899',
        chartLabel: 'MINDSET • DISCIPLINE'
      }
    ],
    icon: Lightbulb
  },
  {
    id: 'paid_courses',
    titleAr: 'الدورات الاحترافية المدفوعة (Paid Masterclass Courses)',
    titleEn: 'Premium Paid Masterclasses & Prop Firm Bootcamps',
    shortAr: 'الدورات المدفوعة',
    shortEn: 'Paid Courses',
    badgeAr: 'مغلق • تواصل مع الدعم للتسجيل أو Elite',
    badgeEn: 'LOCKED • CONTACT SUPPORT TO ENROLL',
    isFreeDefault: false,
    priceTagAr: '$249 أو مجاناً مع باقة Elite',
    priceTagEn: '$249 or Included in Elite',
    descriptionAr:
      'معسكرات تدريبية مدفوعة وعالية التخصص للمتداولين الذين يستهدفون اجتياز اختبارات شركات التمويل (Prop Firms) وإتقان استراتيجيات السكالبينج السريع على الذهب والناسداك خلال ذروة السيولة.',
    descriptionEn:
      'Specialized paid bootcamps engineered for traders passing Prop Firm funded evaluations and executing high-precision 1M/5M scalping systems on Gold and Nasdaq.',
    extendedOverviewAr:
      'تركز هذه الدورات المدفوعة على الجانب التطبيقي المكثف: كيف تدير حساب تمويل بقيمة $50,000 إلى $200,000 دون كسر قاعدة التراجع اليومي (Daily Drawdown)؟ وكيف تنفذ صفقات سكالبينج سريعة بنقاط وقف خسارة صغيرة جداً (Tight SL) وعائد مضاعف مع خطة سحب أرباح شهرية مستدامة.',
    extendedOverviewEn:
      'Built for serious execution: learn the exact mathematical risk protocol to pass Phase 1 & Phase 2 Prop Firm challenges without breaching daily drawdown limits, combined with our signature 1M/5M liquidity scalping model.',
    curriculumPointsAr: [
      'نظام السكالبينج المؤسسي السريع (1M / 5M Precision Scalping) على الذهب XAUUSD والناسداك US100.',
      'خطة اجتياز حسابات التمويل (Prop Firm Passing Blueprint) وحماية الحساب الممول حتى أول سحب أرباح.',
      'إدارة الصفقة المتقدمة: متى تنقل الوقف لنقطة الدخول (Break-Even) ومتى تضيف عقوداً رابحة (Pyramiding).'
    ],
    curriculumPointsEn: [
      '1M / 5M Precision Scalping system for Gold (XAUUSD) and Nasdaq (US100) during NY open.',
      'Prop Firm Evaluation Blueprint: dynamic risk throttling to pass challenges and secure payouts.',
      'Active Trade Management: break-even timing, partial scaling, and winner pyramiding.'
    ],
    subjects: [
      {
        id: 'pc-sub-1',
        moduleCode: 'PRO TRACK 01',
        titleAr: 'معسكر السكالبينج الدقيق على الذهب والناسداك (1M & 5M)',
        titleEn: '1M & 5M Gold & Nasdaq Precision Scalping Bootcamp',
        durationAr: '6 محاضرات • سكالبينج احترافي',
        durationEn: '6 Lectures • Pro Scalping',
        summaryAr:
          'نموذج الدخول السريع: سحب سيولة فريم 15 دقيقة + كسر هيكل على فريم 1 دقيقة + دخول من الفجوة FVG.',
        summaryEn:
          'Fast execution model: 15M liquidity sweep + 1M micro-CHoCH displacement + FVG limit entry.',
        visualType: 'scalp',
        accentColor: '#10b981',
        chartLabel: '1M / 5M • SCALP MODEL'
      },
      {
        id: 'pc-sub-2',
        moduleCode: 'PRO TRACK 02',
        titleAr: 'خطة اجتياز اختبارات شركات التمويل (Prop Firm Mastery)',
        titleEn: 'Prop Firm Challenge Passing & Funded Account Management',
        durationAr: '5 محاضرات • حسابات ممولة',
        durationEn: '5 Lectures • Funded Accounts',
        summaryAr:
          'الجدول الرياضي لتدرج المخاطرة (0.25% إلى 1%) لاجتياز المرحلة الأولى والثانية بأمان تام.',
        summaryEn:
          'Mathematical risk-scaling matrix (0.25% to 1%) to pass Phase 1 & Phase 2 evaluations safely.',
        visualType: 'prop',
        accentColor: '#f59e0b',
        chartLabel: 'PROP FIRM • $100K PLAN'
      },
      {
        id: 'pc-sub-3',
        moduleCode: 'PRO TRACK 03',
        titleAr: 'احتراف إدارة الصفقة النشطة وتقسيم العقود (Trade Scaling)',
        titleEn: 'Active Trade Management, Partials & Break-Even Protocol',
        durationAr: '4 محاضرات • إدارة العقود',
        durationEn: '4 Lectures • Trade Management',
        summaryAr:
          'قواعد جني 50% عند الهدف الأول TP1، تأمين الصفقة، وترك العقود المتبقية لالتقاط الموجات الممتدة.',
        summaryEn:
          'Rules for banking 50% at TP1, moving SL to entry after structure shift, and riding runners to TP3.',
        visualType: 'liquidity',
        accentColor: '#38bdf8',
        chartLabel: 'TP1 / TP2 / TP3 • SCALING'
      },
      {
        id: 'pc-sub-4',
        moduleCode: 'PRO TRACK 04',
        titleAr: 'تحليل جلسات التداول المسجلة وتقييم الأداء الأسبوعي',
        titleEn: 'Recorded Live Session Breakdowns & Weekly Journaling',
        durationAr: '3 محاضرات • تطبيق عملي',
        durationEn: '3 Lectures • Live Tape Reading',
        summaryAr:
          'قراءة الشارت لحظة بلحظة أثناء افتتاح نيويورك وبناء سجل تداول احترافي لتطوير نسبة النجاح.',
        summaryEn:
          'Bar-by-bar New York Open tape reading and institutional trade journaling to optimize win rate.',
        visualType: 'sessions',
        accentColor: '#a855f7',
        chartLabel: 'TAPE READING • NY OPEN'
      }
    ],
    icon: Crown
  },
  {
    id: 'quantum_trading',
    titleAr: 'التداول الكمي الاحترافي الكامل (Full Professional Quantum Trading)',
    titleEn: 'Full Professional Quantum & Algorithmic Trading',
    shortAr: 'التداول الكمي Quantum',
    shortEn: 'Quantum Trading Pro',
    badgeAr: 'حصري • تواصل مع الدعم للتسجيل أو باقة Elite',
    badgeEn: 'EXCLUSIVE • CONTACT SUPPORT OR ELITE',
    isFreeDefault: false,
    priceTagAr: '$499 أو مشمول في باقة Elite',
    priceTagEn: '$499 or Included in Elite',
    descriptionAr:
      'البرنامج الأكاديمي الأرقى في منصة MBK Trading: يجمع بين الهندسة المالية الكمية (Quantitative Finance)، نماذج الانحراف المعياري والتقلبات السعرية (ATR & Volatility Regimes)، ميكانيكا تدفق الأوامر (Orderflow)، وبناء أنظمة التداول الآلي والخوارزمي.',
    descriptionEn:
      'The flagship institutional program at MBK Academy: bridging Quantitative Finance, statistical volatility regimes, institutional orderflow mechanics, and algorithmic trading system architecture.',
    extendedOverviewAr:
      'ينقلك هذا البرنامج من التداول التقديري العادي إلى التداول المبني على البيانات والاحتمالات الرياضية (Data-Driven & Quantitative Execution). ستتعلم كيفية قياس نطاقات التقلب اليومي والأسبوعي باستخدام الانحراف المعياري (Standard Deviation & Z-Score)، فهم معادلات التوقع الرياضي الإيجابي (Positive Expectancy)، وكيفية تصميم وربط استراتيجيات وبوتات TradingView مع أنظمة التنفيذ وإدارة المحافظ.',
    extendedOverviewEn:
      'Transition from discretionary guessing to data-driven quantitative execution. Master statistical Z-Score & standard deviation bands, ATR volatility filtering, orderflow liquidity absorption, and automated webhook/bot engineering.',
    curriculumPointsAr: [
      'النماذج الكمية والاحتمالات: الانحراف المعياري للسعر (Standard Deviation Bands)، معامل ATR، وتحديد الأنظمة السعرية (Trending vs. Mean-Reverting).',
      'تدفق الأوامر الكمي (Quantitative Orderflow): قياس امتصاص السيولة، عدم توازن الحجم، وتمركز العقود المؤسسية.',
      'هندسة التداول الخوارزمي والمحافظ: بناء قواعد دخول/خروج رقمية، اختبار الاستراتيجيات (Backtesting)، وتحسين معامل شارب (Sharpe Ratio).'
    ],
    curriculumPointsEn: [
      'Quantitative Price Modeling: Standard Deviation bands, Z-Score mean reversion, and ATR volatility regime filters.',
      'Orderflow & Liquidity Mechanics: institutional volume absorption, delta imbalances, and execution slippage control.',
      'Algorithmic Systems & Portfolio Math: Pine Script / webhook bot logic, Monte Carlo drawdown simulation, and Sharpe optimization.'
    ],
    subjects: [
      {
        id: 'qt-sub-1',
        moduleCode: 'QUANT 01',
        titleAr: 'النماذج الرياضية للتقلبات والانحراف المعياري (Volatility & Z-Score)',
        titleEn: 'Quantitative Volatility Regimes, ATR & Standard Deviation Models',
        durationAr: '6 وحدات كمية • إحصاء مالي',
        durationEn: '6 Quant Modules • Statistical Models',
        summaryAr:
          'حساب النطاقات السعرية المتوقعة إحصائياً للذهب والناسداك وتحديد مناطق الارتداد الكمي (Mean Reversion).',
        summaryEn:
          'Calculating statistical daily price distributions, 2-Sigma exhaustion zones, and ATR stop-loss multipliers.',
        visualType: 'quant',
        accentColor: '#38bdf8',
        chartLabel: '±2σ Z-SCORE • VOLATILITY'
      },
      {
        id: 'qt-sub-2',
        moduleCode: 'QUANT 02',
        titleAr: 'ميكانيكا تدفق الأوامر وامتصاص السيولة (Orderflow & Microstructure)',
        titleEn: 'Market Microstructure, Orderflow & Liquidity Absorption',
        durationAr: '6 وحدات كمية • تدفق الأوامر',
        durationEn: '6 Quant Modules • Microstructure',
        summaryAr:
          'فهم دفتر الأوامر المؤسسي، اختلال العرض والطلب اللحظي، وكيف تكتشف دخول المحافظ الكبرى.',
        summaryEn:
          'Analyzing institutional limit-order absorption, volume profile nodes (POC/VAH/VAL), and delta sweeps.',
        visualType: 'orderflow',
        accentColor: '#10b981',
        chartLabel: 'ORDERFLOW • POC / DELTA'
      },
      {
        id: 'qt-sub-3',
        moduleCode: 'QUANT 03',
        titleAr: 'هندسة استراتيجيات وبوتات التداول الآلي (Algorithmic Systems)',
        titleEn: 'Algorithmic Strategy Architecture, Backtesting & Webhook Bots',
        durationAr: '6 وحدات كمية • خوارزميات',
        durationEn: '6 Quant Modules • Algo Engineering',
        summaryAr:
          'تحويل الاستراتيجية إلى قواعد برمجية صارمة، اختبارها تاريخياً، وربط تنبيهات البوت بالتنفيذ الآلي.',
        summaryEn:
          'Codifying systematic entry/exit rules, avoiding curve-fitting in backtests, and automating webhook alerts.',
        visualType: 'algo',
        accentColor: '#a855f7',
        chartLabel: 'ALGO BOT • BACKTEST'
      },
      {
        id: 'qt-sub-4',
        moduleCode: 'QUANT 04',
        titleAr: 'هندسة المحافظ المؤسسية ومعادلة كيلي (Portfolio & Kelly Criterion)',
        titleEn: 'Institutional Portfolio Risk, Expectancy & Kelly Criterion',
        durationAr: '6 وحدات كمية • إدارة محافظ',
        durationEn: '6 Quant Modules • Risk Math',
        summaryAr:
          'تحسين التوقع الرياضي (Mathematical Expectancy)، محاكاة مونت كارلو للتراجع، وتوزيع المخاطر بين الأصول.',
        summaryEn:
          'Optimizing mathematical expectancy, Monte Carlo drawdown modeling, and multi-asset correlation balancing.',
        visualType: 'portfolio',
        accentColor: '#f59e0b',
        chartLabel: 'SHARPE • MONTE CARLO'
      }
    ],
    icon: Atom
  }
];

/**
 * Compact virtual thumbnail illustration for each course subject (0 external heavy images, instant render).
 */
const SubjectVirtualThumbnail: React.FC<{
  visualType: CourseSubjectCard['visualType'];
  accentColor: string;
  chartLabel: string;
  moduleCode: string;
  isLocked: boolean;
}> = ({ visualType, accentColor, chartLabel, moduleCode, isLocked }) => {
  return (
    <div className="relative w-24 h-20 sm:w-28 sm:h-20 shrink-0 rounded-xl bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 overflow-hidden flex flex-col justify-between p-1.5 select-none">
      {/* Subtle Grid Background */}
      <svg className="absolute inset-0 w-full h-full opacity-90" viewBox="0 0 120 84" fill="none">
        <line x1="0" y1="21" x2="120" y2="21" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="2 2" />
        <line x1="0" y1="42" x2="120" y2="42" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="2 2" />
        <line x1="0" y1="63" x2="120" y2="63" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="2 2" />

        {visualType === 'structure' && (
          <>
            <polyline
              points="8,66 28,46 42,56 66,26 82,38 110,14"
              stroke={accentColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="24" y1="46" x2="64" y2="46" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="66" cy="26" r="3" fill={accentColor} />
            <circle cx="110" cy="14" r="3" fill={accentColor} />
          </>
        )}

        {visualType === 'liquidity' && (
          <>
            <line x1="10" y1="24" x2="110" y2="24" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 2" />
            <polyline
              points="12,52 32,26 48,44 68,14 84,48 108,64"
              stroke={accentColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="68" cy="14" r="3.5" fill="#ef4444" />
          </>
        )}

        {visualType === 'fvg' && (
          <>
            <rect x="24" y="34" width="76" height="14" fill={accentColor} fillOpacity="0.22" stroke={accentColor} strokeWidth="0.8" />
            <rect x="16" y="48" width="6" height="16" rx="1" fill="#10b981" />
            <rect x="30" y="24" width="6" height="28" rx="1" fill="#10b981" />
            <rect x="44" y="16" width="6" height="18" rx="1" fill="#10b981" />
            <polyline points="54,22 72,40 106,14" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}

        {(visualType === 'macro' || visualType === 'sessions') && (
          <>
            <rect x="14" y="18" width="26" height="48" fill="#38bdf8" fillOpacity="0.12" stroke="#38bdf8" strokeWidth="0.7" />
            <rect x="44" y="12" width="32" height="54" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="0.7" />
            <rect x="80" y="10" width="28" height="56" fill="#10b981" fillOpacity="0.18" stroke="#10b981" strokeWidth="0.7" />
            <polyline points="12,50 38,46 56,62 74,24 106,16" stroke={accentColor} strokeWidth="2" />
          </>
        )}

        {(visualType === 'risk' || visualType === 'prop' || visualType === 'scalp') && (
          <>
            <rect x="20" y="16" width="80" height="26" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="0.8" />
            <rect x="20" y="42" width="80" height="14" fill="#ef4444" fillOpacity="0.22" stroke="#ef4444" strokeWidth="0.8" />
            <polyline points="14,50 36,42 58,32 84,22 104,16" stroke="#f8fafc" strokeWidth="2" />
          </>
        )}

        {(visualType === 'quant' || visualType === 'orderflow' || visualType === 'algo' || visualType === 'portfolio') && (
          <>
            <path
              d="M 8 56 Q 36 14, 62 42 T 112 22"
              stroke={accentColor}
              strokeWidth="2.2"
              fill="none"
            />
            <path
              d="M 8 68 Q 36 26, 62 54 T 112 34"
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="2 2"
              fill="none"
            />
            <rect x="18" y="54" width="5" height="16" fill={accentColor} fillOpacity="0.5" />
            <rect x="38" y="44" width="5" height="26" fill={accentColor} fillOpacity="0.7" />
            <rect x="58" y="36" width="5" height="34" fill={accentColor} fillOpacity="0.9" />
            <rect x="78" y="48" width="5" height="22" fill={accentColor} fillOpacity="0.6" />
            <rect x="98" y="28" width="5" height="42" fill="#10b981" fillOpacity="0.9" />
          </>
        )}
      </svg>

      {/* Top Module Badge & Lock Pill */}
      <div className="relative z-10 flex items-center justify-between gap-1">
        <span className="px-1.5 py-0.5 rounded bg-[#131722]/85 dark:bg-black/80 border border-white/15 dark:border-white/10 text-[8px] font-mono font-bold text-white">
          {moduleCode}
        </span>
        <span
          className={`w-4 h-4 rounded-md flex items-center justify-center border ${
            isLocked
              ? 'bg-[#FDF6E3] dark:bg-amber-500/20 border-[#EFE0B4] dark:border-amber-500/50 text-[#9A6700] dark:text-amber-300'
              : 'bg-[#E6F5F2] dark:bg-[#10b981]/20 border-[#B3E2D9] dark:border-[#10b981]/50 text-[#089981] dark:text-[#10b981]'
          }`}
        >
          <Lock className="w-2.5 h-2.5" />
        </span>
      </div>

      {/* Bottom Virtual Chart Tag */}
      <div className="relative z-10 px-1.5 py-0.5 rounded bg-[#131722]/85 dark:bg-black/80 border border-white/15 dark:border-white/10 text-[8px] font-mono text-white dark:text-[#d1d4dc] truncate text-center">
        {chartLabel}
      </div>
    </div>
  );
};

export const TradingAcademyPanel: React.FC<TradingAcademyPanelProps> = ({
  lang = 'ar',
  userProfile,
  isAdmin = false,
  onOpenPlans,
  onContactSupport
}) => {
  const isAr = lang === 'ar';
  const isRealAdmin = Boolean(
    isAdmin || userProfile?.isAdmin || (userProfile?.role || '').toUpperCase() === 'ADMIN'
  );

  // Active fixed side tab — defaults to 'shorts' (Main page open for free)
  const [activeSection, setActiveSection] = useState<AcademySectionId>('shorts');
  const [videos, setVideos] = useState<AcademyVideoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Admin upload workspace toggle (hidden behind Enrollment instructions by default as requested)
  const [showAdminUploadStudio, setShowAdminUploadStudio] = useState<boolean>(false);

  // Share Modal & Copy Link feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareModalVideo, setShareModalVideo] = useState<AcademyVideoItem | null>(null);
  const [showHostingGuide, setShowHostingGuide] = useState<boolean>(false);

  // Admin Post/Edit Modal State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSection, setFormSection] = useState<AcademySectionId>('shorts');
  const [formTitleAr, setFormTitleAr] = useState<string>('');
  const [formTitleEn, setFormTitleEn] = useState<string>('');
  const [formDescAr, setFormDescAr] = useState<string>('');
  const [formDescEn, setFormDescEn] = useState<string>('');
  const [formVideoUrl, setFormVideoUrl] = useState<string>('');
  const [formTopicTagAr, setFormTopicTagAr] = useState<string>('ذهب XAUUSD • سيولة');
  const [formDurationAr, setFormDurationAr] = useState<string>('0:55 شورت');
  const [formPriceUsd, setFormPriceUsd] = useState<string>('0');
  const [formIsFreeAccess, setFormIsFreeAccess] = useState<boolean>(true);
  const [formSortOrder, setFormSortOrder] = useState<string>('1');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadVideos = async (force: boolean = false) => {
    setLoading(true);
    try {
      const list = await fetchAcademyVideos(force);
      setVideos(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos(false);
  }, []);

  // Support deep-linked shared video parameter (?academyVideo=... or ?section=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const secParam = params.get('section') as AcademySectionId | null;
      if (secParam && ACADEMY_TRACKS.some((t) => t.id === secParam)) {
        setActiveSection(secParam);
      }
      const sharedVidId = params.get('academyVideo');
      if (sharedVidId && videos.length > 0) {
        const found = videos.find((v) => v.id === sharedVidId);
        if (found) {
          setActiveSection(found.section);
        }
      }
    } catch {
      // ignore URL parse error
    }
  }, [videos]);

  const activeTrack = useMemo(
    () => ACADEMY_TRACKS.find((t) => t.id === activeSection) || ACADEMY_TRACKS[0],
    [activeSection]
  );

  const sectionVideos = useMemo(
    () => videos.filter((v) => v.section === activeSection && v.isPublished !== false),
    [videos, activeSection]
  );

  /**
   * Builds a direct share link from the user's own website domain
   */
  const buildWebsiteShareUrl = (video?: AcademyVideoItem | null): string => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://mbktrading.com';
    if (!video) {
      return `${origin}/?tab=academy&section=${encodeURIComponent(activeSection)}`;
    }
    return `${origin}/?tab=academy&section=${encodeURIComponent(video.section)}&academyVideo=${encodeURIComponent(
      video.id
    )}`;
  };

  const handleShareVideoFromWebsite = async (video: AcademyVideoItem) => {
    soundManager.playClick();
    const shareUrl = buildWebsiteShareUrl(video);
    const title = isAr ? video.titleAr : video.titleEn;
    const text = isAr
      ? `🎬 شاهد "${video.titleAr}" مباشرة على أكاديمية MBK Trading:`
      : `🎬 Watch "${video.titleEn}" on MBK Trading Academy:`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `MBK Academy | ${title}`,
          text,
          url: shareUrl
        });
        return;
      } catch {
        // Fallback to share modal
      }
    }

    setShareModalVideo(video);
  };

  const handleCopyWebsiteLink = (video?: AcademyVideoItem | null) => {
    soundManager.playClick();
    const shareUrl = buildWebsiteShareUrl(video);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    const idKey = video ? video.id : `sec-${activeSection}`;
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Admin: Open Add Modal
  const handleOpenAddModal = (defaultSec?: AcademySectionId) => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    const targetSec = defaultSec || activeSection;
    setEditingId(null);
    setFormSection(targetSec);
    setFormTitleAr('');
    setFormTitleEn('');
    setFormDescAr('');
    setFormDescEn('');
    setFormVideoUrl('');
    setFormTopicTagAr(targetSec === 'shorts' ? 'ذهب XAUUSD • شورت' : 'دورة احترافية • MBK');
    setFormDurationAr(targetSec === 'shorts' ? '0:55 شورت' : '45 دقيقة');
    setFormPriceUsd(targetSec === 'paid_courses' ? '249' : targetSec === 'quantum_trading' ? '499' : '0');
    setFormIsFreeAccess(targetSec === 'shorts');
    setFormSortOrder(String(sectionVideos.length + 1));
    setFormError(null);
    setIsEditorOpen(true);
  };

  const isEliteMember = useMemo(() => {
    const tier = String(userProfile?.tier || '').toLowerCase();
    const role = String(userProfile?.role || '').toUpperCase();
    return Boolean(isRealAdmin || userProfile?.isElite || tier === 'elite' || role === 'ELITE');
  }, [isRealAdmin, userProfile?.isElite, userProfile?.tier, userProfile?.role]);

  // Admin: Open Edit Modal
  const handleOpenEditModal = (video: AcademyVideoItem) => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    setEditingId(video.id);
    setFormSection(video.section);
    setFormTitleAr(video.titleAr);
    setFormTitleEn(video.titleEn);
    setFormDescAr(video.descriptionAr);
    setFormDescEn(video.descriptionEn);
    setFormVideoUrl(video.videoUrl);
    setFormTopicTagAr(video.topicTagAr);
    setFormDurationAr(video.durationLabelAr);
    setFormPriceUsd(String(video.priceUsd || 0));
    setFormIsFreeAccess(
      typeof video.isFreeAccess === 'boolean' ? video.isFreeAccess : video.section === 'shorts'
    );
    setFormSortOrder(String(video.sortOrder || 1));
    setFormError(null);
    setIsEditorOpen(true);
  };

  // Admin: 1-Click Toggle Free Open vs Locked on any video (including Shorts)
  const handleToggleVideoLock = async (video: AcademyVideoItem) => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    try {
      await saveAcademyVideo({
        ...video,
        isFreeAccess: !video.isFreeAccess
      });
      const refreshed = await fetchAcademyVideos(true);
      setVideos(refreshed);
    } catch (err) {
      console.warn('[Academy] Toggle lock error:', err);
    }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRealAdmin) return;

    if (!formTitleAr.trim()) {
      setFormError(isAr ? 'يرجى إدخال عنوان الفيديو أو الدورة.' : 'Please enter a video/course title.');
      return;
    }

    const parsed = parseAcademyVideoUrl(formVideoUrl);
    if (!parsed.isValid || !parsed.embedUrl) {
      setFormError(
        isAr
          ? 'يرجى إدخال رابط صحيح من YouTube Shorts أو YouTube أو Vimeo أو رابط فيديو MP4 مباشر.'
          : 'Please enter a valid YouTube Short, YouTube Video, Vimeo, or direct MP4 link.'
      );
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const saved = await saveAcademyVideo({
        ...(editingId ? { id: editingId } : {}),
        titleAr: formTitleAr.trim(),
        titleEn: (formTitleEn || formTitleAr).trim(),
        descriptionAr: formDescAr.trim(),
        descriptionEn: (formDescEn || formDescAr).trim(),
        section: formSection,
        videoUrl: formVideoUrl.trim(),
        topicTagAr: formTopicTagAr.trim() || 'أكاديمية MBK',
        topicTagEn: formTopicTagAr.trim() || 'MBK Academy',
        durationLabelAr: formDurationAr.trim() || (formSection === 'shorts' ? '0:60 شورت' : 'درس فيديو'),
        durationLabelEn: formDurationAr.trim() || (formSection === 'shorts' ? '0:60 Short' : 'Video Lesson'),
        priceUsd: Number(formPriceUsd) || 0,
        isFreeAccess: formIsFreeAccess,
        sortOrder: Number(formSortOrder) || 1,
        isPublished: true
      });

      const refreshed = await fetchAcademyVideos(true);
      setVideos(refreshed);
      setActiveSection(saved.section);
      setIsEditorOpen(false);
    } catch (err: any) {
      setFormError(err?.message || (isAr ? 'حدث خطأ أثناء حفظ الفيديو.' : 'Failed to save video.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    try {
      await deleteAcademyVideo(id);
      const refreshed = await fetchAcademyVideos(true);
      setVideos(refreshed);
      setConfirmDeleteId(null);
    } catch (err) {
      console.warn('[Academy] Delete error:', err);
    }
  };

  const previewParsedLink = useMemo(() => parseAcademyVideoUrl(formVideoUrl), [formVideoUrl]);

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="h-full flex flex-col bg-[#F0F3FA] dark:bg-[#0b0e14] text-[#131722] dark:text-[#d1d4dc] overflow-hidden">
      {/* TOP BAR */}
      <div className="shrink-0 px-3 sm:px-5 py-2.5 bg-[#FFFFFF] dark:bg-[#10141c] border-b border-[#E0E3EB] dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E6F5F2] dark:bg-[#10b981]/15 border border-[#B3E2D9] dark:border-[#10b981]/35 flex items-center justify-center text-[#089981] dark:text-[#10b981] shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-base font-extrabold text-[#131722] dark:text-white">
                {isAr ? 'أكاديمية MBK الاحترافية للتداول الكمي والمؤسسي' : 'MBK Institutional & Quantum Trading Academy'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E6F5F2] dark:bg-[#10b981]/15 text-[#089981] dark:text-[#10b981] border border-[#B3E2D9] dark:border-[#10b981]/30">
                {isAr ? 'الرئيسية: شورتات مجانية • مع خيار قفل فيديوهات محددة' : 'Default: Free Shorts • Per-Video Lock Option'}
              </span>
            </div>
            <p className="text-[11px] text-[#4A5162] dark:text-[#8a93a6] mt-0.5 hidden sm:block">
              {isAr
                ? 'الشورتات التعليمية هي الصفحة الرئيسية المفتوحة، والأقسام الجانبية مرتبة للأسفل للدورات الاحترافية'
                : 'Short learning videos open by default, with vertical side menu tabs for full professional courses'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isRealAdmin && activeSection === 'shorts' && (
            <button
              type="button"
              onClick={() => handleOpenAddModal('shorts')}
              className="px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md shadow-none dark:shadow-[#10b981]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة شورت / فيديو' : 'Add Short / Video'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleCopyWebsiteLink(null)}
            className="px-2.5 py-1.5 rounded-lg bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#E0E3EB] dark:border-white/10 text-[11px] font-bold text-[#089981] dark:text-[#10b981] flex items-center gap-1.5 cursor-pointer"
          >
            {copiedId === `sec-${activeSection}` ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{isAr ? 'تم نسخ الرابط!' : 'Link Copied!'}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'مشاركة الرابط' : 'Share Link'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onContactSupport?.();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#FDF6E3] dark:bg-amber-500/15 hover:bg-amber-500/25 border border-[#EFE0B4] dark:border-amber-500/40 text-[#9A6700] dark:text-amber-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>{isAr ? 'تواصل مع الدعم' : 'Contact Support'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              loadVideos(true);
            }}
            className="p-1.5 rounded-lg bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#E0E3EB] dark:border-white/10 text-[#4A5162] dark:text-[#8a93a6] hover:text-[#131722] dark:hover:text-white cursor-pointer"
            title={isAr ? 'تحديث القائمة' : 'Refresh'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#089981] dark:text-[#10b981]' : ''}`} />
          </button>
        </div>
      </div>

      {/* MAIN BODY: Always flex-row with dir="ltr" so the Main Content Stage is on the Left and the Fixed Vertical Side Menu (<aside>) is ALWAYS on the Right side with tabs listed straight down */}
      <div dir="ltr" className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* LEFT MAIN CONTENT STAGE */}
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-5 space-y-4"
        >
          {activeSection === 'shorts' ? (
            /* =====================================================================
               DEFAULT PAGE: SHORT LEARNING VIDEOS & REELS (FREE OPEN, EMPTY BY DEFAULT,
               READY TO ADD & SHARE VIDEOS LATER, WITH PER-VIDEO LOCK OPTION)
               ===================================================================== */
            <div className="space-y-4">
              {/* Compact Shorts Main Page Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#E6F5F2] dark:bg-[#10b981]/15 text-[#089981] dark:text-[#10b981] border border-[#B3E2D9] dark:border-[#10b981]/35">
                      {isAr ? 'الصفحة الرئيسية • مفتوح مجاناً' : 'MAIN PAGE • FREE & OPEN'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FDF6E3] dark:bg-amber-500/15 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/30 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>
                        {isAr ? 'إمكانية قفل فيديوهات محددة' : 'Per-Video Lock Available'}
                      </span>
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-lg font-extrabold text-[#131722] dark:text-white pt-0.5">
                    {isAr
                      ? 'شورتات وريلز التداول التعليمية (Shorts & Reels)'
                      : 'Short Learning Videos & Reels'}
                  </h3>
                  <p className="text-xs text-[#4A5162] dark:text-[#8a93a6] leading-relaxed">
                    {isAr
                      ? 'مقاطع تعليمية قصيرة ومباشرة تعمل داخل الموقع مجاناً، مع إمكانية تخصيص بعض الفيديوهات كمحتوى مغلق ومشاركة رابط أي فيديو من موقعك مباشرة إلى المنصات الأخرى.'
                      : 'Short learning videos embedded directly in your website for free, with the option to lock specific videos and share your website link to any platform.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyWebsiteLink(null)}
                    className="px-3 py-2 rounded-xl bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#E0E3EB] dark:border-white/10 text-xs font-bold text-[#089981] dark:text-[#10b981] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'مشاركة صفحة الشورتات' : 'Share Shorts Page'}</span>
                  </button>

                  {isRealAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal('shorts')}
                      className="px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg shadow-none dark:shadow-[#10b981]/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAr ? 'إضافة فيديو شورت جديد' : 'Add New Short Video'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Shorts Feed: Empty State (0 videos pre-uploaded) vs Uploaded Shorts Grid */}
              {sectionVideos.length === 0 ? (
                <div className="p-6 sm:p-10 rounded-2xl bg-[#FFFFFF] dark:bg-[#0f141e] border border-dashed border-[#CBD2DF] dark:border-white/15 flex flex-col items-center justify-center text-center space-y-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[#E6F5F2] dark:bg-[#10b981]/15 border border-[#B3E2D9] dark:border-[#10b981]/35 flex items-center justify-center text-[#089981] dark:text-[#10b981]">
                    <Film className="w-7 h-7" />
                  </div>

                  <div className="space-y-1.5 max-w-lg">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E6F5F2] dark:bg-[#10b981]/15 border border-[#B3E2D9] dark:border-[#10b981]/30 text-[#089981] dark:text-[#10b981] text-[10px] font-extrabold">
                      <span>
                        {isAr
                          ? 'القسم فارغ حالياً • جاهز لإضافة ومشاركة الفيديوهات لاحقاً'
                          : 'Currently Empty • Ready to Add & Share Videos Later'}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-extrabold text-[#131722] dark:text-white">
                      {isAr
                        ? 'مكتبة الشورتات التعليمية مفتوحة وجاهزة لرفع المقاطع'
                        : 'Short Learning Videos Feed is Open & Ready'}
                    </h4>
                    <p className="text-xs text-[#4A5162] dark:text-[#8a93a6] leading-relaxed">
                      {isAr
                        ? 'لم يتم رفع أي فيديو مسبقاً كما طلبت. يمكنك إضافة روابط YouTube Shorts أو فيديوهات قصيرة في أي وقت، واختيار ما إذا كان الفيديو مفتوحاً مجاناً للجميع أو مغلقاً 🔒، ومشاركة رابطه من موقعك إلى واتساب وتيليجرام وإكس.'
                        : 'No videos are pre-uploaded. You can add YouTube Shorts or video links anytime, choose whether each video is Free Open or Locked 🔒, and share its website link to WhatsApp, Telegram, and X.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    {isRealAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal('shorts')}
                        className="px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg shadow-none dark:shadow-[#10b981]/20"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAr ? 'إضافة / تضمين فيديو شورت الآن' : 'Add / Embed Short Video Now'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyWebsiteLink(null)}
                      className="px-4 py-2.5 rounded-xl bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#E0E3EB] dark:border-white/10 text-xs font-bold text-[#131722] dark:text-[#d1d4dc] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                      <span>{isAr ? 'نسخ رابط صفحة الشورتات للمشاركة' : 'Copy Shorts Page Share Link'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sectionVideos.map((video) => {
                    const isCopied = copiedId === video.id;
                    const isVideoLocked = video.isFreeAccess === false;
                    const canWatch = !isVideoLocked || isEliteMember;

                    return (
                      <div
                        key={video.id}
                        className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 overflow-hidden flex flex-col justify-between shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl"
                      >
                        <div>
                          {/* Top Status Bar on each Short Card */}
                          <div className="px-3.5 py-2 bg-[#F0F3FA] dark:bg-[#0b0e14] border-b border-[#E0E3EB] dark:border-white/10 flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 ${
                                isVideoLocked
                                  ? 'bg-[#FDF6E3] dark:bg-amber-500/15 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/35'
                                  : 'bg-[#E6F5F2] dark:bg-[#10b981]/15 text-[#089981] dark:text-[#10b981] border border-[#B3E2D9] dark:border-[#10b981]/35'
                              }`}
                            >
                              {isVideoLocked ? (
                                <>
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>{isAr ? 'فيديو مغلق 🔒' : 'Locked Video 🔒'}</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-2.5 h-2.5" />
                                  <span>{isAr ? 'مفتوح مجاناً' : 'Free Open'}</span>
                                </>
                              )}
                            </span>

                            <span className="text-[10px] font-mono text-[#4A5162] dark:text-[#8a93a6]">
                              {isAr ? video.durationLabelAr : video.durationLabelEn}
                            </span>
                          </div>

                          {/* 9:16 Vertical Player or Locked Gate */}
                          <div className="relative w-full aspect-[9/16] max-h-[450px] bg-[#F0F3FA] dark:bg-[#06080c] border-b border-[#E0E3EB] dark:border-white/10 overflow-hidden">
                            {canWatch ? (
                              video.videoKind === 'direct_mp4' ? (
                                <video
                                  src={video.embedUrl}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  poster={video.thumbnailUrl}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <iframe
                                  src={video.embedUrl}
                                  title={isAr ? video.titleAr : video.titleEn}
                                  className="w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                  loading="lazy"
                                />
                              )
                            ) : (
                              /* Locked Short Video Overlay for non-enrolled users */
                              <div className="w-full h-full p-5 flex flex-col items-center justify-center text-center bg-[#F0F3FA] dark:bg-gradient-to-b dark:from-[#0b0e14] dark:via-[#101622] dark:to-[#06080c] space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-[#FDF6E3] dark:bg-amber-500/15 border border-[#EFE0B4] dark:border-amber-500/40 flex items-center justify-center text-[#9A6700] dark:text-amber-400">
                                  <Lock className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#FDF6E3] dark:bg-amber-500/15 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/30">
                                    {isAr ? 'محتوى خاص مغلق 🔒' : 'LOCKED SHORT 🔒'}
                                  </span>
                                  <h6 className="text-xs sm:text-sm font-extrabold text-[#131722] dark:text-white pt-1">
                                    {isAr ? video.titleAr : video.titleEn}
                                  </h6>
                                  <p className="text-[11px] text-[#4A5162] dark:text-[#8a93a6] leading-relaxed">
                                    {isAr
                                      ? 'هذا الفيديو مخصص للمسجلين. تواصل مع الدعم الفني أو فعّل باقة Elite لمشاهدته.'
                                      : 'This video is locked. Contact Support or activate Elite to unlock playback.'}
                                  </p>
                                </div>
                                <div className="flex flex-col w-full gap-2 pt-1 max-w-[210px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundManager.playClick();
                                      onContactSupport?.();
                                    }}
                                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Headphones className="w-3.5 h-3.5" />
                                    <span>{isAr ? 'تواصل مع الدعم لفتح الفيديو' : 'Contact Support'}</span>
                                  </button>
                                  {onOpenPlans && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundManager.playClick();
                                        onOpenPlans();
                                      }}
                                      className="w-full py-1.5 px-3 rounded-xl bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      <Crown className="w-3.5 h-3.5 text-[#9A6700] dark:text-amber-400" />
                                      <span>{isAr ? 'باقة Elite' : 'Elite Plan'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="p-3.5 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-[#089981] dark:text-[#10b981] font-bold">
                              <span>{isAr ? video.topicTagAr : video.topicTagEn}</span>
                            </div>
                            <h5 className="text-xs sm:text-sm font-extrabold text-[#131722] dark:text-white">
                              {isAr ? video.titleAr : video.titleEn}
                            </h5>
                            { (isAr ? video.descriptionAr : video.descriptionEn) && (
                              <p className="text-[11px] text-[#4A5162] dark:text-[#8a93a6] leading-relaxed">
                                {isAr ? video.descriptionAr : video.descriptionEn}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Share & Admin Lock/Edit Controls */}
                        <div className="px-3.5 pb-3.5 pt-2 border-t border-[#E0E3EB] dark:border-white/5 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-1">
                            <button
                              type="button"
                              onClick={() => handleShareVideoFromWebsite(video)}
                              className="flex-1 py-2 px-3 rounded-xl bg-[#E6F5F2] dark:bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#B3E2D9] dark:border-[#10b981]/40 text-[#089981] dark:text-[#10b981] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>{isAr ? 'مشاركة من الموقع' : 'Share Website Link'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyWebsiteLink(video)}
                              className="p-2 rounded-xl bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-[#d1d4dc] cursor-pointer"
                              title={isAr ? 'نسخ رابط الفيديو' : 'Copy Video Link'}
                            >
                              {isCopied ? (
                                <Check className="w-4 h-4 text-[#089981] dark:text-[#10b981]" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {isRealAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggleVideoLock(video)}
                                className={`p-2 rounded-xl border cursor-pointer ${
                                  isVideoLocked
                                    ? 'bg-[#FDF6E3] dark:bg-amber-500/15 border-[#EFE0B4] dark:border-amber-500/40 text-[#9A6700] dark:text-amber-300'
                                    : 'bg-[#F8F9FD] dark:bg-[#161c26] border-[#E0E3EB] dark:border-white/10 text-[#089981] dark:text-[#10b981]'
                                }`}
                                title={
                                  isVideoLocked
                                    ? isAr
                                      ? 'الفيديو مغلق حالياً — اضغط لفتحه مجاناً'
                                      : 'Currently Locked — Click to make Free Open'
                                    : isAr
                                    ? 'الفيديو مفتوح مجاناً — اضغط لقفل الفيديو'
                                    : 'Currently Free Open — Click to Lock'
                                }
                              >
                                {isVideoLocked ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(video)}
                                className="p-2 rounded-xl bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#E0E3EB] dark:border-white/10 text-[#9A6700] dark:text-amber-300 cursor-pointer"
                                title={isAr ? 'تعديل' : 'Edit'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVideo(video.id)}
                                className="p-2 rounded-xl bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#ef4444]/20 border border-[#E0E3EB] dark:border-white/10 text-[#D93848] dark:text-[#ef4444] cursor-pointer"
                                title={isAr ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* =====================================================================
               LOCKED COURSE TRACKS (FULL COURSES, IDEAS & SUBJECTS, PAID COURSES, QUANTUM TRADING)
               ===================================================================== */
            <>
              {/* 1. DETAILED PROFESSIONAL COURSE / TRACK DESCRIPTION HEADER */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 space-y-3.5 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border bg-[#FDF6E3] dark:bg-amber-500/15 text-[#9A6700] dark:text-amber-300 border-[#EFE0B4] dark:border-amber-500/35">
                        {isAr ? activeTrack.badgeAr : activeTrack.badgeEn}
                      </span>
                      <span className="text-[11px] font-mono text-[#4A5162] dark:text-[#8a93a6] px-2 py-0.5 rounded bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10">
                        {isAr ? activeTrack.priceTagAr : activeTrack.priceTagEn}
                      </span>
                      <span className="text-[11px] font-mono text-[#089981] dark:text-[#10b981] px-2 py-0.5 rounded bg-[#E6F5F2] dark:bg-[#10b981]/10 border border-[#B3E2D9] dark:border-[#10b981]/25">
                        {isAr
                          ? `${activeTrack.subjects.length} وحدات ومواضيع تفصيلية`
                          : `${activeTrack.subjects.length} Core Subject Modules`}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-xl font-extrabold text-[#131722] dark:text-white pt-1">
                      {isAr ? activeTrack.titleAr : activeTrack.titleEn}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#131722] dark:text-[#d1d4dc] leading-relaxed">
                      {isAr ? activeTrack.descriptionAr : activeTrack.descriptionEn}
                    </p>

                    <p className="text-xs text-[#4A5162] dark:text-[#8a93a6] leading-relaxed pt-1">
                      {isAr ? activeTrack.extendedOverviewAr : activeTrack.extendedOverviewEn}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onContactSupport?.();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg shadow-none dark:shadow-amber-500/15"
                    >
                      <Headphones className="w-4 h-4" />
                      <span>{isAr ? 'تواصل مع الدعم للتسجيل' : 'Contact Support to Enroll'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onOpenPlans?.();
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 text-[#9A6700] dark:text-amber-400" />
                      <span>{isAr ? 'باقة Elite' : 'Elite Plan'}</span>
                    </button>
                  </div>
                </div>

                {/* Key Course Outcomes / Syllabus Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-3 border-t border-[#E0E3EB] dark:border-white/10">
                  {(isAr ? activeTrack.curriculumPointsAr : activeTrack.curriculumPointsEn).map((pt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/5 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#9A6700] dark:text-amber-400" />
                      <span className="text-[11px] text-[#131722] dark:text-[#d1d4dc] leading-relaxed">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. COMPACT VIRTUAL PHOTOS & DETAILED DESCRIPTIONS OF COURSE SUBJECTS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#9A6700] dark:text-amber-400" />
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#131722] dark:text-white">
                      {isAr
                        ? `مواضيع ووحدات الدورة بالتفصيل (${activeTrack.subjects.length})`
                        : `Course Subjects & Virtual Video Previews (${activeTrack.subjects.length})`}
                    </h4>
                  </div>
                  <span className="text-[11px] text-[#4A5162] dark:text-[#8a93a6]">
                    {isAr
                      ? 'مقفلة حالياً • تواصل مع الدعم للتسجيل'
                      : 'Currently Locked • Contact Support to Enroll'}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {activeTrack.subjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-2xl bg-[#FFFFFF] dark:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 hover:border-[#CBD2DF] dark:hover:border-white/20 transition-all flex items-start gap-3.5"
                    >
                      {/* Small Compact Virtual Photo of the Course Subject */}
                      <SubjectVirtualThumbnail
                        visualType={sub.visualType}
                        accentColor={sub.accentColor}
                        chartLabel={sub.chartLabel}
                        moduleCode={sub.moduleCode}
                        isLocked={true}
                      />

                      {/* Subject Title, Metadata, and Detailed Description */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#089981] dark:text-[#10b981]">
                            {isAr ? sub.durationAr : sub.durationEn}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 bg-[#FDF6E3] dark:bg-amber-500/15 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/30">
                            <Lock className="w-2.5 h-2.5" />
                            <span>
                              {isAr ? 'مغلق • للتسجيل تواصل مع الدعم' : 'Locked • Contact Support'}
                            </span>
                          </span>
                        </div>

                        <h5 className="text-xs sm:text-sm font-extrabold text-[#131722] dark:text-white leading-snug">
                          {isAr ? sub.titleAr : sub.titleEn}
                        </h5>

                        <p className="text-[11px] text-[#4A5162] dark:text-[#8a93a6] leading-relaxed">
                          {isAr ? sub.summaryAr : sub.summaryEn}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. UPLOADED COURSE VIDEOS SECTION (ONLY APPEARS ONCE ADMIN UPLOADS VIDEOS) */}
              {sectionVideos.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-[#089981] dark:text-[#10b981]" />
                      <h4 className="text-sm font-extrabold text-[#131722] dark:text-white">
                        {isAr
                          ? `محاضرات الفيديو المرفوعة في هذا القسم (${sectionVideos.length})`
                          : `Uploaded Course Videos (${sectionVideos.length})`}
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {sectionVideos.map((video, idx) => {
                      const canWatchCourseVideo = video.isFreeAccess === true || isEliteMember;
                      return (
                        <div
                          key={video.id}
                          className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-[#9A6700] dark:text-amber-400">
                              0{idx + 1}. {isAr ? video.topicTagAr : video.topicTagEn}
                            </span>
                            <span className="font-mono text-[11px] text-[#4A5162] dark:text-[#8a93a6]">
                              {isAr ? video.durationLabelAr : video.durationLabelEn}
                            </span>
                          </div>

                          <h5 className="text-sm font-extrabold text-[#131722] dark:text-white">
                            {isAr ? video.titleAr : video.titleEn}
                          </h5>

                          <p className="text-xs text-[#4A5162] dark:text-[#8a93a6] leading-relaxed">
                            {isAr ? video.descriptionAr : video.descriptionEn}
                          </p>

                          {canWatchCourseVideo ? (
                            <div className="space-y-2">
                              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10">
                                {video.videoKind === 'direct_mp4' ? (
                                  <video src={video.embedUrl} controls playsInline className="w-full h-full" />
                                ) : (
                                  <iframe
                                    src={video.embedUrl}
                                    title={video.titleAr}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleShareVideoFromWebsite(video)}
                                  className="px-3 py-1.5 rounded-lg bg-[#F8F9FD] dark:bg-[#161c26] border border-[#E0E3EB] dark:border-white/10 text-xs font-bold text-[#089981] dark:text-[#10b981] flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>{isAr ? 'مشاركة الرابط' : 'Share Link'}</span>
                                </button>
                                {isRealAdmin && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleVideoLock(video)}
                                      className="px-2.5 py-1 rounded-lg bg-[#F8F9FD] dark:bg-[#161c26] border border-[#E0E3EB] dark:border-white/10 text-xs text-[#9A6700] dark:text-amber-300 flex items-center gap-1 cursor-pointer"
                                    >
                                      {video.isFreeAccess ? (
                                        <>
                                          <Unlock className="w-3 h-3 text-[#089981] dark:text-[#10b981]" />
                                          <span>{isAr ? 'مفتوح' : 'Free'}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Lock className="w-3 h-3" />
                                          <span>{isAr ? 'مغلق' : 'Locked'}</span>
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(video)}
                                      className="px-2.5 py-1 rounded-lg bg-[#F8F9FD] dark:bg-[#161c26] border border-[#E0E3EB] dark:border-white/10 text-xs text-[#9A6700] dark:text-amber-300 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>{isAr ? 'تعديل' : 'Edit'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVideo(video.id)}
                                      className="px-2.5 py-1 rounded-lg bg-[#F8F9FD] dark:bg-[#161c26] border border-[#E0E3EB] dark:border-white/10 text-xs text-[#D93848] dark:text-[#ef4444] flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>{isAr ? 'حذف' : 'Delete'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#EFE0B4] dark:border-amber-500/30 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-xs text-[#9A6700] dark:text-amber-300 font-bold">
                                <Lock className="w-4 h-4 shrink-0" />
                                <span>
                                  {isAr
                                    ? 'محاضرة مسجلة • تواصل مع الدعم للتسجيل وفتح المشاهدة'
                                    : 'Locked Lecture • Contact Support to enroll & unlock'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  soundManager.playClick();
                                  onContactSupport?.();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-extrabold text-[11px] shrink-0 cursor-pointer"
                              >
                                {isAr ? 'تواصل مع الدعم' : 'Contact Support'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. ENROLLMENT INSTRUCTIONS & CONTACT SUPPORT GATE (WITH HIDDEN ADMIN VIDEO UPLOAD PLACE BEHIND IT) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFFFF] dark:bg-gradient-to-b dark:from-[#121826] dark:to-[#0f141e] border border-[#EFE0B4] dark:border-amber-500/35 space-y-4 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 max-w-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-[#FDF6E3] dark:bg-amber-500/15 border border-[#EFE0B4] dark:border-amber-500/40 flex items-center justify-center text-[#9A6700] dark:text-amber-400 shrink-0">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FDF6E3] dark:bg-amber-500/15 border border-[#EFE0B4] dark:border-amber-500/30 text-[#9A6700] dark:text-amber-300 text-[10px] font-extrabold">
                        <Sparkles className="w-3 h-3" />
                        <span>
                          {isAr
                            ? 'محاضرات الفيديو مقفلة • التسجيل عبر الدعم الفني أو باقة Elite'
                            : 'Course Videos Locked • Enroll via Support or Elite Subscription'}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-extrabold text-[#131722] dark:text-white">
                        {isAr
                          ? `كيفية التسجيل وفتح فيديوهات: ${activeTrack.shortAr}`
                          : `How to Enroll & Unlock Videos for: ${activeTrack.shortEn}`}
                      </h4>

                      <p className="text-xs text-[#4A5162] dark:text-[#b2b5be] leading-relaxed">
                        {isAr
                          ? 'جميع محاضرات الفيديو التطبيقية في هذا القسم مقفلة لحماية المحتوى المؤسسي. للتسجيل في الدورة أو تفعيل وصول باقة Elite على حسابك، تواصل مباشرة مع فريق دعم MBK Trading (@mbktrading) عبر الماسنجر الداخلي.'
                          : 'All video lectures in this track are locked for enrolled members. To enroll in this course or activate Elite access on your account, contact MBK Trading Support (@mbktrading) directly.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onContactSupport?.();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg shadow-none dark:shadow-amber-500/20"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{isAr ? 'مراسلة الدعم للتسجيل الآن' : 'Message Support to Enroll'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onOpenPlans?.();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#CBD2DF] dark:border-white/15 text-[#131722] dark:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 text-[#9A6700] dark:text-amber-400" />
                      <span>{isAr ? 'استعراض باقة Elite' : 'View Elite Plan'}</span>
                    </button>
                  </div>
                </div>

                {/* 3-Step Enrollment Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-[#E0E3EB] dark:border-white/10 text-xs">
                  <div className="p-3 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/5 space-y-1">
                    <div className="font-extrabold text-[#9A6700] dark:text-amber-400">
                      {isAr ? '1. اختر المسار التدريبي' : '1. Select Your Course Track'}
                    </div>
                    <p className="text-[11px] text-[#4A5162] dark:text-[#8a93a6]">
                      {isAr
                        ? 'راجع وصف الوحدات والمواضيع أعلاه وحدد الدورة المناسبة لمستواك (الدورات الكاملة، المدفوعة، أو التداول الكمي).'
                        : 'Review the detailed subject modules above and choose your track (Full Courses, Paid Bootcamp, or Quantum Trading).'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/5 space-y-1">
                    <div className="font-extrabold text-[#089981] dark:text-[#10b981]">
                      {isAr ? '2. تواصل مع الدعم (@mbktrading)' : '2. Contact Support (@mbktrading)'}
                    </div>
                    <p className="text-[11px] text-[#4A5162] dark:text-[#8a93a6]">
                      {isAr
                        ? 'اضغط على زر "مراسلة الدعم للتسجيل" لإرسال طلب انضمامك للدورة أو طلب تفعيل باقة Elite.'
                        : 'Click "Message Support to Enroll" to open a direct ticket with the MBK Desk for enrollment.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/5 space-y-1">
                    <div className="font-extrabold text-[#1E53E5] dark:text-sky-400">
                      {isAr ? '3. التفعيل الفوري للمحاضرات' : '3. Instant Video Activation'}
                    </div>
                    <p className="text-[11px] text-[#4A5162] dark:text-[#8a93a6]">
                      {isAr
                        ? 'يقوم المشرف بتفعيل صلاحية حسابك لتعمل جميع الفيديوهات المرفوعة داخل مشغل الموقع مباشرة.'
                        : 'Once activated, all uploaded course videos play natively inside your account workspace.'}
                    </p>
                  </div>
                </div>

                {/* ADMIN ONLY: HIDDEN VIDEO UPLOAD STUDIO TOGGLE BEHIND ENROLLMENT INSTRUCTIONS */}
                {isRealAdmin && (
                  <div className="pt-3 border-t border-[#E0E3EB] dark:border-white/10 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#4A5162] dark:text-[#8a93a6] flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                        <span>
                          {isAr
                            ? 'لوحة المشرف فقط (مخفية خلف تعليمات التسجيل): رفع وتضمين الفيديوهات لهذا القسم'
                            : 'Admin Only (Hidden Behind Enrollment Instructions): Video Upload & Embed Studio'}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setShowAdminUploadStudio((prev) => !prev);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#CBD2DF] dark:border-white/15 text-[11px] font-bold text-[#089981] dark:text-[#10b981] flex items-center gap-1.5 cursor-pointer"
                      >
                        {showAdminUploadStudio ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>{isAr ? 'إخفاء استوديو رفع الفيديوهات' : 'Hide Admin Upload Studio'}</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>
                              {isAr
                                ? `فتح استوديو رفع الفيديوهات (${activeTrack.shortAr})`
                                : `Open Video Upload Studio (${activeTrack.shortEn})`}
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    {showAdminUploadStudio && (
                      <div className="p-4 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#B3E2D9] dark:border-[#10b981]/35 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-extrabold text-[#131722] dark:text-white flex items-center gap-1.5">
                              <Video className="w-4 h-4 text-[#089981] dark:text-[#10b981]" />
                              <span>
                                {isAr
                                  ? `مكان رفع وتضمين الفيديوهات لقسم: ${activeTrack.titleAr}`
                                  : `Video Upload & Link Embed Place for: ${activeTrack.titleEn}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#4A5162] dark:text-[#8a93a6] mt-0.5">
                              {isAr
                                ? 'أضف روابط YouTube Shorts أو فيديوهات YouTube (غير مدرجة/عامة) أو Vimeo أو MP4 عندما تكون جاهزاً.'
                                : 'Add YouTube Shorts, YouTube (Unlisted/Public), Vimeo, or MP4 links whenever you are ready.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowHostingGuide((prev) => !prev)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#F8F9FD] dark:bg-[#161c26] border border-[#E0E3EB] dark:border-white/10 text-[11px] font-semibold text-[#9A6700] dark:text-amber-300 flex items-center gap-1 cursor-pointer"
                            >
                              <HardDrive className="w-3.5 h-3.5" />
                              <span>{isAr ? 'نصيحة الاستضافة' : 'Hosting Tip'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenAddModal(activeSection)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>
                                {isAr
                                  ? `رفع / إضافة فيديو في (${activeTrack.shortAr})`
                                  : `Upload / Embed Video in (${activeTrack.shortEn})`}
                              </span>
                            </button>
                          </div>
                        </div>

                        {showHostingGuide && (
                          <div className="p-3 rounded-lg bg-[#FFFFFF] dark:bg-[#121824] border border-[#EFE0B4] dark:border-amber-500/30 text-[11px] text-[#131722] dark:text-[#d1d4dc] leading-relaxed">
                            {isAr
                              ? '💡 نصيحة هندسية: ارفع فيديوهات الدورات كـ "غير مدرج (Unlisted)" على يوتيوب أو ارفع الشورتس كـ YouTube Shorts، ثم الصق الرابط هنا. سيعمل الفيديو داخل مشغل موقعك مباشرة بأعلى جودة وبدون أي ثقل على الموقع.'
                              : '💡 Engineering Tip: Host course videos as Unlisted YouTube/Vimeo or YouTube Shorts and paste the link here—they embed directly inside your website player with zero server bandwidth load.'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT FIXED VERTICAL SIDE MENU (<aside> and aside > div:nth-of-type(1) ALWAYS listed vertically down on the right side) */}
        <aside
          dir={isAr ? 'rtl' : 'ltr'}
          className="w-44 sm:w-56 md:w-64 lg:w-72 shrink-0 bg-[#F0F3FA] dark:bg-[#0b0e14] border-l border-[#E0E3EB] dark:border-white/10 flex flex-col justify-between overflow-y-auto select-none"
        >
          <div className="p-2 sm:p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#4A5162] dark:text-[#8a93a6] border-b border-[#E0E3EB] dark:border-white/5 mb-0.5">
              <span>{isAr ? 'أقسام الأكاديمية' : 'ACADEMY MENU'}</span>
              <span>{ACADEMY_TRACKS.length}</span>
            </div>

            {ACADEMY_TRACKS.map((track) => {
              const Icon = track.icon;
              const isSelected = activeSection === track.id;
              const uploadedCount = videos.filter(
                (v) => v.section === track.id && v.isPublished !== false
              ).length;

              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setActiveSection(track.id);
                  }}
                  className={`group w-full text-start px-2.5 sm:px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? track.id === 'shorts'
                        ? 'bg-[#E6F5F2] dark:bg-[#10b981]/15 border-[#10b981] text-[#131722] dark:text-white shadow-md'
                        : 'bg-[#FDF6E3] dark:bg-amber-500/15 border-[#EFE0B4] dark:border-amber-500/60 text-[#131722] dark:text-white shadow-md'
                      : 'bg-[#FFFFFF] dark:bg-[#0f141e]/80 border-[#E0E3EB] dark:border-white/5 text-[#4A5162] dark:text-[#8a93a6] hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] hover:text-[#131722] dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? track.id === 'shorts'
                            ? 'bg-[#E6F5F2] dark:bg-[#10b981]/20 border-[#B3E2D9] dark:border-[#10b981]/50 text-[#089981] dark:text-[#10b981]'
                            : 'bg-[#FDF6E3] dark:bg-amber-500/20 border-[#EFE0B4] dark:border-amber-500/50 text-[#9A6700] dark:text-amber-400'
                          : 'bg-[#FFFFFF] dark:bg-[#131722] border-[#E0E3EB] dark:border-white/10 text-[#4A5162] dark:text-[#8a93a6]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-bold truncate">
                        {isAr ? track.shortAr : track.shortEn}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] sm:text-[10px] mt-0.5 truncate">
                        {track.id === 'shorts' ? (
                          <span className="text-[#089981] dark:text-[#10b981] font-semibold truncate">
                            {isAr ? 'الرئيسية • مفتوح' : 'Default • Free Open'}
                          </span>
                        ) : (
                          <span className="text-[#9A6700] dark:text-amber-400/90 font-semibold truncate">
                            {isAr ? 'مغلق • عبر الدعم' : 'Locked • Support'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {uploadedCount > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-[#d1d4dc]">
                        {uploadedCount}
                      </span>
                    )}
                    {track.id === 'shorts' ? (
                      <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[#9A6700] dark:text-amber-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Fixed Support & Enrollment Callout inside Right Sidebar */}
          <div className="p-2.5 m-2 rounded-xl bg-[#FFFFFF] dark:bg-gradient-to-b dark:from-[#131824] dark:to-[#0f141e] border border-[#EFE0B4] dark:border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-[#9A6700] dark:text-amber-300 flex items-center gap-1">
                <Headphones className="w-3 h-3 shrink-0" />
                <span className="truncate">{isAr ? 'التسجيل في الدورات' : 'Enrollment'}</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FDF6E3] dark:bg-amber-500/15 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/30">
                ELITE
              </span>
            </div>
            <p className="text-[10px] text-[#4A5162] dark:text-[#8a93a6] leading-relaxed hidden sm:block">
              {isAr
                ? 'تواصل مع فريق الدعم الفني للتسجيل وفتح الدورات المغلقة.'
                : 'Contact Support to enroll and unlock course tracks.'}
            </p>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onContactSupport?.();
              }}
              className="w-full py-1.5 sm:py-2 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] sm:text-xs cursor-pointer transition-colors flex items-center justify-center gap-1"
            >
              <MessageSquare className="w-3 h-3 shrink-0" />
              <span className="truncate">{isAr ? 'تواصل مع الدعم' : 'Contact Support'}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* SHARE LINK FROM WEBSITE TO OTHER PLATFORMS MODAL */}
      {shareModalVideo && (
        <div className="fixed inset-0 z-50 bg-[#131722]/45 dark:bg-black/75 dark:backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#FFFFFF] dark:bg-[#10141c] border border-[#CBD2DF] dark:border-white/15 p-5 space-y-4 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#089981] dark:text-[#10b981]" />
                <h4 className="text-sm font-extrabold text-[#131722] dark:text-white">
                  {isAr ? 'مشاركة الفيديو من موقعك إلى المنصات الأخرى' : 'Share Video From Your Website'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShareModalVideo(null)}
                className="text-[#4A5162] dark:text-[#8a93a6] hover:text-[#131722] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 space-y-1">
              <div className="text-xs font-bold text-[#131722] dark:text-white">
                {isAr ? shareModalVideo.titleAr : shareModalVideo.titleEn}
              </div>
              <div className="text-[11px] text-[#4A5162] dark:text-[#8a93a6]">
                {isAr
                  ? 'هذا الرابط يفتح موقعك مباشرة على قسم الأكاديمية:'
                  : 'This link directs visitors straight to your website Academy:'}
              </div>
              <div className="mt-2 p-2 rounded-lg bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 font-mono text-[11px] text-[#089981] dark:text-[#10b981] break-all">
                {buildWebsiteShareUrl(shareModalVideo)}
              </div>
            </div>

            {(() => {
              const websiteLink = buildWebsiteShareUrl(shareModalVideo);
              const shareText = isAr
                ? `🎬 شاهد "${shareModalVideo.titleAr}" على أكاديمية MBK Trading:`
                : `🎬 Watch "${shareModalVideo.titleEn}" on MBK Trading Academy:`;
              const encodedUrl = encodeURIComponent(websiteLink);
              const encodedText = encodeURIComponent(`${shareText} ${websiteLink}`);

              return (
                <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
                  <a
                    href={`https://wa.me/?text=${encodedText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-[#E6F5F2] dark:bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#B3E2D9] dark:border-[#10b981]/35 text-[#089981] dark:text-[#10b981] flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-[#EDF1F7] dark:bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-[#1E53E5] dark:text-sky-400 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Telegram</span>
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodedText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-[#EDF1F7] dark:bg-white/10 hover:bg-[#EDF1F7] dark:hover:bg-white/15 border border-[#CBD2DF] dark:border-white/20 text-[#131722] dark:text-white flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>X (Twitter)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyWebsiteLink(shareModalVideo)}
                    className="p-2.5 rounded-xl bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] border border-[#CBD2DF] dark:border-white/15 text-[#131722] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedId === shareModalVideo.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                        <span>{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isAr ? 'نسخ رابط الموقع' : 'Copy Website Link'}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ADMIN ONLY: ADD / EDIT VIDEO OR SHORT MODAL */}
      {isRealAdmin && isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-[#131722]/45 dark:bg-black/80 dark:backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-[#FFFFFF] dark:bg-[#10141c] border border-[#CBD2DF] dark:border-white/15 p-5 space-y-4 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl my-auto">
            <div className="flex items-center justify-between gap-2 border-b border-[#E0E3EB] dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-[#089981] dark:text-[#10b981]" />
                <h3 className="text-sm sm:text-base font-extrabold text-[#131722] dark:text-white">
                  {editingId
                    ? isAr
                      ? 'تعديل الفيديو / الدورة (للمشرف فقط)'
                      : 'Edit Academy Video / Course (Admin Only)'
                    : isAr
                    ? 'إضافة فيديو YouTube Short أو محاضرة دورة'
                    : 'Post New YouTube Short or Course Video'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-[#4A5162] dark:text-[#8a93a6] hover:text-[#131722] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                    {isAr ? 'القسم في القائمة الجانبية اليمنى' : 'Academy Right Sidebar Section'}
                  </label>
                  <select
                    value={formSection}
                    onChange={(e) => {
                      const nextSec = e.target.value as AcademySectionId;
                      setFormSection(nextSec);
                      if (nextSec === 'shorts') {
                        setFormIsFreeAccess(true);
                      } else {
                        setFormIsFreeAccess(false);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#CBD2DF] dark:border-white/15 text-[#131722] dark:text-white"
                  >
                    {ACADEMY_TRACKS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {isAr ? t.shortAr : t.shortEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                    {isAr ? 'رابط الفيديو (YouTube Shorts / YouTube / MP4)' : 'Video Link (YouTube Shorts / YouTube / MP4)'}
                  </label>
                  <input
                    type="url"
                    required
                    value={formVideoUrl}
                    onChange={(e) => setFormVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/shorts/..."
                    className="w-full px-3 py-2 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#CBD2DF] dark:border-white/15 text-[#131722] dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Per-Video Free Open vs Locked Choice */}
              <div className="p-3 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 space-y-2">
                <label className="block font-bold text-[#131722] dark:text-[#d1d4dc]">
                  {isAr
                    ? 'صلاحية مشاهدة هذا الفيديو (مفتوح مجاناً أو مغلق 🔒):'
                    : 'Video Access Permission (Free Open or Locked 🔒):'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormIsFreeAccess(true)}
                    className={`py-2 px-3 rounded-xl border font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      formIsFreeAccess
                        ? 'bg-[#E6F5F2] dark:bg-[#10b981]/20 border-[#10b981] text-[#089981] dark:text-[#10b981]'
                        : 'bg-[#F8F9FD] dark:bg-[#161c26] border-[#E0E3EB] dark:border-white/10 text-[#4A5162] dark:text-[#8a93a6]'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>{isAr ? 'مفتوح مجاناً للجميع' : 'Free & Open'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormIsFreeAccess(false)}
                    className={`py-2 px-3 rounded-xl border font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      !formIsFreeAccess
                        ? 'bg-[#FDF6E3] dark:bg-amber-500/20 border-amber-500 text-[#9A6700] dark:text-amber-300'
                        : 'bg-[#F8F9FD] dark:bg-[#161c26] border-[#E0E3EB] dark:border-white/10 text-[#4A5162] dark:text-[#8a93a6]'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isAr ? 'مغلق 🔒 (يتطلب التسجيل / الدعم)' : 'Locked 🔒 (Requires Enrollment)'}</span>
                  </button>
                </div>
              </div>

              {formVideoUrl.trim() && (
                <div
                  className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                    previewParsedLink.isValid
                      ? 'bg-[#E6F5F2] dark:bg-[#10b981]/10 border-[#B3E2D9] dark:border-[#10b981]/30 text-[#089981] dark:text-[#10b981]'
                      : 'bg-[#FDECEE] dark:bg-[#ef4444]/10 border-[#F5C2C7] dark:border-[#ef4444]/30 text-[#D93848] dark:text-[#ef4444]'
                  }`}
                >
                  <span>
                    {previewParsedLink.isValid
                      ? isAr
                        ? `✅ تم التعرف على الرابط بنجاح (${previewParsedLink.videoKind}) — سيعمل داخل مشغل موقعك مباشرة.`
                        : `✅ Link detected (${previewParsedLink.videoKind}) — will play natively inside your website.`
                      : isAr
                      ? '⚠️ الرابط غير صالح، تأكد من نسخ رابط YouTube Shorts أو YouTube كامل.'
                      : '⚠️ Invalid URL format.'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                    {isAr ? 'عنوان الفيديو / الدورة (عربي)' : 'Title (Arabic)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitleAr}
                    onChange={(e) => setFormTitleAr(e.target.value)}
                    placeholder={isAr ? 'مثال: استراتيجية قنص سيولة الذهب XAUUSD' : 'Arabic title'}
                    className="w-full px-3 py-2 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#CBD2DF] dark:border-white/15 text-[#131722] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                    {isAr ? 'العنوان بالإنجليزية (اختياري)' : 'Title (English - Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    placeholder="Optional English title"
                    className="w-full px-3 py-2 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#CBD2DF] dark:border-white/15 text-[#131722] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                  {isAr ? 'وصف الفيديو أو منهج الدورة' : 'Course / Video Description'}
                </label>
                <textarea
                  rows={3}
                  value={formDescAr}
                  onChange={(e) => setFormDescAr(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اكتب شرحاً واضحاً لمحتوى الفيديو أو النقاط التي سيتعلمها المتداول...'
                      : 'Describe what traders will learn in this video or course...'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#CBD2DF] dark:border-white/15 text-[#131722] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                    {isAr ? 'وسم الموضوع' : 'Topic Tag'}
                  </label>
                  <input
                    type="text"
                    value={formTopicTagAr}
                    onChange={(e) => setFormTopicTagAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#CBD2DF] dark:border-white/15 text-[#131722] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                    {isAr ? 'المدة / عدد الدروس' : 'Duration'}
                  </label>
                  <input
                    type="text"
                    value={formDurationAr}
                    onChange={(e) => setFormDurationAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#CBD2DF] dark:border-white/15 text-[#131722] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#131722] dark:text-[#d1d4dc] mb-1">
                    {isAr ? 'سعر الدورة ($ USD)' : 'Course Price ($ USD)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPriceUsd}
                    onChange={(e) => setFormPriceUsd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#CBD2DF] dark:border-white/15 text-[#131722] dark:text-white font-mono"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-[#FDECEE] dark:bg-[#ef4444]/15 border border-[#F5C2C7] dark:border-[#ef4444]/40 text-[#D93848] dark:text-[#ef4444] font-semibold">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E0E3EB] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F8F9FD] dark:bg-[#161c26] hover:bg-[#EDF1F7] dark:hover:bg-[#1c2432] text-[#131722] dark:text-[#d1d4dc] font-bold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-extrabold cursor-pointer disabled:opacity-50"
                >
                  {isSaving
                    ? isAr
                      ? 'جاري الحفظ...'
                      : 'Saving...'
                    : editingId
                    ? isAr
                      ? 'حفظ التعديلات'
                      : 'Save Changes'
                    : isAr
                    ? 'نشر في الأكاديمية'
                    : 'Publish to Academy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingAcademyPanel;
