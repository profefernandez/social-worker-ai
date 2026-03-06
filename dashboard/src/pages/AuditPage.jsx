import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

export default function AuditPage({ token }) {
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/audit', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAudit(data.audit || []);
      } catch {
        // silent
      }
    }
    load();
  }, [token]);

  return (
    <div className="p-6">
      <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <FileText size={20} className="text-[#fee104]" />
        Audit Trail
      </h2>
      <div className="bg-[#1a1d24] rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-slate-400 px-4 py-3 font-medium">Time</th>
              <th className="text-left text-slate-400 px-4 py-3 font-medium">Session</th>
              <th className="text-left text-slate-400 px-4 py-3 font-medium">Actor</th>
              <th className="text-left text-slate-400 px-4 py-3 font-medium">Action</th>
              <th className="text-left text-slate-400 px-4 py-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {audit.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 py-8">
                  No audit entries
                </td>
              </tr>
            )}
            {audit.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="px-4 py-3 text-slate-400">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                  {String(entry.session_id).slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-slate-300">{entry.actor}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      entry.action === 'crisis_activated'
                        ? 'bg-red-900/40 text-red-400'
                        : entry.action === 'intercepted'
                          ? 'bg-blue-900/40 text-blue-400'
                          : 'bg-slate-700/40 text-slate-400'
                    }`}
                  >
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{entry.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
