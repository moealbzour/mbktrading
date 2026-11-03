# MBK Trading Desk — Full Technical Architecture & Platform Status Report

**Generated for:** AI Co-Worker / Gemini Assistant  
**Applet ID:** `5c717851-cdb4-4a97-a0f4-f006f13d6c7b`  
**Firebase Database ID:** `ai-studio-mbktrading-5c717851-cdb4-4a97-a0f4-f006f13d6c7b`  
**Current Date:** November 2026  

---

## 1. Executive Summary & Current Platform State

MBK Trading Desk (v4.0) has been fully refactored from a traditional SQLite/Socket.io monolith into a production-grade, serverless **React + Vite + Firebase (Firestore & Auth)** application with an **Express Node.js** backend middleware server. 

Key capabilities currently live and operational:
- **Serverless Firebase Infrastructure:** Complete persistence powered by Firebase Authentication and Firestore collections (`users`, `signals`, `bot_alerts`).
- **TradingView Webhook Bot Relay:** Express endpoint (`POST /api/webhooks/tradingview`) that receives automated strategy alerts, saves them directly to Firestore `bot_alerts`, and forwards them to a configured Telegram channel via Axios.
- **Real-Time Signal Streaming:** Client-side React components listen to Firestore using `onSnapshot` for instant signal delivery without WebSocket polling.
- **Role-Based Access Control (RBAC):** Tiered permissions (`free`, `vip`, `admin`, `analyser`). Admin tools and raw bot signals are protected with blur logic and strict permission checks.
- **Dual Chart Workspace:** High-performance desktop workspace featuring TradingView Advanced Charts for full technical analysis, with TradingView Mini Chart strictly for mobile split views.

---

## 2. Architecture Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │                   React + Vite SPA                      │
 │   - TradingView Workspace (Full & Mobile Split)         │
 │   - Signals Hub & Real-time `onSnapshot` Listeners      │
 │   - Admin Dashboard & User Profile Management           │
 └─────────────┬──────────────────────────────┬────────────┘
               │                              │
     Firebase Client SDK              REST API (Express / Node.js)
  (Auth & Live Listeners)             (Webhooks & News Proxy)
               │                              │
 ┌─────────────▼──────────────────────────────▼────────────┐
 │               Firebase Cloud Services                   │
 │   - Firebase Authentication (Email/Password & Google)   │
 │   - Cloud Firestore Database                            │
 └────────────────────────────┬────────────────────────────┘
                              │
                    Telegram Bot API Relay
               (Automated Channel Broadcasting)
