import { ref, child, get, set, update, serverTimestamp } from 'firebase/database';
import { rtdb } from '../firebase/index';

export interface MemoryItem {
  id: string;
  userId: string;
  type: 'preference' | 'fact' | 'relationship' | 'habit' | 'goal' | 'experience' | 'opinion' | 'skill';
  title: string;
  content: string;
  context: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  createdAt: number;
  updatedAt: number;
  lastAccessed: number;
  accessCount: number;
  relatedMemories: string[];
  isPersonalityMemory: boolean;
}

export interface PersonalityProfile {
  userId: string;
  communicationStyle: {
    formality: 'very formal' | 'formal' | 'casual' | 'very casual';
    verbosity: 'concise' | 'balanced' | 'detailed';
    humorLevel: 'none' | 'light' | 'moderate' | 'heavy';
    emotionalTone: 'neutral' | 'warm' | 'enthusiastic' | 'professional';
  };
  preferences: {
    topics: string[];
    avoidTopics: string[];
    workingStyle: string;
    responseSpeed: 'immediate' | 'quick' | 'thoughtful' | 'deliberate';
  };
  relationships: {
    [personName: string]: {
      relationship: string;
      context: string;
      importance: 'low' | 'medium' | 'high' | 'critical';
      notes: string[];
    };
  };
  habits: {
    daily: string[];
    weekly: string[];
    monthly: string[];
  };
  goals: {
    shortTerm: string[];
    longTerm: string[];
  };
  skills: {
    technical: string[];
    soft: string[];
    domain: string[];
  };
  updatedAt: number;
}

