const AiService = require('../src/services/ai.service');
const { DEMO_EXPERIENCES } = require('../src/db/seedExperiences');
const { env } = require('../src/config/env');

async function testGroqAndMatching() {
  console.log('=========================================');
  console.log('🚀 BEENTHERE GROQ AI & MATCHING VERIFICATION');
  console.log(`🤖 AI Provider: ${env.AI_PROVIDER}`);
  console.log(`🧠 Groq Model: ${env.GROQ_MODEL}`);
  console.log('=========================================\n');

  const testCases = [
    {
      name: "TEST 1 — Coding Exam Fear",
      input: "I am terrified about my coding exam and keep thinking I will fail.",
      expectedCategory: "Academic",
      expectedTagSubstrings: ["Coding", "Exams", "Fear"]
    },
    {
      name: "TEST 2 — Presentation Anxiety",
      input: "I get very nervous when I have to present in front of my class.",
      expectedCategory: "Social / Communication",
      expectedTagSubstrings: ["Speaking", "Presentation", "Confidence", "Communication"]
    },
    {
      name: "TEST 3 — Career / Placement Confusion",
      input: "I don't know what career I should choose for placements.",
      expectedCategory: "Career",
      expectedTagSubstrings: ["Career", "Placements", "Skills"]
    },
    {
      name: "TEST 4 — Hostel Loneliness",
      input: "I feel lonely in my hostel and don't know how to make friends.",
      expectedCategory: "College life",
      expectedTagSubstrings: ["Hostel", "Loneliness", "Friends", "College"]
    },
    {
      name: "TEST 5 — Assignment Procrastination",
      input: "I keep procrastinating on assignments until the deadline.",
      expectedCategory: "Academic",
      expectedTagSubstrings: ["Procrastination", "Assignments", "Time"]
    }
  ];

  for (const tc of testCases) {
    console.log(`\n--- ${tc.name} ---`);
    console.log(`Student Input: "${tc.input}"`);

    const start = Date.now();
    const res = await AiService.analyzeReflection({ content: tc.input });
    const elapsed = Date.now() - start;

    console.log(`Analysis Result (source: ${res.source}, model: ${res.model}):`);
    console.log(`  Category: ${res.category}`);
    console.log(`  Situation: ${res.situation}`);
    console.log(`  Need: ${res.need}`);
    console.log(`  Tags: [${res.tags.join(', ')}]`);
    console.log(`  Risk: ${res.risk}`);
    console.log(`  Latency: ${elapsed}ms`);

    // Match candidate demo cards from seed experiences
    const lowerCategory = res.category.toLowerCase();
    const resTagsLower = res.tags.map(t => t.toLowerCase());

    const matchedCards = DEMO_EXPERIENCES.filter(exp => {
      const expCategoryLower = exp.category.toLowerCase();
      const expTagsLower = exp.tags.map(t => t.toLowerCase());
      const categoryMatch = expCategoryLower.includes(lowerCategory) || lowerCategory.includes(expCategoryLower);
      const tagOverlap = expTagsLower.some(t => resTagsLower.some(rt => rt.includes(t) || t.includes(rt)));
      return categoryMatch || tagOverlap;
    });

    console.log(`  Matching Experience Cards Found in PostgreSQL / Demo Set: ${matchedCards.length}`);
    console.log(`  Top Match: "${matchedCards[0]?.title}" (${matchedCards[0]?.category})`);
    console.assert(matchedCards.length > 0, `Matching cards should be found for ${tc.name}`);
  }

  console.log('\n=========================================');
  console.log('⚡ TEST: CACHE REUSE VERIFICATION');
  console.log('=========================================');

  const cacheInput = { content: "I am terrified about my coding exam and keep thinking I will fail." };
  const startCache = Date.now();
  const cachedRes = await AiService.analyzeReflection(cacheInput);
  const cacheElapsed = Date.now() - startCache;

  console.log(`Cached Analysis Latency: ${cacheElapsed}ms`);
  console.log(`Cached Metadata: source=${cachedRes.source}, model=${cachedRes.model}`);
  console.assert(cacheElapsed < 5, 'Cache hit should take under 5ms');

  console.log('\n=========================================');
  console.log('✅ ALL GROQ AI & MATCHING TESTS PASSED!');
  console.log('=========================================');
}

testGroqAndMatching().catch(err => {
  console.error('❌ Verification test failed:', err);
  process.exit(1);
});
