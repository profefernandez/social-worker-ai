import { AlertTriangle, LayoutDashboard, FileText, Bell, LogOut } from 'lucide-react';

export default function Sidebar({ page, onNavigate, user, onLogout }) {
  const navItems = [
    { id: 'monitor', label: 'Monitor', icon: LayoutDashboard },
    { id: 'audit', label: 'Audit Trail', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <aside className="w-56 bg-[#121419] border-r border-slate-800 flex flex-col">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-[#fee104]" />
          <span className="text-white font-bold text-sm">60 Watts</span>
        </div>
        <p className="text-slate-600 text-xs mt-1">Crisis Monitor</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
              page === id
                ? 'bg-[#fee104]/10 text-[#fee104] border border-[#fee104]/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <p className="text-slate-500 text-xs truncate mb-2">{user?.email}</p>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-white text-xs transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
