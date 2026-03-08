const axios = require('axios');
jest.mock('axios');

const { proxyToProvider } = require('../services/aiProxy');

describe('aiProxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls OpenAI with correct format', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'Here is the answer!' } }],
      },
    });

    const result = await proxyToProvider('What is 2+2?', [], {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      systemPrompt: 'You are a helpful tutor.',
    });

    expect(result).toBe('Here is the answer!');
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          { role: 'system', content: 'You are a helpful tutor.' },
          { role: 'user', content: 'What is 2+2?' },
        ]),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    );
  });

  test('passes conversation history', async () => {
    axios.post.mockResolvedValue({
      data: { choices: [{ message: { content: 'Sure!' } }] },
    });

    const history = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    await proxyToProvider('Help me', history, { apiKey: 'test-key' });

    const callArgs = axios.post.mock.calls[0][1];
    expect(callArgs.messages).toHaveLength(3); // no systemPrompt + 2 history + 1 new
  });

  test('throws for unknown provider', async () => {
    await expect(
      proxyToProvider('Hi', [], { provider: 'unknown', apiKey: 'key' })
    ).rejects.toThrow('Unknown AI provider');
  });

  test('throws when no API key', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(
      proxyToProvider('Hi', [], { provider: 'openai' })
    ).rejects.toThrow('API key not configured');
  });

  test('uses env fallback for API key', async () => {
    process.env.OPENAI_API_KEY = 'env-key';
    axios.post.mockResolvedValue({
      data: { choices: [{ message: { content: 'ok' } }] },
    });

    await proxyToProvider('Hi', [], { provider: 'openai' });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer env-key',
        }),
      })
    );
    delete process.env.OPENAI_API_KEY;
  });

  test('calls Mistral Conversations API with agent ID', async () => {
    process.env.MISTRAL_AGENT_ID = 'ag_test123';
    axios.post.mockResolvedValue({
      data: {
        outputs: [{ role: 'assistant', content: 'Mistral agent response!' }],
      },
    });

    const result = await proxyToProvider('Explain gravity', [], {
      provider: 'mistral',
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
    delete process.env.MISTRAL_AGENT_ID;
  });

  test('Mistral passes conversation history as inputs', async () => {
    axios.post.mockResolvedValue({
      data: { outputs: [{ role: 'assistant', content: 'ok' }] },
    });

    const history = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ];

    await proxyToProvider('Next question', history, {
      provider: 'mistral',
      apiKey: 'key',
      agentId: 'ag_test',
    });

    const callArgs = axios.post.mock.calls[0][1];
    expect(callArgs.inputs).toHaveLength(3);
    expect(callArgs.inputs[2]).toEqual({ role: 'user', content: 'Next question' });
  });
});
