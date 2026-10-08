const { createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');

async function discover() {
  const seedEmail = `seed_runner_test@beenthere.internal`;
  const seedPassword = 'SeedUserPassword123!';
  const authRes = await AuthService.login({ email: seedEmail, password: seedPassword });
  const userClient = createUserClient(authRes.token);

  // Try inserting minimal record to get error with missing required fields or column hints
  const res1 = await userClient.from('experience_cards').insert({}).select();
  console.log('Insert empty res:', res1.error);
}

discover().catch(err => console.error(err));
