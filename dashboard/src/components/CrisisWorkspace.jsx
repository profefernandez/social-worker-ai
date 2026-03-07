import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ArrowLeft, Search, Radio, FileText, Send, UserCheck, XCircle } from 'lucide-react';
import AgentPanel from './AgentPanel';

export default function CrisisWorkspace({
  session,
  token,
  messages,
  agentOutputs,
  sendIntercept,
  onTakeover,
  onEndCrisis,
  onBack,
  isJasonActive,
}) {
  const [input, setInput] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmTakeover, setConfirmTakeover] = useState(false);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendIntercept(session.id || session.sessionId, trimmed);
    setInput('');
  };

  const searchEntries = (agentOutputs || []).filter((o) => o.agentRole === 'search');
  const commsEntries = (agentOutputs || []).filter((o) => o.agentRole === 'comms');
  const auditEntries = (agentOutputs || []).filter((o) => o.agentRole === 'audit');

  return (
    <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden bg-ember-base">
      {/* Top bar */}
      <div className="frost-panel px-4 py-3 border-b border-ember-text/5 flex items-center gap-3">
        <button onClick={onBack} className="text-ember-muted hover:text-ember-text transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <span className="text-sm font-heading text-ember-text">Crisis Workspace</span>
          <span className="text-[10px] font-mono text-ember-muted ml-2">
            {(session.id || session.sessionId || '').substring(0, 8)}
          </span>
        </div>

        {/* Jason's controls */}
        {!isJasonActive && (
          <div className="relative">
            {confirmTakeover ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ember-text">Enter conversation?</span>
                <button
                  onClick={() => { onTakeover(); setConfirmTakeover(false); }}
                  className="text-xs bg-ember-primary/20 text-ember-primary px-2 py-1 rounded font-mono hover:bg-ember-primary/30"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmTakeover(false)}
                  className="text-xs text-ember-muted px-2 py-1 rounded font-mono hover:text-ember-text"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmTakeover(true)}
                className="flex items-center gap-1.5 text-xs font-mono text-ember-primary bg-ember-primary/10 px-3 py-1.5 rounded-lg hover:bg-ember-primary/20 transition-colors"
              >
                <UserCheck className="w-3 h-3" />
                Enter Conversation
              </button>
            )}
          </div>
        )}

        <div className="relative">
          {confirmEnd ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ember-crisis">End protocol?</span>
              <button
                onClick={() => { onEndCrisis(); setConfirmEnd(false); }}
                className="text-xs bg-ember-crisis/20 text-ember-crisis px-2 py-1 rounded font-mono hover:bg-ember-crisis/30"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                className="text-xs text-ember-muted px-2 py-1 rounded font-mono hover:text-ember-text"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              className="flex items-center gap-1.5 text-xs font-mono text-ember-crisis bg-ember-crisis/10 px-3 py-1.5 rounded-lg hover:bg-ember-crisis/20 transition-colors"
            >
              <XCircle className="w-3 h-3" />
              End Protocol
            </button>
          )}
        </div>
      </div>

      {/* Main workspace grid */}
      <div className="flex-1 grid grid-cols-4 gap-3 p-3 overflow-hidden">
        {/* Left: Search Agent */}
        <div className="col-span-1 flex flex-col">
          <AgentPanel title="Search Agent" icon={Search} entries={searchEntries} accentColor="text-ember-safe" />
        </div>

        {/* Center: Chat Feed */}
        <div className="col-span-2 flex flex-col frost-panel rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-ember-text/5">
            <h3 className="text-sm font-heading text-ember-text">Live Conversation</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {(messages || []).map((msg, i) => {
              const senderLabels = {
                client: null,
                ai: 'AI Assistant',
                social_worker_ai: 'Social Worker AI',
                admin: 'Jason Fernandez, LMSW',
                system: null,
              };
              const senderStyles = {
                client: 'ml-8 bg-ember-primary/10 border border-ember-primary/20',
                ai: 'mr-8 frost-panel',
                social_worker_ai: 'mr-8 frost-panel border border-ember-secondary/40',
                admin: 'mr-8 frost-panel border border-ember-primary/40',
                system: 'mx-auto text-center',
              };

              if (msg.sender === 'system') {
                return (
                  <div key={i} className="py-1">
                    <div className="frost-panel rounded-full px-3 py-1 text-[10px] font-mono text-ember-muted mx-auto w-fit">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className={`rounded-xl px-3 py-2 text-xs text-ember-text ${senderStyles[msg.sender] || 'frost-panel'}`}>
                  {senderLabels[msg.sender] && (
                    <span className="text-[10px] font-mono text-ember-muted block mb-0.5">{senderLabels[msg.sender]}</span>
                  )}
                  {msg.content}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Jason's input — only shown when Jason has taken over */}
          {isJasonActive && (
            <div className="px-3 py-3 border-t border-ember-text/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type as Jason..."
                  className="flex-1 bg-ember-surface text-ember-text text-xs rounded-lg px-3 py-2 border border-ember-text/10 placeholder:text-ember-muted/60 focus:outline-none focus:ring-1 focus:ring-ember-primary/50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="ember-gradient rounded-lg px-3 py-2 text-ember-text disabled:opacity-30 transition-all"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Comms + Audit stacked */}
        <div className="col-span-1 flex flex-col gap-3">
          <div className="flex-1">
            <AgentPanel title="Comms Agent" icon={Radio} entries={commsEntries} accentColor="text-ember-primary" />
          </div>
          <div className="flex-1">
            <AgentPanel title="Audit Log" icon={FileText} entries={auditEntries} accentColor="text-ember-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
