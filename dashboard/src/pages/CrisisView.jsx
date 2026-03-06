import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft } from 'lucide-react';

export default function CrisisView({ session, token, sendIntercept, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    async function loadMessages() {
      try {
        const res = await fetch(`/api/admin/sessions/${session.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMessages(data.messages || []);
      } catch {
        // silent
      }
    }
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [session.id, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    sendIntercept(session.id, text);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'admin', content: text, createdAt: new Date().toISOString() },
    ]);
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h3 className="text-white font-semibold text-sm">
            Session {session.id.slice(0, 8)}…
          </h3>
          <p className="text-slate-500 text-xs">{session.therapist_email}</p>
        </div>
        <span className="ml-auto text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">
          Crisis Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'client' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                msg.sender === 'client'
                  ? 'bg-slate-700/60 text-white'
                  : msg.sender === 'ai'
                    ? 'bg-slate-600/40 text-slate-300'
                    : 'bg-blue-700/40 text-blue-200 border border-blue-600/40'
              }`}
            >
              <span className="block text-xs text-slate-400 mb-1 capitalize">{msg.sender}</span>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Intercept and message the client…"
          className="flex-1 bg-[#0f1115] text-white text-sm rounded-2xl px-4 py-2 border border-slate-700 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-3 py-2 disabled:opacity-40 transition-colors"
          aria-label="Send intercept message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
