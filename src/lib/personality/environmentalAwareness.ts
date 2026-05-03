import { BeatricePersonality, EnvironmentContext, BeatriceUtteranceMode, EmotionalState } from './beatricePersonality';

export interface NoiseDetection {
  type: 'background' | 'speech' | 'music' | 'traffic' | 'baby' | 'construction' | 'unknown';
  level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  timestamp: number;
  duration: number;
}

export interface LocationInference {
  location: 'office' | 'home' | 'outdoor' | 'vehicle' | 'public' | 'unknown';
  confidence: number; // 0-1
  indicators: string[];
}

export interface EnvironmentalResponse {
  shouldAcknowledge: boolean;
  utterance?: string;
  newMode?: BeatriceUtteranceMode;
  newEmotion?: EmotionalState;
  shouldAdjustVolume?: boolean;
  shouldSlowDown?: boolean;
}

export class EnvironmentalAwareness {
  private personality: BeatricePersonality;
  private noiseHistory: NoiseDetection[] = [];
  private currentContext: EnvironmentContext;
  private maxHistorySize: number = 100;
  private acknowledgmentCooldown: Map<string, number> = new Map();

  constructor(personality: BeatricePersonality) {
    this.personality = personality;
    this.currentContext = {
      detectedNoise: [],
      possiblePeople: false,
      possibleBaby: false,
      possibleRoad: false,
      backgroundActivity: 'quiet'
    };
  }

  // Process new audio data for environmental awareness
  processAudioData(audioData: any): EnvironmentalResponse {
    // Analyze audio for noise patterns
    const noiseDetections = this.analyzeAudio(audioData);
    
    // Update noise history
    this.updateNoiseHistory(noiseDetections);
    
    // Infer location
    const locationInference = this.inferLocation();
    
    // Update current context
    this.updateEnvironmentalContext(noiseDetections, locationInference);
    
    // Generate response if needed
    return this.generateEnvironmentalResponse(noiseDetections, locationInference);
  }

  private analyzeAudio(audioData: any): NoiseDetection[] {
    // This would integrate with actual audio analysis
    // For now, simulate noise detection based on patterns
    
    const detections: NoiseDetection[] = [];
    const now = Date.now();

    // Simulate different noise types based on audio characteristics
    if (this.detectBabyCry(audioData)) {
      detections.push({
        type: 'baby',
        level: 'high',
        confidence: 0.8,
        timestamp: now,
        duration: 2000
      });
    }

    if (this.detectTrafficNoise(audioData)) {
      detections.push({
        type: 'traffic',
        level: 'medium',
        confidence: 0.7,
        timestamp: now,
        duration: 5000
      });
    }

    if (this.detectPeopleTalking(audioData)) {
      detections.push({
        type: 'speech',
        level: 'medium',
        confidence: 0.6,
        timestamp: now,
        duration: 3000
      });
    }

    if (this.detectConstruction(audioData)) {
      detections.push({
        type: 'construction',
        level: 'high',
        confidence: 0.9,
        timestamp: now,
        duration: 8000
      });
    }

    if (this.detectMusic(audioData)) {
      detections.push({
        type: 'music',
        level: 'low',
        confidence: 0.5,
        timestamp: now,
        duration: 10000
      });
    }

    return detections;
  }

  private detectBabyCry(audioData: any): boolean {
    // Simulate baby cry detection
    // In real implementation, this would use audio analysis
    return Math.random() < 0.02; // 2% chance
  }

  private detectTrafficNoise(audioData: any): boolean {
    // Simulate traffic noise detection
    return Math.random() < 0.05; // 5% chance
  }

  private detectPeopleTalking(audioData: any): boolean {
    // Simulate people talking detection
    return Math.random() < 0.08; // 8% chance
  }

  private detectConstruction(audioData: any): boolean {
    // Simulate construction noise detection
    return Math.random() < 0.03; // 3% chance
  }

  private detectMusic(audioData: any): boolean {
    // Simulate music detection
    return Math.random() < 0.15; // 15% chance
  }

  private updateNoiseHistory(detections: NoiseDetection[]): void {
    detections.forEach(detection => {
      this.noiseHistory.push(detection);
    });

    // Keep history size manageable
    if (this.noiseHistory.length > this.maxHistorySize) {
      this.noiseHistory = this.noiseHistory.slice(-this.maxHistorySize);
    }
  }

