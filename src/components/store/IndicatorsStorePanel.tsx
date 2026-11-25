import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Crown,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Wrench,
  X
} from 'lucide-react';
import { UserProfile } from '../../types/trading';
import { soundManager } from '../../utils/audio';
import {
  PlatformContactSettings,
  DEFAULT_PLATFORM_SETTINGS,
  buildWhatsAppUrl,
  fetchPlatformSettings,
  normalizeTelegramUrl
} from '../../services/platformSettingsService';
import {
  StoreBillingCycle,
  StoreProduct,
  StoreProductCategory,
  deleteStoreProduct,
  fetchStoreProducts,
  saveStoreProduct
} from '../../services/storeService';

export interface IndicatorsStorePanelProps {
  lang?: 'ar' | 'en';
  userProfile?: UserProfile | null;
  isAdmin?: boolean;
  onOpenPlans?: () => void;
  onViewPlans?: () => void;
}

type CategoryFilter = 'all' | 'indicator' | 'algo_bot' | 'bundle';

interface ProductEditorFormState {
  id?: string;
  titleAr: string;
  titleEn: string;
  category: StoreProductCategory;
  platform: string;
  marketsInput: string;
  priceUsd: string;
  billingCycle: StoreBillingCycle;
  includedInElite: boolean;
  shortDescAr: string;
  shortDescEn: string;
  featuresArInput: string;
  featuresEnInput: string;
  imageUrl: string;
  demoUrl: string;
  checkoutUrl: string;
  badgeTextAr: string;
  badgeTextEn: string;
  isPublished: boolean;
  sortOrder: string;
  timestampMs?: number;
}

const EMPTY_FORM_STATE: ProductEditorFormState = {
  titleAr: '',
  titleEn: '',
  category: 'indicator',
  platform: 'TradingView (Pine Script)',
  marketsInput: 'XAUUSD, US100',
  priceUsd: '149',
  billingCycle: 'one_time',
  includedInElite: true,
  shortDescAr: '',
  shortDescEn: '',
  featuresArInput: '',
  featuresEnInput: '',
  imageUrl: '',
  demoUrl: '',
  checkoutUrl: '',
  badgeTextAr: '',
  badgeTextEn: '',
  isPublished: true,
  sortOrder: '0'
};

function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 900;
        const maxHeight = 560;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Failed reading image file'));
    reader.readAsDataURL(file);
  });
}

