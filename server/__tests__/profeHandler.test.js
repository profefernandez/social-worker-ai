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

  test('flag_intervention returns intervention with message and creates audit log', async () => {
    const { pool } = require('../config/db');
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
    // Verify audit trail was created
    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_log'),
      expect.arrayContaining([sessionId, 'profe_agent', 'flag_intervention'])
    );
  });

  test('flag_intervention still intervenes even if DB write fails', async () => {
    const { pool } = require('../config/db');
    pool.execute.mockRejectedValueOnce(new Error('DB connection lost'));

    const toolCalls = [
      {
        id: 'call_db_fail',
        name: 'flag_intervention',
        arguments: {
          severity: 'high',
          message_to_child: 'Safety first!',
          reason: 'Testing DB failure',
        },
      },
    ];

    const result = await handleProfeCalls(toolCalls, sessionId, mockIo);

    // Intervention must still happen even when DB fails
    expect(result.intervention).toBe(true);
    expect(result.interventionMessage).toBe('Safety first!');
  });

  test('skips tool calls with parse errors', async () => {
    const toolCalls = [
      {
        id: 'call_bad',
        name: 'check_ai_response',
        arguments: { _parseError: true, raw: 'bad json' },
      },
    ];

    const result = await handleProfeCalls(toolCalls, sessionId, mockIo);
    expect(result.intervention).toBe(false);
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
      expect.arrayContaining([sessionId, 'positive_interaction'])
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
