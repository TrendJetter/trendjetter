import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton — initialized on first use, not at module load.
// This prevents crashes during Vercel cold starts before env vars are injected.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  // Prefer service role key (bypasses RLS for server-side ops)
  // Fall back to anon key for local dev without service key set
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. ' +
      'Add them to your Vercel environment variables.'
    );
  }
  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

// Proxy that delegates every property access to the lazy client.
// Usage: import supabase from './supabase'; supabase.from(...) — identical to before.
const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default supabase;
