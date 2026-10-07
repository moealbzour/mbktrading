import React, { useState } from 'react';
import {
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Calendar,
  Send,
  Download,
  AlertTriangle,
  TrendingUp,
  Percent
} from 'lucide-react';

export const AccountManagementPanel: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    telegramHandle: '',
    phone: '',
    capitalTier: 'TIER_50K',
    preferredBroker: 'PARTNER_BROKER',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>خدمة إدارة المحافظ والحسابات المؤسسية (VIP Portfolio)</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Institutional Private
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              إدارة مهنية لرؤوس الأموال الكبرى عبر فريق أبحاث MBK والمحللين المعتمدين
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
            قبول محدود: 4 مقاعد متاحة هذا الشهر
          </span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Terms, Guarantees & Inquiry Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Institutional Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#0d131f] border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>حسابك باسمك وملكيتك 100%</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                لا نطلب إيداع أي سنت في حساباتنا إطلاقاً. حساب التداول مفتوح باسمك الشخصي لدى وسيط ECN مرخص عالمياً، وأنت الوحيد الذي تملك حق السحب والإيداع.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0d131f] border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Lock className="w-4 h-4" />
                <span>وقف خسارة قاطع عند 8% (Hard Drawdown)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                التزام صارم بنظام High-Water Mark. في حال تجاوز التراجع التراكمي نسبة 8% يتم إيقاف التداول آلياً لحماية رأس مال المستثمر دون مساومة.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0d131f] border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Percent className="w-4 h-4" />
                <span>تقاسم أرباح شهري عادل (20%)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                لا نتقاضى أي أتعاب أو رسوم إدارة ثابتة إطلاقاً (No Management Fee). أتعابنا فقط 20% من صافي الأرباح المحققة في نهاية كل شهر ميلادي.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0d131f] border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>تقارير شفافة وأداء موثق</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                ربط لحظي مع تطبيق الهاتف لمراقبة كل صفقة تنفذ بالثانية، مع كشوف حساب أسبوعية مفصلة تشمل حجم التداول ومعدل الفوز.
              </p>
            </div>
          </div>

          {/* Inquiry Application Form */}
          <div className="p-5 rounded-xl bg-[#0c121d] border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-1">
              طلب استشارة والانضمام لخدمة إدارة الحسابات
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              املأ البيانات التالية ليتواصل معك مدير العلاقات المؤسسية وفريق إدارة المحافظ لـ MBKtrading مباشرة عبر تيليجرام
            </p>

            {submitted ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-300">تم استلام طلبك بنجاح!</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  سيتواصل معك فريق أبحاث MBK وإدارة الأصول عبر حساب التيليجرام المدخل خلال أقل من ساعتين لمناقشة خطة الإدارة المناسبة لمحفظتك.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">الاسم الكامل:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: خالد المنصوري"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">معرف التيليجرام (@username):</label>
                    <input
                      type="text"
                      required
                      placeholder="@your_username"
                      value={formData.telegramHandle}
                      onChange={(e) => setFormData({ ...formData, telegramHandle: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">حجم المحفظة المراد إدارتها (USD):</label>
                    <select
                      value={formData.capitalTier}
                      onChange={(e) => setFormData({ ...formData, capitalTier: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="TIER_10K">$10,000 - $25,000 USD (الفئة الفضية)</option>
                      <option value="TIER_50K">$25,000 - $100,000 USD (الفئة الذهبية VIP)</option>
                      <option value="TIER_100K+">$100,000+ USD (الفئة المؤسسية Platinum)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">الوسيط المالي المفضل:</label>
                    <select
                      value={formData.preferredBroker}
                      onChange={(e) => setFormData({ ...formData, preferredBroker: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="PARTNER_BROKER">وسيط MBK المعتمد (أفضل سبريد وسرعة تنفيذ)</option>
                      <option value="IC_MARKETS">IC Markets ECN</option>
                      <option value="OTHER">وسيط مرخص آخر</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">ملاحظات إضافية أو أهداف استثمارية:</label>
                  <textarea
                    rows={3}
                    placeholder="أهداف الربح المستهدفة، مدة الاستثمار، متطلبات خاصة..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال طلب الانضمام لخدمة إدارة الحسابات</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Col: Performance Audit & Track Record */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0c121d] border border-slate-800 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 block">
              سجل الأداء الموثق (Audit Statement):
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between pb-1.5 border-b border-slate-800 text-slate-300">
                <span>متوسط العائد الشهري:</span>
                <span className="font-bold text-emerald-400 font-mono">+18.5% - 24%</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800 text-slate-300">
                <span>أقصى تراجع مسجل:</span>
                <span className="font-bold text-cyan-400 font-mono">5.2%</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800 text-slate-300">
                <span>نوع الصفقات:</span>
                <span className="font-bold text-slate-200">Day Trading & Scalping</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>الرافعة المالية المستخدمة:</span>
                <span className="font-bold text-amber-400 font-mono">1:30 - 1:100 كحد أقصى</span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="#download-statement"
                onClick={(e) => {
                  e.preventDefault();
                  alert('جاري تحميل كشف حساب التدقيق المدقق بصيغة PDF...');
                }}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>تحميل تقرير التدقيق (Myfxbook PDF)</span>
              </a>
            </div>
          </div>

          {/* Founder Quote */}
          <div className="p-4 rounded-xl bg-gradient-to-tr from-amber-950/20 to-[#101726] border border-amber-500/20 text-xs">
            <p className="text-slate-300 italic leading-relaxed">
              "في MBKtrading نعتبر رأس مال العميل أمانة مطلقة. سر استمراريتنا على مدار سنوات في أسواق المال هو أننا نفضل تفويت فرصة ربح على أن نخاطر بكسر قواعد إدارة المخاطر المؤسسية."
            </p>
            <div className="mt-2 text-left font-bold text-amber-400 text-[11px]">
              — فريق إدارة المخاطر وأبحاث السوق MBK
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
