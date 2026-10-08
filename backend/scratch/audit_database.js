const { supabase } = require('../src/db/supabase');

async function auditDatabase() {
  console.log('====================================================');
  console.log('🔍 AUDITING SUPABASE DATABASE & SCHEMA');
  console.log('====================================================\n');

  // 1. Check experience_cards table
  const { data: cards, error: cardsErr } = await supabase
    .from('experience_cards')
    .select('*')
    .limit(5);

  console.log('1. experience_cards table:');
  if (cardsErr) {
    console.log('   Error or not found:', cardsErr.message);
  } else {
    console.log(`   Fetched ${cards?.length || 0} cards.`);
    if (cards && cards.length > 0) {
      console.log('   Columns:', Object.keys(cards[0]));
      console.log('   Has embedding column:', 'embedding' in cards[0]);
    }
  }

  // 2. Count total experience_cards in DB
  const { count, error: countErr } = await supabase
    .from('experience_cards')
    .select('*', { count: 'exact', head: true });

  console.log('\n2. Total experience_cards count in DB:', count !== null ? count : 'N/A (using seed)');

  // 3. Check posts table
  const { data: posts, error: postsErr } = await supabase
    .from('posts')
    .select('*')
    .limit(1);

  console.log('\n3. posts table:');
  if (postsErr) {
    console.log('   Error or not found:', postsErr.message);
  } else {
    console.log('   Columns:', posts && posts[0] ? Object.keys(posts[0]) : 'empty');
  }

  // 4. Check ai_analyses table
  const { data: aiAn, error: aiErr } = await supabase
    .from('ai_analyses')
    .select('*')
    .limit(1);

  console.log('\n4. ai_analyses table:');
  if (aiErr) {
    console.log('   Error or not found:', aiErr.message);
  } else {
    console.log('   Columns:', aiAn && aiAn[0] ? Object.keys(aiAn[0]) : 'empty');
  }

  // 5. Test RPC function match_experiences if it exists
  const { data: rpcRes, error: rpcErr } = await supabase
    .rpc('match_experiences', { query_embedding: [0.1, 0.2, 0.3], match_threshold: 0.1, match_count: 5 });

  console.log('\n5. match_experiences RPC test:');
  if (rpcErr) {
    console.log('   RPC status:', rpcErr.message);
  } else {
    console.log('   RPC result:', rpcRes);
  }
}

auditDatabase().catch(err => {
  console.error('Audit failed:', err);
});
