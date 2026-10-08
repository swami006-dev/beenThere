const { supabase, createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');

async function testExact() {
  const email = `test_user_${Date.now()}@beenthere.internal`;
  const authRes = await AuthService.register({ email, password: 'TestPassword123!' });
  const userClient = createUserClient(authRes.token);

  const card = {
    category: "Academic",
    tags: ["Coding", "Exams"],
    situation: "I kept studying for coding exams but froze when solving problems.",
    what_helped: "Stopped trying to solve huge problems immediately and practiced one small algorithm pattern at a time."
  };

  const res = await userClient.from('experience_cards').insert(card).select();
  console.log('Insert Result Error:', res.error);
  console.log('Inserted Data:', res.data);
}

testExact().catch(err => console.error(err));
