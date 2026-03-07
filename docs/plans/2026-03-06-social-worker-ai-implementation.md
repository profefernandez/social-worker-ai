# Social Worker AI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the MVP into a production-grade, visually innovative crisis monitoring platform with 3D dashboard, reactive chatbot widget, hardened backend, and test coverage.

**Architecture:** Monorepo with 3 workspaces (chatbot, dashboard, server). Server is Express + Socket.io + MySQL. Dashboard gets React Three Fiber 3D constellation. Chatbot widget gets GSAP + Rive animations. All wrapped in the "Ember Protocol" design system.

**Tech Stack:** React 18, Vite, React Three Fiber, GSAP, Rive, Tailwind CSS 3, Express 4, Socket.io 4, mysql2, JWT, bcrypt, AES-256-CBC, Twilio, SendGrid, Launch Lemonade API, Docker

**Design Document:** `docs/plans/2026-03-06-social-worker-ai-design.md`

**CLAUDE.md:** Root `CLAUDE.md` contains all security rules, design system, and code standards. READ IT BEFORE ANY TASK.

---

## Phase 1: Foundation & Backend Hardening (Hours 0-16)

### Task 1: Repo Rename Cleanup & Commit

**Files:**
- Already modified: `package.json:2`, `README.md:1`
- Already modified: git remote URL

**Step 1: Verify all references are updated**

```bash
cd C:/Users/ferna/soicalworkerai
grep -r "soicalworkerai" --include="*.{js,jsx,json,md,yml}" -l
```

Expected: No results (all references already updated).

**Step 2: Commit the rename + CLAUDE.md + design doc**

```bash
git add package.json README.md CLAUDE.md docs/plans/2026-03-06-social-worker-ai-design.md
git commit -m "chore: rename repo to social-worker-ai, add CLAUDE.md and design doc

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Step 3: Push**

```bash
git push origin main
```

---

### Task 2: Environment Validation on Server Startup

**Files:**
- Modify: `server/index.js:1-10` (add validation before anything else)

**Step 1: Write the failing test**

Create: `server/__tests__/env-validation.test.js`

```javascript
const { validateEnv } = require('../utils/validateEnv');

describe('validateEnv', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('throws when required env vars are missing', () => {
    delete process.env.DB_HOST;
    delete process.env.JWT_SECRET;
    expect(() => validateEnv()).toThrow('Missing required environment variables');
  });

  test('returns true when all required vars present', () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '3306';
    process.env.DB_USER = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_NAME = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRY = '24h';
    process.env.ENCRYPTION_KEY = 'test-key-at-least-32-chars-long!!';
    process.env.LEMONADE_API_KEY = 'test';
    process.env.LEMONADE_API_URL = 'https://example.com';
    process.env.LEMONADE_ASSISTANT_ID = 'test';
    expect(validateEnv()).toBe(true);
  });

  test('lists all missing vars in error message', () => {
    delete process.env.DB_HOST;
    delete process.env.JWT_SECRET;
    delete process.env.ENCRYPTION_KEY;
    try {
      validateEnv();
    } catch (e) {
      expect(e.message).toContain('DB_HOST');
      expect(e.message).toContain('JWT_SECRET');
      expect(e.message).toContain('ENCRYPTION_KEY');
    }
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd C:/Users/ferna/soicalworkerai
npx jest server/__tests__/env-validation.test.js --no-cache
```

Expected: FAIL — module `../utils/validateEnv` not found.

**Step 3: Install jest as dev dependency**

```bash
npm install --save-dev jest --workspace=server
```

Add to `server/package.json` scripts:
```json
"test": "jest --testPathPattern=server"
```

**Step 4: Write minimal implementation**

Create: `server/utils/validateEnv.js`

```javascript
const REQUIRED_ENV = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_EXPIRY',
  'ENCRYPTION_KEY',
  'LEMONADE_API_KEY',
  'LEMONADE_API_URL',
  'LEMONADE_ASSISTANT_ID',
];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
  return true;
}

module.exports = { validateEnv };
```

**Step 5: Wire into server/index.js**

Add at line 3 (after dotenv.config()):
```javascript
const { validateEnv } = require('./utils/validateEnv');
validateEnv();
```

**Step 6: Run test to verify it passes**

```bash
npx jest server/__tests__/env-validation.test.js --no-cache
```

Expected: PASS (3 tests).

**Step 7: Commit**

```bash
git add server/utils/validateEnv.js server/__tests__/env-validation.test.js server/index.js server/package.json
git commit -m "feat: add environment validation on server startup

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Input Validation Middleware

**Files:**
- Create: `server/middleware/validation.js`
- Create: `server/__tests__/validation.test.js`
- Modify: `server/routes/auth.js` (use validators)
- Modify: `server/routes/chat.js` (use validators)

**Step 1: Write the failing test**

Create: `server/__tests__/validation.test.js`

