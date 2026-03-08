const axios = require('axios');
jest.mock('axios');

const {
  sendMessage,
  formatRequest,
  parseResponse,
  parseFullResponse,
  MISTRAL_URL,
} = require('../services/mistral');

describe('mistral', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MISTRAL_API_KEY;
    delete process.env.MISTRAL_AGENT_ID;
  });

  describe('formatRequest', () => {
    test('builds request with agent_id and inputs', () => {
      const result = formatRequest('Hello', [{ role: 'user', content: 'Hi' }], {
        agentId: 'agent-123',
      });

      expect(result).toEqual({
        agent_id: 'agent-123',
        inputs: [
          { role: 'user', content: 'Hi' },
          { role: 'user', content: 'Hello' },
        ],
      });
    });

    test('uses MISTRAL_AGENT_ID env var as fallback', () => {
      process.env.MISTRAL_AGENT_ID = 'env-agent-id';
      const result = formatRequest('Hello', [], {});
      expect(result.agent_id).toBe('env-agent-id');
    });

    test('throws when no agentId configured', () => {
      expect(() => formatRequest('Hello', [], {})).toThrow(
        'Mistral agent_id not configured'
      );
    });
  });

  describe('parseResponse', () => {
    test('extracts assistant text content', () => {
      const data = {
        outputs: [
          { role: 'assistant', content: 'Hello there!' },
        ],
      };
      expect(parseResponse(data)).toBe('Hello there!');
    });

    test('returns empty string when no assistant message', () => {
      expect(parseResponse({ outputs: [] })).toBe('');
      expect(parseResponse({})).toBe('');
    });
  });

  describe('parseFullResponse', () => {
    test('extracts content and valid tool_calls', () => {
      const data = {
        outputs: [
          {
            role: 'assistant',
            content: 'Let me search that.',
            tool_calls: [
              {
                id: 'tc-1',
                function: {
                  name: 'web_search',
                  arguments: '{"query":"test"}',
                },
              },
            ],
          },
        ],
      };

      const result = parseFullResponse(data);
      expect(result.content).toBe('Let me search that.');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0]).toEqual({
        id: 'tc-1',
        name: 'web_search',
        arguments: { query: 'test' },
      });
    });

    test('handles arguments as object (not string)', () => {
      const data = {
        outputs: [
          {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'tc-2',
                function: {
                  name: 'lookup',
                  arguments: { id: 42 },
                },
              },
            ],
          },
        ],
      };

      const result = parseFullResponse(data);
      expect(result.toolCalls[0].arguments).toEqual({ id: 42 });
    });

    test('skips malformed tool_call missing function', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const data = {
        outputs: [
          {
            role: 'assistant',
            content: 'ok',
            tool_calls: [{ id: 'bad-1' }],
          },
        ],
      };

      const result = parseFullResponse(data);
      expect(result.toolCalls).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping malformed tool_call')
      );
      consoleSpy.mockRestore();
    });

    test('handles unparseable arguments with _parseError marker', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const data = {
        outputs: [
          {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'tc-bad',
                function: {
                  name: 'do_thing',
                  arguments: '{invalid json',
                },
              },
            ],
          },
        ],
      };

      const result = parseFullResponse(data);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].arguments._parseError).toBe(true);
      expect(result.toolCalls[0].arguments.raw).toBe('{invalid json');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse tool_call arguments')
      );
      consoleSpy.mockRestore();
    });

    test('returns empty toolCalls when no tool_calls present', () => {
      const data = {
        outputs: [{ role: 'assistant', content: 'Just text' }],
      };
      const result = parseFullResponse(data);
      expect(result.content).toBe('Just text');
      expect(result.toolCalls).toEqual([]);
    });
  });

  describe('sendMessage', () => {
    test('sends request and returns text response', async () => {
      axios.post.mockResolvedValue({
        data: {
          outputs: [{ role: 'assistant', content: 'Agent reply' }],
        },
      });

      const result = await sendMessage('Hello', [], {
        apiKey: 'test-key',
        agentId: 'agent-1',
      });

      expect(result).toBe('Agent reply');
      expect(axios.post).toHaveBeenCalledWith(
        MISTRAL_URL,
        expect.objectContaining({
          agent_id: 'agent-1',
          inputs: [{ role: 'user', content: 'Hello' }],
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    test('returns full response when returnFullResponse is true', async () => {
      axios.post.mockResolvedValue({
        data: {
          outputs: [
            {
              role: 'assistant',
              content: 'Here you go',
              tool_calls: [
                {
                  id: 'tc-1',
                  function: { name: 'search', arguments: '{"q":"hi"}' },
                },
              ],
            },
          ],
        },
      });

      const result = await sendMessage('Find it', [], {
        apiKey: 'key',
        agentId: 'agent-1',
        returnFullResponse: true,
      });

      expect(result).toEqual({
        content: 'Here you go',
        toolCalls: [{ id: 'tc-1', name: 'search', arguments: { q: 'hi' } }],
      });
    });

    test('throws when no API key configured', async () => {
      await expect(
        sendMessage('Hi', [], { agentId: 'agent-1' })
      ).rejects.toThrow('Mistral API key not configured');
    });

    test('uses env fallback for API key', async () => {
      process.env.MISTRAL_API_KEY = 'env-key';
      axios.post.mockResolvedValue({
        data: { outputs: [{ role: 'assistant', content: 'ok' }] },
      });

      await sendMessage('Hi', [], { agentId: 'agent-1' });

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

    test('includes conversation history in inputs', async () => {
      axios.post.mockResolvedValue({
        data: { outputs: [{ role: 'assistant', content: 'ok' }] },
      });

      const history = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous reply' },
      ];

      await sendMessage('New message', history, {
        apiKey: 'key',
        agentId: 'agent-1',
      });

      const callBody = axios.post.mock.calls[0][1];
      expect(callBody.inputs).toHaveLength(3);
      expect(callBody.inputs[0]).toEqual({ role: 'user', content: 'Previous message' });
      expect(callBody.inputs[2]).toEqual({ role: 'user', content: 'New message' });
    });
  });
});
