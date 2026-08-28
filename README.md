# Reflect — Agentic Personal Journaling App

Reflect is a security-first, agentic personal journaling application powered by **Google Gemini** and **Google Cloud Firestore**. Rather than functioning as a transient conversational chat wrapper, Reflect serves as a mindful, persistent reflection companion that builds long-term memory over time. By combining an asynchronous biographical memory synthesis layer with on-demand thematic insight extraction and proactive check-in nudges, Reflect continuously identifies personal growth patterns, tracks emotional trajectories, and surfaces meaningful reflections across a user's journaling journey.

---

## Features

- **Firebase Google Sign-In Authentication**: Streamlined, secure client-side authentication supporting Google Identity Services and email sign-in with complete session persistence.
- **Multi-Turn Conversational Journaling with Real-Time Streaming**: Live token-by-token response streaming powered by Gemini Server-Sent Events (SSE), allowing users to engage in a seamless, introspective dialogue about their day.
- **Long-Term Memory & Context Synthesis**: An asynchronous memory engine that maintains a concise running psychological profile (`users/{uid}/profile/summary`), combining it with recent journal history to ground every response in genuine personal context without runaway token overhead.
- **On-Demand Structured Insights with Entry Citations**: Analytical reports generating extracted themes, emotional trajectories, notable behavioral shifts, and actionable growth suggestions, explicitly citing the specific entries that informed each insight.
- **"Your Week in Reflection" Weekly Summary Card**: A dedicated recap card that analyzes entries from the past 7 days to produce an inspiring narrative synthesis, dominant mood trends, top weekly themes, notable wins, and forward-looking horizon prompts.
- **Proactive Agentic Nudges**: Autonomous check-in prompts designed to simulate scheduled background review jobs, detecting reflection lapses or emotional milestones and inviting the user back with tailored prompts.
- **Full Entry Lifecycle Management (Edit & Delete)**: Complete author control allowing users to edit titles, contents, tags, and moods or remove historical reflections with client and Firestore rule authorization checks.
- **Curated Writing-Starter Suggestions**: Categorized reflection starters (mindfulness, small wins, energy audits, emotional check-ins) with quick insertion and rotation tools to break through blank-page friction.
- **Polished User Experience**: Mindful typography, theme toggle (Dark / Light mode), subtle ambient animations, accessible focus states, and zero-state onboarding guidance.

---

## Architecture

### System Flow Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT (BROWSER)                                 |
|  - React 18 + TypeScript + Tailwind CSS                                           |
|  - Firebase Client SDK (Google Auth & UID-Scoped Firestore Listeners)             |
|  - Real-time Journal Dialogue, Search/Filter, Insights Dashboard, Nudge Banner   |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTP / Server-Sent Events (JSON)
                                          v
+-----------------------------------------------------------------------------------+
|                               BACKEND (CLOUD RUN)                                 |
|  - Express.js API Layer (Node.js / TypeScript)                                    |
|  - Server-Side Gemini 3.7 Flash Orchestration                                      |
|  - Input Sanitization & Prompt Injection Mitigation                               |
|  - Asynchronous Memory Summarizer & Weekly Recap Generator                        |
+-------------------+---------------------------------------+-----------------------+
                    |                                       |
     Secret Manager | (Runtime Secret Injection)            | Firestore Access
     (GEMINI_API_KEY)                                       v
                    |                   +-------------------------------------------+
                    v                   |          GOOGLE CLOUD FIRESTORE           |
