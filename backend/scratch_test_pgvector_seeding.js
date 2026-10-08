require('dotenv').config();
const { supabase } = require('./src/db/supabase');
const { DEMO_EXPERIENCES } = require('./src/db/seedExperiences');
const EmbeddingService = require('./src/services/embedding.service');

async function runPgvectorSeeding() {
  console.log('====================================================');
  console.log('🌱 POPULATING SUPABASE EXPERIENCE CARDS & EMBEDDINGS');
  console.log('====================================================\n');

  console.log('1. Initializing text embedding model...');
  await EmbeddingService.loadPersistentEmbeddings();
  await EmbeddingService.seedExperienceEmbeddings(DEMO_EXPERIENCES);

  let successCount = 0;

  for (let i = 0; i < DEMO_EXPERIENCES.length; i++) {
    const exp = DEMO_EXPERIENCES[i];
    const situationText = `Title: ${exp.title}. Excerpt: ${exp.excerpt}. Situation: ${exp.what_happened}`.trim();
    const vector = await EmbeddingService.generateEmbedding(situationText);

    // Call RPC seed_experience_card
    const { data: cardId, error: rpcErr } = await supabase.rpc('seed_experience_card', {
      p_category: exp.category,
      p_situation: situationText,
      p_what_helped: exp.what_helped || [],
      p_tags: exp.tags || [],
      p_embedding: vector
    });

    if (rpcErr) {
      console.warn(`Card "${exp.title}" RPC seed note:`, rpcErr.message);
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Seeded/Upserted ${successCount}/${DEMO_EXPERIENCES.length} cards into Supabase experience_cards via RPC.`);

  // Verify direct count in Supabase
  const { data: cards, error: countErr } = await supabase
    .from('experience_cards')
    .select('id, embedding');

  const embeddedCards = (cards || []).filter(c => c.embedding !== null && c.embedding !== undefined);

  console.log('\n====================================================');
  console.log('📊 DIRECT SUPABASE VERIFICATION:');
  console.log(`   SELECT COUNT(*) FROM public.experience_cards WHERE embedding IS NOT NULL;`);
  console.log(`   Count: ${embeddedCards.length} / 36`);
  console.log('====================================================\n');
}

runPgvectorSeeding().catch(console.error);