export class LongTermMemoryManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Get user's memory reference
  private getMemoryRef() {
    return ref(rtdb, `users/${this.userId}/longTermMemory`);
  }

  // Get personality profile reference
  private getPersonalityRef() {
    return ref(rtdb, `users/${this.userId}/personalityProfile`);
  }

  // Add a new memory item
  async addMemory(memory: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessed' | 'accessCount'>): Promise<string> {
    const newMemory: MemoryItem = {
      ...memory,
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      relatedMemories: [],
    };

    const memoryRef = this.getMemoryRef();
    await set(child(memoryRef, newMemory.id), newMemory);

    // If it's a personality memory, update personality profile
    if (memory.isPersonalityMemory) {
      await this.updatePersonalityProfile(newMemory);
    }

    return newMemory.id;
  }

  // Update existing memory
  async updateMemory(id: string, updates: Partial<MemoryItem>): Promise<void> {
    const memoryRef = this.getMemoryRef();
    await update(child(memoryRef, id), {
      ...updates,
      updatedAt: Date.now(),
    });

    // If it's a personality memory, update personality profile
    const itemRef = child(memoryRef, id);
    const snapshot = await get(itemRef);
    if (snapshot.exists()) {
      const memory = snapshot.val() as MemoryItem;
      if (memory.isPersonalityMemory) {
        const updatedMemory = { ...memory, ...updates, updatedAt: Date.now() };
        await this.updatePersonalityProfile(updatedMemory);
      }
    }
  }

  // Access memory (increments access count)
  async accessMemory(id: string): Promise<MemoryItem | null> {
    const memoryRef = this.getMemoryRef();
    const itemRef = child(memoryRef, id);
    const snapshot = await get(itemRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    const memory = snapshot.val() as MemoryItem;
    
    // Update access statistics
    await update(itemRef, {
      lastAccessed: Date.now(),
      accessCount: memory.accessCount + 1,
    });

    return memory;
  }

  // Search memories by content
  async searchMemories(query: string, type?: MemoryItem['type']): Promise<MemoryItem[]> {
    const memoryRef = this.getMemoryRef();
    const snapshot = await get(memoryRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const memories: MemoryItem[] = [];
    const searchQuery = query.toLowerCase();
    
    snapshot.forEach((child) => {
      const memory = child.val() as MemoryItem;
      const matchesType = !type || memory.type === type;
      const matchesQuery = 
        memory.title.toLowerCase().includes(searchQuery) ||
        memory.content.toLowerCase().includes(searchQuery) ||
        memory.context.toLowerCase().includes(searchQuery) ||
        memory.tags.some(tag => tag.toLowerCase().includes(searchQuery));
      
      if (matchesType && matchesQuery) {
        memories.push(memory);
      }
    });

    return memories.sort((a, b) => {
      // Sort by importance first, then by last accessed
      const importanceOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aImportance = importanceOrder[a.importance];
      const bImportance = importanceOrder[b.importance];
      
      if (aImportance !== bImportance) {
        return bImportance - aImportance;
      }
      
      return b.lastAccessed - a.lastAccessed;
    });
  }

  // Get memories by type
  async getMemoriesByType(type: MemoryItem['type']): Promise<MemoryItem[]> {
    const memoryRef = this.getMemoryRef();
    const snapshot = await get(memoryRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const memories: MemoryItem[] = [];
    snapshot.forEach((child) => {
      const memory = child.val() as MemoryItem;
      if (memory.type === type) {
        memories.push(memory);
      }
    });

    return memories.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  // Get important memories (high or critical importance)
  async getImportantMemories(): Promise<MemoryItem[]> {
    const memoryRef = this.getMemoryRef();
    const snapshot = await get(memoryRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const memories: MemoryItem[] = [];
    snapshot.forEach((child) => {
      const memory = child.val() as MemoryItem;
      if (memory.importance === 'high' || memory.importance === 'critical') {
        memories.push(memory);
      }
    });

    return memories.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  // Get recently accessed memories
  async getRecentMemories(limit: number = 10): Promise<MemoryItem[]> {
    const memoryRef = this.getMemoryRef();
    const snapshot = await get(memoryRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const memories: MemoryItem[] = [];
    snapshot.forEach((child) => {
      memories.push(child.val() as MemoryItem);
    });

    return memories
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit);
  }

  // Delete memory
  async deleteMemory(id: string): Promise<void> {
    const memoryRef = this.getMemoryRef();
    await set(child(memoryRef, id), null);
  }

  // Get personality profile
  async getPersonalityProfile(): Promise<PersonalityProfile | null> {
    const personalityRef = this.getPersonalityRef();
    const snapshot = await get(personalityRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val() as PersonalityProfile;
  }

  // Update personality profile
  async updatePersonalityProfile(memory: MemoryItem): Promise<void> {
    const personalityRef = this.getPersonalityRef();
    const currentProfile = await this.getPersonalityProfile();
    
    const updatedProfile = currentProfile || this.createDefaultPersonalityProfile();
    
    // Update based on memory type
    switch (memory.type) {
      case 'preference':
        this.updatePreferences(updatedProfile, memory);
        break;
      case 'relationship':
        this.updateRelationships(updatedProfile, memory);
        break;
      case 'habit':
        this.updateHabits(updatedProfile, memory);
        break;
      case 'goal':
        this.updateGoals(updatedProfile, memory);
        break;
      case 'skill':
        this.updateSkills(updatedProfile, memory);
        break;
      case 'opinion':
        this.updateCommunicationStyle(updatedProfile, memory);
        break;
    }
    
    updatedProfile.updatedAt = Date.now();
    await set(personalityRef, updatedProfile);
  }

  private createDefaultPersonalityProfile(): PersonalityProfile {
    return {
      userId: this.userId,
      communicationStyle: {
        formality: 'casual',
        verbosity: 'balanced',
        humorLevel: 'light',
        emotionalTone: 'warm',
      },
      preferences: {
        topics: [],
        avoidTopics: [],
        workingStyle: 'collaborative',
        responseSpeed: 'quick',
      },
      relationships: {},
      habits: {
        daily: [],
        weekly: [],
        monthly: [],
      },
      goals: {
        shortTerm: [],
        longTerm: [],
      },
      skills: {
        technical: [],
        soft: [],
        domain: [],
      },
      updatedAt: Date.now(),
    };
  }

  private updatePreferences(profile: PersonalityProfile, memory: MemoryItem): void {
    // Extract preferences from memory content
    const content = memory.content.toLowerCase();
    
    if (content.includes('formal')) {
      profile.communicationStyle.formality = 'formal';
    } else if (content.includes('casual')) {
      profile.communicationStyle.formality = 'casual';
    }
    
    if (content.includes('detailed')) {
      profile.communicationStyle.verbosity = 'detailed';
    } else if (content.includes('concise')) {
      profile.communicationStyle.verbosity = 'concise';
    }
    
    // Add topics
    memory.tags.forEach(tag => {
      if (!profile.preferences.topics.includes(tag)) {
        profile.preferences.topics.push(tag);
      }
    });
  }

  private updateRelationships(profile: PersonalityProfile, memory: MemoryItem): void {
    // Extract person name from title or content
    const personMatch = memory.title.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/) || 
                       memory.content.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
    
    if (personMatch) {
      const personName = personMatch[1];
      if (!profile.relationships[personName]) {
        profile.relationships[personName] = {
          relationship: 'unknown',
          context: memory.context,
          importance: memory.importance,
          notes: [memory.content],
        };
      } else {
        profile.relationships[personName].notes.push(memory.content);
        profile.relationships[personName].context = memory.context;
      }
    }
  }

  private updateHabits(profile: PersonalityProfile, memory: MemoryItem): void {
    const content = memory.content.toLowerCase();
    
    if (content.includes('daily')) {
      if (!profile.habits.daily.includes(memory.title)) {
        profile.habits.daily.push(memory.title);
      }
    } else if (content.includes('weekly')) {
      if (!profile.habits.weekly.includes(memory.title)) {
        profile.habits.weekly.push(memory.title);
      }
    } else if (content.includes('monthly')) {
      if (!profile.habits.monthly.includes(memory.title)) {
        profile.habits.monthly.push(memory.title);
      }
    }
  }

  private updateGoals(profile: PersonalityProfile, memory: MemoryItem): void {
    const content = memory.content.toLowerCase();
    
    if (content.includes('short') || content.includes('immediate')) {
      if (!profile.goals.shortTerm.includes(memory.title)) {
        profile.goals.shortTerm.push(memory.title);
      }
    } else {
      if (!profile.goals.longTerm.includes(memory.title)) {
        profile.goals.longTerm.push(memory.title);
      }
    }
  }

  private updateSkills(profile: PersonalityProfile, memory: MemoryItem): void {
    const content = memory.content.toLowerCase();
    
    if (content.includes('technical') || content.includes('programming') || content.includes('code')) {
      if (!profile.skills.technical.includes(memory.title)) {
        profile.skills.technical.push(memory.title);
      }
    } else if (content.includes('communication') || content.includes('leadership') || content.includes('teamwork')) {
      if (!profile.skills.soft.includes(memory.title)) {
        profile.skills.soft.push(memory.title);
      }
    } else {
      if (!profile.skills.domain.includes(memory.title)) {
        profile.skills.domain.push(memory.title);
      }
    }
  }

  private updateCommunicationStyle(profile: PersonalityProfile, memory: MemoryItem): void {
    const content = memory.content.toLowerCase();
    
    if (content.includes('humor')) {
      profile.communicationStyle.humorLevel = 'moderate';
    }
    
    if (content.includes('enthusiastic')) {
      profile.communicationStyle.emotionalTone = 'enthusiastic';
    } else if (content.includes('professional')) {
      profile.communicationStyle.emotionalTone = 'professional';
    }
    
    if (content.includes('quick')) {
      profile.preferences.responseSpeed = 'quick';
    } else if (content.includes('deliberate')) {
      profile.preferences.responseSpeed = 'deliberate';
    }
  }

  // Get memory summary for AI context
  async getMemorySummary(): Promise<string> {
    const importantMemories = await this.getImportantMemories();
    const personalityProfile = await this.getPersonalityProfile();
    
    let summary = "User Memory Summary:\n\n";
    
    // Important memories
    if (importantMemories.length > 0) {
      summary += "Important Information:\n";
      importantMemories.slice(0, 5).forEach(memory => {
        summary += `- ${memory.title}: ${memory.content}\n`;
      });
      summary += "\n";
    }
    
    // Personality profile
    if (personalityProfile) {
      summary += "Communication Style:\n";
      summary += `- Formality: ${personalityProfile.communicationStyle.formality}\n`;
      summary += `- Verbosity: ${personalityProfile.communicationStyle.verbosity}\n`;
      summary += `- Tone: ${personalityProfile.communicationStyle.emotionalTone}\n\n`;
      
      if (personalityProfile.preferences.topics.length > 0) {
        summary += `Preferred Topics: ${personalityProfile.preferences.topics.join(', ')}\n\n`;
      }
      
      if (personalityProfile.goals.shortTerm.length > 0) {
        summary += `Short-term Goals: ${personalityProfile.goals.shortTerm.join(', ')}\n\n`;
      }
      
      if (personalityProfile.relationships && Object.keys(personalityProfile.relationships).length > 0) {
        summary += "Key Relationships:\n";
        Object.entries(personalityProfile.relationships).slice(0, 3).forEach(([name, rel]) => {
          summary += `- ${name}: ${rel.relationship}\n`;
        });
      }
    }
    
    return summary;
  }
}
