import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export function useDashboard(token) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [crisisSessions, setCrisisSessions] = useState([]);
  const [agentOutputs, setAgentOutputs] = useState([]);
  const [crisisMessages, setCrisisMessages] = useState({});
  const [jasonActive, setJasonActive] = useState({});

  useEffect(() => {
    if (!token) return;

    const s = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('crisis:activated', (data) => {
      setCrisisSessions((prev) => {
        const exists = prev.find((x) => x.sessionId === data.sessionId);
        if (exists) return prev;
        return [data, ...prev];
      });
    });

    s.on('session:update', (data) => {
      setCrisisSessions((prev) =>
        prev.map((sess) => (sess.sessionId === data.sessionId ? { ...sess, ...data } : sess))
      );
    });

    s.on('agent:output', (data) => {
      setAgentOutputs((prev) => [...prev, data]);
    });

    s.on('agent:joined', (data) => {
      const msg = { id: Date.now(), sender: 'system', content: `${data.agentName} has joined the conversation` };
      setCrisisMessages((prev) => ({
        ...prev,
        [data.sessionId]: [...(prev[data.sessionId] || []), msg],
      }));
      if (data.agentName.includes('Jason')) {
        setJasonActive((prev) => ({ ...prev, [data.sessionId]: true }));
      }
    });

    s.on('crisis:ended', (data) => {
      const msg = { id: Date.now(), sender: 'system', content: 'Crisis protocol has ended' };
      setCrisisMessages((prev) => ({
        ...prev,
        [data.sessionId]: [...(prev[data.sessionId] || []), msg],
      }));
      setJasonActive((prev) => ({ ...prev, [data.sessionId]: false }));
      setCrisisSessions((prev) => prev.filter((sess) => sess.sessionId !== data.sessionId));
    });

    s.on('ai:message', (data) => {
      const msg = { id: Date.now(), sender: data.sender || 'ai', content: data.message };
      setCrisisMessages((prev) => ({
        ...prev,
        [data.sessionId]: [...(prev[data.sessionId] || []), msg],
      }));
    });

    s.on('admin:message', (data) => {
      const msg = { id: Date.now(), sender: 'admin', content: data.message };
      setCrisisMessages((prev) => ({
        ...prev,
        [data.sessionId]: [...(prev[data.sessionId] || []), msg],
      }));
    });

    setSocket(s);
    return () => s.disconnect();
  }, [token]);

  const subscribeSession = useCallback(
    (sessionId) => {
      if (socket) socket.emit('subscribe:session', sessionId);
    },
    [socket]
  );

  const sendIntercept = useCallback(
    (sessionId, message) => {
      if (socket) socket.emit('admin:intercept', { sessionId, message });
    },
    [socket]
  );

  const takeover = useCallback(
    (sessionId) => {
      if (socket) socket.emit('admin:takeover', { sessionId });
    },
    [socket]
  );

  const endCrisis = useCallback(
    async (sessionId) => {
      try {
        await fetch(`${SERVER_URL}/api/admin/sessions/${sessionId}/end-crisis`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Failed to end crisis:', err.message);
      }
    },
    [token]
  );

  return {
    connected,
    crisisSessions,
    agentOutputs,
    crisisMessages,
    jasonActive,
    subscribeSession,
    sendIntercept,
    takeover,
    endCrisis,
  };
}
