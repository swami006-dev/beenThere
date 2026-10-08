const { supabase, createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');

async function main() {
  const seedEmail = `seed_runner_${Date.now()}@beenthere.internal`;
  const seedPassword = 'SeedUserPassword123!';

  console.log('Signing up seed user:', seedEmail);
  let authRes;
  try {
    authRes = await AuthService.register({ email: seedEmail, password: seedPassword });
  } catch (e) {
    console.log('Register failed, trying login:', e.message);
    authRes = await AuthService.login({ email: seedEmail, password: seedPassword });
  }

  console.log('Auth success. Token present:', !!authRes.token);
  const userClient = createUserClient(authRes.token);

  const { data, error } = await userClient.from('experience_cards').select('*').limit(1);
  console.log('Select Error:', error);
  console.log('Select Data:', data);
}

main().catch(err => console.error(err));