```

---

## 3. Database Schemas (Firestore & Local Store)

### A. Firestore Collection: `/users/{userId}`
- **Document ID:** Firebase Auth `UID`
- **Fields:**
  - `email` *(string)*: User's primary email address.
  - `role` *(string)*: `'free'` | `'vip'` | `'admin'` | `'analyser'` (default on register: `'free'`).
  - `createdAt` *(timestamp)*: Server timestamp when document was provisioned.
- **Security Rules:** Read access for authenticated users; write/update restricted to account owner or `ADMIN` role.

### B. Firestore Collection: `/signals/{signalId}`
- **Document ID:** Auto-generated signal ID (e.g., `sig-1730000000000`).
- **Fields:**
  - `symbol` *(string)*: Ticker pair (e.g., `'US100'`, `'EURUSD'`, `'BTCUSD'`).
  - `side` / `action` *(string)*: `'BUY'` | `'SELL'`.
  - `entry` / `entryPrice` *(number)*: Numerical entry target.
  - `tp1`, `tp2`, `tp3` *(number)*: Take profit targets.
  - `sl` *(number)*: Stop loss level.
  - `accessLevel` / `channel` *(string)*: `'free'` | `'vip'`.
  - `author` *(string)*: Signal provider name or `'TradingView Bot'`.
  - `isBotSignal` *(boolean)*: Set to `true` for automated strategy signals.
  - `createdAt` / `timestamp` *(timestamp)*: Creation time.

### C. Firestore Collection: `/bot_alerts/{alertId}`
- **Document ID:** Auto-generated alert ID (e.g., `alert-1730000000000-xxxx`).
- **Fields:**
  - `id` *(string)*: Unique alert identifier.
  - `text` *(string)*: Raw text payload or strategy alert message from Pine Script.
  - `chat_id` *(string | null)*: Target Telegram channel username or ID.
  - `timestamp` *(string)*: ISO timestamp of signal receipt.
  - `timestampMs` *(number)*: Epoch timestamp for high-precision ordering.

---

## 4. Authentication & Security RBAC Flow

1. **User Sign Up:**
   - Component: `src/pages/Register.tsx` -> `registerWithFirebase(email, password, name)`
   - Calls `createUserWithEmailAndPassword(auth, email, pass)` via Firebase Auth SDK.
   - Provisions document in Firestore `/users/{uid}` storing `{ email: user.email, role: 'free', createdAt: serverTimestamp() }`.
   - Special rule: If user email strictly equals `moe.albzour@gmail.com`, `role` is automatically set to `'admin'`.

2. **User Login:**
   - Component: `src/pages/Login.tsx` -> `loginWithFirebase(email, password)`
   - Calls `signInWithEmailAndPassword(auth, email, pass)` or `signInWithGooglePopup()`.
   - Fetches role from Firestore `/users/{uid}` and updates client app state.

3. **Admin Panel Access Control:**
   - Component: `src/components/admin/AdminDashboard.tsx`
   - Subscribes to `doc(db, 'users', currentUid)`.
   - Admin access is granted **only if `role === 'admin'`**. If the logged-in user is `'free'` or `'vip'`, an Access Denied fallback UI is rendered.

---

## 5. TradingView Webhook & Telegram Relay Pipeline

1. **Webhook Endpoint:** `POST /api/webhooks/tradingview` in `server.ts`.
2. **Payload Structure:**
   ```json
   {
     "chat_id": "@YOUR_TELEGRAM_CHANNEL",
     "text": "🟢 BUY SIGNAL: US100 @ 20450 | TP: 20600 | SL: 20380"
   }
   ```
3. **Execution Steps:**
   - Receives payload from TradingView Alert or Pine Script `alert()`.
   - Saves alert object to Firestore `bot_alerts` collection using Firebase Admin SDK (or Client SDK fallback).
   - Sends an HTTP POST request using `axios` to `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage` forwarding the message text to `TELEGRAM_CHANNEL_ID`.
   - Returns a `200 OK` status to TradingView.

4. **Frontend Real-Time Feed:**
   - `SignalsChannelHub.tsx` uses `onSnapshot` on the `bot_alerts` collection ordered by `timestampMs desc`.
   - Displays real-time bot signals in a Telegram-style chat feed. Free users view blurred signals with an unlock option.

---

## 6. Financial RSS News Feed Integration

- **API Proxy Endpoint:** `GET /api/news` in `server.ts`.
- **Primary Source:** Native `fetch()` call to `https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss` with 5-second timeout protection.
- **Sentiment Engine:** Automatically analyzes headline keywords (`surge`, `drop`, `rally`, `crash`) to tag sentiment as `BULLISH`, `BEARISH`, or `NEUTRAL`.
- **Fallback:** Merges live RSS items with stored analytical news items to guarantee the top ticker and news banner never go blank.

---

## 7. Workspace Layout & TradingView Chart Architecture

- **Primary Desktop Workspace:** `TradingViewWorkspace.tsx` renders `TradingViewChart` (Full Advanced TradingView Chart with drawing tools, indicators, and resolution pickers).
- **Mobile Split View:** Renders `TradingViewMiniChart` when space is constrained.
- **Full Analysis Mode:** Toggling **Full Analysis Mode** expands `TradingViewChart` into full viewport width while maintaining access to the side panel.

---

## 8. Summary of Recent Changes Completed

| Feature / System | Previous State | Current Refactored State |
| :--- | :--- | :--- |
| **Database** | Local SQLite (`news_items`, `trades`) | Firebase Firestore (`users`, `signals`, `bot_alerts`) |
| **Real-time Engine** | Socket.io server connection | Firestore `onSnapshot` real-time listeners |
| **Authentication** | In-memory token mock | Firebase Auth (`createUserWithEmailAndPassword`, Google Popup) |
| **User Roles & Admin**| Hardcoded checks | Firestore `/users/{uid}` document validation (`admin` strictly required) |
| **TradingView Webhooks**| Numeric parsing endpoint | Simple text relay to `bot_alerts` + Telegram Bot API forwarder |
| **RSS Feed** | `rss-parser` dependency | Native `fetch` using `rss2json` API with sentiment mapping |