```javascript
const {
  validateEmail,
  validatePassword,
  validateUUID,
  validateMessageLength,
  sanitizeString,
} = require('../middleware/validation');

describe('Input Validation', () => {
  describe('validateEmail', () => {
    test('accepts valid email', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });
    test('rejects invalid email', () => {
      expect(validateEmail('not-an-email')).toBe(false);
    });
    test('rejects empty string', () => {
      expect(validateEmail('')).toBe(false);
    });
    test('rejects email over 255 chars', () => {
      expect(validateEmail('a'.repeat(250) + '@b.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('accepts password >= 8 chars', () => {
      expect(validatePassword('password123')).toBe(true);
    });
    test('rejects password < 8 chars', () => {
      expect(validatePassword('short')).toBe(false);
    });
    test('rejects password > 128 chars', () => {
      expect(validatePassword('a'.repeat(129))).toBe(false);
    });
  });

  describe('validateUUID', () => {
    test('accepts valid UUID v4', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });
    test('rejects invalid UUID', () => {
      expect(validateUUID('not-a-uuid')).toBe(false);
    });
    test('rejects SQL injection in UUID field', () => {
      expect(validateUUID("'; DROP TABLE sessions; --")).toBe(false);
    });
  });

  describe('validateMessageLength', () => {
    test('accepts message under 5000 chars', () => {
      expect(validateMessageLength('hello')).toBe(true);
    });
    test('rejects message over 5000 chars', () => {
      expect(validateMessageLength('a'.repeat(5001))).toBe(false);
    });
    test('rejects empty message', () => {
      expect(validateMessageLength('')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    test('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });
    test('handles null/undefined gracefully', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx jest server/__tests__/validation.test.js --no-cache
```

Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

Create: `server/middleware/validation.js`

```javascript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 255) return false;
  return EMAIL_REGEX.test(email);
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 8 && password.length <= 128;
}

function validateUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  return UUID_REGEX.test(uuid);
}

function validateMessageLength(message) {
  if (!message || typeof message !== 'string') return false;
  return message.length > 0 && message.length <= 5000;
}

function sanitizeString(str) {
  if (str === null || str === undefined) return '';
  return String(str).trim();
}

module.exports = {
  validateEmail,
  validatePassword,
  validateUUID,
  validateMessageLength,
  sanitizeString,
};
```

**Step 4: Run test to verify it passes**

```bash
npx jest server/__tests__/validation.test.js --no-cache
```

Expected: PASS (all tests).

**Step 5: Wire into routes**

Modify `server/routes/auth.js` — add at top:
```javascript
const { validateEmail, validatePassword } = require('../middleware/validation');
```

In `POST /register` handler, before bcrypt hash:
```javascript
if (!validateEmail(email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}
if (!validatePassword(password)) {
  return res.status(400).json({ error: 'Password must be 8-128 characters' });
}
```

In `POST /login` handler, before DB query:
```javascript
if (!validateEmail(email) || !validatePassword(password)) {
  return res.status(400).json({ error: 'Invalid credentials format' });
}
```

Modify `server/routes/chat.js` — add at top:
```javascript
const { validateUUID } = require('../middleware/validation');
```

In `GET /session/:sessionId/messages`, before DB query:
```javascript
if (!validateUUID(req.params.sessionId)) {
  return res.status(400).json({ error: 'Invalid session ID' });
}
```

Modify `server/socket/handler.js` — add at top:
```javascript
const { validateUUID, validateMessageLength } = require('../middleware/validation');
```

In `client:message` handler, before processing:
```javascript
if (!validateUUID(sessionId) || !validateMessageLength(message)) {
  return socket.emit('error', { message: 'Invalid input' });
}
```

In `client:join` handler:
```javascript
if (!validateUUID(sessionId)) {
  return socket.emit('error', { message: 'Invalid session ID' });
}
```

In `admin:intercept` handler:
```javascript
if (!validateUUID(sessionId) || !validateMessageLength(message)) {
  return socket.emit('error', { message: 'Invalid input' });
}
```

**Step 6: Commit**

```bash
git add server/middleware/validation.js server/__tests__/validation.test.js server/routes/auth.js server/routes/chat.js server/socket/handler.js
git commit -m "feat: add input validation middleware for all endpoints

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Encryption Unit Tests

**Files:**
- Create: `server/__tests__/encryption.test.js`

**Step 1: Write the test**

Create: `server/__tests__/encryption.test.js`

```javascript
describe('Encryption', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.ENCRYPTION_KEY = 'test-encryption-key-must-be-32-chars!';
    // Clear module cache to re-derive key
    jest.resetModules();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('encrypt returns encrypted string and IV', () => {
    const { encrypt } = require('../middleware/encryption');
    const result = encrypt('hello world');
    expect(result).toHaveProperty('encrypted');
    expect(result).toHaveProperty('iv');
    expect(result.encrypted).not.toBe('hello world');
    expect(result.iv).toHaveLength(32); // 16 bytes hex = 32 chars
  });

  test('decrypt returns original plaintext', () => {
    const { encrypt, decrypt } = require('../middleware/encryption');
    const plaintext = 'This is a crisis message that must be encrypted';
    const { encrypted, iv } = encrypt(plaintext);
    const decrypted = decrypt(encrypted, iv);
    expect(decrypted).toBe(plaintext);
  });

  test('each encryption produces unique IV', () => {
    const { encrypt } = require('../middleware/encryption');
    const r1 = encrypt('same message');
    const r2 = encrypt('same message');
    expect(r1.iv).not.toBe(r2.iv);
    expect(r1.encrypted).not.toBe(r2.encrypted);
  });

  test('decrypt fails with wrong IV', () => {
    const { encrypt, decrypt } = require('../middleware/encryption');
    const { encrypted } = encrypt('secret');
    const wrongIv = 'a'.repeat(32);
    expect(() => decrypt(encrypted, wrongIv)).toThrow();
  });

  test('handles unicode content', () => {
    const { encrypt, decrypt } = require('../middleware/encryption');
    const unicode = 'I feel hopeless 😢 please help';
    const { encrypted, iv } = encrypt(unicode);
    expect(decrypt(encrypted, iv)).toBe(unicode);
  });
});
```

**Step 2: Run test**

```bash
npx jest server/__tests__/encryption.test.js --no-cache
```

Expected: PASS (5 tests). If any fail, fix the encryption module.

**Step 3: Commit**

```bash
git add server/__tests__/encryption.test.js
git commit -m "test: add encryption unit tests including unicode and IV uniqueness

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Crisis Detection Tests

