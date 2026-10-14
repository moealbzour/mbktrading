# Implementation Plan: Front Page Remodel Matching Reference Layout & Tab Organization

Re-architect the front page of **MBK Trading** to mirror the clean layout, navigation tabs organization, and feature showcase of the reference trading platform, with a live interactive app frame embedded directly inside the hero section, while preserving MBK Trading's proud brand identity and institutional SMC features.

## 1. User Choices & Alignment
- **Hero & Mockup Layout**: Live interactive application frame embedded directly inside the hero section.
- **Tab Interaction**: Direct tab switcher allowing visitors to switch live tool views (Desk, Journal, Playbooks, AI Coach, Paper Trading, Backtest) without leaving the hero frame.
- **Language & Tone**: Arabic primary with institutional English technical terms (`Desk`, `Playbooks`, `SMC`, `FVG`, `Habit Detective`, `Paper Trading`).
- **Brand Identity**: Strictly **MBK Trading** across all badges, headers, copy, and components.

## 2. Front Page Architecture & Sections

### A. Top Navigation Bar (Single-Row Contract)
- **Zone 1 (Brand Lockup)**: MBK emblem in gradient cyan-to-indigo frame + `MBK Trading` wordmark + quiet subtitle `غرفة الأسواق وسجل التداول الذكي`.
- **Zone 2 (Interactive Feature Tabs)**:
  - `غرفة الأسواق (Desk)`
  - `سجل الصفقات (Journal)`
  - `نماذج التداول (Playbooks)`
  - `الموجّه الذكي (AI Coach)`
  - `المحفظة التجريبية (Paper)`
  - `الباقات (Pricing)`
- **Zone 3 (Utility & Actions)**:
  - Eye Comfort theme toggle (`EyeComfortToggle`).
  - `دخول المنصة (Launch App)` CTA button + `تسجيل حساب (Join Free)`.

### B. Live Ticker Tape Stream
- Integrated TradingView real-time ticker tape ribbon streaming spot prices for US100, XAUUSD, EURUSD, BTCUSD, and US30.

### C. Hero Section with Live Embedded App Frame
- **Kicker**: `The AI Trading Journal & Real-Time Market Desk • MBK Trading`.
- **Display Title**: `سجل صفقاتك تلقائياً، تخلص من الفومو والانتقام، والتزم بنماذج التداول المعتمدة`.
- **Value Proposition**: Concise value statement focusing on automated journal logging, psychological leak detection, and institutional SMC execution.
- **Interactive App Frame (Central Showcase)**:
  - Browser/platform frame with header tabs switcher (`MBK Desk`, `Smart Journal`, `Playbooks`, `AI Coach`, `Paper Trading`, `Backtest Lab`).
  - Active tab rendered live inside the frame:
    - **MBK Desk**: Live clocks for London, New York, Tokyo, and Sydney, active overlap indicators, and upcoming high-impact economic news countdown.
    - **Smart Journal**: Interactive trade logger with PnL, emotional tags (`FOMO`, `DISCIPLINED`, `REVENGE`), and habit detective analytics.
    - **Playbooks**: Rulebooks for London Open Liquidity Sweep, ICT Silver Bullet, and Order Block Retests.
    - **AI Coach**: Behavioral audit, discipline score, and weekly AI directives powered by Gemini.
    - **Paper Trading**: $100,000 virtual balance with live order placement.
    - **Backtest Lab**: Historical simulation and mathematical expectancy tracking.

### D. Feature Deep-Dive Bento Sections
- **Bento 1: MBK Desk (Market Pulse)**: Session liquidity clocks, high-impact news calendar, and currency strength heatmap.
- **Bento 2: MBK Smart Journal & Habit Detective**: Visual analytics illustrating the financial cost of emotional trading vs disciplined playbook execution.
- **Bento 3: Institutional Playbooks & Checklist**: Systematic execution rules, invalidation levels, and Take Profit targets.
- **Bento 4: AI Coach & Review**: Institutional analysis and trade review powered by Gemini 3.8 Flash.

### E. Social Proof & Verified Performance
- Verified track record showcasing audited institutional win rate (76.4%), average risk-to-reward ratio (1:2.8), and active community member count.

### F. Pricing & Access Tiers
- **Starter Desk ($0 / Free forever)**: Free access to Market Desk, Economic Calendar, and $100,000 Paper Trading.
- **Pro Trader ($29/mo or VIP code)**: Broker sync, full Smart Journal, Playbooks Library, and Backtest Lab.
- **Elite AI ($49/mo or VIP code)**: Complete AI Coach, Weekly Performance Audit, AI Chart Vision, and Instant Webhook Signals.

### G. Institutional Footer
- MBK Trading wordmark, quick section navigation links, and copyright notices.

## 3. Technical Implementation Steps

1. **Refactor `src/components/PublicLandingPage.tsx`**:
   - Re-organize layout to place the live interactive frame directly inside the hero.
   - Synchronize top navigation buttons with the hero interactive frame's active tab.
   - Embed smooth state transitions between tool views (`desk`, `journal`, `playbooks`, `aicoach`, `paper`, `backtest`).
2. **Harmonize Navigation & State Propagation**:
   - Clicking a nav tab scrolls smoothly to the app frame and immediately switches to that tool.
   - Maintain eye comfort theme support and real-time ticker tape integration.
3. **Verification & Quality Checks**:
   - Run `compile_applet` to ensure zero TypeScript/JSX errors.
   - Run `lint_applet` to verify syntax and formatting standards.
