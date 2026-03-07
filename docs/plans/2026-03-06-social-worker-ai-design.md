# Social Worker AI — Design Document

**Date:** 2026-03-06
**Author:** Jason Fernandez + Claude Opus 4.6
**Status:** Approved
**Context:** Hackathon MVP (72hr) evolving into production product

---

## 1. Overview

Social Worker AI is a crisis-aware AI chatbot platform by **60 Watts of Clarity**. It serves therapists and social workers with a client-facing support tool that detects crisis situations and activates a protocol connecting a trained AI social worker, human intervention, and multi-channel notifications (SMS, voice, email).

### Goals

1. **Hackathon:** Working product with professional backend build quality
2. **Long-term:** Production-grade SaaS product for therapists
3. **Design:** Visually innovative — not generic AI-generated aesthetics

### Repo Rename

- **From:** `soicalworkerai` → **To:** `social-worker-ai`
- Update: GitHub repo name, package.json, README, git remote

---

## 2. Architecture

```
social-worker-ai/
├── chatbot/          # Embeddable React widget (React 18 + Vite)
├── dashboard/        # Admin monitoring panel (React 18 + Vite + R3F)
├── server/           # Node.js backend (Express + Socket.io)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

### Stack

| Layer | Technology |
|-------|-----------|
| **Chatbot Widget** | React 18, Socket.io, GSAP, Rive, Tailwind CSS |
| **Dashboard** | React 18, React Three Fiber, @react-three/drei, @react-three/postprocessing, GSAP, Tailwind CSS |
| **Server** | Node.js 20, Express 4, Socket.io 4 |
| **Database** | MySQL 8+ |
| **AI** | Launch Lemonade API (primary), Claude API (backup) |
| **Notifications** | Twilio (SMS + voice), SendGrid (email) |
| **Security** | AES-256-CBC, JWT, bcrypt, Helmet, rate limiting |
| **Container** | Docker (Node:20-alpine) |

### Database Schema (5 tables)

- **users** — therapists & admins (email, bcrypt hash, role, lemonade_api_key)
- **sessions** — chat sessions (UUID, crisis_active, lemonade_conversation_id)
- **messages** — encrypted content + IV per message (AES-256-CBC)
- **audit_log** — immutable trail (actor, action, detail metadata only)
- **notifications** — SMS/call/email delivery log with status

---

## 3. Design System: "Ember Protocol"

A design language that is warm but urgent, spatial but not gamified, alive but not aggressive.

### 3.1 Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Base (dark) | `#1A1614` | Page backgrounds — warm charcoal, not cold black |
| Surface | `#2A2421` | Cards, panels, elevated surfaces |
| Accent primary | `#E8913A` | CTAs, crisis energy, key actions — evolved from 60 Watts yellow |
| Accent secondary | `#C4785C` | Secondary actions, warm copper glow |
| Safe state | `#7BA68C` | Non-crisis indicators, calm states |
| Crisis state | `#D94F4F` | Urgent alerts — deep coral, not aggressive red |
| Text primary | `#F0EBE3` | Body text — warm white, not pure white |
| Text secondary | `#A89B8C` | Labels, subdued text — muted sand |
| Frosted glass | `rgba(42, 36, 33, 0.7)` + `backdrop-filter: blur(16px)` | Overlays — warm-tinted frost |

### 3.2 Typography

| Use | Font | Rationale |
|-----|------|-----------|
| Headings | **GT Alpina** (serif) | Expressive ball terminals, angled contrast — intellectual but warm |
| Body / UI | **Replica** (sans-serif) | 70-unit grid, bevelled corners — systematic but characterful |
| Mono / Data | **JetBrains Mono** | Session IDs, timestamps, audit data |

### 3.3 Banned Defaults

These patterns are explicitly forbidden in this codebase:

