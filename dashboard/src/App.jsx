import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import MonitorPage from './pages/MonitorPage';
import CrisisView from './pages/CrisisView';
import AuditPage from './pages/AuditPage';
import NotificationsPage from './pages/NotificationsPage';
import Sidebar from './components/Sidebar';
import { useDashboard } from './hooks/useDashboard';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('dash_token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dash_user') || 'null');
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState('monitor');
  const [selectedSession, setSelectedSession] = useState(null);

  const { connected, crisisSessions, subscribeSession, sendIntercept } = useDashboard(token);

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
    <div className="min-h-screen bg-[#0f1115] flex">
      <Sidebar page={page} onNavigate={setPage} user={user} onLogout={handleLogout} />

      <main className="flex-1 overflow-auto">
        {/* Connection status bar */}
        <div className="flex items-center justify-end px-6 py-2 border-b border-slate-800 bg-[#121419]">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          {crisisSessions.length > 0 && (
            <span className="ml-4 text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">
              {crisisSessions.length} active crisis
              {crisisSessions.length > 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {page === 'monitor' && (
          <MonitorPage token={token} onSelectSession={handleSelectSession} />
        )}
        {page === 'crisis' && selectedSession && (
          <CrisisView
            session={selectedSession}
            token={token}
            sendIntercept={sendIntercept}
            onBack={() => setPage('monitor')}
          />
        )}
        {page === 'audit' && <AuditPage token={token} />}
        {page === 'notifications' && <NotificationsPage token={token} />}
      </main>
    </div>
  );
}
