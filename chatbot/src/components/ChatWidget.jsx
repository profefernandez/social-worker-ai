import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatWindow from './ChatWindow';

export default function ChatWidget({ sessionId }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 h-[480px] shadow-[0_0_25px_rgba(254,225,4,0.15)]">
          <ChatWindow sessionId={sessionId} />
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-[#fee104] hover:bg-[#d6be00] text-black rounded-full w-14 h-14 flex items-center justify-center shadow-[0_0_15px_rgba(254,225,4,0.3)] transition-all"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
