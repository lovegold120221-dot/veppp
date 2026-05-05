import { createClient } from './client';
import { SUPABASE_DEBUG, SUPABASE_STORAGE_BUCKET } from './config';

export type StorageProvider = 'supabase' | 'google_drive' | 'firebase';

export interface SupabaseUploadResult {
  provider: 'supabase';
  bucket: string;
  path: string;
  publicUrl: string;
  contentType: string;
  size: number;
}

interface UploadUserFileOptions {
  firebaseUid: string;
  file: File;
  folder?: 'chat' | 'knowledge-base' | 'profile' | 'uploads';
  bucket?: string;
}

const cleanSegment = (value: string, fallback: string): string => {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return cleaned || fallback;
};

const randomId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export const buildUserStoragePath = (
  firebaseUid: string,
  folder: UploadUserFileOptions['folder'] = 'uploads',
  fileName = 'upload',
): string => {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const safeUid = cleanSegment(firebaseUid, 'anonymous');
  const safeFolder = cleanSegment(folder || 'uploads', 'uploads');
  const safeName = cleanSegment(fileName, 'upload');

  return `users/${safeUid}/${safeFolder}/${yyyy}/${mm}/${dd}/${Date.now()}-${randomId()}-${safeName}`;
};

export const uploadUserFileToSupabase = async ({
  firebaseUid,
  file,
  folder = 'uploads',
  bucket = SUPABASE_STORAGE_BUCKET,
}: UploadUserFileOptions): Promise<SupabaseUploadResult | null> => {
  const supabase = createClient();
  if (!supabase) return null;

  const path = buildUserStoragePath(firebaseUid, folder, file.name);
  const contentType = file.type || 'application/octet-stream';

  try {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });

    if (error) {
      console.warn('Supabase storage upload failed:', error.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return {
      provider: 'supabase',
      bucket,
      path,
      publicUrl: data.publicUrl,
      contentType,
      size: file.size,
    };
  } catch (error) {
    if (SUPABASE_DEBUG) console.warn('Supabase storage upload error:', error);
    return null;
  }
};
