import { BeatricePersonality, BeatriceUtteranceMode, EmotionalState } from './beatricePersonality';

export interface SilenceState {
  isSilent: boolean;
  duration: number;
  startTime: number;
  lastUserActivity: number;
  phase: 'early' | 'middle' | 'engagement' | 'final' | 'expired';
  reengageAttempts: number;
  maxReengageAttempts: number;
}

export interface SilenceResponse {
  shouldSpeak: boolean;
  utterance?: string;
  newMode?: BeatriceUtteranceMode;
  shouldPause?: boolean;
  nextCheckDelay?: number;
}

export class SilenceHandler {
  private personality: BeatricePersonality;
  private state: SilenceState;
  private maxSilenceDuration: number = 60000; // 60 seconds
  private phaseThresholds = {
    early: 6000,      // 6 seconds
    middle: 15000,    // 15 seconds
    engagement: 35000, // 35 seconds
    final: 50000      // 50 seconds
  };

  constructor(personality: BeatricePersonality) {
    this.personality = personality;
    this.state = {
      isSilent: false,
      duration: 0,
      startTime: 0,
      lastUserActivity: Date.now(),
      phase: 'early',
      reengageAttempts: 0,
      maxReengageAttempts: 8
    };
  }

  // Start monitoring silence
  startSilenceMonitoring(): void {
    this.state.isSilent = true;
    this.state.startTime = Date.now();
    this.state.duration = 0;
    this.state.phase = 'early';
    this.state.reengageAttempts = 0;
  }

  // Stop monitoring silence (user spoke)
  stopSilenceMonitoring(): void {
    this.state.isSilent = false;
    this.state.lastUserActivity = Date.now();
    this.personality.recordUserActivity();
  }

  // Check silence and generate response
  checkSilence(): SilenceResponse {
    if (!this.state.isSilent) {
      return { shouldSpeak: false };
    }

    // Update duration
    this.state.duration = Date.now() - this.state.startTime;
    
    // Update phase
    this.updatePhase();

    // Determine if we should speak
    if (this.state.duration >= this.maxSilenceDuration) {
      return {
        shouldSpeak: true,
        utterance: this.generateFinalResponse(),
        shouldPause: true,
        newMode: 'silence_final'
      };
    }

    // Check if it's time to re-engage
    if (this.shouldReengage()) {
      const response = this.generateReengagementResponse();
      this.state.reengageAttempts++;
      
      return {
        shouldSpeak: true,
        utterance: response.utterance,
        newMode: response.mode,
        nextCheckDelay: this.getNextCheckDelay()
      };
    }

    return { shouldSpeak: false };
  }

  private updatePhase(): void {
    const { duration } = this.state;

    if (duration < this.phaseThresholds.early) {
      this.state.phase = 'early';
    } else if (duration < this.phaseThresholds.middle) {
      this.state.phase = 'middle';
    } else if (duration < this.phaseThresholds.engagement) {
      this.state.phase = 'engagement';
    } else if (duration < this.phaseThresholds.final) {
      this.state.phase = 'final';
    } else {
      this.state.phase = 'expired';
    }
  }

  private shouldReengage(): boolean {
    const { phase, reengageAttempts, duration } = this.state;

    // Don't re-engage if we've exceeded max attempts
    if (reengageAttempts >= this.state.maxReengageAttempts) {
      return false;
    }

    // Check timing for each phase
    switch (phase) {
      case 'early':
        return duration >= 6000 && duration % 8000 < 1000; // Every 8 seconds after 6 seconds
      case 'middle':
        return duration >= 15000 && duration % 10000 < 1000; // Every 10 seconds after 15 seconds
      case 'engagement':
        return duration >= 35000 && duration % 12000 < 1000; // Every 12 seconds after 35 seconds
      case 'final':
        return duration >= 50000 && duration % 8000 < 1000; // Every 8 seconds after 50 seconds
      default:
        return false;
    }
  }

  private generateReengagementResponse(): { utterance: string; mode: BeatriceUtteranceMode } {
    const userName = this.personality['state']?.userAddressStyle || 'Jo';

    switch (this.state.phase) {
      case 'early':
        return {
          utterance: this.generateEarlyResponse(userName),
          mode: 'silence_early'
        };
      
      case 'middle':
        return {
          utterance: this.generateMiddleResponse(userName),
          mode: 'silence_middle'
        };
      
      case 'engagement':
        return {
          utterance: this.generateEngagementResponse(userName),
          mode: 'silence_engagement'
        };
      
      case 'final':
        return {
          utterance: this.generateFinalResponse(userName),
          mode: 'silence_final'
        };
      
      default:
        return {
          utterance: this.generateEarlyResponse(userName),
          mode: 'silence_early'
        };
    }
  }

