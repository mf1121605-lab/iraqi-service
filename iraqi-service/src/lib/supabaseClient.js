import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser-safe client: the anon key only ever grants what RLS allows, so
// it's fine to ship in client bundles.
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
