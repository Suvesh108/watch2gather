import React, { useEffect, useState } from 'react';
import type { CelebrationEvent } from '../hooks/usePeerConnection';

interface CelebrationOverlayProps {
  celebration: CelebrationEvent | null;
}

interface ConfettiPiece {
  id: number;
  left: string;
  background: string;
  duration: string;
  delay: string;
  rotation: string;
}

const CEL_CONFIG: Record<string, { text: string; color: string; confetti: boolean }> = {
  goal:   {text:"GOOAAAL!", color:"var(--gold-bright)", confetti:true},
  save:   {text:"WHAT A SAVE!", color:"#7ec8e3", confetti:false},
  card:   {text:"BOOKED!", color:"#f2d94e", confetti:false},
  fire:   {text:"ON FIRE 🔥", color:"#ff6b4a", confetti:true},
  clap:   {text:"CLASS!", color:"#f5f3ee", confetti:false},
  trophy: {text:"CHAMPIONS!", color:"var(--gold-bright)", confetti:true}
};

const CONFETTI_COLORS = ["#e8b44c", "#f4cd6e", "#3fa34d", "#f5f3ee", "#e1543d"];

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ celebration }) => {
  const [visible, setVisible] = useState(false);
  const [currentCel, setCurrentCel] = useState<CelebrationEvent | null>(null);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (celebration) {
      setCurrentCel(celebration);
      setVisible(true);

      const cfg = CEL_CONFIG[celebration.kind];
      if (cfg && cfg.confetti) {
        const pieces: ConfettiPiece[] = [];
        for (let i = 0; i < 60; i++) {
          pieces.push({
            id: i,
            left: Math.random() * 100 + "vw",
            background: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            duration: (2 + Math.random() * 1.5).toFixed(2) + "s",
            delay: (Math.random() * 0.4).toFixed(2) + "s",
            rotation: `rotate(${Math.floor(Math.random() * 360)}deg)`
          });
        }
        setConfettiPieces(pieces);
      } else {
        setConfettiPieces([]);
      }

      const timer = setTimeout(() => {
        setVisible(false);
      }, 1800);

      return () => clearTimeout(timer);
    }
  }, [celebration]);

  if (!visible || !currentCel) return null;

  const cfg = CEL_CONFIG[currentCel.kind];
  if (!cfg) return null;

  return (
    <div id="overlay" className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <style>{`
        @keyframes burstIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(-6deg); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1.08) rotate(2deg); }
          25% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
        }
        @keyframes fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0.2; }
        }
        .celebration-burst-text {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.4);
          font-family: 'Teko', sans-serif;
          font-weight: 700;
          text-shadow: 0 0 30px rgba(232, 180, 76, 0.8), 0 6px 0 rgba(0, 0, 0, 0.4);
          opacity: 0;
          animation: burstIn 1.8s cubic-bezier(.2, 1.4, .4, 1) forwards;
          white-space: nowrap;
        }
        .confetti-piece {
          position: absolute;
          top: -20px;
          width: 10px;
          height: 16px;
          opacity: 0.95;
          animation: fall linear forwards;
        }
      `}</style>

      {/* Render text burst */}
      <div
        className="celebration-burst-text text-[64px] md:text-[120px]"
        style={{ color: cfg.color }}
      >
        {cfg.text}
      </div>

      {/* Render confetti */}
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: piece.left,
            background: piece.background,
            animationDuration: piece.duration,
            animationDelay: piece.delay,
            transform: piece.rotation,
          }}
        />
      ))}
    </div>
  );
};
