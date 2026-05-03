import { ref, child, get, set, update, serverTimestamp } from 'firebase/database';
import { rtdb } from '../firebase/index';

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  userId: string;
  isPublic: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  itemCount: number;
}

export class KnowledgeBaseManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Get user's knowledge base reference
  private getUserKbRef() {
    return ref(rtdb, `users/${this.userId}/knowledgeBase`);
  }

  // Get global knowledge base reference (shared across all users)
  private getGlobalKbRef() {
    return ref(rtdb, 'knowledgeBase');
  }

  // Add a new knowledge item
  async addKnowledgeItem(item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newItem: KnowledgeItem = {
      ...item,
      id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const userKbRef = this.getUserKbRef();
    await update(child(userKbRef, newItem.id), newItem);

    // If public, also add to global knowledge base
    if (item.isPublic) {
      const globalKbRef = this.getGlobalKbRef();
      await update(child(globalKbRef, newItem.id), newItem);
    }

    return newItem.id;
  }

  // Update existing knowledge item
  async updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>): Promise<void> {
    const userKbRef = this.getUserKbRef();
    await update(child(userKbRef, id), {
      ...updates,
      updatedAt: Date.now(),
    });

    // Also update in global if it's public
    const itemRef = child(userKbRef, id);
    const snapshot = await get(itemRef);
    if (snapshot.exists()) {
      const item = snapshot.val() as KnowledgeItem;
      if (item.isPublic) {
        const globalKbRef = this.getGlobalKbRef();
        await update(child(globalKbRef, id), {
          ...updates,
          updatedAt: Date.now(),
        });
      }
    }
  }

  // Delete knowledge item
  async deleteKnowledgeItem(id: string): Promise<void> {
    const userKbRef = this.getUserKbRef();
    
    // Check if it's public before deleting from global
    const itemRef = child(userKbRef, id);
    const snapshot = await get(itemRef);
    if (snapshot.exists()) {
      const item = snapshot.val() as KnowledgeItem;
      if (item.isPublic) {
        const globalKbRef = this.getGlobalKbRef();
        await set(child(globalKbRef, id), null);
      }
    }

    await set(child(userKbRef, id), null);
  }

  // Get all user knowledge items
  async getUserKnowledgeItems(): Promise<KnowledgeItem[]> {
    const userKbRef = this.getUserKbRef();
    const snapshot = await get(userKbRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const items: KnowledgeItem[] = [];
    snapshot.forEach((child) => {
      items.push(child.val() as KnowledgeItem);
    });

    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Get global knowledge items (shared knowledge)
  async getGlobalKnowledgeItems(): Promise<KnowledgeItem[]> {
    const globalKbRef = this.getGlobalKbRef();
    const snapshot = await get(globalKbRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const items: KnowledgeItem[] = [];
    snapshot.forEach((child) => {
      const item = child.val() as KnowledgeItem;
      if (item.isPublic) {
        items.push(item);
      }
    });

    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Search knowledge items
  async searchKnowledge(query: string, includeGlobal: boolean = true): Promise<KnowledgeItem[]> {
    const userItems = await this.getUserKnowledgeItems();
    let allItems = [...userItems];

    if (includeGlobal) {
      const globalItems = await this.getGlobalKnowledgeItems();
      allItems = [...allItems, ...globalItems];
    }

    const searchQuery = query.toLowerCase();
    
    return allItems.filter(item => 
      item.title.toLowerCase().includes(searchQuery) ||
      item.content.toLowerCase().includes(searchQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
      item.category.toLowerCase().includes(searchQuery)
    );
  }

  // Get items by category
  async getItemsByCategory(category: string): Promise<KnowledgeItem[]> {
    const userItems = await this.getUserKnowledgeItems();
    const globalItems = await this.getGlobalKnowledgeItems();
    
    return [...userItems, ...globalItems].filter(item => 
      item.category === category
    );
  }

  // Get items by tags
  async getItemsByTags(tags: string[]): Promise<KnowledgeItem[]> {
    const userItems = await this.getUserKnowledgeItems();
    const globalItems = await this.getGlobalKnowledgeItems();
    
    return [...userItems, ...globalItems].filter(item => 
      tags.some(tag => item.tags.includes(tag))
    );
  }

  // Get categories with item counts
  async getCategories(): Promise<KnowledgeCategory[]> {
    const userItems = await this.getUserKnowledgeItems();
    const globalItems = await this.getGlobalKnowledgeItems();
    const allItems = [...userItems, ...globalItems];

    const categoryMap = new Map<string, number>();
    
    allItems.forEach(item => {
      categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
    });

    const defaultCategories: KnowledgeCategory[] = [
      { id: 'work', name: 'Work', description: 'Work-related information', color: '#3b82f6', icon: '💼', itemCount: 0 },
      { id: 'personal', name: 'Personal', description: 'Personal information', color: '#10b981', icon: '👤', itemCount: 0 },
      { id: 'projects', name: 'Projects', description: 'Project details and status', color: '#f59e0b', icon: '📋', itemCount: 0 },
      { id: 'contacts', name: 'Contacts', description: 'People and relationships', color: '#8b5cf6', icon: '👥', itemCount: 0 },
      { id: 'preferences', name: 'Preferences', description: 'User preferences and settings', color: '#ef4444', icon: '⚙️', itemCount: 0 },
      { id: 'notes', name: 'Notes', description: 'General notes and reminders', color: '#6b7280', icon: '📝', itemCount: 0 },
    ];

    // Update item counts
    defaultCategories.forEach(category => {
      category.itemCount = categoryMap.get(category.id) || 0;
    });

    // Add custom categories
    categoryMap.forEach((count, categoryName) => {
      if (!defaultCategories.find(cat => cat.id === categoryName)) {
        defaultCategories.push({
          id: categoryName,
          name: categoryName,
          description: `Custom category: ${categoryName}`,
          color: '#6b7280',
          icon: '📁',
          itemCount: count,
        });
      }
    });

    return defaultCategories.sort((a, b) => b.itemCount - a.itemCount);
  }

  // Import knowledge from text (for quick adding)
  async importFromText(text: string, category: string = 'notes', tags: string[] = []): Promise<string> {
    const lines = text.split('\n').filter(line => line.trim());
    const title = lines[0]?.trim() || 'Untitled Note';
    const content = lines.slice(1).join('\n').trim() || text;

    return this.addKnowledgeItem({
      title,
      content,
      category,
      tags,
      userId: this.userId,
      isPublic: false,
      priority: 'medium',
    });
  }

  // Export knowledge items (for backup)
  async exportKnowledge(): Promise<KnowledgeItem[]> {
    return this.getUserKnowledgeItems();
  }

  // Import knowledge items (from backup)
  async importKnowledge(items: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> {
    const ids: string[] = [];
    
    for (const item of items) {
      const id = await this.addKnowledgeItem(item);
      ids.push(id);
    }

    return ids;
  }
}
