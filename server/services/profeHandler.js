const { pool } = require('../config/db');
const { encrypt } = require('../middleware/encryption');

// Valid ENUM values for profe_observations.observation_type
const VALID_OBSERVATION_TYPES = new Set([
  'check_ai_response',
  'log_observation',
  'emotional_dependency',
  'ai_behavior',
  'critical_thinking',
  'ai_literacy',
  'boundary_issue',
  'positive_interaction',
  'concerning_pattern',
]);

// Valid ENUM values for profe_observations.sentiment
const VALID_SENTIMENTS = new Set(['positive', 'neutral', 'concerned', 'critical']);

// Valid ENUM values for profe_observations.ai_literacy_level
const VALID_LITERACY_LEVELS = new Set(['none', 'basic', 'intermediate', 'advanced']);

// Valid ENUM values for notifications.urgency
const VALID_URGENCIES = new Set(['low', 'medium', 'high', 'critical']);

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
    // Skip tool calls with parse errors
    if (call.arguments?._parseError) {
      // eslint-disable-next-line no-console
      console.warn(`Skipping tool call ${call.name}: malformed arguments`);
      continue;
    }

    switch (call.name) {
      case 'check_ai_response':
        try {
          await handleCheckAiResponse(call.arguments, sessionId, io);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Profe handler error (check_ai_response):', err.message);
        }
        break;

      case 'flag_intervention':
        // I3 fix: Set intervention BEFORE DB write — the child-facing message is safety-critical
        intervention = true;
        interventionMessage = call.arguments.message_to_child || "Hey, let me share something important about AI with you.";
        try {
          await handleFlagIntervention(call.arguments, sessionId, io);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Profe handler error (flag_intervention):', err.message);
          // Intervention still happens even if DB write fails
        }
        break;

      case 'log_observation':
        try {
          await handleLogObservation(call.arguments, sessionId, io);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Profe handler error (log_observation):', err.message);
        }
        break;

      case 'notify_parent':
        try {
          await handleNotifyParent(call.arguments, sessionId, io);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Profe handler error (notify_parent):', err.message);
        }
        break;

      default:
        // eslint-disable-next-line no-console
        console.warn(`Unknown Profe function: ${call.name}`);
        break;
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
  // Validate observation_type before inserting
  const obsType = args.intervention_type === 'safety' ? 'concerning_pattern' : 'ai_behavior';
  const sentiment = VALID_SENTIMENTS.has(args.severity === 'critical' || args.severity === 'high' ? 'critical' : 'concerned')
    ? (args.severity === 'critical' || args.severity === 'high' ? 'critical' : 'concerned')
    : 'concerned';

  // Save observation
  await pool.execute(
    `INSERT INTO profe_observations
      (session_id, observation_type, description, sentiment, recommended_action)
     VALUES (?, ?, ?, ?, ?)`,
    [
      sessionId,
      obsType,
      args.reason || 'Profe intervention triggered',
      sentiment,
      args.intervention_type || 'educational',
    ]
  );

  // I2 fix: Audit trail for interventions — log metadata only, never the message content
  await pool.execute(
    'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
    [sessionId, 'profe_agent', 'flag_intervention', `Severity: ${args.severity || 'unknown'}, Type: ${args.intervention_type || 'unknown'}`]
  );

  // Notify dashboard
  io.to('dashboard').emit('agent:output', {
    sessionId,
    agentRole: 'profe',
    type: 'flag_intervention',
    content: `[${args.severity?.toUpperCase() || 'UNKNOWN'}] Intervention: ${args.reason || 'No reason provided'}`,
    data: args,
    timestamp: new Date().toISOString(),
  });
}

async function handleLogObservation(args, sessionId, io) {
  // I4 fix: Validate observation_type against ENUM values
  const observationType = VALID_OBSERVATION_TYPES.has(args.observation_type)
    ? args.observation_type
    : 'log_observation';

  const sentiment = VALID_SENTIMENTS.has(args.sentiment)
    ? args.sentiment
    : 'neutral';

  const literacyLevel = VALID_LITERACY_LEVELS.has(args.ai_literacy_level)
    ? args.ai_literacy_level
    : null;

  await pool.execute(
    `INSERT INTO profe_observations
      (session_id, observation_type, description, sentiment, ai_literacy_level)
     VALUES (?, ?, ?, ?, ?)`,
    [
      sessionId,
      observationType,
      args.description || null,
      sentiment,
      literacyLevel,
    ]
  );

  io.to('dashboard').emit('agent:output', {
    sessionId,
    agentRole: 'profe',
    type: 'log_observation',
    content: `[${sentiment}] ${args.description || 'Observation logged'}`,
    data: args,
    timestamp: new Date().toISOString(),
  });
}

async function handleNotifyParent(args, sessionId, io) {
  // I4 fix: Validate urgency against ENUM values
  const urgency = VALID_URGENCIES.has(args.urgency) ? args.urgency : 'low';

  // I5 fix: Encrypt the summary before storage — it contains sensitive data about a minor
  const summaryText = args.summary || 'Profe flagged an observation';
  const { encrypted: summaryEnc, iv: summaryIv } = encrypt(summaryText);

  await pool.execute(
    `INSERT INTO notifications
      (session_id, type, urgency, summary, recipient, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      'profe_alert',
      urgency,
      `${summaryEnc}::${summaryIv}`,
      'parent_dashboard',
      'sent',
    ]
  );

  // I2 fix: Audit trail for parent notifications — metadata only
  await pool.execute(
    'INSERT INTO audit_log (session_id, actor, action, detail) VALUES (?, ?, ?, ?)',
    [sessionId, 'profe_agent', 'notify_parent', `Urgency: ${urgency}, Type: ${args.notification_type || 'unknown'}`]
  );

  io.to('dashboard').emit('notification:new', {
    sessionId,
    urgency,
    type: args.notification_type,
    summary: summaryText,
    recommendedAction: args.recommended_action,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleProfeCalls };
