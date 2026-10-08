const { createUserClient } = require('../src/db/supabase');
const BASE_URL = 'http://localhost:5000/api';

async function testDbWithAuth() {
  console.log('====================================================');
  console.log('🔍 AUDITING SUPABASE DB WITH AUTHENTICATED CLIENT');
  console.log('====================================================\n');

  // Register a test user to get a valid JWT
  const pass = 'Password123!';
  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `audit_${ts}@campus.edu`, password: pass, chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  if (!token) {
    console.error('Failed to get auth token:', regRes);
    return;
  }

  console.log('✅ Auth token acquired for user:', regRes.data?.user?.id);
  const userClient = createUserClient(token);

  // 1. Query experience_cards
  const { data: cards, error: cardsErr } = await userClient
    .from('experience_cards')
    .select('*');

  console.log('\n1. Querying experience_cards with authenticated client:');
  if (cardsErr) {
    console.log('   Error:', cardsErr.message);
  } else {
    console.log(`   Count: ${cards?.length || 0}`);
    if (cards && cards.length > 0) {
      console.log('   Columns:', Object.keys(cards[0]));
      console.log('   Has embedding column:', 'embedding' in cards[0]);
    }
  }

  // 2. Query posts
  const { data: posts, error: postsErr } = await userClient
    .from('posts')
    .select('*');

  console.log('\n2. Querying posts with authenticated client:');
  if (postsErr) {
    console.log('   Error:', postsErr.message);
  } else {
    console.log(`   Count: ${posts?.length || 0}`);
    if (posts && posts.length > 0) {
      console.log('   Columns:', Object.keys(posts[0]));
    }
  }

  // 3. Test RPC function match_experiences
  const { data: rpcRes, error: rpcErr } = await userClient
    .rpc('match_experiences', { query_embedding: [0.1, 0.2, 0.3], match_threshold: 0.1, match_count: 5 });

  console.log('\n3. Testing RPC match_experiences with authenticated client:');
  if (rpcErr) {
    console.log('   RPC status:', rpcErr.message);
  } else {
    console.log('   RPC result:', rpcRes);
  }
}

testDbWithAuth().catch(err => console.error('Audit failed:', err));
