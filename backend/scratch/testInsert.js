const { createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');

async function test() {
  const seedEmail = `seed_runner_test@beenthere.internal`;
  const seedPassword = 'SeedUserPassword123!';

  let authRes;
  try {
    authRes = await AuthService.login({ email: seedEmail, password: seedPassword });
  } catch (e) {
    authRes = await AuthService.register({ email: seedEmail, password: seedPassword });
  }

  const userClient = createUserClient(authRes.token);

  const sampleCard = {
    title: "Test Card Title",
    category: "Academic",
    excerpt: "Test excerpt content",
    what_happened: "Test what happened",
    what_helped: ["Item 1", "Item 2"],
    what_changed: "Test what changed",
    where_i_am_now: "Test where I am now",
    tags: ["Test", "Academic"],
    status: "approved"
  };

  const { data, error } = await userClient.from('experience_cards').insert(sampleCard).select();
  console.log('Insert Error:', error);
  console.log('Inserted Data:', data);
}

test().catch(err => console.error(err));
