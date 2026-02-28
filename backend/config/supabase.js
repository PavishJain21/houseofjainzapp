const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load .env from project root (works whether running from root or backend directory)
const envPath = path.resolve(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

// Hardcoded for now; override with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env for production
const supabaseUrl = process.env.SUPABASE_URL || 'https://sqfhtmxufevsidyoofla.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZmh0bXh1ZmV2c2lkeW9vZmxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTYzMDcwNCwiZXhwIjoyMDgxMjA2NzA0fQ.bqy7qWcK2jPsIJ7o_MpxluI8vW6rHDkZPtk7zWhopvI';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

