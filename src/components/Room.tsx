import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  X,
  Copy,
  Check,
  Tv,
  Users
} from 'lucide-react';
import { VideoTile } from './VideoTile';
import { ChatPanel } from './ChatPanel';
import { CelebrationOverlay } from './CelebrationOverlay';
import type { ChatMessage, CelebrationEvent, Participant } from '../hooks/usePeerConnection';

interface RoomProps {
  myName: string;
  friendName: string;
  roomCode: string;
  connectionStatus: 'idle' | 'setting-up' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'error';
  localStream: MediaStream | null;
  participants: Participant[];
  localScreenStream: MediaStream | null;
  remoteScreenStream: MediaStream | null;
  micMuted: boolean;
  camDisabled: boolean;
  screenSharing: boolean;
  remoteScreenSharing: boolean;
  chatMessages: ChatMessage[];
  activeCelebration: CelebrationEvent | null;
  timerSeconds: number;
  sendChatMessage: (text: string) => void;
  triggerCelebration: (kind: string) => void;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => void;
  leaveRoom: () => void;
}

export const Room: React.FC<RoomProps> = ({
  myName,
  friendName,
  roomCode,
  connectionStatus,
  localStream,
  participants,
  localScreenStream,
  remoteScreenStream,
  micMuted,
  camDisabled,
  screenSharing,
  remoteScreenSharing,
  chatMessages,
  activeCelebration,
  timerSeconds,
  sendChatMessage,
  triggerCelebration,
  toggleMic,
  toggleCam,
  toggleScreenShare,
  leaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const isLocalPrimary = screenSharing && !remoteScreenSharing;
  const isRemotePrimary = remoteScreenSharing && !screenSharing;
  const hasPrimary = isLocalPrimary || isRemotePrimary;

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleLeave = () => {
    if (window.confirm("Are you sure you want to leave the watch party?")) {
      leaveRoom();
    }
  };

  const isConnected = connectionStatus === 'connected';

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live';
      case 'waiting':
        return 'Waiting';
      case 'connecting':
      case 'setting-up':
        return 'Connecting';
      case 'disconnected':
      case 'error':
      default:
        return 'Reconnecting';
    }
  };

  return (
    <div id="room" className="flex-1 flex flex-col relative z-10 min-h-0 h-screen select-none animate-scale-in">
      
      {/* Premium Top Navigation Bar */}
      <div className="topbar flex items-center justify-between p-3 px-4 sm:px-6 bg-navy-950/80 backdrop-blur-md border-b border-navy-800/80 shrink-0 select-none">
        
        {/* Logo & Match Telemetry Status */}
        <div className="topbar-left flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-dark to-gold flex items-center justify-center shadow-md">
              <Tv className="w-4 h-4 text-navy-950" />
            </div>
            <span className="brand font-teko text-[24px] text-white tracking-[0.04em] uppercase hidden xs:block">
              watch<span className="text-gold">2</span>gather
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-navy-900 border border-navy-800 rounded-full py-1 px-3 text-[11px] text-dim font-bold shadow-inner">
            <span className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-pitch-bright shadow-[0_0_8px_var(--pitch-bright)] animate-pulse'
                : 'bg-red animate-ping'
            }`} />
            <span className="tracking-wide uppercase text-[9px]">{getConnectionText()}</span>
          </div>

          {/* Scoreboard Clock */}
          <div className="timer font-teko text-[20px] text-white tracking-[0.08em] px-2.5 py-0.5 bg-navy-900 rounded-lg border border-navy-850 shadow-inner flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />
            <span>{formatTimer(timerSeconds)}</span>
          </div>

          {/* Invite Code Badge */}
          <button
            onClick={copyInviteLink}
            title="Copy Invite Link"
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 border border-navy-800 hover:border-gold/30 text-[10px] text-gold font-bold py-1 px-3 rounded-full cursor-pointer transition duration-150 active:scale-95 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-pitch-bright" />
                <span className="text-pitch-bright">Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>CODE: <span className="text-white tracking-widest">{roomCode}</span></span>
              </>
            )}
          </button>
        </div>

        {/* Media Controls Docks */}
        <div className="topbar-right flex items-center gap-2">
          <button
            onClick={toggleMic}
            title={micMuted ? "Unmute mic" : "Mute mic"}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-150 shadow-md ${
              micMuted
                ? 'bg-red/10 border-red/40 text-red hover:bg-red/20'
                : 'bg-navy-900 border-navy-800 text-white hover:border-gold hover:text-gold'
            }`}
          >
            {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          
          <button
            onClick={toggleCam}
            title={camDisabled ? "Turn on camera" : "Turn off camera"}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-150 shadow-md ${
              camDisabled
                ? 'bg-red/10 border-red/40 text-red hover:bg-red/20'
                : 'bg-navy-900 border-navy-800 text-white hover:border-gold hover:text-gold'
            }`}
          >
            {camDisabled ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleScreenShare}
            title={screenSharing ? "Stop sharing screen" : "Share screen"}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-150 shadow-md ${
              screenSharing
                ? 'bg-gold/10 border-gold/40 text-gold hover:bg-gold/20'
                : 'bg-navy-900 border-navy-800 text-white hover:border-gold hover:text-gold'
            }`}
          >
            <Monitor className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-navy-800 mx-1" />

          <button
            onClick={handleLeave}
            title="Leave party"
            className="w-9 h-9 rounded-xl border bg-red/10 border-red/40 text-red hover:bg-red hover:text-white flex items-center justify-center cursor-pointer transition-all duration-150 shadow-md active:scale-95"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Main Content Workspace Layout */}
      <div className="main-area flex-1 flex flex-col md:flex-row min-h-0">
        
        {/* Left Video Stream Area */}
        <div className="video-col flex-1 flex flex-col p-4 gap-3.5 min-w-0">
          
          {hasPrimary ? (
            <div className="video-grid flex-1 relative min-h-[300px] w-full h-full bg-navy-950 rounded-2xl overflow-hidden border border-navy-800/80 shadow-2xl">
              <div className="w-full h-full absolute inset-0 z-10">
                <VideoTile
                  key="primary-view-tile"
                  stream={isLocalPrimary ? localScreenStream : remoteScreenStream}
                  label={isLocalPrimary ? `${myName} (you) [Shared Screen]` : `${friendName} [Shared Screen]`}
                  isLocal={isLocalPrimary}
                  muted={isLocalPrimary}
                  placeholder={isLocalPrimary ? "Setting up screen share…" : "Waiting for screen share…"}
                />
              </div>
            </div>
          ) : (
            <div className="video-grid flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 min-h-0 overflow-y-auto pr-1">
              <VideoTile
                key="local-cam-grid"
                stream={localStream}
                label={`${myName} (you)`}
                isLocal={true}
                muted={true}
                placeholder="Setting up local video…"
              />
              
              {participants.length === 0 ? (
                <div className="relative bg-gradient-to-b from-navy-900 to-navy-950 rounded-2xl border border-navy-800/80 flex flex-col items-center justify-center p-6 text-center shadow-lg min-h-[220px]">
                  <div className="w-12 h-12 rounded-xl bg-navy-950 border border-navy-800 flex items-center justify-center mb-4">
                    <Users className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="text-white text-sm font-bold mb-1">Waiting for friends...</h3>
                  <p className="text-dim text-[11px] max-w-[240px] mb-4 leading-normal">
                    Give them the room code or click copy to send them a direct invite link.
                  </p>
                  
                  <div className="bg-navy-950 border border-navy-800/80 rounded-xl p-3 px-5 mb-4 shadow-inner">
                    <div className="text-[9px] uppercase text-dim tracking-wider font-extrabold mb-0.5">Invite Code</div>
                    <div className="font-teko text-3xl tracking-[0.2em] text-gold-bright leading-none select-all">{roomCode}</div>
                  </div>

                  <button
                    onClick={copyInviteLink}
                    className="flex items-center gap-2 bg-gold hover:bg-gold-bright text-navy-950 px-4 py-2 rounded-lg text-xs font-bold transition duration-150 active:scale-95 cursor-pointer shadow-md"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Invite Link</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                participants.map(p => (
                  <VideoTile
                    key={p.peerId}
                    stream={p.stream}
                    label={p.name}
                    isLocal={false}
                    muted={false}
                    placeholder={`${p.name}'s camera off`}
                  />
                ))
              )}
            </div>
          )}

          {/* Stadium Goal/Celebration Dock */}
          <div className="celebrate-bar flex gap-2 flex-wrap bg-navy-900/60 border border-navy-800/60 rounded-2xl p-2.5 select-none shrink-0 backdrop-blur-md shadow-lg">
            <button
              onClick={() => triggerCelebration('goal')}
              className="celebrate-btn flex-1 min-w-[72px] bg-navy-950 hover:bg-navy-900 border border-navy-800 hover:border-gold/40 rounded-xl text-white py-2 px-1 cursor-pointer text-[10px] font-extrabold flex flex-col items-center gap-1 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-md"
            >
              <span className="emoji text-[20px] select-none">⚽</span>
              <span className="tracking-wider uppercase">Goal</span>
            </button>
            <button
              onClick={() => triggerCelebration('save')}
              className="celebrate-btn flex-1 min-w-[72px] bg-navy-950 hover:bg-navy-900 border border-navy-800 hover:border-gold/40 rounded-xl text-white py-2 px-1 cursor-pointer text-[10px] font-extrabold flex flex-col items-center gap-1 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-md"
            >
              <span className="emoji text-[20px] select-none">🧤</span>
              <span className="tracking-wider uppercase">Save</span>
            </button>
            <button
              onClick={() => triggerCelebration('card')}
              className="celebrate-btn flex-1 min-w-[72px] bg-navy-950 hover:bg-navy-900 border border-navy-800 hover:border-gold/40 rounded-xl text-white py-2 px-1 cursor-pointer text-[10px] font-extrabold flex flex-col items-center gap-1 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-md"
            >
              <span className="emoji text-[20px] select-none">🟨</span>
              <span className="tracking-wider uppercase">Card</span>
            </button>
            <button
              onClick={() => triggerCelebration('fire')}
              className="celebrate-btn flex-1 min-w-[72px] bg-navy-950 hover:bg-navy-900 border border-navy-800 hover:border-gold/40 rounded-xl text-white py-2 px-1 cursor-pointer text-[10px] font-extrabold flex flex-col items-center gap-1 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-md"
            >
              <span className="emoji text-[20px] select-none">🔥</span>
              <span className="tracking-wider uppercase">Fire</span>
            </button>
            <button
              onClick={() => triggerCelebration('clap')}
              className="celebrate-btn flex-1 min-w-[72px] bg-navy-950 hover:bg-navy-900 border border-navy-800 hover:border-gold/40 rounded-xl text-white py-2 px-1 cursor-pointer text-[10px] font-extrabold flex flex-col items-center gap-1 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-md"
            >
              <span className="emoji text-[20px] select-none">👏</span>
              <span className="tracking-wider uppercase">Clap</span>
            </button>
            <button
              onClick={() => triggerCelebration('trophy')}
              className="celebrate-btn flex-1 min-w-[72px] bg-navy-950 hover:bg-navy-900 border border-navy-800 hover:border-gold/40 rounded-xl text-gold-bright py-2 px-1 cursor-pointer text-[10px] font-extrabold flex flex-col items-center gap-1 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-md"
            >
              <span className="emoji text-[20px] select-none">🏆</span>
              <span className="tracking-wider uppercase">Champs</span>
            </button>
          </div>
        </div>

        {/* Right Side Sidebar Panel Container */}
        <div className={`shrink-0 flex border-t md:border-t-0 md:border-l border-navy-800 bg-navy-900/40 backdrop-blur-sm min-h-0 ${
          hasPrimary 
            ? 'w-full md:w-[480px] flex-col md:flex-row' 
            : 'w-full md:w-[320px] flex-col'
        }`}>
          {/* Vertical Camera List Column (Only shown when Screen Sharing is active) */}
          {hasPrimary && (
            <div className="w-full md:w-[170px] shrink-0 border-b md:border-b-0 md:border-r border-navy-800 p-3 flex flex-row md:flex-col gap-3 bg-navy-950/40 select-none overflow-x-auto md:overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Your sidebar camera */}
              <div className="flex-1 md:flex-initial flex flex-col gap-1 min-w-[110px] md:min-w-0">
                <div className="text-[8px] uppercase tracking-wider text-dim font-extrabold truncate">
                  {myName} (you)
                </div>
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-navy-800 bg-black shadow-lg">
                  <VideoTile
                    key="local-cam-sidebar"
                    stream={localStream}
                    label={`${myName} (you)`}
                    isLocal={true}
                    muted={true}
                    placeholder="Your camera off"
                  />
                </div>
              </div>

              {/* Remote participant sidebar cameras */}
              {participants.map(p => (
                <div key={p.peerId} className="flex-1 md:flex-initial flex flex-col gap-1 min-w-[110px] md:min-w-0 animate-fade-in">
                  <div className="text-[8px] uppercase tracking-wider text-dim font-extrabold truncate">
                    {p.name}
                  </div>
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-navy-800 bg-black shadow-lg">
                    <VideoTile
                      key={`${p.peerId}-sidebar`}
                      stream={p.stream}
                      label={p.name}
                      isLocal={false}
                      muted={false}
                      placeholder="Camera off"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Interactive Chat Panel Column */}
          <div className="flex-1 flex flex-col min-h-0 h-[320px] md:h-auto">
            <ChatPanel messages={chatMessages} onSendMessage={sendChatMessage} />
          </div>
        </div>
      </div>

      {/* Goal/Celebration Synchronized Fullscreen Animation Overlays */}
      <CelebrationOverlay celebration={activeCelebration} />
    </div>
  );
};
