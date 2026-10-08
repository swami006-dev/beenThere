require('dotenv').config();
const { supabase, createUserClient } = require('./src/db/supabase');
const { DEMO_EXPERIENCES } = require('./src/db/seedExperiences');
const EmbeddingService = require('./src/services/embedding.service');

const BASE_URL = 'http://localhost:5000/api';

async function seedToSupabase() {
  console.log('====================================================');
  console.log('🌱 SEEDING EXPERIENCE CARDS + EMBEDDINGS TO SUPABASE');
  console.log('====================================================\n');

  // Register / login user
  const pass = 'Password123!';
  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `admin_seed_${ts}@campus.edu`, password: pass, chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  const userClient = createUserClient(token);

  // First check existing
  const { data: existing, error: fetchErr } = await userClient
    .from('experience_cards')
    .select('id, category, situation, embedding');

  console.log('Existing cards in DB:', { count: existing?.length, error: fetchErr?.message });

  // Generate embeddings for all 36 demo experiences
  console.log('\n⏳ Generating 384D text embeddings for 36 Experience Cards...');
  await EmbeddingService.loadPersistentEmbeddings();
  await EmbeddingService.seedExperienceEmbeddings(DEMO_EXPERIENCES);

  let inserted = 0;
  let updatedVecs = 0;

  for (let i = 0; i < DEMO_EXPERIENCES.length; i++) {
    const exp = DEMO_EXPERIENCES[i];
    const cardId = `seed-exp-${i + 1}`;
    const fullText = `Title: ${exp.title}. Excerpt: ${exp.excerpt}. Situation: ${exp.what_happened}`.trim();
    const vector = await EmbeddingService.generateEmbedding(fullText);

    const payload = {
      category: exp.category,
      situation: fullText,
      what_helped: exp.what_helped || [],
      tags: exp.tags || [],
      embedding: vector,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Try inserting with userClient or supabase
    let { data: insData, error: insErr } = await userClient
      .from('experience_cards')
      .insert(payload)
      .select();

    if (insErr) {
      // If userClient blocked by RLS REVOKE, try with supabase client or log error
      const { data: anonData, error: anonErr } = await supabase
        .from('experience_cards')
        .insert(payload)
        .select();

      if (anonErr) {
        console.warn(`Card "${exp.title}" insert note:`, insErr.message);
      } else {
        inserted++;
      }
    } else {
      inserted++;
    }
  }

  // Verify final count in Supabase
  const { data: finalCards, error: finalErr } = await userClient
    .from('experience_cards')
    .select('id, embedding');

  const embeddedCount = (finalCards || []).filter(c => c.embedding !== null && c.embedding !== undefined).length;

  console.log('\n====================================================');
  console.log(`📊 FINAL SUPABASE EMBEDDINGS STATUS:`);
  console.log(`   Total cards in DB: ${finalCards?.length || 0} / 36`);
  console.log(`   Cards with 384D vector embedding: ${embeddedCount} / 36`);
  console.log('====================================================\n');
}

seedToSupabase().catch(console.error);
