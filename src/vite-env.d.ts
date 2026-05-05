/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GOOGLE_API_KEY?: string;
  readonly VITE_ZAPIER_MCP_EMBED_ID?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_STORAGE_BUCKET?: string;
  readonly VITE_SUPABASE_CHAT_MESSAGES_TABLE?: string;
  readonly VITE_SUPABASE_KNOWLEDGE_FILES_TABLE?: string;
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
