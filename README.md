# Reflect — Intelligent Mindful Reflection & Gratitude Workspace

**Reflect** is a security-first, agentic personal journaling and gratitude workspace powered by **Google Gemini AI** (`@google/genai`) and **Google Cloud Firestore**. Rather than functioning as a transient conversational chat wrapper, Reflect serves as a mindful, persistent companion that builds long-term psychological memory over time. By combining an asynchronous memory synthesis layer with on-demand thematic insight extraction, daily gratitude tracking, and proactive check-in nudges, Reflect helps users identify personal growth patterns, track emotional trajectories, and retain total sovereignty over their data.

---

## 🌟 Key Features

### 1. ✍️ Daily Reflection & AI Dialogue Engine
- **Conversational Reflection**: Engage in introspective dialogue with Gemini AI to explore your thoughts, uncover root emotions, and process daily events.
- **Automated Sentiment Analysis**: Instant assessment of entry sentiment generating a 0–100 positivity score, mood indicators, and emotional breakdown.
- **Curated Reflection Starters**: Categorized writing prompts (*Gratitude*, *Mindfulness*, *Self-Growth*, *Productivity*, *Relationships*) to eliminate blank-page friction.
- **Daily Inspiration Quote**: A clean, single-view daily quote modal displayed once per day to set a mindful intention.
- **Real-Time Writing Metrics**: Live reading duration estimates and word counters as you compose reflections.

### 2. 💖 Daily Gratitude Tracker
- **Dedicated 3-Item Gratitude Logging**: Focused daily module to record three things you are grateful for, anchored with an optional deeper reflection note.
- **Gratitude History & Management**: View past gratitude logs chronologically, edit responses, or delete historic entries.

### 3. 📚 Past Entries Archive & Intelligent Filtering
- **Full Entry Lifecycle Management**: Create, edit titles, update tags/content, or permanently delete past reflections.
- **Multi-Filter Capabilities**: Search entries instantly by text keywords, custom hashtags (`#growth`, `#work`), or emotional mood pills (*Optimistic*, *Calm*, *Reflective*, etc.).
- **Interactive Conversation History**: View historical multi-turn AI dialogue transcript associated with any entry.

### 4. 📊 Insights & Behavioral Analytics
- **Visual Sentiment Trajectory**: Interactive charts powered by Recharts illustrating sentiment trends and mood distribution over time.
- **Thematic Reports with Entry Citations**: AI-generated structured synthesis identifying core psychological themes, emotional shifts, and growth recommendations — explicitly citing the specific entries that informed each insight.
- **Independent Weekly Recap Modal**: A dedicated 7-day chronological digest offering narrative summaries and forward-looking horizon prompts.
- **Memory Context Inspector**: Direct visibility into your running psychological profile synthesized by Gemini.

### 5. 🔔 Proactive Agentic Nudges
- **Autonomous Check-In Prompts**: Intelligent background prompts that detect reflection gaps or milestone patterns, gently inviting you back to log your state of mind.

### 6. ⚙️ Settings & Personalization Hub
- **Profile & Credentials**: Real-time display name synchronization with Firebase Authentication.
- **Appearance & Typography**: Toggle between Light Atmosphere and Dark Twilight modes, with customizable reading typography (*Sans*, *Serif*, or *Monospace*).
- **Mindful Reminders**: Active background monitoring system that securely generates in-app notifications at user-defined preferred times for Evening Reflection and Daily Gratitude routines.
- **Security & Privacy Audit**: Interactive inspector detailing security boundaries, encryption status, and data partitioning guarantees.
- **Client-Side PIN Lock**: Optional 6-digit application PIN lock to protect journal entries on shared devices, utilizing SHA-256 hashing.
- **Auto-Lock Inactivity Timer**: Configurable auto-lock mechanism (1-30 minutes) that actively monitors interactions to secure the application when left unattended.
- **Data Sovereignty & Export**: Export your complete journal archive into structured **JSON** or formatted **Markdown** files for offline backup.
- **Account Controls**: Temporary account deactivation or permanent account purging (recursively deleting all Firestore entries and Firebase Auth identity).

### 7. 📱 Mobile & Tablet Responsive UX
- **Desktop Top Navigation**: Sleek top header bar with quick-access tabs and profile avatar menu.
- **Mobile Bottom Navigation Bar**: Fixed, touch-optimized bottom menu bar (`md:hidden`) for phones ensuring single-thumb tab switching across Reflection, History, Insights, Gratitude, and Settings.
- **Fluid Layouts**: Responsive grids engineered to adapt smoothly across mobile phones, tablets (iPad), and desktop monitors.

---

## 🏗️ Architecture & Technology Stack

```text
+-----------------------------------------------------------------------------------+
|                                 CLIENT (BROWSER)                                  |
|  - React 18 + TypeScript + Tailwind CSS + Recharts + Motion                       |
|  - Firebase Client SDK (Google Auth & UID-Scoped Firestore Listeners)             |
|  - Desktop Header & Mobile Bottom Navigation Bar                                  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTP / API Proxy Routes (/api/*)
                                          v
+-----------------------------------------------------------------------------------+
|                               BACKEND (CLOUD RUN)                                 |
|  - Express.js API Server (Node.js / TypeScript)                                   |
|  - Google Gemini API Orchestration Layer (@google/genai)                          |
|  - Multi-Model Resilience Fallback Strategy                                       |
|  - Asynchronous Memory Context & Insight Synthesizers                             |
+-------------------+---------------------------------------+-----------------------+
                    |                                       |
      Secret Manager| (Runtime GEMINI_API_KEY)              | Firestore Operations
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
- **Frontend Framework**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Framer Motion.
- **Backend API Layer**: Express.js server running in Cloud Run container.
- **Database & Authentication**: Google Cloud Firestore & Firebase Authentication.
- **AI Engine**: `@google/genai` SDK with multi-tiered fallback architecture (`gemini-3.1-flash-lite` ➔ `gemini-3.7-flash` ➔ `gemini-flash-latest`).

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

## 🔐 Security & Privacy Architecture

- **UID-Scoped Firestore Isolation**: Security rules restrict all reads, writes, and deletes to `request.auth.uid == userId`. No cross-tenant reads are permitted.
- **Client-Side Application Lock**: Supports an optional 6-digit PIN utilizing `crypto.subtle` for SHA-256 hashing, alongside an interaction-based inactivity monitor that automatically locks the app (1-30 minutes).
- **Server-Side API Proxying**: The Gemini API key (`GEMINI_API_KEY`) is stored in Google Cloud Secret Manager and accessed exclusively by the server. No secrets are ever exposed to the client bundle.
- **Input Sanitization**: User reflection text is sanitized and length-capped on the server before model evaluation to prevent prompt injection and context overflow.
- **Data Sovereignty**: Permanent account deletion executes a full recursive deletion of all Firestore collections linked to the user's UID alongside Firebase Auth deletion.

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
