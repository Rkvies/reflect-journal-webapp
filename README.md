# Reflect — Agentic Personal Journaling App

Reflect is a security-first, agentic personal journaling application powered by **Google Gemini** and **Google Cloud Firestore**. Rather than functioning as a transient conversational chat wrapper, Reflect serves as a mindful, persistent reflection companion that builds long-term memory over time. By combining an asynchronous biographical memory synthesis layer with on-demand thematic insight extraction and proactive check-in nudges, Reflect continuously identifies personal growth patterns, tracks emotional trajectories, and gives users full control over their own data.

---

## Features

- **Firebase Google Sign-In Authentication**: Streamlined, secure client-side authentication supporting Google Identity Services with complete session persistence.
- **Multi-Turn Conversational Journaling with Real-Time Streaming**: Live token-by-token response streaming powered by Gemini Server-Sent Events (SSE), allowing users to engage in a seamless, introspective dialogue about their day.
- **Long-Term Memory & Context Synthesis**: An asynchronous memory engine that maintains a concise running psychological profile (`users/{uid}/profile/summary`), combining it with recent journal history to ground every response in genuine personal context.
- **On-Demand Structured Insights with Entry Citations**: Analytical reports generating extracted themes, emotional trajectories, notable behavioral shifts, and actionable growth suggestions, explicitly citing the specific entries that informed each insight.
- **Independent "Weekly Recap" Modal**: A dedicated, independent recap card (decoupled from the standard Insights generation) that analyzes entries from the past 7 days to produce an inspiring narrative synthesis and forward-looking horizon prompts.
- **Proactive Agentic Nudges**: Autonomous check-in prompts designed to simulate scheduled background review jobs, detecting reflection lapses or emotional milestones and inviting the user back with tailored prompts (with working dismiss/persistence).
- **Full Entry Lifecycle Management**: Complete author control allowing users to create, edit titles, contents, tags, and moods, or permanently delete historical reflections.
- **Account Management & Data Sovereignty**: Full control over user data. Users can temporarily deactivate their account (data preserved, reversible) or execute a permanent deletion (requires typed confirmation, executing a full verified removal of all user data and Firebase Auth identity).
- **Daily Quote Popup**: A curated, static list of mindful reflection quotes presented in a focused popup modal, shown exactly once per day.
- **Curated Writing-Starter Suggestions**: Categorized reflection starters to break through blank-page friction.
- **Polished User Experience**: Mindful typography, theme toggles (Dark / Light mode), subtle ambient animations, accessible focus states, empty state guidance, and loading indicators.

---

## Architecture

### System Flow Diagram

```text
+-----------------------------------------------------------------------------------+
|                                  CLIENT (BROWSER)                                 |
|  - React 18 + TypeScript + Tailwind CSS                                           |
|  - Firebase Client SDK (Google Auth & UID-Scoped Firestore Listeners)             |
|  - Chat UI, Insights Dashboard, Weekly Recap Modal, Settings                      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTP / Server-Sent Events (JSON)
                                          v
+-----------------------------------------------------------------------------------+
|                               BACKEND (CLOUD RUN)                                 |
|  - Express.js API Layer (Node.js / TypeScript)                                    |
|  - Server-Side Gemini API Orchestration                                           |
|  - Asynchronous Memory Summarizer & Weekly Recap Generator                        |
+-------------------+---------------------------------------+-----------------------+
                    |                                       |
     Secret Manager | (Runtime Secret Injection)            | Firestore Access
     (GEMINI_API_KEY)                                       v
                    |                   +-------------------------------------------+
                    v                   |          GOOGLE CLOUD FIRESTORE           |
+-----------------------------------+   |  - users/{uid}/entries                    |
|    GEMINI API (@google/genai)     |   |  - users/{uid}/profile/summary            |
|  - Conversational Streaming (SSE) |   |  - users/{uid}/insights/{insightId}       |
|  - Structured JSON Insight Schema |   |  - users/{uid}/insights/weeklySummary     |
|  - Autonomous Nudge Generation    |   |  - users/{uid}/nudges                     |
+-----------------------------------+   |  - users/{uid} (account status, lastQuote)|
                                        +-------------------------------------------+
```

### Firestore Data Model

All user records are strictly partitioned under private, UID-scoped document paths:

- `users/{uid}/entries/{entryId}`: Individual journal reflections, containing `title`, `content`, `mood`, `tags`, and conversational turns.
- `users/{uid}/profile/summary`: Running long-term memory document synthesized by Gemini.
- `users/{uid}/insights/{insightId}`: Structured psychological pattern & mood trend reports.
- `users/{uid}/insights/weeklySummary`: Cached 7-day Weekly Recap document.
- `users/{uid}/nudges/{nudgeId}`: Proactive check-in prompts generated for the user.
- `users/{uid}` (Root Document): Tracks global preferences like account deactivation status and `lastQuoteShownDate`.

