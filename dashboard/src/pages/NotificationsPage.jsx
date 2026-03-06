import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

export default function NotificationsPage({ token }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setNotifications(data.notifications || []);
      } catch {
        // silent
      }
    }
    load();
  }, [token]);

  const typeColor = {
    sms: 'bg-green-900/40 text-green-400',
    call: 'bg-yellow-900/40 text-yellow-400',
    email: 'bg-blue-900/40 text-blue-400',
  };

  return (
    <div className="p-6">
      <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <Bell size={20} className="text-[#fee104]" />
        Notification Log
      </h2>
      <div className="bg-[#1a1d24] rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-slate-400 px-4 py-3 font-medium">Time</th>
              <th className="text-left text-slate-400 px-4 py-3 font-medium">Session</th>
              <th className="text-left text-slate-400 px-4 py-3 font-medium">Type</th>
              <th className="text-left text-slate-400 px-4 py-3 font-medium">Recipient</th>
              <th className="text-left text-slate-400 px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 py-8">
                  No notifications sent
                </td>
              </tr>
            )}
            {notifications.map((n) => (
              <tr key={n.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="px-4 py-3 text-slate-400">
                  {new Date(n.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                  {String(n.session_id).slice(0, 8)}…
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${typeColor[n.type] || 'bg-slate-700/40 text-slate-400'}`}>
                    {n.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{n.recipient}</td>
                <td className="px-4 py-3 text-slate-400">{n.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
