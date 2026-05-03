// Main personality system exports
import { BeatricePersonality, type BeatriceState, type EmotionalState, type EnvironmentContext, type ErrorState, type TaskType, type BeatriceUtteranceMode, type UtteranceGenerationContext } from './beatricePersonality';
import { DynamicUtteranceEngine, type UtteranceEngineConfig } from './utteranceEngine';
import { InterruptionHandler, type InterruptionEvent, type InterruptionResponse } from './interruptionHandler';
import { SilenceHandler, type SilenceState, type SilenceResponse } from './silenceHandler';
import { EnvironmentalAwareness, type NoiseDetection, type LocationInference, type EnvironmentalResponse } from './environmentalAwareness';

// Re-export for external use
export { BeatricePersonality, DynamicUtteranceEngine, InterruptionHandler, SilenceHandler, EnvironmentalAwareness };
export type { BeatriceState, EmotionalState, EnvironmentContext, ErrorState, TaskType, BeatriceUtteranceMode, UtteranceGenerationContext, UtteranceEngineConfig, InterruptionEvent, InterruptionResponse, SilenceState, SilenceResponse, NoiseDetection, LocationInference, EnvironmentalResponse };

// Integrated personality manager
export class BeatricePersonalityManager {
  private personality: BeatricePersonality;
  private utteranceEngine: DynamicUtteranceEngine;
  private interruptionHandler: InterruptionHandler;
  private silenceHandler: SilenceHandler;
  private environmentalAwareness: EnvironmentalAwareness;

  constructor(userId: string, sessionId: string, userName: string = 'Jo') {
    // Initialize core personality
    this.personality = new BeatricePersonality(userId, sessionId, userName);
    
    // Initialize subsystems
    this.utteranceEngine = new DynamicUtteranceEngine();
    this.interruptionHandler = new InterruptionHandler(this.personality);
    this.silenceHandler = new SilenceHandler(this.personality);
    this.environmentalAwareness = new EnvironmentalAwareness(this.personality);
    
    // Wire up the systems
    this.utteranceEngine.setPersonalityInstance(this.personality);
  }

  // Main utterance generation
  generateUtterance(params: {
    mode: BeatriceUtteranceMode;
    taskType: TaskType;
    progress: number;
    emotion: EmotionalState;
    userState: 'silent' | 'speaking' | 'thinking' | 'reviewing';
    taskContext?: string;
    userMood?: 'neutral' | 'frustrated' | 'tired' | 'confused' | 'excited';
    memoryContext?: string;
  }): string {
    const userName = this.personality['state']?.userName || 'Jo';
    const userAddressStyle = this.personality['state']?.userAddressStyle || 'Jo';

    return this.utteranceEngine.generateUtterance({
      speaker: 'Beatrice',
      userName,
      userAddressStyle,
      mode: params.mode,
      taskType: params.taskType,
      progress: params.progress,
      emotion: params.emotion,
      userState: params.userState,
      noiseLevel: this.environmentalAwareness.getCurrentContext().backgroundActivity === 'quiet' ? 'low' : 'medium',
      interruptionDetected: false,
      errorState: this.personality['state']?.errorState,
      previousUtterances: [],
      taskContext: params.taskContext,
      userMood: params.userMood,
      memoryContext: params.memoryContext,
      environmentContext: this.environmentalAwareness.getCurrentContext()
    });
  }

  // Handle user interruption
  handleInterruption(event: Partial<InterruptionEvent>): InterruptionResponse {
    const fullEvent: InterruptionEvent = {
      type: event.type || 'user_speech',
      timestamp: Date.now(),
      priority: event.priority || 'medium',
      context: event.context,
      metadata: event.metadata
    };

    return this.interruptionHandler.handleInterruption(fullEvent);
  }

  // Handle silence
  handleSilence(): SilenceResponse {
    return this.silenceHandler.checkSilence();
  }

  // Handle environmental audio
  processEnvironmentalAudio(audioData: any): EnvironmentalResponse {
    return this.environmentalAwareness.processAudioData(audioData);
  }

  // State management
  updateMode(mode: BeatriceUtteranceMode): void {
    this.personality.updateMode(mode);
  }

  updateEmotion(emotion: EmotionalState): void {
    this.personality.updateEmotion(emotion);
  }

  updateTaskProgress(progress: number): void {
    this.personality.updateTaskProgress(progress);
  }

  setWorking(isWorking: boolean): void {
    this.personality.setWorking(isWorking);
  }

  recordUserActivity(): void {
    this.personality.recordUserActivity();
    this.silenceHandler.stopSilenceMonitoring();
  }

  startSilenceMonitoring(): void {
    this.silenceHandler.startSilenceMonitoring();
  }

  setError(error: ErrorState | null): void {
    this.personality.setError(error);
  }

  setTaskType(type: TaskType): void {
    this.personality.setTaskType(type);
  }

  // Identity response
  getIdentityResponse(): string {
    return this.personality.getIdentityResponse();
  }

  // Get current state
  getCurrentState(): BeatriceState {
    return this.personality['state'];
  }

  // Get analytics
  getAnalytics() {
    return {
      interruption: {
        frequency: this.interruptionHandler.getInterruptionFrequency(),
        byType: this.interruptionHandler.getInterruptionsByType(),
        averageResponseTime: this.interruptionHandler.getAverageResponseTime()
      },
      silence: {
        averageDuration: this.silenceHandler.getAverageSilenceDuration(),
        reengagementSuccessRate: this.silenceHandler.getReengagementSuccessRate(),
        mostActivePhase: this.silenceHandler.getMostActivePhase()
      },
      environment: {
        mostCommonNoiseType: this.environmentalAwareness.getMostCommonNoiseType(),
        averageNoiseLevel: this.environmentalAwareness.getAverageNoiseLevel(),
        locationConfidence: this.environmentalAwareness.getLocationConfidence(),
        currentContext: this.environmentalAwareness.getCurrentContext()
      }
    };
  }

  // Reset all systems
  reset(): void {
    this.personality = new BeatricePersonality(this.personality['state']?.userId || '', this.personality['state']?.sessionId || '', this.personality['state']?.userName || 'Jo');
    this.interruptionHandler = new InterruptionHandler(this.personality);
    this.silenceHandler = new SilenceHandler(this.personality);
    this.environmentalAwareness = new EnvironmentalAwareness(this.personality);
    this.utteranceEngine.setPersonalityInstance(this.personality);
  }
}

// Factory function for easy instantiation
export function createBeatricePersonality(userId: string, sessionId: string, userName: string = 'Jo'): BeatricePersonalityManager {
  return new BeatricePersonalityManager(userId, sessionId, userName);
}
