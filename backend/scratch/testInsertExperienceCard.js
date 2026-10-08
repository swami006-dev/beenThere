const { supabase, createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');

async function main() {
  let authRes;
  const email = `seed_user_${Date.now()}@beenthere.edu`;
  const pass = 'P@ssword123!';
  try {
    authRes = await AuthService.register({ email, password: pass });
  } catch (e) {
    console.error('Register failed:', e.message);
    return;
  }

  const userClient = createUserClient(authRes.token);

  const card = {
    category: "Academic",
    tags: ["Coding", "Exams"],
    situation: "I kept studying for coding exams but froze when solving problems.",
    what_helped: ["Stopped trying to solve huge problems immediately", "Practiced small algorithm patterns"]
  };

  const res = await userClient.from('experience_cards').insert(card).select();
  console.log('Insert Card Error:', res.error);
  console.log('Inserted Card Data:', res.data);
}

main().catch(err => console.error(err));
