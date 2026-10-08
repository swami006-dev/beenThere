const { createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');

async function queryCols() {
  const email = `seed_schema_probe_${Date.now()}@beenthere.internal`;
  const authRes = await AuthService.register({ email, password: 'TestPassword123!' });
  const userClient = createUserClient(authRes.token);

  // Try querying posts table first to see what columns posts table has
  const pRes = await userClient.from('posts').select('*').limit(1);
  console.log('Posts Select Error:', pRes.error);
  console.log('Posts Sample:', pRes.data);

  // Try selecting experience_cards
  const eRes = await userClient.from('experience_cards').select('*').limit(1);
  console.log('Experience Cards Select Error:', eRes.error);
  console.log('Experience Cards Sample:', eRes.data);
}

queryCols().catch(err => console.error(err));
