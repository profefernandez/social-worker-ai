# Social Worker AI — CLAUDE.md

## Identity

- **Product:** AI-Human Crisis Monitoring Platform
- **Company:** 60 Watts of Clarity
- **Founder:** Jason Fernandez, MA, LMSW
- **Repo:** social-worker-ai (rename pending from soicalworkerai)
- **License:** Apache-2.0

## Architecture

Monorepo with 3 workspaces:

```
social-worker-ai/
├── chatbot/       # Embeddable React widget (React 18 + Vite)
├── dashboard/     # Admin monitoring panel (React 18 + Vite + R3F)
├── server/        # Node.js backend (Express + Socket.io)
├── docs/plans/    # Design documents
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

### Stack

| Layer | Technology |
|-------|-----------|
| Chatbot Widget | React 18, Socket.io-client, GSAP, Rive, Tailwind CSS |
| Dashboard | React 18, React Three Fiber, drei, postprocessing, GSAP, Tailwind CSS |
| Server | Node.js 20, Express 4, Socket.io 4 |
| Database | MySQL 8+ (InnoDB, utf8mb4) |
| AI | Launch Lemonade API (primary), Anthropic Claude API (backup) |
| Notifications | Twilio (SMS + voice), SendGrid (email) |
| Container | Docker (Node:20-alpine) |

### External Services

- **Launch Lemonade:** `https://sip.launchlemonade.app/api/1.1/wf/run_assistant`
- **Default Assistant ID:** `1772822866868x782078534383128200`
- **Twilio:** SMS + TwiML voice calls
- **SendGrid:** HTML email alerts

## Development Priorities (Strict Order)

1. **Security & HIPAA-awareness** — encryption, auth, audit trails, no plaintext in logs
2. **Reliability** — error handling, graceful degradation, crash resilience
3. **Code quality** — ESLint, Prettier, consistent patterns, testing
4. **Production readiness** — Docker, env config, deployment
5. **Feature completeness** — crisis detection, notifications, dashboard E2E

## Security Rules (Non-Negotiable)

### Encryption
- ALL chat messages: AES-256-CBC encrypted at rest
- Key derivation: ENCRYPTION_KEY env → SHA-256 → 32 bytes
- Random 16-byte IV per message, stored alongside ciphertext
- Decrypt ONLY on authenticated retrieval (therapist owns session OR admin + crisis_active)
- NEVER log plaintext message content anywhere — audit logs store metadata only

### Authentication
- JWT with configurable expiry (default 24h), signed with JWT_SECRET
- bcrypt password hashing (minimum 10 salt rounds)
- Role-based access: 'therapist' (own sessions only), 'admin' (crisis sessions only)
- Socket auth: JWT in handshake for dashboard; chatbot widget is unauthenticated

### Database
- Use mysql2 with parameterized queries ALWAYS — never string concatenation
- Database user should have minimal privileges (no DROP, GRANT, ALTER in production)
- Use InnoDB engine, utf8mb4 charset on all tables
- Use TIMESTAMP not DATETIME for audit fields
- Foreign keys with ON DELETE constraints

### Rate Limiting
- Global API: 100 req/15min
- Auth endpoints: 20 req/15min
- Return 429 with meaningful (but not leaky) error

### Network
- Helmet security headers on all responses
- CORS restricted to ALLOWED_ORIGINS env (never wildcard in production)
- Twilio TwiML: XML-escape all dynamic content (prevent injection)
- SendGrid: HTML-escape all dynamic content (prevent XSS)
- Error responses MUST NOT leak system internals, stack traces, or PHI

### Audit Trail
- Immutable — no delete/update endpoints exist or should be created
- Log: actor (email or 'system'), action, detail (metadata only)
- Actions: crisis_activated, viewed, intercepted, listed_crisis_sessions
- NEVER store plaintext message content in audit_log.detail

### Input Validation
- Validate all user input server-side (type, length, format)
- Sanitize before storage, escape before rendering
- Session IDs: validate UUID v4 format
- Email: validate format before registration
- Message length: enforce maximum

## Design System: "Ember Protocol"

**Design document:** `docs/plans/2026-03-06-social-worker-ai-design.md`

### Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Base (dark) | `#1A1614` | Page backgrounds — warm charcoal |
| Surface | `#2A2421` | Cards, panels, elevated surfaces |
| Accent primary | `#E8913A` | CTAs, crisis energy, key actions |
| Accent secondary | `#C4785C` | Secondary actions, warm copper glow |
| Safe state | `#7BA68C` | Non-crisis indicators |
| Crisis state | `#D94F4F` | Urgent alerts — deep coral |
| Text primary | `#F0EBE3` | Body text — warm white |
| Text secondary | `#A89B8C` | Labels, subdued text |
| Frosted glass | `rgba(42, 36, 33, 0.7)` + `backdrop-filter: blur(16px)` | Overlays |

### Typography

| Use | Font |
|-----|------|
| Headings | GT Alpina (serif) |
| Body / UI | Replica (sans-serif) |
| Mono / Data | JetBrains Mono |

### BANNED Design Patterns

DO NOT USE any of the following. These are generic AI-generated aesthetics:

- **Fonts:** Inter, Roboto, Arial, system-ui as primary font
- **Colors:** Purple gradients, pure white (#ffffff) backgrounds, generic blue-on-white
- **Layouts:** Flat uniform card grids, cookie-cutter dashboard tables
- **Components:** Bouncing dot loaders, generic progress bars, default shadcn without customization
- **Backgrounds:** Solid white, solid gray, flat single-color fills
- **Motion:** No animation at all, OR scattered uncoordinated micro-interactions
- **Overall:** Anything that looks like "default Tailwind" or "generic SaaS template"

### Required Design Patterns

- **Panels:** Frosted glass with warm tint (`backdrop-filter: blur(16px)`)
- **Buttons:** Ember gradient (`#E8913A` → `#C4785C`), subtle glow on hover
- **Inputs:** Dark surface with warm border, amber focus ring
- **Status:** Sage green (safe) / pulsing coral (crisis) — animated, not flat badges
- **Transitions:** Orchestrated staggered reveals (GSAP `animation-delay`)
- **Dashboard:** 3D spatial constellation (React Three Fiber) — nodes for sessions, not tables

### Dashboard: Crisis Constellation (R3F)

- Non-crisis sessions: dim sage-green orbs, slowly drifting
- Crisis sessions: pulsing coral nodes with particle emission
- Click node → zoom → frosted-glass detail panels
- Crisis activation: particle burst, ripple wave, bloom intensifies
- Tech: React Three Fiber + @react-three/drei + @react-three/postprocessing + custom GLSL shaders

### Chatbot Widget: Reactive & Alive (GSAP + Rive)

- Idle: subtle warm glow, micro-particle embers
- Active: physics-based message easing (GSAP spring), Rive typing indicator
- Crisis mode: pulsing coral border, darkened background, "Crisis Protocol Active" banner
- Message colors: client = amber tint, AI = frosted glass, admin = copper accent

## Code Standards

### General
- ESLint + Prettier enforced (husky pre-commit hooks)
- No `console.log` in production code — use structured logging
- Meaningful variable names — no single letters except loop counters
- Error boundaries on all React component trees
- Graceful degradation: if a service (Twilio, SendGrid, Lemonade) fails, log + continue

### Server
- All routes: validate input → process → respond (no inline business logic)
- All DB queries: parameterized (mysql2 prepared statements)
- All async: try/catch with meaningful error handling
- Environment validation on startup — fail fast if required vars missing

### Frontend
- Components: functional with hooks only
- State: local state for UI, socket events for real-time data
- No inline styles — Tailwind utilities or CSS modules
- Accessibility: ARIA labels on interactive elements, keyboard navigation

### Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- No secrets in commits — .env is gitignored
- PR before merge to main

## Running the Project

```bash
# Install
npm install --ignore-scripts

# Database
mysql -u <user> -p <database> < server/models/schema.sql

# Development (all 3 services)
npm run dev
# Server: http://localhost:3000
# Chatbot: http://localhost:5173
# Dashboard: http://localhost:5174

# Production
docker-compose up -d
```

## Key Files

| Function | Path |
|----------|------|
| Crisis detection | server/services/crisis.js |
| Notifications | server/services/{twilio,sendgrid,lemonade}.js |
| Database | server/config/db.js, server/models/schema.sql |
| Encryption | server/middleware/encryption.js |
| JWT Auth | server/middleware/auth.js |
| WebSocket | server/socket/handler.js |
| Chat widget | chatbot/src/components/{ChatWidget,ChatWindow}.jsx |
| Dashboard pages | dashboard/src/pages/*.jsx |
| Server routes | server/routes/{auth,chat,admin}.js |
| Design doc | docs/plans/2026-03-06-social-worker-ai-design.md |
