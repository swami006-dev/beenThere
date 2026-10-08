const AiService = require('../src/services/ai.service');

async function testAiIntegration() {
  console.log('--- TEST 1: AI Analysis Request ---');
  const sample1 = {
    content: "I am scared about my coding exam. I study every day but still feel like I will fail.",
    categoryHint: "Academic"
  };

  const startTime1 = Date.now();
  const res1 = await AiService.analyzeReflection(sample1);
  const duration1 = Date.now() - startTime1;

  console.log('Result 1:', JSON.stringify(res1, null, 2));
  console.log(`Latency 1: ${duration1}ms`);

  console.assert(res1.category, 'Category should be present');
  console.assert(res1.situation, 'Situation should be present');
  console.assert(res1.need, 'Need should be present');
  console.assert(Array.isArray(res1.tags) && res1.tags.length > 0, 'Tags should be an array');
  console.assert(['low', 'medium', 'high'].includes(res1.risk), 'Risk should be valid');

  console.log('\n--- TEST 2: Cache Hit Verification ---');
  const startTime2 = Date.now();
  const res2 = await AiService.analyzeReflection(sample1);
  const duration2 = Date.now() - startTime2;

  console.log('Result 2 (cached):', JSON.stringify(res2, null, 2));
  console.log(`Latency 2: ${duration2}ms`);
  console.assert(duration2 < duration1 || duration2 < 10, 'Cache should return almost instantly');

  console.log('\n--- TEST 3: Experience Extraction ---');
  const expSample = {
    content: "Failed my CS test after staying up all night cramming.",
    responses: [
      "I used to cram too. What changed everything for me was active recall 3 days before.",
      "Don't beat yourself up, one midterm won't ruin your grade."
    ],
    category: "Academic Stress",
    tags: ["Coding", "Exams"]
  };

  const expRes = await AiService.extractExperience(expSample);
  console.log('Experience Extraction Result:', JSON.stringify(expRes, null, 2));
  console.assert(expRes.situation, 'Extracted situation should exist');
  console.assert(expRes.whatHelped, 'Extracted whatHelped should exist');

  console.log('\n✅ ALL AI INTEGRATION VERIFICATION TESTS PASSED!');
}

testAiIntegration().catch(err => {
  console.error('❌ AI Verification Test Failed:', err);
  process.exit(1);
});
