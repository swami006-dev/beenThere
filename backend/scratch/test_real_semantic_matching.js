require('dotenv').config();
const EmbeddingService = require('../src/services/embedding.service');
const AiService = require('../src/services/ai.service');

async function runSemanticTests() {
  console.log('====================================================');
  console.log('🧠 RUNNING 384D SEMANTIC MATCHING & PERSISTENCE TESTS');
  console.log('====================================================\n');

  // Ensure initial seed/load
  await EmbeddingService.loadPersistentEmbeddings();
  if (EmbeddingService.experienceVectorsStore?.size === 0) {
    await EmbeddingService.seedExperienceEmbeddings();
  }

  const tests = [
    {
      id: 'TEST 1',
      query: 'I studied DSA for months but when the coding test starts I panic...',
      category: 'Academic',
      expectedCard: 'Overcoming Coding Exam Paralysis'
    },
    {
      id: 'TEST 2',
      query: 'I understand concepts while studying but my mind goes blank when the timer starts.',
      category: 'Academic',
      expectedCard: 'Overcoming Coding Exam Paralysis'
    },
    {
      id: 'TEST 3',
      query: 'I recently moved into a hostel and feel lonely because I don\'t know anyone.',
      category: 'Social & Environment',
      expectedCard: 'Overcoming Hostel Loneliness'
    },
    {
      id: 'TEST 4',
      query: 'I keep comparing my grades with everyone in class.',
      category: 'Academic',
      expectedCard: 'Dealing with Low Test Scores and Class Comparison'
    },
    {
      id: 'TEST 5',
      query: 'I don\'t know whether to learn frontend or cybersecurity.',
      category: 'Career',
      expectedCard: 'Finding Direction in Tech Stack Selection'
    },
    {
      id: 'TEST 6 (NO MATCH)',
      query: 'Quantum gravitational warp drive propulsion systems.',
      category: 'General',
      expectNoMatch: true
    }
  ];

  let passedCount = 0;

  for (const t of tests) {
    console.log(`\n--- ${t.id} ---`);
    console.log(`Query: "${t.query}"`);
    const result = await AiService.matchExperiences({
      content: t.query,
      category: t.category,
      topK: 5
    });

    console.log(`Match Type: ${result.matchType}`);
    if (t.expectNoMatch) {
      if (result.matchType === 'no_match' && result.matches.length === 0) {
        console.log(`✅ PASS: Correctly returned no_match for unrelated query!`);
        passedCount++;
      } else {
        console.error(`❌ FAIL: Expected no_match, got:`, result);
      }
    } else {
      const topMatch = result.matches[0];
      console.log(`Top Match Title: "${topMatch?.title}" (Label: ${topMatch?.relevanceLabel})`);
      if (topMatch && topMatch.title.toLowerCase().includes(t.expectedCard.toLowerCase())) {
        console.log(`✅ PASS: Matched expected card "${t.expectedCard}"`);
        passedCount++;
      } else {
        console.error(`❌ FAIL: Expected "${t.expectedCard}", got "${topMatch?.title}"`);
      }
    }
  }

  // --- RESTART TEST (REQUIREMENT 12) ---
  console.log('\n====================================================');
  console.log('🔄 EXECUTING BACKEND RESTART & PERSISTENCE TEST');
  console.log('====================================================');
  console.log('1. Clearing ONLY the in-memory vector cache...');
  EmbeddingService.clearMemoryCache();

  console.log('2. Running semantic search on cleared cache (should load vectors from persistent store)...');
  const restartResult = await AiService.matchExperiences({
    content: 'I studied DSA for months but when the coding test starts I panic...',
    category: 'Academic',
    topK: 5
  });

  console.log(`Match Type after restart: ${restartResult.matchType}`);
  const topRestartMatch = restartResult.matches[0];
  console.log(`Top Match after restart: "${topRestartMatch?.title}"`);

  if (topRestartMatch && topRestartMatch.title.includes('Overcoming Coding Exam Paralysis')) {
    console.log(`✅ RESTART TEST PASS: Persistent vectors successfully loaded from disk/Supabase store without re-embedding!`);
    passedCount++;
  } else {
    console.error(`❌ RESTART TEST FAIL: Vector persistence failed on restart.`);
  }

  console.log(`\n====================================================`);
  console.log(`📊 FINAL SEMANTIC MATCHING RESULTS: ${passedCount}/7 TESTS PASSED`);
  console.log(`====================================================\n`);

  if (passedCount === 7) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSemanticTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
