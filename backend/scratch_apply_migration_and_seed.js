require('dotenv').config();
const { createUserClient } = require('./src/db/supabase');
const { DEMO_EXPERIENCES } = require('./src/db/seedExperiences');
const EmbeddingService = require('./src/services/embedding.service');
const BASE_URL = 'http://localhost:5000/api';

async function seedAndVerify() {
  console.log('====================================================');
  console.log('🌱 SEEDING SUPABASE EXPERIENCE CARDS + EMBEDDINGS');
  console.log('====================================================\n');

  // Authenticate user
  const pass = 'Password123!';
  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `seed_user_${ts}@campus.edu`, password: pass, chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  const userClient = createUserClient(token);

  // Initialize embedding model
  console.log('1. Initializing text embedding model (Xenova/all-MiniLM-L6-v2)...');
  await EmbeddingService.loadPersistentEmbeddings();
  await EmbeddingService.seedExperienceEmbeddings(DEMO_EXPERIENCES);

  // Check existing cards
  const { data: existingCards } = await userClient
    .from('experience_cards')
    .select('id, category, situation, embedding');

  const existingSituations = new Set((existingCards || []).map(c => c.situation?.toLowerCase() || ''));

  let inserted = 0;
  let skipped = 0;

  console.log(`\n2. Seeding ${DEMO_EXPERIENCES.length} Experience Cards into Supabase DB...`);
  for (let i = 0; i < DEMO_EXPERIENCES.length; i++) {
    const exp = DEMO_EXPERIENCES[i];
    const fullSituationText = `Title: ${exp.title}. Excerpt: ${exp.excerpt}. Situation: ${exp.what_happened}`.trim();
    
    if (existingSituations.has(fullSituationText.toLowerCase())) {
      skipped++;
      continue;
    }

    const vector = await EmbeddingService.generateEmbedding(fullSituationText);

    const payload = {
      category: exp.category,
      situation: fullSituationText,
      what_helped: exp.what_helped || [],
      tags: exp.tags || [],
      embedding: vector,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insData, error: insErr } = await userClient
      .from('experience_cards')
      .insert(payload)
      .select();

    if (insErr) {
      console.warn(`Card "${exp.title}" insert error:`, insErr.message);
    } else {
      inserted++;
      existingSituations.add(fullSituationText.toLowerCase());
    }
  }

  console.log(`   Inserted: ${inserted} | Skipped: ${skipped}`);

  // Query database directly to count cards with non-null embedding
  const { data: allCards, error: selectErr } = await userClient
    .from('experience_cards')
    .select('id, category, situation, embedding');

  const embeddedCards = (allCards || []).filter(c => c.embedding !== null && c.embedding !== undefined);

  console.log('\n====================================================');
  console.log('📊 DIRECT SUPABASE VERIFICATION:');
  console.log(`   SELECT COUNT(*) FROM public.experience_cards WHERE embedding IS NOT NULL;`);
  console.log(`   Result: ${embeddedCards.length} / 36`);
  console.log('====================================================\n');

  // Test RPC match_experiences
  const queryText = "I understand DSA while studying but freeze when the coding test timer starts.";
  const queryVec = await EmbeddingService.generateEmbedding(queryText);

  console.log(`3. Testing public.match_experiences RPC directly...`);
  const { data: rpcRes, error: rpcErr } = await userClient.rpc('match_experiences', {
    query_embedding: queryVec,
    match_threshold: 0.2,
    match_count: 5
  });

  if (rpcErr) {
    console.error('❌ RPC Error:', rpcErr.message);
  } else {
    console.log(`✅ RPC Success! Returned ${rpcRes?.length} matches.`);
    if (rpcRes && rpcRes.length > 0) {
      console.log(`   Top Match Situation: "${rpcRes[0].situation?.substring(0, 60)}..."`);
      console.log(`   Similarity Score: ${rpcRes[0].similarity}`);
    }
  }
}

seedAndVerify().catch(console.error);
