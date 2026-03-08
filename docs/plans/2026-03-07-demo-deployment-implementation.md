# Demo Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up Profe function call handling, dual Mistral agents, database updates, and Docker deployment to prototype.60wattsofclarity.com.

**Architecture:** Express + Socket.io server calls two Mistral agents per message (kiddo chatbot + Profe monitor). Profe returns function calls that the server processes to update the dashboard, notify parents, or intervene in the chat. Deployed via Docker Compose on Scala Hosting VPS with SPanel reverse proxy.

**Tech Stack:** Node.js 20, Express 4, Socket.io 4, Mistral Conversations API, MySQL (mysql2), Docker, Jest

---

### Task 1: Update Database Schema

**Files:**
- Modify: `server/models/schema.sql`

**Context:** The existing schema has `users`, `sessions`, `messages`, `audit_log`, `notifications`. We need to add `profe_observations`, expand `messages.sender` enum, and add columns to `notifications`.

**Step 1: Add the new table and ALTER statements to schema.sql**

Append to end of `server/models/schema.sql`:

```sql
-- Profe AI observation log (check_ai_response + log_observation data)
CREATE TABLE IF NOT EXISTS profe_observations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    observation_type ENUM(
        'check_ai_response',
        'log_observation',
        'emotional_dependency',
        'ai_behavior',
        'critical_thinking',
        'ai_literacy',
        'boundary_issue',
        'positive_interaction',
        'concerning_pattern'
    ) NOT NULL,
    description TEXT,
    sentiment ENUM('positive', 'neutral', 'concerned', 'critical') DEFAULT 'neutral',
    ai_literacy_level ENUM('none', 'basic', 'intermediate', 'advanced') DEFAULT NULL,
    safety_rating INT UNSIGNED DEFAULT NULL COMMENT '0-100 scale',
    sycophancy_score INT UNSIGNED DEFAULT NULL COMMENT '0-100 scale',
    age_appropriate TINYINT(1) DEFAULT NULL,
    manipulation_detected TINYINT(1) DEFAULT NULL,
    recommended_action VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_type (observation_type),
    INDEX idx_created (created_at),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Expand sender types to include profe and kiddo_ai
ALTER TABLE messages MODIFY COLUMN sender ENUM('client', 'ai', 'kiddo_ai', 'social_worker_ai', 'profe', 'admin') NOT NULL;

-- Add sender_type for easier filtering
ALTER TABLE messages ADD COLUMN sender_type ENUM('user', 'kiddo_ai', 'profe', 'admin') DEFAULT 'user' AFTER sender;

-- Add urgency and summary to notifications for Profe notify_parent
ALTER TABLE notifications MODIFY COLUMN type ENUM('sms', 'call', 'email', 'profe_alert') NOT NULL;
ALTER TABLE notifications ADD COLUMN urgency ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low' AFTER type;
ALTER TABLE notifications ADD COLUMN summary TEXT AFTER urgency;
```

**Step 2: Verify the SQL is valid**

Run: `cd <LOCAL_REPO_PATH> && node -e "const fs = require('fs'); const sql = fs.readFileSync('server/models/schema.sql', 'utf8'); console.log('Schema file length:', sql.length, 'bytes'); console.log('Tables defined:', (sql.match(/CREATE TABLE/gi) || []).length);"`

Expected: Schema file loads, shows 6 tables (users, sessions, messages, audit_log, notifications, profe_observations).

**Step 3: Commit**

```bash
git add server/models/schema.sql
git commit -m "feat: add profe_observations table and expand message/notification schemas"
```

---

### Task 2: Update aiProxy to Support Dual Agents and Function Calls

**Files:**
- Modify: `server/services/aiProxy.js`
- Modify: `server/__tests__/aiProxy.test.js`

**Context:** Currently `aiProxy.js` has a single `proxyToProvider()` that returns a text string. For Profe, Mistral returns function calls (tool_calls) in the response. We need to:
1. Parse `tool_calls` from Mistral responses alongside text content
2. Support calling two different Mistral agents with different agent IDs
3. Return a structured response object instead of just a string (for Mistral only)

**Step 1: Write the failing tests**

Add these tests to `server/__tests__/aiProxy.test.js`:

