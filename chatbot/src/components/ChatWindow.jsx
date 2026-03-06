import { useState, useRef, useEffect } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { useChat } from '../hooks/useChat';

export default function ChatWindow({ sessionId }) {
  const { messages, connected, crisisActive, sendMessage } = useChat(sessionId);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1d24] rounded-2xl overflow-hidden border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#121419] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">Support Chat</span>
          {crisisActive && (
            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">
              <AlertTriangle size={12} />
              Crisis Mode
            </span>
          )}
        </div>
        <span
          className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-600'}`}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-8">
            Hello! I&apos;m here to support you. How are you feeling today?
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-[#0f1115] text-white text-sm rounded-2xl px-4 py-2 border border-slate-700 focus:outline-none focus:border-[#fee104] placeholder:text-slate-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || !connected}
          className="bg-[#fee104] hover:bg-[#d6be00] text-black rounded-xl px-3 py-2 disabled:opacity-40 transition-colors"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isClient = message.sender === 'client';
  const isAdmin = message.sender === 'admin';

  return (
    <div className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
          isClient
            ? 'bg-[#fee104] text-black'
            : isAdmin
              ? 'bg-blue-700/40 text-blue-200 border border-blue-600/40'
              : 'bg-slate-700/60 text-white'
        }`}
      >
        {isAdmin && (
          <span className="block text-xs text-blue-400 mb-1 font-medium">Support Agent</span>
        )}
        {message.content}
      </div>
    </div>
  );
}