**Files:**
- Create: `server/__tests__/crisis.test.js`

**Step 1: Write the test**

Create: `server/__tests__/crisis.test.js`

```javascript
const { detectCrisis } = require('../services/crisis');

describe('Crisis Detection', () => {
  test('detects direct keyword: suicide', () => {
    const result = detectCrisis('I am thinking about suicide');
    expect(result.isCrisis).toBe(true);
    expect(result.triggers).toContain('suicide');
  });

  test('detects phrase: kill myself', () => {
    const result = detectCrisis('I want to kill myself');
    expect(result.isCrisis).toBe(true);
    expect(result.triggers).toContain('kill myself');
  });

  test('detects regex: i want to die', () => {
    const result = detectCrisis('i want to die right now');
    expect(result.isCrisis).toBe(true);
  });

  test('detects regex: thinking about ending it', () => {
    const result = detectCrisis('I am thinking about ending my life');
    expect(result.isCrisis).toBe(true);
  });

  test('detects case-insensitive', () => {
    const result = detectCrisis('SUICIDE is on my mind');
    expect(result.isCrisis).toBe(true);
  });

  test('does not trigger on safe messages', () => {
    const result = detectCrisis('I had a great day today');
    expect(result.isCrisis).toBe(false);
    expect(result.triggers).toHaveLength(0);
  });

  test('does not trigger on therapy discussion about concepts', () => {
    const result = detectCrisis('Today we discussed coping strategies');
    expect(result.isCrisis).toBe(false);
  });

  test('returns multiple triggers when present', () => {
    const result = detectCrisis('I feel hopeless and suicidal');
    expect(result.isCrisis).toBe(true);
    expect(result.triggers.length).toBeGreaterThanOrEqual(2);
  });

  test('deduplicates triggers', () => {
    const result = detectCrisis('suicide suicide suicide');
    expect(result.isCrisis).toBe(true);
    const unique = new Set(result.triggers);
    expect(result.triggers.length).toBe(unique.size);
  });

  test('handles empty string', () => {
    const result = detectCrisis('');
    expect(result.isCrisis).toBe(false);
  });
});
```

**Step 2: Run test**

```bash
npx jest server/__tests__/crisis.test.js --no-cache
```

Expected: PASS (10 tests).

**Step 3: Commit**

```bash
git add server/__tests__/crisis.test.js
git commit -m "test: add crisis detection unit tests with edge cases

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Error Handling & Graceful Degradation

**Files:**
- Modify: `server/socket/handler.js:78-154` (wrap Lemonade call in try/catch)
- Modify: `server/socket/handler.js:202-271` (wrap each notification in try/catch)
- Modify: `server/index.js` (add global error handler)

**Step 1: Add global Express error handler**

Add to `server/index.js` before the server.listen call:

```javascript
// Global error handler — never leak internals
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Uncaught exception handler — log and keep running
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
```

**Step 2: Verify notification graceful degradation in handler.js**

Review `server/socket/handler.js:202-271` — the `activateCrisisProtocol` function. Ensure each notification (SMS, call, email) is individually wrapped in try/catch so one failure doesn't block others. The existing code should already do this, but verify and fix if not.

Each notification block should follow this pattern:
```javascript
try {
  await sendSms(monitorPhone, alertBody);
  await pool.execute(
    'INSERT INTO notifications (session_id, type, recipient, status) VALUES (?, ?, ?, ?)',
    [sessionId, 'sms', monitorPhone, 'sent']
  );
} catch (err) {
  console.error('SMS notification failed:', err.message);
  await pool.execute(
    'INSERT INTO notifications (session_id, type, recipient, status) VALUES (?, ?, ?, ?)',
    [sessionId, 'sms', monitorPhone, 'failed']
  );
}
```

**Step 3: Wrap Lemonade API call in handler.js**

In `client:message` handler (~line 111-133), ensure the Lemonade call has a fallback:

```javascript
let aiResponse = 'I understand you need support. A counselor has been notified.';
try {
  const result = await runAssistant(message, session.lemonade_conversation_id, apiKey);
  aiResponse = result.responseId; // or however the response text is extracted
  // Update conversation ID
  if (result.conversationId && !session.lemonade_conversation_id) {
    await pool.execute(
      'UPDATE sessions SET lemonade_conversation_id = ? WHERE id = ?',
      [result.conversationId, sessionId]
    );
  }
} catch (err) {
  console.error('Lemonade API failed:', err.message);
  // aiResponse already set to fallback
}
```

**Step 4: Commit**

```bash
git add server/index.js server/socket/handler.js
git commit -m "feat: add global error handling and graceful degradation for external services

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Server Test Infrastructure

**Files:**
- Modify: `server/package.json` (add jest config)
- Create: `server/jest.config.js`

