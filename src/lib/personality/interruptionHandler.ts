import { BeatricePersonality, BeatriceUtteranceMode, EmotionalState } from './beatricePersonality';

export interface InterruptionEvent {
  type: 'user_speech' | 'environment_noise' | 'system_alert' | 'timeout';
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
  metadata?: any;
}

export interface InterruptionResponse {
  shouldStop: boolean;
  response?: string;
  newMode?: BeatriceUtteranceMode;
  newEmotion?: EmotionalState;
  delay?: number;
}

export class InterruptionHandler {
  private personality: BeatricePersonality;
  private currentActivity: string = '';
  private interruptionHistory: InterruptionEvent[] = [];
  private maxHistorySize: number = 50;

  constructor(personality: BeatricePersonality) {
    this.personality = personality;
  }

  // Handle incoming interruption
  handleInterruption(event: InterruptionEvent): InterruptionResponse {
    // Record the interruption
    this.recordInterruption(event);

    // Determine response based on type and priority
    switch (event.type) {
      case 'user_speech':
        return this.handleUserSpeech(event);
      
      case 'environment_noise':
        return this.handleEnvironmentNoise(event);
      
      case 'system_alert':
        return this.handleSystemAlert(event);
      
      case 'timeout':
        return this.handleTimeout(event);
      
      default:
        return this.handleGenericInterruption(event);
    }
  }

  private handleUserSpeech(event: InterruptionEvent): InterruptionResponse {
    // User speech should always interrupt immediately
    this.personality.setInterruption(true);
    this.personality.recordUserActivity();

    const response: InterruptionResponse = {
      shouldStop: true,
      newMode: 'interrupted',
      newEmotion: { primary: 'focused', intensity: 0.8 },
      delay: 0
    };

    // Generate appropriate response based on context
    if (event.context === 'question') {
      response.response = this.generateQuestionResponse();
    } else if (event.context === 'correction') {
      response.response = this.generateCorrectionResponse();
    } else if (event.context === 'command') {
      response.response = this.generateCommandResponse();
    } else {
      response.response = this.generateGeneralSpeechResponse();
    }

    return response;
  }

  private handleEnvironmentNoise(event: InterruptionEvent): InterruptionResponse {
    // Environment noise handling depends on priority and current activity
    if (event.priority === 'critical' || event.priority === 'high') {
      // Loud or important noise should be acknowledged
      this.personality.updateEnvironment({
        detectedNoise: [event.context || 'unknown noise'],
        backgroundActivity: 'noisy'
      });

      return {
        shouldStop: true,
        response: this.generateNoiseResponse(event.context),
        newMode: 'environment_noise',
        newEmotion: { primary: 'concerned', intensity: 0.4 }
      };
    }

    // Low priority noise - continue working but note it
    this.personality.updateEnvironment({
      detectedNoise: [event.context || 'background noise'],
      backgroundActivity: 'slightly_noisy'
    });

    return {
      shouldStop: false,
      delay: 0
    };
  }

  private handleSystemAlert(event: InterruptionEvent): InterruptionResponse {
    // System alerts should be handled based on priority
    if (event.priority === 'critical') {
      return {
        shouldStop: true,
        response: this.generateSystemAlertResponse(event.context, true),
        newMode: 'error_recovery',
        newEmotion: { primary: 'concerned', intensity: 0.9 }
      };
    }

    return {
      shouldStop: true,
      response: this.generateSystemAlertResponse(event.context, false),
      newMode: 'working_softly',
      newEmotion: { primary: 'focused', intensity: 0.6 }
    };
  }

  private handleTimeout(event: InterruptionEvent): InterruptionResponse {
    // Timeout handling for long operations
    return {
      shouldStop: true,
      response: this.generateTimeoutResponse(),
      newMode: 'completion_review',
      newEmotion: { primary: 'neutral', intensity: 0.5 }
    };
  }

  private handleGenericInterruption(event: InterruptionEvent): InterruptionResponse {
    return {
      shouldStop: event.priority === 'high' || event.priority === 'critical',
      response: this.generateGenericResponse(),
      newMode: 'interrupted',
      newEmotion: { primary: 'neutral', intensity: 0.5 }
    };
  }

  // Response generation methods
  private generateQuestionResponse(): string {
    const responses = [
      "Yes, yes, what's that?",
      "Yeah, I'm listening.",
      "Mm? Tell me.",
      "Okay, go ahead.",
      "Wait, say that again.",
      "Yes, I stopped. Tell me.",
      "What happened?",
      "I'm with you."
    ];

    return this.selectRandom(responses);
  }

