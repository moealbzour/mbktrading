export interface EnrichedMacroMetadata {
  code: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  goldNasdaqImpactAr: string;
  goldNasdaqImpactEn: string;
  affectedAssets: string[];
}

export interface MacroTranslatorInput {
  title: string;
  currency: string;
  impact?: 'High' | 'Medium' | 'Low' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
}

interface IndicatorRule {
  code: string;
  pattern: RegExp;
  titleAr: string | ((currency: string, rawTitle: string) => string);
  summaryAr: string;
  summaryEn: string;
  goldNasdaqImpactAr?: string;
  goldNasdaqImpactEn?: string;
  affectedAssets?: string[];
}

const CURRENCY_NAME_AR: Record<string, string> = {
  USD: 'الأمريكي',
  EUR: 'الأوروبي',
  GBP: 'البريطاني',
  CAD: 'الكندي',
  JPY: 'الياباني',
  AUD: 'الأسترالي',
  CHF: 'السويسري',
  NZD: 'النيوزيلندي',
  CNY: 'الصيني'
};

const US_INFLATION_IMPACT_AR =
  'أعلى من المتوقع يدعم الدولار وعوائد السندات ← ضغط بيعي على الذهب (XAUUSD) والناسداك (US100) | أقل من المتوقع يضعف الدولار ← زخم صعودي للذهب والناسداك.';
const US_INFLATION_IMPACT_EN =
  'Higher-than-expected strengthens USD & Treasury yields -> bearish pressure on Gold (XAUUSD) & Nasdaq (US100) | Lower-than-expected weakens USD -> bullish momentum for Gold & Nasdaq.';

const US_GROWTH_JOBS_IMPACT_AR =
  'قراءة أقوى من المتوقع تعزز قوة الدولار وتقلص رهانات خفض الفائدة ← ضغط هبوطي على الذهب (XAUUSD) وتذبذب في الناسداك (US100) | قراءة أضعف تضعف الدولار ← صعود للذهب ودعم لأسهم التكنولوجيا.';
const US_GROWTH_JOBS_IMPACT_EN =
  'Stronger-than-expected data boosts USD and trims rate-cut bets -> downside pressure on Gold (XAUUSD) and mixed reaction on Nasdaq (US100) | Weaker data softens USD -> bullish for Gold.';

const FED_RATE_IMPACT_AR =
  'لهجة متشددة (Hawkish) أو تثبيت/رفع الفائدة يدعم الدولار بقوة ← هبوط حاد للذهب (XAUUSD) والناسداك (US100) | لهجة تيسيرية (Dovish) أو التلميح لخفض الفائدة ← انطلاقة صعودية قوية للذهب والناسداك.';
const FED_RATE_IMPACT_EN =
  'Hawkish tone or higher rates boosts USD & yields -> sharp downside on Gold (XAUUSD) & Nasdaq (US100) | Dovish tone or rate-cut signals -> strong bullish rally for Gold & Nasdaq.';

function extractPeriodSuffixAr(rawTitle: string): string {
  const suffixes: string[] = [];
  if (/\b(m\/m|mom)\b/i.test(rawTitle)) suffixes.push('شهرياً');
  if (/\b(y\/y|yoy)\b/i.test(rawTitle)) suffixes.push('سنوياً');
  if (/\b(q\/q|qoq)\b/i.test(rawTitle)) suffixes.push('ربع سنوياً');
  if (/\b(prelim|preliminary|flash|advance)\b/i.test(rawTitle)) suffixes.push('قراءة أولية');
  if (/\bfinal\b/i.test(rawTitle)) suffixes.push('قراءة نهائية');
  return suffixes.length > 0 ? ` (${suffixes.join(' - ')})` : '';
}

