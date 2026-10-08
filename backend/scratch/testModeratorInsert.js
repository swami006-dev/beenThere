const { supabase, createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');

async function testMod() {
  const modEmail = `mod_seed_${Date.now()}@beenthere.internal`;
  const modPassword = 'ModUserPassword123!';

  // SignUp with role moderator in metadata
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: modEmail,
    password: modPassword,
    options: {
      data: { role: 'moderator' }
    }
  });

  if (signUpErr) {
    console.error('Mod SignUp error:', signUpErr);
    return;
  }

  const token = signUpData.session?.access_token;
  console.log('Mod Token created:', !!token);
  const modClient = token ? createUserClient(token) : supabase;

  // Try inserting into experience_cards
  const cardData = {
    title: "Overcoming Coding Exam Paralysis",
    category: "Academic",
    excerpt: "I kept studying for coding exams but froze when solving problems.",
    what_happened: "Whenever I opened an online compiler during timed tests, my mind went blank.",
    what_helped: ["Practiced small algorithm patterns"],
    what_changed: "Stopped panicking during timed coding tests.",
    where_i_am_now: "Comfortable tackling coding exam questions step by step.",
    tags: ["Coding", "Exams", "Fear of Failure"],
    status: "approved"
  };

  const res = await modClient.from('experience_cards').insert(cardData).select();
  console.log('Insert Result Error:', res.error);
  console.log('Inserted Row:', res.data);
}

testMod().catch(err => console.error(err));
