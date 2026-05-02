export interface EmotionalState {
  primary: 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'disgusted' | 'neutral';
  intensity: number; // 0-1 scale
  confidence: number; // 0-1 scale
  secondary?: 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'disgusted' | 'neutral';
  arousal: number; // 0-1 scale (calm to excited)
  valence: number; // -1 to 1 (negative to positive)
}

export interface AudioEmotionalFeatures {
  pitch: {
    mean: number;
    variance: number;
    range: number;
  };
  energy: {
    mean: number;
    variance: number;
    peak: number;
  };
  tempo: {
    speechRate: number; // words per minute
    pauseFrequency: number; // pauses per minute
    averagePauseDuration: number; // seconds
  };
  vocalQuality: {
    breathiness: number; // 0-1
    harshness: number; // 0-1
    tremor: number; // 0-1
  };
}

export interface EmotionalContext {
  currentState: EmotionalState;
  previousStates: EmotionalState[];
  trend: 'improving' | 'declining' | 'stable' | 'fluctuating';
  persistence: number; // how long current state has persisted
  triggers: string[]; // detected emotional triggers
}

class EmotionalSynthesizer {
  private static instance: EmotionalSynthesizer;
  private emotionalHistory: EmotionalState[] = [];
  private maxHistoryLength = 10;

  static getInstance(): EmotionalSynthesizer {
    if (!EmotionalSynthesizer.instance) {
      EmotionalSynthesizer.instance = new EmotionalSynthesizer();
    }
    return EmotionalSynthesizer.instance;
  }

  // Analyze audio features to extract emotional information
  analyzeAudioFeatures(audioData: Float32Array, sampleRate: number): AudioEmotionalFeatures {
    // Extract pitch information
    const pitchFeatures = this.extractPitchFeatures(audioData, sampleRate);
    
    // Extract energy/loudness information
    const energyFeatures = this.extractEnergyFeatures(audioData);
    
    // Extract tempo and timing information
    const tempoFeatures = this.extractTempoFeatures(audioData, sampleRate);
    
    // Extract vocal quality features
    const vocalFeatures = this.extractVocalQualityFeatures(audioData, sampleRate);

    return {
      pitch: pitchFeatures,
      energy: energyFeatures,
      tempo: tempoFeatures,
      vocalQuality: vocalFeatures
    };
  }

  // Convert audio features to emotional state
  synthesizeEmotion(features: AudioEmotionalFeatures): EmotionalState {
    const emotion = this.predictEmotionFromFeatures(features);
    
    // Add to history
    this.emotionalHistory.push(emotion);
    if (this.emotionalHistory.length > this.maxHistoryLength) {
      this.emotionalHistory.shift();
    }

    return emotion;
  }

  // Get emotional context including trends and patterns
  getEmotionalContext(): EmotionalContext {
    if (this.emotionalHistory.length === 0) {
      return {
        currentState: this.createNeutralState(),
        previousStates: [],
        trend: 'stable',
        persistence: 0,
        triggers: []
      };
    }

    const currentState = this.emotionalHistory[this.emotionalHistory.length - 1];
    const previousStates = this.emotionalHistory.slice(0, -1);
    
    return {
      currentState,
      previousStates,
      trend: this.analyzeTrend(),
      persistence: this.calculatePersistence(),
      triggers: this.identifyTriggers()
    };
  }

  // Generate empathetic response suggestions based on emotional state
  generateEmpatheticResponse(emotion: EmotionalState, context: EmotionalContext): string {
    const responsePatterns = this.getEmpatheticPatterns(emotion, context);
    return this.selectResponsePattern(responsePatterns, context);
  }

  // Private methods for feature extraction
  private extractPitchFeatures(audioData: Float32Array, sampleRate: number): { mean: number; variance: number; range: number } {
    // Simplified pitch extraction - in production, use more sophisticated algorithms
    const pitches: number[] = [];
    const frameSize = Math.floor(sampleRate * 0.02); // 20ms frames
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
      const frame = audioData.slice(i, i + frameSize);
      const pitch = this.estimatePitch(frame, sampleRate);
      if (pitch > 0) {
        pitches.push(pitch);
      }
    }

