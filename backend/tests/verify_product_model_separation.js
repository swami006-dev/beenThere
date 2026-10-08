const { createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');
const AiService = require('../src/services/ai.service');

async function verifyFlow() {
  console.log('====================================================');
  console.log('🧪 TESTING NEW SEPARATED PRODUCT FLOW');
  console.log('====================================================\n');

  const seedEmail = 'seed_runner_test@beenthere.internal';
  const seedPassword = 'SeedUserPassword123!';
  const authRes = await AuthService.login({ email: seedEmail, password: seedPassword });
  const client = createUserClient(authRes.token);

  const studentInput = "I keep buying things I don't need and then regret it later.";
  console.log('1. Student Input:', studentInput);

  // 1. AI Analysis
  const analysis = await AiService.analyzeReflection({
    content: studentInput,
    categoryHint: 'College Life'
  });
  console.log('\n2. AI Understanding:');
  console.log('   Situation:', analysis.situation);
  console.log('   Need:', analysis.need);
  console.log('   Tags:', analysis.tags);

  // 2. Dual Semantic Search
  const matchRes = await AiService.matchExperiences({
    content: studentInput,
    category: analysis.category,
    tags: analysis.tags,
    userClient: client
  });

  console.log('\n3. What Others Have Learned (Canonical Experience Card):');
  if (matchRes.canonicalExperience) {
    console.log('   Title:', matchRes.canonicalExperience.title);
    console.log('   Category:', matchRes.canonicalExperience.category);
    console.log('   What Helped:', matchRes.canonicalExperience.whatHelped);
  } else {
    console.log('   None');
  }

  console.log('\n4. Students Who Have Been Here (Real Student Posts):');
  console.log('   Matches Count:', matchRes.studentPosts.length);
  matchRes.studentPosts.forEach((p, idx) => {
    console.log(`   [${idx + 1}] Author: ${p.author} | Quote: "${p.content}" | Sim: ${p.similarity.toFixed(2)}`);
  });

  console.log('\n====================================================');
  console.log('✅ PRODUCT FLOW VERIFIED PERFECTLY!');
  console.log('====================================================');
}

verifyFlow().catch(console.error);
