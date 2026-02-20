const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load .env from project root (works whether running from root or backend directory)
const envPath = path.resolve(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