  private inferLocation(): LocationInference {
    const recentDetections = this.noiseHistory.slice(-20); // Last 20 detections
    const indicators: string[] = [];
    let location: LocationInference['location'] = 'unknown';
    let confidence = 0.0;

    // Analyze patterns to infer location
    const babyDetections = recentDetections.filter(d => d.type === 'baby');
    const trafficDetections = recentDetections.filter(d => d.type === 'traffic');
    const constructionDetections = recentDetections.filter(d => d.type === 'construction');
    const musicDetections = recentDetections.filter(d => d.type === 'music');
    const speechDetections = recentDetections.filter(d => d.type === 'speech');

    // Home indicators
    if (babyDetections.length > 0) {
      indicators.push('baby_cry');
      confidence += 0.3;
    }

    if (musicDetections.length > speechDetections.length) {
      indicators.push('music_dominant');
      confidence += 0.2;
    }

    // Outdoor/road indicators
    if (trafficDetections.length > 2) {
      indicators.push('traffic_noise');
      confidence += 0.4;
      location = 'outdoor';
    }

    // Public place indicators
    if (speechDetections.length > 3 && musicDetections.length > 1) {
      indicators.push('multiple_speech_and_music');
      confidence += 0.3;
      location = 'public';
    }

    // Office indicators
    if (speechDetections.length > 0 && constructionDetections.length === 0 && trafficDetections.length === 0) {
      indicators.push('speech_only');
      confidence += 0.2;
      if (location === 'unknown') location = 'office';
    }

    // Construction site
    if (constructionDetections.length > 1) {
      indicators.push('construction_noise');
      confidence += 0.6;
      location = 'outdoor';
    }

    // Vehicle indicators
    if (trafficDetections.length > 5) {
      indicators.push('heavy_traffic');
      confidence += 0.5;
      location = 'vehicle';
    }

    // Normalize confidence
    confidence = Math.min(confidence, 1.0);

    return {
      location: confidence > 0.3 ? location : 'unknown',
      confidence,
      indicators
    };
  }

  private updateEnvironmentalContext(detections: NoiseDetection[], location: LocationInference): void {
    // Update noise types
    const noiseTypes = detections.map(d => `${d.type}_${d.level}`);
    this.currentContext.detectedNoise = [...new Set(noiseTypes)];

    // Update people detection
    this.currentContext.possiblePeople = detections.some(d => d.type === 'speech' && d.confidence > 0.6);

    // Update baby detection
    this.currentContext.possibleBaby = detections.some(d => d.type === 'baby' && d.confidence > 0.7);

    // Update road detection
    this.currentContext.possibleRoad = detections.some(d => d.type === 'traffic' && d.confidence > 0.5);

    // Update location guess
    this.currentContext.locationGuess = location.location;

    // Update background activity
    this.currentContext.backgroundActivity = this.determineBackgroundActivity(detections);

    // Update personality context
    this.personality.updateEnvironment(this.currentContext);
  }

  private determineBackgroundActivity(detections: NoiseDetection[]): string {
    if (detections.length === 0) return 'quiet';

    const highLevelDetections = detections.filter(d => d.level === 'high' || d.level === 'critical');
    const mediumLevelDetections = detections.filter(d => d.level === 'medium');

    if (highLevelDetections.length > 0) {
      return 'noisy';
    } else if (mediumLevelDetections.length > 2) {
      return 'moderate';
    } else if (detections.length > 0) {
      return 'slightly_noisy';
    }

    return 'quiet';
  }

  private generateEnvironmentalResponse(detections: NoiseDetection[], location: LocationInference): EnvironmentalResponse {
    // Check if we should acknowledge the noise
    const shouldAcknowledge = this.shouldAcknowledgeNoise(detections);

    if (!shouldAcknowledge) {
      return { shouldAcknowledge: false };
    }

    // Generate appropriate response
    const response = this.createNoiseResponse(detections, location);

    return {
      shouldAcknowledge: true,
      utterance: response.utterance,
      newMode: response.mode,
      newEmotion: response.emotion,
      shouldAdjustVolume: response.adjustVolume,
      shouldSlowDown: response.slowDown
    };
  }

  private shouldAcknowledgeNoise(detections: NoiseDetection[]): boolean {
    // Don't acknowledge if we recently acknowledged similar noise
    const noiseKey = this.getNoiseKey(detections);
    const lastAcknowledgment = this.acknowledgmentCooldown.get(noiseKey) || 0;
    const now = Date.now();

    if (now - lastAcknowledgment < 30000) { // 30 second cooldown
      return false;
    }

    // Acknowledge high-level or critical noise
    const hasHighLevelNoise = detections.some(d => d.level === 'high' || d.level === 'critical');
    const hasMultipleDetections = detections.length > 2;
    const hasPersistentNoise = detections.some(d => d.duration > 5000);

    return hasHighLevelNoise || hasMultipleDetections || hasPersistentNoise;
  }

