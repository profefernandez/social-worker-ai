import { Shield, Users } from 'lucide-react';

export default function ViewSwitcher({ view, onSwitch }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-ember-surface border border-ember-text/10">
      <button
        onClick={() => onSwitch('admin')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
          view === 'admin'
            ? 'ember-gradient text-ember-text shadow-lg'
            : 'text-ember-muted hover:text-ember-text'
        }`}
      >
        <Shield className="w-3.5 h-3.5" />
        Admin (Profe)
      </button>
      <button
        onClick={() => onSwitch('parent')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
          view === 'parent'
            ? 'ember-gradient text-ember-text shadow-lg'
            : 'text-ember-muted hover:text-ember-text'
        }`}
      >
        <Users className="w-3.5 h-3.5" />
        Parent View
      </button>
    </div>
  );
}
