const PROD_URL = 'https://been-there-psi.vercel.app/api';

async function runE2E() {
  console.log('🚀 Running Full E2E Verification against Live Backend:', PROD_URL);
  const testId = Date.now();
  const email = `student_prod_${testId}@example.com`;
  const password = 'StrongPassword123!';

  // 1. Health check
  console.log('\n--- 1. Health Check ---');
  const healthRes = await fetch(`${PROD_URL}/health`);
  const healthJson = await healthRes.json();
  console.log('Health check status:', healthRes.status, JSON.stringify(healthJson));
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // 2. Registration
  console.log('\n--- 2. Production Registration ---');
  const regPayload = {
    email,
    password,
    confirmPassword: password,
    nickname: `peer_${testId.toString().slice(-4)}`,
    academicContext: 'Software Engineering Junior'
  };
  const regRes = await fetch(`${PROD_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload)
  });
  const regJson = await regRes.json();
  console.log('Register HTTP Status:', regRes.status);
  console.log('Register Response:', JSON.stringify(regJson, null, 2));
  if (regRes.status !== 201 || !regJson.data?.token) {
    throw new Error('Registration failed');
  }
  let token = regJson.data.token;
  const user = regJson.data.user;
  const anonProfile = regJson.data.anonymousProfile;
  console.log('Registered User ID:', user.id);
  console.log('Anonymous Profile ID:', anonProfile.id);

  // 3. Login
  console.log('\n--- 3. Production Login ---');
  const loginRes = await fetch(`${PROD_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginJson = await loginRes.json();
  console.log('Login HTTP Status:', loginRes.status);
  console.log('Login Response:', JSON.stringify(loginJson, null, 2));
  if (loginRes.status !== 200 || !loginJson.data?.token) {
    throw new Error('Login failed');
  }
  token = loginJson.data.token;

  // 4. Authenticated Session Persistence (GET /api/auth/me)
  console.log('\n--- 4. Session Persistence (GET /api/auth/me) ---');
  const meRes = await fetch(`${PROD_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const meJson = await meRes.json();
  console.log('Session ME Status:', meRes.status);
  console.log('Session ME Data:', JSON.stringify(meJson.data, null, 2));
  const currentUserId = meJson.data?.id || meJson.data?.user?.id;
  if (meRes.status !== 200 || currentUserId !== user.id) {
    throw new Error('Session verification failed');
  }

  // 5. Create Student Post (POST /api/posts)
  console.log('\n--- 5. Create Student Post (POST /api/posts) ---');
  const postPayload = {
    content: 'Studying late at night for algorithms midterm and feeling overwhelmed, looking for advice from others who survived it.',
    category: 'Academic',
    tags: ['Midterms', 'Algorithms', 'Stress']
  };
  const postRes = await fetch(`${PROD_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(postPayload)
  });
  const postJson = await postRes.json();
  console.log('Create Post Status:', postRes.status);
  console.log('Create Post Data:', JSON.stringify(postJson, null, 2));
  if (postRes.status !== 201 || !postJson.data?.id) {
    throw new Error('Post creation failed');
  }
  const createdPostId = postJson.data.id;

  // 6. Retrieve Student Posts (GET /api/posts/mine)
  console.log('\n--- 6. Retrieve Student Posts (GET /api/posts/mine) ---');
  const mineRes = await fetch(`${PROD_URL}/posts/mine`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const mineJson = await mineRes.json();
  console.log('My Posts Status:', mineRes.status);
  console.log('My Posts Count:', mineJson.data?.length);
  console.log('My Posts Data:', JSON.stringify(mineJson.data, null, 2));
  if (mineRes.status !== 200 || !Array.isArray(mineJson.data) || mineJson.data.length === 0) {
    throw new Error('GET /api/posts/mine failed');
  }
  const hasCreatedPost = mineJson.data.some(p => p.id === createdPostId);
  console.log('Created Post Found in Mine?:', hasCreatedPost);
  if (!hasCreatedPost) throw new Error('Created post not found in my posts list');

  console.log('\n=========================================');
  console.log('🎉 ALL LIVE PRODUCTION BACKEND TESTS PASSED!');
  console.log('=========================================');
}

runE2E().catch(err => {
  console.error('❌ E2E verification failed:', err);
  process.exit(1);
});
