import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface CustomModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  title,
  message,
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onCancel
}) => {
  const isWarning = cancelText !== undefined;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-scale-in">
      <div className="m3-card max-w-[400px] w-full mx-4 p-6 sm:p-8 rounded-[28px] relative overflow-hidden border border-navy-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        
        {/* Glow decorative bubble */}
        <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
          isWarning ? 'bg-red/10' : 'bg-gold/10'
        }`} />

        <div className="flex flex-col items-center text-center select-none">
          {/* Icon container with theme color background */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 border shadow-inner ${
            isWarning 
              ? 'bg-red/15 border-red/25 text-red-500' 
              : 'bg-gold/15 border-gold/25 text-gold'
          }`}>
            {isWarning ? (
              <AlertTriangle className="w-6 h-6 text-red-500" style={{ color: 'var(--red)' }} />
            ) : (
              <ShieldAlert className="w-6 h-6 text-gold" style={{ color: 'var(--gold)' }} />
            )}
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white mb-2">
            {title}
          </h2>

          <p className="text-dim text-xs leading-relaxed mb-6 max-w-[280px]">
            {message}
          </p>

          <div className="flex gap-3 w-full">
            {onCancel && cancelText && (
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 px-5 rounded-full text-xs font-bold text-dim bg-navy-900 border border-navy-800 hover:text-white transition-all btn-bounce cursor-pointer"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`py-2.5 px-5 rounded-full text-xs font-bold transition-all btn-bounce cursor-pointer text-center btn-gold-gradient ${
                onCancel && cancelText ? 'flex-1' : 'w-full'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
