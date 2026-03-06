import { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

export default function MonitorPage({ token, onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="p-6">
      <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <AlertTriangle size={20} className="text-[#fee104]" />
        Active Crisis Sessions
      </h2>

      {loading && <p className="text-slate-500 text-sm">Loading…</p>}
      {!loading && sessions.length === 0 && (
        <div className="bg-[#1a1d24] rounded-2xl p-8 text-center border border-slate-800">
          <p className="text-slate-500 text-sm">No active crisis sessions</p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="bg-[#1a1d24] rounded-2xl p-4 border border-red-900/40 cursor-pointer hover:border-red-700/60 transition-colors"
            onClick={() => onSelectSession(s)}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white text-sm font-medium">Session {s.id.slice(0, 8)}…</span>
                <p className="text-slate-500 text-xs mt-0.5">{s.therapist_email}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-red-400">
                <Clock size={12} />
                {new Date(s.crisis_activated_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
