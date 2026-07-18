import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../hooks/usePeerConnection';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chat-col w-full md:w-[320px] shrink-0 flex flex-col bg-navy-900 border-t md:border-t-0 md:border-l border-navy-700 h-[220px] md:h-auto min-h-0">
      <div className="chat-header p-3.5 px-4 border-b border-navy-700 text-[12px] font-bold tracking-widest uppercase text-dim select-none">
        Match Chat
      </div>
      
      <div className="chat-log flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 min-h-0">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="msg system text-dim italic text-[12.5px] leading-relaxed">
                {msg.text}
              </div>
            );
          }

          return (
            <div key={msg.id} className="msg text-[13.5px] leading-relaxed break-words">
              <span className={`who font-bold mr-1.5 select-none ${msg.isMe ? 'text-pitch-bright' : 'text-gold'}`}>
                {msg.sender}:
              </span>
              <span className="text-white">{msg.text}</span>
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>

      <div className="chat-input-row flex gap-2 p-3 border-t border-navy-700 bg-navy-900/50">
        <input
          type="text"
          placeholder="Say something…"
          maxLength={300}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-navy-950 border border-navy-700 rounded-lg py-2 px-3 text-[13.5px] text-white outline-none focus:border-gold transition-colors duration-150"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="bg-gold text-navy-950 font-bold px-4 py-2 rounded-lg text-sm hover:bg-gold-bright transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
};