```javascript
test('Mistral parseResponse extracts tool_calls when present', async () => {
  axios.post.mockResolvedValue({
    data: {
      outputs: [
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'call_001',
              function: {
                name: 'check_ai_response',
                arguments: JSON.stringify({
                  safety_rating: 85,
                  sycophancy_score: 20,
                  age_appropriate: true,
                  manipulation_detected: false,
                  recommended_action: 'none',
                }),
              },
            },
          ],
        },
      ],
    },
  });

  const result = await proxyToProvider('Hello', [], {
    provider: 'mistral',
    apiKey: 'key',
    agentId: 'ag_profe',
    returnFullResponse: true,
  });

  expect(result).toEqual({
    content: '',
    toolCalls: [
      {
        id: 'call_001',
        name: 'check_ai_response',
        arguments: {
          safety_rating: 85,
          sycophancy_score: 20,
          age_appropriate: true,
          manipulation_detected: false,
          recommended_action: 'none',
        },
      },
    ],
  });
});

test('Mistral parseResponse returns text-only when no tool_calls', async () => {
  axios.post.mockResolvedValue({
    data: {
      outputs: [{ role: 'assistant', content: 'Just a text reply' }],
    },
  });

  const result = await proxyToProvider('Hi', [], {
    provider: 'mistral',
    apiKey: 'key',
    agentId: 'ag_test',
    returnFullResponse: true,
  });

  expect(result).toEqual({
    content: 'Just a text reply',
    toolCalls: [],
  });
});

test('Mistral returns string when returnFullResponse is false (backward compat)', async () => {
  axios.post.mockResolvedValue({
    data: {
      outputs: [{ role: 'assistant', content: 'text reply' }],
    },
  });

  const result = await proxyToProvider('Hi', [], {
    provider: 'mistral',
    apiKey: 'key',
    agentId: 'ag_test',
  });

  expect(result).toBe('text reply');
});

test('supports different agent IDs for different calls', async () => {
  axios.post.mockResolvedValue({
    data: { outputs: [{ role: 'assistant', content: 'ok' }] },
  });

  await proxyToProvider('msg1', [], {
    provider: 'mistral',
    apiKey: 'key',
    agentId: 'ag_kiddo_123',
  });

  await proxyToProvider('msg2', [], {
    provider: 'mistral',
    apiKey: 'key',
    agentId: 'ag_profe_456',
  });

  expect(axios.post.mock.calls[0][1].agent_id).toBe('ag_kiddo_123');
  expect(axios.post.mock.calls[1][1].agent_id).toBe('ag_profe_456');
});
```

**Step 2: Run tests to verify they fail**

Run: `cd <LOCAL_REPO_PATH>/server && npx jest __tests__/aiProxy.test.js --verbose`

Expected: New tests FAIL (returnFullResponse not implemented, toolCalls not parsed).

**Step 3: Update aiProxy.js to handle function calls**

Replace the entire `server/services/aiProxy.js` with:

