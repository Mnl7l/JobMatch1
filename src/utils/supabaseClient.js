import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.32.0/+esm'

// Load from environment variables (REACT_ prefix required in Create React App)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Supabase client initialized')

// Export for use in other files
export { supabase }