import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
  warnIfSupabaseMissing,
} from './config';

let browserClient: SupabaseClient | null = null;

export const createClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    warnIfSupabaseMissing();
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return browserClient;
};

export const createSupabaseBrowserClient = createClient;
export const getSupabaseClient = createClient;
