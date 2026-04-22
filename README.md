# NLTC Online — Developer Documentation

**Next Level Tutorial College** · Nigeria's exam-prep platform for JAMB, WAEC, and NECO.

**Production:** https://nltc-online.vercel.app  
**Backend:** https://nltc-backend.onrender.com  
**Firebase project:** `nltc-online`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Third-Party Services](#third-party-services)
5. [Firebase Setup](#firebase-setup)
6. [User Roles & Plans](#user-roles--plans)
7. [Features](#features)
   - [Authentication](#authentication)
   - [Student Dashboard](#student-dashboard)
   - [CBT Practice](#cbt-practice)
   - [Live Classes](#live-classes)
   - [Gamification](#gamification)
   - [Payments](#payments)
   - [Admin Panel](#admin-panel)
8. [Backend API Integration](#backend-api-integration)
9. [Gamification Reference](#gamification-reference)
10. [Deployment](#deployment)

---

## Overview

NLTC Online is a **static, no-build frontend** — every page is a self-contained HTML file with all CSS and JavaScript inlined. There is no bundler, no `node_modules`, and no build step. Pages are deployed as-is to Vercel.

The backend is a separate Node.js service hosted on Render (`nltc-backend.onrender.com`). All protected backend calls are authenticated with a **Firebase ID token** sent in the `Authorization: Bearer <token>` header.

---

## Architecture

```
Browser
  │
  ├── Firebase Auth       — sign-in / session management
  ├── Firebase Firestore  — user profiles, videos, live sessions, announcements
  ├── nltc-backend        — gamification (XP, leaderboard), payments, Agora tokens
  ├── Paystack            — payment checkout (redirect flow)
  ├── Agora RTC           — live class streaming
  └── ALOC API            — JAMB past-question bank (CBT exam mode)
```

Data flow for a typical action (e.g. watching a lesson):

1. User clicks play → video loads from Firestore URL
2. Dashboard calls `POST /api/gamification/xp` with `action: watch_lesson`
3. Backend awards XP, returns new totals
4. `handleXPResult()` updates the sidebar XP bar and shows toast

---

## File Structure

```
NLTC Online/
│
├── index.html              Landing page — marketing, pricing, sign-up CTA
├── auth.html               Sign in / sign up / Google OAuth / password reset
├── dashboard.html          Main student app (lessons, CBT, live classes, leaderboard)
├── cbt.html                CBT exam simulator — JAMB / WAEC practice mode
├── cbtalloc.html           CBT exam using live ALOC question bank (JAMB Exam Mode)
├── admin.html              Admin dashboard — students, videos, live sessions, broadcasts
├── coursemanagement.html   Admin sub-page — video upload and course organisation
├── dashboard-cbt-patch.html  Legacy patch file (kept for reference, not linked)
│
└── payment/
    └── result.html         Payment result page — shown after Paystack checkout redirect
```

> All JavaScript is embedded in `<script type="module">` blocks inside each HTML file. There are no separate `.js` files.

---

## Third-Party Services

| Service | Purpose | SDK / Version |
|---|---|---|
| Firebase Auth | User authentication | JS SDK v10.12.0 (CDN) |
| Firebase Firestore | Database | JS SDK v10.12.0 (CDN) |
| Paystack | Payment processing | Redirect flow (no SDK — direct API call to backend) |
| Agora RTC | Live class streaming | AgoraRTC_N-4.21.0.js (CDN) |
| ALOC API | JAMB past questions | REST API (fetched in `cbtalloc.html`) |
| Chart.js | CBT score history chart | v4.4.1 (CDN) |
| Font Awesome | Icons | v6.5.0 (CDN) |
| Google Fonts | Typography | Plus Jakarta Sans, DM Sans, Syne, JetBrains Mono |

---

## Firebase Setup

### Config (same across all pages)

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyA9vzT1TBpTdRJUfyYm51goS-5HfL3FcbU",
  authDomain:        "nltc-online.firebaseapp.com",
  projectId:         "nltc-online",
  storageBucket:     "nltc-online.firebasestorage.app",
  messagingSenderId: "267993935158",
  appId:             "1:267993935158:web:723c13b2564b817fbc9797"
};
```

### Firestore Collections

| Collection | Description |
|---|---|
| `users` | One document per user. Fields: `uid`, `email`, `firstName`, `lastName`, `displayName`, `role`, `plan`, `xp`, `streak`, `badges`, `state`, `targetExam`, `photoURL`, `createdAt`, `lastLogin` |
| `videos` | Lesson videos uploaded by admin. Fields: `title`, `subject`, `url`, `thumbnail`, `access` (`free`/`pro`/`elite`), `createdAt` |
| `liveSessions` | Active/scheduled live classes. Sub-collection `messages` for chat. Fields: `title`, `subject`, `channel`, `status`, `viewerCount`, `scheduledAt` |
| `liveSessions/{id}/messages` | Live chat messages. Fields: `text`, `senderId`, `senderName`, `createdAt` |
| `broadcasts` | Admin announcements. Fields: `title`, `body`, `category`, `createdAt` |
| `schedule` | Scheduled class timetable entries. Fields: `title`, `subject`, `day`, `time` |
| `users/{uid}/results` | CBT session history per student (written by backend). Fields: `subject`, `score`, `correct`, `total`, `exam`, `submittedAt` |

### Required Firestore Indexes

The dashboard queries `users` ordered by `xp desc` (fallback leaderboard) — ensure a single-field index exists on `users.xp`.

---

## User Roles & Plans

### Roles

| Role | Access | Set in |
|---|---|---|
| `student` | Student dashboard, CBT, live classes (plan-gated) | Firestore `users.role` |
| `admin` | Admin dashboard, course management, live hosting | Firestore `users.role` |

Role is assigned on first sign-up and checked on every auth redirect.

### Plans

| Plan | Price | Access |
|---|---|---|
| `free` | ₦0 | Free-tagged videos only, no live classes |
| `pro` | ₦2,000 | All lessons + live classes |
| `elite` | ₦5,000 | Full access to all features |

Plan is stored in Firestore `users.plan` and updated by the backend webhook after a successful Paystack payment.

---

## Features

### Authentication

**File:** [auth.html](auth.html)

- Email/password sign-in and sign-up
- Google OAuth via **redirect** (not popup) — redirect is used because popup is blocked by some Nigerian ISPs due to `firebaseapp.com` domain
- Password reset via email
- On first sign-up, a `users` document is created with `xp: 0`, `streak: 0`, `role: student`, `plan: free`
- Admins are redirected to `admin.html`; students go to `dashboard.html`

The auth module exposes helpers on `window`:
```js
window.__nltcLogin(email, password)
window.__nltcSignup(email, password, extras)
window.__nltcGoogleRedirect()
window.__nltcReset(email)
```

---

### Student Dashboard

**File:** [dashboard.html](dashboard.html)

The main student app. All views are rendered inside a single page by toggling `.active` on `.view` divs — there is no client-side router.

**Views:**
- **Home** — recent lessons, mini leaderboard, announcements, upcoming schedule
- **Lessons** — full video library, filterable by subject, gated by plan
- **CBT Practice** — subject selector, past session history, score chart
- **Live Classes** — scheduled and active live sessions
- **Leaderboard** — full XP rankings with rank badge
- **Settings** — profile editor, plan display, sign out

**Key globals:**
```js
const BACKEND_URL = 'https://nltc-backend.onrender.com';
let currentUser   // Firebase User object
let userData      // Firestore user document data
let allVideos     // cached video list
let agoraClient   // Agora RTC client (null when not in a live class)
```

**Core helper — `backendFetch`:**
```js
async function backendFetch(method, path, body = null)
```
Attaches a fresh Firebase ID token to every request. Throws on non-2xx responses.

---

### CBT Practice

Two CBT modes exist as separate pages:

#### Practice Mode — [cbt.html](cbt.html)
- Questions sourced from a **local question bank** bundled in the file
- Supports JAMB and WAEC question sets
- Timed exam simulation
- Per-subject breakdown on results screen
- On completion, posts result to the backend via `postMessage` to the parent dashboard window (or writes to `localStorage` as fallback)
- Backend call: `POST /api/gamification/cbt-session`

#### JAMB Exam Mode — [cbtalloc.html](cbtalloc.html)
- Questions fetched **live from the ALOC API** (real past JAMB questions)
- Closer simulation to the actual JAMB CBT interface
- Same result submission flow as above

**Result handoff to dashboard:**

When CBT finishes, it tries two channels (in order):
1. `window.opener.postMessage({ type: 'nltc_cbt_score', ... })` — if opened in a new tab from dashboard
2. `localStorage.setItem('nltc_last_cbt', JSON.stringify({ ...result, timestamp: Date.now() }))` — fallback for same-tab navigation

The dashboard listens on both channels in `handleCBTScore()`.

---

### Live Classes

Live classes use **Agora RTC** for video/audio streaming.

**Student flow (dashboard.html):**
1. Student clicks "Join" on an active live session
2. Dashboard calls `POST /api/agora/token` with `role: audience`
3. Agora client joins the channel as audience
4. Chat messages are read from `liveSessions/{id}/messages` in real-time via `onSnapshot`
5. Viewer count is incremented in Firestore on join and decremented on leave
6. XP is awarded immediately via `POST /api/gamification/xp` with `action: join_live`
7. Token is renewed automatically on `token-privilege-will-expire` event

**Host flow (admin.html):**
1. Admin starts a live session document in Firestore
2. Admin calls `POST /api/agora/token` with `role: host`
3. Admin publishes local camera + microphone tracks to the channel

---

### Gamification

**File:** [dashboard.html](dashboard.html) — `/* ── GAMIFICATION HELPERS ──*/` section

#### XP Events

| Trigger | Action sent | Base XP |
|---|---|---|
| Video lesson opened | `watch_lesson` | 15 XP |
| CBT exam submitted | via `/cbt-session` | 30 XP (+20 if ≥ 90%) |
| Live class joined | `join_live` | 50 XP |
| Daily first visit | `daily_streak` | 10 XP |

#### Daily Streak

`tryAwardDailyStreak()` fires once per calendar day on dashboard load. It is guarded by `localStorage` key `nltc_streak_{uid}` set to today's date (`YYYY-MM-DD`) so it never double-fires within a day.

#### Level System

| Level | XP Required | Title |
|---|---|---|
| 1 | 0 | Starter |
| 2 | 500 | Scholar |
| 3 | 1,500 | Achiever |
| 4 | 3,500 | Expert |
| 5 | 7,000 | Master |
| 6 | 12,000 | Champion |
| 7 | 20,000 | Legend |

Computed locally by `xpToLevel(xp)` and `xpProgressInLevel(xp)` — thresholds mirror the backend exactly.

#### UI Elements

| Element ID | Displays |
|---|---|
| `sbXpVal` | XP total (`1,234 XP`) |
| `sbXpFill` | XP bar fill width (% through current level) |
| `sbLevel` | Level number and title |
| `st-xp` | XP total on stat card |
| `st-rank` | User's leaderboard rank (`#4`) |
| `st-streak` | Current day-streak count |
| `myRankBig` | Large rank on Leaderboard view |
| `myRankMsg` | Motivational rank message |

#### Leaderboard

`loadLeaderboard()` calls two endpoints in parallel:
- `GET /api/gamification/leaderboard?limit=50` — sorted entries with `rank` field
- `GET /api/gamification/rank` — current user's authoritative XP and rank

If the backend is unavailable, it falls back to a direct Firestore query on the `users` collection ordered by `xp desc`.

After a successful backend response, `userData.xp` is overwritten with the authoritative value from `rankData.xp` and `renderUserUI()` is called to sync the XP bar.

---

### Payments

**File:** [dashboard.html](dashboard.html) — `/* ── PAYSTACK UPGRADE ──*/` section

#### Upgrade Flow

1. Student opens upgrade modal (`openUpgradeModal()`) and selects Pro or Elite
2. `initiatePayment()` calls `POST /api/paystack/initialize` with `callbackUrl: https://nltc-backend.onrender.com/payment/callback`
3. Browser redirects to Paystack checkout
4. After checkout, Paystack redirects to the backend `/payment/callback`
5. Backend verifies the payment and redirects to `https://nltc-online.vercel.app/payment/result?status=...&plan=...&reference=...`
6. `payment/result.html` reads the query params, calls `GET /api/paystack/verify?reference=...` as a webhook fallback, and shows success or failure UI

#### Result Page Query Params

| Param | Values | Description |
|---|---|---|
| `status` | `success`, `failed`, `error` | Payment outcome |
| `plan` | `pro`, `elite` | Plan that was purchased (on success) |
| `reference` | string | Paystack transaction reference |
| `message` | string | Error detail (on `error` status only) |

#### Webhook

The backend also listens for Paystack webhooks (`charge.success`, `subscription.*`, `invoice.*`) and updates `users.plan` in Firestore automatically. The manual verify call in `payment/result.html` is a fallback in case the webhook fires after the user lands on the result page.

---

### Admin Panel

**File:** [admin.html](admin.html)

Accessible only to users with `role: admin` in Firestore.

**Features:**
- View all students (filterable by plan, search by name)
- Upload and manage video lessons (stored as Firestore documents with external video URLs)
- Create, start, and end live class sessions
- Send broadcasts/announcements to all students
- Manage the class schedule timetable
- Host live classes as the Agora RTC broadcaster

**Course Management sub-page:** [coursemanagement.html](coursemanagement.html) — dedicated interface for organising video content by subject.

---

## Backend API Integration

All calls go through `backendFetch(method, path, body)` in `dashboard.html`, which automatically attaches a fresh Firebase ID token. The full API reference is in the separate backend documentation.

### Quick Reference

```
GET  /api/health                            — health check (no auth)
POST /api/gamification/xp                  — award XP for an action
POST /api/gamification/cbt-session         — save CBT result + award XP
GET  /api/gamification/leaderboard?limit=N — top N students by XP
GET  /api/gamification/rank                — current user's rank + XP
POST /api/paystack/initialize              — create Paystack checkout session
GET  /api/paystack/verify?reference=       — verify payment (fallback)
POST /api/agora/token                      — get Agora RTC token
```

### Rate Limits

| Route group | Window | Limit |
|---|---|---|
| All `/api/*` | 15 min | 100 requests |
| `/api/paystack/*` | 15 min | 10 requests |
| `/api/agora/token` | 1 min | 20 requests |

---

## Gamification Reference

### `handleXPResult(result)`

Central handler called after any XP-awarding backend call. Expects the shape returned by both `/xp` and `/cbt-session`:

```js
{
  xpEarned: 25,
  newXP: 540,
  newStreak: 3,
  streakBonusAwarded: true,
  leveledUp: false,
  level: 2,
  nextLevelXP: 1500,
  prevLevelXP: 500
}
```

Behaviour:
- Updates `userData.xp` and `userData.streak`
- Calls `renderUserUI()` to refresh the sidebar
- Shows a level-up toast if `leveledUp === true`
- Shows a streak toast if `streakBonusAwarded === true`

---

## Deployment

The frontend is deployed to **Vercel** as a static site. No build configuration is needed.

### Steps

1. Push to the `main` branch on GitHub
2. Vercel picks up the push and deploys automatically
3. All `.html` files are served with Vercel's clean URL feature (e.g. `payment/result.html` → `/payment/result`)

### Environment Notes

- All config values (Firebase keys, Agora App ID, backend URL) are **hardcoded** in the HTML files. There are no environment variables on the frontend.
- The backend URL constant is defined at the top of each page's script block: `const BACKEND_URL = 'https://nltc-backend.onrender.com'`
- The Agora App ID is: `5eae75b2cc3d48cc84446b94d3877f88`

### Vercel Settings

No `vercel.json` is required. Default Vercel static deployment handles:
- Clean URLs (strips `.html`)
- SPA-style 404 fallback is **not** configured — each page is a real file

---

*Last updated: April 2026*
