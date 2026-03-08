const axios = require('axios');
jest.mock('axios');

const { proxyToProvider } = require('../services/aiProxy');

describe('aiProxy (Mistral-only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MISTRAL_API_KEY;
    delete process.env.MISTRAL_AGENT_ID;
  });

  test('calls Mistral Conversations API with agent ID', async () => {
    axios.post.mockResolvedValue({
      data: {
        outputs: [{ role: 'assistant', content: 'Mistral agent response!' }],
      },
    });

    const result = await proxyToProvider('Explain gravity', [], {
      apiKey: 'mistral-test-key',
      agentId: 'ag_test123',
    });

    expect(result).toBe('Mistral agent response!');
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.mistral.ai/v1/conversations',
      expect.objectContaining({
        agent_id: 'ag_test123',
        inputs: [{ role: 'user', content: 'Explain gravity' }],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mistral-test-key',
        }),
      })
    );
  });

  test('passes conversation history as inputs', async () => {
    axios.post.mockResolvedValue({
      data: { outputs: [{ role: 'assistant', content: 'ok' }] },
    });

    const history = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ];

    await proxyToProvider('Next question', history, {
      apiKey: 'key',
      agentId: 'ag_test',
    });

    const callArgs = axios.post.mock.calls[0][1];
    expect(callArgs.inputs).toHaveLength(3);
    expect(callArgs.inputs[2]).toEqual({ role: 'user', content: 'Next question' });
  });

  test('throws when no API key', async () => {
    await expect(
      proxyToProvider('Hi', [], {})
    ).rejects.toThrow('MISTRAL_API_KEY not configured');
  });

  test('uses env fallback for API key', async () => {
    process.env.MISTRAL_API_KEY = 'env-key';
    axios.post.mockResolvedValue({
      data: { outputs: [{ role: 'assistant', content: 'ok' }] },
    });

    await proxyToProvider('Hi', [], { agentId: 'ag_test' });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer env-key',
        }),
      })
    );
  });

  test('extracts tool_calls when returnFullResponse is true', async () => {
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

  test('returns text-only when no tool_calls and returnFullResponse is true', async () => {
    axios.post.mockResolvedValue({
      data: {
        outputs: [{ role: 'assistant', content: 'Just a text reply' }],
      },
    });

    const result = await proxyToProvider('Hi', [], {
      apiKey: 'key',
      agentId: 'ag_test',
      returnFullResponse: true,
    });

    expect(result).toEqual({
      content: 'Just a text reply',
      toolCalls: [],
    });
  });

  test('returns string when returnFullResponse is false', async () => {
    axios.post.mockResolvedValue({
      data: { outputs: [{ role: 'assistant', content: 'text reply' }] },
    });

    const result = await proxyToProvider('Hi', [], {
      apiKey: 'key',
      agentId: 'ag_test',
    });

    expect(result).toBe('text reply');
  });

  test('supports different agent IDs for different calls', async () => {
    axios.post.mockResolvedValue({
      data: { outputs: [{ role: 'assistant', content: 'ok' }] },
    });

    await proxyToProvider('msg1', [], { apiKey: 'key', agentId: 'ag_kiddo_123' });
    await proxyToProvider('msg2', [], { apiKey: 'key', agentId: 'ag_profe_456' });

    expect(axios.post.mock.calls[0][1].agent_id).toBe('ag_kiddo_123');
    expect(axios.post.mock.calls[1][1].agent_id).toBe('ag_profe_456');
  });

  test('handles malformed tool_call arguments gracefully', async () => {
    axios.post.mockResolvedValue({
      data: {
        outputs: [
          {
            role: 'assistant',
            content: 'text',
            tool_calls: [
              {
                id: 'call_bad',
                function: {
                  name: 'check_ai_response',
                  arguments: 'not valid json {{{',
                },
              },
            ],
          },
        ],
      },
    });

    const result = await proxyToProvider('Hi', [], {
      apiKey: 'key',
      agentId: 'ag_test',
      returnFullResponse: true,
    });

    expect(result.toolCalls[0].arguments._parseError).toBe(true);
    expect(result.toolCalls[0].arguments.raw).toBe('not valid json {{{');
  });
});