+-----------------------------------+   |  - users/{uid}/entries/{entryId}          |
|    GEMINI API (@google/genai)     |   |  - users/{uid}/profile/summary            |
|  - Conversational Streaming (SSE) |   |  - users/{uid}/insights/{insightId}       |
|  - Structured JSON Insight Schema |   |  - users/{uid}/insights/weeklySummary     |
|  - Autonomous Nudge Generation    |   |  - users/{uid}/nudges/{nudgeId}           |
+-----------------------------------+   +-------------------------------------------+
```

### Firestore Data Model

All user records are strictly partitioned under private, UID-scoped document paths:

| Path | Purpose | Key Attributes |
|---|---|---|
| `users/{uid}/entries/{entryId}` | Individual journal reflections and conversational turns | `title`, `content`, `mood`, `tags[]`, `conversation[]`, `createdAt`, `updatedAt` |
| `users/{uid}/profile/summary` | Running long-term memory document synthesized by Gemini | `summary`, `keyThemes[]`, `coreValues[]`, `growthAreas[]`, `lastAnalyzedEntryId`, `updatedAt` |
| `users/{uid}/insights/{insightId}` | Structured psychological pattern & mood trend reports | `themes[]`, `moodTrend`, `notableShift`, `suggestion`, `citedEntryIds[]`, `createdAt` |
| `users/{uid}/insights/weeklySummary` | Cached 7-day "Your Week in Reflection" recap document | `weekRange`, `weekSummary`, `topThemes[]`, `moodTrend`, `dominantMood`, `keyTakeaway`, `highlights[]`, `entryCount`, `daysActive`, `generatedAt` |
| `users/{uid}/nudges/{nudgeId}` | Proactive check-in prompts generated for the user | `prompt`, `reason`, `suggestedTag`, `isDismissed`, `createdAt` |

### Memory & Retrieval Pattern (RAG) & API Efficiency

Reflect avoids dumping unconstrained raw transcripts into the model prompt while minimizing API consumption to **1 call per user interaction**:

1. **Unified Reflection & Sentiment Call**:
   - The primary conversational streaming endpoint (`/api/journal/chat-stream` and `/api/journal/chat`) combines the conversational reflection dialogue with structured visual sentiment metadata (`label`, `emoji`, `color`, `score`, `summary`) in a single prompt execution, eliminating secondary sentiment analysis calls.
2. **Pre-Response Context Injection**:
   - Before Gemini generates a response to a new reflection turn, the backend injects the user's running `profile/summary` document and the 3–5 most recent journal entries into a protected system context block.
3. **Batched Memory Distillation**:
   - Profile summary updates (`/api/journal/update-profile`) are batched asynchronously, executing only after initial entry onboarding or across 3–4 entry intervals rather than triggering on every individual chat turn.
4. **Server-Side In-Memory Caching (TTL-Backed)**:
   - Analytical insights, weekly recaps, profile summaries, and nudges utilize structured server-side caching with TTL expiry to eliminate duplicate model calls during rapid navigation or re-renders.

---

## Security Considerations

### Threat Model & Defense Strategy

- **Cross-User Data Leakage**:
  - *Risk*: A malicious or compromised client attempting to query or modify another user's journal entries or psychological profile.
  - *Mitigation*: Attribute-Based Access Control (ABAC) enforced directly within `firestore.rules`. Every collection and subcollection path is partitioned under `/users/{userId}/**` and strictly checked against `request.auth.uid == userId`. Global collection reads or cross-tenant queries are rejected by default.
- **Prompt Injection via Journal Entries**:
  - *Risk*: User-supplied reflection content containing adversarial instructions attempting to manipulate model system directives.
  - *Mitigation*: Strict input sanitization, max character bounds, isolated prompt delimiter fences (`=== USER MEMORY CONTEXT ===`), and structured JSON response schemas for analytical tasks.
- **API Key & Secret Exposure**:
  - *Risk*: Client bundles exposing sensitive credentials such as `GEMINI_API_KEY` to browser DevTools.
  - *Mitigation*: 100% server-side Gemini invocation. The client communicates exclusively with Express endpoints (`/api/journal/*`). Secret keys are provisioned through Google Cloud Secret Manager and accessed via server environment variables.
- **Runaway Token Costs & Denial of Wallet**:
  - *Risk*: Repeated automated calls to heavyweight insight analysis.
  - *Mitigation*: Insight and weekly summary generation is decoupled from regular chat streaming and is only triggered on explicit user demand or cached daily at `users/{uid}/insights/weeklySummary`.

### Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Strictly isolate all documents under users/{userId} to the authenticated owner
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Explicitly deny any access outside the authenticated user's private tree
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Setup & Deployment Steps

### Prerequisites

1. **Google Cloud Project** with billing enabled.
2. **Firebase Project** linked to your Google Cloud project with **Firestore** and **Firebase Authentication** (Google provider) initialized.
3. **Google Cloud CLI (`gcloud`)** installed and configured locally.
4. **Node.js 18+** installed.

### 1. Configure Secret Manager

Store your Gemini API key in Google Cloud Secret Manager:

```bash
# Enable required APIs
gcloud services enable secretmanager.googleapis.com run.googleapis.com

# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Set the secret value
echo -n "your-gemini-api-key-here" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

### 2. Environment Configuration

Create a `.env` file in the root directory (referencing `.env.example`):

```env
GEMINI_API_KEY=your-gemini-api-key-here
PORT=3000
NODE_ENV=production
```

Ensure `firebase-applet-config.json` is present in the workspace root with your Firebase web configuration:

```json
{
  "apiKey": "your-firebase-web-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "your-sender-id",
  "appId": "your-app-id"
}
```

### 3. Deploy Firestore Security Rules

Deploy the security rules to protect user data:

```bash
firebase deploy --only firestore:rules
```

### 4. Build and Deploy to Cloud Run

Reflect uses a unified full-stack architecture where Express serves the compiled Vite React SPA and proxies AI requests:

```bash
# Install dependencies
npm install

# Build client assets and compile backend bundle
npm run build

# Deploy container to Cloud Run with Secret Manager binding
gcloud run deploy reflect-app \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production"
```

---

## Roadmap / Future Enhancements

The current version of Reflect focuses intentionally on core journaling privacy, conversational depth, and secure agentic memory. The following capabilities represent deliberate scope boundaries planned for future iterations:

- **Semantic Vector Search (Vertex AI Vector Search / Firestore Vector Embeddings)**: Enabling semantic similarity queries across years of journal archives to surface forgotten milestones and emotional parallels.
- **External Notification Channels (Email & Slack Digests)**: Delivering proactive nudges and weekly reflection summaries through user-configured external webhooks while maintaining zero-default notification privacy.
- **Client-Side Export & Backup Utilities (Encrypted JSON & Markdown)**: Allowing users to download self-contained, end-to-end encrypted local archives of their reflections and memory graph.
- **Geolocation & Environmental Context Tagging**: Optional Google Maps integration to correlate mood trajectories with physical travel, nature immersion, or workspace settings.
