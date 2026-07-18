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
} from 'lucide-react';
import { VideoTile } from './VideoTile';
import { ChatPanel } from './ChatPanel';
import { CelebrationOverlay } from './CelebrationOverlay';
import type { ChatMessage, CelebrationEvent } from '../hooks/usePeerConnection';

interface RoomProps {
  myName: string;
  friendName: string;
  roomCode: string;
  connectionStatus: 'idle' | 'setting-up' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'error';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
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
  remoteStream,
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

  // Format elapsed timer
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

  const isConnected = connectionStatus === 'connected';

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'waiting':
        return 'Waiting...';
      case 'connecting':
      case 'setting-up':
        return 'Connecting...';
      case 'disconnected':
      case 'error':
      default:
        return 'Reconnecting...';
    }
  };

  return (
    <div id="room" className="flex-1 flex flex-col relative z-10 min-h-0 h-screen select-none">
      {/* Top Navigation Bar */}
      <div className="topbar flex items-center justify-between p-3 px-5 bg-navy-900 border-b border-navy-700 shrink-0">
        <div className="topbar-left flex items-center gap-3.5">
          <div className="brand font-teko text-[24px] text-gold tracking-[0.04em]">
            MATCHDAY
          </div>
          <div className="conn-pill flex items-center gap-2 bg-navy-950 border border-navy-700 rounded-full py-1 px-3 text-xs text-dim font-semibold select-none">
            <span
              className={`conn-dot w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-pitch-bright shadow-[0_0_6px_var(--pitch-bright)] animate-pulse-slow'
                  : 'bg-red'
              }`}
            />
            <span>{getConnectionText()}</span>
          </div>
          <div className="timer font-teko text-[20px] text-white tracking-[0.05em] select-none">
            {formatTimer(timerSeconds)}
          </div>
          <button
            onClick={copyInviteLink}
            title="Copy invite link"
            className="flex items-center gap-1.5 bg-navy-950 hover:bg-navy-800 border border-navy-700 text-xs text-gold font-semibold py-1 px-2.5 rounded-full cursor-pointer select-none transition duration-150 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-pitch-bright" />
                <span className="text-pitch-bright">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Code: {roomCode}</span>
              </>
            )}
          </button>
        </div>

        {/* Media controls */}
        <div className="topbar-right flex gap-2">
          <button
            onClick={toggleMic}
            title={micMuted ? "Unmute mic" : "Mute mic"}
            className={`w-9.5 h-9.5 p-2 rounded-lg border flex items-center justify-center cursor-pointer transition duration-150 ${
              micMuted
                ? 'bg-red border-red text-white'
                : 'bg-navy-950 border-navy-700 text-white hover:border-gold'
            }`}
          >
            {micMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
          </button>
          
          <button
            onClick={toggleCam}
            title={camDisabled ? "Turn on camera" : "Turn off camera"}
            className={`w-9.5 h-9.5 p-2 rounded-lg border flex items-center justify-center cursor-pointer transition duration-150 ${
              camDisabled
                ? 'bg-red border-red text-white'
                : 'bg-navy-950 border-navy-700 text-white hover:border-gold'
            }`}
          >
            {camDisabled ? <VideoOff className="w-4.5 h-4.5" /> : <Video className="w-4.5 h-4.5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            title={screenSharing ? "Share camera instead" : "Share screen instead"}
            className={`w-9.5 h-9.5 p-2 rounded-lg border flex items-center justify-center cursor-pointer transition duration-150 ${
              screenSharing
                ? 'bg-navy-950 border-gold text-gold hover:border-gold-bright'
                : 'bg-navy-950 border-navy-700 text-white hover:border-gold'
            }`}
          >
            <Monitor className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={handleLeave}
            title="Leave watch party"
            className="w-9.5 h-9.5 p-2 rounded-lg border bg-red border-red text-white flex items-center justify-center cursor-pointer hover:bg-red/80 transition duration-150"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="main-area flex-1 flex flex-col md:flex-row min-h-0">
        {/* Video feed column */}
        <div className="video-col flex-1 flex flex-col p-4 gap-3 min-w-0">
          {hasPrimary ? (
            <div className="video-grid flex-1 relative min-h-[300px] w-full h-full bg-navy-950 rounded-[14px] overflow-hidden border border-navy-700">
              {/* Primary View (Full container width/height) */}
              <div className="w-full h-full absolute inset-0 z-10">
                <VideoTile
                  stream={isLocalPrimary ? localStream : remoteStream}
                  label={isLocalPrimary ? `${myName} (you) [Shared Screen]` : `${friendName} [Shared Screen]`}
                  isLocal={isLocalPrimary}
                  muted={isLocalPrimary}
                  placeholder={isLocalPrimary ? "Setting up screen share…" : "Waiting for screen share…"}
                />
              </div>

              {/* Secondary View (Floating PIP Box) */}
              <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-48 sm:h-32 z-20 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.8)] border border-navy-700/80 rounded-xl overflow-hidden bg-navy-900 transition-all duration-300">
                <VideoTile
                  stream={isLocalPrimary ? remoteStream : localStream}
                  label={isLocalPrimary ? friendName : `${myName} (you)`}
                  isLocal={!isLocalPrimary}
                  muted={!isLocalPrimary}
                  placeholder={isLocalPrimary ? "Camera off" : "No camera"}
                />
              </div>
            </div>
          ) : (
            <div className="video-grid flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0">
              <VideoTile
                stream={localStream}
                label={`${myName} (you)`}
                isLocal={true}
                muted={true}
                placeholder="Setting up local video…"
              />
              <VideoTile
                stream={remoteStream}
                label={friendName}
                isLocal={false}
                placeholder={
                  <div className="flex flex-col items-center gap-4 text-center p-4">
                    <span className="text-dim text-sm leading-normal">Waiting for your friend to join…</span>
                    <div className="bg-navy-950/80 border border-navy-700 rounded-xl p-4 w-full max-w-[280px]">
                      <div className="text-[10px] uppercase text-dim tracking-[0.12em] mb-1 font-bold">Room Code</div>
                      <div className="font-teko text-4xl tracking-[0.2em] text-gold-bright leading-none">{roomCode}</div>
                    </div>
                    <button
                      onClick={copyInviteLink}
                      className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 border border-navy-700 text-white hover:text-gold hover:border-gold px-4 py-2.5 rounded-lg text-xs font-bold transition duration-150 active:scale-95 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-pitch-bright" />
                          <span className="text-pitch-bright">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Invite Link</span>
                        </>
                      )}
                    </button>
                  </div>
                }
              />
            </div>
          )}

          {/* Celebration bar */}
          <div className="celebrate-bar flex gap-2 flex-wrap bg-navy-900 border border-navy-700 rounded-xl p-2.5 select-none shrink-0">
            <button
              onClick={() => triggerCelebration('goal')}
              className="celebrate-btn flex-1 min-w-[76px] bg-navy-950 border border-navy-700 rounded-lg text-white py-2 px-1 cursor-pointer text-xs font-bold flex flex-col items-center gap-1 transition-all duration-120 hover:border-gold hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <span className="emoji text-[20px] select-none">⚽</span>GOAL!
            </button>
            <button
              onClick={() => triggerCelebration('save')}
              className="celebrate-btn flex-1 min-w-[76px] bg-navy-950 border border-navy-700 rounded-lg text-white py-2 px-1 cursor-pointer text-xs font-bold flex flex-col items-center gap-1 transition-all duration-120 hover:border-gold hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <span className="emoji text-[20px] select-none">🧤</span>SAVE!
            </button>
            <button
              onClick={() => triggerCelebration('card')}
              className="celebrate-btn flex-1 min-w-[76px] bg-navy-950 border border-navy-700 rounded-lg text-white py-2 px-1 cursor-pointer text-xs font-bold flex flex-col items-center gap-1 transition-all duration-120 hover:border-gold hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <span className="emoji text-[20px] select-none">🟨</span>CARD
            </button>
            <button
              onClick={() => triggerCelebration('fire')}
              className="celebrate-btn flex-1 min-w-[76px] bg-navy-950 border border-navy-700 rounded-lg text-white py-2 px-1 cursor-pointer text-xs font-bold flex flex-col items-center gap-1 transition-all duration-120 hover:border-gold hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <span className="emoji text-[20px] select-none">🔥</span>FIRE
            </button>
            <button
              onClick={() => triggerCelebration('clap')}
              className="celebrate-btn flex-1 min-w-[76px] bg-navy-950 border border-navy-700 rounded-lg text-white py-2 px-1 cursor-pointer text-xs font-bold flex flex-col items-center gap-1 transition-all duration-120 hover:border-gold hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <span className="emoji text-[20px] select-none">👏</span>CLAP
            </button>
            <button
              onClick={() => triggerCelebration('trophy')}
              className="celebrate-btn flex-1 min-w-[76px] bg-navy-950 border border-navy-700 rounded-lg text-white py-2 px-1 cursor-pointer text-xs font-bold flex flex-col items-center gap-1 transition-all duration-120 hover:border-gold hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <span className="emoji text-[20px] select-none">🏆</span>CHAMPS
            </button>
          </div>
        </div>

        {/* Chat log column */}
        <ChatPanel messages={chatMessages} onSendMessage={sendChatMessage} />
      </div>

      {/* Synchronized celebration overlays */}
      <CelebrationOverlay celebration={activeCelebration} />
    </div>
  );
};
