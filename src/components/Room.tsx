import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  X,
  Copy,
  Check,
  Users,
  Tv
} from 'lucide-react';
import { VideoTile } from './VideoTile';
import { ChatPanel } from './ChatPanel';
import { CelebrationOverlay } from './CelebrationOverlay';
import type { ChatMessage, CelebrationEvent, Participant } from '../hooks/usePeerConnection';

interface RoomProps {
  myName: string;
  friendName: string;
  roomCode: string;
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
    if (window.confirm("Leave the watch party?")) {
      leaveRoom();
    }
  };

  return (
    <div id="room" className="flex-1 flex flex-col relative z-10 min-h-0 h-screen select-none animate-scale-in">
      
      {/* Top Status Bar (Minimal Meet Style with Stadium Colors & Shadow Depth) */}
      <div className="topbar flex items-center justify-between p-3.5 px-4 sm:px-6 bg-navy-950/70 backdrop-blur-md border-b border-white/5 shrink-0 select-none shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        
        {/* Left Side: Room title & timer */}
        <div className="topbar-left flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center border border-gold/30 shadow-[0_0_12px_rgba(212,175,55,0.15)]">
              <Tv className="w-4 h-4 text-gold" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white hidden xs:block">
              Watch Party Room
            </span>
          </div>

          <div className="w-px h-4 bg-navy-800" />

          {/* Glowing Digital Time Display */}
          <div className="timer timer-scoreboard px-3.5 py-1 rounded-lg text-xs font-mono text-white tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pitch-bright shadow-[0_0_8px_var(--pitch-bright)] animate-pulse" />
            <span className="text-gold-bright font-extrabold">{formatTimer(timerSeconds)}</span>
          </div>
        </div>

        {/* Right Side: Copy Code Button */}
        <div className="topbar-right flex items-center gap-2">
          <button
            onClick={copyInviteLink}
            title="Copy Invite Link"
            className="flex items-center gap-2 bg-gradient-to-r from-gold-dark via-gold to-gold-bright text-navy-950 font-extrabold py-1.5 px-4 rounded-full cursor-pointer transition-all duration-150 hover:shadow-[0_0_15px_rgba(212,175,55,0.45)] hover:scale-[1.02] active:scale-95 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>CODE: <span className="font-mono tracking-widest">{roomCode}</span></span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Dashboard */}
      <div className="main-area flex-1 flex flex-col md:flex-row min-h-0">
        
        {/* Video Column (relative to float Meet controls at the bottom) */}
        <div className="video-col flex-1 flex flex-col p-4 gap-4 min-w-0 relative">
          
          {hasPrimary ? (
            <div className="video-grid flex-1 relative min-h-[300px] w-full h-full bg-[#040810] rounded-2xl overflow-hidden border border-[#3c4043]/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
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
            <div className="video-grid flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 min-h-0 overflow-y-auto pr-1">
              <VideoTile
                key="local-cam-grid"
                stream={localStream}
                label={`${myName} (you)`}
                isLocal={true}
                muted={true}
                placeholder="Setting up local video…"
              />
              
              {participants.length === 0 ? (
                <div className="relative bg-[#090f1e]/40 rounded-2xl border border-navy-800 flex flex-col items-center justify-center p-6 text-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                  <div className="w-12 h-12 rounded-full bg-navy-900 border border-navy-800 flex items-center justify-center mb-3.5 shadow-inner">
                    <Users className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="text-white text-sm font-bold mb-1">Waiting for friends to join</h3>
                  <p className="text-dim text-xs max-w-[220px] mb-4 leading-normal">
                    Give them the room code or click copy below to send them an invite link.
                  </p>
                  
                  <div className="bg-navy-950 border border-navy-800 rounded-xl p-2.5 px-5 mb-4 font-mono text-2xl font-bold tracking-widest text-gold shadow-inner select-all">
                    {roomCode}
                  </div>

                  <button
                    onClick={copyInviteLink}
                    className="flex items-center gap-2 bg-gold hover:bg-gold-bright text-navy-950 px-5 py-2.5 rounded-full text-xs font-bold transition duration-150 active:scale-95 cursor-pointer shadow-md hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
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

          {/* Floating Control Dock with Glassmorphism & Depth shadow */}
          <div className="celebrate-bar flex gap-3 flex-wrap glass-meet-bar rounded-2xl py-3 px-6 select-none shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.65)] justify-center items-center">
            {/* Emojis Reactions */}
            <button
              onClick={() => triggerCelebration('goal')}
              className="celebrate-btn glass-meet-btn w-10 h-10 rounded-full text-white cursor-pointer text-base flex items-center justify-center active:scale-90"
              title="React Goal"
            >
              ⚽
            </button>
            <button
              onClick={() => triggerCelebration('save')}
              className="celebrate-btn glass-meet-btn w-10 h-10 rounded-full text-white cursor-pointer text-base flex items-center justify-center active:scale-90"
              title="React Save"
            >
              🧤
            </button>
            <button
              onClick={() => triggerCelebration('card')}
              className="celebrate-btn glass-meet-btn w-10 h-10 rounded-full text-white cursor-pointer text-base flex items-center justify-center active:scale-90"
              title="React Card"
            >
              🟨
            </button>
            <button
              onClick={() => triggerCelebration('fire')}
              className="celebrate-btn glass-meet-btn w-10 h-10 rounded-full text-white cursor-pointer text-base flex items-center justify-center active:scale-90"
              title="React Fire"
            >
              🔥
            </button>
            <button
              onClick={() => triggerCelebration('clap')}
              className="celebrate-btn glass-meet-btn w-10 h-10 rounded-full text-white cursor-pointer text-base flex items-center justify-center active:scale-90"
              title="React Clap"
            >
              👏
            </button>
            <button
              onClick={() => triggerCelebration('trophy')}
              className="celebrate-btn glass-meet-btn w-10 h-10 rounded-full text-white cursor-pointer text-base flex items-center justify-center active:scale-90"
              title="React Champs"
            >
              🏆
            </button>

            <div className="w-px h-6 bg-navy-800/80 mx-1.5" />

            {/* Media Toggles Docks */}
            <button
              onClick={toggleMic}
              title={micMuted ? "Unmute mic" : "Mute mic"}
              className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-108 active:scale-90 ${
                micMuted
                  ? 'bg-red border-red glow-red text-white hover:bg-red/90'
                  : 'bg-navy-950 border border-navy-800/80 text-white hover:border-gold hover:text-gold shadow-md'
              }`}
            >
              {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            
            <button
              onClick={toggleCam}
              title={camDisabled ? "Turn on camera" : "Turn off camera"}
              className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-108 active:scale-90 ${
                camDisabled
                  ? 'bg-red border-red glow-red text-white hover:bg-red/90'
                  : 'bg-navy-950 border border-navy-800/80 text-white hover:border-gold hover:text-gold shadow-md'
              }`}
            >
              {camDisabled ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleScreenShare}
              title={screenSharing ? "Stop sharing screen" : "Share screen"}
              className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-108 active:scale-90 ${
                screenSharing
                  ? 'bg-pitch border-pitch glow-green text-white hover:bg-pitch/90'
                  : 'bg-navy-950 border border-navy-800/80 text-white hover:border-gold hover:text-gold shadow-md'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>

            <button
              onClick={handleLeave}
              title="Leave room"
              className="w-10 h-10 rounded-full bg-red border border-red glow-red hover:bg-red-hover text-white flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-108 active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right side container (adds shadow depth separating video grid) */}
        <div className={`shrink-0 flex border-t md:border-t-0 md:border-l border-white/5 bg-navy-950/65 shadow-[-10px_0_30px_rgba(0,0,0,0.35)] min-h-0 ${
          hasPrimary 
            ? 'w-full md:w-[460px] flex-col md:flex-row' 
            : 'w-full md:w-[300px] flex-col'
        }`}>
          {hasPrimary && (
            <div className="w-full md:w-[160px] shrink-0 border-b md:border-b-0 md:border-r border-navy-800/80 p-3 flex flex-row md:flex-col gap-3 bg-navy-950/40 select-none overflow-x-auto md:overflow-y-auto">
              
              {/* Your Camera */}
              <div className="flex-1 md:flex-initial flex flex-col gap-1 min-w-[100px] md:min-w-0">
                <div className="text-[8px] uppercase tracking-wider text-dim font-bold truncate">
                  {myName} (you)
                </div>
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-navy-800 bg-black shadow-lg">
                  <VideoTile
                    key="local-cam-sidebar"
                    stream={localStream}
                    label={`${myName} (you)`}
                    isLocal={true}
                    muted={true}
                    placeholder="Camera off"
                  />
                </div>
              </div>

              {/* Remote Participant Cameras */}
              {participants.map(p => (
                <div key={p.peerId} className="flex-1 md:flex-initial flex flex-col gap-1 min-w-[100px] md:min-w-0 animate-fade-in">
                  <div className="text-[8px] uppercase tracking-wider text-dim font-bold truncate">
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

          {/* Chat log column */}
          <div className="flex-1 flex flex-col min-h-0 h-[300px] md:h-auto">
            <ChatPanel messages={chatMessages} onSendMessage={sendChatMessage} />
          </div>
        </div>
      </div>

      {/* Synchronized celebration overlays */}
      <CelebrationOverlay celebration={activeCelebration} />
    </div>
  );
};
