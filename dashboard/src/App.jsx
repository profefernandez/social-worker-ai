import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import MonitorPage from './pages/MonitorPage';
import CrisisView from './pages/CrisisView';
import CrisisWorkspace from './components/CrisisWorkspace';
import AuditPage from './pages/AuditPage';
import NotificationsPage from './pages/NotificationsPage';
import Sidebar from './components/Sidebar';
import { useDashboard } from './hooks/useDashboard';

export default function App() {
  const isDev = import.meta.env.DEV;
  const [token, setToken] = useState(() => localStorage.getItem('dash_token') || (isDev ? 'dev-preview' : ''));
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dash_user') || 'null');
      return stored || (isDev ? { email: 'dev@preview.local', role: 'admin' } : null);
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState('monitor');
  const [selectedSession, setSelectedSession] = useState(null);

  const { connected, crisisSessions, agentOutputs, crisisMessages, jasonActive, subscribeSession, sendIntercept, takeover, endCrisis } = useDashboard(token);

  function handleLogin(tok, usr) {
    setToken(tok);
    setUser(usr);
    localStorage.setItem('dash_token', tok);
    localStorage.setItem('dash_user', JSON.stringify(usr));
  }

  function handleLogout() {
    setToken('');
    setUser(null);
    localStorage.removeItem('dash_token');
    localStorage.removeItem('dash_user');
  }

  function handleSelectSession(session) {
    setSelectedSession(session);
    subscribeSession(session.id);
    setPage('crisis');
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-ember-base flex">
      <Sidebar page={page} onNavigate={setPage} user={user} onLogout={handleLogout} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Connection status */}
        <div className="flex items-center justify-end px-6 py-2 border-b border-ember-text/5 frost-panel">
          <div className="flex items-center gap-2 text-xs text-ember-muted font-mono">
            <span
              className={`w-2 h-2 rounded-full ${connected ? 'bg-ember-safe' : 'bg-ember-crisis'}`}
            />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          {crisisSessions.length > 0 && (
            <span className="ml-4 text-xs text-ember-crisis bg-ember-crisis/10 border border-ember-crisis/20 px-2 py-0.5 rounded-full font-mono">
              {crisisSessions.length} active crisis{crisisSessions.length > 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {page === 'monitor' && (
          <MonitorPage token={token} onSelectSession={handleSelectSession} />
        )}
        {page === 'crisis' && selectedSession && (
          <CrisisWorkspace
            session={selectedSession}
            token={token}
            messages={crisisMessages[selectedSession.id || selectedSession.sessionId] || []}
            agentOutputs={agentOutputs.filter((o) => o.sessionId === (selectedSession.id || selectedSession.sessionId))}
            sendIntercept={sendIntercept}
            onTakeover={() => takeover(selectedSession.id || selectedSession.sessionId)}
            onEndCrisis={() => endCrisis(selectedSession.id || selectedSession.sessionId)}
            onBack={() => setPage('monitor')}
            isJasonActive={jasonActive[selectedSession.id || selectedSession.sessionId] || false}
          />
        )}
        {page === 'audit' && <AuditPage token={token} />}
        {page === 'notifications' && <NotificationsPage token={token} />}
      </main>
    </div>
  );
}
