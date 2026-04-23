# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NLTC Online** — Nigeria's exam-prep platform for JAMB, WAEC, and NECO.

- **Production:** https://nltc-online.vercel.app
- **Backend:** https://nltc-backend.onrender.com
- **Firebase Project:** `nltc-online`

## Architecture

**Frontend:** Static, no-build HTML files with inline CSS/JavaScript deployed to Vercel. No bundler, no `node_modules`, no build step.

**Backend:** Separate Node.js service (`nltc-backend`) handling gamification (XP, leaderboard), payments, and Agora tokens.

**Auth:** Firebase Auth with Google OAuth redirect flow (popup blocked by some Nigerian ISPs).

**Data Flow:**
1. Browser → Firebase Auth for session management
2. Browser → Firebase Firestore for user profiles, videos, live sessions
3. Browser → Backend (`/api/*`) with `Authorization: Bearer <firebase_id_token>` for XP, payments, Agora

## File Structure

```
NLTC Online/
├── index.html                  Landing page
├── auth.html                   Sign in/up, Google OAuth, password reset
├── dashboard.html              Main student app (lessons, CBT, live, leaderboard)
├── cbt.html                    CBT exam simulator (local question bank)
├── cbtalloc.html               CBT with live ALOC API (JAMB Exam Mode)
├── admin.html                  Admin dashboard
├── coursemanagement.html       Video upload/management
├── livestream.html             Dedicated livestream page
├── notifications.html          Notifications page
├── firebase-messaging-sw.js    Firebase Cloud Messaging service worker
├── sw.js                       PWA service worker
├── manifest.json               PWA manifest
├── firestore.rules             Firestore security rules
├── firebase.json               Firebase config
├── .firebaserc                 Firebase project alias
└── payment/
    └── result.html             Paystack callback result page
```

## Key Globals (in each HTML file)

```javascript
const BACKEND_URL = 'https://nltc-backend.onrender.com';
const FIREBASE_CONFIG = { /* Firebase v10.12.0 config */ };
const AGORA_APP_ID = '5eae75b2cc3d48cc84446b94d3877f88';

let currentUser;   // Firebase User
let userData;      // Firestore user document
let agoraClient;   // Agora RTC client (null when not in live class)
```

## Core Functions

### `backendFetch(method, path, body)`
Attaches fresh Firebase ID token to every backend request. Throws on non-2xx.

### `handleXPResult(result)`
Central XP handler — updates `userData.xp`, refreshes UI, shows level-up/streak toasts.

### `tryAwardDailyStreak()`
Fires once per calendar day, guarded by localStorage key `nltc_streak_{uid}`.

## Firestore Collections

| Collection | Key Fields |
|---|---|
| `users` | `uid`, `email`, `role`, `plan`, `xp`, `streak`, `badges`, `state`, `targetExam` |
| `videos` | `title`, `subject`, `url`, `thumbnail`, `access` (free/pro/elite) |
| `liveSessions` | `title`, `subject`, `channel`, `status`, `viewerCount`; sub-collection `messages` |
| `broadcasts` | `title`, `body`, `category` |
| `schedule` | `title`, `subject`, `day`, `time` |
| `users/{uid}/results` | CBT history: `subject`, `score`, `correct`, `total`, `exam` |

**Required Index:** Single-field index on `users.xp` (for leaderboard queries).

## Backend API Reference

```
GET  /api/health                     — health check (no auth)
POST /api/gamification/xp            — award XP: { action, customAmount? }
POST /api/gamification/cbt-session   — save CBT result + award XP
GET  /api/gamification/leaderboard   — top N by XP
GET  /api/gamification/rank          — current user's rank + XP
POST /api/paystack/initialize        — create Paystack checkout
GET  /api/paystack/verify            — verify payment by reference
POST /api/agora/token                — get Agora RTC token (role: host/audience)
```

**Rate Limits:** 100 req/15min (all), 10 req/15min (paystack), 20 req/min (agora).

## User Roles & Plans

| Role | Access |
|---|---|
| `student` | Student dashboard, CBT, live classes (plan-gated) |
| `admin` | Admin dashboard, video upload, live hosting |

| Plan | Price | Access |
|---|---|---|
| `free` | ₦0 | Free videos only, no live classes |
| `pro` | ₦2,000 | All lessons + live classes |
| `elite` | ₦5,000 | Full access |

## XP System

| Action | Base XP |
|---|---|
| Watch lesson | 15 |
| CBT session | 30 (+20 if ≥90%) |
| Join live class | 50 |
| Daily streak | 10 |

**Levels:** 1 (0 XP) → 2 (500) → 3 (1500) → 4 (3500) → 5 (7000) → 6 (12000) → 7 (20000)

## Development Commands

```bash
# Serve locally (VS Code Live Server on port 5501)
# Or use any static server: npx serve .

# Firebase emulator (if testing rules locally)
firebase emulators:start

# Deploy frontend to Vercel
vercel deploy --prod

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

## Payment Flow (Paystack)

1. `POST /api/paystack/initialize` → get checkout URL
2. Redirect to Paystack
3. Backend verifies → redirects to `/payment/result?status=&plan=&reference=`
4. `payment/result.html` shows success/failure, calls verify endpoint as fallback

## Live Class Flow (Agora)

**Student:**
1. Click "Join" → `POST /api/agora/token` (role: audience)
2. Join channel, subscribe to remote tracks
3. Chat via `liveSessions/{id}/messages` onSnapshot
4. XP awarded immediately via `/api/gamification/xp`

**Host (Admin):**
1. Start live session in Firestore
2. `POST /api/agora/token` (role: host)
3. Publish camera + microphone tracks

## CBT Result Handoff

CBT pages (`cbt.html`, `cbtalloc.html`) send results to dashboard via:
1. `window.opener.postMessage({ type: 'nltc_cbt_score', ... })` — if opened from dashboard
2. `localStorage` key `nltc_last_cbt` — fallback for same-tab nav

Dashboard listens on both in `handleCBTScore()`.

## Deployment

- **Frontend:** Push to `main` → Vercel auto-deploys (no build config needed)
- **Backend:** Separate repo (`nltc-backend`), deployed to Render
- **Clean URLs:** Vercel strips `.html` (e.g., `/payment/result`)

## Important Notes

- All config values are **hardcoded** in HTML files — no environment variables on frontend
- Google OAuth uses **redirect** (not popup) due to ISP blocking
- Every HTML file is self-contained — no external `.js` or `.css` files
- Backend authentication relies on Firebase ID token in `Authorization` header
