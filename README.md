# Reflect — Intelligent Mindful Reflection & Gratitude Workspace

**Reflect** is a security-first, agentic personal journaling and gratitude workspace powered by **Google Gemini AI** (`@google/genai`) and **Google Cloud Firestore**. Rather than functioning as a transient conversational chatbot, Reflect serves as a mindful, persistent reflection companion that builds long-term psychological memory over time. By combining an asynchronous memory synthesis layer with on-demand thematic insight extraction, real-time streaming AI reflections, daily gratitude tracking, and proactive agentic check-in nudges, Reflect helps users identify personal growth patterns, track emotional trajectories, and retain complete sovereignty over their data.

---

## 🌟 Key Features

### 1. ✍️ Daily Reflection & Real-Time AI Streaming Dialogue
- **Real-Time Streaming Dialogue**: Engage in introspective dialogue with Gemini AI via Server-Sent Events (SSE) streaming (`/api/journal/chat-stream`) for instant token-by-token reflection responses.
- **Optimized Typography & Spacing**: Employs `@tailwindcss/typography` for beautifully spaced, conversational, and highly readable AI responses.
- **Automated Sentiment Analysis**: Instant assessment of entry sentiment generating a 0–100 positivity score, mood indicators, and emotional descriptors (*Grounded*, *Peaceful*, *Reflective*, etc.).
- **Curated Reflection Starters**: Categorized writing prompts (*Gratitude*, *Mindfulness*, *Self-Growth*, *Productivity*, *Relationships*) to eliminate blank-page friction.
- **Personalized AI Affirmations**: Dynamically generated daily affirmations (`/api/journal/daily-affirmation`) tailored to your running psychological context and recent entries.
- **Daily Inspiration Quote**: A clean daily quote modal displayed once per day to set a mindful intention.
- **Real-Time Writing Metrics**: Live reading duration estimates and word counters as you compose reflections.

### 2. 💖 Daily Gratitude Tracker
- **Dedicated 3-Item Gratitude Logging**: Focused daily module to record three items you are grateful for, anchored with a deeper reflection note.
- **Gratitude History & Management**: View past gratitude logs chronologically, edit responses, or delete historic entries.

### 3. 📚 Past Entries Archive & Intelligent Filtering
- **Paginated History Feed**: Seamless numbered pagination with "Next" and "Previous" controls and smooth auto-scrolling to navigate long journal histories securely.
- **Full Entry Lifecycle Management**: Create, edit titles, update tags/content, or permanently delete past reflections.
- **Multi-Filter Capabilities**: Search entries instantly by text keywords, custom hashtags (`#growth`, `#work`), or emotional mood pills (*Optimistic*, *Calm*, *Reflective*, etc.).
- **Interactive Conversation History**: View historical multi-turn AI dialogue transcripts associated with any entry.
- **In-Line Multilingual Translation**: Seamlessly translate historical entries into multiple languages natively via the Gemini API (`/api/journal/translate`).

### 4. 📊 Insights & Behavioral Analytics
- **Monthly Sentiment Calendar View**: Interactive monthly calendar with color-coded day cells based on daily average sentiment scores (from *Tender* to *Radiant*), mood emojis, reflection count indicators, month navigation controls, and an expandable daily reflection drawer.
- **Yearly Sentiment Heatmap**: GitHub-style calendar heatmap visualizer displaying emotional trajectory and reflection density across all 365 days of the calendar year.
- **Visual Sentiment Trajectory**: Interactive charts powered by Recharts illustrating sentiment trends and mood distribution over time.
- **Thematic Reports with Entry Citations**: AI-generated structured synthesis identifying core psychological themes, emotional shifts, and growth recommendations — explicitly citing the specific entries that informed each insight.
- **Independent Weekly Recap Modal**: A dedicated 7-day chronological digest offering narrative summaries and forward-looking horizon prompts.
- **Memory Context Inspector**: Direct visibility into your running psychological profile synthesized by Gemini.

### 5. 🔔 Proactive Agentic Nudges & Cloud Scheduler Cron
- **Autonomous Check-In Prompts**: Intelligent background prompts rendered via an interactive Nudge Banner that detects reflection gaps or milestone patterns, inviting you back to log your state of mind.
- **Secured Cron Endpoint (`/api/cron/generate-nudges`)**: A protected backend endpoint built for Cloud Scheduler or cron runners that safely generates pending nudges for active users. Authenticated via `CRON_SECRET` using either `x-cron-secret: <secret>` or `Authorization: Bearer <secret>`.
- **Milestone Celebrations**: Interactive toasts to celebrate journaling streaks and entry milestones.

