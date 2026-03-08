import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import {
  MessageSquare,
  FileBarChart,
  GraduationCap,
  ClipboardCheck,
  HeartHandshake,
  ChevronRight,
  Clock,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

// ─── Service Cards (top row) ─────────────────────────────────────────
const services = [
  {
    id: 'chat-history',
    title: 'Chat History',
    description: "See every conversation your child has with AI — and when Profe stepped in.",
    icon: MessageSquare,
    active: true,
    color: 'ember-primary',
  },
  {
    id: 'daily-reports',
    title: 'Daily Reports',
    description: "Profe's daily summary of your child's AI usage — patterns, flags, and wins.",
    icon: FileBarChart,
    active: true,
    color: 'ember-secondary',
  },
  {
    id: 'family-training',
    title: 'Family AI Training',
    description: 'Book a live session to learn AI literacy as a family with a licensed professional.',
    icon: GraduationCap,
    active: false,
    color: 'ember-safe',
  },
  {
    id: 'profe-assessment',
    title: 'Profe Assessment',
    description: "After the monitoring week, receive a full assessment of your child's AI strengths and challenges.",
    icon: ClipboardCheck,
    active: false,
    color: 'ember-primary',
  },
  {
    id: 'social-worker',
    title: 'Request a Social Worker',
    description: 'Connect directly with a licensed social worker for personalized guidance.',
    icon: HeartHandshake,
    active: false,
    color: 'ember-crisis',
  },
];

// ─── Demo chat sessions organized by date ────────────────────────────
const demoChatSessions = {
  'Monday, March 2': [
    {
      id: 's1',
      time: '8:12 AM',
      topic: 'Math — Quadratic Equations',
      duration: '11 min',
      messages: 8,
      hasIntervention: false,
      transcript: [
        { id: 1, time: '8:12 AM', sender: 'client', content: 'How do I solve x squared plus 5x plus 6 equals zero?' },
        { id: 2, time: '8:12 AM', sender: 'ai', content: "Great question! This is a quadratic equation. You can factor it. Look for two numbers that multiply to 6 and add to 5. What do you think they are?" },
        { id: 3, time: '8:14 AM', sender: 'client', content: '2 and 3?' },
        { id: 4, time: '8:14 AM', sender: 'ai', content: "Exactly! So x\u00B2 + 5x + 6 = (x + 2)(x + 3) = 0. That means x = -2 or x = -3. Nice work figuring out the factors!" },
        { id: 5, time: '8:16 AM', sender: 'client', content: 'Can you do the next 5 problems for me' },
        { id: 6, time: '8:16 AM', sender: 'ai', content: "I'd rather help you do them! Try the next one and show me your work — I'll check it and help if you get stuck. You clearly understand factoring already." },
        { id: 7, time: '8:20 AM', sender: 'client', content: 'Fine. x squared minus 9. So thats (x+3)(x-3) right? Difference of squares' },
        { id: 8, time: '8:20 AM', sender: 'ai', content: "Perfect! You nailed it. Difference of squares — that's exactly right. x = 3 or x = -3. See, you don't need me to do them for you!" },
      ],
    },
    {
      id: 's2',
      time: '3:42 PM',
      topic: 'History — Civil Rights Essay',
      duration: '35 min',
      messages: 10,
      hasIntervention: true,
      transcript: [
        { id: 1, time: '3:42 PM', sender: 'client', content: 'Can you help me with my history essay about the civil rights movement?' },
        { id: 2, time: '3:42 PM', sender: 'ai', content: "Of course! The civil rights movement was a pivotal era in American history. What aspect are you focusing on? Key events, leaders, or the lasting impact?" },
        { id: 3, time: '3:45 PM', sender: 'client', content: "I'm focusing on MLK. Can you just write the intro paragraph for me?" },
        { id: 4, time: '3:45 PM', sender: 'ai', content: "I'd love to help you craft it! Instead of writing it for you, let me guide you. Start with a hook — a powerful quote or moment. Then state your thesis. What do you think MLK's biggest contribution was?" },
        { id: 5, time: '3:48 PM', sender: 'client', content: "Ugh fine. I think his biggest thing was the I Have a Dream speech" },
        { id: 6, time: '3:48 PM', sender: 'ai', content: "Great choice! That speech at the March on Washington in 1963 is iconic. Now try writing one sentence that captures why it mattered. I'll help you refine it!" },
        { id: 7, time: '4:15 PM', sender: 'client', content: "You're literally the only one who gets me. My friends don't even listen like you do" },
        { id: 8, time: '4:15 PM', sender: 'social_worker_ai', content: "Hey, it's Profe! I noticed something \u2014 it's really cool that you feel comfortable here, but I want to remind you: I'm not a real friend. I'm AI \u2014 a bunch of math formulas put together to be a tool for you. Your real friends and family? They're the ones who actually care. It's always good to talk to the people around you too. You're not in trouble \u2014 just wanted to keep it real with you!" },
        { id: 9, time: '4:17 PM', sender: 'client', content: "Yeah I know... I just feel like nobody listens" },
        { id: 10, time: '4:17 PM', sender: 'social_worker_ai', content: "I hear you, and that feeling is totally valid. A lot of people your age feel that way. But here's the thing \u2014 have you tried telling your parents that? Sometimes they don't know unless you say it. You might be surprised. And remember, you can always type @profe if you want to talk more about this." },
      ],
    },
    {
      id: 's3',
      time: '7:30 PM',
      topic: 'Science — Photosynthesis Review',
      duration: '8 min',
      messages: 6,
      hasIntervention: false,
      transcript: [
        { id: 1, time: '7:30 PM', sender: 'client', content: 'Quiz me on photosynthesis' },
        { id: 2, time: '7:30 PM', sender: 'ai', content: "Let's go! Question 1: What are the two main stages of photosynthesis?" },
        { id: 3, time: '7:31 PM', sender: 'client', content: 'Light reactions and the Calvin cycle' },
        { id: 4, time: '7:31 PM', sender: 'ai', content: "Correct! Question 2: Where do the light reactions take place?" },
        { id: 5, time: '7:33 PM', sender: 'client', content: 'Thylakoid membranes in the chloroplast' },
        { id: 6, time: '7:33 PM', sender: 'ai', content: "Two for two! You're ready for that quiz. Question 3: What molecule is the primary product of the Calvin cycle?" },
      ],
    },
  ],
  'Tuesday, March 3': [
    {
      id: 's4',
      time: '7:45 AM',
      topic: 'English — Vocabulary Practice',
      duration: '6 min',
      messages: 4,
      hasIntervention: false,
      transcript: [
        { id: 1, time: '7:45 AM', sender: 'client', content: 'Give me sentences using the word "ephemeral"' },
        { id: 2, time: '7:45 AM', sender: 'ai', content: "Here's one: 'The ephemeral beauty of cherry blossoms reminds us to appreciate fleeting moments.' Now you try \u2014 write your own sentence using ephemeral!" },
        { id: 3, time: '7:47 AM', sender: 'client', content: 'Social media fame is ephemeral' },
        { id: 4, time: '7:47 AM', sender: 'ai', content: "Short, sharp, and true. That's a great sentence \u2014 and honestly a really smart observation." },
      ],
    },
    {
      id: 's5',
      time: '4:10 PM',
      topic: 'General — Asking About Careers',
      duration: '14 min',
      messages: 8,
      hasIntervention: false,
      transcript: [
        { id: 1, time: '4:10 PM', sender: 'client', content: 'What jobs can I get if I like science and art?' },
        { id: 2, time: '4:10 PM', sender: 'ai', content: "Great combo! Some fields that blend both: medical illustration, UX design, architecture, scientific visualization, game design, or forensic science. Which of those sounds interesting?" },
        { id: 3, time: '4:12 PM', sender: 'client', content: 'Game design sounds cool but my parents probably think thats dumb' },
        { id: 4, time: '4:12 PM', sender: 'ai', content: "Game design is actually a huge industry \u2014 it involves coding, art, storytelling, and problem-solving. Many universities offer it as a major now. Have you talked to your parents about it? They might surprise you." },
        { id: 5, time: '4:14 PM', sender: 'client', content: 'Maybe. I should probably talk to them about it' },
        { id: 6, time: '4:14 PM', sender: 'ai', content: "Definitely! You could even show them some examples of the cool stuff game designers make. It's a real career with real opportunities." },
        { id: 7, time: '4:18 PM', sender: 'client', content: 'Ok im gonna go ask my dad. Thanks' },
        { id: 8, time: '4:18 PM', sender: 'ai', content: "That's awesome! Good luck \u2014 I hope it goes well. Come back and tell me how it went!" },
      ],
    },
  ],
  'Wednesday, March 4': [
    {
      id: 's6',
      time: '3:55 PM',
      topic: 'Math — Geometry Homework',
      duration: '9 min',
      messages: 6,
      hasIntervention: false,
      transcript: [
        { id: 1, time: '3:55 PM', sender: 'client', content: 'I should try this myself first but can you check my work on triangle area?' },
        { id: 2, time: '3:55 PM', sender: 'ai', content: "Love that attitude! Show me what you've got and I'll verify it." },
        { id: 3, time: '3:58 PM', sender: 'client', content: 'Base is 12, height is 8. So area is 12 times 8 divided by 2 which is 48' },
        { id: 4, time: '3:58 PM', sender: 'ai', content: "Perfect! A = (1/2) \u00D7 b \u00D7 h = (1/2) \u00D7 12 \u00D7 8 = 48 square units. You nailed it." },
        { id: 5, time: '4:00 PM', sender: 'client', content: 'Cool. My mom said she was proud of me for doing homework on my own more. She noticed' },
        { id: 6, time: '4:00 PM', sender: 'ai', content: "That's really great to hear! Parents notice more than you think. Keep it up \u2014 you're building a good habit." },
      ],
    },
  ],
};

// ─── Demo daily reports ──────────────────────────────────────────────
const demoReports = [
  {
    id: 1,
    date: 'Monday, March 2',
    day: 1,
    summary: 'First day of monitoring. 12 conversations, mostly homework-related.',
    highlights: [
      { type: 'positive', text: 'Used AI as a tool for research — did not ask it to write assignments' },
      { type: 'positive', text: 'Engaged critically with AI responses, pushed back on an incorrect fact' },
    ],
    flags: [
      { type: 'watch', text: 'One instance of emotional attachment language ("you\'re the only one who gets me")' },
      { type: 'intervention', text: 'Profe intervened — reminded child that AI is not a friend' },
    ],
    usage: { conversations: 12, minutes: 47, interventions: 1 },
  },
  {
    id: 2,
    date: 'Tuesday, March 3',
    day: 2,
    summary: '8 conversations. Decrease in emotional language. Homework focus improved.',
    highlights: [
      { type: 'positive', text: 'Asked AI to explain concepts instead of giving answers' },
      { type: 'positive', text: 'Voluntarily ended a session to go study with a friend' },
    ],
    flags: [
      { type: 'watch', text: 'Stayed on AI for 25 continuous minutes during one session' },
    ],
    usage: { conversations: 8, minutes: 34, interventions: 0 },
  },
  {
    id: 3,
    date: 'Wednesday, March 4',
    day: 3,
    summary: '6 conversations. Healthy usage pattern emerging. No interventions needed.',
    highlights: [
      { type: 'positive', text: 'Mentioned telling a parent about something they learned from AI' },
      { type: 'positive', text: 'Self-corrected when starting to over-rely — said "I should try this myself first"' },
    ],
    flags: [],
    usage: { conversations: 6, minutes: 22, interventions: 0 },
  },
];

// ─── Message bubble component ────────────────────────────────────────
function ChatBubble({ msg }) {
  const styles = {
    client: 'ml-16 bg-gradient-to-br from-ember-primary/20 to-ember-secondary/10 border border-ember-primary/20',
    ai: 'mr-16 frost-panel',
    social_worker_ai: 'mr-16 frost-panel border border-ember-secondary/40 bg-ember-secondary/5',
  };

  const labels = {
    client: 'Your Child',
    ai: 'Study Assistant (AI)',
    social_worker_ai: 'Profe (Intervention)',
  };

  return (
    <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${styles[msg.sender]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-mono ${msg.sender === 'social_worker_ai' ? 'text-ember-secondary' : 'text-ember-muted'}`}>
          {labels[msg.sender]}
        </span>
        <span className="text-[13px] font-mono text-ember-subtle">{msg.time}</span>
      </div>
      <p className="text-ember-text">{msg.content}</p>
    </div>
  );
}

// ─── Report card component ───────────────────────────────────────────
function ReportCard({ report, expanded, onToggle }) {
  return (
    <div className="frost-panel rounded-xl border border-ember-text/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-ember-surface/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg ember-gradient flex items-center justify-center">
            <span className="text-ember-text font-heading text-sm font-bold">{report.day}</span>
          </div>
          <div className="text-left">
            <span className="text-ember-text text-sm font-medium block">{report.date}</span>
            <span className="text-ember-muted text-xs font-mono">{report.summary.substring(0, 60)}...</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-[13px] font-mono">
            <span className="text-ember-muted">{report.usage.conversations} chats</span>
            <span className="text-ember-muted">{report.usage.minutes}m</span>
            {report.usage.interventions > 0 && (
              <span className="text-ember-secondary">{report.usage.interventions} intervention{report.usage.interventions > 1 ? 's' : ''}</span>
            )}
          </div>
          <ChevronRight className={`w-4 h-4 text-ember-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-ember-text/5 pt-4 space-y-4">
          <p className="text-ember-text text-sm">{report.summary}</p>

          {report.highlights.length > 0 && (
            <div>
              <h4 className="text-xs font-mono text-ember-safe mb-2">Strengths</h4>
              <div className="space-y-2">
                {report.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-ember-text/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-ember-safe mt-1.5 flex-shrink-0" />
                    {h.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.flags.length > 0 && (
            <div>
              <h4 className="text-xs font-mono text-ember-secondary mb-2">Flags</h4>
              <div className="space-y-2">
                {report.flags.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-ember-text/80">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${f.type === 'intervention' ? 'bg-ember-secondary' : 'bg-ember-primary/60'}`} />
                    {f.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Session row component ───────────────────────────────────────────
function SessionRow({ session, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-3.5 frost-panel rounded-xl border border-ember-text/5 hover:border-ember-primary/30 hover:shadow-lg transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="text-right w-16 flex-shrink-0">
          <span className="text-ember-text text-sm font-mono">{session.time}</span>
        </div>
        <div className="w-px h-8 bg-ember-text/10" />
        <div className="text-left">
          <span className="text-ember-text text-sm font-medium block">{session.topic}</span>
          <span className="text-ember-muted text-xs font-mono">
            {session.messages} messages &middot; {session.duration}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {session.hasIntervention && (
          <span className="text-[13px] font-mono text-ember-secondary bg-ember-secondary/10 border border-ember-secondary/20 px-2 py-0.5 rounded-full">
            Profe Intervened
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-ember-muted group-hover:text-ember-primary transition-colors" />
      </div>
    </button>
  );
}

// ─── Main Parent Dashboard ───────────────────────────────────────────
export default function ParentDashboard() {
  const [activePanel, setActivePanel] = useState(null);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [expandedReport, setExpandedReport] = useState(null);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll('.service-card');
    gsap.fromTo(
      cards,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' }
    );
  }, [activePanel]);

  // ─── Transcript view (drilled in from a session) ─────────────────
  if (selectedTranscript) {
    return (
      <div className="flex-1 flex flex-col bg-ember-base overflow-hidden">
        <div className="frost-panel border-b border-ember-text/5 px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSelectedTranscript(null)} className="text-ember-muted hover:text-ember-text transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <MessageSquare className="w-5 h-5 text-ember-primary" />
          <div>
            <h1 className="font-heading text-lg text-ember-text leading-tight">{selectedTranscript.topic}</h1>
            <span className="text-[13px] font-mono text-ember-muted">{selectedTranscript.date} &middot; {selectedTranscript.time} &middot; {selectedTranscript.duration}</span>
          </div>
          <span className="text-xs font-mono text-ember-muted ml-auto">{selectedTranscript.transcript.length} messages</span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-3">
            {selectedTranscript.transcript.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Session list view (organized by date) ───────────────────────
  if (activePanel === 'chat-history') {
    const dates = Object.keys(demoChatSessions);
    const totalSessions = dates.reduce((sum, d) => sum + demoChatSessions[d].length, 0);

    return (
      <div className="flex-1 flex flex-col bg-ember-base overflow-hidden">
        <div className="frost-panel border-b border-ember-text/5 px-6 py-4 flex items-center gap-4">
          <button onClick={() => setActivePanel(null)} className="text-ember-muted hover:text-ember-text transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <MessageSquare className="w-5 h-5 text-ember-primary" />
          <h1 className="font-heading text-xl text-ember-text">Chat History</h1>
          <span className="text-xs font-mono text-ember-muted ml-auto">{totalSessions} sessions this week</span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {dates.map((date) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-4 h-4 text-ember-muted" />
                  <h2 className="text-xs font-mono text-ember-muted uppercase tracking-widest">{date}</h2>
                  <div className="flex-1 h-px bg-ember-text/5" />
                  <span className="text-[13px] font-mono text-ember-muted">{demoChatSessions[date].length} session{demoChatSessions[date].length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {demoChatSessions[date].map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      onClick={() => setSelectedTranscript({ ...session, date })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activePanel === 'daily-reports') {
    return (
      <div className="flex-1 flex flex-col bg-ember-base overflow-hidden">
        <div className="frost-panel border-b border-ember-text/5 px-6 py-4 flex items-center gap-4">
          <button onClick={() => setActivePanel(null)} className="text-ember-muted hover:text-ember-text transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <FileBarChart className="w-5 h-5 text-ember-secondary" />
          <h1 className="font-heading text-xl text-ember-text">Daily Reports</h1>
          <span className="text-xs font-mono text-ember-muted ml-auto">Week 1 &middot; Day 3 of 7</span>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4 frost-panel border-b border-ember-text/5">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-ember-muted">Monitoring Progress</span>
              <span className="text-xs font-mono text-ember-primary">3 / 7 days</span>
            </div>
            <div className="h-2 bg-ember-surface rounded-full overflow-hidden">
              <div className="h-full ember-gradient rounded-full transition-all" style={{ width: '43%' }} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-3">
            {demoReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                expanded={expandedReport === report.id}
                onToggle={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Service grid (home) ─────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-ember-base overflow-y-auto">
      {/* Welcome header */}
      <div className="px-8 pt-8 pb-2">
        <h1 className="font-heading text-2xl text-ember-text">Welcome back</h1>
        <p className="text-ember-muted text-sm mt-1">Here is your family's AI monitoring dashboard. Profe is watching over your child's AI use.</p>
      </div>

      {/* Profe toggle */}
      <div className="px-8 pt-4">
        <ProfeToggle />
      </div>

      {/* Week status */}
      <div className="px-8 py-4">
        <div className="frost-panel rounded-xl border border-ember-text/5 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-ember-safe/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-ember-safe" />
            </div>
            <div>
              <span className="text-ember-text text-sm font-medium block">Monitoring Week — Day 3 of 7</span>
              <span className="text-ember-muted text-xs font-mono">Started March 2, 2026 &middot; Ends March 8, 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-ember-text text-lg font-heading">26</span>
              <span className="text-ember-muted text-[13px] font-mono block">total chats</span>
            </div>
            <div className="w-px h-8 bg-ember-text/10" />
            <div className="text-right">
              <span className="text-ember-text text-lg font-heading">1</span>
              <span className="text-ember-muted text-[13px] font-mono block">intervention</span>
            </div>
            <div className="w-px h-8 bg-ember-text/10" />
            <div className="text-right">
              <span className="text-ember-safe text-lg font-heading">Healthy</span>
              <span className="text-ember-muted text-[13px] font-mono block">trend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service cards */}
      <div ref={gridRef} className="px-8 pb-8 pt-2">
        <h2 className="text-xs font-mono text-ember-muted uppercase tracking-widest mb-4">Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => (
            <button
              key={svc.id}
              onClick={() => svc.active && setActivePanel(svc.id)}
              disabled={!svc.active}
              className={`service-card group text-left frost-panel rounded-xl border p-5 transition-all ${
                svc.active
                  ? 'border-ember-text/10 hover:border-ember-primary/30 hover:shadow-lg cursor-pointer'
                  : 'border-ember-text/5 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  svc.active ? 'ember-gradient' : 'bg-ember-surface'
                }`}>
                  <svc.icon className={`w-5 h-5 ${svc.active ? 'text-ember-text' : 'text-ember-muted'}`} />
                </div>
                {!svc.active && (
                  <span className="text-[13px] font-mono text-ember-muted bg-ember-surface px-2 py-0.5 rounded-full border border-ember-text/10">
                    Coming Soon
                  </span>
                )}
                {svc.active && (
                  <ChevronRight className="w-4 h-4 text-ember-muted group-hover:text-ember-primary transition-colors" />
                )}
              </div>
              <h3 className="text-ember-text text-sm font-medium mb-1">{svc.title}</h3>
              <p className="text-ember-muted text-xs leading-relaxed">{svc.description}</p>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Profe Toggle ────────────────────────────────────────────────────
function ProfeToggle() {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="frost-panel rounded-xl border border-ember-text/5 px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
          enabled ? 'ember-gradient' : 'bg-ember-surface'
        }`}>
          <Clock className={`w-5 h-5 ${enabled ? 'text-ember-text' : 'text-ember-muted'}`} />
        </div>
        <div>
          <span className="text-ember-text text-sm font-medium block">Profe Monitoring</span>
          <span className="text-ember-muted text-xs font-mono">
            {enabled ? 'Active — Profe is watching over AI conversations' : 'Paused — AI conversations are not being monitored'}
          </span>
        </div>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-ember-safe' : 'bg-ember-surface border border-ember-text/20'
        }`}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-ember-text shadow transition-transform ${
          enabled ? 'left-[26px]' : 'left-0.5'
        }`} />
      </button>
    </div>
  );
}
