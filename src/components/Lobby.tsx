import React, { useState, useEffect } from 'react';
import { Video, ShieldAlert, Wifi, Info, Copy, Check } from 'lucide-react';

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
    if (isSettingUp) return { text: 'Creating room connection...', type: 'info' };
    if (isConnecting) return { text: 'Joining watch party room...', type: 'info' };
    if (isWaiting) return { text: 'Room created. Waiting for friends...', type: 'success' };
    return null;
  };

  const status = getStatusMsg();

  return (
    <div id="lobby" className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 min-h-screen">
      <div className="m3-card w-full max-w-[400px] rounded-[28px] p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-scale-in">
        
        {/* Glow decorative bubble */}
        <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gold/10 blur-2xl pointer-events-none" />
        
        {/* Google-Meet style brand header with Stadium Colors */}
        <div className="flex flex-col items-center text-center select-none mb-6">
          <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center mb-4 border border-gold/25 shadow-inner">
            <Video className="w-6 h-6 text-gold" />
          </div>
          
          <h1 className="text-2xl font-medium tracking-tight text-white">
            Watch2gather
          </h1>
          
          <p className="text-dim text-xs mt-1.5 leading-relaxed max-w-[280px]">
            Direct peer-to-peer watch parties. Fast, secure, and completely ad-free.
          </p>
        </div>

        {/* Tab Selectors with Stadium Gold Accents */}
        <div className="tabs flex border-b border-navy-800 select-none mb-6">
          <button
            onClick={() => setActiveTab('create')}
            disabled={isLoading}
            className={`flex-1 text-center pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'create'
                ? 'text-gold'
                : 'text-dim hover:text-white'
            }`}
          >
            Host Room
            {activeTab === 'create' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('join')}
            disabled={isLoading}
            className={`flex-1 text-center pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'join'
                ? 'text-gold'
                : 'text-dim hover:text-white'
            }`}
          >
            Join Room
            {activeTab === 'join' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-t-full" />
            )}
          </button>
        </div>

        {/* Form Body Panels */}
        <div>
          {activeTab === 'create' ? (
            <div className="tab-panel animate-slide-up flex flex-col gap-4">
              <div className="field flex flex-col gap-1.5">
                <label htmlFor="nameInput" className="text-[11px] font-bold tracking-wide uppercase text-dim select-none">
                  Your Name
                </label>
                <input
                  type="text"
                  id="nameInput"
                  placeholder="Enter your name"
                  maxLength={15}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  disabled={isLoading}
                  className="w-full bg-navy-950 border border-[#5f6368]/60 rounded-lg py-2.5 px-3.5 text-white text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition duration-150 placeholder-[#5f6368]/65"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="w-full py-2.5 rounded-full bg-gold hover:bg-gold-bright text-navy-950 font-bold text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed select-none flex items-center justify-center gap-2 shadow btn-bounce neon-border-hover border border-transparent"
              >
                {isSettingUp ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : 'Start Watch Party'}
              </button>

              {roomCode && (
                <div className="share-code mt-1 border border-navy-800 rounded-2xl p-4 text-center bg-navy-950 animate-scale-in">
                  <div className="text-[9px] uppercase tracking-wider text-dim font-bold mb-1">Invite Code</div>
                  <div className="code font-mono text-3xl font-bold tracking-widest text-gold select-all">
                    {roomCode}
                  </div>
                  <p className="hint text-[10px] text-dim mt-2 leading-relaxed">
                    Share this code with your friends or copy the invite link below.
                  </p>
                  <button
                    onClick={handleCopyLink}
                    className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-navy-950 font-bold bg-gold hover:bg-gold-bright py-2 rounded-full cursor-pointer select-none btn-bounce neon-border-hover border border-transparent"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Link Copied</span>
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
            <div className="tab-panel animate-slide-up flex flex-col gap-4">
              <div className="field flex flex-col gap-1.5">
                <label htmlFor="nameInputJoin" className="text-[11px] font-bold tracking-wide uppercase text-dim select-none">
                  Your Name
                </label>
                <input
                  type="text"
                  id="nameInputJoin"
                  placeholder="Enter your name"
                  maxLength={15}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  disabled={isLoading}
                  className="w-full bg-navy-950 border border-[#5f6368]/60 rounded-lg py-2.5 px-3.5 text-white text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition duration-150 placeholder-[#5f6368]/65"
                />
              </div>

              <div className="field flex flex-col gap-1.5">
                <label htmlFor="codeInput" className="text-[11px] font-bold tracking-wide uppercase text-dim select-none">
                  Invite Code
                </label>
                <input
                  type="text"
                  id="codeInput"
                  placeholder="ABCDEF"
                  maxLength={6}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  className="w-full bg-navy-950 border border-[#5f6368]/60 rounded-lg py-2.5 px-3.5 text-white text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition duration-150 placeholder-[#5f6368]/65 text-center font-mono tracking-widest uppercase"
                />
              </div>
              
              <button
                onClick={handleJoin}
                disabled={!codeInput || isLoading}
                className="w-full py-2.5 rounded-full bg-gold hover:bg-gold-bright text-navy-950 font-bold text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed select-none flex items-center justify-center gap-2 shadow btn-bounce neon-border-hover border border-transparent"
              >
                {isConnecting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </>
                ) : 'Join Watch Party'}
              </button>
            </div>
          )}
        </div>

        {/* Status Snackbar Block with Stadium Colors */}
        {status && (
          <div
            className={`lobby-status mt-5 p-2.5 rounded-xl border text-[11px] text-center font-semibold transition-all duration-150 select-none flex items-center justify-center gap-2 animate-slide-up ${
              status.type === 'error'
                ? 'bg-red/10 border-red/20 text-red'
                : status.type === 'success'
                ? 'bg-pitch/10 border-pitch/20 text-pitch-bright'
                : 'bg-navy-950 border-navy-800 text-dim'
            }`}
          >
            {status.type === 'error' && <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
            {status.type === 'success' && <Wifi className="w-3.5 h-3.5 shrink-0 animate-pulse" />}
            {status.type === 'info' && <Info className="w-3.5 h-3.5 shrink-0 animate-pulse" />}
            <span>{status.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
