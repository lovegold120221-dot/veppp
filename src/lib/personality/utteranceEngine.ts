import { BeatricePersonality, BeatriceState, UtteranceGenerationContext, BeatriceUtteranceMode, TaskType, EmotionalState } from './beatricePersonality';

export interface UtteranceEngineConfig {
  maxHistoryLength: number;
  variationThreshold: number;
  imperfectionFrequency: number;
  contextMemorySize: number;
}

export class DynamicUtteranceEngine {
  private personality: BeatricePersonality;
  private config: UtteranceEngineConfig;
  private contextMemory: Map<string, any> = new Map();
  private utterancePatterns: Map<string, string[]> = new Map();

  constructor(config: Partial<UtteranceEngineConfig> = {}) {
    this.config = {
      maxHistoryLength: 50,
      variationThreshold: 0.7,
      imperfectionFrequency: 0.15,
      contextMemorySize: 100,
      ...config
    };

    this.personality = new BeatricePersonality('', '', 'Jo');
    this.initializeUtterancePatterns();
  }

  // Main utterance generation method
  generateUtterance(params: {
    speaker: string;
    userName: string;
    userAddressStyle: 'Jo' | 'Boss Jo' | 'Meneer Jo';
    mode: BeatriceUtteranceMode;
    taskType: TaskType;
    progress: number;
    emotion: EmotionalState;
    userState: 'silent' | 'speaking' | 'thinking' | 'reviewing';
    noiseLevel: 'low' | 'medium' | 'high';
    interruptionDetected: boolean;
    errorState: any;
    previousUtterances: string[];
    taskContext?: string;
    userMood?: 'neutral' | 'frustrated' | 'tired' | 'confused' | 'excited';
    memoryContext?: string;
    environmentContext?: any;
  }): string {
    // Update personality state
    this.updatePersonalityState(params);

    // Generate base utterance
    const baseUtterance = this.personality.generateUtterance({
      taskContext: params.taskContext,
      userMood: params.userMood,
      memoryContext: params.memoryContext,
      previousTopics: this.getRecentTopics()
    });

    // Apply dynamic variation
    const variedUtterance = this.applyDynamicVariation(baseUtterance, params);

    // Store in context memory
    this.storeContext(params, variedUtterance);

    return variedUtterance;
  }

  private updatePersonalityState(params: any): void {
    this.personality.updateMode(params.mode);
    this.personality.updateEmotion(params.emotion);
    this.personality.updateTaskProgress(params.progress);
    this.personality.setWorking(params.mode === 'working_softly');
    this.personality.setError(params.errorState);
    this.personality.setTaskType(params.taskType);
    
    if (params.environmentContext) {
      this.personality.updateEnvironment(params.environmentContext);
    }
  }

  private applyDynamicVariation(baseUtterance: string, params: any): string {
    let utterance = baseUtterance;

    // Apply context-aware variations
    utterance = this.applyContextualVariation(utterance, params);
    
    // Apply temporal variations
    utterance = this.applyTemporalVariation(utterance, params);
    
    // Apply emotional coloring
    utterance = this.applyEmotionalColoring(utterance, params.emotion);
    
    // Apply task-specific variations
    utterance = this.applyTaskSpecificVariation(utterance, params);

    return utterance;
  }

  private applyContextualVariation(utterance: string, params: any): string {
    const contextKey = this.generateContextKey(params);
    const previousUtterances = this.contextMemory.get(contextKey) || [];

    // Avoid repetition
    if (previousUtterances.includes(utterance) && Math.random() < this.config.variationThreshold) {
      utterance = this.generateAlternative(utterance, params);
    }

    return utterance;
  }

  private applyTemporalVariation(utterance: string, params: any): string {
    const timeOfDay = new Date().getHours();
    const sessionDuration = this.getSessionDuration();

    // Time-based variations
    if (timeOfDay >= 9 && timeOfDay <= 17) {
      // Business hours - more professional
      if (Math.random() < 0.2) {
        utterance = this.makeMoreProfessional(utterance);
      }
    } else {
      // After hours - more casual
      if (Math.random() < 0.2) {
        utterance = this.makeMoreCasual(utterance);
      }
    }

    // Session duration variations
    if (sessionDuration > 1800) { // 30 minutes
      if (Math.random() < 0.15) {
        utterance = this.addSessionAwareness(utterance);
      }
    }

    return utterance;
  }

