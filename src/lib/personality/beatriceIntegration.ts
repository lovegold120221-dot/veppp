import { createBeatricePersonality, BeatricePersonalityManager } from './index';
import { MemoryCommandProcessor } from '../memory/memoryCommands';
import { LongTermMemoryManager } from '../memory/longTermMemory';
import { ShortTermMemoryManager } from '../memory/shortTermMemory';
import { KnowledgeBaseManager } from '../memory/knowledgeBase';

export interface BeatriceIntegrationConfig {
  userId: string;
  sessionId: string;
  userName: string;
  userAddressStyle?: 'Jo' | 'Boss Jo' | 'Meneer Jo';
  enableMemorySystem?: boolean;
  enableEnvironmentalAwareness?: boolean;
  enableSilenceHandling?: boolean;
  enableInterruptionHandling?: boolean;
}

export class BeatriceIntegration {
  private personalityManager: BeatricePersonalityManager;
  private memoryProcessor?: MemoryCommandProcessor;
  private longTermMemory?: LongTermMemoryManager;
  private shortTermMemory?: ShortTermMemoryManager;
  private knowledgeBase?: KnowledgeBaseManager;
  private config: BeatriceIntegrationConfig;

  constructor(config: BeatriceIntegrationConfig) {
    this.config = {
      enableMemorySystem: true,
      enableEnvironmentalAwareness: true,
      enableSilenceHandling: true,
      enableInterruptionHandling: true,
      ...config
    };

    // Initialize personality manager
    this.personalityManager = createBeatricePersonality(
      config.userId,
      config.sessionId,
      config.userName
    );

    // Set user address style if specified
    if (config.userAddressStyle) {
      this.updateUserAddressStyle(config.userAddressStyle);
    }

    // Initialize memory systems if enabled
    if (this.config.enableMemorySystem) {
      this.initializeMemorySystems();
    }
  }

  private initializeMemorySystems(): void {
    // Initialize memory managers
    this.longTermMemory = new LongTermMemoryManager(this.config.userId);
    this.shortTermMemory = new ShortTermMemoryManager(this.config.userId, this.config.sessionId);
    this.knowledgeBase = new KnowledgeBaseManager(this.config.userId);
    this.memoryProcessor = new MemoryCommandProcessor(this.config.userId, this.config.sessionId);
  }

  // Main utterance generation with memory integration
  async generateUtterance(params: {
    mode: string;
    taskType: string;
    progress: number;
    emotion: { primary: string; intensity: number };
    userState: string;
    taskContext?: string;
    userMood?: string;
    conversationHistory?: any[];
    currentMessage?: string;
  }): Promise<string> {
    // Process memory commands if current message provided
    let memoryContext = '';
    if (this.config.enableMemorySystem && params.currentMessage && this.memoryProcessor) {
      try {
        const memoryResult = await this.memoryProcessor.processMessage(params.currentMessage);
        
        if (memoryResult.processed) {
          memoryContext = this.extractMemoryContext(memoryResult);
        }
      } catch (error) {
        console.warn('Memory processing failed:', error);
      }
    }

    // Generate utterance with personality and memory context
    return this.personalityManager.generateUtterance({
      mode: params.mode as any,
      taskType: params.taskType as any,
      progress: params.progress,
      emotion: params.emotion as any,
      userState: params.userState as any,
      taskContext: params.taskContext,
      userMood: params.userMood as any,
      memoryContext
    });
  }

  // Handle user messages with memory processing
  async handleUserMessage(message: string, conversationHistory: any[] = []): Promise<{
    response: string;
    memoryProcessed: boolean;
    memoryActions: string[];
  }> {
    const memoryActions: string[] = [];
    let memoryProcessed = false;

    // Process memory commands if enabled
    if (this.config.enableMemorySystem && this.memoryProcessor) {
      try {
        const memoryResult = await this.memoryProcessor.processMessage(message);

        memoryProcessed = memoryResult.processed;
        memoryActions.push(...(memoryResult.memoriesSaved || []));

        // Update personality based on memory processing
        if (memoryResult.processed) {
          this.updatePersonalityFromMemory(memoryResult);
        }
      } catch (error) {
        console.warn('Memory processing failed:', error);
      }
    }

    // Record user activity
    this.personalityManager.recordUserActivity();

    // Generate response
    const response = this.personalityManager.generateUtterance({
      mode: 'active_listening',
      taskType: 'thinking',
      progress: 0,
      emotion: { primary: 'focused', intensity: 0.8 },
      userState: 'speaking',
      taskContext: message,
      memoryContext: memoryProcessed ? 'Memory updated' : undefined
    });

    return {
      response,
      memoryProcessed,
      memoryActions
    };
  }

  // Handle interruptions
  handleInterruption(event: {
    type?: 'user_speech' | 'environment_noise' | 'system_alert' | 'timeout';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    context?: string;
  }) {
    if (!this.config.enableInterruptionHandling) {
      return { shouldStop: false };
    }

    return this.personalityManager.handleInterruption(event);
  }

  // Handle silence
  handleSilence() {
    if (!this.config.enableSilenceHandling) {
      return { shouldSpeak: false };
    }

    return this.personalityManager.handleSilence();
  }

  // Handle environmental audio
  processEnvironmentalAudio(audioData: any) {
    if (!this.config.enableEnvironmentalAwareness) {
      return { shouldAcknowledge: false };
    }

    return this.personalityManager.processEnvironmentalAudio(audioData);
  }

