import { ref, get, set, update } from 'firebase/database';
import { rtdb } from '../firebase/index';

export interface ConversationContext {
  sessionId: string;
  userId: string;
  startTime: number;
  lastActivity: number;
  currentTopic: string;
  previousTopics: string[];
  userMood: 'neutral' | 'positive' | 'negative' | 'frustrated' | 'excited';
  userIntent: 'casual' | 'task' | 'question' | 'complaint' | 'request';
  contextSummary: string;
  keyPoints: string[];
  pendingTasks: string[];
  mentionedEntities: string[];
  mentionedPeople: string[];
  mentionedDates: string[];
  mentionedNumbers: string[];
  fileReferences: string[];
  lastMessages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    type: 'text' | 'file' | 'task' | 'question';
  }[];
}

export interface WorkingMemory {
  userId: string;
  sessionId: string;
  variables: Record<string, any>;
  temporaryContext: string[];
  clipboard: string[];
  recentSearches: {
    query: string;
    timestamp: number;
    results: any[];
  }[];
  activeTools: string[];
  toolResults: {
    toolName: string;
    result: any;
    timestamp: number;
  }[];
  lastUpdated: number;
}

export class ShortTermMemoryManager {
  private userId: string;
  private sessionId: string;

  constructor(userId: string, sessionId: string) {
    this.userId = userId;
    this.sessionId = sessionId;
  }

  // Get conversation context reference
  private getConversationRef() {
    return ref(rtdb, `users/${this.userId}/shortTermMemory/conversations/${this.sessionId}`);
  }

  // Get working memory reference
  private getWorkingMemoryRef() {
    return ref(rtdb, `users/${this.userId}/shortTermMemory/workingMemory/${this.sessionId}`);
  }

  // Initialize new conversation
  async initializeConversation(): Promise<void> {
    const conversation: ConversationContext = {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      currentTopic: 'general',
      previousTopics: [],
      userMood: 'neutral',
      userIntent: 'casual',
      contextSummary: '',
      keyPoints: [],
      pendingTasks: [],
      mentionedEntities: [],
      mentionedPeople: [],
      mentionedDates: [],
      mentionedNumbers: [],
      fileReferences: [],
      lastMessages: [],
    };

    const conversationRef = this.getConversationRef();
    await set(conversationRef, conversation);

    // Also initialize working memory
    const workingMemory: WorkingMemory = {
      userId: this.userId,
      sessionId: this.sessionId,
      variables: {},
      temporaryContext: [],
      clipboard: [],
      recentSearches: [],
      activeTools: [],
      toolResults: [],
      lastUpdated: Date.now(),
    };

    const workingMemoryRef = this.getWorkingMemoryRef();
    await set(workingMemoryRef, workingMemory);
  }

  // Add message to conversation
  async addMessage(
    role: 'user' | 'assistant',
    content: string,
    type: 'text' | 'file' | 'task' | 'question' = 'text'
  ): Promise<void> {
    const conversationRef = this.getConversationRef();
    const snapshot = await get(conversationRef);
    
    if (!snapshot.exists()) {
      await this.initializeConversation();
    }

    const message = {
      role,
      content,
      timestamp: Date.now(),
      type,
    };

    await update(conversationRef, {
      lastActivity: Date.now(),
      lastMessages: [...(snapshot.val()?.lastMessages || []), message].slice(-10), // Keep last 10 messages
    });

    // Analyze message for context
    await this.analyzeMessageForContext(content, role);
  }