### Memory & Retrieval Pattern (RAG)

Reflect avoids dumping unconstrained raw transcripts into the model prompt. Before Gemini generates a response to a new reflection turn, the backend injects the user's running `profile/summary` document and the 3–5 most recent journal entries into a protected system context block. Profile summary updates are batched asynchronously across entry intervals, distilling long-term context while minimizing token overhead. 

### Weekly Recap and Insights Independence

Architecturally, the on-demand Insights generation and the Weekly Recap modal operate entirely independently. They rely on separate UI entry points, hit distinct backend orchestration routes, and store their results in separate Firestore paths (`users/{uid}/insights/{insightId}` vs. `users/{uid}/insights/weeklySummary`). This separation of concerns allows the weekly summary to act as a focused, lightweight chronological digest without triggering a heavy, historical thematic analysis.

---

## Security Considerations

### Threat Model & Defense Strategy

- **Cross-User Data Leakage**: Attribute-Based Access Control (ABAC) enforced directly within `firestore.rules`. Every collection is partitioned under `/users/{userId}/**` and strictly checked against `request.auth.uid == userId`. Global collection reads or cross-tenant queries are rejected by default.
- **Prompt Injection**: User-supplied reflection content is passed through structured prompts and bounded by strict system instructions to mitigate malicious adversarial instructions.
- **API Key & Secret Exposure**: 100% server-side Gemini invocation. The client communicates exclusively with Express endpoints (`/api/*`). Secret keys are provisioned through Google Cloud Secret Manager. **No secrets, credentials, or internal tenant identifiers are hardcoded or committed anywhere in this repository.**

### Firestore Security Rules

The application utilizes strict, deny-by-default rules to enforce UID-scoped isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Strictly isolate all documents under users/{userId} to the authenticated owner
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Explicitly deny any access outside the authenticated user's tree
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Account Deletion & Data Sovereignty

Reflect respects user data sovereignty. When a user executes a Permanent Delete from the Account settings, they must pass a typed confirmation check. The application then performs a full, verified backend removal of all nested subcollections (entries, insights, nudges, profiles), deletes the root user document, and revokes/deletes the Firebase Authentication identity. This action is irreversible and scoped strictly to the authenticated user's UID.

### Incident Transparency: Secret Exposure Handling

During the development phase of this project, an API key was briefly committed to the repository and detected by GitHub secret scanning. Demonstrating responsible incident response, the exposed key was immediately rotated, invalidated at the provider level, and the repository's commit history was thoroughly cleaned. This stands as a testament to the project's commitment to security best practices and transparent remediation.

---

## Setup & Deployment Steps

### Prerequisites

1. **Google Cloud Project**.
2. **Firebase Project** linked to your Google Cloud project with **Firestore** and **Firebase Authentication** initialized.
3. **Google Cloud CLI (`gcloud`)** installed and configured locally.

### 1. Configure Secret Manager

Store your Gemini API key securely in Google Cloud Secret Manager. Do not commit this value.

```bash
# Enable required APIs
gcloud services enable secretmanager.googleapis.com run.googleapis.com

# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Set the secret value
echo -n "your-gemini-api-key-here" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

### 2. Environment Configuration

The application expects the following environment variables (defined in `.env.example`):
- `GEMINI_API_KEY`: Required for AI generation (supplied via Secret Manager in production).
- `APP_URL`: The hosted URL for self-referential callbacks.

Additionally, a valid `firebase-applet-config.json` containing the public Firebase client SDK configuration must be present in the project root.

### 3. Deploy Firestore Security Rules

Deploy the included security rules to protect user data:

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
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production"
```

---

## Roadmap / Future Enhancements

The current version of Reflect focuses intentionally on core journaling privacy, conversational depth, and secure agentic memory. The following capabilities represent deliberate scope boundaries planned for future iterations rather than omissions:

- **Google Maps Location Tagging**: Optional integration to correlate mood trajectories with physical travel, nature immersion, or workspace settings.
- **External Notification Channels (Email & Slack)**: Delivering proactive nudges and weekly reflection summaries through user-configured external webhooks.
- **Admin RBAC Dashboard**: A scoped Role-Based Access Control dashboard for platform administrators to monitor high-level telemetry without exposing private user entries.
- **Semantic Vector Search**: Using vector embeddings to enable semantic similarity queries across years of journal archives to surface forgotten milestones.
