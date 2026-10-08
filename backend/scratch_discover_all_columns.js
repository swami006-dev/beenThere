require('dotenv').config();
const { supabase, createUserClient } = require('./src/db/supabase');

async function discover() {
  const ts = Date.now();
  const regRes = await (await fetch(`http://localhost:5000/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `disc_${ts}@campus.edu`, password: 'Password123!', chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  const userClient = createUserClient(token);

  const testList = [
    'id', 'created_at', 'updated_at',
    'category', 'tags', 'situation', 'what_helped', 'what_changed', 'where_i_am_now',
    'title', 'headline', 'card_title', 'name',
    'excerpt', 'summary', 'details', 'description', 'content', 'body',
    'status', 'approved', 'is_approved', 'state',
    'user_id', 'created_by', 'author_id', 'anonymous_profile_id',
    'helpful_count', 'upvotes', 'likes',
    'embedding', 'vector', 'embedding_vector', 'vec'
  ];

  for (const col of testList) {
    const payload = {};
    payload[col] = 'test_val';
    const { error } = await userClient.from('experience_cards').insert(payload).select();
    
    if (error) {
      if (error.message.includes('Could not find the')) {
        // column does not exist
      } else {
        console.log(`✅ EXISTENT COLUMN: '${col}' -> message: ${error.message}`);
      }
    } else {
      console.log(`✅ EXISTENT COLUMN & SUCCESSFUL INSERT: '${col}'`);
    }
  }
}

discover().catch(console.error);