  // Analyze message for context extraction
  private async analyzeMessageForContext(content: string, role: 'user' | 'assistant'): Promise<void> {
    const conversationRef = this.getConversationRef();
    const snapshot = await get(conversationRef);
    
    if (!snapshot.exists()) return;

    const context = snapshot.val() as ConversationContext;
    const updates: Partial<ConversationContext> = {};

    // Extract entities (simple pattern matching)
    const entities = this.extractEntities(content);
    if (entities.length > 0) {
      updates.mentionedEntities = [...new Set([...context.mentionedEntities, ...entities])];
    }

    // Extract people names (basic pattern)
    const people = this.extractPeople(content);
    if (people.length > 0) {
      updates.mentionedPeople = [...new Set([...context.mentionedPeople, ...people])];
    }

    // Extract dates
    const dates = this.extractDates(content);
    if (dates.length > 0) {
      updates.mentionedDates = [...new Set([...context.mentionedDates, ...dates])];
    }

    // Extract numbers
    const numbers = this.extractNumbers(content);
    if (numbers.length > 0) {
      updates.mentionedNumbers = [...new Set([...context.mentionedNumbers, ...numbers])];
    }

    // Detect user mood (only from user messages)
    if (role === 'user') {
      const mood = this.detectMood(content);
      if (mood !== context.userMood) {
        updates.userMood = mood;
      }

      // Detect intent
      const intent = this.detectIntent(content);
      if (intent !== context.userIntent) {
        updates.userIntent = intent;
      }
    }

    // Update current topic (simple keyword extraction)
    const topic = this.extractTopic(content);
    if (topic && topic !== context.currentTopic) {
      updates.previousTopics = [...context.previousTopics, context.currentTopic].slice(-5);
      updates.currentTopic = topic;
    }

    // Extract key points (sentences with important keywords)
    const keyPoints = this.extractKeyPoints(content);
    if (keyPoints.length > 0) {
      updates.keyPoints = [...new Set([...context.keyPoints, ...keyPoints])].slice(-20);
    }

    // Detect tasks
    const tasks = this.extractTasks(content);
    if (tasks.length > 0) {
      updates.pendingTasks = [...new Set([...context.pendingTasks, ...tasks])];
    }

    if (Object.keys(updates).length > 0) {
      await update(conversationRef, updates);
    }
  }

