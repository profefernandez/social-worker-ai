import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export function useDashboard(token) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [crisisSessions, setCrisisSessions] = useState([]);

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
        prev.map((s) => (s.sessionId === data.sessionId ? { ...s, ...data } : s))
      );
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

  return { connected, crisisSessions, subscribeSession, sendIntercept };
}
