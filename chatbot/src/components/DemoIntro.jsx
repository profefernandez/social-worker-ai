import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import {
  Lightbulb, ShieldAlert, GraduationCap, Users, Brain, ArrowRight,
  AlertTriangle, MessageCircle, Heart, BookOpen, ClipboardCheck, UserCheck,
} from 'lucide-react';

/* ─── Slide 0: The Problem ─── */
function ProblemSlide({ onNext }) {
  const ref = useRef(null);
  const statsRef = useRef([]);

  useEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    tl.fromTo('.problem-headline', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 0.2);
    tl.fromTo('.problem-sub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.5);
    tl.fromTo(
      statsRef.current.filter(Boolean),
      { opacity: 0, y: 20, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.15 },
      0.7
    );
    tl.fromTo('.problem-cta', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 1.3);
  }, []);

  return (
    <div ref={ref} className="h-screen bg-ember-base flex flex-col items-center justify-center px-8 lg:px-16 pb-16 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-ember-crisis/5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl w-full text-center relative z-10">
        <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-ember-crisis/10 border border-ember-crisis/20 mx-auto mb-6 flex items-center justify-center">
          <ShieldAlert className="w-9 h-9 text-ember-crisis" />
        </div>

        <h1 className="problem-headline font-heading text-4xl md:text-5xl text-ember-text leading-tight mb-4">
          AI was given to us<br />
          <span className="text-ember-crisis">without instructions.</span>
        </h1>

        <p className="problem-sub text-ember-muted text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-8">
          Sewell Setzer III, 14, died after ChatGPT reinforced his suicidal ideation.
          Technology was given to families without instructions — and we're expected to just
          <span className="text-ember-text font-medium"> figure it out.</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[
            {
              icon: AlertTriangle,
              stat: 'Zero Instructions',
              desc: 'AI was handed to families with no safety training, no manual, no guidance',
              color: 'text-ember-crisis',
              bg: 'bg-ember-crisis/10 border-ember-crisis/20',
            },
            {
              icon: Users,
              stat: 'Widening Gap',
              desc: 'Parents can\'t teach what they don\'t understand — the AI literacy gap grows daily',
              color: 'text-ember-primary',
              bg: 'bg-ember-primary/10 border-ember-primary/20',
            },
            {
              icon: Brain,
              stat: 'Blind Spots',
              desc: 'Kids use AI every day — parents have no idea what\'s happening or how to check',
              color: 'text-ember-secondary',
              bg: 'bg-ember-secondary/10 border-ember-secondary/20',
            },
          ].map((item, i) => (
            <div
              key={i}
              ref={(el) => (statsRef.current[i] = el)}
              className={`frost-panel rounded-2xl px-5 py-5 border ${item.bg} text-left`}
            >
              <div className="w-10 h-10 rounded-lg bg-ember-text/5 flex items-center justify-center mb-3">
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className={`text-xl font-heading ${item.color} mb-1`}>{item.stat}</div>
              <p className="text-ember-muted text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onNext}
          className="problem-cta ember-gradient rounded-xl px-8 py-4 text-ember-text font-medium text-lg flex items-center gap-3 mx-auto ember-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          See the Solution
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Slide 1: How It Works ─── */
function HowItWorksSlide({ onNext }) {
  const ref = useRef(null);
  const stepsRef = useRef([]);

  useEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    tl.fromTo('.solution-headline', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 0.2);
    tl.fromTo('.solution-sub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.5);
    tl.fromTo(
      stepsRef.current.filter(Boolean),
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.1 },
      0.7
    );
    tl.fromTo('.solution-cta', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 1.2);
  }, []);

  const roadmap = [
    {
      step: '1',
      title: 'Route API to Proxy',
      desc: 'Family connects their AI through our proxy server — Profe starts watching.',
      icon: Brain,
    },
    {
      step: '2',
      title: '7-Day Assessment',
      desc: 'Profe monitors every chat, provides real-time feedback, and sends weekly reports.',
      icon: ShieldAlert,
    },
    {
      step: '3',
      title: 'LMSW Review',
      desc: 'Jason Fernandez, MA, LMSW delivers a personalized family AI assessment.',
      icon: GraduationCap,
    },
  ];

  return (
    <div ref={ref} className="h-screen bg-ember-base flex flex-col items-center justify-center px-8 lg:px-16 pb-16 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-ember-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl w-full relative z-10">
        <div className="text-center mb-10">
          <div className="w-[72px] h-[72px] rounded-2xl ember-gradient mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Lightbulb className="w-9 h-9 text-ember-text" />
          </div>
          <p className="solution-headline">
            <span className="font-heading text-xl text-ember-muted block mb-1">
              60 watts is all you need for a new idea.
            </span>
            <span className="font-heading text-4xl md:text-5xl text-ember-text">
              Introducing{' '}
              <span className="text-ember-primary">60 Watts of Intelligence</span>
            </span>
          </p>
          <p className="solution-sub text-ember-muted text-lg mt-3 max-w-2xl mx-auto leading-relaxed">
            A one-week AI assessment for families. Profe monitors your child's AI use,
            provides real-time feedback, and a licensed social worker delivers a full assessment.
          </p>
        </div>

        <h2 className="text-ember-text font-heading text-xl mb-5 text-center">How It Works</h2>
        <div className="flex items-stretch gap-0 mb-10">
          {roadmap.map((item, i) => (
            <div key={i} className="flex items-stretch flex-1">
              <div
                ref={(el) => (stepsRef.current[i] = el)}
                className="frost-panel rounded-2xl px-5 py-5 border border-ember-text/5 flex-1 text-center flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-xl ember-gradient flex items-center justify-center mb-3 shadow-md">
                  <item.icon className="w-7 h-7 text-ember-text" />
                </div>
                <span className="text-ember-primary font-mono text-xs uppercase tracking-wider mb-1">Step {item.step}</span>
                <h3 className="text-ember-text font-heading text-lg mb-1">{item.title}</h3>
                <p className="text-ember-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
              {i < roadmap.length - 1 && (
                <div className="flex items-center px-2">
                  <ArrowRight className="w-7 h-7 text-ember-primary" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={onNext}
            className="solution-cta ember-gradient rounded-xl px-8 py-4 text-ember-text font-medium text-lg flex items-center gap-3 mx-auto ember-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Meet Profe
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 2: What Profe Does ─── */
function ProfeSlide({ onNext }) {
  const ref = useRef(null);
  const featuresRef = useRef([]);

  useEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    tl.fromTo('.profe-headline', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 0.2);
    tl.fromTo('.profe-sub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.5);
    tl.fromTo(
      featuresRef.current.filter(Boolean),
      { opacity: 0, y: 20, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.1 },
      0.7
    );
    tl.fromTo('.profe-demo', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 1.4);
    tl.fromTo('.profe-cta', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 1.6);
  }, []);

  const features = [
    {
      icon: Heart,
      title: 'Emotional Guardrails',
      desc: 'If a child leans on AI for emotional support, Profe reminds them the AI isn\'t real and suggests talking to a parent.',
    },
    {
      icon: Brain,
      title: 'AI Behavior Detection',
      desc: 'If the LLM starts acting "alive" — forming attachments, role-playing relationships — Profe educates the child in real time.',
    },
    {
      icon: MessageCircle,
      title: '@profe — AI Literacy on Demand',
      desc: 'Kids and parents type @profe anytime for AI literacy lessons, tips, and guided learning.',
    },
    {
      icon: UserCheck,
      title: '@profe talk to social worker',
      desc: 'Connects directly to Jason Fernandez, MA, LMSW — a real licensed professional, not another bot.',
    },
    {
      icon: ClipboardCheck,
      title: 'Weekly Reports + Parent Dashboard',
      desc: 'Parents receive weekly reports with new AI skills to learn and ways to teach responsible AI at home.',
    },
    {
      icon: BookOpen,
      title: 'Family AI Literacy Training',
      desc: 'Jason reviews every report and can recommend full family AI literacy training based on what he sees.',
    },
  ];

  return (
    <div ref={ref} className="h-screen bg-ember-base flex flex-col items-center justify-center px-8 lg:px-16 pb-16 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-ember-secondary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl w-full relative z-10">
        <div className="text-center mb-8">
          <div className="w-[72px] h-[72px] rounded-2xl bg-ember-primary/10 border border-ember-primary/20 mx-auto mb-4 flex items-center justify-center">
            <GraduationCap className="w-9 h-9 text-ember-primary" />
          </div>
          <h1 className="profe-headline font-heading text-4xl md:text-5xl text-ember-text leading-tight mb-3">
            What <span className="text-ember-primary">Profe</span> Does
          </h1>
          <p className="profe-sub text-ember-muted text-lg max-w-2xl mx-auto leading-relaxed">
            A social-worker-trained AI that monitors, educates, and protects your family's AI experience in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {features.map((feat, i) => (
            <div
              key={i}
              ref={(el) => (featuresRef.current[i] = el)}
              className="frost-panel rounded-2xl px-5 py-4 border border-ember-text/5"
            >
              <div className="w-10 h-10 rounded-lg bg-ember-primary/10 flex items-center justify-center mb-3">
                <feat.icon className="w-5 h-5 text-ember-primary" />
              </div>
              <h3 className="text-ember-text font-heading text-base mb-1">{feat.title}</h3>
              <p className="text-ember-muted text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        <div className="profe-demo frost-panel rounded-2xl px-5 py-3 border border-ember-primary/15 mb-6">
          <p className="text-ember-muted text-sm font-mono text-center">
            <span className="text-ember-primary font-medium">Demo:</span>{' '}
            Consent → Chat with AI → Profe intercepts → Parent Dashboard with weekly reports
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={onNext}
            className="profe-cta ember-gradient rounded-xl px-8 py-4 text-ember-text font-medium text-lg flex items-center gap-3 mx-auto ember-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Try the Demo
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main DemoIntro Controller ─── */
export default function DemoIntro({ slide, onNext }) {
  if (slide === 0) return <ProblemSlide onNext={onNext} />;
  if (slide === 1) return <HowItWorksSlide onNext={onNext} />;
  if (slide === 2) return <ProfeSlide onNext={onNext} />;
  return null;
}
