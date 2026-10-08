require('dotenv').config();
const { createUserClient } = require('./src/db/supabase');
const EmbeddingService = require('./src/services/embedding.service');
const { DEMO_EXPERIENCES } = require('./src/db/seedExperiences');

const BASE_URL = 'http://localhost:5000/api';

async function testPgvectorDb() {
  console.log('====================================================');
  console.log('🔍 TEST 1: DATABASE EMBEDDINGS AUDIT');
  console.log('====================================================\n');

  // Register an authenticated user to get access token
  const pass = 'Password123!';
  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `pgv_audit_${ts}@campus.edu`, password: pass, chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  if (!token) {
    console.error('Failed to get auth token');
    return;
  }
  const userClient = createUserClient(token);

  // 1. Check experience_cards count and embedding column in Supabase
  const { data: dbCards, error: selectErr } = await userClient
    .from('experience_cards')
    .select('id, category, tags, situation, what_helped, embedding');

  console.log('Select experience_cards result:', {
    count: dbCards?.length,
    error: selectErr?.message
  });

  if (dbCards && dbCards.length > 0) {
    const embeddedCards = dbCards.filter(c => c.embedding !== null && c.embedding !== undefined);
    console.log(`Embedded cards count in Supabase: ${embeddedCards.length} / ${dbCards.length}`);
  }

  // 2. Test RPC match_experiences directly
  console.log('\n====================================================');
  console.log('🔍 TEST 2: DIRECT RPC match_experiences TEST');
  console.log('====================================================\n');

  const queryText = "I understand DSA while studying but freeze when the coding test timer starts.";
  const queryVec = await EmbeddingService.generateEmbedding(queryText);

  console.log(`Generated 384D query vector for "${queryText.substring(0, 40)}...". Dim: ${queryVec?.length}`);

  const { data: rpcRes, error: rpcErr } = await userClient.rpc('match_experiences', {
    query_embedding: queryVec,
    match_threshold: 0.2,
    match_count: 5
  });

  console.log('Direct RPC result:', {
    success: !rpcErr,
    matchesCount: rpcRes?.length,
    error: rpcErr?.message
  });

  if (rpcRes && rpcRes.length > 0) {
    console.log('Top RPC Match:', rpcRes[0]);
  }
}

testPgvectorDb().catch(console.error);
