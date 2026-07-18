import React, { useEffect, useRef, useState } from 'react';
import { Play, Sparkles } from 'lucide-react';

interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  isLocal: boolean;
  muted?: boolean;
  placeholder?: React.ReactNode;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  label,
  isLocal,
  muted = false,
  placeholder = 'Waiting for connection…',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => setIsPaused(false))
        .catch(err => console.error("Click-to-play failed:", err));
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (stream) {
        video.srcObject = stream;
        video.play().catch(err => {
          console.warn("Autoplay block or playback error:", err);
          setIsPaused(true);
        });
      } else {
        video.srcObject = null;
      }
    }
  }, [stream]);

  // Extract initials for placeholder visual avatar
  const getInitials = (nameStr: string) => {
    const cleanStr = nameStr.replace(/\s*\(you\)\s*|\[Shared Screen\]/gi, '').trim();
    if (!cleanStr) return 'WC';
    return cleanStr.substring(0, 2).toUpperCase();
  };

  return (
    <div className="relative bg-navy-950 rounded-2xl overflow-hidden border border-navy-800/80 flex items-center justify-center w-full h-full shadow-lg group transition duration-200 hover:border-navy-700/80">
      
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
          onPause={() => setIsPaused(true)}
          onPlay={() => setIsPaused(false)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-navy-900 to-navy-950 p-5 relative select-none">
          {typeof placeholder === 'string' ? (
            <div className="flex flex-col items-center gap-3.5 text-center">
              {/* Premium Avatar Indicator */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-navy-800 to-navy-700 border border-navy-600 flex items-center justify-center text-gold font-teko text-2xl shadow-inner animate-float">
                {getInitials(label)}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-white text-xs font-bold">{label}</span>
                <span className="text-dim text-[10px] uppercase tracking-wider font-semibold">{placeholder}</span>
              </div>
            </div>
          ) : (
            placeholder
          )}
        </div>
      )}

      {/* Label Badge Overlay */}
      {stream && (
        <div className="absolute left-3 bottom-3 z-20 bg-navy-950/80 backdrop-blur-md border border-white/5 py-1.5 px-3 rounded-full text-xs font-bold text-white shadow-lg select-none flex items-center gap-1.5 transition duration-150 group-hover:border-gold/30">
          <span className={`w-1.5 h-1.5 rounded-full ${isLocal ? 'bg-gold animate-pulse' : 'bg-pitch-bright'}`} />
          {label}
        </div>
      )}

      {/* Premium HD / Screen Share Quality Badge */}
      {stream && (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 select-none">
          <div className="bg-navy-950/80 backdrop-blur-md border border-white/5 py-1 px-2.5 rounded-full text-[9px] font-extrabold tracking-wider text-gold-bright uppercase flex items-center gap-1 shadow-lg">
            <Sparkles className="w-2.5 h-2.5 text-gold" />
            <span>{label.includes('Screen') ? '1080P' : '720P HD'}</span>
          </div>
        </div>
      )}

      {/* Autoplay play block recovery screen */}
      {stream && isPaused && (
        <div 
          onClick={handlePlayClick}
          className="absolute inset-0 bg-black/75 backdrop-blur-[4px] flex flex-col items-center justify-center gap-3 z-30 cursor-pointer select-none transition-all duration-200 animate-scale-in"
        >
          <div className="bg-navy-900/90 border border-navy-700 hover:border-gold rounded-2xl p-4 flex items-center justify-center shadow-2xl transition-all duration-150 active:scale-90">
            <Play className="w-6 h-6 text-gold fill-gold animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-white text-xs font-bold">Autoplay Blocked</span>
            <span className="text-dim text-[10px] uppercase tracking-wider font-semibold">Click to resume party stream</span>
          </div>
        </div>
      )}
    </div>
  );
};
