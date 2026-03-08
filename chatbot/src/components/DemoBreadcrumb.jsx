import { ChevronRight } from 'lucide-react';

const STEPS = [
  { label: 'Problem', local: true },
  { label: 'Solution', local: true },
  { label: 'Profe', local: true },
  { label: 'Consent', local: true },
  { label: 'Chatbot', local: true },
  { label: 'Dashboard', port: 5174 },
];

export default function DemoBreadcrumb({ current, onNavigate }) {
  const handleClick = (step) => {
    if (step.label === current) return;
    if (step.local && onNavigate) {
      onNavigate(step.label);
      return;
    }
    if (step.port) {
      const url = `${window.location.protocol}//${window.location.hostname}:${step.port}`;
      window.open(url, '_self');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-1.5 py-3 px-4 bg-[#1A1614] border-t-2 border-ember-primary/30">
      <span className="text-xs font-mono text-ember-primary mr-3 uppercase tracking-widest font-bold">Demo</span>
      {STEPS.map((step, i) => {
        const isActive = step.label === current;
        return (
          <span key={step.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-ember-primary/50" />}
            <button
              onClick={() => handleClick(step)}
              className={`text-[15px] font-mono px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? 'ember-gradient text-ember-text font-bold shadow-md'
                  : 'text-ember-text/70 hover:text-ember-text hover:bg-ember-text/10 font-medium'
              }`}
            >
              {step.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
