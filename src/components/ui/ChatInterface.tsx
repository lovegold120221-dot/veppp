import { useState, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Send, Square, X } from 'lucide-react';
import ArtifactPreview, { ArtifactData } from '../ArtifactPreview';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  speaker: string;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  currentTranscript: { role: 'user' | 'model', text: string } | null;
  audioLevel: number;
  aiAudioLevel: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isActive: boolean;
  chatInput: string;
  artifact?: ArtifactData | null;
  onCloseArtifact?: () => void;
  onSendMessage: (text: string) => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onStartSession: () => void;
  onStopSession: () => void;
  onChatInputChange: (value: string) => void;
  onSubmitChat: (e: React.FormEvent) => void;
}

export default function ChatInterface({
  messages,
  currentTranscript,
  audioLevel,
  aiAudioLevel,
  isMuted,
  isVideoEnabled,
  isActive,
  chatInput,
  artifact,
  onCloseArtifact,
  onSendMessage,
  onToggleMute,
  onToggleVideo,
  onStartSession,
  onStopSession,
  onChatInputChange,
  onSubmitChat
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full bg-[#020302]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-lime-500/20 text-lime-100 border border-lime-500/30'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
              >
                <div className="text-xs font-medium mb-1 opacity-70">
                  {message.speaker}
                </div>
                <div className="text-sm">{message.text}</div>
              </div>
            </div>
          ))}
          
          {/* Current Transcript */}
          {currentTranscript && (
            <div
              className={`flex ${currentTranscript.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 animate-pulse ${
                  currentTranscript.role === 'user'
                    ? 'bg-lime-500/20 text-lime-100 border border-lime-500/30'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
              >
                <div className="text-sm">{currentTranscript.text}</div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Artifact Preview - Shows HTML documents, contracts, etc. */}
      {artifact && onCloseArtifact && (
        <div className="absolute inset-0 z-50 bg-black/90 p-4">
          <div className="relative h-full">
            <button
              onClick={onCloseArtifact}
              className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              title="Close artifact preview"
              aria-label="Close artifact preview"
            >
              <X className="h-4 w-4" />
            </button>
            <ArtifactPreview artifact={artifact} onClose={onCloseArtifact} />
          </div>
        </div>
      )}

      {/* Audio Level Indicators */}
      {(isActive || audioLevel > 0) && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-4">
            {/* User Audio Level */}
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-lime-400" />
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-4 rounded-full transition-all ${
                      i < Math.floor(audioLevel * 5)
                        ? 'bg-lime-400'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* AI Audio Level */}
            {aiAudioLevel > 0 && (
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-blue-400" />
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-4 rounded-full transition-all ${
                        i < Math.floor(aiAudioLevel * 5)
                          ? 'bg-blue-400'
                          : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Input + Video + Session Controls in one bar */}
      <div className="border-t border-white/10 bg-black/50 px-4 py-4">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* Video Toggle — inside the chatbox, next to the text input */}
          <button
            onClick={onToggleVideo}
            title={isVideoEnabled ? 'Stop video' : 'Start video'}
            aria-label={isVideoEnabled ? 'Stop video' : 'Start video'}
            className={`shrink-0 p-2.5 rounded-full transition-colors ${
              isVideoEnabled
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </button>

          {/* Text Input */}
          <form onSubmit={onSubmitChat} className="flex-1 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              placeholder={isActive ? "Type or speak your message..." : "Type your message..."}
              className="flex-1 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-lime-400/50"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              title="Send message"
              aria-label="Send message"
              className="p-2 rounded-full bg-lime-500 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-lime-400 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Mute Toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className={`shrink-0 p-2.5 rounded-full transition-colors ${
              isMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {/* Start/Stop Session */}
          {!isActive ? (
            <button
              onClick={onStartSession}
              className="shrink-0 px-4 py-2 rounded-full bg-lime-500 text-black font-medium hover:bg-lime-400 transition-colors"
            >
              Start
            </button>
          ) : (
            <button
              onClick={onStopSession}
              className="shrink-0 px-4 py-2 rounded-full bg-red-500 text-white font-medium hover:bg-red-400 transition-colors"
            >
              <Square className="h-4 w-4 inline mr-1" />
              Stop
            </button>
          )}

          {/* Status Indicator */}
          <div className="shrink-0 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isActive ? 'bg-lime-400 animate-pulse' : 'bg-white/30'
            }`} />
            <span className="text-sm text-white/70">
              {isActive ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