  private generateEarlyResponse(userName: string): string {
    const responses = [
      `Mm, I'm here.`,
      `Take your time, ${userName}.`,
      `No rush.`,
      `I'm listening.`,
      `Whenever you're ready.`,
      `I can wait.`,
      `Still here, ${userName}.`,
      `I'm not going anywhere.`
    ];

    return this.selectRandom(responses);
  }

  private generateMiddleResponse(userName: string): string {
    const responses = [
      `Still with me?`,
      `You thinking?`,
      `I'll stay here.`,
      `No problem, ${userName}.`,
      `Mm, I'm just here.`,
      `Say something when you're ready.`,
      `Taking your time?`,
      `I'm still listening.`
    ];

    return this.selectRandom(responses);
  }

  private generateEngagementResponse(userName: string): string {
    // Try to use memory context or previous topics
    const memoryContext = this.getMemoryContext();
    
    if (memoryContext) {
      const contextualResponses = [
        `Quick thought, ${userName}... ${memoryContext}`,
        `Something came to mind about ${memoryContext}.`,
        `This might interest you regarding ${memoryContext}.`,
        `I remembered something related to ${memoryContext}.`,
        `There's an angle here about ${memoryContext}...`,
        `Meneer ${userName}, I think this connects to ${memoryContext}.`
      ];
      
      return this.selectRandom(contextualResponses);
    }

    const generalResponses = [
      `Quick thought, ${userName}...`,
      `Something came to mind.`,
      `This might interest you.`,
      `I remembered something related.`,
      `There's one angle here...`,
      `Meneer ${userName}, I think this connects to what you said earlier.`,
      `Wait, this might matter.`,
      `You know what?`
    ];

    return this.selectRandom(generalResponses);
  }

  private generateFinalResponse(userName?: string): string {
    const name = userName || this.personality['state']?.userAddressStyle || 'Jo';
    
    const responses = [
      `I'll stay a little longer.`,
      `If you're done, I'll pause.`,
      `Just say something if you need me.`,
      `I'm still here for a moment.`,
      `Okay, I'll pause soon unless you need me.`,
      `I'll give you a bit more time, ${name}.`,
      `Last chance, ${name}... I'm here if you need me.`
    ];

    return this.selectRandom(responses);
  }

  private getMemoryContext(): string | null {
    // This would integrate with the memory system
    // For now, return a simulated context
    const possibleContexts = [
      'the voice behavior we discussed',
      'that app functionality',
      'the conversation flow',
      'the agent personality',
      'the silence handling system',
      'the live audio features'
    ];

    return Math.random() < 0.3 ? this.selectRandom(possibleContexts) : null;
  }

  private getNextCheckDelay(): number {
    switch (this.state.phase) {
      case 'early':
        return 8000; // Check every 8 seconds
      case 'middle':
        return 10000; // Check every 10 seconds
      case 'engagement':
        return 12000; // Check every 12 seconds
      case 'final':
        return 8000; // Check every 8 seconds
      default:
        return 10000;
    }
  }

  // State management
  getSilenceState(): SilenceState {
    return { ...this.state };
  }

  setMaxSilenceDuration(duration: number): void {
    this.maxSilenceDuration = duration;
  }

  setPhaseThresholds(thresholds: Partial<typeof this.phaseThresholds>): void {
    this.phaseThresholds = { ...this.phaseThresholds, ...thresholds };
  }

  // Utility methods
  private selectRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Reset method
  reset(): void {
    this.state = {
      isSilent: false,
      duration: 0,
      startTime: 0,
      lastUserActivity: Date.now(),
      phase: 'early',
      reengageAttempts: 0,
      maxReengageAttempts: 8
    };
  }

  // Analytics
  getAverageSilenceDuration(): number {
    // This would track silence durations over time
    // For now, return current duration
    return this.state.duration;
  }

  getReengagementSuccessRate(): number {
    // This would track how often re-engagement leads to user response
    // For now, return a simulated value
    return 0.65; // 65% success rate
  }

  getMostActivePhase(): string {
    // This would track which phase gets the most user responses
    // For now, return a simulated value
    return 'engagement';
  }
}