  private applyEmotionalColoring(utterance: string, emotion: EmotionalState): string {
    const { primary, intensity } = emotion;

    switch (primary) {
      case 'empathetic':
        if (intensity > 0.7) {
          return this.addEmpathyMarkers(utterance);
        }
        break;
      case 'mild_irritation':
        if (intensity > 0.5) {
          return this.addIrritationMarkers(utterance);
        }
        break;
      case 'excited':
        if (intensity > 0.6) {
          return this.addExcitementMarkers(utterance);
        }
        break;
      case 'concerned':
        if (intensity > 0.5) {
          return this.addConcernMarkers(utterance);
        }
        break;
    }

    return utterance;
  }

  private applyTaskSpecificVariation(utterance: string, params: any): string {
    const { taskType, progress } = params;

    // Progress-based variations
    if (progress > 0.8) {
      utterance = this.addCompletionHints(utterance);
    } else if (progress < 0.2) {
      utterance = this.addStartingHints(utterance);
    }

    // Task-type variations
    switch (taskType) {
      case 'fixing':
        utterance = this.addFixingLanguage(utterance);
        break;
      case 'creating':
        utterance = this.addCreatingLanguage(utterance);
        break;
      case 'searching':
        utterance = this.addSearchingLanguage(utterance);
        break;
    }

    return utterance;
  }

  // Variation helper methods
  private generateAlternative(original: string, params: any): string {
    const alternatives = this.getAlternativesForMode(params.mode);
    return this.selectRandom(alternatives.filter(alt => alt !== original));
  }

  private makeMoreProfessional(utterance: string): string {
    const professionalReplacements = {
      'Mm': 'Alright',
      'Heh': 'I see',
      'Yeah': 'Yes',
      'gonna': 'going to',
      'wanna': 'want to'
    };

    let result = utterance;
    Object.entries(professionalReplacements).forEach(([informal, formal]) => {
      result = result.replace(new RegExp(informal, 'gi'), formal);
    });

    return result;
  }

  private makeMoreCasual(utterance: string): string {
    const casualReplacements = {
      'I will': "I'll",
      'I am': "I'm",
      'you are': "you're",
      'we will': "we'll"
    };

    let result = utterance;
    Object.entries(casualReplacements).forEach(([formal, casual]) => {
      result = result.replace(new RegExp(formal, 'gi'), casual);
    });

    return result;
  }

  private addSessionAwareness(utterance: string): string {
    const sessionMarkers = [
      `You know, ${utterance.toLowerCase()}`,
      `Actually, ${utterance}`,
      `${utterance}—just thinking about our conversation.`
    ];

    return this.selectRandom(sessionMarkers);
  }

  private addEmpathyMarkers(utterance: string): string {
    const empathyMarkers = [
      `Mm, ${utterance}`,
      `Yeah, ${utterance}`,
      `${utterance}—I get that.`,
      `${utterance}, I understand.`
    ];

    return this.selectRandom(empathyMarkers);
  }

  private addIrritationMarkers(utterance: string): string {
    const irritationMarkers = [
      `Ugh, ${utterance}`,
      `Hmm, ${utterance}`,
      `${utterance}—this is being difficult.`,
      `Wait, ${utterance}.`
    ];

    return this.selectRandom(irritationMarkers);
  }

  private addExcitementMarkers(utterance: string): string {
    const excitementMarkers = [
      `Oh! ${utterance}`,
      `Hey, ${utterance}`,
      `${utterance}—this is good!`,
      `Wow, ${utterance}.`
    ];

    return this.selectRandom(excitementMarkers);
  }

  private addConcernMarkers(utterance: string): string {
    const concernMarkers = [
      `Mm, ${utterance}`,
      `Wait, ${utterance}`,
      `${utterance}—are you sure?`,
      `${utterance}, let me be careful.`
    ];

    return this.selectRandom(concernMarkers);
  }

  private addCompletionHints(utterance: string): string {
    const completionHints = [
      `${utterance}—almost there.`,
      `${utterance}—just finishing up.`,
      `Nearly done, ${utterance}`,
      `${utterance}—coming together.`
    ];

    return this.selectRandom(completionHints);
  }

  private addStartingHints(utterance: string): string {
    const startingHints = [
      `Okay, starting ${utterance.toLowerCase()}`,
      `Beginning ${utterance.toLowerCase()}`,
      `${utterance}—just getting started.`,
      `Let me start ${utterance.toLowerCase()}.`
    ];

    return this.selectRandom(startingHints);
  }

