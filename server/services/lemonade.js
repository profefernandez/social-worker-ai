const axios = require('axios');

const LEMONADE_API_URL =
  process.env.LEMONADE_API_URL ||
  'https://sip.launchlemonade.app/api/1.1/wf/run_assistant';
const DEFAULT_ASSISTANT_ID =
  process.env.LEMONADE_ASSISTANT_ID || '1772822866868x782078534383128200';

/**
 * Send a message to the Launch Lemonade social worker AI.
 * @param {string} input - The user's message.
 * @param {string|null} conversationId - Existing conversation ID (null for new).
 * @param {string|null} apiKey - Tenant-specific API key (falls back to env).
 * @returns {Promise<{conversationId: string, responseId: string}>}
 */
async function runAssistant(input, conversationId = null, apiKey = null) {
  const key = apiKey || process.env.LEMONADE_API_KEY;
  if (!key) {
    throw new Error('Lemonade API key not configured');
  }

  const payload = {
    assistant_id: DEFAULT_ASSISTANT_ID,
    conversation_id: conversationId || '',
    input,
  };

  const response = await axios.post(LEMONADE_API_URL, payload, {
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  const data = response.data;
  if (data.Error && data.Error !== 'No') {
    throw new Error(`Lemonade API error: ${data.Error_Reason}`);
  }

  return {
    conversationId: data.Conversation_ID,
    responseId: data.Response_ID,
  };
}

module.exports = { runAssistant };
