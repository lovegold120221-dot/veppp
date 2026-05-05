export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  // Track EVERY scheduled source so we can stop them all on interrupt.
  // The previous design kept only `this.source` (the latest chunk), so
  // when the user barged in mid-utterance we'd silence the head while
  // earlier queued buffers kept playing — that's Martijn's "the AI
  // talks over its previous self" / echo report (#1).
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private queue: Float32Array[] = [];
  private isPlaying = false;
  private sampleRate = 24000;
  private scheduledTime = 0;
  private analyser: AnalyserNode | null = null;
  private levelRafId: number | null = null;
  private onAiLevel?: (level: number) => void;

  async init(sampleRate = 24000) {
    this.sampleRate = sampleRate;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate,
    });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.7;
    this.analyser.connect(this.audioContext.destination);
  }

  setAiLevelCallback(cb: (level: number) => void) {
    this.onAiLevel = cb;
    // The level loop now starts/stops with playback (in playNext / stop /
    // playback completion). No more 30Hz interval that runs forever and
    // contributes to phone heat (#2).
  }

  private startLevelLoop() {
    if (this.levelRafId !== null) return;
    const buf = new Uint8Array(this.analyser?.frequencyBinCount ?? 0);
    const tick = () => {
      if (!this.analyser || !this.onAiLevel) {
        this.levelRafId = null;
        return;
      }
      this.analyser.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / Math.max(1, buf.length)) / 255;
      this.onAiLevel(rms);
      // Continue only while we still have audio playing or queued.
      if (this.isPlaying || this.queue.length > 0 || this.activeSources.size > 0) {
        this.levelRafId = requestAnimationFrame(tick);
      } else {
        this.levelRafId = null;
        this.onAiLevel(0);
      }
    };
    this.levelRafId = requestAnimationFrame(tick);
  }

  private stopLevelLoop() {
    if (this.levelRafId !== null) {
      cancelAnimationFrame(this.levelRafId);
      this.levelRafId = null;
    }
    this.onAiLevel?.(0);
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

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    if (this.analyser) {
      source.connect(this.analyser);
    } else {
      source.connect(this.audioContext.destination);
    }

    const currentTime = this.audioContext.currentTime;
    if (this.scheduledTime < currentTime) {
      this.scheduledTime = currentTime;
    }

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      // Once everything has drained, stop the level loop so the
      // visualizer doesn't keep ticking idle.
      if (this.activeSources.size === 0 && this.queue.length === 0 && !this.isPlaying) {
        this.stopLevelLoop();
      }
    };

    source.start(this.scheduledTime);
    this.scheduledTime += audioBuffer.duration;

    if (this.onAiLevel) this.startLevelLoop();

    // Schedule the next chunk just before the current one ends.
    setTimeout(() => {
      this.playNext();
    }, Math.max(0, (audioBuffer.duration * 1000) - 20));
  }

  stop() {
    // Drain the queue AND silence every source we have outstanding.
    this.queue = [];
    this.activeSources.forEach((s) => {
      try { s.onended = null; } catch (e) {}
      try { s.stop(); } catch (e) {}
      try { s.disconnect(); } catch (e) {}
    });
    this.activeSources.clear();
    this.isPlaying = false;
    this.scheduledTime = 0;
    this.stopLevelLoop();
  }
}

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private monitorGain: GainNode | null = null;
  private onData: (base64: string, rawData?: Float32Array) => void;
  private isPaused: boolean = false;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private onAudioLevel?: (level: number) => void;
  private levelRafId: number | null = null;

  constructor(onData: (base64: string, rawData?: Float32Array) => void) {
    this.onData = onData;
  }

  setAudioLevelCallback(callback: (level: number) => void) {
    this.onAudioLevel = callback;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  private startLevelLoop() {
    if (this.levelRafId !== null || !this.analyser || !this.onAudioLevel) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    let lastEmit = 0;

    const tick = (now: number) => {
      if (!this.analyser || !this.onAudioLevel) {
        this.levelRafId = null;
        return;
      }

      if (!this.isPaused && now - lastEmit >= 50) {
        lastEmit = now;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        this.onAudioLevel(rms / 255);
      } else if (this.isPaused) {
        this.onAudioLevel(0);
      }

      this.levelRafId = requestAnimationFrame(tick);
    };

    this.levelRafId = requestAnimationFrame(tick);
  }

  private stopLevelLoop() {
    if (this.levelRafId !== null) {
      cancelAnimationFrame(this.levelRafId);
      this.levelRafId = null;
    }
    this.onAudioLevel?.(0);
  }

  async start() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000
    });
    
    // Enumerate devices and find a physical microphone (not system audio)
    const devices = await navigator.mediaDevices.enumerateDevices();
    const microphones = devices.filter(d => d.kind === 'audioinput' && !d.label.toLowerCase().includes('stereo mix') && !d.label.toLowerCase().includes('virtual') && !d.label.toLowerCase().includes('what you hear') && !d.label.toLowerCase().includes('loopback'));
    
    // Prefer the default microphone or first available microphone
    const preferredDevice = microphones.find(d => d.label.toLowerCase().includes('default') || d.label.toLowerCase().includes('built-in') || d.label.toLowerCase().includes('internal')) || microphones[0];
    
    // Strict required constraints (not `ideal`) — Martijn's beta feedback
    // flagged the agent triggering on background noise. `ideal` lets the
    // browser silently drop them on devices that claim partial support;
    // requiring them forces the OS DSP path on Chrome/Safari mobile and
    // cuts down the chatter that was reaching the model.
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false, // AGC chases background noise upward; keep off.
      sampleRate: { ideal: 16000 },
      channelCount: { ideal: 1 }, // Mono for speech recognition
      // Explicitly request microphone, not system audio
      deviceId: preferredDevice ? { exact: preferredDevice.deviceId } : undefined
    };
    
    // Get audio from physical microphone only
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints
    });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // Add analyser for audio visualization
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    if (!this.audioContext.audioWorklet) {
      throw new Error('AudioWorklet is not supported by this browser.');
    }

    await this.audioContext.audioWorklet.addModule('/audio-recorder-worklet.js');
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-recorder-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    this.workletNode.port.onmessage = (event) => {
      if (this.isPaused || event.data?.type !== 'audio') return;
      const pcmBuffer = event.data.pcm as ArrayBuffer | undefined;
      const rawBuffer = event.data.raw as ArrayBuffer | undefined;
      if (!pcmBuffer || !rawBuffer) return;
      this.onData(this.arrayBufferToBase64(pcmBuffer), new Float32Array(rawBuffer));
    };

    this.monitorGain = this.audioContext.createGain();
    this.monitorGain.gain.value = 0;
    this.source.connect(this.analyser);
    this.source.connect(this.workletNode);
    this.workletNode.connect(this.monitorGain);
    this.monitorGain.connect(this.audioContext.destination);
    this.startLevelLoop();
  }

  pause() {
    this.isPaused = true;
    this.workletNode?.port.postMessage({ type: 'setPaused', paused: true });
  }

  resume() {
    this.isPaused = false;
    this.workletNode?.port.postMessage({ type: 'setPaused', paused: false });
  }

  stop() {
    this.isPaused = false;
    this.stopLevelLoop();
    if (this.workletNode) {
      try { this.workletNode.port.postMessage({ type: 'setPaused', paused: true }); } catch (e) {}
      try { this.workletNode.disconnect(); } catch (e) {}
    }
    if (this.monitorGain) {
      try { this.monitorGain.disconnect(); } catch (e) {}
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch (e) {}
    }
    if (this.source) {
      try { this.source.disconnect(); } catch (e) {}
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.audioContext?.close();
    this.source = null;
    this.workletNode = null;
    this.monitorGain = null;
    this.analyser = null;
    this.stream = null;
    this.audioContext = null;
  }
}