```javascript
const axios = require('axios');

const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    formatRequest: (input, conversationHistory, config) => ({
      model: config.model || 'gpt-4o-mini',
      messages: [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        ...conversationHistory,
        { role: 'user', content: input },
      ],
      max_tokens: 1024,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || '',
    parseFullResponse: (data) => ({
      content: data.choices?.[0]?.message?.content || '',
      toolCalls: [],
    }),
    authHeader: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/conversations',
    formatRequest: (input, conversationHistory, config) => ({
      agent_id: config.agentId || process.env.MISTRAL_AGENT_ID,
      inputs: [
        ...conversationHistory,
        { role: 'user', content: input },
      ],
    }),
    parseResponse: (data) => {
      const outputs = data.outputs || [];
      const assistantMsg = outputs.find((o) => o.role === 'assistant');
      return assistantMsg?.content || '';
    },
    parseFullResponse: (data) => {
      const outputs = data.outputs || [];
      const assistantMsg = outputs.find((o) => o.role === 'assistant');
      const content = assistantMsg?.content || '';
      const rawToolCalls = assistantMsg?.tool_calls || [];
      const toolCalls = rawToolCalls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments,
      }));
      return { content, toolCalls };
    },
    authHeader: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  },
};

/**
 * Forward a message to the company's AI provider.
 * @param {string} input - user's message
 * @param {Array} conversationHistory - previous messages [{role, content}]
 * @param {Object} config - { provider, apiKey, model, systemPrompt, agentId, returnFullResponse }
 * @returns {Promise<string|{content: string, toolCalls: Array}>}
 *   If returnFullResponse is true, returns { content, toolCalls }.
 *   Otherwise returns just the content string (backward compatible).
 */
async function proxyToProvider(input, conversationHistory = [], config = {}) {
  const providerName = config.provider || 'openai';
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown AI provider: ${providerName}`);
  }

  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(`API key not configured for provider: ${providerName}`);
  }

  const body = provider.formatRequest(input, conversationHistory, config);

  const response = await axios.post(provider.url, body, {
    headers: {
      ...provider.authHeader(apiKey),
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  if (config.returnFullResponse) {
    return provider.parseFullResponse(response.data);
  }
  return provider.parseResponse(response.data);
}

module.exports = { proxyToProvider, PROVIDERS };
```

**Step 4: Run tests to verify they pass**

Run: `cd <LOCAL_REPO_PATH>/server && npx jest __tests__/aiProxy.test.js --verbose`

Expected: ALL tests PASS.

**Step 5: Commit**

```bash
git add server/services/aiProxy.js server/__tests__/aiProxy.test.js
git commit -m "feat: add function call parsing to aiProxy for Profe agent"
```

---

### Task 3: Create Profe Function Call Handler

**Files:**
- Create: `server/services/profeHandler.js`
- Create: `server/__tests__/profeHandler.test.js`

**Context:** When Profe returns function calls from Mistral, the server needs to process each one. This module takes an array of parsed tool calls and routes them to the correct handler. It returns whether an intervention occurred (which determines if the kiddo's response gets replaced).

**Step 1: Write the failing tests**

Create `server/__tests__/profeHandler.test.js`:

```javascript
const { handleProfeCalls } = require('../services/profeHandler');

// Mock the database pool
jest.mock('../config/db', () => ({
  pool: {
    execute: jest.fn().mockResolvedValue([[], []]),
  },
}));

// Mock encryption
jest.mock('../middleware/encryption', () => ({
  encrypt: jest.fn((text) => ({ encrypted: `enc_${text}`, iv: 'mock_iv' })),
}));

describe('profeHandler', () => {
  const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };
  const sessionId = 'test-session-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockIo.to.mockReturnThis();
  });

  test('check_ai_response saves observation and emits to dashboard', async () => {
    const { pool } = require('../config/db');
    const toolCalls = [
      {
        id: 'call_001',
        name: 'check_ai_response',
        arguments: {
          safety_rating: 90,
          sycophancy_score: 15,
          age_appropriate: true,
          manipulation_detected: false,
          recommended_action: 'none',
        },
      },
    ];

    const result = await handleProfeCalls(toolCalls, sessionId, mockIo);

    expect(result.intervention).toBe(false);
    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO profe_observations'),
      expect.arrayContaining([sessionId, 'check_ai_response'])
    );
    expect(mockIo.to).toHaveBeenCalledWith('dashboard');
    expect(mockIo.emit).toHaveBeenCalledWith(
      'agent:output',
      expect.objectContaining({
        sessionId,
        agentRole: 'profe',
      })
    );
  });

  test('flag_intervention returns intervention with message', async () => {
    const toolCalls = [
      {
        id: 'call_002',
        name: 'flag_intervention',
        arguments: {
          severity: 'medium',
          intervention_type: 'educational',
          message_to_child: 'Remember, AI is a tool, not a friend!',
          reason: 'Child showing emotional dependency patterns',
        },
      },
    ];

    const result = await handleProfeCalls(toolCalls, sessionId, mockIo);

    expect(result.intervention).toBe(true);
    expect(result.interventionMessage).toBe('Remember, AI is a tool, not a friend!');
  });

  test('log_observation saves to database', async () => {
    const { pool } = require('../config/db');
    const toolCalls = [
      {
        id: 'call_003',
        name: 'log_observation',
        arguments: {
          observation_type: 'positive_interaction',
          description: 'Child asked thoughtful follow-up question',
          sentiment: 'positive',
          ai_literacy_level: 'intermediate',
        },
      },
    ];

    const result = await handleProfeCalls(toolCalls, sessionId, mockIo);

    expect(result.intervention).toBe(false);
    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO profe_observations'),
      expect.arrayContaining([sessionId, 'log_observation'])
    );
  });

  test('notify_parent saves notification and emits', async () => {
    const { pool } = require('../config/db');
    const toolCalls = [
      {
        id: 'call_004',
        name: 'notify_parent',
        arguments: {
          urgency: 'high',
          notification_type: 'behavioral_concern',
          summary: 'Child is treating AI as emotional support',
          recommended_action: 'Discuss healthy AI use with your child',
        },
      },
    ];

    const result = await handleProfeCalls(toolCalls, sessionId, mockIo);

    expect(result.intervention).toBe(false);
    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      expect.arrayContaining([sessionId, 'profe_alert', 'high'])
    );
    expect(mockIo.to).toHaveBeenCalledWith('dashboard');
  });

  test('handles multiple tool calls, intervention takes priority', async () => {
    const toolCalls = [
      {
        id: 'call_005',
        name: 'check_ai_response',
        arguments: { safety_rating: 40, recommended_action: 'intervene' },
      },
      {
        id: 'call_006',
        name: 'flag_intervention',
        arguments: {
          severity: 'high',
          intervention_type: 'safety',
          message_to_child: 'Let me pause here. This AI response was not accurate.',
          reason: 'Low safety rating detected',
        },
      },
      {
        id: 'call_007',
        name: 'notify_parent',
        arguments: {
          urgency: 'high',
          notification_type: 'safety_concern',
          summary: 'AI gave potentially unsafe response',
          recommended_action: 'Review chat history',
        },
      },
    ];

    const result = await handleProfeCalls(toolCalls, sessionId, mockIo);

    expect(result.intervention).toBe(true);
    expect(result.interventionMessage).toBe('Let me pause here. This AI response was not accurate.');
  });

  test('handles empty tool calls array', async () => {
    const result = await handleProfeCalls([], sessionId, mockIo);
    expect(result.intervention).toBe(false);
    expect(result.interventionMessage).toBeNull();
  });

  test('handles unknown function name gracefully', async () => {
    const toolCalls = [
      {
        id: 'call_999',
        name: 'unknown_function',
        arguments: {},
      },
    ];

    const result = await handleProfeCalls(toolCalls, sessionId, mockIo);
    expect(result.intervention).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd <LOCAL_REPO_PATH>/server && npx jest __tests__/profeHandler.test.js --verbose`

Expected: FAIL — module not found.

**Step 3: Implement profeHandler.js**

Create `server/services/profeHandler.js`:

```javascript
const { pool } = require('../config/db');

/**
 * Process Profe's function calls from Mistral.
 * Routes each call to the correct handler and returns whether an intervention occurred.
 *
 * @param {Array} toolCalls - Parsed tool calls [{id, name, arguments}]
 * @param {string} sessionId - Current chat session ID
 * @param {Object} io - Socket.io server instance
 * @returns {Promise<{intervention: boolean, interventionMessage: string|null}>}
 */
async function handleProfeCalls(toolCalls, sessionId, io) {
  let intervention = false;
  let interventionMessage = null;

  for (const call of toolCalls) {
    try {
      switch (call.name) {
        case 'check_ai_response':
          await handleCheckAiResponse(call.arguments, sessionId, io);
          break;

        case 'flag_intervention': {
          const msg = await handleFlagIntervention(call.arguments, sessionId, io);
          intervention = true;
          interventionMessage = msg;
          break;
        }

        case 'log_observation':
          await handleLogObservation(call.arguments, sessionId, io);
          break;

        case 'notify_parent':
          await handleNotifyParent(call.arguments, sessionId, io);
          break;

        default:
          // eslint-disable-next-line no-console
          console.warn(`Unknown Profe function: ${call.name}`);
          break;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Profe handler error (${call.name}):`, err.message);
    }
  }

  return { intervention, interventionMessage };
}

async function handleCheckAiResponse(args, sessionId, io) {
  await pool.execute(
    `INSERT INTO profe_observations
      (session_id, observation_type, safety_rating, sycophancy_score, age_appropriate, manipulation_detected, recommended_action)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      'check_ai_response',
      args.safety_rating ?? null,
      args.sycophancy_score ?? null,
      args.age_appropriate != null ? (args.age_appropriate ? 1 : 0) : null,
      args.manipulation_detected != null ? (args.manipulation_detected ? 1 : 0) : null,
      args.recommended_action || null,
    ]
  );

  io.to('dashboard').emit('agent:output', {
    sessionId,
    agentRole: 'profe',
    type: 'check_ai_response',
    content: `Safety: ${args.safety_rating}/100 | Sycophancy: ${args.sycophancy_score}/100 | Age-appropriate: ${args.age_appropriate ? 'Yes' : 'No'}`,
    data: args,
    timestamp: new Date().toISOString(),
  });
}

async function handleFlagIntervention(args, sessionId, io) {
  // Log the intervention as an observation
  await pool.execute(
    `INSERT INTO profe_observations
      (session_id, observation_type, description, sentiment, recommended_action)
     VALUES (?, ?, ?, ?, ?)`,
    [
      sessionId,
      args.intervention_type === 'safety' ? 'concerning_pattern' : 'ai_behavior',
      args.reason || 'Profe intervention triggered',
      args.severity === 'critical' || args.severity === 'high' ? 'critical' : 'concerned',
      args.intervention_type || 'educational',
    ]
  );

  // Notify dashboard
  io.to('dashboard').emit('agent:output', {
    sessionId,
    agentRole: 'profe',
    type: 'flag_intervention',
    content: `[${args.severity?.toUpperCase()}] Intervention: ${args.reason}`,
    data: args,
    timestamp: new Date().toISOString(),
  });

  return args.message_to_child || "Hey, let me share something important about AI with you.";
}

async function handleLogObservation(args, sessionId, io) {
  await pool.execute(
    `INSERT INTO profe_observations
      (session_id, observation_type, description, sentiment, ai_literacy_level)
     VALUES (?, ?, ?, ?, ?)`,
    [
      sessionId,
      args.observation_type || 'log_observation',
      args.description || null,
      args.sentiment || 'neutral',
      args.ai_literacy_level || null,
    ]
  );

  io.to('dashboard').emit('agent:output', {
    sessionId,
    agentRole: 'profe',
    type: 'log_observation',
    content: `[${args.sentiment}] ${args.description || 'Observation logged'}`,
    data: args,
    timestamp: new Date().toISOString(),
  });
}

async function handleNotifyParent(args, sessionId, io) {
  await pool.execute(
    `INSERT INTO notifications
      (session_id, type, urgency, summary, recipient, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      'profe_alert',
      args.urgency || 'low',
      args.summary || 'Profe flagged an observation',
      'parent_dashboard',
      'sent',
    ]
  );

  io.to('dashboard').emit('notification:new', {
    sessionId,
    urgency: args.urgency,
    type: args.notification_type,
    summary: args.summary,
    recommendedAction: args.recommended_action,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleProfeCalls };
```

**Step 4: Run tests to verify they pass**

Run: `cd <LOCAL_REPO_PATH>/server && npx jest __tests__/profeHandler.test.js --verbose`

Expected: ALL tests PASS.

**Step 5: Commit**

```bash
git add server/services/profeHandler.js server/__tests__/profeHandler.test.js
git commit -m "feat: add Profe function call handler with tests"
```

---

### Task 4: Update Socket Handler for Dual Mistral Agents

**Files:**
- Modify: `server/socket/handler.js`

**Context:** The socket handler currently sends messages to a single AI provider and the Social Worker AI (Lemonade). We need to change it to:
1. Send to kiddo Mistral agent (regular chatbot)
2. Send to Profe Mistral agent (silent monitor) with `returnFullResponse: true`
3. Process Profe's function calls via `profeHandler`
4. If Profe intervenes, replace the kiddo response
5. Handle `@profe` by routing directly to Profe agent (text response mode)

**Step 1: Add imports at the top of handler.js**

Add after existing imports (line 8):

```javascript
const { handleProfeCalls } = require('../services/profeHandler');
```

**Step 2: Add agent ID constants**

Add after `const PROFE_COMMAND = '@profe';` (line 14):

```javascript
const KIDDO_AGENT_ID = process.env.MISTRAL_KIDDO_AGENT_ID || 'ag_019ccbc6615476aab923e1753beee83f';
const PROFE_AGENT_ID = process.env.MISTRAL_AGENT_ID || 'ag_019ccb3989f970d1a478a8265009287a';
```

**Step 3: Rewrite the @profe handler (lines 163-188)**

Replace the existing `@profe` block with:

```javascript
        // 6. Check for @profe command — route directly to Profe Mistral agent
        const isProfeCommand = message.toLowerCase().includes(PROFE_COMMAND);
        if (isProfeCommand) {
          const mistralKey = process.env.MISTRAL_API_KEY;
          let profeResponse = '';

          if (mistralKey) {
            try {
              const history = await loadConversationHistory(sessionId);
              profeResponse = await proxyToProvider(message, history, {
                provider: 'mistral',
                apiKey: mistralKey,
                agentId: PROFE_AGENT_ID,
              });
            } catch (err) {
              console.error('@profe Mistral call failed:', err.message);
              profeResponse = "Hey, I'm Profe! I'm here to help you understand AI better. What's on your mind?";
            }
          } else {
            // Fallback to Lemonade if no Mistral key
            try {
              const result = await callAgent(AGENT_ROLES.SOCIAL_WORKER, message, session.lemonade_conversation_id);
              if (!session.lemonade_conversation_id && result.conversationId) {
                await pool.execute(
                  'UPDATE sessions SET lemonade_conversation_id = ? WHERE id = ?',
                  [result.conversationId, sessionId]
                );
              }
              profeResponse = result.response || "Hey, I'm Profe! I'm here to help you understand AI better. What's on your mind?";
            } catch {
              profeResponse = "Hey, I'm Profe! I'm here to help you understand AI better. What's on your mind?";
            }
          }

          const profeEnc = encrypt(profeResponse);
          await pool.execute(
            'INSERT INTO messages (session_id, sender, sender_type, content_encrypted, iv) VALUES (?, ?, ?, ?, ?)',
            [sessionId, 'profe', 'profe', profeEnc.encrypted, profeEnc.iv]
          );
          socket.emit('ai:message', { sessionId, message: profeResponse, sender: 'social_worker_ai' });
          io.to('dashboard').emit('session:update', { sessionId, crisisActive: false });
          return;
        }
```

**Step 4: Rewrite the normal message flow (lines 190-258)**

Replace everything from `// 7. Normal mode` through `// 12. Notify dashboard` with:

```javascript
        // 7. Normal mode: send to Kiddo AI AND Profe (silent monitor) in parallel
        const mistralKey = process.env.MISTRAL_API_KEY;
        const useMistral = !!mistralKey;

        let chatbotCall;
        let profeCall;

        if (useMistral) {
          const history = await loadConversationHistory(sessionId);

          // Kiddo chatbot agent — text response
          chatbotCall = proxyToProvider(message, history, {
            provider: 'mistral',
            apiKey: mistralKey,
            agentId: KIDDO_AGENT_ID,
          });

          // Profe monitor — function call response
          profeCall = proxyToProvider(message, history, {
            provider: 'mistral',
            apiKey: mistralKey,
            agentId: PROFE_AGENT_ID,
            returnFullResponse: true,
          });
        } else {
          // Fallback: OpenAI proxy or Lemonade
          const proxyProvider = process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : null);
          const proxyApiKey = process.env.OPENAI_API_KEY;
          const useProxy = !!proxyApiKey;
          const conversationHistory = useProxy ? await loadConversationHistory(sessionId) : [];

          chatbotCall = useProxy
            ? proxyToProvider(message, conversationHistory, {
                provider: proxyProvider,
                apiKey: proxyApiKey,
                model: process.env.AI_MODEL || 'gpt-4o-mini',
                systemPrompt: process.env.AI_SYSTEM_PROMPT || process.env.OPENAI_SYSTEM_PROMPT || '',
              })
            : callAgent(AGENT_ROLES.CHATBOT, message, session.lemonade_conversation_id);

          profeCall = callAgent(AGENT_ROLES.SOCIAL_WORKER, message);
        }

        const [chatbotResult, profeResult] = await Promise.allSettled([chatbotCall, profeCall]);

        // 8. Process chatbot response — this is what the user sees
        let aiResponse = '';
        if (chatbotResult.status === 'fulfilled') {
          if (typeof chatbotResult.value === 'string') {
            aiResponse = chatbotResult.value || "I'm here to help. What would you like to work on?";
          } else {
            // Lemonade mode
            const result = chatbotResult.value;
            if (!session.lemonade_conversation_id && result.conversationId) {
              await pool.execute(
                'UPDATE sessions SET lemonade_conversation_id = ? WHERE id = ?',
                [result.conversationId, sessionId]
              );
            }
            aiResponse = result.response || "I'm here to support you. Can you tell me more?";
          }
        } else {
          aiResponse = "I'm here to help. What would you like to work on?";
        }

        // 9. Process Profe monitoring response
        let crisisTriggered = false;
        let profeIntervened = false;
        let interventionMessage = null;

        if (profeResult.status === 'fulfilled') {
          if (useMistral && profeResult.value?.toolCalls) {
            // Mistral mode — process function calls
            const profeOutcome = await handleProfeCalls(profeResult.value.toolCalls, sessionId, io);
            profeIntervened = profeOutcome.intervention;
            interventionMessage = profeOutcome.interventionMessage;
          } else if (profeResult.value?.response) {
            // Lemonade mode — check for crisis signal
            const { isCrisis } = parseCrisisSignal(profeResult.value.response);
            crisisTriggered = isCrisis;
          }
        }

        // 10. Crisis protocol (Lemonade fallback path)
        if (crisisTriggered) {
          await activateCrisisProtocol(session, sessionId, message, therapist, io);
          return;
        }

        // 11. Profe intervention — replace or append to kiddo response
        if (profeIntervened && interventionMessage) {
          // Save Profe's intervention message
          const profeEnc = encrypt(interventionMessage);
          await pool.execute(
            'INSERT INTO messages (session_id, sender, sender_type, content_encrypted, iv) VALUES (?, ?, ?, ?, ?)',
            [sessionId, 'profe', 'profe', profeEnc.encrypted, profeEnc.iv]
          );

          // Save the kiddo response too (for the record) but don't show it
          const aiEnc = encrypt(aiResponse);
          await pool.execute(
            'INSERT INTO messages (session_id, sender, sender_type, content_encrypted, iv) VALUES (?, ?, ?, ?, ?)',
            [sessionId, 'kiddo_ai', 'kiddo_ai', aiEnc.encrypted, aiEnc.iv]
          );

          // Send Profe's message to the user instead
          socket.emit('ai:message', { sessionId, message: interventionMessage, sender: 'social_worker_ai' });
          io.to('dashboard').emit('session:update', { sessionId, crisisActive: false });
          return;
        }

        // 12. No intervention — save and emit the regular kiddo response
        const aiEnc = encrypt(aiResponse);
        await pool.execute(
          'INSERT INTO messages (session_id, sender, sender_type, content_encrypted, iv) VALUES (?, ?, ?, ?, ?)',
          [sessionId, 'kiddo_ai', 'kiddo_ai', aiEnc.encrypted, aiEnc.iv]
        );
        socket.emit('ai:message', { sessionId, message: aiResponse, sender: 'ai' });

        // 13. Notify dashboard of session activity
        io.to('dashboard').emit('session:update', {
          sessionId,
          crisisActive: false,
        });
```

**Step 5: Run full test suite**

Run: `cd <LOCAL_REPO_PATH>/server && npx jest --verbose`

Expected: ALL tests PASS.

**Step 6: Commit**

```bash
git add server/socket/handler.js
git commit -m "feat: wire dual Mistral agents (kiddo + Profe) with function call routing"
```

---

### Task 5: Update .env.example and Environment Config

**Files:**
- Modify: `.env.example`
- Modify: `server/utils/validateEnv.js` (if it exists)

**Step 1: Update .env.example with both agent IDs**

Add/update in the Mistral section of `.env.example`:

```env
# Mistral (Profe agent + Kiddo chatbot via Conversations API)
MISTRAL_API_KEY=
MISTRAL_AGENT_ID=<your-profe-agent-id>
MISTRAL_KIDDO_AGENT_ID=<your-kiddo-agent-id>
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add MISTRAL_KIDDO_AGENT_ID to env example"
```

---

### Task 6: Create Demo Session Bootstrap (No Auth for Demo)

**Files:**
- Modify: `server/socket/handler.js` (client:join handler)
- Modify: `server/index.js` (add demo session route)

**Context:** The current server requires a `user_id` for sessions (therapist account). For the demo, judges won't register — they'll just visit the site. We need a demo mode that auto-creates a session without auth.

**Step 1: Add a demo session creation endpoint to index.js**

Add before the health check route in `server/index.js`:

```javascript
// Demo mode — create a session without auth (for prototype only)
if (process.env.DEMO_MODE === 'true') {
  app.post('/api/demo/session', async (req, res) => {
    try {
      const { v4: uuidv4 } = require('uuid');
      const sessionId = uuidv4();

      // Use demo user ID (create a demo user in DB or use ID 1)
      const demoUserId = parseInt(process.env.DEMO_USER_ID, 10) || 1;

      await pool.execute(
        'INSERT INTO sessions (id, user_id, client_identifier) VALUES (?, ?, ?)',
        [sessionId, demoUserId, 'demo-judge']
      );

      res.json({ sessionId });
    } catch (err) {
      console.error('Demo session creation failed:', err.message);
      res.status(500).json({ error: 'Failed to create demo session' });
    }
  });
}
```

**Step 2: Update client:join to auto-create session if in demo mode**

In `server/socket/handler.js`, modify the `client:join` handler (lines 82-97) to auto-create session if it doesn't exist and DEMO_MODE is on:

```javascript
      socket.on('client:join', async (sessionId) => {
        if (!sessionId || !validateUUID(sessionId)) {
          return socket.emit('error', { message: 'Invalid session ID' });
        }
        try {
          const [rows] = await pool.execute(
            'SELECT id FROM sessions WHERE id = ?',
            [sessionId]
          );

          if (rows.length === 0) {
            // Demo mode: auto-create session
            if (process.env.DEMO_MODE === 'true') {
              const demoUserId = parseInt(process.env.DEMO_USER_ID, 10) || 1;
              await pool.execute(
                'INSERT INTO sessions (id, user_id, client_identifier) VALUES (?, ?, ?)',
                [sessionId, demoUserId, 'demo-judge']
              );
            } else {
              return; // unknown session — reject silently
            }
          }

          socket.join(`session:${sessionId}`);
        } catch (err) {
          console.error('client:join error:', err.message);
        }
      });
```

**Step 3: Add DEMO_MODE to .env.example**

```env
# Demo mode (prototype only — allows sessions without auth)
DEMO_MODE=true
DEMO_USER_ID=1
```

**Step 4: Commit**

```bash
git add server/socket/handler.js server/index.js .env.example
git commit -m "feat: add demo mode for judge presentation (no-auth session creation)"
```

---

### Task 7: Build and Test Locally

**Files:** None — verification only.

**Step 1: Run server tests**

Run: `cd <LOCAL_REPO_PATH>/server && npx jest --verbose`

Expected: ALL tests pass.

**Step 2: Build chatbot**

Run: `cd <LOCAL_REPO_PATH>/chatbot && npm run build`

Expected: Build succeeds, output in `chatbot/dist/`.

**Step 3: Build dashboard**

Run: `cd <LOCAL_REPO_PATH>/dashboard && npm run build`

Expected: Build succeeds, output in `dashboard/dist/`.

**Step 4: Test Docker build locally (optional)**

Run: `cd <LOCAL_REPO_PATH> && docker build -t social-worker-ai .`

Expected: Multi-stage build completes successfully.

**Step 5: Commit any build fixes**

If any build errors, fix and commit:

```bash
git commit -m "fix: resolve build issues"
```

---

### Task 8: Deploy to VPS

**Files:** None — deployment steps.

**Step 1: Push all changes to GitHub**

```bash
cd <LOCAL_REPO_PATH>
git push origin feat/demo-presentation-flow
```

**Step 2: SSH into VPS and clone**

```bash
ssh <SSH_USER>@<VPS_IP>
cd <WEB_ROOT>/
git clone https://github.com/profefernandez/social-worker-ai.git .
# Or if already cloned:
git pull origin feat/demo-presentation-flow
```

**Step 3: Create .env file on VPS**

```bash
cp .env.example .env
nano .env
```

Fill in:
```env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://prototype.60wattsofclarity.com

# MySQL (SPanel)
DB_HOST=localhost
DB_USER=<db-username>
DB_PASS=<your-db-password>
DB_NAME=<db-name>

# Security
JWT_SECRET=<generate-random-64-char-string>
ENCRYPTION_KEY=<generate-random-64-char-string>

# Mistral
MISTRAL_API_KEY=<your-mistral-key>
MISTRAL_AGENT_ID=<your-profe-agent-id>
MISTRAL_KIDDO_AGENT_ID=<your-kiddo-agent-id>

# Demo mode
DEMO_MODE=true
DEMO_USER_ID=1
```

**Step 4: Run the SQL schema via phpMyAdmin**

Open phpMyAdmin for the prototype database and run the SQL from Task 1 (the full schema.sql including the new profe_observations table and ALTER statements).

**Step 5: Create demo user in database**

Run in phpMyAdmin:

```sql
INSERT INTO users (email, password_hash, role)
VALUES ('jason@60wattsofclarity.com', '$2b$12$placeholder_hash_for_demo', 'admin');
```

**Step 6: Build and start with Docker Compose**

```bash
docker compose up -d --build
```

**Step 7: Configure SPanel reverse proxy**

In SPanel, set up reverse proxy for `prototype.60wattsofclarity.com` → `http://localhost:3000`.

Also ensure WebSocket upgrade is supported (SPanel should handle this with the proxy).

**Step 8: Verify**

```bash
curl https://prototype.60wattsofclarity.com/health
# Expected: {"status":"ok","timestamp":"..."}
```

Visit `https://prototype.60wattsofclarity.com` in browser. Should see the Problem slide.

**Step 9: Commit any deployment fixes if needed**

```bash
git commit -m "fix: deployment adjustments for VPS"
git push
```
