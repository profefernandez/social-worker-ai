import { useState, useEffect } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import CrisisConstellation from '../components/CrisisConstellation';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function MonitorPage({ token, onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const crisisCount = sessions.filter((s) => s.crisis_active).length;

  return (
    <div className="flex-1 flex flex-col bg-ember-base">
      <div className="frost-panel border-b border-ember-text/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-ember-primary" />
          <h1 className="font-heading text-xl text-ember-text">Crisis Constellation</h1>
        </div>
        {crisisCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ember-crisis/15 border border-ember-crisis/25">
            <AlertTriangle className="w-4 h-4 text-ember-crisis" />
            <span className="text-sm text-ember-crisis font-mono">{crisisCount} active</span>
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-ember-muted font-mono text-sm">Loading constellation...</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-ember-safe/10 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-8 h-8 text-ember-safe" />
              </div>
              <p className="text-ember-muted font-body">No active sessions</p>
              <p className="text-ember-subtle text-sm mt-1">
                Sessions will appear as nodes when active
              </p>
            </div>
          </div>
        ) : (
          <CrisisConstellation sessions={sessions} onSelectSession={onSelectSession} />
        )}
      </div>
    </div>
  );
}