    if (pitches.length === 0) {
      return { mean: 0, variance: 0, range: 0 };
    }

    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pitches.length;
    const range = Math.max(...pitches) - Math.min(...pitches);

    return { mean, variance, range };
  }

  private extractEnergyFeatures(audioData: Float32Array): { mean: number; variance: number; peak: number } {
    const frameSize = 1024;
    const energies: number[] = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
      const frame = audioData.slice(i, i + frameSize);
      const energy = frame.reduce((a, b) => a + b * b, 0) / frameSize;
      energies.push(energy);
    }

    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    const variance = energies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / energies.length;
    const peak = Math.max(...energies);

    return { mean, variance, peak };
  }

  private extractTempoFeatures(audioData: Float32Array, sampleRate: number): { speechRate: number; pauseFrequency: number; averagePauseDuration: number } {
    // Simplified tempo analysis - detect speech vs silence
    const threshold = 0.01;
    const frameSize = Math.floor(sampleRate * 0.01); // 10ms frames
    let speechFrames = 0;
    let pauseCount = 0;
    let currentPauseDuration = 0;
    const pauseDurations: number[] = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
      const frame = audioData.slice(i, i + frameSize);
      const energy = frame.reduce((a, b) => a + b * b, 0) / frameSize;
      
      if (energy > threshold) {
        speechFrames++;
        if (currentPauseDuration > 0) {
          pauseDurations.push(currentPauseDuration * 0.01); // convert to seconds
          pauseCount++;
          currentPauseDuration = 0;
        }
      } else {
        currentPauseDuration++;
      }
    }

    const totalDuration = audioData.length / sampleRate;
    const speechRate = (speechFrames * frameSize / sampleRate) / totalDuration * 60; // rough estimate
    const pauseFrequency = pauseCount / totalDuration * 60;
    const averagePauseDuration = pauseDurations.length > 0 ? 
      pauseDurations.reduce((a, b) => a + b, 0) / pauseDurations.length : 0;

    return { speechRate, pauseFrequency, averagePauseDuration };
  }

  private extractVocalQualityFeatures(audioData: Float32Array, sampleRate: number): { breathiness: number; harshness: number; tremor: number } {
    // Simplified vocal quality analysis
    const frameSize = Math.floor(sampleRate * 0.02);
    let breathiness = 0;
    let harshness = 0;
    let tremor = 0;
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
      const frame = audioData.slice(i, i + frameSize);
      
      // Breathiness: ratio of high-frequency energy to total energy
      const fft = this.simpleFFT(frame);
      const highFreqEnergy = fft.slice(Math.floor(fft.length * 0.5)).reduce((a, b) => a + b, 0);
      const totalEnergy = fft.reduce((a, b) => a + b, 0);
      breathiness += highFreqEnergy / (totalEnergy + 0.001);
      
      // Harshness: spectral irregularity
      const spectralSlope = this.calculateSpectralSlope(fft);
      harshness += Math.abs(spectralSlope);
      
      // Tremor: low-frequency amplitude modulation
      const envelope = this.getEnvelope(frame);
      const lowFreqModulation = this.extractLowFrequencyModulation(envelope);
      tremor += lowFreqModulation;
    }

    const numFrames = Math.floor(audioData.length / frameSize);
    return {
      breathiness: Math.min(breathiness / numFrames, 1),
      harshness: Math.min(harshness / numFrames, 1),
      tremor: Math.min(tremor / numFrames, 1)
    };
  }

  private predictEmotionFromFeatures(features: AudioEmotionalFeatures): EmotionalState {
    // Simplified emotion prediction based on audio features
    let primary: EmotionalState['primary'] = 'neutral';
    let intensity = 0.5;
    let confidence = 0.7;
    let arousal = 0.5;
    let valence = 0;

    // High pitch variance + high energy = excited/positive
    if (features.pitch.variance > 50 && features.energy.mean > 0.1) {
      primary = 'happy';
      valence = 0.7;
      arousal = 0.8;
      intensity = 0.8;
    }
    // Low pitch + low energy = sad
    else if (features.pitch.mean < 150 && features.energy.mean < 0.05) {
      primary = 'sad';
      valence = -0.6;
      arousal = 0.3;
      intensity = 0.7;
    }
    // High energy + harsh voice = angry
    else if (features.energy.peak > 0.5 && features.vocalQuality.harshness > 0.7) {
      primary = 'angry';
      valence = -0.4;
      arousal = 0.9;
      intensity = 0.8;
    }
    // Fast speech + high pitch variance = surprised
    else if (features.tempo.speechRate > 200 && features.pitch.variance > 30) {
      primary = 'surprised';
      valence = 0.3;
      arousal = 0.9;
      intensity = 0.6;
    }
    // Low speech rate + breathy voice = fearful
    else if (features.tempo.speechRate < 100 && features.vocalQuality.breathiness > 0.6) {
      primary = 'fearful';
      valence = -0.5;
      arousal = 0.7;
      intensity = 0.6;
    }

    return { primary, intensity, confidence, arousal, valence };
  }

  private analyzeTrend(): EmotionalContext['trend'] {
    if (this.emotionalHistory.length < 3) return 'stable';
    
    const recent = this.emotionalHistory.slice(-3);
    const valenceTrend = recent.map(e => e.valence);
    
    if (valenceTrend[2] > valenceTrend[1] && valenceTrend[1] > valenceTrend[0]) {
      return 'improving';
    } else if (valenceTrend[2] < valenceTrend[1] && valenceTrend[1] < valenceTrend[0]) {
      return 'declining';
    } else if (Math.abs(valenceTrend[2] - valenceTrend[0]) > 0.5) {
      return 'fluctuating';
    }
    
    return 'stable';
  }

  private calculatePersistence(): number {
    if (this.emotionalHistory.length === 0) return 0;
    
    const current = this.emotionalHistory[this.emotionalHistory.length - 1];
    let persistence = 1;
    
    for (let i = this.emotionalHistory.length - 2; i >= 0; i--) {
      if (this.emotionalHistory[i].primary === current.primary) {
        persistence++;
      } else {
        break;
      }
    }
    
    return persistence;
  }

  private identifyTriggers(): string[] {
    // Simplified trigger detection based on emotional changes
    const triggers: string[] = [];
    
    if (this.emotionalHistory.length >= 2) {
      const prev = this.emotionalHistory[this.emotionalHistory.length - 2];
      const curr = this.emotionalHistory[this.emotionalHistory.length - 1];
      
      if (prev.primary !== curr.primary) {
        triggers.push(`emotion_changed_from_${prev.primary}_to_${curr.primary}`);
      }
      
      if (Math.abs(curr.valence - prev.valence) > 0.5) {
        triggers.push('significant_valence_shift');
      }
      
      if (Math.abs(curr.arousal - prev.arousal) > 0.5) {
        triggers.push('arousal_level_changed');
      }
    }
    
    return triggers;
  }

  private getEmpatheticPatterns(emotion: EmotionalState, context: EmotionalContext): string[] {
    const patterns: string[] = [];
    
    switch (emotion.primary) {
      case 'sad':
        patterns.push(
          "Hey, I can hear you're feeling down. Want to talk about what's on your mind?",
          "You sound like you're going through something tough. I'm here to listen.",
          "I notice you seem a bit low today. Everything okay with you?"
        );
        break;
      case 'angry':
        patterns.push(
          "Whoa, I can hear you're frustrated. What's got you so fired up?",
          "You sound pretty worked up. Want to vent about it?",
          "I can tell something's really bothering you. What happened?"
        );
        break;
      case 'fearful':
        patterns.push(
          "You sound worried. Is everything alright?",
          "Hey, I can hear some anxiety in your voice. What's going on?",
          "You seem a bit on edge. Want to talk through it?"
        );
        break;
      case 'happy':
        patterns.push(
          "You sound really upbeat! What's got you in such a good mood?",
          "I can hear the excitement in your voice! Share the good news!",
          "You sound genuinely happy today. What's making you smile?"
        );
        break;
      case 'surprised':
        patterns.push(
          "Whoa, you sound surprised! What just happened?",
          "I can hear the shock in your voice. What's going on?",
          "You seem really taken aback. What happened?"
        );
        break;
      default:
        patterns.push(
          "How are you feeling today?",
          "What's on your mind?",
          "How can I help you right now?"
        );
    }
    
    return patterns;
  }

  private selectResponsePattern(patterns: string[], context: EmotionalContext): string {
    // Select pattern based on context and previous interactions
    if (context.trend === 'declining' && context.currentState.valence < -0.3) {
      // Prioritize supportive responses for declining negative emotions
      return patterns.find(p => p.includes('listen') || p.includes('here')) || patterns[0];
    }
    
    return patterns[0];
  }

  private createNeutralState(): EmotionalState {
    return {
      primary: 'neutral',
      intensity: 0.5,
      confidence: 0.5,
      arousal: 0.5,
      valence: 0
    };
  }

  // Utility methods
  private estimatePitch(signal: Float32Array, sampleRate: number): number {
    // Simplified pitch estimation using autocorrelation
    const minPeriod = Math.floor(sampleRate / 800); // 800 Hz max
    const maxPeriod = Math.floor(sampleRate / 80);  // 80 Hz min
    
    let bestPeriod = 0;
    let bestCorrelation = 0;
    
    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0;
      for (let i = 0; i < signal.length - period; i++) {
        correlation += signal[i] * signal[i + period];
      }
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }
    
    return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
  }

  private simpleFFT(signal: Float32Array): Float32Array {
    // Simplified FFT - in production, use proper FFT library
    const result = new Float32Array(signal.length);
    for (let i = 0; i < signal.length; i++) {
      result[i] = Math.abs(signal[i]);
    }
    return result;
  }

  private calculateSpectralSpectrum(fft: Float32Array): number {
    return fft.reduce((a, b) => a + b, 0) / fft.length;
  }

  private calculateSpectralSlope(fft: Float32Array): number {
    // Simplified spectral slope calculation
    const halfLength = Math.floor(fft.length / 2);
    const lowFreq = fft.slice(0, halfLength / 2).reduce((a, b) => a + b, 0) / (halfLength / 2);
    const highFreq = fft.slice(halfLength / 2).reduce((a, b) => a + b, 0) / (halfLength / 2);
    return (highFreq - lowFreq) / (lowFreq + 0.001);
  }

  private getEnvelope(signal: Float32Array): Float32Array {
    const envelope = new Float32Array(signal.length);
    const windowSize = 100;
    
    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      for (let j = Math.max(0, i - windowSize / 2); j < Math.min(signal.length, i + windowSize / 2); j++) {
        sum += Math.abs(signal[j]);
      }
      envelope[i] = sum / windowSize;
    }
    
    return envelope;
  }

  private extractLowFrequencyModulation(envelope: Float32Array): number {
    // Simplified low-frequency modulation extraction
    const frameSize = 100;
    let modulation = 0;
    
    for (let i = 0; i < envelope.length - frameSize; i += frameSize) {
      const frame = envelope.slice(i, i + frameSize);
      const mean = frame.reduce((a, b) => a + b, 0) / frameSize;
      const variance = frame.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / frameSize;
      modulation += variance;
    }
    
    return modulation / (envelope.length / frameSize);
  }
}

export default EmotionalSynthesizer;
