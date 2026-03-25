# InterviewAI — Design Document

> **Version:** 2.0  
> **Date:** March 2026  
> **Status:** Active Development

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Schema](#6-database-schema)
7. [Core Features & Data Flows](#7-core-features--data-flows)
8. [API Reference](#8-api-reference)
9. [AI Interviewer Personas](#9-ai-interviewer-personas)
10. [Proctoring System](#10-proctoring-system)
11. [Security Model](#11-security-model)
12. [Environment Configuration](#12-environment-configuration)
13. [Running Locally](#13-running-locally)

---

## 1. Project Overview

**InterviewAI** is a full-stack AI-powered technical interview simulator. Candidates interact with a **photorealistic AI avatar** (powered by Tavus CVI) that can see them via webcam, read their code in real-time, and adapt its interview style to one of three curated personas — *The Griller*, *The Mentor*, or *The Behavioral Expert*.

### Key Differentiators

| Feature | Description |
|---------|-------------|
| **AI that sees you** | Tavus Raven-1 perception layer tracks gaze, face count, and emotion |
| **Live code awareness** | AI reads the Monaco editor in real-time via Tavus context PATCH API |
| **Resume-to-persona pipeline** | Gemini AI parses resume → recommends best interview vibe |
| **Three vibe personas** | Distinct system prompts, avatars, and tones per interviewer type |
| **Integrity scoring** | Proctoring events (gaze, multiple faces) feed into a 0–100 integrity score |
| **Sandboxed code execution** | Judge0 API runs code in 6 languages with stdout/stderr diffing |
| **Auth-gated** | JWT-based auth backed by PostgreSQL |

---

## 2. System Architecture

```mermaid
graph TB
    subgraph Browser["Browser (Next.js 16)"]
        LP[Landing Page]
        AUTH[Auth Page\nLogin / Register]
        SETUP[Setup Page\nResume + Vibe Picker]
        ROOM[Interview Room\nVideo + Editor + Proctoring]
        REPORT[Final Report\nScores + Feedback]
    end

    subgraph Backend["FastAPI Backend (Python)"]
        AUTHAPI["/auth/*\nJWT Auth Routes"]
        RESUMEAPI["/api/parse-resume\n/api/extract-profile"]
        CODEAPI["/api/run-code\n/api/push-code-context"]
    end

    subgraph External["External Services"]
        TAVUS["Tavus CVI API\nRaven-1 Perception\nSparrow-1 Turn-Taking"]
        GEMINI["Google Gemini 2.5 Flash\nResume Parsing & Vibe Analysis"]
        JUDGE0["Judge0 API\nSandboxed Code Execution"]
        DAILY["Daily.co WebRTC\nVideo + Audio Transport"]
        PSQL["PostgreSQL (ai_interview)\nUser Accounts"]
    end

    AUTH -->|POST /auth/register\nPOST /auth/login| AUTHAPI
    SETUP -->|POST /api/parse-resume\nPOST /api/extract-profile| RESUMEAPI
    ROOM -->|POST /api/push-code-context| CODEAPI
    ROOM -->|POST /api/run-code| CODEAPI

    AUTHAPI <-->|asyncpg| PSQL
    RESUMEAPI -->|Gemini REST API| GEMINI
    CODEAPI -->|RapidAPI| JUDGE0
    CODEAPI -->|PATCH /v2/conversations/{id}| TAVUS

    ROOM <-->|Daily.co callObject\nWebRTC| DAILY
    DAILY <-->|CVI Gateway| TAVUS
```

---

## 3. Technology Stack

### Frontend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | **Next.js 16** (App Router, Turbopack) | SSR/SSG, routing, image optimisation |
| Language | **TypeScript** | Type safety across all components |
| Styling | **Vanilla CSS** (design tokens in globals.css) | Full design control, glassmorphism |
| Video / AI | **Daily.js** (`createCallObject`) | WebRTC video/audio transport |
| Code Editor | **Monaco Editor** (`@monaco-editor/react`) | VS Code engine in browser |
| Icons | **Lucide React** | Consistent icon set |
| Auth State | **React Context** ([AuthContext](file:///c:/Python/Scripts/AI_InterView/frontend/src/context/AuthContext.tsx#15-23)) | JWT token management |
| Fonts | **Inter**, **JetBrains Mono** (Google Fonts) | UI + code editor typography |

### Backend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | **FastAPI** (Python 3.11+) | Async REST API |
| ORM | **SQLAlchemy 2.0** (async) | PostgreSQL access |
| Driver | **asyncpg** | High-performance async PostgreSQL driver |
| Auth | **python-jose** + **passlib[bcrypt]** | JWT creation & password hashing |
| PDF Parsing | **PyPDF2** | Extract text from resume PDFs |
| AI Client | **httpx** (async) | Gemini & Tavus REST calls |
| Server | **Uvicorn** | ASGI server with hot reload |

### Infrastructure

| Service | Role |
|---------|------|
| **PostgreSQL 17** | Persistent user storage |
| **Tavus API** | AI avatar lifecycle management |
| **Gemini 2.5 Flash** | Resume analysis, vibe recommendation |
| **Judge0 (RapidAPI)** | Code execution sandbox |
| **Daily.co** | WebRTC infrastructure |

---

## 4. Frontend Architecture

### Directory Structure

```
frontend/src/
├── app/
│   ├── layout.tsx          # Root layout — wraps in AuthProvider
│   ├── page.tsx            # Main orchestrator (all app states)
│   └── globals.css         # Design tokens, utility classes
├── components/
│   ├── AuthPage.tsx        # Login / Register modal
│   ├── ResumeUploader.tsx  # PDF drop-zone + manual entry form
│   ├── VibePicker.tsx      # Interviewer selector with AI badge
│   ├── TavusVideoCall.tsx  # Daily.js callObject + PiP webcam
│   ├── CodeEditorPanel.tsx # Monaco editor + run button + output panel
│   ├── InterviewRoom.tsx   # Master interview layout (video + editor + proctoring)
│   └── FinalReport.tsx     # Score breakdown + feedback summary
├── config/
│   └── TavusConfig.ts      # Vibe configs, replica IDs, conversation builder
├── context/
│   └── AuthContext.tsx     # JWT auth state, login/register/logout
├── hooks/
│   ├── useCodeSync.ts      # Periodic code push to backend/Tavus
│   └── useProctoring.ts    # Gaze + multi-face integrity tracking
└── types/
    └── interview.ts        # All TypeScript interfaces
```

### Application State Machine

```mermaid
stateDiagram-v2
    [*] --> loading : App mounts
    loading --> auth : No JWT in localStorage
    loading --> landing : Valid JWT found
    auth --> landing : Login / Register success
    landing --> setup : Click "Start Interview"
    setup --> setup : Upload resume (Step 1 → Step 2)
    setup --> connecting : Launch Interview clicked
    connecting --> interview : Tavus conversation created
    interview --> report : End Interview clicked
    report --> landing : Restart
```

### Key Component: [TavusVideoCall](file:///c:/Python/Scripts/AI_InterView/frontend/src/components/TavusVideoCall.tsx#37-490)

Uses `DailyIframe.createCallObject` (not iframe) for full `MediaStreamTrack` control:

```
getUserMedia()          → enumerate cameras, request permission
createCallObject()      → headless Daily instance
call.join(roomUrl)      → connect to Tavus Daily room
track-started event     → attach AI video to <video> element
                           attach user video to PiP <video>
                           attach AI audio to hidden <audio>
```

---

## 5. Backend Architecture

### Module Layout

```
backend/
├── main.py        # FastAPI app, all route handlers
├── auth.py        # JWT encode/decode, bcrypt password utils
├── database.py    # SQLAlchemy async engine, session dependency
├── models.py      # ORM models (User)
└── .env           # Secrets (never committed)
```

### Request Lifecycle

```mermaid
sequenceDiagram
    participant FE as Next.js Frontend
    participant FA as FastAPI
    participant PG as PostgreSQL
    participant GM as Gemini API
    participant TV as Tavus API

    Note over FE,TV: Resume Upload Flow
    FE->>FA: POST /api/parse-resume (PDF binary)
    FA-->>FE: { text: "raw resume text..." }
    FE->>FA: POST /api/extract-profile { text }
    FA->>GM: Gemini 2.5 Flash prompt
    GM-->>FA: JSON { name, skills, suggestedVibe, vibeReason }
    FA-->>FE: CandidateProfile

    Note over FE,TV: Live Code Context Push
    FE->>FA: POST /api/push-code-context { code, conversation_id }
    FA->>TV: PATCH /v2/conversations/{id} { conversational_context }
    TV-->>FA: 200 OK
    FA-->>FE: { tavus_context_updated: true }
```

---

## 6. Database Schema

### `users` table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| [id](file:///c:/Python/Scripts/AI_InterView/frontend/src/components/TavusVideoCall.tsx#22-23) | `VARCHAR(36)` | PK | UUID v4 |
| `name` | `VARCHAR(120)` | NOT NULL | Display name |
| `email` | `VARCHAR(255)` | UNIQUE, INDEX | Lowercase-normalised on insert |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt, 12 rounds |
| `is_active` | `BOOLEAN` | DEFAULT true | Soft-disable flag |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | UTC |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() | Auto-updated |

> **Current state:** Code snapshots and interview sessions are stored in-memory ([_code_snapshots](file:///c:/Python/Scripts/AI_InterView/backend/main.py#498-501) dict). A future `sessions` and [snapshots](file:///c:/Python/Scripts/AI_InterView/backend/main.py#498-501) table should be added for persistence.

---

## 7. Core Features & Data Flows

### 7.1 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as AuthPage.tsx
    participant CTX as AuthContext
    participant FA as FastAPI /auth/*
    participant PG as PostgreSQL

    U->>FE: Fill email + password, click Register
    FE->>FA: POST /auth/register { name, email, password }
    FA->>PG: INSERT INTO users (bcrypt hash)
    PG-->>FA: user row
    FA-->>FE: { access_token (JWT, 7 days), user: {...} }
    FE->>CTX: _saveSession(token, user)
    CTX->>CTX: localStorage.setItem("interviewai_token")
    CTX-->>FE: user state updated
    FE-->>U: Redirected to Landing Page (auth guard lifted)
```

**Token hydration on page refresh:**
1. [AuthContext](file:///c:/Python/Scripts/AI_InterView/frontend/src/context/AuthContext.tsx#15-23) reads `interviewai_token` from `localStorage`
2. Calls `GET /auth/me` with the token
3. If valid → sets [user](file:///c:/Python/Scripts/AI_InterView/backend/main.py#111-128) state; if expired/invalid → clears token, shows auth page

### 7.2 Resume → Vibe Recommendation Pipeline

```mermaid
flowchart LR
    A[User drops PDF] --> B[ResumeUploader\nextracts text via PyPDF2]
    B --> C[POST /api/extract-profile]
    C --> D{Gemini 2.5 Flash}
    D --> E[Returns JSON:\nname + skills +\nsuggestedVibe +\nvibeReason]
    E --> F[VibePicker pre-selects\nrecommended card]
    F --> G[AI PICK badge shown]

    style D fill:#4285f4,color:#fff
    style G fill:#6c63ff,color:#fff
```

**Gemini vibe criteria:**

| Signal | Recommended Vibe |
|--------|-----------------|
| 5+ yrs exp, DSA-heavy, FAANG background | 🔥 **The Griller** |
| 0–3 yrs, bootcamp/self-taught, career changer | 🌱 **The Mentor** |
| Manager / tech lead / MBA / leadership language | 🎯 **The Behavioral Expert** |

**Fallback:** If Gemini is unavailable, a regex/keyword heuristic runs locally on the resume text.

### 7.3 Live Code Context Injection

This is the mechanism that lets the AI avatar "see" the code editor:

```mermaid
sequenceDiagram
    participant ME as Monaco Editor
    participant CS as useCodeSync (every 20s)
    participant FA as POST /api/push-code-context
    participant TV as Tavus PATCH API
    participant AI as AI Avatar (Tavus CVI)

    ME->>CS: code change detected
    CS->>FA: { conversation_id, code, language, phase }
    FA->>FA: Build context string:\n"[LIVE CODE EDITOR — CODING]\n```python\ndef two_sum...```\nAsk about complexity..."
    FA->>TV: PATCH /v2/conversations/{id}\n{ conversational_context: "..." }
    TV-->>AI: Updated context injected
    AI-->>AI: Next speech uses code awareness\n"I see you're using a nested loop —\ncan you get that to O(n)?"
```

**Trigger points:**
- Every **20 seconds** (interval timer) if code has changed
- Immediately on **"Run Code"** button press (`forceSync()`)
- Only sends if code has actually changed since last push (deduplication via `lastSentRef`)

---

## 8. API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | None | Create account. Returns JWT + user |
| `POST` | `/auth/login` | None | Login. Returns JWT + user |
| `GET` | `/auth/me` | Bearer JWT | Get current user profile |

### Resume & Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/parse-resume` | None | Upload PDF → returns raw text |
| `POST` | `/api/extract-profile` | None | Text → structured [CandidateProfile](file:///c:/Python/Scripts/AI_InterView/frontend/src/types/interview.ts#20-30) with vibe suggestion |

### Code Execution & Context

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/run-code` | None | Execute code via Judge0 (6 languages) |
| `POST` | `/api/push-code-context` | None | Store snapshot + PATCH Tavus conversation |
| `POST` | `/api/code-snapshot` | None | Store snapshot locally only |
| `GET` | `/api/code-snapshots/{session_id}` | None | Retrieve stored snapshots |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |

---

## 9. AI Interviewer Personas

Three distinct personas, each backed by a different Tavus replica and system prompt:

### 🔥 The Griller (`replica: rdd4c86e5e1a`)
- **Tone:** Intense, professional, zero-tolerance for vague answers
- **Behaviour:** Interrupts rambling (>30s), never gives hints unprompted, challenges every sub-optimal answer ("Can you do better than O(n²)?")
- **Best for:** Senior engineers (5+ yrs), FAANG prep

### 🌱 The Mentor (`replica: r72f7f7f7c8b`)
- **Tone:** Warm, encouraging, growth-mindset
- **Behaviour:** Gives hints if stuck >60s, validates every attempt, focuses on thought process over perfect answers
- **Best for:** Early-career (0–3 yrs), bootcamp grads, career-changers

### 🎯 The Behavioral Expert (`replica: rf4e9d9790f0`)
- **Tone:** Empathetic, STAR-method focused, culture-oriented
- **Behaviour:** Situational questions, leadership scenarios, probes for team impact and values
- **Best for:** Managers, tech leads, product roles, senior ICs with leadership scope

---

## 10. Proctoring System

The [useProctoring](file:///c:/Python/Scripts/AI_InterView/frontend/src/hooks/useProctoring.ts#19-171) hook processes perception events from the Tavus Raven-1 model:

```mermaid
flowchart TD
    A[Tavus Raven-1 perception_update event] --> B{gaze status?}
    B -->|distracted / looking_away| C[Start gaze timer]
    C --> D{> 5 seconds?}
    D -->|Yes| E[Fire warning alert\nLog ProctoringEvent]
    D -->|No| F[Decrement integrityScore by 0.05]
    B -->|focused| G[Reset gaze timer\nLog resumed_focus if > 2s]

    A --> H{face_count?}
    H -->|> 1 face| I[Start multi-face timer]
    I --> J{> 5 seconds?}
    J -->|Yes| K[Fire danger alert\nLog ProctoringEvent]
    J -->|No| L[Decrement integrityScore by 0.1]
    H -->|= 1 face| M[Reset multi-face timer]
```

**Integrity Score (0–100):**
- Starts at 100
- Decremented continuously during gaze-away (-0.05/tick) and multi-face (-0.1/tick) events
- Clamped to 0 floor
- Included in Final Report alongside technical scores

**Alert cooldown:** Same alert type cannot re-fire within 30 seconds to avoid spamming.

---

## 11. Security Model

| Concern | Approach |
|---------|----------|
| **Password storage** | bcrypt with passlib (12 rounds) |
| **Token format** | HS256 JWT signed with `JWT_SECRET_KEY`, 7-day expiry |
| **Token storage** | `localStorage` (client-side) |
| **Transport** | HTTPS in production (HTTP in local dev) |
| **CORS** | Restricted to `localhost:3000` in dev |
| **Email normalisation** | Lowercased before storage + index |
| **API key exposure** | Tavus/Gemini keys are env vars; Tavus key also sent from client for real-time push (acceptable in demo) |

> [!CAUTION]
> The Tavus API key is sent from the frontend to the backend in `/api/push-code-context`. For production, store it server-side only and remove it from `NEXT_PUBLIC_*` env vars.

---

## 12. Environment Configuration

### [backend/.env](file:///c:/Python/Scripts/AI_InterView/backend/.env)

```env
GEMINI_API_KEY=<your-gemini-api-key>
JUDGE0_API_KEY=<your-judge0-rapidapi-key>

DATABASE_URL=postgresql://divya:***@localhost:5432/ai_interview

JWT_SECRET_KEY=<long-random-string-change-in-production>
```

### [frontend/.env.local](file:///c:/Python/Scripts/AI_InterView/frontend/.env.local)

```env
NEXT_PUBLIC_TAVUS_API_KEY=<your-tavus-api-key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 13. Running Locally

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 17 running locally
- Database `ai_interview` created

### Backend

```bash
cd backend
pip install fastapi uvicorn asyncpg sqlalchemy[asyncio] alembic \
            python-jose[cryptography] passlib[bcrypt] \
            PyPDF2 httpx python-dotenv
python -m uvicorn main:app --reload --port 8000
# Tables auto-created on first startup
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App live at http://localhost:3000
```

### Service Map

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Next.js dev server |
| Backend API | http://localhost:8000 | FastAPI + uvicorn |
| API Docs | http://localhost:8000/docs | Auto-generated Swagger UI |
| Redoc | http://localhost:8000/redoc | Alternative API docs |

---

## Appendix: TypeScript Type Model

```mermaid
classDiagram
    class CandidateProfile {
        +string name
        +string? email
        +string[] topSkills
        +string? experience
        +string? education
        +VibeType? suggestedVibe
        +string? vibeReason
    }

    class InterviewSession {
        +string id
        +CandidateProfile candidate
        +VibeType vibe
        +InterviewPhase phase
        +number startTime
        +number? endTime
        +string? conversationId
        +ProctoringEvent[] proctoringEvents
        +CodeSnapshot[] codeSnapshots
        +InterviewScore? scores
        +string[] feedbackNotes
    }

    class InterviewScore {
        +number technical
        +number softSkills
        +number problemSolving
        +number integrity
        +number overall
    }

    class VibeConfig {
        +VibeType id
        +string name
        +string tagline
        +string icon
        +string color
        +string[] traits
        +string systemPromptAddendum
    }

    InterviewSession --> CandidateProfile
    InterviewSession --> InterviewScore
    InterviewSession --> VibeConfig
```
