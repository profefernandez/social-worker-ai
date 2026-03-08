import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const actionColors = {
  crisis_activated: 'text-ember-crisis bg-ember-crisis/10',
  intercepted: 'text-ember-secondary bg-ember-secondary/10',
  viewed: 'text-ember-primary bg-ember-primary/10',
  listed_crisis_sessions: 'text-ember-muted bg-ember-surface',
};

export default function AuditPage({ token }) {
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/audit`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAudit(data.audit || []);
        }
      } catch (err) {
        console.error('Failed to load audit log:', err.message);
      }
    };
    fetchAudit();
  }, [token]);

  return (
    <div className="flex-1 flex flex-col bg-ember-base">
      <div className="frost-panel border-b border-ember-text/5 px-6 py-4 flex items-center gap-3">
        <FileText className="w-5 h-5 text-ember-primary" />
        <h1 className="font-heading text-xl text-ember-text">Audit Trail</h1>
        <span className="text-ember-muted text-sm font-mono ml-auto">{audit.length} entries</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {audit.length === 0 && (
            <div className="text-center text-ember-muted py-12">No audit entries</div>
          )}
          {audit.map((entry) => (
            <div
              key={entry.id}
              className="frost-panel rounded-lg px-4 py-3 flex items-start gap-4"
            >
              <span className="text-[13px] font-mono text-ember-muted whitespace-nowrap mt-1">
                {new Date(entry.created_at).toLocaleString()}
              </span>
              <code className="text-xs text-ember-primary font-mono mt-1">
                {entry.session_id ? String(entry.session_id).substring(0, 8) : '---'}
              </code>
              <span className="text-xs text-ember-muted font-mono mt-1">{entry.actor}</span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded ${
                  actionColors[entry.action] || 'text-ember-muted bg-ember-surface'
                }`}
              >
                {entry.action}
              </span>
              <span className="text-xs text-ember-muted/70 flex-1 truncate mt-1">
                {entry.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