### 6. ⚙️ Settings, PIN Security & 90-Day Secret Rotation Hub
- **Profile & Credentials**: Real-time display name synchronization with Firebase Authentication.
- **Appearance & Typography**: Toggle between Light Atmosphere, Dark Twilight, and System Auto theme modes (with dynamic `prefers-color-scheme` OS listener), alongside customizable reading typography (*Sans*, *Serif*, or *Monospace*).
- **Mindful Reminders**: Active notification preference settings for Evening Reflection and Daily Gratitude routines.
- **Security & Privacy Audit**: Interactive inspector detailing security boundaries, encryption status, and data partitioning guarantees.
- **90-Day Secret & Password Rotation Policy**: Cryptographic 6-digit PIN and password protection enforcing an automated 90-day secret rotation policy with client-side SHA-256 salted hashing, rotation countdown indicators, and immutable audit history.
- **Mandatory Expiration Enforcement**: Option to require PIN rotation before journal access is permitted when the 90-day lifecycle expires.
- **Interactive QA Test Simulator**: Ability to simulate 90-day expiry state to test warning triggers, lock screen enforcement, and rotation flows.
- **Auto-Lock Inactivity Timer**: Configurable auto-lock mechanism (1-30 minutes) that actively monitors interactions to secure the application when left unattended.
- **Data Sovereignty & Multi-Format Export**: Export your complete journal archive into structured **XLSX**, formatted **Markdown**, or **JSON** files for offline backup and migration.
- **Account Controls**: Temporary account deactivation or permanent account purging (`/api/user/purge`) recursively deleting all Firestore entries and Firebase Auth identity.