  // Get conversation context
  async getConversationContext(): Promise<ConversationContext | null> {
    const conversationRef = this.getConversationRef();
    const snapshot = await get(conversationRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val() as ConversationContext;
  }

  // Update working memory
  async updateWorkingMemory(updates: Partial<WorkingMemory>): Promise<void> {
    const workingMemoryRef = this.getWorkingMemoryRef();
    const snapshot = await get(workingMemoryRef);
    
    if (!snapshot.exists()) {
      // Initialize if doesn't exist
      const workingMemory: WorkingMemory = {
        userId: this.userId,
        sessionId: this.sessionId,
        variables: {},
        temporaryContext: [],
        clipboard: [],
        recentSearches: [],
        activeTools: [],
        toolResults: [],
        lastUpdated: Date.now(),
        ...updates,
      };
      await set(workingMemoryRef, workingMemory);
    } else {
      await update(workingMemoryRef, {
        ...updates,
        lastUpdated: Date.now(),
      });
    }
  }

  // Get working memory
  async getWorkingMemory(): Promise<WorkingMemory | null> {
    const workingMemoryRef = this.getWorkingMemoryRef();
    const snapshot = await get(workingMemoryRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val() as WorkingMemory;
  }

  // Set variable in working memory
  async setVariable(key: string, value: any): Promise<void> {
    await this.updateWorkingMemory({
      variables: { [key]: value }
    });
  }

  // Get variable from working memory
  async getVariable(key: string): Promise<any> {
    const workingMemory = await this.getWorkingMemory();
    return workingMemory?.variables[key] || null;
  }

  // Add to clipboard
  async addToClipboard(content: string): Promise<void> {
    const workingMemory = await this.getWorkingMemory();
    const clipboard = workingMemory?.clipboard || [];
    await this.updateWorkingMemory({
      clipboard: [...clipboard, content].slice(-10) // Keep last 10 items
    });
  }

  // Get clipboard
  async getClipboard(): Promise<string[]> {
    const workingMemory = await this.getWorkingMemory();
    return workingMemory?.clipboard || [];
  }

  // Add search result
  async addSearchResult(query: string, results: any[]): Promise<void> {
    const workingMemory = await this.getWorkingMemory();
    const recentSearches = workingMemory?.recentSearches || [];
    await this.updateWorkingMemory({
      recentSearches: [...recentSearches, {
        query,
        timestamp: Date.now(),
        results
      }].slice(-5) // Keep last 5 searches
    });
  }

  // Add tool result
  async addToolResult(toolName: string, result: any): Promise<void> {
    const workingMemory = await this.getWorkingMemory();
    const toolResults = workingMemory?.toolResults || [];
    await this.updateWorkingMemory({
      toolResults: [...toolResults, {
        toolName,
        result,
        timestamp: Date.now()
      }].slice(-10) // Keep last 10 tool results
    });
  }

  // Clear conversation context
  async clearConversation(): Promise<void> {
    await this.initializeConversation();
  }

  // Clear working memory
  async clearWorkingMemory(): Promise<void> {
    const workingMemoryRef = this.getWorkingMemoryRef();
    await set(workingMemoryRef, {
      userId: this.userId,
      sessionId: this.sessionId,
      variables: {},
      temporaryContext: [],
      clipboard: [],
      recentSearches: [],
      activeTools: [],
      toolResults: [],
      lastUpdated: Date.now(),
    });
  }

  // Get context summary for AI
  async getContextSummary(): Promise<string> {
    const context = await this.getConversationContext();
    const workingMemory = await this.getWorkingMemory();
    
    if (!context) return '';

    let summary = 'Current Conversation Context:\n\n';
    
    // Basic info
    summary += `Current Topic: ${context.currentTopic}\n`;
    summary += `User Mood: ${context.userMood}\n`;
    summary += `User Intent: ${context.userIntent}\n\n`;
    
    // Key points
    if (context.keyPoints.length > 0) {
      summary += 'Key Points:\n';
      context.keyPoints.slice(0, 5).forEach(point => {
        summary += `- ${point}\n`;
      });
      summary += '\n';
    }
    
    // Pending tasks
    if (context.pendingTasks.length > 0) {
      summary += 'Pending Tasks:\n';
      context.pendingTasks.forEach(task => {
        summary += `- ${task}\n`;
      });
      summary += '\n';
    }
    
    // Mentioned entities
    if (context.mentionedEntities.length > 0) {
      summary += `Entities: ${context.mentionedEntities.join(', ')}\n\n`;
    }
    
    // Working memory variables
    if (workingMemory && Object.keys(workingMemory.variables).length > 0) {
      summary += 'Working Memory:\n';
      Object.entries(workingMemory.variables).forEach(([key, value]) => {
        summary += `- ${key}: ${JSON.stringify(value)}\n`;
      });
      summary += '\n';
    }
    
    // Recent messages (last 3)
    if (context.lastMessages.length > 0) {
      summary += 'Recent Messages:\n';
      context.lastMessages.slice(-3).forEach(msg => {
        summary += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    return summary;
  }

  // Simple entity extraction
  private extractEntities(text: string): string[] {
    // Basic pattern for capitalized words (potential entities)
    const entities = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    return entities.filter(entity => 
      entity.length > 2 && 
      !['I', 'You', 'We', 'They', 'It', 'He', 'She'].includes(entity)
    );
  }

  // Simple people name extraction
  private extractPeople(text: string): string[] {
    // Look for patterns like "John said" or "talk to Sarah"
    const patterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(said|told|asked|mentioned|called)\b/gi,
      /\b(talk to|call|email|contact)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi,
    ];
    
    const people: string[] = [];
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const nameMatch = match.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
          if (nameMatch) {
            people.push(nameMatch[1]);
          }
        });
      }
    });
    
