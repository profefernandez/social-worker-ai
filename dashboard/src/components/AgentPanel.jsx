import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export default function AgentPanel({ title, icon: Icon, entries, accentColor }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="frost-panel rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-ember-text/5 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${accentColor}`} />
        <h3 className="text-sm font-heading text-ember-text">{title}</h3>
        <span className="ml-auto text-[10px] font-mono text-ember-muted">{entries.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {entries.length === 0 && (
          <p className="text-ember-muted/50 text-xs text-center py-4 font-mono">Waiting for agent...</p>
        )}
        {entries.map((entry, i) => (
          <AgentEntry key={i} entry={entry} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function AgentEntry({ entry }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
  }, []);

  return (
    <div ref={ref} className="frost-panel rounded-lg px-3 py-2">
      <span className="text-[9px] font-mono text-ember-muted block mb-1">
        {new Date(entry.timestamp).toLocaleTimeString()}
      </span>
      <p className="text-xs text-ember-text leading-relaxed">{entry.content}</p>
    </div>
  );
}
