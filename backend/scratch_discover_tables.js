require('dotenv').config();
const { supabase, createUserClient } = require('./src/db/supabase');

async function discoverTables() {
  const ts = Date.now();
  const regRes = await (await fetch(`http://localhost:5000/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `tbl_${ts}@campus.edu`, password: 'Password123!', chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  const userClient = createUserClient(token);

  const testTables = [
    'experience_cards', 'posts', 'profiles', 'experience_embeddings',
    'embeddings', 'card_embeddings', 'experiences', 'conversations',
    'conversation_messages', 'reports', 'user_nicknames', 'anonymous_profiles'
  ];

  for (const tbl of testTables) {
    const { data, error } = await userClient.from(tbl).select('*').limit(1);
    if (error) {
      console.log(`Table '${tbl}': ${error.message}`);
    } else {
      console.log(`✅ EXISTENT TABLE: '${tbl}' (Rows: ${data?.length})`);
    }
  }
}

discoverTables().catch(console.error);