**Step 1: Create jest config**

Create: `server/jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'middleware/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'routes/**/*.js',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
    },
  },
};
```

**Step 2: Add test script to root package.json**

Add to root `package.json` scripts:
```json
"test": "npm run test --workspace=server",
"test:coverage": "npm run test -- --coverage"
```

**Step 3: Run all tests**

```bash
cd C:/Users/ferna/soicalworkerai
npm test
```

Expected: PASS — all tests from Tasks 2-5.

**Step 4: Commit**

```bash
git add server/jest.config.js package.json server/package.json
git commit -m "chore: add jest test infrastructure with coverage config

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 2: Ember Protocol Design System (Hours 16-32)

### Task 8: Tailwind Ember Protocol Config — Chatbot

**Files:**
- Modify: `chatbot/tailwind.config.js`
- Modify: `chatbot/src/index.css`
- Modify: `chatbot/package.json` (add GSAP)

**Step 1: Install design dependencies**

```bash
npm install gsap @rive-app/react-canvas --workspace=chatbot
```

**Step 2: Update Tailwind config**

Rewrite `chatbot/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ember: {
          base: '#1A1614',
          surface: '#2A2421',
          primary: '#E8913A',
          secondary: '#C4785C',
          safe: '#7BA68C',
          crisis: '#D94F4F',
          text: '#F0EBE3',
          muted: '#A89B8C',
        },
      },
      fontFamily: {
        heading: ['"GT Alpina"', 'Georgia', 'serif'],
        body: ['Replica', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        frost: '16px',
      },
      animation: {
        'pulse-crisis': 'pulse-crisis 2s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-crisis': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(217, 79, 79, 0.4)' },
          '50%': { boxShadow: '0 0 24px rgba(217, 79, 79, 0.8)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 8px rgba(232, 145, 58, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(232, 145, 58, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
```

**Step 3: Update index.css with font imports and base styles**

Rewrite `chatbot/src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }

  body {
    font-family: 'Replica', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
}

@layer components {
  .frost-panel {
    background: rgba(42, 36, 33, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(240, 235, 227, 0.08);
  }

  .ember-gradient {
    background: linear-gradient(135deg, #E8913A, #C4785C);
  }

  .ember-glow:hover {
    box-shadow: 0 0 20px rgba(232, 145, 58, 0.4);
  }
}
```

Note: GT Alpina and Replica are commercial fonts. For the hackathon, use Google Fonts alternatives:
- Headings: `"DM Serif Display"` or `"Playfair Display"` as GT Alpina stand-in
- Body: `"Space Grotesk"` or `"Outfit"` as Replica stand-in

Update the font import in index.css:
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

And update tailwind.config.js fontFamily:
```javascript
fontFamily: {
  heading: ['"DM Serif Display"', 'Georgia', 'serif'],
  body: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
},
```

**Step 4: Verify chatbot builds**

```bash
npm run dev --workspace=chatbot
```

Expected: Vite dev server starts on port 5173 without errors.

**Step 5: Commit**

```bash
git add chatbot/tailwind.config.js chatbot/src/index.css chatbot/package.json
git commit -m "feat: add Ember Protocol design system to chatbot widget

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Tailwind Ember Protocol Config — Dashboard

**Files:**
- Modify: `dashboard/tailwind.config.js`
- Modify: `dashboard/src/index.css`
- Modify: `dashboard/package.json` (add R3F + GSAP)

**Step 1: Install design dependencies**

```bash
npm install @react-three/fiber @react-three/drei @react-three/postprocessing three gsap --workspace=dashboard
```

**Step 2: Update Tailwind config**

Same Ember Protocol config as chatbot (copy from Task 8 Step 2), but applied to `dashboard/tailwind.config.js`.

**Step 3: Update index.css**

Same base styles as chatbot (copy from Task 8 Step 3), but applied to `dashboard/src/index.css`.

**Step 4: Verify dashboard builds**

```bash
npm run dev --workspace=dashboard
```

Expected: Vite dev server starts on port 5174.

**Step 5: Commit**

```bash
git add dashboard/tailwind.config.js dashboard/src/index.css dashboard/package.json
git commit -m "feat: add Ember Protocol design system + R3F dependencies to dashboard

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Redesign Chatbot Widget — ChatWidget.jsx

**Files:**
- Modify: `chatbot/src/components/ChatWidget.jsx:1-24`

**Step 1: Rewrite ChatWidget with Ember Protocol styling and GSAP animation**

Replace entire `chatbot/src/components/ChatWidget.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { MessageCircle, X } from 'lucide-react';
import ChatWindow from './ChatWindow';

export default function ChatWidget({ sessionId }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!buttonRef.current) return;
    // Warm glow animation on the chat bubble
    gsap.to(buttonRef.current, {
      boxShadow: '0 0 24px rgba(232, 145, 58, 0.5)',
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, []);

  useEffect(() => {
    if (!panelRef.current) return;
    if (open) {
      gsap.fromTo(
        panelRef.current,
        { y: 20, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' }
      );
    }
  }, [open]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div ref={panelRef}>
          <ChatWindow sessionId={sessionId} onClose={() => setOpen(false)} />
        </div>
      )}
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full ember-gradient flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? (
          <X className="w-6 h-6 text-ember-text" />
        ) : (
          <MessageCircle className="w-6 h-6 text-ember-text" />
        )}
      </button>
    </div>
  );
}
```

**Step 2: Verify renders**

```bash
npm run dev --workspace=chatbot
```

Open `http://localhost:5173` — floating ember-gradient button with warm glow animation.

**Step 3: Commit**

```bash
git add chatbot/src/components/ChatWidget.jsx
git commit -m "feat: redesign chat widget with Ember Protocol and GSAP glow animation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Redesign Chatbot Widget — ChatWindow.jsx

**Files:**
- Modify: `chatbot/src/components/ChatWindow.jsx:1-104`

**Step 1: Rewrite ChatWindow with Ember Protocol styling**

Replace entire `chatbot/src/components/ChatWindow.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Send, AlertTriangle } from 'lucide-react';
import useChat from '../hooks/useChat';

function MessageBubble({ sender, content, index }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, delay: index * 0.05, ease: 'power2.out' }
    );
  }, [index]);

  const styles = {
    client: 'ml-8 bg-gradient-to-br from-ember-primary/20 to-ember-secondary/10 border border-ember-primary/20 text-ember-text',
    ai: 'mr-8 frost-panel text-ember-text',
    admin: 'mr-8 frost-panel border border-ember-secondary/40 text-ember-text',
  };

  const labels = {
    client: null,
    ai: 'AI Counselor',
    admin: 'Crisis Team',
  };

  return (
    <div ref={ref} className={`rounded-xl px-4 py-3 text-sm ${styles[sender] || styles.ai}`}>
      {labels[sender] && (
        <span className="text-xs font-mono text-ember-muted block mb-1">
          {labels[sender]}
        </span>
      )}
      {content}
    </div>
  );
}

