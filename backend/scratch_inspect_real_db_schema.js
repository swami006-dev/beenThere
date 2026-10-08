require('dotenv').config();
const { createUserClient } = require('./src/db/supabase');
const BASE_URL = 'http://localhost:5000/api';

async function inspectExactSchema() {
  console.log('====================================================');
  console.log('🔍 INSPECTING EXACT PRODUCTION experience_cards SCHEMA');
  console.log('====================================================\n');

  // Get valid JWT auth token
  const pass = 'Password123!';
  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `schema_inspect_${ts}@campus.edu`, password: pass, chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  if (!token) {
    console.error('Failed to authenticate test user');
    return;
  }
  const userClient = createUserClient(token);

  // 1. Fetch one row or select *
  const { data: cards, error: selectErr } = await userClient
    .from('experience_cards')
    .select('*')
    .limit(1);

  if (selectErr) {
    console.log('Select * error:', selectErr.message);
  } else if (cards && cards.length > 0) {
    console.log('✅ Found existing row in experience_cards! Exact columns:');
    console.log(Object.keys(cards[0]));
    console.log('\nSample row data:', cards[0]);
  } else {
    console.log('Table experience_cards exists but returned 0 rows or empty set.');
  }

  // 2. Comprehensive column testing by querying invalid values for candidate columns
  const candidates = [
    'id', 'created_at', 'updated_at',
    'category', 'tags', 'situation', 'what_helped', 'what_happened', 'what_changed', 'where_i_am_now',
    'title', 'headline', 'excerpt', 'summary', 'details', 'description', 'content',
    'status', 'approved', 'is_approved', 'state',
    'user_id', 'created_by_user_id', 'created_by', 'author_id', 'anonymous_profile_id',
    'helpful_count', 'upvotes', 'likes',
    'embedding'
  ];

  console.log('\n--- Testing individual column existence in PostgREST ---');
  const existingCols = [];

  for (const col of candidates) {
    const { data, error } = await userClient
      .from('experience_cards')
      .select(col)
      .limit(1);

    if (error) {
      if (error.message.includes('Could not find the') || error.message.includes('does not exist')) {
        // column missing
      } else {
        console.log(`⚠️ Column '${col}' query note:`, error.message);
        existingCols.push(col);
      }
    } else {
      console.log(`✅ Column EXISTS: '${col}'`);
      existingCols.push(col);
    }
  }

  console.log('\n====================================================');
  console.log('ACTUAL experience_cards COLUMNS FOUND IN SUPABASE:');
  console.log(existingCols);
  console.log('====================================================\n');
}

inspectExactSchema().catch(console.error);
