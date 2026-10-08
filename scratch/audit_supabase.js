require('dotenv').config({ path: './backend/.env' });
const { supabase } = require('../backend/src/db/supabase');

async function audit() {
  console.log('--- SUPABASE DATABASE AUDIT ---');
  
  // 1. Check experience_cards table
  const { data: cards, error: cardsErr } = await supabase.from('experience_cards').select('*').limit(5);
  console.log('experience_cards select result:', { count: cards?.length, error: cardsErr });
  if (cards && cards.length > 0) {
    console.log('Sample card keys:', Object.keys(cards[0]));
    console.log('Has embedding column?:', 'embedding' in cards[0]);
  }

  // 2. Check if RPC match_experiences exists
  const dummyVec = Array(384).fill(0.01);
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('match_experiences', {
    query_embedding: dummyVec,
    match_threshold: 0.1,
    match_count: 5
  });
  console.log('match_experiences RPC result:', { data: rpcRes, error: rpcErr });
}

audit().catch(console.error);