  private generateCorrectionResponse(): string {
    const responses = [
      "Yes, yes, you're right.",
      "Okay, I see it now.",
      "Right, not like that.",
      "Got it.",
      "Mm, better direction.",
      "Okay, I'll adjust.",
      "You're absolutely right.",
      "Let me fix that."
    ];

    return this.selectRandom(responses);
  }

  private generateCommandResponse(): string {
    const responses = [
      "Okay, I'm on it.",
      "Right away.",
      "Got it, Boss Jo.",
      "I'll handle that.",
      "Coming right up.",
      "Consider it done.",
      "Yes, I'll get to that.",
      "Understood."
    ];

    return this.selectRandom(responses);
  }

  private generateGeneralSpeechResponse(): string {
    const responses = [
      "Yes, I'm listening.",
      "Mm, I hear you.",
      "Okay, what's up?",
      "I'm with you.",
      "Go ahead.",
      "I'm paying attention.",
      "Tell me more.",
      "I'm following."
    ];

    return this.selectRandom(responses);
  }

  private generateNoiseResponse(noiseType?: string): string {
    const userName = this.personality['state']?.userAddressStyle || 'Jo';

    if (noiseType?.includes('baby')) {
      return `I think I heard a baby there—no worries, ${userName}.`;
    }

    if (noiseType?.includes('road') || noiseType?.includes('traffic')) {
      return `Are you on the road, ${userName}?`;
    }

    if (noiseType?.includes('people') || noiseType?.includes('talking')) {
      return `Sounds like someone might be talking near you.`;
    }

    const generalResponses = [
      "Mm, I hear some noise there.",
      "Sounds a little busy around you.",
      "Are you outside?",
      "I hear something in the background.",
      "Say that again, I missed a bit.",
      "No worries, I'll listen closer."
    ];

    return this.selectRandom(generalResponses);
  }

  private generateSystemAlertResponse(alertType?: string, isCritical: boolean = false): string {
    if (isCritical) {
      const criticalResponses = [
        "Oh, something tripped there.",
        "Wait, I hit a small issue.",
        "Okay, okay, fixing it.",
        "No problem, I found it.",
        "Ah, there it is.",
        "Alright, it's behaving now."
      ];

      return this.selectRandom(criticalResponses);
    }

    const normalResponses = [
      "Just a moment.",
      "Okay, let me handle that.",
      "I'll get to that.",
      "Understood.",
      "Noted.",
      "I'll take care of it."
    ];

    return this.selectRandom(normalResponses);
  }

  private generateTimeoutResponse(): string {
    const responses = [
      "Okay, let me try a different approach.",
      "This is taking longer than expected.",
      "Let me restart this.",
      "Hmm, let me try again.",
      "Okay, switching methods.",
      "Let me handle this differently."
    ];

    return this.selectRandom(responses);
  }

  private generateGenericResponse(): string {
    const responses = [
      "Okay, I'm listening.",
      "Yes, what's up?",
      "Mm, I'm here.",
      "Go ahead.",
      "I'm paying attention.",
      "Tell me.",
      "I'm with you."
    ];

    return this.selectRandom(responses);
  }

  // Activity management
  setCurrentActivity(activity: string): void {
    this.currentActivity = activity;
  }

  getCurrentActivity(): string {
    return this.currentActivity;
  }

  // History management
  private recordInterruption(event: InterruptionEvent): void {
    this.interruptionHistory.push(event);
    
    // Keep history size manageable
    if (this.interruptionHistory.length > this.maxHistorySize) {
      this.interruptionHistory = this.interruptionHistory.slice(-this.maxHistorySize);
    }
  }

  getInterruptionHistory(): InterruptionEvent[] {
    return [...this.interruptionHistory];
  }

  clearInterruptionHistory(): void {
    this.interruptionHistory = [];
  }

  // Analytics methods
  getInterruptionFrequency(): number {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    return this.interruptionHistory.filter(event => event.timestamp >= oneHourAgo).length;
  }

  getInterruptionsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    this.interruptionHistory.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });

    return counts;
  }

  getAverageResponseTime(): number {
    if (this.interruptionHistory.length === 0) return 0;

    const responseTimes = this.interruptionHistory
      .filter(event => event.metadata?.responseTime)
      .map(event => event.metadata.responseTime);

    if (responseTimes.length === 0) return 0;

    const sum = responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / responseTimes.length;
  }

  // Utility methods
  private selectRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Reset method
  reset(): void {
    this.currentActivity = '';
    this.interruptionHistory = [];
    this.personality.setInterruption(false);
  }
}
