import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Send, AlertTriangle, Sparkles, Bot, User, Shield } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import SafetyBanner from './SafetyBanner';

const PROFE_CONFIG = {
  align: 'left',
  bubble: 'frost-panel border border-ember-secondary/30 bg-ember-secondary/5',
  avatar: { bg: 'bg-ember-secondary/20 border border-ember-secondary/30', icon: Shield, color: 'text-ember-secondary' },
  label: 'Profe',
};

const SENDER_CONFIG = {
  client: {
    align: 'right',
    bubble: 'bg-gradient-to-br from-ember-primary/25 to-ember-secondary/15 border border-ember-primary/20',
    avatar: { bg: 'bg-ember-primary/20', icon: User, color: 'text-ember-primary' },
    label: null,
  },
  ai: {
    align: 'left',
    bubble: 'frost-panel border border-ember-text/5',
    avatar: { bg: 'ember-gradient', icon: Sparkles, color: 'text-ember-text' },
    label: 'Study Assistant',
  },
  social_worker_ai: PROFE_CONFIG,
  profe: PROFE_CONFIG,
  admin: {
    align: 'left',
    bubble: 'frost-panel border border-ember-primary/30 bg-ember-primary/5',
    avatar: { bg: 'bg-ember-primary/20 border border-ember-primary/30', icon: User, color: 'text-ember-primary' },
    label: 'Jason Fernandez, LMSW',
  },
  system: {
    align: 'center',
    bubble: '',
    avatar: null,
    label: null,
  },
};

function MessageBubble({ sender, content, index, isConsecutive }) {
  const ref = useRef(null);
  const config = SENDER_CONFIG[sender] || SENDER_CONFIG.ai;

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { y: 10, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.25, delay: index * 0.03, ease: 'power2.out' }
    );
  }, [index]);

  if (sender === 'system') {
    return (
      <div ref={ref} className="flex justify-center py-2">
        <div className="frost-panel rounded-full px-4 py-1.5 text-[13px] font-mono text-ember-muted border border-ember-text/10">
          {content}
        </div>
      </div>
    );
  }

  const isRight = config.align === 'right';
  const Icon = config.avatar?.icon;

  return (
    <div ref={ref} className={`flex gap-3 ${isRight ? 'flex-row-reverse' : ''} ${isConsecutive ? 'mt-1' : 'mt-4'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8">
        {!isConsecutive && Icon && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.avatar.bg}`}>
            <Icon className={`w-4 h-4 ${config.avatar.color}`} />
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isRight ? 'items-end' : 'items-start'}`}>
        {!isConsecutive && config.label && (
          <span className={`text-xs font-mono text-ember-muted block mb-1 ${isRight ? 'text-right' : ''}`}>
            {config.label}
          </span>
        )}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed text-ember-text ${config.bubble} ${
          isRight ? 'rounded-tr-md' : 'rounded-tl-md'
        } ${isConsecutive && isRight ? 'rounded-r-md' : ''} ${isConsecutive && !isRight ? 'rounded-l-md' : ''}`}>
          {content}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 mt-4">
      <div className="w-8 h-8 rounded-full ember-gradient flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-ember-text" />
      </div>
      <div className="frost-panel border border-ember-text/5 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-ember-muted/40 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-ember-muted/40 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-ember-muted/40 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({ sessionId }) {
  const { messages, connected, crisisActive, sendMessage } = useChat(sessionId);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const textInputRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Simulate typing indicator when waiting for AI response
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender === 'client') {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput('');
    textInputRef.current?.focus();
  };

  const isConsecutive = (i) => {
    if (i === 0) return false;
    return messages[i].sender === messages[i - 1].sender;
  };

  return (
    <div className="min-h-screen bg-ember-base flex items-center justify-center p-6">
      <div
        ref={containerRef}
        className={`w-full max-w-2xl h-[85vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl shadow-black/50 ${
          crisisActive ? 'animate-pulse-crisis border-ember-crisis/30' : 'border-ember-text/8'
        }`}
        style={{ background: 'rgba(26, 22, 20, 0.97)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-ember-text/8" style={{ background: 'rgba(42, 36, 33, 0.8)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl ember-gradient flex items-center justify-center shadow-lg shadow-ember-primary/20">
              <Sparkles className="w-5 h-5 text-ember-text" />
            </div>
            <div>
              <h1 className="font-heading text-ember-text text-lg leading-tight">60 Watts of Intelligence</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-ember-safe animate-pulse' : 'bg-ember-muted'}`} />
                <span className="text-[13px] font-mono text-ember-muted">
                  {connected ? 'Online' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {crisisActive && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ember-crisis/20 border border-ember-crisis/30">
                <AlertTriangle className="w-3.5 h-3.5 text-ember-crisis" />
                <span className="text-xs text-ember-crisis font-mono">Crisis Protocol</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-ember-surface border border-ember-text/5">
              <Bot className="w-3.5 h-3.5 text-ember-muted" />
              <span className="text-[13px] font-mono text-ember-muted">AI</span>
            </div>
          </div>
        </div>

        <SafetyBanner crisisActive={crisisActive} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="text-center mt-12">
              <div className="w-16 h-16 rounded-2xl ember-gradient mx-auto mb-5 flex items-center justify-center shadow-lg shadow-ember-primary/20">
                <Sparkles className="w-7 h-7 text-ember-text" />
              </div>
              <h2 className="text-ember-text text-lg font-heading mb-2">Hey! Ready to study?</h2>
              <p className="text-ember-muted text-sm mb-6 max-w-sm mx-auto">
                Ask me anything — homework help, test prep, or just curious questions. I am here for you.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { label: 'Help with math', msg: 'Help me with my math homework' },
                  { label: 'Explain photosynthesis', msg: 'Explain photosynthesis' },
                  { label: 'Essay outline', msg: 'Help me write an essay outline' },
                  { label: 'Quiz me', msg: 'Quiz me on my vocabulary words' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => sendMessage(item.msg)}
                    className="text-[13px] font-mono text-ember-muted bg-ember-surface px-4 py-2 rounded-xl border border-ember-text/10 hover:border-ember-primary/30 hover:text-ember-text hover:bg-ember-surface/80 transition-all"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id || i}
              sender={msg.sender}
              content={msg.content}
              index={i}
              isConsecutive={isConsecutive(i)}
            />
          ))}

          {isTyping && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-ember-text/8 px-5 py-4" style={{ background: 'rgba(42, 36, 33, 0.6)' }}>
          {/* Input row */}
          <div className="flex items-end gap-2">
            {/* Text input */}
            <div className="flex-1 relative">
              <input
                ref={textInputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="w-full bg-ember-surface text-ember-text text-sm rounded-xl px-4 py-3 border border-ember-text/8 placeholder:text-ember-subtle focus:outline-none focus:ring-2 focus:ring-ember-primary/30 focus:border-ember-primary/20 transition-all"
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-10 h-10 ember-gradient rounded-xl flex items-center justify-center text-ember-text disabled:opacity-20 transition-all ember-glow shadow-lg shadow-ember-primary/10 disabled:shadow-none"
              aria-label="Send message"
            >
              <Send className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-ember-subtle text-[13px] font-mono mt-3">
            Type <span className="text-ember-subtle">@profe</span> to talk to Profe &middot; 988 or 911 for emergencies
          </p>
        </div>
      </div>
    </div>
  );
}
