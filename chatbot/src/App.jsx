import { useState } from 'react';
import DemoIntro from './components/DemoIntro';
import ConsentGate from './components/ConsentGate';
import ChatWindow from './components/ChatWindow';
import DemoBreadcrumb from './components/DemoBreadcrumb';

const SESSION_ID = window.__CHATBOT_SESSION_ID__ || 'demo-session';

const NAV_TO_STAGE = {
  Problem: 'problem',
  Solution: 'solution',
  Profe: 'profe',
  Consent: 'consent',
  Chatbot: 'chat',
};

const STAGE_TO_NAV = {
  problem: 'Problem',
  solution: 'Solution',
  profe: 'Profe',
  consent: 'Consent',
  chat: 'Chatbot',
};

export default function App() {
  const [stage, setStage] = useState('problem');
  const [parentEmail, setParentEmail] = useState(null);

  const handleNavigate = (label) => {
    const s = NAV_TO_STAGE[label];
    if (s) setStage(s);
  };

  return (
    <>
      {stage === 'problem' && (
        <DemoIntro slide={0} onNext={() => setStage('solution')} />
      )}
      {stage === 'solution' && (
        <DemoIntro slide={1} onNext={() => setStage('profe')} />
      )}
      {stage === 'profe' && (
        <DemoIntro slide={2} onNext={() => setStage('consent')} />
      )}
      {stage === 'consent' && (
        <ConsentGate onConsent={({ email }) => { setParentEmail(email); setStage('chat'); }} />
      )}
      {stage === 'chat' && (
        <ChatWindow sessionId={SESSION_ID} parentEmail={parentEmail} />
      )}
      <DemoBreadcrumb current={STAGE_TO_NAV[stage]} onNavigate={handleNavigate} />
    </>
  );
}
