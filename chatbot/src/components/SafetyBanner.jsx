import { Phone, Mail, ExternalLink } from 'lucide-react';

export default function SafetyBanner({ crisisActive }) {
  return (
    <div
      className={`px-4 py-2 flex items-center justify-center gap-3 text-[13px] font-mono flex-wrap transition-colors duration-500 ${
        crisisActive
          ? 'bg-ember-crisis/20 border-b border-ember-crisis/30 text-ember-crisis'
          : 'bg-ember-surface border-b border-ember-text/10 text-ember-muted'
      }`}
    >
      <a href="tel:911" className="flex items-center gap-1 hover:text-ember-text transition-colors">
        <Phone className="w-2.5 h-2.5" />
        911
      </a>
      <span className="opacity-30">|</span>
      <a href="tel:988" className="flex items-center gap-1 hover:text-ember-text transition-colors">
        <Phone className="w-2.5 h-2.5" />
        988 Crisis Lifeline
      </a>
      <span className="opacity-30">|</span>
      <a href="mailto:help@60wattsofclarity.com" className="flex items-center gap-1 hover:text-ember-text transition-colors">
        <Mail className="w-2.5 h-2.5" />
        help@60wattsofclarity.com
      </a>
      <span className="opacity-30">|</span>
      <span className="flex items-center gap-1">
        <Phone className="w-2.5 h-2.5" />
        XXX-XXX-XXXX
      </span>
      <span className="opacity-30">|</span>
      <a href="#" className="flex items-center gap-1 hover:text-ember-text transition-colors underline">
        <ExternalLink className="w-2.5 h-2.5" />
        Free Resources
      </a>
    </div>
  );
}
