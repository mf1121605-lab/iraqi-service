import { createClient } from '@supabase/supabase-js';

// Server-only: bypasses RLS entirely. Never import this from a component —
// only from pages/api/**/*.js or getServerSideProps. The guard below turns
// an accidental client-side import into an immediate, loud failure instead
// of a silently broken client.
if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin must only be imported on the server.');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
