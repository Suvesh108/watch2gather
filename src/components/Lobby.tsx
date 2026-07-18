import React, { useState, useEffect } from 'react';
import { Play, Copy, Check, ShieldAlert, Wifi, Info } from 'lucide-react';

interface LobbyProps {
  createRoom: (username: string) => Promise<void>;
  joinRoom: (username: string, code: string) => Promise<void>;
  connectionStatus: 'idle' | 'setting-up' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'error';
  roomCode: string;
  errorMsg: string;
}

export const Lobby: React.FC<LobbyProps> = ({
  createRoom,
  joinRoom,
  connectionStatus,
  roomCode,
  errorMsg,
}) => {
  const [username, setUsername] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setActiveTab('join');
      setCodeInput(roomParam.toUpperCase());
    }
  }, []);

  const handleCreate = async () => {
    if (!username.trim()) {
      setValidationError('Please enter your name first.');
      const input = document.getElementById('nameInput');
      if (input) input.focus();
      return;
    }
    setValidationError('');
    await createRoom(username);
  };

  const handleJoin = async () => {
    if (!username.trim()) {
      setValidationError('Please enter your name first.');
      const input = document.getElementById('nameInputJoin');
      if (input) input.focus();
      return;
    }
    if (!codeInput) {
      setValidationError('Please enter a room code.');
      const input = document.getElementById('codeInput');
      if (input) input.focus();
      return;
    }
    setValidationError('');
    await joinRoom(username, codeInput);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSettingUp = connectionStatus === 'setting-up';
  const isConnecting = connectionStatus === 'connecting';
  const isWaiting = connectionStatus === 'waiting';
  const isLoading = isSettingUp || isConnecting || isWaiting;

  const getStatusMsg = () => {
    if (validationError) return { text: validationError, type: 'error' };
    if (errorMsg) return { text: errorMsg, type: 'error' };
    if (isSettingUp) return { text: 'Creating secure room...', type: 'info' };
    if (isConnecting) return { text: 'Connecting to host...', type: 'info' };
    if (isWaiting) return { text: 'Waiting for your friend to connect...', type: 'success' };
    return null;
  };

  const status = getStatusMsg();

  return (
    <div id="lobby" className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 min-h-screen">
      <div className="glass-card w-full max-w-[420px] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-navy-700/50 relative overflow-hidden animate-scale-in">
        
        {/* Glow decorative bubble */}
        <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gold/10 blur-2xl pointer-events-none" />
        
        {/* Logo Shield Header */}
        <div className="flex flex-col items-center text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 border border-navy-700 flex items-center justify-center shadow-lg relative mb-4">
            {/* Overlapping minimalist screen brand logo */}
            <div className="w-10 h-7 rounded bg-navy-900 border border-dim/20 absolute -top-1 -left-1 opacity-40 rotate-[-8deg]" />
            <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-navy-800 to-navy-900 border border-gold/40 flex items-center justify-center relative shadow-md">
              <Play className="w-4 h-4 text-gold fill-gold ml-0.5" />
              {/* Overlay Share indicator arrow */}
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-navy-950 shadow-sm">
                <svg className="w-2.5 h-2.5 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l4.828-2.414m0 0a3 3 0 10-4.828-2.414m4.828 2.414a3 3 0 11-4.828 2.414m6 10.742l4.828-2.414m0 0a3 3 0 10-4.828-2.414m4.828 2.414a3 3 0 11-4.828 2.414" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="eyebrow text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase flex items-center gap-1.5 justify-center mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-pitch-bright shadow-[0_0_8px_var(--pitch-bright)] animate-pulse" />
            Watch party lobby
          </div>
          
          <h1 className="font-teko text-[44px] leading-none font-bold text-white tracking-[0.02em] uppercase">
            watch<span className="text-gold">2</span>gather
          </h1>
          
          <p className="text-dim text-xs mt-2 max-w-[320px] leading-relaxed">
            Private peer-to-peer watch parties. Direct browser connection with high quality video and zero lag.
          </p>
        </div>

        {/* Tab Selectors */}
        <div className="tabs flex bg-navy-950 p-1 rounded-xl border border-navy-800 select-none mt-6">
          <button
            onClick={() => setActiveTab('create')}
            disabled={isLoading}
            className={`flex-1 text-center py-2 rounded-lg cursor-pointer text-xs font-bold transition-all duration-150 ${
              activeTab === 'create'
                ? 'bg-navy-800 text-gold shadow-md'
                : 'text-dim hover:text-white'
            }`}
          >
            Host Party
          </button>
          <button
            onClick={() => setActiveTab('join')}
            disabled={isLoading}
            className={`flex-1 text-center py-2 rounded-lg cursor-pointer text-xs font-bold transition-all duration-150 ${
              activeTab === 'join'
                ? 'bg-navy-800 text-gold shadow-md'
                : 'text-dim hover:text-white'
            }`}
          >
            Join Party
          </button>
        </div>

        {/* Action Panels */}
        <div className="mt-4">
          {activeTab === 'create' ? (
            <div className="tab-panel animate-fade-in flex flex-col gap-4">
              <div className="field">
                <label htmlFor="nameInput" className="block text-[10px] font-bold tracking-wider uppercase text-dim mb-1.5 select-none">
                  Your Username
                </label>
                <input
                  type="text"
                  id="nameInput"
                  placeholder="e.g. Alex"
                  maxLength={15}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  disabled={isLoading}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition duration-150 placeholder-dim/40"
                />
              </div>

              <p className="text-[11px] text-dim leading-normal select-none">
                Instantly host a party. Send the room code or invite link to up to 20 friends.
              </p>
              
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="w-full py-3 rounded-xl gold-gradient-btn font-extrabold text-sm tracking-wide shadow-[0_8px_20px_-6px_rgba(212,175,55,0.4)] transition duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none flex items-center justify-center gap-2"
              >
                {isSettingUp ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                    Setting up...
                  </>
                ) : 'Host Watch Party'}
              </button>

              {roomCode && (
                <div className="share-code mt-1 border border-dashed border-gold/40 rounded-2xl p-4 text-center bg-navy-950 backdrop-blur-md animate-scale-in">
                  <div className="text-[9px] uppercase tracking-widest text-dim font-bold mb-1">Room Code</div>
                  <div className="code font-teko text-[44px] tracking-[0.25em] text-gold-bright leading-none select-all">
                    {roomCode}
                  </div>
                  <p className="hint text-[10px] text-dim mt-2 leading-relaxed">
                    Share this code with your friends or copy the invite link below.
                  </p>
                  <button
                    onClick={handleCopyLink}
                    className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-navy-950 font-bold bg-gold hover:bg-gold-bright py-2 rounded-lg transition duration-150 active:scale-95 cursor-pointer select-none"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Invite Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Invite Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="tab-panel animate-fade-in flex flex-col gap-4">
              <div className="field">
                <label htmlFor="nameInputJoin" className="block text-[10px] font-bold tracking-wider uppercase text-dim mb-1.5 select-none">
                  Your Username
                </label>
                <input
                  type="text"
                  id="nameInputJoin"
                  placeholder="e.g. Alex"
                  maxLength={15}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  disabled={isLoading}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition duration-150 placeholder-dim/40"
                />
              </div>

              <div className="field">
                <label htmlFor="codeInput" className="block text-[10px] font-bold tracking-wider uppercase text-dim mb-1.5 select-none">
                  Party Code
                </label>
                <input
                  type="text"
                  id="codeInput"
                  placeholder="ABCDEF"
                  maxLength={6}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl py-2 px-4 text-white text-3xl font-teko tracking-[0.25em] uppercase outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition duration-150 text-center placeholder-dim/20"
                />
              </div>
              
              <button
                onClick={handleJoin}
                disabled={!codeInput || isLoading}
                className="w-full py-3 rounded-xl gold-gradient-btn font-extrabold text-sm tracking-wide shadow-[0_8px_20px_-6px_rgba(212,175,55,0.4)] transition duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : 'Join Watch Party'}
              </button>
            </div>
          )}
        </div>

        {/* Status Messaging bar */}
        {status && (
          <div
            className={`lobby-status mt-5 p-3 rounded-xl border text-[11px] font-semibold text-center transition-all duration-200 select-none flex items-center justify-center gap-2 animate-fade-in ${
              status.type === 'error'
                ? 'bg-red/10 border-red/20 text-red'
                : status.type === 'success'
                ? 'bg-pitch/10 border-pitch/20 text-pitch-bright'
                : 'bg-navy-900 border-navy-700 text-dim'
            }`}
          >
            {status.type === 'error' && <ShieldAlert className="w-4 h-4 shrink-0" />}
            {status.type === 'success' && <Wifi className="w-4 h-4 shrink-0" />}
            {status.type === 'info' && <Info className="w-4 h-4 shrink-0 animate-pulse" />}
            <span>{status.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
