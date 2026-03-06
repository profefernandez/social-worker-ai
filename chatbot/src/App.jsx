import ChatWidget from './components/ChatWidget';

// The sessionId should be injected via the embed script's data attribute
// or retrieved from the server on page load. For dev, use a placeholder.
const SESSION_ID = window.__CHATBOT_SESSION_ID__ || 'demo-session';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0f1115]">
      <ChatWidget sessionId={SESSION_ID} />
    </div>
  );
}
