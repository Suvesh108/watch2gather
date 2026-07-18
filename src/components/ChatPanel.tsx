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

  return (
    <div className="chat-col flex-1 flex flex-col bg-navy-950/20 h-full min-h-0 w-full select-none">
      
      {/* Premium Header */}
      <div className="chat-header p-4 border-b border-navy-800/80 text-[11px] font-extrabold tracking-[0.15em] uppercase text-white select-none flex items-center gap-2 bg-navy-950/40">
        <MessageSquare className="w-3.5 h-3.5 text-gold" />
        <span>Match Chat Log</span>
      </div>
      
      {/* Chat Messages Log list */}
      <div className="chat-log flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 custom-scrollbar select-text">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="msg system text-center my-1 select-none animate-fade-in">
                <span className="inline-block bg-navy-900/60 border border-navy-850/80 text-dim italic text-[10.5px] py-1.5 px-3.5 rounded-full shadow-sm max-w-[90%] leading-relaxed break-words">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div 
              key={msg.id} 
              className={`flex flex-col gap-0.5 max-w-[85%] animate-fade-in ${
                msg.isMe ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              {/* Sender Name label */}
              <span className="text-[9px] font-bold text-dim uppercase tracking-wider px-1 select-none">
                {msg.isMe ? 'You' : msg.sender}
              </span>
              
              {/* Speech bubble */}
              <div 
                className={`py-2 px-3.5 rounded-2xl text-[13px] leading-relaxed break-words shadow-md ${
                  msg.isMe 
                    ? 'bg-gold text-navy-950 font-medium rounded-tr-none' 
                    : 'bg-navy-800 border border-navy-700/50 text-white rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>

      {/* Input row */}
      <div className="chat-input-row flex gap-2 p-3 border-t border-navy-800/80 bg-navy-950/40 backdrop-blur-md">
        <input
          type="text"
          placeholder="Send message..."
          maxLength={300}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-navy-950 border border-navy-800 rounded-xl py-2 px-3 text-[13px] text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition duration-150 placeholder-dim/30"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="bg-gold text-navy-950 font-extrabold w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gold-bright transition duration-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 shadow-md shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
