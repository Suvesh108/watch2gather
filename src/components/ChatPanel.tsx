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

  // Format message time
  const getFormattedTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="chat-col flex-1 flex flex-col bg-[#202124] h-full min-h-0 w-full select-none border-[#3c4043]">
      
      {/* Google Meet Style Header */}
      <div className="chat-header p-4 border-b border-[#3c4043] text-xs font-bold tracking-wider uppercase text-white select-none flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-[#8ab4f8]" />
        <span>In-call messages</span>
      </div>
      
      {/* Messages List Log */}
      <div className="chat-log flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0 custom-scrollbar select-text">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="msg system text-center my-0.5 select-none animate-fade-in">
                <span className="inline-block text-[#9aa0a6] text-[10.5px] italic leading-relaxed break-all">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex flex-col gap-1 animate-fade-in">
              {/* Name and time header (Google Meet style) */}
              <div className="flex items-baseline gap-2 select-none">
                <span className="text-xs font-semibold text-white">
                  {msg.isMe ? 'You' : msg.sender}
                </span>
                <span className="text-[9px] text-[#9aa0a6]">
                  {getFormattedTime(msg.timestamp)}
                </span>
              </div>
              
              {/* Message text */}
              <div className="text-[13px] text-[#e8eaed] leading-relaxed break-words pl-0.5">
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>

      {/* Input Row */}
      <div className="chat-input-row flex gap-2 p-3 border-t border-[#3c4043] bg-[#202124]/40">
        <input
          type="text"
          placeholder="Send a message to everyone"
          maxLength={300}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-[#202124] border border-[#5f6368]/60 rounded-full py-2 px-4 text-sm text-white outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8]/20 transition duration-150 placeholder-[#9aa0a6]/50"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="bg-transparent text-[#8ab4f8] hover:text-[#aecbfa] hover:bg-[#3c4043] w-9 h-9 flex items-center justify-center rounded-full transition duration-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer active:scale-95 shrink-0"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
