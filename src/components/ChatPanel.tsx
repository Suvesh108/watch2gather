import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
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

  const getFormattedTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="chat-col flex-1 flex flex-col bg-navy-950 h-full min-h-0 w-full select-none border-navy-800">
      
      {/* Google Meet Style Header in Navy */}
      <div className="chat-header p-4 border-b border-navy-800 text-xs font-bold tracking-wider uppercase text-white select-none flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gold" />
        <span>In-call messages</span>
      </div>
      
      {/* Messages List Log */}
      <div className="chat-log flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0 custom-scrollbar select-text">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="msg system text-center my-0.5 select-none animate-fade-in">
                <span className="inline-block text-dim text-[10.5px] italic leading-relaxed break-all">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex flex-col gap-1 animate-fade-in">
              {/* Name and time header in Navy/Gold */}
              <div className="flex items-baseline gap-2 select-none">
                <span className={`text-xs font-bold ${msg.isMe ? 'text-pitch-bright' : 'text-gold'}`}>
                  {msg.isMe ? 'You' : msg.sender}
                </span>
                <span className="text-[9px] text-dim">
                  {getFormattedTime(msg.timestamp)}
                </span>
              </div>
              
              {/* Message text */}
              <div className="text-[13px] text-white leading-relaxed break-words pl-0.5">
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>

      {/* Input Row in Navy/Gold */}
      <div className="chat-input-row flex gap-2 p-3 border-t border-navy-800 bg-navy-950/40">
        <input
          type="text"
          placeholder="Send a message to everyone"
          maxLength={300}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-navy-950 border border-navy-800 rounded-full py-2 px-4 text-sm text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition duration-150 placeholder-dim/50"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="bg-transparent text-gold hover:text-gold-bright hover:bg-navy-900 w-9 h-9 flex items-center justify-center rounded-full transition duration-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer active:scale-95 shrink-0"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
