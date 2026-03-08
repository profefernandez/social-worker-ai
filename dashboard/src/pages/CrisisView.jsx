import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowLeft, Send, AlertTriangle, Shield } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CrisisView({ session, token, sendIntercept, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/sessions/${session.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load messages:', err.message);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [session.id, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { x: 20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
    );
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendIntercept(session.id, trimmed);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'admin', content: trimmed, createdAt: new Date().toISOString() },
    ]);
    setInput('');
  };

  const senderStyles = {
    client: 'ml-12 bg-ember-primary/10 border border-ember-primary/15',
    ai: 'mr-12 frost-panel',
    admin: 'mr-12 frost-panel border border-ember-secondary/30',
  };

  const senderLabels = { client: 'Client', ai: 'AI Counselor', admin: 'Crisis Team' };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-ember-base">
      <div className="frost-panel border-b border-ember-text/5 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-ember-muted hover:text-ember-text transition-colors"
          aria-label="Back to monitor"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-ember-text font-heading text-sm">Session</span>
            <code className="text-ember-primary font-mono text-xs">
              {session.id?.substring(0, 12)}...
            </code>
          </div>
          <span className="text-ember-muted text-xs font-mono">{session.therapist_email}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ember-crisis/15 border border-ember-crisis/25">
          <AlertTriangle className="w-3.5 h-3.5 text-ember-crisis" />
          <span className="text-xs text-ember-crisis font-mono">Crisis Active</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`rounded-xl px-4 py-3 text-sm text-ember-text ${senderStyles[msg.sender] || ''}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-mono text-ember-muted uppercase tracking-wider">
                {senderLabels[msg.sender] || msg.sender}
              </span>
              {msg.createdAt && (
                <span className="text-[13px] font-mono text-ember-subtle">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="frost-panel border-t border-ember-text/5 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-ember-secondary" />
          <span className="text-xs text-ember-muted font-mono">Intercept as Crisis Team</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Send message to client..."
            className="flex-1 bg-ember-surface text-ember-text text-sm rounded-lg px-3 py-2 border border-ember-text/10 placeholder:text-ember-subtle focus:outline-none focus:ring-1 focus:ring-ember-secondary/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="ember-gradient rounded-lg px-3 py-2 text-ember-text disabled:opacity-30 transition-all ember-glow"
            aria-label="Send intercept"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
