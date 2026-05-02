import { useState, useRef, useEffect } from 'react';
import { Menu, Mic, MicOff, Camera, VideoOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import './styles/MobileMainScreen.css';

interface MobileMainScreenProps {
  onChat: () => void;
  user: any;
  onLogout: () => void;
  settings: any;
}

export default function MobileMainScreen({ onChat, user, onLogout, settings }: MobileMainScreenProps) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handlePowerToggle = () => {
    setIsActive(!isActive);
    if (!isActive) {
      // Start session
      setTimeout(() => {
        setIsSpeaking(true);
        setTranscript("I'm good, boss, just her...");
        setTimeout(() => {
          setIsSpeaking(false);
          setTranscript('');
        }, 3000);
      }, 1000);
    } else {
      // Stop session
      setIsSpeaking(false);
      setTranscript('');
    }
  };

  const handleVideoToggle = async () => {
    if (!isVideoOff) {
      // Turn off video
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsVideoOff(true);
      setShowVideo(false);
    } else {
      // Turn on video
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        
        streamRef.current = stream;
        setIsVideoOff(false);
        setShowVideo(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        // Could show an error message to user here
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden">
      {/* Status Bar */}
      <div className="flex justify-between items-center px-6 pt-3 pb-2 text-white text-xs">
        <span>12:04 AM</span>
        <div className="flex gap-1">
          <div className="w-4 h-3 border border-white rounded-sm">
            <div className="w-2 h-1.5 bg-white rounded-sm m-0.5"></div>
          </div>
          <div className="w-4 h-3 border border-white rounded-sm">
            <div className="w-3 h-2 bg-white rounded-sm m-0.5"></div>
          </div>
          <div className="w-4 h-3 border border-white rounded-sm">
            <div className="w-3 h-2 bg-green-500 rounded-sm m-0.5"></div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <button className="p-2 rounded-xl border border-gray-800" title="Menu">
          <Menu className="w-5 h-5" />
        </button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onChat}
          className="px-4 py-2 bg-gray-800 rounded-full text-sm font-medium"
          title="Open chat"
        >
          SPEAKING...
        </motion.button>
        
        <button className="p-2 rounded-full border border-gray-800" title="Status">
          <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full"></div>
        </button>
      </div>

      {/* Main Content - Video or Orb */}
      <div className="flex-1 flex items-center justify-center relative">
        <AnimatePresence mode="wait">
          {showVideo ? (
            <motion.div
              key="video"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full h-full flex items-center justify-center"
            >
              {/* Video Close Button */}
              <button
                onClick={handleVideoToggle}
                className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                title="Close video"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-2xl video-mirror"
              />
              
              {/* Video Overlay Info */}
              <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full">
                <span className="text-xs text-green-400">● Camera Active</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="orb"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center"
            >
              {/* Background circles */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-96 h-96 border border-white/[0.02] rounded-full"></div>
                <div className="w-[28rem] h-[28rem] border border-white/[0.01] rounded-full absolute"></div>
              </div>

              {/* Glowing Orb */}
              <div className="relative">
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: isSpeaking ? 0.6 : 0.3, 
                        scale: isSpeaking ? 1.3 : 1.1,
                        rotate: 360
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 w-64 h-64 rounded-full bg-gradient-to-tr from-green-500/30 via-emerald-500/20 to-transparent blur-[80px]"
                    />
                  )}
                </AnimatePresence>
                
                <motion.div
                  animate={{
                    borderColor: isActive ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255,255,255,0.05)',
                    boxShadow: isActive ? '0 0 60px rgba(34, 197, 94, 0.2)' : '0 0 0px transparent'
                  }}
                  className="relative w-64 h-64 rounded-full bg-[#0a0a0b] border flex items-center justify-center overflow-hidden"
                >
                  {/* Inner grid pattern */}
                  <div className="decorative-grid-overlay" />
                  
                  {isActive ? (
                    <div className="flex gap-2 items-end h-16">
                      {[0.4, 0.5, 0.3, 0.6, 0.45, 0.55].map((delay, i) => (
                        <motion.div
                          key={i}
                          animate={{ 
                            height: isSpeaking ? ['20px', '60px', '20px'] : '12px',
                            opacity: isSpeaking ? 1 : 0.4
                          }}
                          transition={{ duration: delay, repeat: Infinity, delay: i * 0.1 }}
                          className="w-2 bg-green-500 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-2 shadow-[0_0_30px_rgba(34,197,94,0.4)]"></div>
                      <div className="w-8 h-0.5 bg-gray-700 rounded-full"></div>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transcript Display */}
      <AnimatePresence mode="wait">
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-6 py-4 text-center"
          >
            <div className="bg-gray-800/80 backdrop-blur rounded-2xl px-4 py-3 inline-block">
              <p className="text-sm text-green-400 font-medium mb-1">BEATRICE</p>
              <p className="text-white">{transcript}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="flex items-center justify-around py-8 px-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full transition-all ${
            isMuted
              ? 'bg-red-500/20 text-red-500 border border-red-500/30'
              : 'bg-[#0a0a0b] border border-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePowerToggle}
          className="relative"
        >
          <div className="absolute -inset-4 bg-green-500/10 rounded-full blur-xl opacity-0 hover:opacity-100 transition-opacity"></div>
          <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isActive 
              ? 'bg-red-500/20 border border-red-500/30' 
              : 'bg-[#0a0a0b] border border-gray-800 hover:border-green-500/50'
          }`}>
            <div className={`w-8 h-8 rounded-full ${
              isActive 
                ? 'bg-red-500' 
                : 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]'
            }`}></div>
          </div>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleVideoToggle}
          className={`p-4 rounded-full transition-all ${
            isVideoOff
              ? 'bg-[#0a0a0b] border border-gray-800 text-gray-400 hover:text-white'
              : 'bg-green-500/20 text-green-500 border border-green-500/30'
          }`}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
        </motion.button>
      </div>
    </div>
  );
}
