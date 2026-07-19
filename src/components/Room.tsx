import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  X,
  Copy,
  Check,
  Tv,
  Server
} from 'lucide-react';
import { VideoTile } from './VideoTile';
import { ChatPanel } from './ChatPanel';
import { CelebrationOverlay } from './CelebrationOverlay';
import type { ChatMessage, CelebrationEvent, Participant } from '../hooks/usePeerConnection';

export interface MatchServer {
  id: string;
  name: string;
  url: string;
}

export const MATCH_SERVERS: MatchServer[] = [
  {
    id: 'server-5',
    name: 'Spain vs Argentina (Live Player 5)',
    url: 'https://embed.st/embed/admin/ppv-spain-vs-argentina/5',
  },
  {
    id: 'server-1',
    name: 'Spain vs Argentina (Server 1)',
    url: 'https://embed.st/embed/admin/ppv-spain-vs-argentina/1',
  },
  {
    id: 'server-2',
    name: 'Spain vs Argentina (Server 2)',
    url: 'https://embed.st/embed/admin/ppv-spain-vs-argentina/2',
  },
];

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
  roomCode,
  localStream,
  participants,
  micMuted,
  camDisabled,
  chatMessages,
  activeCelebration,
  timerSeconds,
  sendChatMessage,
  triggerCelebration,
  toggleMic,
  toggleCam,
  leaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentMatchServer, setCurrentMatchServer] = useState<MatchServer>(() => {
    const customLink = localStorage.getItem('watch2gather_custom_stream_link');
    if (customLink) {
      return {
        id: 'custom-lobby-link',
        name: 'Custom Stream Link',
        url: customLink,
      };
    }
    return MATCH_SERVERS[0];
  });
  const [showServerPicker, setShowServerPicker] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState('');
  
  const matchContainerRef = useRef<HTMLDivElement | null>(null);

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

  const handleAddCustomMatchUrl = () => {
    if (!customServerUrl.trim()) return;
    let url = customServerUrl.trim();
    const srcMatch = url.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      url = srcMatch[1];
    }
    const newServer: MatchServer = {
      id: `custom-${Date.now()}`,
      name: `Custom Stream Link`,
      url: url,
    };
    setCurrentMatchServer(newServer);
    localStorage.setItem('watch2gather_custom_stream_link', url);
    setCustomServerUrl('');
    setShowServerPicker(false);
  };

  return (
    <div id="room" className="flex-1 flex flex-col relative z-10 min-h-0 h-screen select-none animate-scale-in bg-[#030712]">
      
      {/* Top Status Bar */}
      <div className="topbar flex items-center justify-between p-3 px-4 sm:px-6 bg-navy-950/80 backdrop-blur-md border-b border-navy-800 shrink-0 select-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        
        {/* Left Side: Room Title & Live Match Badge */}
        <div className="topbar-left flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center border border-gold/30 shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <Tv className="w-4 h-4 text-gold" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white hidden xs:block">
              Watch Party Room
            </span>
          </div>

          <div className="w-px h-4 bg-navy-800" />

          {/* Live Scoreboard Match Title */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gold/10 border border-gold/25 text-xs font-extrabold text-gold">
            <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
            <span>Spain vs Argentina (Live 4K UHD)</span>
          </div>

          <div className="w-px h-4 bg-navy-800 hidden md:block" />

          {/* Glowing Digital Timer Display */}
          <div className="timer timer-scoreboard px-3 py-1 rounded-lg text-xs font-mono text-white tracking-widest hidden md:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pitch-bright shadow-[0_0_8px_var(--pitch-bright)] animate-pulse" />
            <span className="text-gold-bright font-extrabold">{formatTimer(timerSeconds)}</span>
          </div>
        </div>

        {/* Right Side: Copy Code & Server Switcher */}
        <div className="topbar-right flex items-center gap-2">
          <button
            onClick={() => setShowServerPicker(!showServerPicker)}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 border border-navy-700 hover:border-gold px-3 py-1.5 rounded-full text-xs font-bold text-gold transition cursor-pointer"
            title="Switch match server stream"
          >
            <Server className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{currentMatchServer.name}</span>
            <span className="sm:hidden">Server</span>
          </button>

          <button
            onClick={copyInviteLink}
            title="Copy Invite Link"
            className="flex items-center gap-2 btn-gold-gradient font-extrabold py-1.5 px-4 rounded-full cursor-pointer transition-all duration-150 btn-bounce neon-border-hover border border-transparent shrink-0"
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

      {/* Server Picker Dropdown Modal */}
      {showServerPicker && (
        <div className="absolute top-14 right-4 z-50 w-80 bg-navy-950 border border-navy-800 rounded-2xl p-4 shadow-2xl animate-scale-in">
          <div className="flex items-center justify-between mb-3 border-b border-navy-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Server className="w-4 h-4 text-gold" />
              Switch Match Server
            </span>
            <button
              onClick={() => setShowServerPicker(false)}
              className="text-dim hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            {MATCH_SERVERS.map(srv => (
              <button
                key={srv.id}
                onClick={() => {
                  setCurrentMatchServer(srv);
                  setShowServerPicker(false);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between cursor-pointer ${
                  currentMatchServer.id === srv.id
                    ? 'bg-gold/20 border-gold text-white'
                    : 'bg-navy-900/60 border-navy-800 text-dim hover:text-white'
                }`}
              >
                <span>{srv.name}</span>
                {currentMatchServer.id === srv.id && <Check className="w-3.5 h-3.5 text-gold" />}
              </button>
            ))}
          </div>

          <div className="border-t border-navy-800 pt-3 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-dim uppercase">Paste Custom iFrame/Stream URL:</span>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder='<iframe src="..."> or URL'
                value={customServerUrl}
                onChange={e => setCustomServerUrl(e.target.value)}
                className="flex-1 bg-navy-900 border border-navy-800 text-xs text-white px-2.5 py-1 rounded-lg outline-none focus:border-gold"
              />
              <button
                onClick={handleAddCustomMatchUrl}
                className="bg-gold text-navy-950 font-bold text-xs px-3 py-1 rounded-lg hover:bg-gold-bright transition cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Stage: Embedded Live Stream + Participant Webcams + Chat */}
      <div className="main-area flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* Main Live Stream Stage */}
        <div className="video-col flex-1 flex flex-col p-3 sm:p-4 gap-3 min-w-0 relative">
          
          <div
            ref={matchContainerRef}
            className="video-grid flex-1 relative min-h-[300px] w-full h-full bg-[#040810] rounded-2xl overflow-hidden border border-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col group"
          >
            {/* Live iFrame Match Player with Default Native Controls */}
            <iframe
              key={currentMatchServer.id}
              title="Spain vs Argentina Player"
              src={currentMatchServer.url}
              className="w-full h-full border-0 absolute inset-0"
              scrolling="no"
              allowFullScreen
              allow="encrypted-media; picture-in-picture; autoplay"
            />
          </div>

          {/* Floating Control Dock for Reactions & Mute/Cam controls */}
          <div className="celebrate-bar flex gap-3 flex-wrap glass-meet-bar rounded-2xl py-2.5 px-6 select-none shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.65)] justify-center items-center">
            {/* Emojis Reactions */}
            <button
              onClick={() => triggerCelebration('goal')}
              className="celebrate-btn glass-meet-btn w-9 h-9 rounded-full text-white cursor-pointer text-base flex items-center justify-center btn-bounce neon-border-hover border border-transparent"
              title="React Goal"
            >
              ⚽
            </button>
            <button
              onClick={() => triggerCelebration('save')}
              className="celebrate-btn glass-meet-btn w-9 h-9 rounded-full text-white cursor-pointer text-base flex items-center justify-center btn-bounce neon-border-hover border border-transparent"
              title="React Save"
            >
              🧤
            </button>
            <button
              onClick={() => triggerCelebration('card')}
              className="celebrate-btn glass-meet-btn w-9 h-9 rounded-full text-white cursor-pointer text-base flex items-center justify-center btn-bounce neon-border-hover border border-transparent"
              title="React Card"
            >
              🟨
            </button>
            <button
              onClick={() => triggerCelebration('fire')}
              className="celebrate-btn glass-meet-btn w-9 h-9 rounded-full text-white cursor-pointer text-base flex items-center justify-center btn-bounce neon-border-hover border border-transparent"
              title="React Fire"
            >
              🔥
            </button>
            <button
              onClick={() => triggerCelebration('clap')}
              className="celebrate-btn glass-meet-btn w-9 h-9 rounded-full text-white cursor-pointer text-base flex items-center justify-center btn-bounce neon-border-hover border border-transparent"
              title="React Clap"
            >
              👏
            </button>
            <button
              onClick={() => triggerCelebration('trophy')}
              className="celebrate-btn glass-meet-btn w-9 h-9 rounded-full text-white cursor-pointer text-base flex items-center justify-center btn-bounce neon-border-hover border border-transparent"
              title="React Champs"
            >
              🏆
            </button>

            <div className="w-px h-6 bg-navy-800/80 mx-1" />

            {/* Mic & Cam Toggle Buttons */}
            <button
              onClick={toggleMic}
              title={micMuted ? "Unmute mic" : "Mute mic"}
              className={`w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-150 btn-bounce neon-border-hover ${
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
              className={`w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-150 btn-bounce neon-border-hover ${
                camDisabled
                  ? 'bg-red border-red glow-red text-white hover:bg-red/90'
                  : 'bg-navy-950 border border-navy-800/80 text-white hover:border-gold hover:text-gold shadow-md'
              }`}
            >
              {camDisabled ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
            </button>

            <button
              onClick={leaveRoom}
              title="Leave room"
              className="w-9 h-9 rounded-full bg-red border border-red glow-red hover:bg-red-hover text-white flex items-center justify-center cursor-pointer transition-all duration-150 btn-bounce neon-border-hover"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Side: Participant Cameras & Live Party Chat */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col md:flex-row lg:flex-col border-t lg:border-t-0 lg:border-l border-navy-800 bg-navy-950/70 shadow-[-10px_0_30px_rgba(0,0,0,0.35)] min-h-0">
          
          {/* Participant Cameras Column */}
          <div className="w-full md:w-[200px] lg:w-full shrink-0 border-b md:border-b-0 lg:border-b border-navy-800/80 p-3 flex flex-row md:flex-col lg:flex-row gap-3 bg-navy-950/40 select-none overflow-x-auto">
            
            {/* Your Camera Tile */}
            <div className="flex-1 min-w-[120px] lg:min-w-0 flex flex-col gap-1">
              <div className="text-[9px] uppercase tracking-wider text-dim font-bold truncate">
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

            {/* Remote Friend Camera Tiles */}
            {participants.map(p => (
              <div key={p.peerId} className="flex-1 min-w-[120px] lg:min-w-0 flex flex-col gap-1 animate-fade-in">
                <div className="text-[9px] uppercase tracking-wider text-dim font-bold truncate">
                  {p.name}
                </div>
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-navy-800 bg-black shadow-lg">
                  <VideoTile
                    key={`${p.peerId}-sidebar`}
                    stream={p.stream}
                    label={p.name}
                    isLocal={false}
                    muted={false}
                    placeholder={`${p.name}'s camera off`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Chat Panel */}
          <div className="flex-1 flex flex-col min-h-0 h-[280px] md:h-auto">
            <ChatPanel messages={chatMessages} onSendMessage={sendChatMessage} />
          </div>
        </div>
      </div>

      {/* Synchronized celebration overlays */}
      <CelebrationOverlay celebration={activeCelebration} />
    </div>
  );
};
