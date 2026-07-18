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
      
      {/* Top Status Bar (Minimal Meet Style) */}
      <div className="topbar flex items-center justify-between p-3.5 px-4 sm:px-6 bg-[#202124] border-b border-[#3c4043] shrink-0 select-none">
        
        {/* Left Side: Room title & timer */}
        <div className="topbar-left flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8ab4f8]/10 flex items-center justify-center">
              <Tv className="w-4 h-4 text-[#8ab4f8]" />
            </div>
            <span className="text-sm font-medium tracking-tight text-white hidden xs:block">
              Watch Party Room
            </span>
          </div>

          <div className="w-px h-4 bg-[#3c4043]" />

          {/* Clean Flat Clock */}
          <div className="timer text-sm font-mono text-white tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#81c995]" />
            <span>{formatTimer(timerSeconds)}</span>
          </div>
        </div>

        {/* Right Side: Copy Code Button */}
        <div className="topbar-right flex items-center gap-2">
          <button
            onClick={copyInviteLink}
            title="Copy Invite Link"
            className="flex items-center gap-2 bg-[#3c4043] hover:bg-[#4e5256] text-xs text-white font-medium py-1.5 px-3 rounded-full cursor-pointer transition duration-150 active:scale-95 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#81c995]" />
                <span className="text-[#81c995]">Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#9aa0a6]" />
                <span>Room Code: <span className="font-mono text-white select-all">{roomCode}</span></span>
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
            <div className="video-grid flex-1 relative min-h-[300px] w-full h-full bg-[#171717] rounded-2xl overflow-hidden border border-[#3c4043] shadow-lg">
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
                <div className="relative bg-[#171717] rounded-2xl border border-[#3c4043] flex flex-col items-center justify-center p-6 text-center shadow">
                  <div className="w-10 h-10 rounded-full bg-[#3c4043] flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white text-sm font-semibold mb-1">Waiting for others to join</h3>
                  <p className="text-[#9aa0a6] text-xs max-w-[220px] mb-4 leading-normal">
                    Give them the room code or click copy below to send them an invite link.
                  </p>
                  
                  <div className="bg-[#202124] border border-[#3c4043] rounded-xl p-2.5 px-4 mb-4 font-mono text-2xl font-bold tracking-widest text-[#8ab4f8] select-all">
                    {roomCode}
                  </div>

                  <button
                    onClick={copyInviteLink}
                    className="flex items-center gap-2 bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] px-4 py-2 rounded-full text-xs font-bold transition duration-150 active:scale-95 cursor-pointer shadow"
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

          {/* Static Bottom Control Dock — Replaced with flat styling */}
          <div className="celebrate-bar flex gap-2.5 flex-wrap bg-[#2d2d30]/60 border border-[#3c4043] rounded-2xl p-2.5 select-none shrink-0 shadow-lg justify-center items-center">
            {/* Emojis Reactions */}
            <button
              onClick={() => triggerCelebration('goal')}
              className="celebrate-btn w-10 h-10 bg-[#3c4043] hover:bg-[#4e5256] border border-[#5f6368]/30 rounded-full text-white cursor-pointer text-base flex items-center justify-center transition-all duration-150 active:scale-90"
              title="React Goal"
            >
              ⚽
            </button>
            <button
              onClick={() => triggerCelebration('save')}
              className="celebrate-btn w-10 h-10 bg-[#3c4043] hover:bg-[#4e5256] border border-[#5f6368]/30 rounded-full text-white cursor-pointer text-base flex items-center justify-center transition-all duration-150 active:scale-90"
              title="React Save"
            >
              🧤
            </button>
            <button
              onClick={() => triggerCelebration('card')}
              className="celebrate-btn w-10 h-10 bg-[#3c4043] hover:bg-[#4e5256] border border-[#5f6368]/30 rounded-full text-white cursor-pointer text-base flex items-center justify-center transition-all duration-150 active:scale-90"
              title="React Card"
            >
              🟨
            </button>
            <button
              onClick={() => triggerCelebration('fire')}
              className="celebrate-btn w-10 h-10 bg-[#3c4043] hover:bg-[#4e5256] border border-[#5f6368]/30 rounded-full text-white cursor-pointer text-base flex items-center justify-center transition-all duration-150 active:scale-90"
              title="React Fire"
            >
              🔥
            </button>
            <button
              onClick={() => triggerCelebration('clap')}
              className="celebrate-btn w-10 h-10 bg-[#3c4043] hover:bg-[#4e5256] border border-[#5f6368]/30 rounded-full text-white cursor-pointer text-base flex items-center justify-center transition-all duration-150 active:scale-90"
              title="React Clap"
            >
              👏
            </button>
            <button
              onClick={() => triggerCelebration('trophy')}
              className="celebrate-btn w-10 h-10 bg-[#3c4043] hover:bg-[#4e5256] border border-[#5f6368]/30 rounded-full text-white cursor-pointer text-base flex items-center justify-center transition-all duration-150 active:scale-90"
              title="React Champs"
            >
              🏆
            </button>

            <div className="w-px h-6 bg-[#3c4043] mx-1.5" />

            {/* Media Toggles Docks */}
            <button
              onClick={toggleMic}
              title={micMuted ? "Unmute mic" : "Mute mic"}
              className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-150 ${
                micMuted
                  ? 'bg-[#ea4335] border-[#ea4335] text-white hover:bg-[#ea4335]/90'
                  : 'bg-[#3c4043] border-[#5f6368]/30 text-white hover:bg-[#4e5256]'
              }`}
            >
              {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            
            <button
              onClick={toggleCam}
              title={camDisabled ? "Turn on camera" : "Turn off camera"}
              className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-150 ${
                camDisabled
                  ? 'bg-[#ea4335] border-[#ea4335] text-white hover:bg-[#ea4335]/90'
                  : 'bg-[#3c4043] border-[#5f6368]/30 text-white hover:bg-[#4e5256]'
              }`}
            >
              {camDisabled ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleScreenShare}
              title={screenSharing ? "Stop sharing screen" : "Share screen"}
              className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-150 ${
                screenSharing
                  ? 'bg-[#0f9d58] border-[#0f9d58] text-white hover:bg-[#0b8043]'
                  : 'bg-[#3c4043] border-[#5f6368]/30 text-white hover:bg-[#4e5256]'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>

            <button
              onClick={handleLeave}
              title="Leave room"
              className="w-10 h-10 rounded-full bg-[#ea4335] border border-[#ea4335] hover:bg-[#d93025] text-white flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right side container: containing friend's camera vertically on the left of Chat log when screen sharing is active */}
        <div className={`shrink-0 flex border-t md:border-t-0 md:border-l border-[#3c4043] bg-[#202124] min-h-0 ${
          hasPrimary 
            ? 'w-full md:w-[460px] flex-col md:flex-row' 
            : 'w-full md:w-[300px] flex-col'
        }`}>
          {hasPrimary && (
            <div className="w-full md:w-[160px] shrink-0 border-b md:border-b-0 md:border-r border-[#3c4043] p-3 flex flex-row md:flex-col gap-3 bg-[#171717]/40 select-none overflow-x-auto md:overflow-y-auto">
              
              {/* Your Camera */}
              <div className="flex-1 md:flex-initial flex flex-col gap-1 min-w-[100px] md:min-w-0">
                <div className="text-[8px] uppercase tracking-wider text-[#9aa0a6] font-bold truncate">
                  {myName} (you)
                </div>
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-[#3c4043] bg-black shadow">
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
                  <div className="text-[8px] uppercase tracking-wider text-[#9aa0a6] font-bold truncate">
                    {p.name}
                  </div>
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-[#3c4043] bg-black shadow">
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
