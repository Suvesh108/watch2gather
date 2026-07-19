import React, { useState, useRef } from 'react';
import {
  Tv,
  Sparkles,
  Maximize,
  X,
  ExternalLink,
  CheckCircle2,
  Plus,
  Trophy
} from 'lucide-react';

export interface StreamChannel {
  id: string;
  name: string;
  category: string;
  embedUrl: string;
}

export const PRESET_CHANNELS: StreamChannel[] = [
  {
    id: 'spain-vs-argentina-5',
    name: 'Spain vs Argentina (Live Player 5)',
    category: 'PPV Match',
    embedUrl: 'https://embed.st/embed/admin/ppv-spain-vs-argentina/5',
  },
  {
    id: 'spain-vs-argentina-1',
    name: 'Spain vs Argentina (Server 1)',
    category: 'PPV Match',
    embedUrl: 'https://embed.st/embed/admin/ppv-spain-vs-argentina/1',
  },
  {
    id: 'spain-vs-argentina-2',
    name: 'Spain vs Argentina (Server 2)',
    category: 'PPV Match',
    embedUrl: 'https://embed.st/embed/admin/ppv-spain-vs-argentina/2',
  },
];

interface IPTVSectionProps {
  onClose?: () => void;
  onSelectStreamForParty?: (url: string, title: string) => void;
}

export const IPTVSection: React.FC<IPTVSectionProps> = ({ onClose, onSelectStreamForParty }) => {
  const [channels, setChannels] = useState<StreamChannel[]>(PRESET_CHANNELS);
  const [currentChannel, setCurrentChannel] = useState<StreamChannel>(PRESET_CHANNELS[0]);
  const [customEmbed, setCustomEmbed] = useState<string>('');
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const handleSelectChannel = (channel: StreamChannel) => {
    setCurrentChannel(channel);
  };

  const handleAddCustomEmbed = () => {
    if (!customEmbed.trim()) return;

    let parsedUrl = customEmbed.trim();
    // Extract src if user pasted a full <iframe ... src="..."> string
    const srcMatch = customEmbed.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      parsedUrl = srcMatch[1];
    }

    const newChannel: StreamChannel = {
      id: `custom-${Date.now()}`,
      name: `Custom Match Player ${channels.length + 1}`,
      category: 'Custom Stream',
      embedUrl: parsedUrl,
    };

    setChannels(prev => [...prev, newChannel]);
    setCurrentChannel(newChannel);
    setCustomEmbed('');
  };

  const handleFullscreen = () => {
    if (playerContainerRef.current) {
      if (playerContainerRef.current.requestFullscreen) {
        playerContainerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#060b17] text-white overflow-hidden rounded-2xl border border-navy-800 shadow-[0_25px_60px_rgba(0,0,0,0.8)] animate-scale-in">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-navy-950/90 border-b border-navy-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shadow-[0_0_12px_rgba(212,175,55,0.2)]">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              IPTV Live Match Player
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
                Spain vs Argentina
              </span>
            </h2>
            <p className="text-xs text-dim">HD Stream Player with Multi-Server Switcher</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-navy-900 border border-navy-800 hover:border-gold hover:text-gold flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        
        {/* Left Column: Embedded Live Video Player */}
        <div className="flex-1 flex flex-col p-4 gap-3 bg-black/40 min-h-0 overflow-y-auto">
          
          {/* Responsive iFrame Video Container */}
          <div
            ref={playerContainerRef}
            className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-navy-800 group shadow-[0_10px_30px_rgba(0,0,0,0.7)] flex items-center justify-center"
          >
            <iframe
              key={currentChannel.id}
              title={currentChannel.name}
              src={currentChannel.embedUrl}
              className="w-full h-full border-0"
              scrolling="no"
              allowFullScreen
              allow="encrypted-media; picture-in-picture; autoplay"
            />

            {/* Top Overlay Badge */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-navy-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-navy-800 text-xs font-bold flex items-center gap-2 text-white">
                <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
                <span>LIVE: {currentChannel.name}</span>
              </div>

              <div className="bg-navy-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-navy-800 text-[10px] text-gold font-mono">
                {currentChannel.category}
              </div>
            </div>

            {/* Custom Overlay Dock */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-navy-950/90 backdrop-blur-md p-2 px-3 rounded-xl border border-navy-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pitch-bright animate-ping" />
                <span className="text-xs font-bold truncate max-w-[200px] sm:max-w-[300px]">
                  {currentChannel.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onSelectStreamForParty && (
                  <button
                    onClick={() => onSelectStreamForParty(currentChannel.embedUrl, currentChannel.name)}
                    className="flex items-center gap-1.5 bg-gold/20 border border-gold/40 text-gold hover:bg-gold hover:text-navy-950 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
                    title="Broadcast stream to Watch Party"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Watch in Party</span>
                  </button>
                )}

                <button
                  onClick={handleFullscreen}
                  className="p-1.5 rounded-lg bg-navy-900 text-white hover:text-gold transition cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Current Channel Info Card */}
          <div className="bg-navy-950/60 p-3.5 rounded-xl border border-navy-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center text-gold font-bold text-base shrink-0">
                ⚽
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{currentChannel.name}</h3>
                <p className="text-xs text-dim truncate">
                  Source: <span className="text-gold font-mono">{currentChannel.embedUrl}</span>
                </p>
              </div>
            </div>

            <a
              href={currentChannel.embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-navy-900 border border-navy-800 hover:border-gold px-3 py-1.5 rounded-xl text-xs font-bold text-dim hover:text-white transition cursor-pointer shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gold" />
              <span>Open Direct</span>
            </a>
          </div>
        </div>

        {/* Right Column: Match Server Selector & Custom iFrame Input */}
        <div className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-navy-800 bg-[#070d1c] flex flex-col min-h-0 h-[350px] lg:h-auto">
          
          <div className="p-3.5 border-b border-navy-800 bg-navy-950/60 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-dim uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-gold" />
              Match Server Links
            </span>
            <span className="text-[10px] text-gold font-mono">
              {channels.length} Available
            </span>
          </div>

          {/* Server / Stream Preset Buttons */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {channels.map((ch, idx) => {
              const isSelected = currentChannel.id === ch.id;

              return (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChannel(ch)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all border text-left cursor-pointer ${
                    isSelected
                      ? 'bg-gold/20 border-gold text-white shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                      : 'bg-navy-950/60 border-navy-800 text-dim hover:text-white hover:border-navy-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected ? 'bg-gold text-navy-950' : 'bg-navy-900 text-gold border border-navy-800'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="truncate">
                      <div className={`text-xs font-bold truncate ${isSelected ? 'text-gold-bright' : 'text-white'}`}>
                        {ch.name}
                      </div>
                      <div className="text-[10px] text-dim truncate">{ch.category}</div>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-gold shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Custom iframe / embed link input */}
          <div className="p-3 border-t border-navy-800 bg-navy-950/80 shrink-0 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-dim uppercase flex items-center gap-1">
              <Plus className="w-3 h-3 text-gold" />
              Add Custom iFrame or Embed URL:
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder='Paste <iframe src="..."> or URL'
                value={customEmbed}
                onChange={e => setCustomEmbed(e.target.value)}
                className="flex-1 bg-navy-900 border border-navy-800 focus:border-gold rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-dim outline-none"
              />
              <button
                onClick={handleAddCustomEmbed}
                className="bg-gold hover:bg-gold-bright text-navy-950 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition shrink-0"
              >
                Add
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