### 7. 📱 Mobile & Tablet Responsive UX & Accessibility
- **Desktop Top Navigation**: Sleek header bar with quick-access tab switches and profile dropdown menu.
- **Mobile Bottom Navigation Bar**: Fixed, touch-optimized bottom menu bar (`md:hidden`) for phones ensuring single-thumb tab switching across Reflection, History, Insights, Gratitude, and Settings.
- **Fluid Layouts**: Responsive grids engineered to adapt smoothly across mobile phones, tablets, and desktop monitors.
- **Paginated Entry Feed**: High-efficiency paginated history feed with clear Next/Previous boundaries and smooth top-scrolling.
- **WCAG 2.1 AA Compliance**: Strict modal focus traps, Escape key listeners, explicit ARIA dialog roles (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`), and high-contrast color pairings.

### 8. 👤 Guest Mode (Zero-Account Sandbox & Seamless Cloud Migration)
- **Instant Exploration Without Sign-In**: "Continue as Guest" option on the landing page allows immediate journal creation, gratitude tracking, AI streaming reflections, and insight analytics without signing in with a Google account.
- **Client-Side Isolated Sandbox**: Guest entries, gratitude items, PIN preferences, and metrics are isolated inside browser `localStorage` using unique deterministic namespaces (`guest_...`).
- **One-Click Cloud Sync & Migration**: When a guest user decides to connect their Google account, Reflect automatically invokes `migrateGuestDataToUser` to batch-write local entries and gratitude logs into Cloud Firestore under their newly authenticated `users/{uid}/*` path before safely purging local sandbox caches.
- **Uncompromised Feature Parity**: Guest users have full access to interactive writing prompts, real-time sentiment scoring, monthly sentiment calendars, yearly heatmaps, and local PIN security.

---

## 🏗️ Architecture & Technology Stack

```text
+-----------------------------------------------------------------------------------+
|                                 CLIENT (BROWSER)                                  |
|  - React 18 + TypeScript + Tailwind CSS + Recharts + Framer Motion                |
|  - Firebase Client SDK (Google Auth & UID-Scoped Firestore Listeners)             |
|  - Desktop Header & Mobile Bottom Navigation Bar                                  |
|  - Paginated Entry History (Next / Previous Feed)                                 |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTP / API Proxy Routes (/api/*)
                                          v
+-----------------------------------------------------------------------------------+
|                               BACKEND (CLOUD RUN)                                 |
|  - Express.js API Server (Node.js / TypeScript)                                   |
|  - Google Gemini API Orchestration Layer (@google/genai)                          |
|  - Real-Time SSE Streaming (/api/journal/chat-stream)                             |
|  - Multi-Model Resilience Fallback Strategy                                       |
|  - Asynchronous Memory Context & Insight Synthesizers                             |
|  - Secured Scheduled Nudge Cron Job (/api/cron/generate-nudges)                   |
|  - Account Purge Endpoint (/api/user/purge)                                       |
+-------------------+---------------------------------------+-----------------------+
                    |                                       |
      Secret Manager| (Runtime GEMINI_API_KEY, CRON_SECRET) | Firestore Operations
                    v                                       v
+-----------------------------------+   +-------------------------------------------+
|    GEMINI API (@google/genai)     |   |          GOOGLE CLOUD FIRESTORE           |
|  - Primary: gemini-3.1-flash-lite |   |  - users/{uid}/entries/{entryId}          |
|  - Fallback: gemini-3.7-flash     |   |  - users/{uid}/gratitude/{gratitudeId}    |
|  - Fallback: gemini-flash-latest  |   |  - users/{uid}/profile/summary            |
|  - Structured JSON Schemas        |   |  - users/{uid}/insights/{insightId}       |
+-----------------------------------+   |  - users/{uid}/nudges/{nudgeId}           |
                                        +-------------------------------------------+
```

### Stack Overview
- **Frontend Framework**: React 18, TypeScript, Vite, Tailwind CSS, `@tailwindcss/typography`, Lucide Icons, Recharts, Framer Motion.
- **Backend API Layer**: Express.js server running in Cloud Run container with Vite dev middleware.
- **Database & Authentication**: Google Cloud Firestore & Firebase Authentication (with Firebase Admin SDK backend).
- **AI Engine**: `@google/genai` SDK with multi-tiered fallback architecture (`gemini-3.1-flash-lite` ➔ `gemini-3.7-flash` ➔ `gemini-flash-latest`).

---

## 🔌 API Endpoints Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | System healthcheck & Gemini API configuration status |
| `/api/journal/chat-stream` | `POST` | Real-time SSE streaming AI reflection with embedded sentiment analysis |
| `/api/journal/chat` | `POST` | Non-streaming AI reflection with sentiment metadata |
| `/api/journal/update-profile` | `POST` | Asynchronous long-term psychological memory summary updater |
| `/api/journal/generate-insights` | `POST` | On-demand structured thematic JSON insights with citation validation |
| `/api/journal/weekly-summary` | `POST` | 7-day weekly reflection recap digest generator |
| `/api/journal/analyze-sentiment` | `POST` | On-demand sentiment analytics extractor |
| `/api/journal/translate` | `POST` | Natively translates historical journal entries into user-selected languages |
| `/api/journal/daily-affirmation` | `POST` | Generates context-aware, personalized daily affirmations |
| `/api/journal/generate-nudge` | `POST` | Manual trigger for generating an intelligent check-in nudge |
| `/api/cron/generate-nudges` | `POST` | Secured background endpoint for Cloud Scheduler check-in nudges |
| `/api/admin/secrets-status` | `GET` | Secrets health and 90-day rotation compliance audit endpoint |
| `/api/account/deactivate` | `POST` | Temporary account deactivation with data preservation |
| `/api/account/delete` | `POST` | Permanent, recursive deletion of user Firestore data and Firebase Auth identity |

---

## 🗄️ Database Schema & Storage

All data is strictly partitioned under private, UID-scoped document paths in Cloud Firestore:

- `users/{uid}/entries/{entryId}`: Journal entries containing `title`, `content`, `mood`, `tags`, `wordCount`, `readingTime`, and conversational turns.
- `users/{uid}/gratitude/{gratitudeId}`: Gratitude records storing `items` (array of 3 items), `reflectionNote`, and `date`.
- `users/{uid}/profile/summary`: Running long-term psychological memory summary document.
- `users/{uid}/insights/{insightId}`: Structured thematic pattern and sentiment trajectory analytics.
- `users/{uid}/insights/weeklySummary`: Cached 7-day Weekly Reflection digest.
- `users/{uid}/nudges/{nudgeId}`: Proactive check-in prompts generated by the agentic engine.
- `users/{uid}/settings/pin`: Application PIN lock configuration, hashed PIN values, and inactivity auto-lock settings.
- `users/{uid}` (Root Document): Account status (`active` / `deactivated`), preferences, and quote history.

---

## 🔐 Security, Secrets & 90-Day Credential Rotation Architecture

Reflect implements defense-in-depth security with strict 90-day credential and secret lifecycle management adhering to NIST SP 800-63 and SOC 2 guidelines:

### 1. User Application PIN & Password Rotation (90-Day Policy)
- **Lifecycle Cadence**: User access PINs and passwords are valid for **90 days**.
- **Cryptographic Hashing**: PINs are hashed client-side with `crypto.subtle` using SHA-256 and a user-specific UID salt before storage in Firestore (`users/{uid}/settings/pin`).
- **Policy Enforcement**: When 90 days elapse, the system transitions into an *Expired* status and prompts or requires the user to rotate their PIN with a routine rotation audit record.
- **Rotation Audit Trail**: Every rotation event is recorded with an immutable timestamp, rotation reason (`routine_90_day_rotation`, `user_manual_change`, `initial_setup`, `reset_recovery`), and lifecycle status (`active` / `superseded`).

### 2. Server Secrets Zero-Downtime Rotation (Google Secret Manager)
- **`GEMINI_API_KEY`**: Server-side isolated in Google Cloud Run. Rotated every 90 days in Secret Manager without client bundle updates.
- **`CRON_SECRET` & Zero-Downtime Rotation**: The scheduler endpoint `/api/cron/generate-nudges` supports dual-secret validation:
  - `CRON_SECRET`: Active primary ingress secret token.
  - `CRON_SECRET_SECONDARY` / `PREVIOUS_CRON_SECRET`: Grace-period secret token allowing seamless, zero-downtime rotation between Cloud Scheduler and Cloud Run deployments.
- **Auditing Endpoint**: `GET /api/admin/secrets-status` provides an automated health and rotation compliance audit.

### 3. Guest Mode Sandbox Isolation & Migration Security
- **Strict Firestore Rules Preserved**: Unauthenticated guests do not have read or write access to Cloud Firestore (`request.auth != null`). The client bypasses Firestore network calls entirely when in guest mode, preventing permission errors or cross-tenant exposure.
- **Local Namespace Partitioning**: Guest data resides purely in the client browser's `localStorage` scoped to unique `reflect_guest_<key>` partitions.
- **Safe Migration Boundary**: Upon signing in with Google, `migrateGuestDataToUser` transfers journal entries and gratitude items to the authenticated user's `users/{uid}/*` path in Firestore, after which local temporary keys are safely cleared.

---

## ⏰ Cloud Scheduler & Agentic Cron Setup

To trigger automated proactive nudges on a schedule (e.g. daily at 8:00 AM UTC):

1. **Set `CRON_SECRET`** in your Cloud Run service environment / Secret Manager:
   ```env
   CRON_SECRET=your_super_secret_cron_token_here
   ```
2. **Configure Cloud Scheduler job**:
   - **Target**: HTTP
   - **URL**: `https://<YOUR_CLOUD_RUN_SERVICE_URL>/api/cron/generate-nudges`
   - **HTTP Method**: `POST`
   - **HTTP Headers**:
     ```http
     x-cron-secret: your_super_secret_cron_token_here
     Content-Type: application/json
     ```
   - **Schedule**: `0 8 * * *` (Daily at 8:00 AM UTC)
   - **Body**: `{}`

---

## 🚀 Getting Started & Local Development

### Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Firebase Project**: With Firestore & Google Auth enabled
- **Gemini API Key**: From Google AI Studio

### Environment Setup
1. Define environment variables in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   CRON_SECRET=your_super_secret_cron_token_here
   ```
2. Ensure `firebase-applet-config.json` is configured with your Firebase web credentials.

### Installation & Execution
```bash
# 1. Install dependencies
npm install

# 2. Start development server (Express + Vite middleware)
npm run dev

# 3. Build for production
npm run build

# 4. Start production server
npm run start
```

---

## 📄 License & Ownership

Created for **Google AI Studio**. Built with safety, privacy, and user intent discipline.