- **Fonts:** Inter, Roboto, Arial, system-ui as primary
- **Colors:** Purple gradients, pure white (#fff) backgrounds, blue-on-white
- **Layouts:** Flat card grids with uniform shadows, cookie-cutter dashboards
- **Components:** Bouncing dot loaders, generic progress bars
- **Backgrounds:** Solid white, solid gray, flat single-color
- **Motion:** No animation, or scattered uncoordinated micro-interactions

### 3.4 Component Patterns

- **Panels:** Frosted glass with warm tint — `backdrop-filter: blur(16px)`, warm rgba overlay
- **Buttons:** Ember gradient (`#E8913A` → `#C4785C`), subtle glow on hover
- **Inputs:** Dark surface with warm border, amber focus ring
- **Status indicators:** Sage green (safe) / pulsing coral (crisis) — never flat badges
- **Transitions:** Orchestrated staggered reveals on page load (GSAP `animation-delay`)

---

## 4. Dashboard — 3D Spatial Command Center

### 4.1 The Crisis Constellation (React Three Fiber)

Each active session is a glowing node in 3D space:

- **Non-crisis sessions:** Dim sage-green orbs (`#7BA68C`), slowly drifting
- **Crisis sessions:** Pulsing deep coral nodes (`#D94F4F`) with particle emission
- **Therapist threads:** Thin light connections between sessions from the same therapist
- **Interaction:** Click a node → zoom transition → frosted-glass detail panels slide in

### 4.2 Crisis Activation Animation

When a crisis triggers:
1. Node ignites — particle burst outward
2. Ripple wave propagates through the constellation
3. Bloom effect intensifies on the crisis node
4. Frosted panel auto-opens with the intercepted session chat
5. Optional ambient audio cue (subtle, not alarming)

### 4.3 Dashboard Panels

Overlaid on the 3D scene as frosted glass:
- Session detail with encrypted chat transcript (decrypted on load)
- Audit trail with JetBrains Mono timestamps
- Notification log color-coded by channel
- Admin intercept input at bottom of crisis view

### 4.4 Tech Stack

```
@react-three/fiber     — React renderer for Three.js
@react-three/drei      — Helpers (OrbitControls, Text, Billboard)
@react-three/postprocessing — Bloom, depth of field, vignette
Custom GLSL shaders    — Ember particle system
GSAP                   — Panel transitions, staggered reveals
```

---

## 5. Chatbot Widget — Reactive & Alive

### 5.1 Idle State
- Chat bubble with subtle warm glow (GSAP animation)
- Micro-particle embers floating around edges
- Opens with orchestrated reveal: panel slides up, messages stagger in

### 5.2 Active Chat
- Messages enter with physics-based easing (GSAP spring)
- AI typing indicator: Rive animation — organic flowing shape, not bouncing dots
- Client messages: warm amber tint cards
- AI messages: frosted glass cards with subtle depth shadow
- Admin messages: copper accent border

### 5.3 Crisis Mode
- Widget border shifts to pulsing coral gradient
- Background darkens subtly
- "Crisis Protocol Active" banner with urgency (not panic)
- Admin intercept messages distinguished with copper accent

### 5.4 Tech Stack

```
GSAP + ScrollTrigger   — Animations, transitions, physics easing
Rive (@rive-app/react) — Typing indicator, state-aware animations
Tailwind CSS           — Layout and utility styles
```

---

## 6. Development Priorities (Ordered)

1. **Security & HIPAA-awareness** — encryption, auth, audit trails, no plaintext in logs
2. **Reliability** — error handling, graceful degradation, crash resilience
3. **Code quality** — ESLint, Prettier, consistent patterns, testing
4. **Production readiness** — Docker, env config, deployment pipeline
5. **Feature completeness** — all crisis detection, notifications, dashboard working E2E

---

## 7. Security Requirements

### Encryption
- All chat messages: AES-256-CBC at rest
- Key derivation: ENCRYPTION_KEY → SHA-256 → 32 bytes
- Random 16-byte IV per message
- Decrypt only on authenticated retrieval (therapist owns session OR admin + crisis_active)

### Authentication
- JWT with configurable expiry (default 24h)
- bcrypt password hashing (salt rounds: 10+)
- Role-based access: therapist, admin
- Socket auth: JWT in handshake for dashboard; client widget unauthenticated

### Access Control
- Therapists: own sessions only
- Admins: crisis-active sessions only (prevents data fishing)
- Every access logged to audit_log with actor + timestamp

### Rate Limiting
- Global API: 100 req/15min
- Auth endpoints: 20 req/15min
- Response: 429 with retry-after

### Network
- Helmet security headers
- CORS whitelist via ALLOWED_ORIGINS
- WebSocket transport: websocket only (no polling fallback in production)
- TwiML XML escaping (prevent injection)
- SendGrid HTML escaping (prevent XSS)

### Audit Trail
- Immutable — no delete/update in codebase
- Metadata only — never plaintext message content
- Actions tracked: crisis_activated, viewed, intercepted, listed_crisis_sessions

---

## 8. External Service Integrations

### Launch Lemonade API
- Endpoint: `https://sip.launchlemonade.app/api/1.1/wf/run_assistant`
- Default Assistant ID: `1772822866868x782078534383128200`
- Per-therapist API keys supported
- Conversation continuity via returned Conversation_ID

### Twilio
- SMS alerts to TWILIO_MONITOR_PHONE
- Voice calls with TwiML (voice: "alice")
- XML-escaped dynamic content

### SendGrid
- HTML email alerts to SENDGRID_MONITOR_EMAIL
- HTML-escaped dynamic content
- Formatted crisis alert template

---

## 9. Implementation Phases

### Phase 1: Foundation (Hours 0-24)
- Repo rename and CLAUDE.md
- Backend hardening: input validation, error boundaries, env validation
- Database migrations tooling
- Security audit of existing code

### Phase 2: Design System (Hours 24-48)
- Ember Protocol Tailwind config (colors, typography, spacing)
- Frosted glass component primitives
- GSAP animation utilities
- Chatbot widget redesign

### Phase 3: 3D Dashboard (Hours 48-72)
- React Three Fiber crisis constellation
- Particle system and bloom effects
- Frosted glass overlay panels
- Real-time WebSocket integration with 3D scene
- Crisis activation animation sequence

### Phase 4: Post-Hackathon
- Testing suite (unit + integration)
- CI/CD pipeline
- Performance optimization
- Rive typing indicator
- Audio cues
- Multi-tenant therapist onboarding
