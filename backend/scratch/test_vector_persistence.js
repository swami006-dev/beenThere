const { createUserClient } = require('../src/db/supabase');
const { DEMO_EXPERIENCES } = require('../src/db/seedExperiences');
const EmbeddingService = require('../src/services/embedding.service');

const BASE_URL = 'http://localhost:5000/api';

async function testVectorPersistence() {
  console.log('====================================================');
  console.log('🔍 TESTING SUPABASE VECTOR PERSISTENCE');
  console.log('====================================================\n');

  // Register an authenticated user
  const pass = 'Password123!';
  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `vector_audit_${ts}@campus.edu`, password: pass, chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  if (!token) {
    console.error('Failed to authenticate test user');
    return;
  }

  const userClient = createUserClient(token);

  // 1. Check if experience_cards exists and try inserting a card with embedding
  const sampleCard = DEMO_EXPERIENCES[0];
  const sampleText = `${sampleCard.title} ${sampleCard.excerpt} ${sampleCard.what_happened}`;
  const embeddingVec = await EmbeddingService.generateEmbedding(sampleText);

  console.log(`✅ Generated 384D test vector. Dim: ${embeddingVec?.length}`);

  const cardPayload = {
    id: 'seed-exp-1',
    title: sampleCard.title,
    category: sampleCard.category,
    excerpt: sampleCard.excerpt,
    what_happened: sampleCard.what_happened,
    what_helped: sampleCard.what_helped,
    what_changed: sampleCard.what_changed,
    where_i_am_now: sampleCard.where_i_am_now,
    tags: sampleCard.tags,
    status: 'approved',
    embedding: embeddingVec
  };

  const { data: upsertData, error: upsertErr } = await userClient
    .from('experience_cards')
    .upsert(cardPayload)
    .select();

  console.log('\n1. Upsert experience_cards with 384D embedding:');
  if (upsertErr) {
    console.log('   Upsert Error:', upsertErr.message);
  } else {
    console.log('   Upsert Success! Data:', upsertData);
  }

  // 2. Try calling match_experiences RPC
  const { data: rpcData, error: rpcErr } = await userClient
    .rpc('match_experiences', { query_embedding: embeddingVec, match_threshold: 0.2, match_count: 5 });

  console.log('\n2. Call match_experiences RPC:');
  if (rpcErr) {
    console.log('   RPC Error:', rpcErr.message);
  } else {
    console.log('   RPC Success! Matches count:', rpcData?.length);
  }
}

testVectorPersistence().catch(err => console.error('Test vector persistence failed:', err));
