const axios = require('axios');

const MISTRAL_URL = 'https://api.mistral.ai/v1/conversations';

/**
 * Format request for Mistral Conversations API.
 */
function formatRequest(input, conversationHistory, config) {
  const agent_id = config.agentId || process.env.MISTRAL_AGENT_ID;
  if (!agent_id) {
    throw new Error('Mistral agent_id is not configured. Set MISTRAL_AGENT_ID or pass config.agentId.');
  }
  return {
    agent_id,
    inputs: [
      ...conversationHistory,
      { role: 'user', content: input },
    ],
  };
}

/**
 * Parse Mistral response — text content only.
 */
function parseResponse(data) {
  const outputs = data.outputs || [];
  const assistantMsg = outputs.find((o) => o.role === 'assistant');
  return assistantMsg?.content || '';
}

/**
 * Parse Mistral response — text content + function calls (tool_calls).
 */
function parseFullResponse(data) {
  const outputs = data.outputs || [];
  const assistantMsg = outputs.find((o) => o.role === 'assistant');
  const content = assistantMsg?.content || '';
  const rawToolCalls = assistantMsg?.tool_calls || [];

  const toolCalls = rawToolCalls
    .filter((tc) => tc.function && typeof tc.function.name === 'string')
    .map((tc) => {
      let parsedArgs = {};
      try {
        parsedArgs = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments || {};
      } catch {
        const argValue = tc.function.arguments;
        // Log only the type descriptor — never the raw value — to avoid leaking PII
        const argSummary = typeof argValue === 'string'
          ? `string(length=${argValue.length})`
          : 'non-string';
        // eslint-disable-next-line no-console
        console.error(
          `Failed to parse tool_call arguments for ${tc.function.name} (id=${tc.id}); arguments type: ${argSummary}`
        );
        parsedArgs = { _parseError: true };
      }

      return {
        id: tc.id,
        name: tc.function.name,
        arguments: parsedArgs,
      };
    });

  return { content, toolCalls };
}

/**
 * Send a message to a Mistral agent via the Conversations API.
 *
 * @param {string} input - User's message
 * @param {Array} conversationHistory - Previous messages [{role, content}]
 * @param {Object} config - { apiKey, agentId, returnFullResponse }
 * @returns {Promise<string|{content: string, toolCalls: Array}>}
 *   If returnFullResponse is true, returns { content, toolCalls }.
 *   Otherwise returns just the content string.
 */
async function proxyToProvider(input, conversationHistory = [], config = {}) {
  const apiKey = config.apiKey || process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY not configured');
  }

  const body = formatRequest(input, conversationHistory, config);

  const response = await axios.post(MISTRAL_URL, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  if (config.returnFullResponse) {
    return parseFullResponse(response.data);
  }
  return parseResponse(response.data);
}

module.exports = { proxyToProvider, parseResponse, parseFullResponse };