export default function ChatWindow({ sessionId, onClose }) {
  const { messages, connected, crisisActive, sendMessage } = useChat(sessionId);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput('');
  };

  return (
    <div
      className={`w-80 h-[480px] rounded-2xl overflow-hidden flex flex-col shadow-2xl ${
        crisisActive ? 'animate-pulse-crisis' : ''
      }`}
      style={{ background: '#1A1614' }}
    >
      {/* Header */}
      <div className="frost-panel px-4 py-3 flex items-center justify-between border-b border-ember-text/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-ember-safe' : 'bg-ember-muted'}`} />
          <span className="font-heading text-ember-text text-sm">Support Chat</span>
        </div>
        {crisisActive && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-ember-crisis/20 border border-ember-crisis/30">
            <AlertTriangle className="w-3 h-3 text-ember-crisis" />
            <span className="text-xs text-ember-crisis font-mono">Crisis Active</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <p className="text-ember-muted text-sm text-center mt-8">
            How can I support you today?
          </p>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id || i} sender={msg.sender} content={msg.content} index={i} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="frost-panel px-3 py-3 border-t border-ember-text/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-ember-surface text-ember-text text-sm rounded-lg px-3 py-2 border border-ember-text/10 placeholder:text-ember-muted/60 focus:outline-none focus:ring-1 focus:ring-ember-primary/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="ember-gradient rounded-lg px-3 py-2 text-ember-text disabled:opacity-30 transition-all ember-glow"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify renders**

Open chatbot, click the ember button — dark themed chat window with frosted glass panels, animated messages, crisis badge.

**Step 3: Commit**

```bash
git add chatbot/src/components/ChatWindow.jsx
git commit -m "feat: redesign ChatWindow with Ember Protocol, frosted glass, GSAP message animation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Redesign Dashboard — Login Page

**Files:**
- Modify: `dashboard/src/pages/LoginPage.jsx:1-79`

**Step 1: Rewrite LoginPage with Ember Protocol**

Replace entire `dashboard/src/pages/LoginPage.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Shield, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(
      formRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ember-base flex items-center justify-center px-4">
      <div ref={formRef} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl ember-gradient mx-auto flex items-center justify-center mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-ember-text" />
          </div>
          <h1 className="font-heading text-2xl text-ember-text">Crisis Monitor</h1>
          <p className="text-ember-muted text-sm mt-1">60 Watts of Clarity</p>
        </div>

        <form onSubmit={handleSubmit} className="frost-panel rounded-2xl p-6 space-y-4">
          {error && (
            <div className="text-sm text-ember-crisis bg-ember-crisis/10 border border-ember-crisis/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-ember-muted font-mono block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-ember-surface text-ember-text rounded-lg px-3 py-2.5 border border-ember-text/10 focus:outline-none focus:ring-1 focus:ring-ember-primary/50 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-ember-muted font-mono block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-ember-surface text-ember-text rounded-lg px-3 py-2.5 border border-ember-text/10 focus:outline-none focus:ring-1 focus:ring-ember-primary/50 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full ember-gradient text-ember-text font-body font-medium rounded-lg py-2.5 transition-all ember-glow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Verify renders**

```bash
npm run dev --workspace=dashboard
```

Open `http://localhost:5174` — dark login page with frosted form, ember gradient button, GSAP fade-in.

**Step 3: Commit**

```bash
git add dashboard/src/pages/LoginPage.jsx
git commit -m "feat: redesign login page with Ember Protocol dark theme

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Redesign Dashboard — Sidebar

**Files:**
- Modify: `dashboard/src/components/Sidebar.jsx:1-49`

**Step 1: Rewrite Sidebar with Ember Protocol**

Replace entire `dashboard/src/components/Sidebar.jsx`:

```jsx
import { Activity, FileText, Bell, LogOut } from 'lucide-react';

const navItems = [
  { id: 'monitor', label: 'Crisis Monitor', icon: Activity },
  { id: 'audit', label: 'Audit Trail', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function Sidebar({ page, onNavigate, user, onLogout }) {
  return (
    <div className="w-56 h-screen frost-panel border-r border-ember-text/5 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-ember-text/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg ember-gradient flex items-center justify-center">
            <span className="text-ember-text font-heading text-xs font-bold">60</span>
          </div>
          <div>
            <span className="text-ember-text font-heading text-sm block leading-tight">Crisis Monitor</span>
            <span className="text-ember-muted text-[10px] font-mono">60 Watts of Clarity</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              page === id
                ? 'bg-ember-primary/15 text-ember-primary border border-ember-primary/20'
                : 'text-ember-muted hover:text-ember-text hover:bg-ember-surface'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-ember-text/5">
        <div className="text-xs text-ember-muted font-mono truncate mb-2">{user?.email}</div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-sm text-ember-muted hover:text-ember-crisis transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add dashboard/src/components/Sidebar.jsx
git commit -m "feat: redesign sidebar with Ember Protocol frosted glass theme

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 3: 3D Crisis Constellation Dashboard (Hours 32-56)

### Task 14: Create Crisis Constellation 3D Component

**Files:**
- Create: `dashboard/src/components/CrisisConstellation.jsx`
- Create: `dashboard/src/components/SessionNode.jsx`

**Step 1: Create the SessionNode (individual 3D orb)**

Create: `dashboard/src/components/SessionNode.jsx`

```jsx
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';

export default function SessionNode({ position, session, onClick, isCrisis }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const baseColor = isCrisis ? '#D94F4F' : '#7BA68C';
  const emissiveIntensity = isCrisis ? 1.5 : 0.3;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    // Gentle float
    meshRef.current.position.y = position[1] + Math.sin(t * 0.5 + position[0]) * 0.15;

    // Crisis pulse
    if (isCrisis) {
      const pulse = Math.sin(t * 2) * 0.5 + 0.5;
      meshRef.current.scale.setScalar(1 + pulse * 0.15);
      meshRef.current.material.emissiveIntensity = emissiveIntensity + pulse * 0.8;
    }

    // Hover scale
    if (hovered) {
      meshRef.current.scale.lerp({ x: 1.3, y: 1.3, z: 1.3 }, 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(session);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Session label */}
      <Billboard position={[0, 0.55, 0]}>
        <Text
          fontSize={0.12}
          color="#F0EBE3"
          anchorX="center"
          anchorY="middle"
          font="/fonts/SpaceGrotesk-Regular.woff"
        >
          {session.id?.substring(0, 8)}
        </Text>
      </Billboard>

      {/* Crisis ring */}
      {isCrisis && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.5, 32]} />
          <meshBasicMaterial color="#D94F4F" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}
```

**Step 2: Create the CrisisConstellation scene**

Create: `dashboard/src/components/CrisisConstellation.jsx`

```jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useMemo } from 'react';
import SessionNode from './SessionNode';

function Scene({ sessions, onSelectSession }) {
  // Distribute sessions in a spiral pattern
  const positions = useMemo(() => {
    return sessions.map((_, i) => {
      const angle = i * 0.8;
      const radius = 1.5 + i * 0.4;
      return [
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 2,
        Math.sin(angle) * radius,
      ];
    });
  }, [sessions.length]);

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#E8913A" />
      <pointLight position={[-5, -3, 5]} intensity={0.3} color="#C4785C" />

      <Stars
        radius={50}
        depth={50}
        count={1000}
        factor={2}
        saturation={0}
        fade
        speed={0.3}
      />

      {sessions.map((session, i) => (
        <SessionNode
          key={session.id}
          position={positions[i] || [0, 0, 0]}
          session={session}
          isCrisis={!!session.crisis_active}
          onClick={onSelectSession}
        />
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={20}
        autoRotate
        autoRotateSpeed={0.3}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>
    </>
  );
}

export default function CrisisConstellation({ sessions, onSelectSession }) {
  return (
    <div className="w-full h-full bg-ember-base rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#1A1614' }}
      >
        <Scene sessions={sessions} onSelectSession={onSelectSession} />
      </Canvas>
    </div>
  );
}
```

**Step 3: Verify renders**

```bash
npm run dev --workspace=dashboard
```

Expected: 3D canvas renders with stars and ambient lighting (no sessions yet without backend).

**Step 4: Commit**

```bash
git add dashboard/src/components/CrisisConstellation.jsx dashboard/src/components/SessionNode.jsx
git commit -m "feat: add 3D Crisis Constellation with R3F nodes, bloom, and orbit controls

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 15: Redesign MonitorPage with 3D Constellation

**Files:**
- Modify: `dashboard/src/pages/MonitorPage.jsx:1-63`

**Step 1: Rewrite MonitorPage**

Replace entire `dashboard/src/pages/MonitorPage.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import CrisisConstellation from '../components/CrisisConstellation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function MonitorPage({ token, onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const crisisCount = sessions.filter((s) => s.crisis_active).length;

  return (
    <div className="flex-1 flex flex-col bg-ember-base">
      {/* Header bar */}
      <div className="frost-panel border-b border-ember-text/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-ember-primary" />
          <h1 className="font-heading text-xl text-ember-text">Crisis Constellation</h1>
        </div>
        {crisisCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ember-crisis/15 border border-ember-crisis/25">
            <AlertTriangle className="w-4 h-4 text-ember-crisis" />
            <span className="text-sm text-ember-crisis font-mono">
              {crisisCount} active
            </span>
          </div>
        )}
      </div>

      {/* 3D Constellation */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-ember-muted font-mono text-sm">Loading constellation...</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-ember-safe/10 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-8 h-8 text-ember-safe" />
              </div>
              <p className="text-ember-muted font-body">No active sessions</p>
              <p className="text-ember-muted/60 text-sm mt-1">Sessions will appear as nodes when active</p>
            </div>
          </div>
        ) : (
          <CrisisConstellation sessions={sessions} onSelectSession={onSelectSession} />
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add dashboard/src/pages/MonitorPage.jsx
git commit -m "feat: replace flat session list with 3D Crisis Constellation view

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 16: Redesign CrisisView with Frosted Glass

**Files:**
- Modify: `dashboard/src/pages/CrisisView.jsx:1-112`

**Step 1: Rewrite CrisisView**

Replace entire `dashboard/src/pages/CrisisView.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowLeft, Send, AlertTriangle, Shield } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CrisisView({ session, token, sendIntercept, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/admin/sessions/${session.id}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load messages:', err.message);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [session.id, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { x: 20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
    );
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendIntercept(session.id, trimmed);
    setInput('');
  };

  const senderStyles = {
    client: 'ml-12 bg-ember-primary/10 border border-ember-primary/15',
    ai: 'mr-12 frost-panel',
    admin: 'mr-12 frost-panel border border-ember-secondary/30',
  };

  const senderLabels = {
    client: 'Client',
    ai: 'AI Counselor',
    admin: 'Crisis Team',
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-ember-base">
      {/* Header */}
      <div className="frost-panel border-b border-ember-text/5 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-ember-muted hover:text-ember-text transition-colors"
          aria-label="Back to monitor"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-ember-text font-heading text-sm">Session</span>
            <code className="text-ember-primary font-mono text-xs">{session.id?.substring(0, 12)}...</code>
          </div>
          <span className="text-ember-muted text-xs font-mono">{session.therapist_email}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ember-crisis/15 border border-ember-crisis/25">
          <AlertTriangle className="w-3.5 h-3.5 text-ember-crisis" />
          <span className="text-xs text-ember-crisis font-mono">Crisis Active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`rounded-xl px-4 py-3 text-sm text-ember-text ${senderStyles[msg.sender] || ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-ember-muted uppercase tracking-wider">
                {senderLabels[msg.sender] || msg.sender}
              </span>
              {msg.createdAt && (
                <span className="text-[10px] font-mono text-ember-muted/50">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Intercept Input */}
      <div className="frost-panel border-t border-ember-text/5 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-ember-secondary" />
          <span className="text-xs text-ember-muted font-mono">Intercept as Crisis Team</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Send message to client..."
            className="flex-1 bg-ember-surface text-ember-text text-sm rounded-lg px-3 py-2 border border-ember-text/10 placeholder:text-ember-muted/60 focus:outline-none focus:ring-1 focus:ring-ember-secondary/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="ember-gradient rounded-lg px-3 py-2 text-ember-text disabled:opacity-30 transition-all ember-glow"
            aria-label="Send intercept"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add dashboard/src/pages/CrisisView.jsx
git commit -m "feat: redesign CrisisView with frosted glass panels and Ember Protocol

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 17: Redesign AuditPage and NotificationsPage

**Files:**
- Modify: `dashboard/src/pages/AuditPage.jsx:1-77`
- Modify: `dashboard/src/pages/NotificationsPage.jsx:1-75`

**Step 1: Rewrite AuditPage**

Replace entire `dashboard/src/pages/AuditPage.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function AuditPage({ token }) {
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/audit`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAudit(data.audit || []);
        }
      } catch (err) {
        console.error('Failed to load audit log:', err.message);
      }
    };
    fetchAudit();
  }, [token]);

  const actionColors = {
    crisis_activated: 'text-ember-crisis bg-ember-crisis/10',
    intercepted: 'text-ember-secondary bg-ember-secondary/10',
    viewed: 'text-ember-primary bg-ember-primary/10',
    listed_crisis_sessions: 'text-ember-muted bg-ember-surface',
  };

  return (
    <div className="flex-1 flex flex-col bg-ember-base">
      <div className="frost-panel border-b border-ember-text/5 px-6 py-4 flex items-center gap-3">
        <FileText className="w-5 h-5 text-ember-primary" />
        <h1 className="font-heading text-xl text-ember-text">Audit Trail</h1>
        <span className="text-ember-muted text-sm font-mono ml-auto">{audit.length} entries</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {audit.map((entry) => (
            <div key={entry.id} className="frost-panel rounded-lg px-4 py-3 flex items-start gap-4">
              <span className="text-[10px] font-mono text-ember-muted whitespace-nowrap mt-1">
                {new Date(entry.created_at).toLocaleString()}
              </span>
              <code className="text-xs text-ember-primary font-mono mt-1">
                {entry.session_id?.substring(0, 8) || '---'}
              </code>
              <span className="text-xs text-ember-muted font-mono mt-1">{entry.actor}</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${actionColors[entry.action] || 'text-ember-muted bg-ember-surface'}`}>
                {entry.action}
              </span>
              <span className="text-xs text-ember-muted/70 flex-1 truncate mt-1">{entry.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Rewrite NotificationsPage**

Replace entire `dashboard/src/pages/NotificationsPage.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Bell, MessageSquare, Phone, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const typeConfig = {
  sms: { icon: MessageSquare, color: 'text-ember-safe', bg: 'bg-ember-safe/10' },
  call: { icon: Phone, color: 'text-ember-primary', bg: 'bg-ember-primary/10' },
  email: { icon: Mail, color: 'text-ember-secondary', bg: 'bg-ember-secondary/10' },
};

export default function NotificationsPage({ token }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err.message);
      }
    };
    fetchNotifications();
  }, [token]);

  return (
    <div className="flex-1 flex flex-col bg-ember-base">
      <div className="frost-panel border-b border-ember-text/5 px-6 py-4 flex items-center gap-3">
        <Bell className="w-5 h-5 text-ember-primary" />
        <h1 className="font-heading text-xl text-ember-text">Notifications</h1>
        <span className="text-ember-muted text-sm font-mono ml-auto">{notifications.length} sent</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = typeConfig[n.type] || typeConfig.sms;
            const Icon = config.icon;
            return (
              <div key={n.id} className="frost-panel rounded-lg px-4 py-3 flex items-center gap-4">
                <span className="text-[10px] font-mono text-ember-muted whitespace-nowrap">
                  {new Date(n.created_at).toLocaleString()}
                </span>
                <code className="text-xs text-ember-primary font-mono">
                  {n.session_id?.substring(0, 8)}
                </code>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${config.bg}`}>
                  <Icon className={`w-3 h-3 ${config.color}`} />
                  <span className={`text-xs font-mono ${config.color}`}>{n.type}</span>
                </div>
                <span className="text-xs text-ember-muted font-mono">{n.recipient}</span>
                <span className={`text-xs font-mono ml-auto ${n.status === 'sent' ? 'text-ember-safe' : 'text-ember-crisis'}`}>
                  {n.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add dashboard/src/pages/AuditPage.jsx dashboard/src/pages/NotificationsPage.jsx
git commit -m "feat: redesign Audit and Notifications pages with Ember Protocol

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 18: Update Dashboard App.jsx Layout

**Files:**
- Modify: `dashboard/src/App.jsx:1-83`

**Step 1: Update App.jsx to use dark background and flex layout**

The main layout needs `bg-ember-base` and a horizontal flex container for sidebar + content. Update the router/layout section to ensure the `<Sidebar>` and page content sit side by side in a full-height flex container. The App.jsx should set `min-h-screen bg-ember-base` on the wrapper div.

**Step 2: Commit**

```bash
git add dashboard/src/App.jsx
git commit -m "feat: update dashboard App layout for Ember Protocol dark theme

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 4: Polish & Production (Hours 56-72)

### Task 19: Docker & Production Build Verification

**Files:**
- Modify: `Dockerfile` (verify multi-stage build)
- Modify: `docker-compose.yml` (verify health checks)

**Step 1: Verify Dockerfile builds**

```bash
cd C:/Users/ferna/soicalworkerai
docker build -t social-worker-ai .
```

Expected: Build completes, chatbot widget compiled.

**Step 2: Verify docker-compose starts**

```bash
docker-compose up -d
```

Expected: Container starts, health check passes on GET /health.

**Step 3: Commit any fixes**

```bash
git add Dockerfile docker-compose.yml
git commit -m "chore: verify and fix Docker production build

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 20: Run Full Test Suite & Fix Issues

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass (env validation, input validation, encryption, crisis detection).

**Step 2: Run linting**

```bash
npm run lint
```

Fix any linting issues.

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve test and lint issues

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 21: Final Security Audit

Review against the CLAUDE.md security checklist:

- [ ] All messages AES-256-CBC encrypted at rest
- [ ] JWT auth with 24h expiry
- [ ] bcrypt salt rounds >= 10
- [ ] Input validation on all endpoints
- [ ] Rate limiting active
- [ ] CORS restricted
- [ ] Helmet security headers
- [ ] Audit trail immutable
- [ ] No plaintext in logs
- [ ] Error responses don't leak internals
- [ ] TwiML XML-escaped
- [ ] SendGrid HTML-escaped
- [ ] Environment variables validated on startup
- [ ] WebSocket auth for admin/therapist

Fix any gaps found.

---

### Task 22: Push All Changes

```bash
git push origin main
```

---

## Summary

| Phase | Tasks | What Ships |
|-------|-------|-----------|
| **Phase 1** (0-16h) | Tasks 1-7 | Hardened backend, tests, input validation, error handling |
| **Phase 2** (16-32h) | Tasks 8-13 | Ember Protocol design system, redesigned widget + login + sidebar |
| **Phase 3** (32-56h) | Tasks 14-18 | 3D Crisis Constellation, all dashboard pages redesigned |
| **Phase 4** (56-72h) | Tasks 19-22 | Docker verification, full test suite, security audit, push |

**Post-Hackathon Backlog:**
- Rive typing indicator animation
- Audio cues for crisis events
- GLSL custom shaders for particle effects
- Integration tests with test MySQL database
- CI/CD pipeline (GitHub Actions)
- Multi-tenant therapist onboarding
- Data retention / auto-purge
- Performance profiling (R3F bundle size optimization)
