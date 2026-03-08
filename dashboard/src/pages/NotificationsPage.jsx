import { useState, useEffect } from 'react';
import { Bell, MessageSquare, Phone, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const typeConfig = {
  sms: { icon: MessageSquare, color: 'text-ember-safe', bg: 'bg-ember-safe/10' },
  call: { icon: Phone, color: 'text-ember-primary', bg: 'bg-ember-primary/10' },
  email: { icon: Mail, color: 'text-ember-secondary', bg: 'bg-ember-secondary/10' },
};

export default function NotificationsPage({ token }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err.message);
      }
    };
    fetchNotifications();
  }, [token]);

  return (
    <div className="flex-1 flex flex-col bg-ember-base">
      <div className="frost-panel border-b border-ember-text/5 px-6 py-4 flex items-center gap-3">
        <Bell className="w-5 h-5 text-ember-primary" />
        <h1 className="font-heading text-xl text-ember-text">Notifications</h1>
        <span className="text-ember-muted text-sm font-mono ml-auto">
          {notifications.length} sent
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {notifications.length === 0 && (
            <div className="text-center text-ember-muted py-12">No notifications sent</div>
          )}
          {notifications.map((n) => {
            const config = typeConfig[n.type] || typeConfig.sms;
            const Icon = config.icon;
            return (
              <div key={n.id} className="frost-panel rounded-lg px-4 py-3 flex items-center gap-4">
                <span className="text-[13px] font-mono text-ember-muted whitespace-nowrap">
                  {new Date(n.created_at).toLocaleString()}
                </span>
                <code className="text-xs text-ember-primary font-mono">
                  {n.session_id ? String(n.session_id).substring(0, 8) : '---'}
                </code>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${config.bg}`}>
                  <Icon className={`w-3 h-3 ${config.color}`} />
                  <span className={`text-xs font-mono ${config.color}`}>{n.type}</span>
                </div>
                <span className="text-xs text-ember-muted font-mono">{n.recipient}</span>
                <span
                  className={`text-xs font-mono ml-auto ${
                    n.status === 'sent' ? 'text-ember-safe' : 'text-ember-crisis'
                  }`}
                >
                  {n.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
