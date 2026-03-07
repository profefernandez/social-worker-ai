const axios = require('axios');
jest.mock('axios');

const { resolveAgentId, AGENT_ROLES } = require('../services/agentOrchestrator');

describe('agentOrchestrator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      LEMONADE_API_KEY: 'test-key',
      LEMONADE_API_URL: 'https://test.api/run_assistant',
      LEMONADE_AGENT_CHATBOT_ID: 'chatbot-123',
      LEMONADE_AGENT_SOCIAL_WORKER_ID: 'sw-456',
      LEMONADE_AGENT_SEARCH_ID: 'search-789',
      LEMONADE_AGENT_COMMS_ID: 'comms-101',
      LEMONADE_AGENT_AUDIT_ID: 'audit-202',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('AGENT_ROLES', () => {
    test('defines all 5 agent roles', () => {
      expect(AGENT_ROLES).toEqual({
        CHATBOT: 'chatbot',
        SOCIAL_WORKER: 'social_worker',
        SEARCH: 'search',
        COMMS: 'comms',
        AUDIT: 'audit',
      });
    });
  });

  describe('resolveAgentId', () => {
    test('resolves chatbot agent ID from env', () => {
      expect(resolveAgentId(AGENT_ROLES.CHATBOT)).toBe('chatbot-123');
    });

    test('resolves social worker agent ID from env', () => {
      expect(resolveAgentId(AGENT_ROLES.SOCIAL_WORKER)).toBe('sw-456');
    });

    test('resolves search agent ID from env', () => {
      expect(resolveAgentId(AGENT_ROLES.SEARCH)).toBe('search-789');
    });

    test('resolves comms agent ID from env', () => {
      expect(resolveAgentId(AGENT_ROLES.COMMS)).toBe('comms-101');
    });

    test('resolves audit agent ID from env', () => {
      expect(resolveAgentId(AGENT_ROLES.AUDIT)).toBe('audit-202');
    });

    test('throws for unknown role', () => {
      expect(() => resolveAgentId('unknown')).toThrow('Unknown agent role');
    });
  });
});

describe('callAgent', () => {
  const { callAgent, AGENT_ROLES } = require('../services/agentOrchestrator');

  beforeEach(() => {
    process.env.LEMONADE_API_KEY = 'test-key';
    process.env.LEMONADE_API_URL = 'https://test.api/run_assistant';
    process.env.LEMONADE_AGENT_CHATBOT_ID = 'chatbot-123';
  });

  test('calls Lemonade API with correct assistant ID and input', async () => {
    axios.post.mockResolvedValue({
      data: { Conversation_ID: 'conv-1', response: 'Hello there', Error: 'No' },
    });

    const result = await callAgent(AGENT_ROLES.CHATBOT, 'Hi');

    expect(axios.post).toHaveBeenCalledWith(
      'https://test.api/run_assistant',
      { assistant_id: 'chatbot-123', conversation_id: '', input: 'Hi' },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      })
    );
    expect(result.response).toBe('Hello there');
    expect(result.conversationId).toBe('conv-1');
  });

  test('passes existing conversation ID', async () => {
    axios.post.mockResolvedValue({
      data: { Conversation_ID: 'conv-1', response: 'Ok', Error: 'No' },
    });

    await callAgent(AGENT_ROLES.CHATBOT, 'Hi', 'existing-conv');

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ conversation_id: 'existing-conv' }),
      expect.any(Object)
    );
  });

  test('throws on API error', async () => {
    axios.post.mockResolvedValue({
      data: { Error: 'Yes', Error_Reason: 'Bad request' },
    });

    await expect(callAgent(AGENT_ROLES.CHATBOT, 'Hi')).rejects.toThrow('Bad request');
  });

  test('throws when agent not configured', async () => {
    delete process.env.LEMONADE_AGENT_CHATBOT_ID;
    await expect(callAgent(AGENT_ROLES.CHATBOT, 'Hi')).rejects.toThrow('not configured');
  });
});
