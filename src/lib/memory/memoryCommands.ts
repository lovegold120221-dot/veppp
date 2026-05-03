import { LongTermMemoryManager } from './longTermMemory';
import { KnowledgeBaseManager } from './knowledgeBase';
import { ShortTermMemoryManager } from './shortTermMemory';

export interface MemoryCommand {
  type: 'save' | 'remember' | 'forget' | 'recall' | 'search' | 'update';
  content: string;
  category?: string;
  tags?: string[];
  importance?: 'low' | 'medium' | 'high' | 'critical';
  isPersonality?: boolean;
}

export class MemoryCommandProcessor {
  private longTermMemory: LongTermMemoryManager;
  private knowledgeBase: KnowledgeBaseManager;
  private shortTermMemory: ShortTermMemoryManager;

  constructor(userId: string, sessionId: string) {
    this.longTermMemory = new LongTermMemoryManager(userId);
    this.knowledgeBase = new KnowledgeBaseManager(userId);
    this.shortTermMemory = new ShortTermMemoryManager(userId, sessionId);
  }

  // Process user message for memory commands
  async processMessage(message: string): Promise<{
    processed: boolean;
    response?: string;
    memoriesSaved?: string[];
  }> {
    const lowerMessage = message.toLowerCase();
    
    // Check for memory save commands
    const saveCommands = [
      /please save/,
      /don't forget/,
      /remember this/,
      /save this/,
      /keep this/,
      /store this/,
      /note this/,
      /write this down/,
      /make a note/,
    ];

    const forgetCommands = [
      /forget this/,
      /delete this/,
      /remove this/,
      /don't remember/,
    ];

    const recallCommands = [
      /what do you remember/,
      /recall/,
      /what have we discussed/,
      /tell me about/,
      /what do you know about/,
      /search for/,
    ];

    const updateCommands = [
      /update this/,
      /change this/,
      /modify this/,
      /correct this/,
    ];

    // Process save commands
    if (saveCommands.some(cmd => cmd.test(lowerMessage))) {
      return await this.processSaveCommand(message);
    }

    // Process forget commands
    if (forgetCommands.some(cmd => cmd.test(lowerMessage))) {
      return await this.processForgetCommand(message);
    }

    // Process recall commands
    if (recallCommands.some(cmd => cmd.test(lowerMessage))) {
      return await this.processRecallCommand(message);
    }

    // Process update commands
    if (updateCommands.some(cmd => cmd.test(lowerMessage))) {
      return await this.processUpdateCommand(message);
    }

    // Check for implicit memory needs (important information)
    const implicitMemory = await this.checkImplicitMemory(message);
    if (implicitMemory) {
      return implicitMemory;
    }

    return { processed: false };
  }

  // Process explicit save commands
  private async processSaveCommand(message: string): Promise<{
    processed: boolean;
    response?: string;
    memoriesSaved?: string[];
  }> {
    const memoriesSaved: string[] = [];
    
    // Extract the content to save (remove command phrases)
    const contentToSave = this.extractContentToSave(message);
    if (!contentToSave) {
      return {
        processed: true,
        response: "I'd be happy to save that information, Boss. Could you clarify what specific information you'd like me to remember?"
      };
    }

    // Determine memory type based on content
    const memoryType = this.determineMemoryType(contentToSave);
    const category = this.determineCategory(contentToSave);
    const tags = this.extractTags(contentToSave);
    const importance = this.determineImportance(contentToSave);
    const isPersonality = this.isPersonalityMemory(contentToSave);

    try {
      // Save to long-term memory
      if (isPersonality || memoryType !== 'general') {
        const memoryId = await this.longTermMemory.addMemory({
          userId: '', // Will be set by constructor
          type: memoryType,
          title: this.extractTitle(contentToSave),
          content: contentToSave,
          context: await this.getCurrentContext(),
          importance,
          tags,
          relatedMemories: [],
          isPersonalityMemory: isPersonality,
        });
        memoriesSaved.push(`Long-term memory: ${memoryType}`);
      }

      // Save to knowledge base if it's factual information
      if (category !== 'personal' && !isPersonality) {
        const kbId = await this.knowledgeBase.addKnowledgeItem({
          title: this.extractTitle(contentToSave),
          content: contentToSave,
          category,
          tags,
          userId: '', // Will be set by constructor
          isPublic: false,
          priority: importance === 'critical' ? 'high' : importance === 'high' ? 'medium' : 'low',
        });
        memoriesSaved.push(`Knowledge base: ${category}`);
      }

      return {
        processed: true,
        response: `Got it, Boss. I've saved that information${memoriesSaved.length > 1 ? ' to both my memory and knowledge base' : ''}. I won't forget it.`,
        memoriesSaved
      };
    } catch (error) {
      return {
        processed: true,
        response: "I apologize, Boss. I had trouble saving that information. Could you try rephrasing it?"
      };
    }
  }