export const IndicatorsStorePanel: React.FC<IndicatorsStorePanelProps> = ({
  lang = 'ar',
  userProfile,
  isAdmin: isAdminProp,
  onOpenPlans,
  onViewPlans
}) => {
  const isAr = lang === 'ar';
  const handlePlansClick = onOpenPlans || onViewPlans;

  const isAdmin = useMemo(() => {
    if (typeof isAdminProp === 'boolean') return isAdminProp;
    if (!userProfile) return false;
    const roleUpper = (userProfile.role || '').toUpperCase();
    return Boolean(
      userProfile.isAdmin ||
        roleUpper === 'ADMIN' ||
        userProfile.email?.toLowerCase() === 'moe.albzour@gmail.com'
    );
  }, [isAdminProp, userProfile]);

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [contactSettings, setContactSettings] = useState<PlatformContactSettings>(
    DEFAULT_PLATFORM_SETTINGS
  );

  // Admin Editor Modal State
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<ProductEditorFormState>(EMPTY_FORM_STATE);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editorError, setEditorError] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    fetchStoreProducts(false)
      .then((list) => {
        if (mounted) {
          setProducts(list);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    fetchPlatformSettings()
      .then((settings) => {
        if (mounted) {
          setContactSettings(settings);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    soundManager.playClick();
    setIsRefreshing(true);
    try {
      const fresh = await fetchStoreProducts(true);
      setProducts(fresh);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Visible products: Admins see all (published + drafts), users see only isPublished
  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (!isAdmin && !p.isPublished) return false;
      if (categoryFilter === 'all') return true;
      if (categoryFilter === 'bundle') {
        return p.category === 'bundle' || p.category === 'tool';
      }
      return p.category === categoryFilter;
    });
  }, [products, isAdmin, categoryFilter]);

  const getCategoryMeta = (cat: StoreProductCategory) => {
    if (cat === 'algo_bot') {
      return {
        labelAr: 'روبوت تداول آلي',
        labelEn: 'Algo Trading Bot',
        icon: Bot,
        badgeClass: 'bg-[#E6F5F2] dark:bg-[#10b981]/15 text-[#089981] dark:text-[#10b981] border-[#B3E2D9] dark:border-[#10b981]/30'
      };
    }
    if (cat === 'bundle') {
      return {
        labelAr: 'باقة متكاملة',
        labelEn: 'System Bundle',
        icon: Layers,
        badgeClass: 'bg-[#FDF6E3] dark:bg-amber-500/15 text-[#9A6700] dark:text-amber-400 border-[#EFE0B4] dark:border-amber-500/30'
      };
    }
    if (cat === 'tool') {
      return {
        labelAr: 'أداة احترافية',
        labelEn: 'Pro Trading Tool',
        icon: Wrench,
        badgeClass: 'bg-[#EDF1F7] dark:bg-purple-500/15 text-[#4A5162] dark:text-purple-300 border-[#CBD2DF] dark:border-purple-500/30'
      };
    }
    return {
      labelAr: 'مؤشر TradingView',
      labelEn: 'TradingView Indicator',
      icon: TrendingUp,
      badgeClass: 'bg-[#E6F5F2] dark:bg-[#089981]/15 text-[#089981] border-[#B3E2D9] dark:border-[#089981]/30'
    };
  };

  const getBillingLabel = (cycle: StoreBillingCycle): string => {
    if (cycle === 'monthly') return isAr ? '/ شهرياً' : '/ month';
    if (cycle === 'yearly') return isAr ? '/ سنوياً' : '/ year';
    if (cycle === 'free_for_elite') return isAr ? 'مجاناً لمشتركي Elite' : 'Free for Elite';
    return isAr ? 'دفعة واحدة (مدى الحياة)' : 'One-Time License';
  };

  const buildOrderHref = (product: StoreProduct): string => {
    if (product.checkoutUrl && product.checkoutUrl.trim()) {
      return product.checkoutUrl.trim();
    }

    const title = isAr ? product.titleAr : product.titleEn;
    const buyerEmail = userProfile?.email || 'Guest';
    const orderMsg = isAr
      ? `مرحباً، أرغب بطلب [${title}] بسعر $${product.priceUsd} — حسابي: ${buyerEmail}`
      : `Hello, I would like to order [${title}] for $${product.priceUsd} — My account: ${buyerEmail}`;

    const waUrl = buildWhatsAppUrl(contactSettings.whatsappNumber, orderMsg);
    if (waUrl) return waUrl;

    const tgUrl = normalizeTelegramUrl(contactSettings.telegramUrl);
    if (tgUrl) return tgUrl;

    const mailSubject = encodeURIComponent(
      isAr ? `طلب منتج من متجر MBK: ${title}` : `MBK Store Order: ${title}`
    );
    return `mailto:${contactSettings.supportEmail || 'support@mbktrading.live'}?subject=${mailSubject}&body=${encodeURIComponent(orderMsg)}`;
  };

  const buildEarlyAccessHref = (): string => {
    const buyerEmail = userProfile?.email || '';
    const msg = isAr
      ? `مرحباً فريق MBK، أرغب بالاستفسار عن مؤشرات وروبوتات التداول الحصرية${buyerEmail ? ` — حسابي: ${buyerEmail}` : ''}`
      : `Hello MBK Team, I would like to inquire about early access to MBK Indicators & Algo Bots${buyerEmail ? ` — Account: ${buyerEmail}` : ''}`;

    const waUrl = buildWhatsAppUrl(contactSettings.whatsappNumber, msg);
    if (waUrl) return waUrl;

    const tgUrl = normalizeTelegramUrl(contactSettings.telegramUrl);
    if (tgUrl) return tgUrl;

    return `mailto:${contactSettings.supportEmail || 'support@mbktrading.live'}?body=${encodeURIComponent(msg)}`;
  };

  const openCreateModal = () => {
    soundManager.playClick();
    setEditorError('');
    setFormState({ ...EMPTY_FORM_STATE });
    setEditorOpen(true);
  };

  const openEditModal = (product: StoreProduct) => {
    soundManager.playClick();
    setEditorError('');
    setFormState({
      id: product.id,
      titleAr: product.titleAr,
      titleEn: product.titleEn,
      category: product.category,
      platform: product.platform,
      marketsInput: product.markets.join(', '),
      priceUsd: String(product.priceUsd),
      billingCycle: product.billingCycle,
      includedInElite: product.includedInElite,
      shortDescAr: product.shortDescAr,
      shortDescEn: product.shortDescEn,
      featuresArInput: product.featuresAr.join('\n'),
      featuresEnInput: product.featuresEn.join('\n'),
      imageUrl: product.imageUrl || '',
      demoUrl: product.demoUrl || '',
      checkoutUrl: product.checkoutUrl || '',
      badgeTextAr: product.badgeTextAr || '',
      badgeTextEn: product.badgeTextEn || '',
      isPublished: product.isPublished,
      sortOrder: String(product.sortOrder || 0),
      timestampMs: product.timestampMs
    });
    setEditorOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFileToDataUrl(file);
      setFormState((prev) => ({ ...prev, imageUrl: compressedDataUrl }));
    } catch {
      setEditorError(isAr ? 'تعذر معالجة الصورة المختارة.' : 'Could not process the selected image.');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitleAr = formState.titleAr.trim();
    const cleanTitleEn = formState.titleEn.trim() || cleanTitleAr;
    if (!cleanTitleAr) {
      setEditorError(isAr ? 'يرجى إدخال اسم المنتج بالعربية.' : 'Please enter the product title.');
      return;
    }

    setIsSaving(true);
    setEditorError('');

    try {
      const markets = formState.marketsInput
        .split(/[,،]+/)
        .map((m) => m.trim().toUpperCase())
        .filter(Boolean);

      const featuresAr = formState.featuresArInput
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const featuresEn = formState.featuresEnInput
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      await saveStoreProduct({
        id: formState.id,
        titleAr: cleanTitleAr,
        titleEn: cleanTitleEn,
        category: formState.category,
        platform: formState.platform.trim() || 'TradingView (Pine Script)',
        markets: markets.length > 0 ? markets : ['XAUUSD', 'US100'],
        priceUsd: Math.max(0, Number(formState.priceUsd) || 0),
        billingCycle: formState.billingCycle,
        includedInElite: formState.includedInElite,
        shortDescAr: formState.shortDescAr.trim(),
        shortDescEn: formState.shortDescEn.trim() || formState.shortDescAr.trim(),
        featuresAr,
        featuresEn: featuresEn.length > 0 ? featuresEn : featuresAr,
        imageUrl: formState.imageUrl.trim(),
        demoUrl: formState.demoUrl.trim(),
        checkoutUrl: formState.checkoutUrl.trim(),
        badgeTextAr: formState.badgeTextAr.trim(),
        badgeTextEn: formState.badgeTextEn.trim(),
        isPublished: formState.isPublished,
        sortOrder: Number(formState.sortOrder) || 0,
        timestampMs: formState.timestampMs
      });

      const refreshed = await fetchStoreProducts(true);
      setProducts(refreshed);
      setEditorOpen(false);
    } catch (err: any) {
      setEditorError(
        err?.message ||
          (isAr ? 'حدث خطأ أثناء حفظ المنتج في قاعدة البيانات.' : 'Failed to save product.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (product: StoreProduct) => {
    soundManager.playClick();
    setBusyProductId(product.id);
    try {
      await saveStoreProduct({
        ...product,
        isPublished: !product.isPublished
      });
      const refreshed = await fetchStoreProducts(true);
      setProducts(refreshed);
    } finally {
      setBusyProductId(null);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    soundManager.playClick();
    setBusyProductId(id);
    try {
      await deleteStoreProduct(id);
      const refreshed = await fetchStoreProducts(true);
      setProducts(refreshed);
      setConfirmDeleteId(null);
    } finally {
      setBusyProductId(null);
    }
  };

  return (
    <div className="space-y-4 bg-[#F0F3FA] dark:bg-[#06080c] text-[#131722] dark:text-[#D1D4DC]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. STORE HEADER & CATEGORY FILTER BAR */}
      <div className="bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 bg-[#F0F3FA] dark:bg-[#06080c] border-b border-[#E0E3EB] dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F5F2] dark:bg-[#10b981]/15 border border-[#B3E2D9] dark:border-[#10b981]/40 flex items-center justify-center text-[#089981] dark:text-[#10b981] shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#131722] dark:text-white flex items-center gap-2 flex-wrap">
                <span>
                  {isAr
                    ? 'متجر مؤشرات وروبوتات MBK المؤسسية'
                    : 'MBK Indicators & Algo Bots Store'}
                </span>
                <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-[#E6F5F2] dark:bg-[#089981]/15 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/30">
                  PINE SCRIPT & MT5
                </span>
              </h2>
              <p className="text-xs text-[#787B86] mt-0.5">
                {isAr
                  ? 'مؤشرات السيولة، خوارزميات التداول الآلي، وأدوات التنفيذ المخصصة للذهب (XAUUSD) والناسداك (US100)'
                  : 'Institutional liquidity indicators, automated trading bots, and execution suites for XAUUSD & US100'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-2.5 py-1.5 rounded-[4px] bg-[#F0F3FA] dark:bg-[#0b0e14] hover:bg-[#EDF1F7] dark:hover:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 text-xs font-semibold text-[#131722] dark:text-[#D1D4DC] flex items-center gap-1.5 cursor-pointer transition-colors"
              title={isAr ? 'تحديث المتجر' : 'Refresh Store'}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#089981] dark:text-[#10b981] ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Refresh'}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-3.5 py-1.5 rounded-[4px] bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? '+ إضافة منتج جديد' : '+ Add Product'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="px-4 py-2.5 bg-[#F0F3FA] dark:bg-[#0b0e14] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                {
                  id: 'indicator',
                  labelAr: 'مؤشرات TradingView',
                  labelEn: 'Indicators'
                },
                { id: 'algo_bot', labelAr: 'روبوتات التداول', labelEn: 'Algo Bots' },
                { id: 'bundle', labelAr: 'باقات متكاملة', labelEn: 'Bundles' }
              ] as Array<{ id: CategoryFilter; labelAr: string; labelEn: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setCategoryFilter(tab.id);
                }}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-colors cursor-pointer border ${
                  categoryFilter === tab.id
                    ? 'bg-[#10b981] text-white border-[#10b981]'
                    : 'bg-[#F0F3FA] dark:bg-[#06080c] text-[#787B86] hover:text-[#131722] dark:hover:text-[#D1D4DC] border-[#E0E3EB] dark:border-white/10'
                }`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {handlePlansClick && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                handlePlansClick();
              }}
              className="px-2.5 py-1 rounded-[4px] bg-[#FDF6E3] dark:bg-amber-500/15 hover:bg-amber-500/25 border border-[#EFE0B4] dark:border-amber-500/35 text-[#9A6700] dark:text-amber-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Crown className="w-3.5 h-3.5 text-[#9A6700] dark:text-amber-400" />
              <span>
                {isAr
                  ? 'باقة Elite تشمل المؤشرات المعتمدة مجاناً'
                  : 'Elite Plan includes select tools'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 2. PRODUCTS GRID OR ZERO-FAKE-DATA EMPTY STATE */}
      {isLoading ? (
        <div className="bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 rounded-xl p-12 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[#089981] dark:text-[#10b981] animate-spin mx-auto" />
          <p className="text-xs text-[#787B86] font-mono">
            {isAr ? 'جاري تحميل منتجات المتجر...' : 'Loading store products...'}
          </p>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 rounded-xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#E6F5F2] dark:bg-[#10b981]/15 border border-[#B3E2D9] dark:border-[#10b981]/35 flex items-center justify-center text-[#089981] dark:text-[#10b981] mx-auto">
            <Package className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm sm:text-base font-extrabold text-[#131722] dark:text-white">
              {isAr
                ? 'المتجر قيد التجهيز — سيتم إضافة مؤشرات وروبوتات MBK الحصرية قريباً'
                : 'MBK Indicators & Algo Bots Store launching soon'}
            </h3>
            <p className="text-xs text-[#787B86] leading-relaxed max-w-lg mx-auto">
              {isAr
                ? 'نعمل حالياً على توثيق وإطلاق أحدث مؤشرات السيولة المؤسسية وروبوتات التداول الآلي الخاصة بمنصة MBK. يمكنك التواصل مع فريق الدعم لحجز الوصول المبكر.'
                : 'Our quantitative desk is finalizing official TradingView Pine Script indicators and automated trading bots. Contact support for early access.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <a
              href={buildEarlyAccessHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-[4px] bg-[#089981] hover:bg-[#07846f] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {isAr
                  ? 'تواصل مع الدعم للوصول المبكر'
                  : 'Contact Support for Early Access'}
              </span>
            </a>

            {isAdmin && (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-[4px] bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? '+ إضافة أول منتج للمتجر' : '+ Add First Store Product'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleProducts.map((product) => {
            const catMeta = getCategoryMeta(product.category);
            const CatIcon = catMeta.icon;
            const title = isAr ? product.titleAr : product.titleEn;
            const shortDesc = isAr ? product.shortDescAr : product.shortDescEn;
            const features =
              isAr && product.featuresAr.length > 0
                ? product.featuresAr
                : product.featuresEn.length > 0
                ? product.featuresEn
                : product.featuresAr;
            const badgeText = isAr ? product.badgeTextAr : product.badgeTextEn;
            const isBusy = busyProductId === product.id;

            return (
              <div
                key={product.id}
                className={`bg-[#F0F3FA] dark:bg-[#0b0e14] border rounded-xl overflow-hidden flex flex-col justify-between transition-colors ${
                  !product.isPublished
                    ? 'border-[#EFE0B4] dark:border-amber-500/50 opacity-85'
                    : 'border-[#E0E3EB] dark:border-white/10 hover:border-[#10b981]/60'
                }`}
              >
                <div>
                  {/* Optional Preview Image */}
                  {product.imageUrl && (
                    <div className="w-full h-44 bg-[#F0F3FA] dark:bg-[#06080c] border-b border-[#E0E3EB] dark:border-white/10 relative overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {badgeText && (
                        <span className="absolute top-2.5 start-2.5 px-2 py-0.5 rounded-[3px] bg-[#10b981] text-white text-[10px] font-bold shadow">
                          {badgeText}
                        </span>
                      )}
                      {!product.isPublished && isAdmin && (
                        <span className="absolute top-2.5 end-2.5 px-2 py-0.5 rounded-[3px] bg-amber-500 text-black text-[10px] font-mono font-bold">
                          {isAr ? 'مخفي (مسودة)' : 'HIDDEN DRAFT'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Category, Platform & Elite Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-[3px] border text-[10px] font-bold flex items-center gap-1 ${catMeta.badgeClass}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          <span>{isAr ? catMeta.labelAr : catMeta.labelEn}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-[3px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#787B86] text-[10px] font-mono">
                          {product.platform}
                        </span>
                      </div>

                      {!product.imageUrl && badgeText && (
                        <span className="px-2 py-0.5 rounded-[3px] bg-[#E6F5F2] dark:bg-[#10b981]/20 text-[#089981] dark:text-[#10b981] border border-[#B3E2D9] dark:border-[#10b981]/40 text-[10px] font-bold">
                          {badgeText}
                        </span>
                      )}
                    </div>

                    {/* Included in Elite clickable pill */}
                    {product.includedInElite && (
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            if (handlePlansClick) {
                              soundManager.playClick();
                              handlePlansClick();
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#FDF6E3] dark:bg-amber-500/15 hover:bg-amber-500/25 border border-[#EFE0B4] dark:border-amber-500/35 text-[#9A6700] dark:text-amber-300 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          <Crown className="w-3 h-3 text-[#9A6700] dark:text-amber-400" />
                          <span>
                            {isAr
                              ? 'مشمول مجاناً ضمن باقة Elite — عرض الباقات'
                              : 'Included in Elite Tier — View Plans'}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Title & Short Description */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-extrabold text-[#131722] dark:text-white leading-snug">
                          {title}
                        </h3>
                        {!product.isPublished && !product.imageUrl && isAdmin && (
                          <span className="px-1.5 py-0.5 rounded-[3px] bg-[#FDF6E3] dark:bg-amber-500/20 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/40 text-[9px] font-mono font-bold shrink-0">
                            {isAr ? 'مخفي' : 'DRAFT'}
                          </span>
                        )}
                      </div>
                      {shortDesc && (
                        <p className="text-xs text-[#787B86] leading-relaxed">
                          {shortDesc}
                        </p>
                      )}
                    </div>

                    {/* Supported Markets */}
                    {product.markets.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-[#787B86] font-semibold">
                          {isAr ? 'الأسواق المدعومة:' : 'Markets:'}
                        </span>
                        {product.markets.map((mkt) => (
                          <span
                            key={mkt}
                            className="px-1.5 py-0.5 rounded-[3px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-[#D1D4DC] font-mono font-bold text-[10px]"
                          >
                            {mkt}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Features Checklist */}
                    {features.length > 0 && (
                      <ul className="space-y-1.5 pt-2 border-t border-[#E0E3EB] dark:border-white/10">
                        {features.map((feat, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-[#131722] dark:text-[#D1D4DC]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#089981] shrink-0 mt-0.5" />
                            <span className="leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Card Footer: Price + CTA + Admin Actions */}
                <div className="p-4 pt-3 bg-[#F0F3FA]/90 dark:bg-[#06080c]/70 border-t border-[#E0E3EB] dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-[#787B86] block">
                        {isAr ? 'السعر الرسمي' : 'License Price'}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-mono tabular-nums font-extrabold text-[#131722] dark:text-white">
                          {product.priceUsd === 0
                            ? isAr
                              ? 'مجاني'
                              : 'FREE'
                            : `$${product.priceUsd}`}
                        </span>
                        <span className="text-[10px] text-[#787B86] font-semibold">
                          {getBillingLabel(product.billingCycle)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {product.demoUrl && (
                        <a
                          href={product.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#0b0e14] hover:bg-[#EDF1F7] dark:hover:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-[#D1D4DC] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                          <span>{isAr ? 'عرض تجريبي' : 'View Demo'}</span>
                        </a>
                      )}

                      <a
                        href={buildOrderHref(product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-[4px] bg-[#089981] hover:bg-[#07846f] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{isAr ? 'اطلب الآن' : 'Order Now'}</span>
                      </a>
                    </div>
                  </div>

                  {/* Admin Controls Bar */}
                  {isAdmin && (
                    <div className="pt-2.5 border-t border-[#E0E3EB] dark:border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0b0e14] hover:bg-[#EDF1F7] dark:hover:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 text-[11px] font-semibold text-[#131722] dark:text-[#D1D4DC] flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 text-[#089981] dark:text-[#10b981]" />
                          <span>{isAr ? 'تعديل' : 'Edit'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePublish(product)}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0b0e14] hover:bg-[#EDF1F7] dark:hover:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 text-[11px] font-semibold text-[#131722] dark:text-[#D1D4DC] flex items-center gap-1 cursor-pointer"
                        >
                          {product.isPublished ? (
                            <>
                              <EyeOff className="w-3 h-3 text-[#9A6700] dark:text-amber-400" />
                              <span>{isAr ? 'إخفاء' : 'Hide'}</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-[#089981]" />
                              <span>{isAr ? 'نشر' : 'Publish'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {confirmDeleteId === product.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={isBusy}
                            className="px-2 py-1 rounded-[3px] bg-[#F23645] text-white text-[10px] font-bold cursor-pointer"
                          >
                            {isAr ? 'تأكيد الحذف' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 text-[#787B86] text-[10px] cursor-pointer"
                          >
                            {isAr ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(product.id)}
                          disabled={isBusy}
                          className="px-2 py-1 rounded-[3px] bg-[#FDECEE] dark:bg-[#F23645]/15 hover:bg-[#F23645]/25 border border-[#F5C2C7] dark:border-[#F23645]/30 text-[#D93848] dark:text-[#F23645] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{isAr ? 'حذف' : 'Delete'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. ADMIN PRODUCT EDITOR MODAL */}
      {isAdmin && editorOpen && (
        <div className="fixed inset-0 z-[90] bg-[#131722]/45 dark:bg-black/75 dark:backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl my-auto"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="px-4 py-3 bg-[#F0F3FA] dark:bg-[#06080c] border-b border-[#E0E3EB] dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#089981] dark:text-[#10b981]" />
                <h3 className="text-sm font-extrabold text-[#131722] dark:text-white">
                  {formState.id
                    ? isAr
                      ? 'تعديل بيانات المنتج في المتجر'
                      : 'Edit Store Product'
                    : isAr
                    ? 'إضافة مؤشر أو روبوت جديد للمتجر'
                    : 'Add New Store Product'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1 rounded text-[#787B86] hover:text-[#131722] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveProduct}
              className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto text-xs"
            >
              {editorError && (
                <div className="p-2.5 rounded bg-[#FDECEE] dark:bg-[#F23645]/15 border border-[#F5C2C7] dark:border-[#F23645]/40 text-[#D93848] dark:text-[#F23645] text-xs font-semibold">
                  {editorError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'اسم المنتج (بالعربية) *' : 'Title (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.titleAr}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, titleAr: e.target.value }))
                    }
                    placeholder={isAr ? 'مثال: مؤشر سيولة الذهب الذكي MBK' : 'Arabic title'}
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'اسم المنتج (بالإنجليزية)' : 'Title (English)'}
                  </label>
                  <input
                    type="text"
                    value={formState.titleEn}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, titleEn: e.target.value }))
                    }
                    placeholder="e.g. MBK Institutional Liquidity Suite"
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'التصنيف' : 'Category'}
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        category: e.target.value as StoreProductCategory
                      }))
                    }
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  >
                    <option value="indicator">
                      {isAr ? 'مؤشر TradingView' : 'TradingView Indicator'}
                    </option>
                    <option value="algo_bot">
                      {isAr ? 'روبوت تداول آلي' : 'Algo Trading Bot'}
                    </option>
                    <option value="bundle">
                      {isAr ? 'باقة متكاملة' : 'System Bundle'}
                    </option>
                    <option value="tool">
                      {isAr ? 'أداة تداول احترافية' : 'Pro Tool'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'المنصة' : 'Platform'}
                  </label>
                  <input
                    type="text"
                    value={formState.platform}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, platform: e.target.value }))
                    }
                    placeholder="TradingView (Pine Script) / MT5"
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'الأسواق (مفصولة بفاصلة)' : 'Markets (comma-separated)'}
                  </label>
                  <input
                    type="text"
                    value={formState.marketsInput}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, marketsInput: e.target.value }))
                    }
                    placeholder="XAUUSD, US100, EURUSD"
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white font-mono focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'السعر بالدولار ($)' : 'Price (USD)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formState.priceUsd}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, priceUsd: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white font-mono focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'نظام الدفع' : 'Billing Cycle'}
                  </label>
                  <select
                    value={formState.billingCycle}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        billingCycle: e.target.value as StoreBillingCycle
                      }))
                    }
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  >
                    <option value="one_time">
                      {isAr ? 'دفعة واحدة (مدى الحياة)' : 'One-Time'}
                    </option>
                    <option value="monthly">{isAr ? 'شهري' : 'Monthly'}</option>
                    <option value="yearly">{isAr ? 'سنوي' : 'Yearly'}</option>
                    <option value="free_for_elite">
                      {isAr ? 'مجاني لمشتركي Elite' : 'Free for Elite'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'ترتيب العرض (الأقل أولاً)' : 'Sort Order'}
                  </label>
                  <input
                    type="number"
                    value={formState.sortOrder}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, sortOrder: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white font-mono focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'وصف مختصر (بالعربية)' : 'Short Description (Arabic)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formState.shortDescAr}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, shortDescAr: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'وصف مختصر (بالإنجليزية)' : 'Short Description (English)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formState.shortDescEn}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, shortDescEn: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'المميزات بالعربية (كل ميزة في سطر)' : 'Features Arabic (1 per line)'}
                  </label>
                  <textarea
                    rows={3}
                    value={formState.featuresArInput}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, featuresArInput: e.target.value }))
                    }
                    placeholder={
                      isAr
                        ? 'تحديد مناطق السيولة المؤسسية تلقائياً\nتنبيهات فورية على الهاتف و TradingView'
                        : 'One feature per line'
                    }
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'المميزات بالإنجليزية (كل ميزة في سطر)' : 'Features English (1 per line)'}
                  </label>
                  <textarea
                    rows={3}
                    value={formState.featuresEnInput}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, featuresEnInput: e.target.value }))
                    }
                    placeholder="Automated institutional order block zones&#10;Real-time mobile & webhook alerts"
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>
              </div>

              {/* Screenshot URL or Upload */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC]">
                  {isAr
                    ? 'صورة الشارت أو الروبوت (رابط مباشر أو رفع صورة)'
                    : 'Chart / Bot Screenshot (URL or Upload)'}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="w-3.5 h-3.5 text-[#787B86] absolute start-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formState.imageUrl}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, imageUrl: e.target.value }))
                      }
                      placeholder="https://..."
                      className="w-full ps-8 pe-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                    />
                  </div>
                  <label className="px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] hover:bg-[#EDF1F7] dark:hover:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-[#D1D4DC] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                    <span>{isAr ? 'رفع صورة' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr
                      ? 'رابط الشراء المباشر (اتركه فارغاً للتحويل التلقائي لواتساب المنصة)'
                      : 'Direct Checkout URL (leave empty for WhatsApp order)'}
                  </label>
                  <input
                    type="text"
                    value={formState.checkoutUrl}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, checkoutUrl: e.target.value }))
                    }
                    placeholder={isAr ? 'تلقائي عبر واتساب/تيليجرام إذا ترك فارغاً' : 'Optional checkout URL'}
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'رابط العرض التجريبي / الفيديو (اختياري)' : 'Demo / Video URL (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formState.demoUrl}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, demoUrl: e.target.value }))
                    }
                    placeholder="https://www.tradingview.com/..."
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'شارة مميزة بالعربية (اختياري)' : 'Badge Text (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formState.badgeTextAr}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, badgeTextAr: e.target.value }))
                    }
                    placeholder={isAr ? 'مثال: الأكثر طلباً / جديد' : 'e.g. Best Seller'}
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#131722] dark:text-[#D1D4DC] mb-1">
                    {isAr ? 'شارة مميزة بالإنجليزية (اختياري)' : 'Badge Text (English)'}
                  </label>
                  <input
                    type="text"
                    value={formState.badgeTextEn}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, badgeTextEn: e.target.value }))
                    }
                    placeholder="e.g. BEST SELLER / NEW"
                    className="w-full px-3 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-[#E0E3EB] dark:border-white/10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.includedInElite}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        includedInElite: e.target.checked
                      }))
                    }
                    className="accent-[#10b981]"
                  />
                  <span className="text-xs font-semibold text-[#131722] dark:text-[#D1D4DC]">
                    {isAr ? 'مشمول مجاناً ضمن باقة Elite' : 'Included in Elite Tier'}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.isPublished}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        isPublished: e.target.checked
                      }))
                    }
                    className="accent-[#089981]"
                  />
                  <span className="text-xs font-semibold text-[#131722] dark:text-[#D1D4DC]">
                    {isAr ? 'منشور ومرئي لجميع الأعضاء' : 'Published & visible to users'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E0E3EB] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 rounded-[4px] bg-[#F0F3FA] dark:bg-[#06080c] hover:bg-[#EDF1F7] dark:hover:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 text-[#787B86] hover:text-[#131722] dark:hover:text-white text-xs font-semibold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-[4px] bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold cursor-pointer"
                >
                  {isSaving
                    ? isAr
                      ? 'جاري الحفظ...'
                      : 'Saving...'
                    : isAr
                    ? 'حفظ ونشر المنتج'
                    : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
