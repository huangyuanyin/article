import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

let authClient: SupabaseClient | null = null;

export function getSupabaseAuthClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 登录未配置，请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  }

  authClient ??= createClient(supabaseUrl, supabaseAnonKey);
  return authClient;
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export type { SupabaseClient } from '@supabase/supabase-js';
