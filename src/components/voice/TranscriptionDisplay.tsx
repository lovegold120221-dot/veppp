import { motion, AnimatePresence } from 'motion/react';

type SpeakerRole = 'model' | 'user';

interface Transcript {
  role: SpeakerRole;
  text: string;
}

interface TranscriptionDisplayProps {
  currentTranscript: Transcript | null;
  showCaptions: boolean;
  getSpeakerTag: (role: SpeakerRole) => string;
}

export function TranscriptionDisplay({
  currentTranscript,
  showCaptions,
  getSpeakerTag,
}: TranscriptionDisplayProps) {
  if (!showCaptions || !currentTranscript) return null;

  return (
    <div className="mt-14 w-full max-w-[342px] space-y-3">
      {/* AI Speaking - animates left to right with speaker tag */}
      <AnimatePresence>
        {currentTranscript?.role === 'model' && (
          <motion.div
            initial={{ opacity: 0, x: -48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 48 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="flex justify-start text-left"
          >
            <div className="flex w-full items-start gap-2.5 rounded-[18px] border border-lime-300/18 bg-black/70 px-3 py-2.5 text-left text-[13px] font-semibold leading-snug text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-md">
              <span className="shrink-0 rounded-full border border-lime-300/25 bg-lime-300/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-lime-300">
                {getSpeakerTag('model')}
              </span>
              <span
                className="min-w-0 overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {currentTranscript.text}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Speaking - animates right to left with speaker tag */}
      <AnimatePresence>
        {currentTranscript?.role === 'user' && (
          <motion.div
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -48 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="flex justify-end text-right"
          >
            <div className="flex w-full items-start justify-end gap-2.5 rounded-[18px] border border-cyan-400/28 bg-cyan-950/32 px-3 py-2.5 text-right text-[13px] font-semibold leading-snug text-cyan-50 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-md">
              <span
                className="min-w-0 overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {currentTranscript.text}
              </span>
              <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-400/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200">
                {getSpeakerTag('user')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
