import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export function useChat(sessionId) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [crisisActive, setCrisisActive] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    const socket = io(SERVER_URL, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('ai:message', ({ message }) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'ai', content: message },
      ]);
    });

    socket.on('admin:message', ({ message }) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'admin', content: message },
      ]);
    });

    socket.on('session:update', ({ crisisActive: isActive }) => {
      if (isActive) setCrisisActive(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  function sendMessage(content) {
    if (!socketRef.current || !sessionId) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'client', content },
    ]);
    socketRef.current.emit('client:message', { sessionId, message: content });
  }

  return { messages, connected, crisisActive, sendMessage };
}
