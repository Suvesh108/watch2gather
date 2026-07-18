import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

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
  placeholder = 'Camera off',
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

  const getInitials = (nameStr: string) => {
    const cleanStr = nameStr.replace(/\s*\(you\)\s*|\[Shared Screen\]/gi, '').trim();
    if (!cleanStr) return 'WC';
    return cleanStr.substring(0, 2).toUpperCase();
  };

  return (
    <div className="relative bg-[#171717] rounded-2xl overflow-hidden border border-[#3c4043] flex items-center justify-center w-full h-full group shadow-md transition duration-200">
      
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
          onPause={() => setIsPaused(true)}
          onPlay={() => setIsPaused(false)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-5 relative select-none">
          {typeof placeholder === 'string' ? (
            <div className="flex flex-col items-center gap-3.5 text-center">
              {/* Clean Google-Meet circular avatar */}
              <div className="w-16 h-16 rounded-full bg-[#3c4043] flex items-center justify-center text-white text-xl font-medium shadow">
                {getInitials(label)}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-white text-xs font-semibold">{label}</span>
                <span className="text-[#9aa0a6] text-[10px] uppercase tracking-wider">{placeholder}</span>
              </div>
            </div>
          ) : (
            placeholder
          )}
        </div>
      )}

      {/* Clean label overlay (Google Meet style) */}
      {stream && (
        <div className="absolute left-3 bottom-3 z-20 bg-[#202124]/85 border border-[#3c4043]/30 py-1 px-3 rounded-lg text-xs font-medium text-white shadow-md select-none flex items-center gap-2">
          {isLocal && <span className="w-1.5 h-1.5 rounded-full bg-[#81c995]" />}
          {label}
        </div>
      )}

      {/* Autoplay block recovery overlay */}
      {stream && isPaused && (
        <div 
          onClick={handlePlayClick}
          className="absolute inset-0 bg-[#202124]/90 flex flex-col items-center justify-center gap-3.5 z-30 cursor-pointer select-none transition-all duration-200 animate-scale-in"
        >
          <div className="bg-[#3c4043] border border-[#5f6368] rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition duration-150 hover:bg-[#4e5256] active:scale-90">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-white text-xs font-medium">Autoplay blocked</span>
            <span className="text-[#9aa0a6] text-[10px] uppercase tracking-wider">Click to play video stream</span>
          </div>
        </div>
      )}
    </div>
  );
};
