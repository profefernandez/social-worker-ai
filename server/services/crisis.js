// Crisis detection: keyword and pattern matching
const CRISIS_KEYWORDS = [
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  'want to die',
  'self-harm',
  'self harm',
  'cutting myself',
  'overdose',
  'hurt myself',
  'no reason to live',
  'better off dead',
  'can\'t go on',
  'cant go on',
  'don\'t want to be here',
  'dont want to be here',
  'hopeless',
  'helpless',
  'crisis',
];

const CRISIS_PATTERNS = [
  /\b(i\s*(want|need|plan)\s*to\s*(die|kill|hurt|harm))\b/i,
  /\b(thinking\s*(about|of)\s*(suicide|ending|killing))\b/i,
  /\b(no\s*(point|reason|way)\s*(in|to)\s*(living|life|go on))\b/i,
  /\b(i\s*give\s*up)\b/i,
];

/**
 * Detect whether a message contains crisis indicators.
 * @param {string} message
 * @returns {{ isCrisis: boolean, triggers: string[] }}
 */
function detectCrisis(message) {
  const lower = message.toLowerCase();
  const triggers = [];

  for (const keyword of CRISIS_KEYWORDS) {
    if (lower.includes(keyword)) {
      triggers.push(keyword);
    }
  }

  for (const pattern of CRISIS_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      triggers.push(match[0]);
    }
  }

  return {
    isCrisis: triggers.length > 0,
    triggers: [...new Set(triggers)],
  };
}

module.exports = { detectCrisis };
