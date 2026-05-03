import { 
  ref, 
  get, 
  set, 
  update, 
  push, 
  serverTimestamp,
  DatabaseReference,
  DataSnapshot
} from 'firebase/database';
import { rtdb } from './index';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  speaker?: string;
  source?: 'user' | 'assistant';
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
}

export interface AgentSettings {
  userName: string;
  agentName: string;
  personaName: string;
  personality: string;
  avatarUrl: string;
  selectedVoice: string;
  language: string;
}

export interface UserData {
  displayName: string;
  email: string;
  authProvider: string;
  googleServicesConnected: boolean;
  createdAt: string;
  updatedAt: string;
  settings: AgentSettings;
}

export const getUserRef = (userId: string): DatabaseReference => {
  return ref(rtdb, 'users/' + userId);
};

export const getMessagesRef = (userId: string): DatabaseReference => {
  return ref(rtdb, 'users/' + userId + '/messages');
};

export const getMessageRef = (userId: string): DatabaseReference => {
  return push(ref(rtdb, 'users/' + userId + '/messages'));
};

export const saveMessage = async (
  userId: string, 
  role: 'user' | 'model', 
  text: string,
  speaker?: string
): Promise<void> => {
  try {
    const msgRef = getMessageRef(userId);
    await set(msgRef, {
      role,
      source: role === 'model' ? 'assistant' : 'user',
      speaker: speaker || (role === 'model' ? 'ASSISTANT' : 'USER'),
      text: text.trim(),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error saving message:', error);
    throw new Error('Failed to save message');
  }
};

export const saveFileMessage = async (
  userId: string,
  file: {
    name: string;
    type: string;
    size: number;
    url?: string;
  }
): Promise<void> => {
  try {
    const msgRef = getMessageRef(userId);
    await set(msgRef, {
      role: 'user',
      source: 'user',
      speaker: 'USER',
      text: `📎 ${file.name}`,
      fileUrl: file.url,
      fileType: file.type,
      fileName: file.name,
      fileSize: file.size,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error saving file message:', error);
    throw new Error('Failed to save file message');
  }
};

export const loadMessages = async (userId: string): Promise<ChatMessage[]> => {
  try {
    const messagesRef = getMessagesRef(userId);
    const snapshot = await get(messagesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const messages: ChatMessage[] = [];
    snapshot.forEach((child) => {
      const message = child.val();
      if (message.text) {
        messages.push({
          role: message.role || 'user',
          text: message.text,
          timestamp: message.timestamp || Date.now(),
          speaker: message.speaker,
          source: message.source,
          fileUrl: message.fileUrl,
          fileType: message.fileType,
          fileName: message.fileName,
          fileSize: message.fileSize,
        });
      }
    });
    
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
};

export const saveUserSettings = async (
  userId: string, 
  settings: AgentSettings
): Promise<void> => {
  try {
    const userRef = getUserRef(userId);
    await update(userRef, { 
      settings, 
      updatedAt: serverTimestamp() 
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    throw new Error('Failed to save settings');
  }
};

export const loadUserSettings = async (
  userId: string
): Promise<AgentSettings | null> => {
  try {
    const userRef = getUserRef(userId);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return data.settings || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
};

export const createUserProfile = async (
  userId: string,
  userData: Omit<UserData, 'createdAt' | 'updatedAt'>
): Promise<void> => {
  try {
    const userRef = getUserRef(userId);
    await set(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw new Error('Failed to create user profile');
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserData>
): Promise<void> => {
  try {
    const userRef = getUserRef(userId);
    await update(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile');
  }
};

export const getUserProfile = async (
  userId: string
): Promise<UserData | null> => {
  try {
    const userRef = getUserRef(userId);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as UserData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};
