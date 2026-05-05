const envValue = (key: string): string => {
  const viteEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const value = viteEnv?.[key];
  return typeof value === 'string' ? value.trim() : '';
};

export const SUPABASE_URL =
  envValue('VITE_SUPABASE_URL') || envValue('NEXT_PUBLIC_SUPABASE_URL');

export const SUPABASE_PUBLISHABLE_KEY =
  envValue('VITE_SUPABASE_PUBLISHABLE_KEY') || envValue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

export const SUPABASE_STORAGE_BUCKET =
  envValue('VITE_SUPABASE_STORAGE_BUCKET') || 'vep-global-storage';

export const SUPABASE_CHAT_MESSAGES_TABLE =
  envValue('VITE_SUPABASE_CHAT_MESSAGES_TABLE') || 'vep_chat_messages';

export const SUPABASE_KNOWLEDGE_FILES_TABLE =
  envValue('VITE_SUPABASE_KNOWLEDGE_FILES_TABLE') || 'vep_knowledge_files';

export const SUPABASE_DEBUG = envValue('DEBUG') === 'true';

let warnedMissingConfig = false;

export const isSupabaseConfigured = (): boolean =>
  Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const warnIfSupabaseMissing = (): void => {
  if (warnedMissingConfig || isSupabaseConfigured()) return;
  warnedMissingConfig = true;
  console.warn(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.',
  );
};
