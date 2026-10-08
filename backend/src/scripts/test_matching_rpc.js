const EmbeddingService = require('../services/embedding.service');
const { supabase } = require('../db/supabase');

async function testRPC() {
  console.log('Testing RPC directly and through EmbeddingService:');
  const queries = [
    'coding exam panic',
    'hostel loneliness',
    'career confusion',
    'quantum particle accelerator astrophysics propulsion physics'
  ];

  for (const q of queries) {
    const queryVec = await EmbeddingService.generateEmbedding(q);
    const { data: rpcMatches, error: rpcErr } = await supabase.rpc('match_experiences', {
      query_embedding: queryVec,
      match_threshold: 0.28,
      match_count: 3
    });

    console.log(`\n==================================================`);
    console.log(`Query: "${q}"`);
    console.log(`==================================================`);
    if (rpcErr) {
      console.error('RPC Error:', rpcErr);
      continue;
    }
    console.log(`Direct Supabase pgvector RPC match count: ${rpcMatches ? rpcMatches.length : 0}`);
    if (rpcMatches && rpcMatches.length > 0) {
      rpcMatches.forEach((m, idx) => {
        console.log(`  [${idx + 1}] ID: ${m.id} | Sim: ${m.similarity.toFixed(4)} | Category: ${m.category}`);
        console.log(`      Situation: ${m.situation.substring(0, 85)}...`);
      });
    }

    const serviceRes = await EmbeddingService.searchSemanticMatches({ queryText: q, topK: 3 });
    console.log(`Service Result: matchType="${serviceRes.matchType}" | Matches Count: ${serviceRes.matches ? serviceRes.matches.length : 0}`);
    if (serviceRes.matches && serviceRes.matches.length > 0) {
      console.log(`      Top title: "${serviceRes.matches[0].title}" | Label: ${serviceRes.matches[0].relevanceLabel}`);
    }
  }
}

testRPC().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
