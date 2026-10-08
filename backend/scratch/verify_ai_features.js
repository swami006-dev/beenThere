const BASE_URL = 'http://localhost:5000/api';

async function testAiFeatures() {
  console.log('====================================================');
  console.log('🧪 TESTING 3 CORE AI FEATURES (TASK B)');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, description) {
    total++;
    if (condition) {
      console.log(`✅ [PASS ${total}] ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL ${total}] ${description}`);
    }
  }

  // Register test user
  const pass = 'Password123!';
  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `ai_test_${ts}@campus.edu`, password: pass, chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  assert(token, 'Registered test account for AI endpoints');

  // ----------------------------------------------------
  // FEATURE 1: 🧠 UNDERSTAND THE PROBLEM
  // ----------------------------------------------------
  console.log('\n--- AI Feature 1: 🧠 Understand the Problem ---');
  const dsaProblem = "I study DSA every day but when the coding test starts I panic and can't solve problems I already practiced.";
  
  const analyzeRes = await (await fetch(`${BASE_URL}/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content: dsaProblem, categoryHint: 'Academic' })
  })).json();

  console.log('DEBUG analyzeRes:', JSON.stringify(analyzeRes, null, 2));

  const data1 = analyzeRes.data;
  assert(analyzeRes.success && data1, 'POST /api/ai/analyze returns 200 OK');
  assert(['Academic', 'Career', 'College Life', 'Social / Communication', 'Relationships', 'Mental Wellbeing', 'Other'].includes(data1?.category), `Category "${data1?.category}" is one of canonical categories`);
  assert(typeof data1?.situation === 'string' && data1.situation.length > 5, 'Structured output contains situation summary');
  assert(typeof data1?.need === 'string' && data1.need.length > 5, 'Structured output contains practical support need');
  assert(Array.isArray(data1?.tags) && data1.tags.length >= 2, 'Structured output contains 2-5 tags');
  assert(['low', 'medium', 'high'].includes(data1?.risk), `Risk classification is valid ("${data1?.risk}")`);

  // ----------------------------------------------------
  // FEATURE 2: 🤝 SEMANTIC EXPERIENCE MATCHING
  // ----------------------------------------------------
  console.log('\n--- AI Feature 2: 🤝 Semantic Experience Matching ---');
  const matchRes = await (await fetch(`${BASE_URL}/ai/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content: dsaProblem, category: 'Academic', tags: ['DSA', 'coding'] })
  })).json();

  console.log('DEBUG matchRes count:', matchRes.data?.matches?.length);

  const matches = matchRes.data?.matches || [];
  assert(matchRes.success && matches.length > 0 && matches.length <= 5, 'POST /api/ai/match returns Top 5 relevant Experience Cards');
  assert(matches[0]?.relevanceLabel === 'Highly relevant' || matches[0]?.relevanceLabel === 'Similar experience', `Matches include descriptive relevance label ("${matches[0]?.relevanceLabel}")`);

  // ----------------------------------------------------
  // FEATURE 3: 🛡️ SAFETY AI
  // ----------------------------------------------------
  console.log('\n--- AI Feature 3: 🛡️ Safety AI & Moderation ---');
  const unsafeProblem = "I feel completely hopeless about my grades and want to end my life.";
  
  const safetyRes = await (await fetch(`${BASE_URL}/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content: unsafeProblem })
  })).json();

  const data3 = safetyRes.data;
  assert(data3?.risk === 'high', 'Safety AI detects high risk content ("high")');
  assert(Array.isArray(data3?.flags) && data3.flags.includes('self_harm_signal'), 'Safety AI flags self harm signal indicator');
  assert(data3?.requires_human_review === true, 'Safety AI sets requires_human_review = true for human moderation queue');

  // Secret handling check
  const leakedKey = JSON.stringify(analyzeRes).includes('gsk_') || JSON.stringify(matchRes).includes('gsk_');
  assert(!leakedKey, 'Groq API Key is NOT leaked in API responses or client payloads');

  console.log('\n====================================================');
  console.log(`FINAL AI FEATURES SCORE: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================\n');
}

testAiFeatures().catch(err => {
  console.error('Fatal AI features test error:', err);
  process.exit(1);
});
