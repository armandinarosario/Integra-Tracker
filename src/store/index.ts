import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LocalStore } from './localStore';
import { SupabaseStore } from './supabaseStore';
import type { Store } from './store';

// Aceita também o endereço copiado de "Data API" (termina em /rest/v1/):
// o cliente precisa só da raiz do projeto, ex.: https://xxxx.supabase.co
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const url = rawUrl?.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** Cliente Supabase, ou null quando a app corre em modo local. */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const store: Store = supabase ? new SupabaseStore(supabase) : new LocalStore();
