import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LocalStore } from './localStore';
import { SupabaseStore } from './supabaseStore';
import type { Store } from './store';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Cliente Supabase, ou null quando a app corre em modo local. */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const store: Store = supabase ? new SupabaseStore(supabase) : new LocalStore();
