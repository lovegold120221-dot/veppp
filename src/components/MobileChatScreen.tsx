import { useState, useRef, useEffect } from 'react';
import { Menu, X, Paperclip, Send, Camera, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import './styles/MobileChatScreen.css';

interface Message {
  id: string;
  sender: 'JO LERNOUT' | 'BEATRICE';
  text: string;
  timestamp: number;
  isOwn?: boolean;
}

interface MobileChatScreenProps {
  onBack: () => void;
  user: any;
}

interface Transcription {
  role: 'user' | 'model';
  text: string;
  finished?: boolean;
}

export default function MobileChatScreen({ onBack, user }: MobileChatScreenProps) {
  const [messages] = useState<Message[]>([
    {
      id: '1',
      sender: 'BEATRICE',
      text: "I'm good, boss, just her...",
      timestamp: Date.now() - 10000,
      isOwn: false
    },
    {
      id: '2',
      sender: 'JO LERNOUT',
      text: "Perfect. Get the team ready. We move in 5.",
      timestamp: Date.now() - 5000,
      isOwn: true
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<Transcription | null>(null);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isInSession, setIsInSession] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Transcription functions
  const showLiveTranscript = (role: 'user' | 'model', text: string, finished = false) => {
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    if (!normalizedText) return;

    const nextText = finished 
      ? normalizedText 
      : normalizedText;

    setCurrentTranscript({ role, text: nextText, finished });

    if (finished) {
      // Add to messages when finished
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: role === 'model' ? 'BEATRICE' : 'JO LERNOUT',
        text: nextText,
        timestamp: Date.now(),
        isOwn: role === 'user'
      };
      // In a real implementation, this would update the messages state
    }

    // Clear transcript after delay if not finished
    if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
    if (!finished) {
      transcriptTimeoutRef.current = setTimeout(() => {
        setCurrentTranscript(null);
      }, 3000);
    }
  };

  const startSession = () => {
    setIsInSession(true);
    // In a real implementation, this would start the voice session
    // For demo purposes, simulate some transcriptions
    setTimeout(() => {
      showLiveTranscript('model', "I'm here and ready to help, Boss.", false);
    }, 1000);
  };

  const stopSession = () => {
    setIsInSession(false);
    setCurrentTranscript(null);
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2" title="Go back">
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">OFFICE HISTORY</h1>
            <p className="text-xs text-gray-400">SAVED CONVERSATION RECORDS</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Caption Toggle */}
          <button 
            onClick={() => setShowCaptions(!showCaptions)}
            className={`p-2 rounded-lg transition-colors ${
              showCaptions 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-gray-800 text-gray-400'
            }`}
            title={showCaptions ? 'Hide captions' : 'Show captions'}
          >
            {showCaptions ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button className="p-2" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 px-6 py-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-green-500 text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
        >
          <Paperclip className="w-4 h-4" />
          ATTACH
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-gray-800 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
        >
          <span className="font-mono text-sm">&lt;/&gt;</span>
          BUILD
        </motion.button>
      </div>

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden">
        {/* Video Overlay */}
        <AnimatePresence>
          {showVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-black/80"
            >
              <div className="relative w-full h-full">
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
                  className="w-full h-full object-cover video-mirror"
                />
                
                {/* Video Overlay Info */}
                <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full">
                  <span className="text-xs text-green-400">● Camera Active</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcription Overlay - Always visible in chatbox during session */}
        {isInSession && currentTranscript && (
          <div className="absolute top-4 left-4 right-4 z-20">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${
                  currentTranscript.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl backdrop-blur-md ${
                    currentTranscript.role === 'user'
                      ? 'bg-cyan-950/80 border border-cyan-400/28 text-cyan-50'
                      : 'bg-black/70 border border-lime-300/18 text-zinc-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] ${
                      currentTranscript.role === 'user' 
                        ? 'bg-cyan-400/8 border border-cyan-300/25 text-cyan-200'
                        : 'bg-lime-300/8 border border-lime-300/25 text-lime-300'
                    }`}>
                      {currentTranscript.role === 'user' ? 'BOSS' : 'BEATRICE'}
                    </span>
                    <span className="text-[13px] font-semibold leading-snug">
                      {currentTranscript.text}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Chat Messages */}
        <div className="overflow-y-auto px-6 py-4 space-y-4 h-full">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                    message.isOwn
                      ? 'bg-blue-900 text-white rounded-br-sm'
                      : 'bg-gray-800 text-gray-200 rounded-bl-sm'
                  }`}
                >
                  <p className="text-xs font-semibold mb-1 opacity-70">
                    {message.sender}
                  </p>
                  <p className="text-sm">{message.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Input Bar */}
      <div className="border-t border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-400 hover:text-white transition-colors" title="Attach file">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 bg-gray-800 rounded-full px-4 py-3">
            <input
              type="text"
              placeholder="Message Beatrice..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-3 bg-green-500 rounded-full text-black"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-around py-4 border-t border-gray-800">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMuted(!isMuted)}
          className={`p-3 rounded-full transition-colors ${
            isMuted
              ? 'bg-red-500/20 text-red-500'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </motion.button>
        
        {/* Session Control Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={isInSession ? stopSession : startSession}
          className={`p-4 rounded-full text-black shadow-lg transition-all ${
            isInSession
              ? 'bg-red-500 shadow-red-500/20'
              : 'bg-green-500 shadow-green-500/20'
          }`}
        >
          {isInSession ? <Square className="w-6 h-6" /> : <div className="w-6 h-6 bg-black rounded-full" />}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleVideoToggle}
          className={`p-3 rounded-full transition-colors ${
            isVideoOff
              ? 'bg-gray-800 text-gray-400'
              : 'bg-green-500/20 text-green-500'
          }`}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </motion.button>
      </div>
    </div>
  );
}