    return people;
  }

  // Simple date extraction
  private extractDates(text: string): string[] {
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // MM/DD/YYYY
      /\b\d{4}-\d{2}-\d{2}\b/g, // YYYY-MM-DD
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi, // Month DD, YYYY
      /\b(today|tomorrow|yesterday|next week|last week|next month|last month)\b/gi,
    ];
    
    const dates: string[] = [];
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    });
    
    return dates;
  }

  // Simple number extraction
  private extractNumbers(text: string): string[] {
    const numberPatterns = [
      /\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, // Money
      /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:dollars?|USD|cents?|€|euros?|£|pounds?)\b/gi, // Money with words
      /\b\d+(?:\.\d+)?\s*(?:%|percent|percentage)\b/gi, // Percentages
      /\b\d+(?:\.\d+)?\s*(?:hours?|hrs?|minutes?|mins?|seconds?|secs?|days?|weeks?|months?|years?)\b/gi, // Time
      /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g, // General numbers
    ];
    
    const numbers: string[] = [];
    numberPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        numbers.push(...matches);
      }
    });
    
    return numbers;
  }

  // Simple mood detection
  private detectMood(text: string): ConversationContext['userMood'] {
    const lowerText = text.toLowerCase();
    
    if (/(happy|great|awesome|excellent|wonderful|fantastic|amazing|love|perfect)/.test(lowerText)) {
      return 'positive';
    }
    if (/(sad|bad|terrible|awful|hate|angry|frustrated|annoyed|upset)/.test(lowerText)) {
      return 'negative';
    }
    if (/(excited|wow|incredible|amazing|can't wait|looking forward)/.test(lowerText)) {
      return 'excited';
    }
    if (/(stuck|confused|don't understand|help|issue|problem|error)/.test(lowerText)) {
      return 'frustrated';
    }
    
    return 'neutral';
  }

  // Simple intent detection
  private detectIntent(text: string): ConversationContext['userIntent'] {
    const lowerText = text.toLowerCase();
    
    if (/(can you|could you|please|help|assist|support)/.test(lowerText)) {
      return 'request';
    }
    if ((/\?/.test(text) || /(what|when|where|why|how|which|who|is|are|do|does|did|can|could|would|should)/.test(lowerText))) {
      return 'question';
    }
    if (/(complain|issue|problem|wrong|broken|not working|error)/.test(lowerText)) {
      return 'complaint';
    }
    if (/(create|make|build|write|generate|develop|implement)/.test(lowerText)) {
      return 'task';
    }
    
    return 'casual';
  }

  // Simple topic extraction
  private extractTopic(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Common topics
    if (/(email|mail|message|communication)/.test(lowerText)) return 'email';
    if (/(calendar|schedule|appointment|meeting)/.test(lowerText)) return 'calendar';
    if (/(document|file|report|contract|invoice)/.test(lowerText)) return 'documents';
    if (/(project|task|work|job)/.test(lowerText)) return 'work';
    if (/(personal|family|friend|home)/.test(lowerText)) return 'personal';
    if (/(technical|code|programming|software|system)/.test(lowerText)) return 'technical';
    
    return 'general';
  }

  // Simple key point extraction
  private extractKeyPoints(text: string): string[] {
    // Split into sentences and look for important ones
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyPoints: string[] = [];
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      
      // Look for sentences with important indicators
      if (/(important|remember|note|key|critical|essential|must|should)/.test(lowerSentence) ||
          /(need|want|require|prefer|like|dislike)/.test(lowerSentence) ||
          /\d+/.test(sentence)) { // Contains numbers
        keyPoints.push(sentence.trim());
      }
    });
    
    return keyPoints;
  }

  // Simple task extraction
  private extractTasks(text: string): string[] {
    const taskPatterns = [
      /\b(?:need to|have to|must|should|will|going to)\s+(.+?)(?:\.|$)/gi,
      /\b(?:please|can you|could you)\s+(.+?)(?:\.|$)/gi,
      /\b(?:create|make|build|write|send|schedule|set up|prepare)\s+(.+?)(?:\.|$)/gi,
    ];
    
    const tasks: string[] = [];
    taskPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        tasks.push(...matches.map(match => match.trim()));
      }
    });
    
    return tasks;
  }
}
