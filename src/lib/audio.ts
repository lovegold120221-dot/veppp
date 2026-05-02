export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private queue: Float32Array[] = [];
  private isPlaying = false;
  private sampleRate = 24000;
  private scheduledTime = 0;
  private analyser: AnalyserNode | null = null;
  private levelTimer: number | null = null;
  private onAiLevel?: (level: number) => void;

  async init(sampleRate = 24000) {
    this.sampleRate = sampleRate;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate,
    });
    // Output analyser for real-time AI playback level (0..1).
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.7;
    this.analyser.connect(this.audioContext.destination);
  }

  setAiLevelCallback(cb: (level: number) => void) {
    this.onAiLevel = cb;
    if (this.levelTimer) return;
    // Sample at ~30Hz so the visualizer reacts smoothly.
    this.levelTimer = window.setInterval(() => {
      if (!this.analyser || !this.onAiLevel) return;
      const buf = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length) / 255;
      this.onAiLevel(rms);
    }, 32);
  }

  addPCM16(base64: string) {
    if (!this.audioContext) return;
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new DataView(buffer);
    for (let i = 0; i < binary.length; i++) {
        view.setUint8(i, binary.charCodeAt(i));
    }
    const int16Array = new Int16Array(buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
    }
    this.queue.push(float32Array);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  getBufferedDurationMs() {
    if (!this.audioContext) return 0;
    const scheduledMs = Math.max(0, this.scheduledTime - this.audioContext.currentTime) * 1000;
    const queuedMs = this.queue.reduce((total, chunk) => total + (chunk.length / this.sampleRate) * 1000, 0);
    return scheduledMs + queuedMs;
  }

  private playNext() {
    if (!this.audioContext || this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const chunk = this.queue.shift()!;
    const audioBuffer = this.audioContext.createBuffer(1, chunk.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(chunk);
    
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = audioBuffer;
    if (this.analyser) {
      this.source.connect(this.analyser);
    } else {
      this.source.connect(this.audioContext.destination);
    }
    
    const currentTime = this.audioContext.currentTime;
    if (this.scheduledTime < currentTime) {
      this.scheduledTime = currentTime;
    }
    
    this.source.start(this.scheduledTime);
    this.scheduledTime += audioBuffer.duration;
    
    // Play next seamlessly, not perfect but avoids large gaps
    setTimeout(() => {
        this.playNext();
    }, (audioBuffer.duration * 1000) - 20); 
  }

  stop() {
    this.queue = [];
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {}
    }
    this.isPlaying = false;
    this.scheduledTime = 0;
    if (this.levelTimer) {
      clearInterval(this.levelTimer);
      this.levelTimer = null;
    }
    this.onAiLevel?.(0);
  }
}

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onData: (base64: string, rawData?: Float32Array) => void;
  private isPaused: boolean = false;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private onAudioLevel?: (level: number) => void;

  constructor(onData: (base64: string, rawData?: Float32Array) => void) {
    this.onData = onData;
  }

  setAudioLevelCallback(callback: (level: number) => void) {
    this.onAudioLevel = callback;
  }

  async start() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000
    });
    // Get audio with echo cancellation enabled
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      }
    });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // Add analyser for audio visualization
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.processor.onaudioprocess = (e) => {
      // Skip processing if paused (AI is speaking)
      if (this.isPaused) return;

      const input = e.inputBuffer.getChannelData(0);
      
      // Calculate audio level for visualization
      if (this.onAudioLevel && this.analyser) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS (Root Mean Square) for smooth level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = rms / 255; // Normalize to 0-1
        this.onAudioLevel(level);
      }
      
      const output = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      const buffer = new ArrayBuffer(output.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < output.length; i++) {
        view.setInt16(i * 2, output[i], true);
      }
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      this.onData(btoa(binary), input.slice()); // Pass raw audio data for emotional analysis
    };

    this.source.connect(this.analyser);
    this.analyser.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  stop() {
    this.isPaused = false;
    if (this.processor && this.audioContext) {
      this.processor.disconnect();
    }
    if (this.source && this.audioContext) {
      this.source.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.audioContext?.close();
    this.source = null;
    this.processor = null;
    this.stream = null;
    this.audioContext = null;
  }
}