  private addFixingLanguage(utterance: string): string {
    const fixingWords = ['sorting', 'fixing', 'cleaning', 'adjusting', 'correcting'];
    const word = this.selectRandom(fixingWords);
    return utterance.replace(/\b(working|doing|handling)\b/gi, word);
  }

  private addCreatingLanguage(utterance: string): string {
    const creatingWords = ['building', 'crafting', 'shaping', 'forming', 'developing'];
    const word = this.selectRandom(creatingWords);
    return utterance.replace(/\b(working|doing|handling)\b/gi, word);
  }

  private addSearchingLanguage(utterance: string): string {
    const searchingWords = ['looking', 'finding', 'seeking', 'hunting', 'exploring'];
    const word = this.selectRandom(searchingWords);
    return utterance.replace(/\b(working|doing|handling)\b/gi, word);
  }

  // Context management
  private generateContextKey(params: any): string {
    return `${params.mode}_${params.taskType}_${params.emotion.primary}`;
  }

  private storeContext(params: any, utterance: string): void {
    const contextKey = this.generateContextKey(params);
    const previousUtterances = this.contextMemory.get(contextKey) || [];
    
    previousUtterances.push(utterance);
    
    // Keep only recent utterances
    if (previousUtterances.length > this.config.contextMemorySize) {
      previousUtterances.shift();
    }
    
    this.contextMemory.set(contextKey, previousUtterances);
  }

  private getRecentTopics(): string[] {
    // Extract topics from recent context memory
    const topics: string[] = [];
    this.contextMemory.forEach((utterances, key) => {
      const parts = key.split('_');
      if (parts.length > 0) {
        topics.push(parts[0]);
      }
    });
    
    return [...new Set(topics)].slice(-5);
  }

  private getSessionDuration(): number {
    // This would be calculated from actual session start time
    return Math.random() * 3600; // Random for demo
  }

  // Pattern management
  private initializeUtterancePatterns(): void {
    this.utterancePatterns.set('session_start', [
      "Yes, {userName}, I'm here.",
      "I'm listening, {userName}.",
      "Mm, tell me.",
      "Yes, what's up?",
      "Okay, {userName}.",
      "I'm here.",
      "Yeah, go ahead."
    ]);

    this.utterancePatterns.set('working_softly', [
      "Mm, I'm putting it together now...",
      "Okay, let me shape this properly...",
      "I'm sorting that bit out...",
      "Wait, this part needs a little care...",
      "Alright, I see where this goes...",
      "{userName}, I'm cleaning the rough part now..."
    ]);

    this.utterancePatterns.set('interrupted', [
      "Yes, yes, what's that?",
      "Yeah, {userName}, I'm listening.",
      "Mm? Tell me.",
      "Okay, {userName}, go ahead.",
      "Wait, say that again.",
      "Yes, I stopped. Tell me.",
      "What happened?",
      "I'm with you."
    ]);

    this.utterancePatterns.set('error_recovery', [
      "Oh, something tripped there.",
      "Wait, I hit a small issue.",
      "Okay, okay, fixing it.",
      "No problem, I found it.",
      "Ah, there it is.",
      "Alright, it's behaving now.",
      "Good, we're back.",
      "That was annoying, but it's okay now.",
      "{userName}, give me a second, I'm sorting it."
    ]);

    this.utterancePatterns.set('completion_review', [
      "Okay, {userName}... take a look at this.",
      "I gave it a try. Check it.",
      "{userName}, see if this feels right.",
      "If something feels off, I'll tweak it.",
      "I kept it clean. Look.",
      "Heh, I don't want to overhype it, but check this.",
      "Maybe this is the one.",
      "Not too loud, but I like it."
    ]);
  }

  private getAlternativesForMode(mode: BeatriceUtteranceMode): string[] {
    return this.utterancePatterns.get(mode) || [];
  }

  private selectRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Public API methods
  setPersonalityInstance(personality: BeatricePersonality): void {
    this.personality = personality;
  }

  getContextMemory(): Map<string, any> {
    return this.contextMemory;
  }

  clearContextMemory(): void {
    this.contextMemory.clear();
  }

  getConfig(): UtteranceEngineConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<UtteranceEngineConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