const INDICATOR_RULES: IndicatorRule[] = [
  // 0. CENTRAL BANK GOVERNOR / CHAIR SPEECHES
  {
    code: 'FED',
    pattern: /\b(fed chair|powell)\b.*\b(speaks|speech|testifies|testimony|remarks)\b|\b(powell speaks|fed chair powell)\b/i,
    titleAr: 'خطاب رئيس الاحتياطي الفيدرالي الأمريكي',
    summaryAr: 'تصريحات مباشرة لرئيس الفيدرالي تراقبها المؤسسات المالية لتسعير الفائدة الأمريكية.',
    summaryEn: 'Public remarks or congressional testimony by the Federal Reserve Chair watched closely for policy signals.',
    goldNasdaqImpactAr: FED_RATE_IMPACT_AR,
    goldNasdaqImpactEn: FED_RATE_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'BOC',
    pattern: /\b(boc gov|boc governor|macklem)\b.*\b(speaks|speech|remarks)\b|\b(boc gov\w* speech|macklem speaks)\b/i,
    titleAr: 'خطاب محافظ بنك كندا المركزي (BoC)',
    summaryAr: 'تصريحات محافظ بنك كندا المركزي حول التضخم وأسعار الفائدة الكندية.',
    summaryEn: 'Public speech by the Bank of Canada Governor offering guidance on CAD monetary policy and inflation.',
    goldNasdaqImpactAr:
      'نبرة متشددة تدعم الدولار الكندي (هبوط USDCAD) | نبرة تيسيرية تضعف الكندي وترفع زوج USDCAD.',
    goldNasdaqImpactEn:
      'Hawkish remarks strengthen CAD (lower USDCAD) | Dovish remarks soften CAD (higher USDCAD).',
    affectedAssets: ['USDCAD', 'WTI', 'XAUUSD']
  },
  {
    code: 'ECB',
    pattern: /\b(ecb president|lagarde)\b.*\b(speaks|speech|remarks)\b|\b(lagarde speaks|ecb president speech)\b/i,
    titleAr: 'خطاب رئيسة البنك المركزي الأوروبي (ECB)',
    summaryAr: 'تصريحات رئيسة البنك المركزي الأوروبي حول مسار الفائدة والتضخم في منطقة اليورو.',
    summaryEn: 'Public speech by the European Central Bank President regarding Eurozone inflation and interest rates.',
    goldNasdaqImpactAr:
      'نبرة متشددة تدعم اليورو (EURUSD) وتضغط على مؤشر الدولار (DXY) ← دعم غير مباشر للذهب (XAUUSD).',
    goldNasdaqImpactEn:
      'Hawkish ECB tone boosts EURUSD and weighs on DXY -> indirect bullish support for Gold (XAUUSD).',
    affectedAssets: ['EURUSD', 'XAUUSD', 'DXY']
  },
  {
    code: 'BOE',
    pattern: /\b(boe gov|boe governor|bailey)\b.*\b(speaks|speech|remarks)\b|\b(bailey speaks|boe gov\w* speech)\b/i,
    titleAr: 'خطاب محافظ بنك إنجلترا (BoE)',
    summaryAr: 'تصريحات محافظ بنك إنجلترا حول السياسة النقدية وأسعار الفائدة على الجنيه الإسترليني.',
    summaryEn: 'Public remarks by the Bank of England Governor on UK inflation and monetary policy.',
    goldNasdaqImpactAr:
      'تأثير مباشر على الجنيه الإسترليني (GBPUSD) وتقلبات أزواج الدولار والذهب.',
    goldNasdaqImpactEn:
      'Direct volatility impact on GBPUSD alongside broader USD and Gold flows.',
    affectedAssets: ['GBPUSD', 'EURUSD', 'XAUUSD']
  },
  {
    code: 'RBA',
    pattern: /\b(rba gov|rba governor|bullock)\b.*\b(speaks|speech|remarks)\b|\b(bullock speaks|rba gov\w* speech)\b/i,
    titleAr: 'خطاب محافظ البنك الاحتياطي الأسترالي (RBA)',
    summaryAr: 'تصريحات محافظ البنك الاحتياطي الأسترالي حول الفائدة والنمو وأسواق السلع.',
    summaryEn: 'Public speech by the Reserve Bank of Australia Governor on monetary policy and economic outlook.',
    goldNasdaqImpactAr:
      'قوة الدولار الأسترالي (AUDUSD) ترتبط إيجابياً مع شهية المخاطرة وأسعار الذهب (XAUUSD).',
    goldNasdaqImpactEn:
      'AUD strength correlates positively with commodity demand and Gold (XAUUSD).',
    affectedAssets: ['AUDUSD', 'XAUUSD', 'DXY']
  },
  {
    code: 'BOJ',
    pattern: /\b(boj gov|boj governor|ueda)\b.*\b(speaks|speech|remarks)\b|\b(ueda speaks|boj gov\w* speech)\b/i,
    titleAr: 'خطاب محافظ بنك اليابان المركزي (BoJ)',
    summaryAr: 'تصريحات محافظ بنك اليابان حول أسعار الفائدة اليابانية وعوائد السندات.',
    summaryEn: 'Public remarks by the Bank of Japan Governor regarding JPY interest rates and yield policy.',
    goldNasdaqImpactAr:
      'تشديد بنك اليابان يقوي الين (USDJPY هبوطاً) وقد يضغط على الناسداك (US100) بينما يدعم الذهب كملاذ آمن.',
    goldNasdaqImpactEn:
      'Hawkish BOJ strengthens JPY (lower USDJPY) and can pressure Nasdaq (US100) while supporting Gold.',
    affectedAssets: ['USDJPY', 'XAUUSD', 'US100']
  },
  {
    code: 'FED',
    pattern: /\b(fomc member|fed governor|fed vice chair|waller|williams|bostic|barkin|kashkari|daly|goolsbee|jefferson|bowman|cook|kugler|logan|musalem|hammack|schmid)\b.*\b(speaks|speech|remarks)\b/i,
    titleAr: 'خطاب عضو لجنة السياسة النقدية في الاحتياطي الفيدرالي الأمريكي',
    summaryAr: 'تصريحات أحد أعضاء الفيدرالي الأمريكي حول التضخم وسوق العمل ومسار أسعار الفائدة.',
    summaryEn: 'Remarks by a Federal Reserve official offering guidance on inflation, employment, and monetary policy.',
    goldNasdaqImpactAr: FED_RATE_IMPACT_AR,
    goldNasdaqImpactEn: FED_RATE_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'SPEECH',
    pattern: /\b(mpc member|ecb|boe|boc|rba|rbnz|snb|governor|deputy gov|assistant gov|president)\b.*\b(speaks|speech|remarks)\b/i,
    titleAr: (cur) => `خطاب مسؤول البنك المركزي (${CURRENCY_NAME_AR[cur] || cur})`,
    summaryAr: 'تصريحات رسمية من أحد صناع السياسة النقدية في البنك المركزي حول أسعار الفائدة والتضخم.',
    summaryEn: 'Official remarks by a central bank policymaker regarding interest rates and inflation outlook.',
    goldNasdaqImpactAr:
      'التصريحات المتشددة تدعم العملة المحلية مباشرة، بينما التصريحات التيسيرية تضغط عليها.',
    goldNasdaqImpactEn:
      'Hawkish comments support the local currency; dovish comments weigh on the currency.',
    affectedAssets: ['XAUUSD', 'EURUSD', 'DXY']
  },

  // 1. FED / FOMC DECISIONS & MINUTES
  {
    code: 'FOMC',
    pattern: /\b(federal funds rate|fed interest rate decision|fomc rate decision)\b/i,
    titleAr: 'قرار الفائدة الصادر عن الاحتياطي الفيدرالي الأمريكي (FOMC)',
    summaryAr: 'يحدد سعر الفائدة الرئيسي على الدولار الأمريكي وهو المحرك الأكبر للسيولة العالمية وعوائد السندات.',
    summaryEn: 'Sets the benchmark US Federal Funds target rate, the primary driver of global liquidity, Treasury yields, and USD valuation.',
    goldNasdaqImpactAr: FED_RATE_IMPACT_AR,
    goldNasdaqImpactEn: FED_RATE_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY', 'EURUSD']
  },
  {
    code: 'FOMC',
    pattern: /\b(fomc statement|fomc monetary policy statement)\b/i,
    titleAr: 'بيان السياسة النقدية للجنة الفيدرالية للسوق المفتوحة (FOMC)',
    summaryAr: 'البيان الرسمي للفيدرالي الأمريكي الذي يكشف توجهات أسعار الفائدة والتضخم والنمو في الاجتماعات القادمة.',
    summaryEn: 'Official FOMC policy statement detailing the Federal Reserve outlook on inflation, employment, and future rate path.',
    goldNasdaqImpactAr: FED_RATE_IMPACT_AR,
    goldNasdaqImpactEn: FED_RATE_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'FOMC',
    pattern: /\b(fomc economic projections|dot plot)\b/i,
    titleAr: 'التوقعات الاقتصادية للفيدرالي الأمريكي ومخطط الفائدة (Dot Plot)',
    summaryAr: 'توقعات أعضاء الفيدرالي لمسار أسعار الفائدة والتضخم والنمو خلال السنوات الثلاث المقبلة.',
    summaryEn: 'Quarterly FOMC projections for interest rates (Dot Plot), inflation, GDP growth, and unemployment.',
    goldNasdaqImpactAr: FED_RATE_IMPACT_AR,
    goldNasdaqImpactEn: FED_RATE_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'FOMC',
    pattern: /\b(fomc press conference)\b/i,
    titleAr: 'المؤتمر الصحفي للجنة الاحتياطي الفيدرالي الأمريكي (FOMC)',
    summaryAr: 'المؤتمر الصحفي المباشر لرئيس الفيدرالي عقب قرار الفائدة للإجابة على أسئلة الصحافة حول مستقبل السياسة النقدية.',
    summaryEn: 'Live press conference following the FOMC decision where the Fed Chair answers questions on monetary policy.',
    goldNasdaqImpactAr: FED_RATE_IMPACT_AR,
    goldNasdaqImpactEn: FED_RATE_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'FOMC',
    pattern: /\b(fomc meeting minutes|fomc minutes)\b/i,
    titleAr: 'محضر اجتماع اللجنة الفيدرالية للسوق المفتوحة (FOMC Minutes)',
    summaryAr: 'يكشف تفاصيل النقاشات الداخلية لأعضاء الفيدرالي ومدى إجماعهم على رفع أو خفض أسعار الفائدة.',
    summaryEn: 'Detailed record of the FOMC policy meeting providing insights into committee members views on inflation and rates.',
    goldNasdaqImpactAr: FED_RATE_IMPACT_AR,
    goldNasdaqImpactEn: FED_RATE_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },

  // 2. CPI & INFLATION
  {
    code: 'CPI',
    pattern: /\b(core cpi|core consumer price index)\b/i,
    titleAr: (cur, raw) =>
      `مؤشر أسعار المستهلكين الأساسي (Core CPI) ${CURRENCY_NAME_AR[cur] || cur}${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'يقيس التغير في أسعار السلع والخدمات باستثناء الغذاء والطاقة، ويعد المقياس الأدق لاتجاه التضخم الحقيقي.',
    summaryEn: 'Measures changes in consumer prices excluding volatile food and energy components; primary gauge of underlying inflation.',
    goldNasdaqImpactAr: US_INFLATION_IMPACT_AR,
    goldNasdaqImpactEn: US_INFLATION_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY', 'EURUSD']
  },
  {
    code: 'CPI',
    pattern: /\b(cpi|consumer price index|hicp)\b/i,
    titleAr: (cur, raw) =>
      `مؤشر أسعار المستهلكين والتضخم (CPI) ${CURRENCY_NAME_AR[cur] || cur}${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'المقياس الرئيسي للتضخم وتكلفة المعيشة، ويؤثر مباشرة على قرارات البنوك المركزية بشأن أسعار الفائدة.',
    summaryEn: 'Headline inflation gauge tracking retail price changes across the economy; directly drives central bank rate decisions.',
    goldNasdaqImpactAr: US_INFLATION_IMPACT_AR,
    goldNasdaqImpactEn: US_INFLATION_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY', 'EURUSD']
  },
  {
    code: 'PCE',
    pattern: /\b(core pce|core personal consumption expenditures)\b/i,
    titleAr: (_, raw) =>
      `مؤشر نفقات الاستهلاك الشخصي الأساسي (Core PCE)${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'المؤشر المفضل رسمياً لدى الاحتياطي الفيدرالي الأمريكي لقياس التضخم وتحديد هدف 2%.',
    summaryEn: 'The Federal Reserve preferred inflation measure tracking core consumer spending price changes.',
    goldNasdaqImpactAr: US_INFLATION_IMPACT_AR,
    goldNasdaqImpactEn: US_INFLATION_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'PCE',
    pattern: /\b(pce price index|personal consumption expenditures)\b/i,
    titleAr: (_, raw) => `مؤشر نفقات الاستهلاك الشخصي (PCE)${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'يرصد تغيرات الأسعار في إنفاق المستهلكين الأمريكيين ويعد مرجعاً رئيسياً لسياسة الفيدرالي.',
    summaryEn: 'Tracks price changes in consumer goods and services purchased by US households.',
    goldNasdaqImpactAr: US_INFLATION_IMPACT_AR,
    goldNasdaqImpactEn: US_INFLATION_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'PPI',
    pattern: /\b(core ppi|core producer price index)\b/i,
    titleAr: (cur, raw) =>
      `مؤشر أسعار المنتجين الأساسي (Core PPI) ${CURRENCY_NAME_AR[cur] || cur}${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'يقيس تضخم تكاليف الإنتاج بالجملة باستثناء الغذاء والطاقة، ويعتبر مؤشراً استباقياً لتضخم المستهلكين CPI.',
    summaryEn: 'Measures wholesale producer inflation excluding food and energy; acts as a leading indicator for consumer CPI.',
    goldNasdaqImpactAr: US_INFLATION_IMPACT_AR,
    goldNasdaqImpactEn: US_INFLATION_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'PPI',
    pattern: /\b(ppi|producer price index)\b/i,
    titleAr: (cur, raw) =>
      `مؤشر أسعار المنتجين (PPI) ${CURRENCY_NAME_AR[cur] || cur}${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'يقيس التغير في أسعار البيع التي يتلقاها المنتجون المحليون، وينعكس لاحقاً على أسعار المستهلكين.',
    summaryEn: 'Measures average changes in selling prices received by domestic producers for their output.',
    goldNasdaqImpactAr: US_INFLATION_IMPACT_AR,
    goldNasdaqImpactEn: US_INFLATION_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },

  // 3. EMPLOYMENT / NFP / JOBLESS CLAIMS
  {
    code: 'NFP',
    pattern: /\b(non-farm employment change|nonfarm payrolls|non-farm payrolls|nfp)\b/i,
    titleAr: 'تقرير الوظائف بالقطاع غير الزراعي الأمريكي (NFP)',
    summaryAr: 'أهم تقرير شهري لسوق العمل الأمريكي؛ يقيس عدد الوظائف الجديدة المستحدثة خارج القطاع الزراعي.',
    summaryEn: 'Premier monthly US labor report measuring net new jobs added across non-agricultural sectors.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY', 'EURUSD']
  },
  {
    code: 'NFP',
    pattern: /\b(average hourly earnings)\b/i,
    titleAr: (_, raw) => `متوسط الأجور في الساعة الأمريكية${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'يقيس تضخم الأجور والرواتب في الولايات المتحدة، وهو مكون حاسم في معادلة التضخم لدى الفيدرالي.',
    summaryEn: 'Measures wage growth inflation across the US labor force; closely watched by the Fed for wage-price spiral risks.',
    goldNasdaqImpactAr: US_INFLATION_IMPACT_AR,
    goldNasdaqImpactEn: US_INFLATION_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'JOBS',
    pattern: /\b(unemployment rate|claimant count rate)\b/i,
    titleAr: (cur) => `معدل البطالة ${CURRENCY_NAME_AR[cur] || cur}`,
    summaryAr: 'يقيس النسبة المئوية للقوى العاملة العاطلة عن العمل والباحثة عنه بنشاط.',
    summaryEn: 'Percentage of the total workforce that is unemployed and actively seeking employment.',
    goldNasdaqImpactAr:
      'ارتفاع البطالة أعلى من المتوقع يضعف العملة ويزيد احتمالات خفض الفائدة ← إيجابي للذهب (XAUUSD) | انخفاض البطالة يدعم العملة ← ضغط على الذهب.',
    goldNasdaqImpactEn:
      'Higher unemployment softens USD and increases rate-cut odds -> bullish for Gold (XAUUSD) | Lower unemployment strengthens USD -> bearish pressure on Gold.',
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'ADP',
    pattern: /\b(adp non-farm|adp employment|adp national employment)\b/i,
    titleAr: 'تغير التوظيف بالقطاع الخاص الأمريكي (ADP)',
    summaryAr: 'يرصد التغير الشهري في وظائف القطاع الخاص الأمريكي ويعد مؤشراً استباقياً لتقرير الوظائف الرسمي NFP.',
    summaryEn: 'Measures monthly change in private-sector US employment based on ADP payroll data, serving as a preview to NFP.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'JOLTS',
    pattern: /\b(jolts job openings|job openings)\b/i,
    titleAr: 'فرص العمل الشاغرة الأمريكية (JOLTS)',
    summaryAr: 'يقيس حجم الطلب على العمالة في الاقتصاد الأمريكي وعدد الوظائف الشاغرة غير المشغولة.',
    summaryEn: 'Tracks total US job vacancies, a key Fed barometer of labor demand tightness.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'CLAIMS',
    pattern: /\b(initial jobless claims|unemployment claims)\b/i,
    titleAr: 'معدلات الشكاوى الأسبوعية من البطالة الأمريكية',
    summaryAr: 'يقيس عدد الأفراد الذين تقدموا بطلبات إعانة بطالة لأول مرة خلال الأسبوع الماضي.',
    summaryEn: 'Weekly count of individuals filing for unemployment insurance for the first time.',
    goldNasdaqImpactAr:
      'ارتفاع طلبات البطالة أعلى من المتوقع يشير لتباطؤ سوق العمل ويضعف الدولار ← صعود للذهب (XAUUSD) | انخفاض الطلبات يدعم الدولار ← ضغط على الذهب.',
    goldNasdaqImpactEn:
      'Higher jobless claims signal labor cooling and weaken USD -> bullish for Gold (XAUUSD) | Lower claims strengthen USD -> pressure on Gold.',
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'CLAIMS',
    pattern: /\b(continuing jobless claims|continuing claims)\b/i,
    titleAr: 'طلبات إعانة البطالة المستمرة الأمريكية',
    summaryAr: 'يقيس إجمالي العاطلين المستمرين في تلقي إعانات البطالة الأسبوعية.',
    summaryEn: 'Measures the number of unemployed workers who continue to qualify for benefits.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'JOBS',
    pattern: /\b(employment change|claimant count change)\b/i,
    titleAr: (cur) => `التغير في التوظيف وسوق العمل (${cur})`,
    summaryAr: 'يقيس عدد الوظائف المستحدثة أو المفقودة في الاقتصاد خلال الشهر الماضي.',
    summaryEn: 'Measures the net change in the number of employed people during the previous period.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },

  // 4. GDP / RETAIL SALES / CONSUMER / DURABLE GOODS
  {
    code: 'GDP',
    pattern: /\b(gdp|gross domestic product)\b/i,
    titleAr: (cur, raw) =>
      `الناتج المحلي الإجمالي (GDP) ${CURRENCY_NAME_AR[cur] || cur}${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'المقياس الأشمل للنشاط الاقتصادي والنمو الكلي للسلع والخدمات المنتجة داخل الدولة.',
    summaryEn: 'Broadest measure of total economic output and overall economic health.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'RETAIL',
    pattern: /\b(core retail sales)\b/i,
    titleAr: (cur, raw) =>
      `مبيعات التجزئة الأساسية ${CURRENCY_NAME_AR[cur] || cur}${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'يقيس إنفاق المستهلكين باستثناء مبيعات السيارات المتقلبة، ويمثل العمود الفقري للنمو الاقتصادي.',
    summaryEn: 'Tracks consumer retail spending excluding automobiles, reflecting core household demand.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'RETAIL',
    pattern: /\b(retail sales)\b/i,
    titleAr: (cur, raw) =>
      `مبيعات التجزئة ${CURRENCY_NAME_AR[cur] || cur}${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'يقيس إجمالي مبيعات السلع الاستهلاكية ويعكس قوة الطلب الاستهلاكي في الاقتصاد.',
    summaryEn: 'Total receipts of retail stores, measuring consumer spending strength.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'PMI',
    pattern: /\b(ism manufacturing pmi|ism manufacturing)\b/i,
    titleAr: 'مؤشر مديري المشتريات الصناعي الأمريكي (ISM Manufacturing PMI)',
    summaryAr: 'يقيس صحة القطاع الصناعي الأمريكي؛ القراءة فوق 50 تعني توسعاً وتحت 50 تعني انكماشاً.',
    summaryEn: 'Leading gauge of US manufacturing activity; readings above 50 indicate expansion, below 50 contraction.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'PMI',
    pattern: /\b(ism services pmi|ism non-manufacturing)\b/i,
    titleAr: 'مؤشر مديري المشتريات الخدمي الأمريكي (ISM Services PMI)',
    summaryAr: 'يرصد أداء قطاع الخدمات الذي يشكل أكثر من 70% من النشاط الاقتصادي الأمريكي.',
    summaryEn: 'Measures business conditions in the US services sector, representing over 70% of US GDP.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'PMI',
    pattern: /\b(manufacturing pmi)\b/i,
    titleAr: (cur, raw) =>
      `مؤشر مديري المشتريات الصناعي (PMI) ${CURRENCY_NAME_AR[cur] || cur}${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'مسح شهري لمديري المشتريات في القطاع الصناعي لتقييم الطلبات الجديدة والإنتاج والتوظيف.',
    summaryEn: 'Monthly survey of manufacturing purchasing managers tracking new orders, output, and employment.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'PMI',
    pattern: /\b(services pmi)\b/i,
    titleAr: (cur, raw) =>
      `مؤشر مديري المشتريات الخدمي (PMI) ${CURRENCY_NAME_AR[cur] || cur}${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'يقيس مستوى النشاط التجاري في قطاع الخدمات؛ القراءة فوق 50 تشير إلى نمو.',
    summaryEn: 'Tracks business activity across the services sector; above 50 signals expansion.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'PMI',
    pattern: /\b(pmi|flash pmi|composite pmi)\b/i,
    titleAr: (cur, raw) =>
      `مؤشر مديري المشتريات المركب (PMI) ${CURRENCY_NAME_AR[cur] || cur}${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'مؤشر رائد لقياس قوة النشاط الاقتصادي في قطاعي الصناعة والخدمات.',
    summaryEn: 'Leading economic indicator combining manufacturing and services sector purchasing surveys.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'CONF',
    pattern: /\b(cb consumer confidence|consumer confidence)\b/i,
    titleAr: (cur) => `مؤشر ثقة المستهلك ${CURRENCY_NAME_AR[cur] || cur}`,
    summaryAr: 'يقيس مدى تفاؤل المستهلكين بشأن الوضع الاقتصادي والمالي وقدرتهم على الإنفاق.',
    summaryEn: 'Measures consumer optimism regarding economic conditions, labor prospects, and spending intentions.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'UOM',
    pattern: /\b(uom consumer sentiment|michigan consumer sentiment|consumer sentiment)\b/i,
    titleAr: (_, raw) => `مؤشر جامعة ميشيغان لثقة المستهلك الأمريكي${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'استطلاع جامعة ميشيغان الشهير لتقييم ثقة المستهلك الأمريكي وتوقعاته للتضخم.',
    summaryEn: 'University of Michigan survey gauging US consumer confidence and inflation expectations.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'UOM',
    pattern: /\b(uom inflation expectations|michigan inflation expectations|inflation expectations)\b/i,
    titleAr: 'توقعات التضخم لجامعة ميشيغان الأمريكية',
    summaryAr: 'يقيس النسبة التي يتوقع المستهلكون أن ترتفع بها الأسعار خلال العام القادم.',
    summaryEn: 'Measures the percentage that consumers expect prices of goods and services to change over the next 12 months.',
    goldNasdaqImpactAr: US_INFLATION_IMPACT_AR,
    goldNasdaqImpactEn: US_INFLATION_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'DURABLE',
    pattern: /\b(core durable goods|durable goods orders)\b/i,
    titleAr: (_, raw) => `طلبيات السلع المعمرة الأمريكية${extractPeriodSuffixAr(raw)}`,
    summaryAr: 'يقيس قيمة طلبات الشراء للسلع الصناعية طويلة الأجل ويعكس قوة الاستثمار الرأسمالي للشركات.',
    summaryEn: 'Measures new orders placed with domestic manufacturers for long-lasting capital goods.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'HOUSING',
    pattern: /\b(building permits|housing starts|existing home sales|new home sales|pending home sales)\b/i,
    titleAr: 'بيانات قطاع الإسكان وتصاريح البناء الأمريكية',
    summaryAr: 'يرصد مبيعات المنازل وتصاريح البناء الجديدة كمقياس لحساسية الاقتصاد تجاه أسعار الفائدة المرتفعة.',
    summaryEn: 'Tracks residential construction and home sales, reflecting interest-rate sensitivity across the housing market.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'MFG',
    pattern: /\b(empire state manufacturing|philly fed manufacturing|philadelphia fed|richmond manufacturing)\b/i,
    titleAr: 'مؤشر الفيدرالي للنشاط الصناعي الإقليمي الأمريكي',
    summaryAr: 'مسح إقليمي يصدر عن بنوك الاحتياطي الفيدرالي لتقييم ظروف التصنيع والأسعار.',
    summaryEn: 'Regional Federal Reserve manufacturing survey measuring general business conditions.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },
  {
    code: 'OIL',
    pattern: /\b(crude oil inventories|eia crude oil)\b/i,
    titleAr: 'مخزونات النفط الخام الأمريكية (EIA)',
    summaryAr: 'يقيس التغير الأسبوعي في عدد براميل النفط الخام المخزنة لدى الشركات الأمريكية.',
    summaryEn: 'Weekly change in the number of barrels of commercial crude oil held by US firms.',
    goldNasdaqImpactAr:
      'انخفاض المخزونات أكثر من المتوقع يدعم صعود النفط (WTI) | ارتفاع المخزونات يضغط سلباً على أسعار النفط.',
    goldNasdaqImpactEn:
      'Larger-than-expected inventory draw supports WTI Crude Oil prices | Inventory build puts bearish pressure on WTI.',
    affectedAssets: ['WTI', 'USDCAD', 'XAUUSD']
  },
  {
    code: 'TREASURY',
    pattern: /\b(10-y bond auction|30-y bond auction|treasury currency report)\b/i,
    titleAr: 'مزاد سندات الخزانة الأمريكية طويلة الأجل',
    summaryAr: 'يرصد عوائد سندات الخزانة الأمريكية ومستوى طلب المؤسسات السيادية على الديون الأمريكية.',
    summaryEn: 'Measures yield and institutional demand (bid-to-cover ratio) for long-term US Treasury debt.',
    goldNasdaqImpactAr:
      'ارتفاع العائد في المزاد يضغط مباشرة على الذهب (XAUUSD) وأسهم الناسداك (US100) | انخفاض العائد يدعم صعود الذهب والناسداك.',
    goldNasdaqImpactEn:
      'Higher auction yields pressure Gold (XAUUSD) & Nasdaq (US100) | Lower yields support Gold & tech equities.',
    affectedAssets: ['XAUUSD', 'US100', 'DXY']
  },

  // 5. MAJOR CENTRAL BANK RATE DECISIONS (ECB / BOE / BOC / BOJ / RBA / RBNZ / SNB)
  {
    code: 'ECB',
    pattern: /\b(main refinancing rate|ecb interest rate|monetary policy statement|ecb press conference)\b/i,
    titleAr: 'قرار الفائدة والمؤتمر الصحفي للبنك المركزي الأوروبي (ECB)',
    summaryAr: 'يحدد أسعار الفائدة على اليورو ومسار السياسة النقدية في منطقة اليورو.',
    summaryEn: 'European Central Bank rate decision and policy guidance impacting EUR valuation and European bond yields.',
    goldNasdaqImpactAr:
      'تشديد المركزي الأوروبي يدعم اليورو (EURUSD) ويضغط على مؤشر الدولار (DXY) ← يدعم الذهب (XAUUSD) بشكل غير مباشر.',
    goldNasdaqImpactEn:
      'Hawkish ECB strengthens EURUSD and weighs on DXY -> indirect support to Gold (XAUUSD).',
    affectedAssets: ['EURUSD', 'XAUUSD', 'DXY']
  },
  {
    code: 'BOE',
    pattern: /\b(official bank rate|mpc official bank rate votes|boe monetary policy|monetary policy summary)\b/i,
    titleAr: 'قرار الفائدة وتصويت لجنة السياسة النقدية لبنك إنجلترا (BOE)',
    summaryAr: 'يحدد سعر الفائدة الرسمي على الجنيه الإسترليني وتوزيع أصوات أعضاء لجنة السياسة النقدية البريطانية.',
    summaryEn: 'Bank of England benchmark interest rate decision and MPC voting breakdown for GBP.',
    goldNasdaqImpactAr:
      'رفع الفائدة أو نبرة متشددة تدعم الجنيه الإسترليني (GBPUSD) بقوة وتزيد التقلبات على أزواج الدولار والذهب.',
    goldNasdaqImpactEn:
      'Hawkish BOE or rate hike boosts GBPUSD and drives volatility across USD majors and Gold.',
    affectedAssets: ['GBPUSD', 'EURUSD', 'XAUUSD']
  },
  {
    code: 'BOC',
    pattern: /\b(overnight rate|boc rate statement|boc press conference)\b/i,
    titleAr: 'قرار الفائدة وبيان السياسة النقدية لبنك كندا المركزي (BOC)',
    summaryAr: 'يحدد سعر الفائدة الرئيسي على الدولار الكندي وتوجهات بنك كندا حيال التضخم والنمو.',
    summaryEn: 'Bank of Canada overnight rate decision and monetary policy statement driving CAD pairs.',
    goldNasdaqImpactAr:
      'تأثير مباشر وقوي على زوج الدولار كندي (USDCAD) بالتزامن مع تحركات النفط (WTI) والدولار الأمريكي.',
    goldNasdaqImpactEn:
      'Direct high-volatility impact on USDCAD alongside WTI Crude and broad USD flows.',
    affectedAssets: ['USDCAD', 'WTI', 'XAUUSD']
  },
  {
    code: 'BOJ',
    pattern: /\b(boj policy rate|boj press conference|boj outlook report)\b/i,
    titleAr: 'قرار الفائدة وبيان السياسة النقدية لبنك اليابان المركزي (BOJ)',
    summaryAr: 'يحدد أسعار الفائدة اليابانية وسياسة التحكم في منحنى العائد، ويؤثر بشدة على سيولة الأسواق العالمية.',
    summaryEn: 'Bank of Japan interest rate and yield-curve policy decision impacting JPY carry trades and global risk assets.',
    goldNasdaqImpactAr:
      'تشديد بنك اليابان يقوي الين (USDJPY هبوطاً) وقد يضغط على أسهم الناسداك (US100) بينما يدعم الذهب كملاذ آمن.',
    goldNasdaqImpactEn:
      'Hawkish BOJ strengthens JPY (lower USDJPY) and can unwind carry trades on Nasdaq (US100) while supporting Gold.',
    affectedAssets: ['USDJPY', 'XAUUSD', 'US100']
  },
  {
    code: 'RBA',
    pattern: /\b(cash rate|rba rate statement|rba press conference)\b/i,
    titleAr: 'قرار الفائدة وبيان البنك الاحتياطي الأسترالي (RBA)',
    summaryAr: 'يحدد سعر الفائدة الرسمي على الدولار الأسترالي الذي يرتبط وثيقاً بأسواق السلع والذهب.',
    summaryEn: 'Reserve Bank of Australia cash rate decision and policy guidance for AUD and commodity currencies.',
    goldNasdaqImpactAr:
      'قوة الدولار الأسترالي ترتبط إيجابياً مع شهية المخاطرة وأسعار الذهب (XAUUSD).',
    goldNasdaqImpactEn:
      'AUD strength correlates positively with commodity demand and Gold (XAUUSD).',
    affectedAssets: ['AUDUSD', 'XAUUSD', 'DXY']
  },
  {
    code: 'SNB',
    pattern: /\b(snb policy rate|snb monetary policy assessment|snb press conference)\b/i,
    titleAr: 'قرار الفائدة للبنك الوطني السويسري (SNB)',
    summaryAr: 'يحدد سعر الفائدة على الفرنك السويسري، أحد أهم عملات الملاذ الآمن إلى جانب الذهب.',
    summaryEn: 'Swiss National Bank policy rate decision impacting safe-haven CHF flows.',
    goldNasdaqImpactAr:
      'يتحرك الفرنك السويسري (USDCHF) غالباً في ارتباط وثيق مع الذهب (XAUUSD) خلال تحولات السياسة النقدية.',
    goldNasdaqImpactEn:
      'Safe-haven CHF moves often correlate with Gold (XAUUSD) reactions during policy shifts.',
    affectedAssets: ['USDCHF', 'XAUUSD', 'EURUSD']
  },
  {
    code: 'RBNZ',
    pattern: /\b(official cash rate|rbnz rate statement|rbnz monetary policy)\b/i,
    titleAr: 'قرار الفائدة لبنك الاحتياطي النيوزيلندي (RBNZ)',
    summaryAr: 'يحدد سعر الفائدة الرسمي على الدولار النيوزيلندي وتوجهات السياسة النقدية.',
    summaryEn: 'Reserve Bank of New Zealand Official Cash Rate decision and policy statement.',
    goldNasdaqImpactAr:
      'يؤثر بشكل مباشر على أزواج الدولار النيوزيلندي (NZDUSD) وعملات السلع.',
    goldNasdaqImpactEn:
      'Directly impacts NZDUSD and commodity-linked FX sentiment.',
    affectedAssets: ['NZDUSD', 'AUDUSD', 'DXY']
  },
  {
    code: 'GER',
    pattern: /\b(german zew|zew economic sentiment|german ifo|ifo business climate)\b/i,
    titleAr: 'مؤشر الثقة ومناخ الأعمال الألماني (ZEW / Ifo)',
    summaryAr: 'يقيس ثقة المستثمرين والشركات في أكبر اقتصاد داخل منطقة اليورو.',
    summaryEn: 'Leading survey of institutional investors and business leaders in Germany, Europe largest economy.',
    goldNasdaqImpactAr:
      'قراءة إيجابية تدعم اليورو (EURUSD) وتضغط على مؤشر الدولار (DXY) ← يصب في صالح الذهب (XAUUSD).',
    goldNasdaqImpactEn:
      'Stronger German sentiment boosts EURUSD and softens DXY -> supports Gold (XAUUSD).',
    affectedAssets: ['EURUSD', 'XAUUSD', 'DXY']
  },
  {
    code: 'TRADE',
    pattern: /\b(trade balance|current account)\b/i,
    titleAr: (cur) => `الميزان التجاري والحساب الجاري (${cur})`,
    summaryAr: 'يقيس الفرق بين قيمة الصادرات والواردات من السلع والخدمات.',
    summaryEn: 'Measures the difference in value between imported and exported goods and services.',
    goldNasdaqImpactAr: US_GROWTH_JOBS_IMPACT_AR,
    goldNasdaqImpactEn: US_GROWTH_JOBS_IMPACT_EN,
    affectedAssets: ['XAUUSD', 'EURUSD', 'DXY']
  }
];

function translateGenericTitleToArabic(rawTitle: string, currency: string): string {
  const clean = rawTitle.trim();
  if (/[\u0600-\u06FF]/.test(clean)) return clean;

  const text = clean
    .replace(/\bBoC Gov\w*\b/gi, 'محافظ بنك كندا')
    .replace(/\bBoE Gov\w*\b/gi, 'محافظ بنك إنجلترا')
    .replace(/\bRBA Gov\w*\b/gi, 'محافظ الاحتياطي الأسترالي')
    .replace(/\bBoJ Gov\w*\b/gi, 'محافظ بنك اليابان')
    .replace(/\bECB President\b/gi, 'رئيسة المركزي الأوروبي')
    .replace(/\bFed Chair\b/gi, 'رئيس الفيدرالي الأمريكي')
    .replace(/\bm\/m\b|\bmom\b/gi, 'شهرياً')
    .replace(/\by\/y\b|\byoy\b/gi, 'سنوياً')
    .replace(/\bq\/q\b|\bqoq\b/gi, 'ربع سنوياً')
    .replace(/\bpreliminary\b|\bprelim\b|\bflash\b/gi, 'أولي')
    .replace(/\bfinal\b/gi, 'نهائي')
    .replace(/\bspeaks\b|\bspeech\b/gi, 'خطاب')
    .replace(/\bpress conference\b/gi, 'مؤتمر صحفي')
    .replace(/\bmonetary policy\b/gi, 'السياسة النقدية')
    .replace(/\binterest rate\b/gi, 'سعر الفائدة')
    .replace(/\binflation\b/gi, 'التضخم')
    .replace(/\bmanufacturing\b/gi, 'الصناعي')
    .replace(/\bservices\b/gi, 'الخدمي')
    .replace(/\bindustrial production\b/gi, 'الإنتاج الصناعي')
    .replace(/\bcapacity utilization\b/gi, 'معدل استغلال الطاقة الإنتاجية')
    .replace(/\bconsumer credit\b/gi, 'ائتمان المستهلك')
    .replace(/\bwholesale inventories\b/gi, 'مخزونات الجملة')
    .replace(/\bbusiness inventories\b/gi, 'مخزونات الأعمال')
    .replace(/\bimport prices\b/gi, 'أسعار الواردات')
    .replace(/\bexport prices\b/gi, 'أسعار الصادرات')
    .replace(/\blabor cost\b/gi, 'تكلفة العمالة')
    .replace(/\bproductivity\b/gi, 'الإنتاجية');

  const curAr = CURRENCY_NAME_AR[currency] || currency;
  return `بيانات اقتصادية (${curAr}): ${text}`;
}

function getDefaultAssetsByCurrency(currency: string): string[] {
  const cur = currency.toUpperCase();
  if (cur === 'USD') return ['XAUUSD', 'US100', 'DXY', 'EURUSD'];
  if (cur === 'EUR') return ['EURUSD', 'XAUUSD', 'DXY'];
  if (cur === 'GBP') return ['GBPUSD', 'XAUUSD', 'EURUSD'];
  if (cur === 'CAD') return ['USDCAD', 'WTI', 'XAUUSD'];
  if (cur === 'JPY') return ['USDJPY', 'XAUUSD', 'US100'];
  if (cur === 'AUD') return ['AUDUSD', 'XAUUSD'];
  if (cur === 'CHF') return ['USDCHF', 'XAUUSD'];
  if (cur === 'NZD') return ['NZDUSD', 'XAUUSD'];
  return ['XAUUSD', 'US100', 'DXY'];
}

export function enrichMacroEvent(event: MacroTranslatorInput): EnrichedMacroMetadata {
  const titleEn = String(event.title || '').trim();
  const currency = String(event.currency || 'USD').trim().toUpperCase();

  for (const rule of INDICATOR_RULES) {
    if (rule.pattern.test(titleEn)) {
      const resolvedTitleAr =
        typeof rule.titleAr === 'function' ? rule.titleAr(currency, titleEn) : rule.titleAr;

      const isUsd = currency === 'USD';
      const defaultImpactAr = isUsd
        ? US_GROWTH_JOBS_IMPACT_AR
        : `صدور قراءة أقوى من المتوقع يدعم عملة ${currency} مباشرة ويزيد التقلبات على أزواج الدولار والذهب (XAUUSD).`;
      const defaultImpactEn = isUsd
        ? US_GROWTH_JOBS_IMPACT_EN
        : `A stronger-than-expected reading supports ${currency} pairs directly and increases volatility across DXY and Gold (XAUUSD).`;

      return {
        code: rule.code,
        titleAr: resolvedTitleAr,
        titleEn,
        summaryAr: rule.summaryAr,
        summaryEn: rule.summaryEn,
        goldNasdaqImpactAr: rule.goldNasdaqImpactAr || defaultImpactAr,
        goldNasdaqImpactEn: rule.goldNasdaqImpactEn || defaultImpactEn,
        affectedAssets: rule.affectedAssets || getDefaultAssetsByCurrency(currency)
      };
    }
  }

  const fallbackAssets = getDefaultAssetsByCurrency(currency);
  const isUsd = currency === 'USD';

  return {
    code: currency || 'MACRO',
    titleAr: translateGenericTitleToArabic(titleEn, currency),
    titleEn,
    summaryAr: `مؤشر اقتصادي رسمي صادر لعملة ${currency} تراقبه المؤسسات لتقييم قوة النشاط الاقتصادي والسياسة النقدية.`,
    summaryEn: `Official macroeconomic indicator for ${currency} monitored by institutional desks to assess economic momentum and policy outlook.`,
    goldNasdaqImpactAr: isUsd
      ? US_GROWTH_JOBS_IMPACT_AR
      : `تأثير مباشر على أزواج ${currency} (${fallbackAssets.join('، ')}) مع انعكاس غير مباشر على مؤشر الدولار والذهب (XAUUSD).`,
    goldNasdaqImpactEn: isUsd
      ? US_GROWTH_JOBS_IMPACT_EN
      : `Direct impact on ${currency} pairs (${fallbackAssets.join(', ')}) with spillover volatility into DXY and Gold (XAUUSD).`,
    affectedAssets: fallbackAssets
  };
}
