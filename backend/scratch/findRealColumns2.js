const { supabase, createUserClient } = require('../src/db/supabase');

async function testAllKeys() {
  const modEmail = `mod_seed_runner@beenthere.internal`;
  const modPassword = 'ModUserPassword123!';

  let authRes;
  try {
    authRes = await supabase.auth.signInWithPassword({ email: modEmail, password: modPassword });
  } catch (e) {}

  if (!authRes?.data?.session) {
    authRes = await supabase.auth.signUp({ email: modEmail, password: modPassword, options: { data: { role: 'moderator' } } });
  }

  const token = authRes.data.session?.access_token;
  const userClient = createUserClient(token);

  const keys = [
    'id', 'created_at', 'category', 'tags', 'situation', 'what_helped',
    'what_happened', 'what_changed', 'where_i_am_now', 'excerpt', 'title',
    'content', 'summary', 'description', 'helpful_count', 'status',
    'user_id', 'created_by_user_id', 'is_approved', 'approved'
  ];

  for (const k of keys) {
    const obj = {};
    obj[k] = k === 'tags' || k === 'what_helped' ? ['test'] : 'test';
    const res = await userClient.from('experience_cards').insert(obj).select();
    if (res.error) {
      console.log(`Column '${k}': ${res.error.message}`);
    } else {
      console.log(`✅ Column '${k}' EXISTS!`);
    }
  }
}

testAllKeys().catch(err => console.error(err));
