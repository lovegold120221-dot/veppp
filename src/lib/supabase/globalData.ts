import type { ChatMessage } from '../types';
import { createClient } from './client';
import {
  SUPABASE_CHAT_MESSAGES_TABLE,
  SUPABASE_DEBUG,
  SUPABASE_KNOWLEDGE_FILES_TABLE,
} from './config';
import type { SupabaseUploadResult, StorageProvider } from './storage';

type SupabaseWriteResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

export interface PersistedChatMessage extends Partial<ChatMessage> {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  storageProvider?: StorageProvider;
  storageBucket?: string;
  storagePath?: string;
  googleDriveFileId?: string;
}

export interface KnowledgeFileRecord {
  firebaseUid: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  source: 'supabase' | 'google_drive' | 'local';
  upload?: SupabaseUploadResult | null;
  googleDriveFileId?: string;
}

const validUserId = (firebaseUid: string): boolean =>
  /^[a-zA-Z0-9:_-]{4,160}$/.test(firebaseUid);

const toIso = (timestamp: number): string => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

export const saveGlobalChatMessage = async (
  firebaseUid: string,
  message: PersistedChatMessage,
): Promise<SupabaseWriteResult> => {
  if (!validUserId(firebaseUid) || !message.text.trim()) {
    return { ok: false, skipped: true, error: 'Invalid chat message payload' };
  }

  const supabase = createClient();
  if (!supabase) return { ok: false, skipped: true, error: 'Supabase not configured' };

  const payload = {
    firebase_uid: firebaseUid,
    role: message.role,
    source: message.source || (message.role === 'model' ? 'assistant' : 'user'),
    speaker: message.speaker || null,
    text: message.text.trim(),
    message_timestamp: toIso(message.timestamp),
    file_url: message.fileUrl || null,
    file_type: message.fileType || null,
    file_name: message.fileName || null,
    file_size: message.fileSize || null,
    storage_provider: message.storageProvider || null,
    storage_bucket: message.storageBucket || null,
    storage_path: message.storagePath || null,
    google_drive_file_id: message.googleDriveFileId || null,
    metadata: {},
  };

  try {
    const { error } = await supabase.from(SUPABASE_CHAT_MESSAGES_TABLE).insert(payload);
    if (error) {
      console.warn('Supabase chat mirror failed:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    if (SUPABASE_DEBUG) console.warn('Supabase chat mirror error:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown Supabase error' };
  }
};

export const saveGlobalKnowledgeFile = async ({
  firebaseUid,
  fileName,
  fileType,
  fileSize,
  source,
  upload,
  googleDriveFileId,
}: KnowledgeFileRecord): Promise<SupabaseWriteResult> => {
  if (!validUserId(firebaseUid) || !fileName.trim()) {
    return { ok: false, skipped: true, error: 'Invalid knowledge file payload' };
  }

  const supabase = createClient();
  if (!supabase) return { ok: false, skipped: true, error: 'Supabase not configured' };

  const payload = {
    firebase_uid: firebaseUid,
    file_name: fileName,
    file_type: fileType || 'application/octet-stream',
    file_size: fileSize,
    source,
    storage_provider: upload?.provider || null,
    storage_bucket: upload?.bucket || null,
    storage_path: upload?.path || null,
    public_url: upload?.publicUrl || null,
    google_drive_file_id: googleDriveFileId || null,
  };

  try {
    const { error } = await supabase.from(SUPABASE_KNOWLEDGE_FILES_TABLE).insert(payload);
    if (error) {
      console.warn('Supabase knowledge-file insert failed:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    if (SUPABASE_DEBUG) console.warn('Supabase knowledge-file insert error:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown Supabase error' };
  }
};