  // Process forget commands
  private async processForgetCommand(message: string): Promise<{
    processed: boolean;
    response?: string;
  }> {
    const contentToForget = this.extractContentToSave(message);
    if (!contentToForget) {
      return {
        processed: true,
        response: "I understand you want me to forget something, Boss. Could you specify what information you'd like me to remove?"
      };
    }

    try {
      // Search for matching memories
      const memories = await this.longTermMemory.searchMemories(contentToForget);
      const knowledgeItems = await this.knowledgeBase.searchKnowledge(contentToForget, false);

      let deletedCount = 0;
      
      // Delete matching memories
      for (const memory of memories) {
        if (memory.content.toLowerCase().includes(contentToForget.toLowerCase()) ||
            memory.title.toLowerCase().includes(contentToForget.toLowerCase())) {
          await this.longTermMemory.deleteMemory(memory.id);
          deletedCount++;
        }
      }

      // Delete matching knowledge items
      for (const item of knowledgeItems) {
        if (item.content.toLowerCase().includes(contentToForget.toLowerCase()) ||
            item.title.toLowerCase().includes(contentToForget.toLowerCase())) {
          await this.knowledgeBase.deleteKnowledgeItem(item.id);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        return {
          processed: true,
          response: `Done, Boss. I've removed ${deletedCount} item${deletedCount > 1 ? 's' : ''} matching that information from my memory.`
        };
      } else {
        return {
          processed: true,
          response: "I couldn't find any information matching that to forget, Boss. Are you sure I had that saved?"
        };
      }
    } catch (error) {
      return {
        processed: true,
        response: "I apologize, Boss. I had trouble removing that information. Could you try again?"
      };
    }
  }

  // Process recall commands
  private async processRecallCommand(message: string): Promise<{
    processed: boolean;
    response?: string;
  }> {
    const searchQuery = this.extractSearchQuery(message);
    
    if (!searchQuery) {
      // Return summary of all memories
      const memorySummary = await this.longTermMemory.getMemorySummary();
      const contextSummary = await this.shortTermMemory.getContextSummary();
      
      return {
        processed: true,
        response: `Here's what I remember, Boss:\n\n${memorySummary}\n\n${contextSummary}`
      };
    }

    try {
      // Search both long-term memory and knowledge base
      const memories = await this.longTermMemory.searchMemories(searchQuery);
      const knowledgeItems = await this.knowledgeBase.searchKnowledge(searchQuery, false);

      let response = '';
      
      if (memories.length > 0) {
        response += `From my memory:\n`;
        memories.slice(0, 3).forEach(memory => {
          response += `- ${memory.title}: ${memory.content}\n`;
        });
      }

      if (knowledgeItems.length > 0) {
        response += `\nFrom my knowledge base:\n`;
        knowledgeItems.slice(0, 3).forEach(item => {
          response += `- ${item.title}: ${item.content}\n`;
        });
      }

      if (memories.length === 0 && knowledgeItems.length === 0) {
        response = `I don't have any information about "${searchQuery}" in my memory or knowledge base, Boss.`;
      }

      return {
        processed: true,
        response
      };
    } catch (error) {
      return {
        processed: true,
        response: "I apologize, Boss. I had trouble accessing my memory. Could you try again?"
      };
    }
  }

  // Process update commands
  private async processUpdateCommand(message: string): Promise<{
    processed: boolean;
    response?: string;
  }> {
    const contentToUpdate = this.extractContentToSave(message);
    if (!contentToUpdate) {
      return {
        processed: true,
        response: "I understand you want me to update something, Boss. Could you specify what information needs to be updated and what the new information should be?"
      };
    }

    try {
      // Search for existing memories to update
      const memories = await this.longTermMemory.searchMemories(contentToUpdate);
      
      if (memories.length > 0) {
        // Update the most relevant memory
        const memoryToUpdate = memories[0];
        await this.longTermMemory.updateMemory(memoryToUpdate.id, {
          content: contentToUpdate,
          updatedAt: Date.now(),
        });
        
        return {
          processed: true,
          response: `Got it, Boss. I've updated that information in my memory.`
        };
      } else {
        return {
          processed: true,
          response: `I couldn't find existing information to update, Boss. Would you like me to save this as new information instead?`
        };
      }
    } catch (error) {
      return {
        processed: true,
        response: "I apologize, Boss. I had trouble updating that information. Could you try again?"
      };
    }
  }

  // Check for implicit memory needs
  private async checkImplicitMemory(message: string): Promise<{
    processed: boolean;
    response?: string;
    memoriesSaved?: string[];
  } | null> {
    const lowerMessage = message.toLowerCase();
    
    // Check for important information that should be saved implicitly
    const importantPatterns = [
      /my (name|email|phone|address)/,
      /i (work|live|study) at/,
      /my (birthday|anniversary)/,
      /i (prefer|like|dislike|hate)/,
      /i am (allergic to|intolerant of)/,
      /my (goal|objective|target)/,
      /my (family|children|spouse|partner)/,
      /i (can|cannot|can't) (do|use|work with)/,
      /remember that/i,
      /important to know/i,
      /don't forget/i,
    ];

    if (importantPatterns.some(pattern => pattern.test(lowerMessage))) {
      return await this.processSaveCommand(message);
    }

    return null;
  }

  // Helper methods
  private extractContentToSave(message: string): string {
    // Remove command phrases and extract the actual content
    const commandPatterns = [
      /please save\s+(.+?)(?:\.|$)/i,
      /don't forget\s+(.+?)(?:\.|$)/i,
      /remember this\s*[:\-]?\s*(.+?)(?:\.|$)/i,
      /save this\s*[:\-]?\s*(.+?)(?:\.|$)/i,
      /keep this\s*[:\-]?\s*(.+?)(?:\.|$)/i,
      /store this\s*[:\-]?\s*(.+?)(?:\.|$)/i,
      /note this\s*[:\-]?\s*(.+?)(?:\.|$)/i,
      /write this down\s*[:\-]?\s*(.+?)(?:\.|$)/i,
      /make a note\s*[:\-]?\s*(.+?)(?:\.|$)/i,
    ];

    for (const pattern of commandPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no pattern matches, return the whole message
    return message.trim();
  }

  private extractSearchQuery(message: string): string {
    const searchPatterns = [
      /what do you remember about\s+(.+?)(?:\.|$)/i,
      /recall\s+(.+?)(?:\.|$)/i,
      /what have we discussed about\s+(.+?)(?:\.|$)/i,
      /tell me about\s+(.+?)(?:\.|$)/i,
      /what do you know about\s+(.+?)(?:\.|$)/i,
      /search for\s+(.+?)(?:\.|$)/i,
    ];

    for (const pattern of searchPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '';
  }

  private determineMemoryType(content: string): any {
    const lowerContent = content.toLowerCase();
    
    if (/(prefer|like|dislike|hate|enjoy|want|need)/.test(lowerContent)) return 'preference';
    if (/(know|remember|learned|found out|realized)/.test(lowerContent)) return 'fact';
    if (/(friend|family|colleague|boss|partner|spouse|child)/.test(lowerContent)) return 'relationship';
    if (/(always|usually|never|sometimes|every day|weekly|monthly)/.test(lowerContent)) return 'habit';
    if (/(goal|objective|target|plan|want to achieve)/.test(lowerContent)) return 'goal';
    if (/(happened|experienced|went through)/.test(lowerContent)) return 'experience';
    if (/(think|believe|feel|opinion)/.test(lowerContent)) return 'opinion';
    if (/(can|able to|skill|expert|good at)/.test(lowerContent)) return 'skill';
    
    return 'fact';
  }

  private determineCategory(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (/(work|job|career|office|business|project)/.test(lowerContent)) return 'work';
    if (/(personal|family|home|private)/.test(lowerContent)) return 'personal';
    if (/(project|task|deadline|deliverable)/.test(lowerContent)) return 'projects';
    if (/(friend|colleague|contact|network)/.test(lowerContent)) return 'contacts';
    if (/(prefer|like|dislike|want|need)/.test(lowerContent)) return 'preferences';
    if (/(note|reminder|remember|don't forget)/.test(lowerContent)) return 'notes';
    
    return 'notes';
  }

  private extractTags(content: string): string[] {
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();
    
    // Extract common tags
    if (/(important|critical|urgent)/.test(lowerContent)) tags.push('important');
    if (/(personal|private)/.test(lowerContent)) tags.push('personal');
    if (/(work|job|career)/.test(lowerContent)) tags.push('work');
    if (/(family|home)/.test(lowerContent)) tags.push('family');
    if (/(contact|person)/.test(lowerContent)) tags.push('contact');
    if (/(deadline|date|time)/.test(lowerContent)) tags.push('schedule');
    
    return tags;
  }

  private determineImportance(content: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerContent = content.toLowerCase();
    
    if (/(critical|urgent|emergency|asap|immediately)/.test(lowerContent)) return 'critical';
    if (/(important|significant|major|key)/.test(lowerContent)) return 'high';
    if (/(useful|helpful|good to know)/.test(lowerContent)) return 'medium';
    
    return 'low';
  }

  private isPersonalityMemory(content: string): boolean {
    const lowerContent = content.toLowerCase();
    
    // Check if it's about preferences, communication style, or personal traits
    return /(prefer|like|dislike|hate|enjoy|talk|communicate|respond|formal|casual|professional|quick|slow|detailed|brief|humor|serious|warm|cold|always|usually|sometimes)/.test(lowerContent);
  }

  private extractTitle(content: string): string {
    // Use first sentence as title, or first 50 characters
    const firstSentence = content.split(/[.!?]/)[0];
    return firstSentence.length > 50 
      ? firstSentence.substring(0, 50) + '...'
      : firstSentence;
  }

  private async getCurrentContext(): Promise<string> {
    const context = await this.shortTermMemory.getConversationContext();
    return context?.currentTopic || 'general';
  }
}
