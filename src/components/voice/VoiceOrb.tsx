import { motion } from 'motion/react';

interface VoiceOrbProps {
  isActive: boolean;
  isAgentSpeaking: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  connecting: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioLevel: number;
  aiAudioLevel: number;
  orbPulse: number;
  onVideoToggle: () => void;
}

export function VoiceOrb({
  isActive,
  isAgentSpeaking,
  isMuted,
  isVideoEnabled,
  connecting,
  videoRef,
  audioLevel,
  aiAudioLevel,
  orbPulse,
  onVideoToggle,
}: VoiceOrbProps) {
  const micLevelBoosted = isMuted ? 0 : Math.min(1, audioLevel * 6);
  const aiLevelBoosted = Math.min(1, aiAudioLevel * 4.5);
  const vizLevel = !isActive
    ? 0
    : isAgentSpeaking
      ? Math.max(aiLevelBoosted, 0.18)
      : micLevelBoosted;
  const micInputLevel = vizLevel;
  const micInputBars = [0.18, 0.28, 0.42, 0.58, 0.74, 0.88, 1.0, 0.88, 0.74, 0.58, 0.42, 0.28, 0.18];

  return (
    <div className="relative flex items-center justify-center pt-2">
      {/* Ambient glow rings */}
      <div className="absolute h-[330px] w-[330px] rounded-full border border-lime-300/10" />
      <div className="absolute h-[292px] w-[292px] rounded-full bg-lime-400/10 blur-[52px]" />
      <div className="absolute h-[250px] w-[250px] rounded-full bg-emerald-400/10 blur-[34px]" />

      {/* Main orb with video overlay */}
      <motion.div
        animate={{
          scale: isActive ? 1.0 + orbPulse * 0.12 : 0.96,
          boxShadow: isActive
            ? `0 0 ${56 + orbPulse * 80}px rgba(74, 222, 128, ${0.32 + orbPulse * 0.45})`
            : '0 0 36px rgba(74, 222, 128, 0.18)',
          filter: isActive ? `brightness(${1 + orbPulse * 0.18})` : 'brightness(1)',
        }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className={`vep-orb-core relative flex h-[190px] w-[190px] items-center justify-center overflow-hidden rounded-full border border-green-300/25 ${isActive ? 'vep-orb-active' : ''}`}
      >
        {/* Video feed (mirrored) */}
        {isVideoEnabled && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover video-mirror"
          />
        )}

        {/* Idle orb image (shown when video is off) */}
        {!isVideoEnabled && !connecting && (
          <div className="vep-orb-glow absolute inset-0" />
        )}

        {/* Connecting spinner */}
        {connecting && (
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/30 border-t-black/70" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-black/50">Connecting</span>
          </div>
        )}

        {/* Active visualizer bars */}
        {isActive && !connecting && (
          <div
            className="relative z-10 flex h-full w-full items-center justify-center gap-[3px] px-3"
            style={{ ['--mic' as any]: String(micInputLevel) }}
          >
            {micInputBars.map((sensitivity, i) => (
              <span
                key={i}
                className="vep-viz-bar"
                style={{
                  ['--sens' as any]: String(sensitivity),
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Video toggle button */}
      <button
        onClick={onVideoToggle}
        className={`absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
          isVideoEnabled
            ? 'border-lime-400/55 bg-black/80 text-lime-300'
            : 'border-white/20 bg-black/50 text-white/50 hover:border-white/40'
        }`}
        aria-label={isVideoEnabled ? 'Disable video' : 'Enable video'}
        title={isVideoEnabled ? 'Disable video' : 'Enable video'}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {isVideoEnabled ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          )}
        </svg>
      </button>
    </div>
  );
}
