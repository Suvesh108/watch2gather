import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setActiveTab('join');
      setCodeInput(roomParam.toUpperCase());
    }
  }, []);
  const [validationError, setValidationError] = useState('');

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
      const input = document.getElementById('nameInput');
      if (input) input.focus();
      return;
    }
    if (!codeInput) {
      setValidationError('Please enter a room code.');
      return;
    }
    setValidationError('');
    await joinRoom(username, codeInput);
  };

  // Determine button text and disabled state
  const isSettingUp = connectionStatus === 'setting-up';
  const isConnecting = connectionStatus === 'connecting';
  const isWaiting = connectionStatus === 'waiting';

  const getStatusMsg = () => {
    if (validationError) return { text: validationError, type: 'error' };
    if (errorMsg) return { text: errorMsg, type: 'error' };
    if (isSettingUp) return { text: 'Setting up your room…', type: 'info' };
    if (isConnecting) return { text: 'Connecting to room…', type: 'info' };
    if (isWaiting) return { text: 'Room ready. Waiting for your friend to join…', type: 'success' };
    return null;
  };

  const status = getStatusMsg();

  return (
    <div id="lobby" className="flex-1 flex items-center justify-center p-6 z-10">
      <div className="lobby-card w-full max-w-[440px] bg-gradient-to-b from-navy-900 to-navy-800 border border-navy-700 rounded-2xl p-9 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
        <div className="eyebrow text-gold text-[12px] font-bold tracking-[0.18em] uppercase flex items-center gap-2 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-pitch-bright before:shadow-[0_0_8px_var(--pitch-bright)] before:animate-pulse-slow">
          Final · Spain vs Argentina
        </div>
        
        <h1 className="font-teko text-[56px] leading-[0.95] font-bold mt-1.5 text-white">
          Watch<br />
          <span className="text-gold">Together</span>
        </h1>
        
        <p className="text-dim text-[14px] mt-2.5 leading-relaxed">
          A private, direct connection between just you two — full quality video, live chat, and goal celebrations. No account, no server recording anything.
        </p>

        {/* Username field */}
        <div className="field mt-5">
          <label htmlFor="nameInput" className="block text-[11px] font-bold tracking-wider uppercase text-dim mb-1.5">
            Your name
          </label>
          <input
            type="text"
            id="nameInput"
            placeholder="e.g. Suvesh"
            maxLength={20}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (validationError) setValidationError('');
            }}
            disabled={isSettingUp || isConnecting || isWaiting}
            className="w-full bg-navy-950 border border-navy-700 rounded-lg py-3 px-3.5 text-white text-[15px] outline-none focus:border-gold transition-colors duration-150"
          />
        </div>

        {/* Tab Selectors */}
        <div className="tabs flex gap-2 mt-6 bg-navy-950 p-1 rounded-xl border border-navy-700">
          <button
            onClick={() => setActiveTab('create')}
            disabled={isSettingUp || isConnecting || isWaiting}
            className={`flex-1 text-center py-2.5 rounded-lg cursor-pointer text-[13px] font-semibold transition-all duration-150 ${
              activeTab === 'create'
                ? 'bg-navy-800 text-gold'
                : 'text-dim hover:text-white'
            }`}
          >
            Start a room
          </button>
          <button
            onClick={() => setActiveTab('join')}
            disabled={isSettingUp || isConnecting || isWaiting}
            className={`flex-1 text-center py-2.5 rounded-lg cursor-pointer text-[13px] font-semibold transition-all duration-150 ${
              activeTab === 'join'
                ? 'bg-navy-800 text-gold'
                : 'text-dim hover:text-white'
            }`}
          >
            Join a room
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'create' ? (
          <div className="tab-panel mt-4">
            <p className="text-[11px] text-dim mb-4 leading-normal">
              Creates a room code — send it to your friend on WhatsApp.
            </p>
            
            <button
              onClick={handleCreate}
              disabled={isSettingUp || isConnecting || isWaiting}
              className="w-full py-3.5 rounded-lg bg-gradient-to-b from-gold-bright to-gold text-navy-950 font-bold text-sm tracking-wide shadow-[0_10px_24px_-8px_rgba(232,180,76,0.5)] transition duration-100 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSettingUp ? 'Setting up...' : 'Create Watch Party'}
            </button>

            {roomCode && (
              <div className="share-code mt-4 border border-dashed border-gold rounded-xl p-4 text-center bg-navy-950 flex flex-col items-center justify-center gap-2">
                <div className="code font-teko text-[38px] tracking-[0.2em] text-gold-bright leading-none">
                  {roomCode}
                </div>
                <div className="hint text-[11px] text-dim">
                  Send this code or copy the invite link for your friend
                </div>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
                    navigator.clipboard.writeText(link);
                  }}
                  className="mt-2 text-xs text-navy-950 font-bold bg-gold hover:bg-gold-bright px-3 py-1.5 rounded transition cursor-pointer select-none"
                >
                  Copy Invite Link
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="tab-panel mt-4">
            <div className="field">
              <label htmlFor="codeInput" className="block text-[11px] font-bold tracking-wider uppercase text-dim mb-1.5">
                Room code
              </label>
              <input
                type="text"
                id="codeInput"
                placeholder="ABC123"
                maxLength={6}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                disabled={isSettingUp || isConnecting}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg py-2.5 px-3.5 text-white text-2xl font-teko tracking-[0.15em] uppercase outline-none focus:border-gold transition-colors duration-150"
              />
            </div>
            
            <button
              onClick={handleJoin}
              disabled={!codeInput || isSettingUp || isConnecting}
              className="w-full mt-4 py-3.5 rounded-lg bg-gradient-to-b from-gold-bright to-gold text-navy-950 font-bold text-sm tracking-wide shadow-[0_10px_24px_-8px_rgba(232,180,76,0.5)] transition duration-100 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isConnecting ? 'Connecting...' : 'Join Watch Party'}
            </button>
          </div>
        )}

        {/* Connection Status/Errors */}
        {status && (
          <div
            className={`lobby-status mt-4 text-xs text-center min-h-[18px] ${
              status.type === 'error'
                ? 'text-red'
                : status.type === 'success'
                ? 'text-pitch-bright font-medium'
                : 'text-dim'
            }`}
          >
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
};
