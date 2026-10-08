const BASE_URL = 'http://localhost:5000/api';

async function testAuthPersistence() {
  console.log('====================================================');
  console.log('🧪 TESTING AUTH SESSION PERSISTENCE (TASK A)');
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

  const pass = 'Password123!';
  const ts = Date.now();
  const testEmail = `auth_test_${ts}@campus.edu`;

  // 1. Register test user with custom identity "NightOwl"
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: pass, chosenIdentity: 'NightOwl' })
  })).json();

  const token = regRes.data?.token;
  assert(token && regRes.data?.anonymousProfile?.anonymousDisplayName === 'NightOwl', 'User registered with token and identity "NightOwl"');

  // 2. Simulate page refresh 1: GET /api/auth/me with stored token
  const me1 = await (await fetch(`${BASE_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })).json();

  assert(me1.success && me1.data?.anonymousProfile?.anonymousDisplayName === 'NightOwl', 'Page Refresh 1: Session restored via /auth/me with correct identity "NightOwl"');

  // 3. Simulate 5 consecutive page refreshes
  let all5Passed = true;
  for (let i = 1; i <= 5; i++) {
    const meN = await (await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })).json();
    if (!meN.success || meN.data?.anonymousProfile?.anonymousDisplayName !== 'NightOwl') {
      all5Passed = false;
      break;
    }
  }
  assert(all5Passed, 'Page Refresh 5x: All 5 consecutive refreshes restore valid session without logging out');

  // 4. Test route navigation endpoints with token
  const postsRes = await (await fetch(`${BASE_URL}/posts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })).json();
  const convsRes = await (await fetch(`${BASE_URL}/conversations`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })).json();

  assert(postsRes.success && convsRes.success, 'Navigation across routes (/posts, /conversations) succeeds with persisted session token');

  // 5. Invalid / Expired token handling
  const badMe = await (await fetch(`${BASE_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer invalid_token_123` }
  })).json();

  assert(badMe.success === false, 'Invalid/expired token returns 401 unauthenticated response cleanly');

  console.log('\n====================================================');
  console.log(`FINAL AUTH PERSISTENCE SCORE: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================\n');
}

testAuthPersistence().catch(err => {
  console.error('Fatal auth persistence test error:', err);
  process.exit(1);
});
