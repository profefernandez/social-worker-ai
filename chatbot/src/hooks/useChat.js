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

    socket.on('connect', () => {
      setConnected(true);
      // Join session room so admin intercept messages are received
      socket.emit('client:join', sessionId);
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('ai:message', ({ message, sender }) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: sender || 'ai', content: message },
      ]);
    });

    socket.on('admin:message', ({ message }) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'admin', content: message },
      ]);
    });

    socket.on('agent:joined', ({ agentName }) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'system', content: `${agentName} has joined the conversation` },
      ]);
      setCrisisActive(true);
    });

    socket.on('crisis:ended', () => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'system', content: 'Crisis protocol has ended' },
      ]);
      setCrisisActive(false);
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
