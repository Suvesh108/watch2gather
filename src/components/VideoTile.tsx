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

  return (
    <div className="relative bg-black rounded-[14px] overflow-hidden border border-navy-700 flex items-center justify-center w-full h-full min-h-[180px]">
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
        <div className="placeholder text-dim text-sm text-center p-5 max-w-sm w-full">
          {placeholder}
        </div>
      )}

      {/* Label tag */}
      {stream && (
        <div className="tag absolute left-2.5 bottom-2.5 bg-navy-950/70 backdrop-blur-[4px] py-1.5 px-2.5 rounded-md text-xs font-semibold text-white select-none">
          {label}
        </div>
      )}

      {/* Quality tag for local feed */}
      {isLocal && stream && (
        <div className="quality-tag absolute right-2.5 top-2.5 bg-pitch/85 text-[#06210c] text-[10px] font-extrabold tracking-wider py-0.5 px-2 rounded-md uppercase select-none">
          HD
        </div>
      )}

      {/* Play/Resume overlay in case of browser autoplay blocking */}
      {stream && isPaused && (
        <div 
          onClick={handlePlayClick}
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2.5 z-30 cursor-pointer select-none transition-all duration-200"
        >
          <div className="bg-navy-900/90 border border-navy-700 hover:border-gold rounded-full p-4 flex items-center justify-center shadow-lg transition-colors duration-150">
            <Play className="w-8 h-8 text-gold fill-gold animate-pulse" />
          </div>
          <span className="text-white text-xs font-semibold bg-navy-950/80 px-2.5 py-1 rounded-md border border-navy-700">
            Click to Play Stream
          </span>
        </div>
      )}
    </div>
  );
};
