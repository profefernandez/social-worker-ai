import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Lightbulb, ArrowRight } from 'lucide-react';

export default function ConsentGate({ onConsent }) {
  const [agreed, setAgreed] = useState(false);
  const containerRef = useRef(null);
  const ctaRef = useRef(null);

  const canSubmit = agreed;

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
  }, []);

  useEffect(() => {
    if (!ctaRef.current || !canSubmit) return;
    gsap.fromTo(ctaRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
  }, [canSubmit]);

  return (
    <div className="h-screen bg-ember-base flex items-center justify-center px-6 py-4 pb-16 overflow-hidden">
      <div ref={containerRef} className="w-full max-w-3xl flex flex-col max-h-full">
        {/* Header */}
        <div className="text-center mb-4 flex-shrink-0">
          <div className="w-14 h-14 rounded-xl ember-gradient mx-auto mb-3 flex items-center justify-center shadow-lg">
            <Lightbulb className="w-7 h-7 text-ember-text" />
          </div>
          <h1 className="font-heading text-2xl text-ember-text mb-1">
            60 Watts of Intelligence
          </h1>
          <p className="text-ember-muted text-sm">
            Parent/Guardian Consent
          </p>
        </div>

        {/* Scrollable consent document */}
        <div className="frost-panel rounded-2xl border border-ember-text/10 mb-4 overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="px-6 py-3 border-b border-ember-text/5 flex-shrink-0">
            <h2 className="text-ember-text font-heading text-base">Consent & Disclosure Agreement</h2>
          </div>
          <div className="px-6 py-4 overflow-y-auto space-y-4 text-ember-muted text-sm leading-relaxed consent-scroll">

            <div>
              <h3 className="text-ember-text font-heading text-sm mb-1">1. What This Service Does</h3>
              <p>
                60 Watts of Intelligence is an AI literacy and safety platform. Your child's AI conversations are routed through our proxy server, where <span className="text-ember-text font-medium">Profe</span> — a social-worker-trained AI — monitors usage, provides real-time educational feedback, and generates weekly reports for parents. After a 7-day assessment period, a licensed social worker (LMSW) reviews the data and meets with your family to deliver a personalized AI use assessment.
              </p>
            </div>

            <div>
              <h3 className="text-ember-text font-heading text-sm mb-1">2. Children's Privacy (COPPA Compliance)</h3>
              <p>
                This service complies with the Children's Online Privacy Protection Act (COPPA). We collect only the minimum data necessary to provide the assessment: chat messages and timestamps. We do not collect biometric data, location data, or persistent identifiers from children. If your child is under 13, this parental consent is required before use.
              </p>
            </div>

            <div>
              <h3 className="text-ember-text font-heading text-sm mb-1">3. Risks of Using AI</h3>
              <p>
                AI can generate inaccurate, misleading, or harmful content. It is not a substitute for professional advice. Children may develop emotional attachments to AI or treat it as a real companion. Without monitoring, AI can reinforce harmful thinking patterns including anxiety, isolation, and unsafe ideation. This is why Profe exists — to catch these patterns and educate your child in real time.
              </p>
            </div>

            <div>
              <h3 className="text-ember-text font-heading text-sm mb-1">4. Profe AI Monitoring</h3>
              <p>
                Profe monitors all AI conversations during the assessment period to provide real-time feedback and AI literacy education. If Profe detects concerning behavior — such as emotional dependency, the AI acting "alive," or unsafe content — it will intervene and educate your child directly. Profe also sends weekly reports to parents with insights and recommendations. <span className="text-ember-text font-medium">You can turn Profe off at any time</span> from the Parent Dashboard.
              </p>
            </div>

            <div>
              <h3 className="text-ember-text font-heading text-sm mb-1">5. Your Data Rights</h3>
              <p>
                All chat data is encrypted using AES-256 at rest and in transit. We do not sell, share, or disclose your data to third parties. Your data is never used to train AI models. Data is retained only for the duration of your assessment period. You have the right to view all collected data through the Parent Dashboard, and you may request complete deletion of all data at any time — no questions asked. To request deletion, contact us or use the dashboard controls.
              </p>
            </div>

            <div>
              <h3 className="text-ember-text font-heading text-sm mb-1">6. Contact</h3>
              <p>
                This service is operated by 60 Watts of Clarity. For questions about privacy, data, or this agreement, contact Jason Fernandez, MA, LMSW at <span className="text-ember-text font-medium">help@60wattsofclarity.com</span>.
              </p>
            </div>

          </div>
        </div>

        {/* Consent */}
        <div className="space-y-3 flex-shrink-0">
          <label className="flex items-start gap-3 cursor-pointer frost-panel rounded-xl px-4 py-3 border border-ember-text/5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-ember-muted accent-ember-primary flex-shrink-0"
            />
            <span className="text-ember-text text-sm leading-relaxed">
              I am the parent or legal guardian. I have read and agree to the terms above, including COPPA disclosure, AI risks, Profe monitoring, and data handling practices.
            </span>
          </label>

          {canSubmit && (
            <button
              ref={ctaRef}
              onClick={onConsent}
              className="w-full ember-gradient rounded-xl px-6 py-3 text-ember-text font-medium text-base flex items-center justify-center gap-2 ember-glow transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              I Consent — Continue to Demo
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-center text-ember-muted text-xs font-mono mt-3">
          Protected by Profe AI &middot; 60 Watts of Clarity &middot; If in immediate danger, call 988 or 911
        </p>
      </div>
    </div>
  );
}
