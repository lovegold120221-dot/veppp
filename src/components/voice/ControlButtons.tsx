import { motion } from 'motion/react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface ControlButtonsProps {
  isActive: boolean;
  connecting: boolean;
  isMuted: boolean;
  onStartSession: () => void;
  onStopSession: () => void;
  onToggleMute: () => void;
}

export function ControlButtons({
  isActive,
  connecting,
  isMuted,
  onStartSession,
  onStopSession,
  onToggleMute,
}: ControlButtonsProps) {
  return (
    <div className="absolute bottom-[36px] left-11 right-11 flex items-center justify-between">
      {/* Left: Microphone Button */}
      <button
        onClick={onToggleMute}
        className={`flex h-11 w-11 items-center justify-center rounded-full border bg-black/65 transition-all ${
          isMuted
            ? 'border-red-500/35 text-red-400'
            : 'border-lime-300/30 text-lime-300/85 hover:border-lime-300/55 hover:text-lime-200'
        }`}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>

      {/* Center: Power Button */}
      {!isActive ? (
        <button
          onClick={onStartSession}
          disabled={connecting}
          className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/[0.10] bg-black/70 text-lime-300 shadow-[0_0_24px_rgba(132,204,22,0.16)] transition-all hover:border-lime-300/40 hover:text-lime-200 active:scale-95 disabled:opacity-50"
          aria-label="Start voice session"
        >
          {connecting ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          )}
        </button>
      ) : (
        <motion.button
          onClick={onStopSession}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-lime-300/35 bg-lime-400 text-black shadow-[0_0_24px_rgba(132,204,22,0.35)] transition-all hover:bg-lime-300"
          aria-label="Stop session"
        >
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </motion.button>
      )}

      {/* Right: Spacer (for balance) */}
      <div className="h-11 w-11" />
    </div>
  );
}
