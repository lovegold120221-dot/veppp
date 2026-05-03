export type SpeakerRole = 'user' | 'model';

export interface ChatMessage {
  role: SpeakerRole;
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

export interface GoogleCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
}

export interface ActionTask {
  id: string;
  serviceName?: string;
  action?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  createdAt: number;
  updatedAt: number;
}

export type TaskPhase = {
  key: 'listening' | 'understanding' | 'planning' | 'searching' | 'generating' | 'executing' | 'permission' | 'finalizing';
  label: string;
  color: string;
  visual: 'wave' | 'orbit' | 'radar' | 'spinner';
};

export type ArtifactType = 
  | 'contract' 
  | 'agreement' 
  | 'proposal' 
  | 'quotation' 
  | 'statement_of_work' 
  | 'invoice' 
  | 'csv' 
  | 'slides' 
  | 'pdf' 
  | 'letter' 
  | 'certificate' 
  | 'report';

export interface ArtifactData {
  type: ArtifactType;
  title: string;
  content: string;
  metadata?: {
    client?: string;
    date?: string;
    amount?: string;
    documentNumber?: string;
    [key: string]: any;
  };
}

export interface EmotionalState {
  emotion: string;
  intensity: number;
  context: string;
  timestamp: number;
}

export interface EmotionalContext {
  currentMood: string;
  recentTopics: string[];
  userPreferences: string;
  lastInteraction: string;
}

export interface AuthMessage {
  type: 'info' | 'error' | 'success';
  text: string;
}
