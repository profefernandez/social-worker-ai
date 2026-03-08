import { Activity, FileText, Bell, LogOut } from 'lucide-react';

const navItems = [
  { id: 'monitor', label: 'Crisis Monitor', icon: Activity },
  { id: 'audit', label: 'Audit Trail', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function Sidebar({ page, onNavigate, user, onLogout }) {
  return (
    <div className="w-56 h-screen frost-panel border-r border-ember-text/5 flex flex-col">
      <div className="px-4 py-5 border-b border-ember-text/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg ember-gradient flex items-center justify-center">
            <span className="text-ember-text font-heading text-xs font-bold">60</span>
          </div>
          <div>
            <span className="text-ember-text font-heading text-sm block leading-tight">
              Crisis Monitor
            </span>
            <span className="text-ember-muted text-[13px] font-mono">60 Watts of Clarity</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              page === id
                ? 'bg-ember-primary/15 text-ember-primary border border-ember-primary/20'
                : 'text-ember-muted hover:text-ember-text hover:bg-ember-surface'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-ember-text/5">
        <div className="text-xs text-ember-muted font-mono truncate mb-2">{user?.email}</div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-sm text-ember-muted hover:text-ember-crisis transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