  private getNoiseKey(detections: NoiseDetection[]): string {
    const types = detections.map(d => d.type).sort().join('_');
    return `noise_${types}`;
  }

  private createNoiseResponse(detections: NoiseDetection[], location: LocationInference): {
    utterance: string;
    mode: BeatriceUtteranceMode;
    emotion: EmotionalState;
    adjustVolume?: boolean;
    slowDown?: boolean;
  } {
    const userName = this.personality['state']?.userAddressStyle || 'Jo';

    // Baby cry response
    const babyDetection = detections.find(d => d.type === 'baby');
    if (babyDetection && babyDetection.confidence > 0.7) {
      this.acknowledgmentCooldown.set('noise_baby', Date.now());
      return {
        utterance: `I think I heard a baby there—no worries, ${userName}.`,
        mode: 'environment_noise',
        emotion: { primary: 'empathetic', intensity: 0.4 },
        adjustVolume: true
      };
    }

    // Traffic noise response
    const trafficDetection = detections.find(d => d.type === 'traffic');
    if (trafficDetection && trafficDetection.confidence > 0.5) {
      this.acknowledgmentCooldown.set('noise_traffic', Date.now());
      return {
        utterance: `Are you on the road, ${userName}?`,
        mode: 'environment_noise',
        emotion: { primary: 'concerned', intensity: 0.3 },
        adjustVolume: true,
        slowDown: true
      };
    }

    // People talking response
    const speechDetection = detections.find(d => d.type === 'speech');
    if (speechDetection && speechDetection.confidence > 0.6) {
      this.acknowledgmentCooldown.set('noise_speech', Date.now());
      return {
        utterance: `Sounds like someone might be talking near you.`,
        mode: 'environment_noise',
        emotion: { primary: 'neutral', intensity: 0.3 },
        adjustVolume: true
      };
    }

    // Construction noise response
    const constructionDetection = detections.find(d => d.type === 'construction');
    if (constructionDetection && constructionDetection.confidence > 0.7) {
      this.acknowledgmentCooldown.set('noise_construction', Date.now());
      return {
        utterance: `Sounds like there's construction nearby. Want me to speak up?`,
        mode: 'environment_noise',
        emotion: { primary: 'concerned', intensity: 0.5 },
        adjustVolume: true
      };
    }

    // General noise response
    if (detections.length > 0) {
      const highLevelDetections = detections.filter(d => d.level === 'high' || d.level === 'critical');
      if (highLevelDetections.length > 0) {
        this.acknowledgmentCooldown.set('noise_general', Date.now());
        return {
          utterance: `It's a bit noisy around you, ${userName}. I'll speak a little louder.`,
          mode: 'environment_noise',
          emotion: { primary: 'concerned', intensity: 0.4 },
          adjustVolume: true
        };
      }
    }

    // Default response for moderate noise
    return {
      utterance: `Mm, I hear some noise there.`,
      mode: 'environment_noise',
      emotion: { primary: 'neutral', intensity: 0.2 }
    };
  }

  // Public API methods
  getCurrentContext(): EnvironmentContext {
    return { ...this.currentContext };
  }

  getNoiseHistory(): NoiseDetection[] {
    return [...this.noiseHistory];
  }

  clearNoiseHistory(): void {
    this.noiseHistory = [];
  }

  setLocationInference(location: LocationInference['location']): void {
    this.currentContext.locationGuess = location;
  }

  // Analytics methods
  getMostCommonNoiseType(): string {
    if (this.noiseHistory.length === 0) return 'none';

    const typeCounts: Record<string, number> = {};
    this.noiseHistory.forEach(detection => {
      typeCounts[detection.type] = (typeCounts[detection.type] || 0) + 1;
    });

    return Object.entries(typeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  getAverageNoiseLevel(): string {
    if (this.noiseHistory.length === 0) return 'none';

    const levelCounts: Record<string, number> = {};
    this.noiseHistory.forEach(detection => {
      levelCounts[detection.level] = (levelCounts[detection.level] || 0) + 1;
    });

    return Object.entries(levelCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  getLocationConfidence(): number {
    const recentDetections = this.noiseHistory.slice(-20);
    if (recentDetections.length === 0) return 0;

    const inference = this.inferLocation();
    return inference.confidence;
  }

  // Utility methods
  private selectRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Reset method
  reset(): void {
    this.noiseHistory = [];
    this.currentContext = {
      detectedNoise: [],
      possiblePeople: false,
      possibleBaby: false,
      possibleRoad: false,
      backgroundActivity: 'quiet'
    };
    this.acknowledgmentCooldown.clear();
  }
}
