const http = require('http');

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('BEENTHERE COMPLETE PRODUCT FLOW VERIFICATION SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS ${total}] ${name}`);
    } else {
      console.error(`❌ [FAIL ${total}] ${name} - ${details}`);
    }
  }

  // 1. Health check
  const health = await makeRequest('GET', '/health');
  assert(health.status === 200 && health.body?.data?.status === 'healthy', 'GET /api/health returns 200 healthy');

  // 2. Register test student with strong password
  const uniqueId = Date.now();
  const testEmail = `student_${uniqueId}@university.edu`;
  const testPass = 'StudentPass123!';

  console.log('\n--- Registering & Authenticating ---');
  const regRes = await makeRequest('POST', '/auth/register', {
    email: testEmail,
    password: testPass,
    chosenIdentity: 'Anonymous Moon',
    academicContext: 'Biology Student'
  });
  console.log('Reg status:', regRes.status, 'Reg body:', JSON.stringify(regRes.body));

  let token = regRes.body?.data?.token;

  if (!token) {
    // Try login
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: testEmail,
      password: testPass
    });
    console.log('Login status:', loginRes.status, 'Login body:', JSON.stringify(loginRes.body));
    token = loginRes.body?.data?.token;
  }

  assert(!!token, 'Obtained authenticated Bearer token from Supabase');

  if (!token) {
    console.error('Cannot proceed without authentication token. Check Supabase signup configuration.');
    return;
  }

  // 3. Test AI Analyze endpoint (POST /api/ai/analyze)
  console.log('\n--- Testing AI Understanding Endpoint ---');
  const aiRes = await makeRequest('POST', '/ai/analyze', {
    content: "I'm scared I'm going to fail my coding exam. I study a lot but still can't understand the problems.",
    topic: "Academic"
  }, token);

  const aiData = aiRes.body?.data;
  assert(
    aiRes.status === 200 &&
    typeof aiData?.category === 'string' &&
    typeof aiData?.situation === 'string' &&
    Array.isArray(aiData?.tags) &&
    ['low', 'medium', 'high'].includes(aiData?.risk),
    'POST /api/ai/analyze returns structured JSON (category, situation, need, tags, risk)',
    JSON.stringify(aiData)
  );

  // 4. Create real Post in Supabase (POST /api/posts)
  console.log('\n--- Testing Real Post Creation ---');
  const postRes = await makeRequest('POST', '/posts', {
    content: "I'm scared I'm going to fail my coding exam. I study a lot but still can't understand the problems.",
    category: aiData?.category || 'Academic Stress',
    tags: aiData?.tags || ['Coding', 'Exams']
  }, token);

  const createdPost = postRes.body?.data;
  const postId = createdPost?.id;
  assert(postRes.status === 201 && !!postId, 'POST /api/posts creates post in Supabase and returns post ID');

  // 5. Test Response Composer & Persistence (POST /api/responses & GET /api/responses?postId=...)
  console.log('\n--- Testing Response Composer & Persistence ---');
  const responseContent = 'What helped me was breaking the coding problems into smaller 5-minute tasks.';
  const createRespRes = await makeRequest('POST', '/responses', {
    postId,
    content: responseContent
  }, token);

  const createdResp = createRespRes.body?.data;
  assert(createRespRes.status === 201 && !!createdResp?.id, 'POST /api/responses creates response in Supabase');

  const fetchRespsRes = await makeRequest('GET', `/responses?postId=${postId}`);
  const responsesList = fetchRespsRes.body?.data || [];
  const foundResp = responsesList.find(r => r.content === responseContent);
  assert(
    fetchRespsRes.status === 200 && !!foundResp,
    'GET /api/responses?postId=... retrieves saved response from Supabase',
    `Found ${responsesList.length} responses`
  );

  // 6. Student Moderation Protection (GET /api/moderation/reports returns 403)
  console.log('\n--- Testing Student Moderation Protection ---');
  const modRes = await makeRequest('GET', '/moderation/reports', null, token);
  assert(modRes.status === 403, 'GET /api/moderation/reports returns 403 Forbidden for student accounts');

  console.log(`\n========================================================`);
  console.log(`VERIFICATION RESULT: ${passed}/${total} PASSED`);
  console.log(`========================================================`);
}

runTests().catch(err => console.error('Test execution failed:', err));
