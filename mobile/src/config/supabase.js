import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Hardcoded for now; use .env (EXPO_PUBLIC_SUPABASE_*) for production
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://sqfhtmxufevsidyoofla.supabase.co';
const supabaseAnonKey =process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZmh0bXh1ZmV2c2lkeW9vZmxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTYzMDcwNCwiZXhwIjoyMDgxMjA2NzA0fQ.bqy7qWcK2jPsIJ7o_MpxluI8vW6rHDkZPtk7zWhopvI';

let _supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = _supabase;