  // State management
  updateMode(mode: string): void {
    this.personalityManager.updateMode(mode as any);
  }

  updateEmotion(emotion: { primary: string; intensity: number }): void {
    this.personalityManager.updateEmotion(emotion as any);
  }

  updateTaskProgress(progress: number): void {
    this.personalityManager.updateTaskProgress(progress);
  }

  setWorking(isWorking: boolean): void {
    this.personalityManager.setWorking(isWorking);
    if (isWorking) {
      this.updateMode('working_softly');
    }
  }

  setError(error: { type: string; message: string; isRecovering: boolean } | null): void {
    if (error) {
      this.personalityManager.setError(error as any);
      this.updateMode('error_recovery');
    } else {
      this.personalityManager.setError(null);
      this.updateMode('working_softly');
    }
  }

  updateUserAddressStyle(style: 'Jo' | 'Boss Jo' | 'Meneer Jo'): void {
    // This would update the personality state
    // Implementation depends on how the personality stores this
    const currentState = this.personalityManager.getCurrentState();
    // Update the userAddressStyle in the state
    // This is a simplified implementation
  }

  // Memory integration helpers
  private getConversationContext(history: any[]): string {
    if (history.length === 0) return '';

    const recentMessages = history.slice(-5);
    const context = recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return context;
  }

  private extractMemoryContext(memoryResult: any): string {
    if (memoryResult.actions.length === 0) return '';

    const actionTypes = memoryResult.actions.map(action => 
      action.split(':')[0]
    ).join(', ');

    return `Memory updated: ${actionTypes}`;
  }

  private updatePersonalityFromMemory(memoryResult: any): void {
    // Update personality based on memory processing
    if (memoryResult.actions.some(action => action.includes('personality'))) {
      this.updateEmotion({ primary: 'empathetic', intensity: 0.6 });
    }

    if (memoryResult.actions.some(action => action.includes('important'))) {
      this.updateEmotion({ primary: 'focused', intensity: 0.8 });
    }
  }

  // Identity response
  getIdentityResponse(): string {
    return this.personalityManager.getIdentityResponse();
  }

  // Get comprehensive state
  getFullState() {
    return {
      personality: this.personalityManager.getCurrentState(),
      analytics: this.personalityManager.getAnalytics(),
      memory: this.config.enableMemorySystem ? {
        enabled: true,
        // Add memory state if needed
      } : {
        enabled: false
      },
      config: this.config
    };
  }

  // Reset all systems
  reset(): void {
    this.personalityManager.reset();
    
    if (this.config.enableMemorySystem) {
      this.initializeMemorySystems();
    }
  }

  // Memory-specific methods
  async recallMemories(query?: string): Promise<any[]> {
    if (!this.config.enableMemorySystem || !this.longTermMemory) {
      return [];
    }

    try {
      if (query) {
        return await this.longTermMemory.searchMemories(query);
      } else {
        return await this.longTermMemory.getRecentMemories(10);
      }
    } catch (error) {
      console.warn('Memory recall failed:', error);
      return [];
    }
  }

  async saveMemory(memory: {
    type: string;
    title: string;
    content: string;
    importance?: string;
    tags?: string[];
  }): Promise<boolean> {
    if (!this.config.enableMemorySystem || !this.longTermMemory) {
      return false;
    }

    try {
      await this.longTermMemory.addMemory({
        userId: this.config.userId,
        type: 'preference', // Default to valid type
        title: memory.title,
        content: memory.content,
        context: '',
        importance: memory.importance as any || 'medium',
        tags: memory.tags || [],
        relatedMemories: [],
        isPersonalityMemory: false
      });

      return true;
    } catch (error) {
      console.warn('Memory save failed:', error);
      return false;
    }
  }

  async getKnowledgeBase(category?: string): Promise<any[]> {
    if (!this.config.enableMemorySystem || !this.knowledgeBase) {
      return [];
    }

    try {
      // Use available method to get all knowledge items
      const allItems = await this.knowledgeBase.getUserKnowledgeItems();
      
      // Filter by category if provided
      if (category) {
        return allItems.filter(item => item.category === category);
      }
      
      return allItems;
    } catch (error) {
      console.warn('Knowledge base retrieval failed:', error);
      return [];
    }
  }

  // Configuration methods
  updateConfig(updates: Partial<BeatriceIntegrationConfig>): void {
    this.config = { ...this.config, ...updates };

    // Reinitialize systems if needed
    if (updates.enableMemorySystem !== undefined) {
      if (updates.enableMemorySystem && !this.memoryProcessor) {
        this.initializeMemorySystems();
      } else if (!updates.enableMemorySystem && this.memoryProcessor) {
        this.memoryProcessor = undefined;
        this.longTermMemory = undefined;
        this.shortTermMemory = undefined;
        this.knowledgeBase = undefined;
      }
    }

    if (updates.userAddressStyle) {
      this.updateUserAddressStyle(updates.userAddressStyle);
    }
  }

  getConfig(): BeatriceIntegrationConfig {
    return { ...this.config };
  }
}

// Factory function for easy instantiation
export function createBeatriceIntegration(config: BeatriceIntegrationConfig): BeatriceIntegration {
  return new BeatriceIntegration(config);
}
