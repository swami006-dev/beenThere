const { createClient } = require('@supabase/supabase-js');
const { env } = require('../config/env');

// Default Supabase client (anon/public role - used for auth operations)
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false }
});

/**
 * Create a request-scoped Supabase client that uses the user's JWT.
 * This ensures RLS policies are evaluated against the authenticated user.
 */
function createUserClient(accessToken) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

module.exports = {
  supabase,
  createUserClient
};
