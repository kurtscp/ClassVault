/**
 * Environment configuration validator.
 * Fails fast with an actionable instruction if Supabase public keys
 * are not found in process.env (SEC-3, UX-2).
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase settings are missing. Copy .env.example to .env and fill in both values, then restart with `npx expo start -c`.'
  );
}

export const SUPABASE_URL: string = supabaseUrl;
export const SUPABASE_ANON_KEY: string = supabaseAnonKey;

