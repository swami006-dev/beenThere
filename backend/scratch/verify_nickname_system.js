const { nicknameSchema } = require('../src/schemas/auth.schema');
const { supabase } = require('../src/db/supabase');

const BASE_URL = 'http://localhost:5000/api';

async function runComprehensiveVerification() {
  console.log('====================================================');
  console.log('🧪 BEENTHERE ANONYMOUS IDENTITY VERIFICATION SUITE');
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

  // 1. VALIDATION TESTS
  console.log('--- 1. Nickname Validation Tests ---');

  const invalidInputs = [
    { val: '', label: 'Empty string' },
    { val: '   ', label: 'Whitespace only' },
    { val: 'A', label: 'Single character (min length 2)' },
    { val: 'student@campus.edu', label: 'Email address' },
    { val: '9876543210', label: 'Phone number (10 digits)' },
    { val: '+1-800-555-0199', label: 'Formatted phone number' },
    { val: 'https://malicious.com', label: 'URL with https' },
    { val: 'www.website.org', label: 'URL with www' },
    { val: 'admin_user', label: 'Restricted word "admin"' },
    { val: 'A'.repeat(25), label: 'Over 24 characters' }
  ];

  for (const item of invalidInputs) {
    let rejected = false;
    try {
      nicknameSchema.parse(item.val);
    } catch (e) {
      rejected = true;
    }
    assert(rejected, `Zod rejects invalid input: ${item.label} ("${item.val}")`);
  }

  const validInputs = ['NightOwl', 'CodeFox', 'QuietMoon', 'StudyBear', 'LostStar', 'Anonymous Bear', 'Moon'];
  for (const val of validInputs) {
    let res = null;
    try {
      res = nicknameSchema.parse(val);
    } catch (e) {
      console.error(e);
    }
    assert(res === val, `Zod accepts valid nickname: "${val}"`);
  }

  // Trimming test
  const untrimmed = '   NightOwl   ';
  const trimmedRes = nicknameSchema.parse(untrimmed);
  assert(trimmedRes === 'NightOwl', `Trimming test: "${untrimmed}" stored as "NightOwl"`);

  // 2. REGISTRATION & PERSISTENCE (GENERATED NAME)
  console.log('\n--- 2. Registration & Persistence (Generated Name) ---');
  const genEmail = `gen_user_${Date.now()}@example.com`;
  const password = 'Password123!';

  let genUserData;
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: genEmail, password, chosenIdentity: 'Anonymous Bear' })
    });
    const json = await res.json();
    genUserData = json.data;
    assert(genUserData?.anonymousProfile?.anonymousDisplayName === 'Anonymous Bear', 'Registration with generated name sets "Anonymous Bear"');
  } catch (err) {
    assert(false, 'Registration with generated name');
  }

  // 3. REGISTRATION & PERSISTENCE (CUSTOM NICKNAME)
  console.log('\n--- 3. Registration & Persistence (Custom Nickname "NightOwl") ---');
  const userAEmail = `userA_${Date.now()}@example.com`;
  let userAData;
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password, chosenIdentity: 'NightOwl', academicContext: 'Engineering 3rd Year' })
    });
    const json = await res.json();
    userAData = json.data;
    assert(userAData?.anonymousProfile?.anonymousDisplayName === 'NightOwl', 'Registration with custom nickname sets "NightOwl"');
  } catch (err) {
    assert(false, 'Registration with custom nickname NightOwl');
  }

  // 4. DUPLICATE NICKNAME TEST (User B registers with "Moon", User C registers with "Moon")
  console.log('\n--- 4. Duplicate Nicknames Test ---');
  const dup1Email = `dup1_${Date.now()}@example.com`;
  const dup2Email = `dup2_${Date.now()}@example.com`;

  try {
    const res1 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: dup1Email, password, chosenIdentity: 'Moon' })
    });
    const json1 = await res1.json();

    const res2 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: dup2Email, password, chosenIdentity: 'Moon' })
    });
    const json2 = await res2.json();

    const passDup = json1.data?.anonymousProfile?.anonymousDisplayName === 'Moon' &&
                    json2.data?.anonymousProfile?.anonymousDisplayName === 'Moon' &&
                    json1.data?.user?.id !== json2.data?.user?.id;
    assert(passDup, 'Multiple accounts are allowed to use duplicate nickname "Moon" with distinct internal UUIDs');
  } catch (err) {
    assert(false, 'Duplicate nickname test');
  }

  // 5. SESSION RESTORATION & LOGIN PERSISTENCE
  console.log('\n--- 5. Session Restoration & Login Persistence ---');
  const userAToken = userAData?.token;
  if (userAToken) {
    try {
      const meRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${userAToken}` }
      });
      const meJson = await meRes.json();
      assert(meJson.data?.anonymousProfile?.anonymousDisplayName === 'NightOwl', 'GET /auth/me returns persisted "NightOwl"');
    } catch (e) {
      assert(false, 'GET /auth/me session restoration');
    }

    try {
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail, password })
      });
      const loginJson = await loginRes.json();
      assert(loginJson.data?.anonymousProfile?.anonymousDisplayName === 'NightOwl', 'POST /auth/login returns persisted "NightOwl"');
    } catch (e) {
      assert(false, 'POST /auth/login persistence');
    }
  }

  // 6. POST CREATION & OWNERSHIP
  console.log('\n--- 6. Post Creation & Ownership ---');
  let createdPostId;
  if (userAToken) {
    try {
      const postRes = await fetch(`${BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAToken}`
        },
        body: JSON.stringify({
          content: 'I managed to break down my coding exam anxiety into smaller practice problems.',
          category: 'Academic'
        })
      });
      const postJson = await postRes.json();
      createdPostId = postJson.data?.id;
      assert(postJson.data?.anonymousDisplayName === 'NightOwl', 'Created post DTO displays "NightOwl" as author');

      // Verify DB level: post links to anonymous_profile which has user_id = internal user UUID
      if (createdPostId) {
        const { createUserClient } = require('../src/db/supabase');
        const userClient = createUserClient(userAToken);
        const { data: dbPost } = await userClient
          .from('posts')
          .select('anonymous_profile_id, content')
          .eq('id', createdPostId)
          .maybeSingle();

        let profileUserId = null;
        if (dbPost?.anonymous_profile_id) {
          const { data: profileData } = await userClient
            .from('anonymous_profiles')
            .select('user_id')
            .eq('id', dbPost.anonymous_profile_id)
            .maybeSingle();
          profileUserId = profileData?.user_id;
        }

        const validOwnership = profileUserId === userAData.user.id;
        assert(validOwnership, 'Database links post -> anonymous_profiles -> user_id (internal user UUID)');
      }
    } catch (e) {
      assert(false, 'Post creation and ownership test');
    }
  }

  // 7. RESPONSES
  console.log('\n--- 7. Response Creation & Public DTO Security ---');
  if (userAToken && createdPostId) {
    try {
      const respRes = await fetch(`${BASE_URL}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAToken}`
        },
        body: JSON.stringify({
          postId: createdPostId,
          content: 'Thank you for sharing this! It really helped me calm down before my test.'
        })
      });
      const respJson = await respRes.json();
      const respData = respJson.data;

      assert(respData?.anonymousDisplayName === 'NightOwl', 'Created response DTO displays "NightOwl"');
      
      const leakedPrivateData = respData?.email || respData?.password_hash || respData?.jwt || respData?.user_id;
      assert(!leakedPrivateData, 'Public response payload does NOT leak email, password_hash, JWT, or internal user_id');
    } catch (e) {
      assert(false, 'Response creation test');
    }
  }

  // 8. NICKNAME CHANGE (NightOwl -> QuietMoon)
  console.log('\n--- 8. Nickname Change Test (NightOwl -> QuietMoon) ---');
  if (userAToken) {
    try {
      const patchRes = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAToken}`
        },
        body: JSON.stringify({ nickname: 'QuietMoon' })
      });
      const patchJson = await patchRes.json();
      assert(patchJson.data?.anonymousProfile?.anonymousDisplayName === 'QuietMoon', 'PATCH /auth/profile updates nickname to "QuietMoon"');

      // Verify subsequent GET /auth/me
      const meRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${userAToken}` }
      });
      const meJson = await meRes.json();
      assert(meJson.data?.anonymousProfile?.anonymousDisplayName === 'QuietMoon', 'GET /auth/me returns updated "QuietMoon"');
      assert(meJson.data?.id === userAData.user.id, 'User UUID remains unchanged after nickname update');
    } catch (e) {
      assert(false, 'Nickname change test');
    }
  }

  // 9. API PRIVACY AUDIT FOR PUBLIC ENDPOINTS
  console.log('\n--- 9. Public API Privacy Audit ---');
  try {
    const postsRes = await fetch(`${BASE_URL}/posts`);
    const postsJson = await postsRes.json();
    const postsList = postsJson.data || [];

    let hasPrivacyLeak = false;
    for (const p of postsList) {
      if (p.email || p.password_hash || p.jwt || p.user_id) {
        hasPrivacyLeak = true;
      }
    }
    assert(!hasPrivacyLeak && postsList.length > 0, 'GET /api/posts payload is clean of sensitive email/password/JWT fields');
  } catch (e) {
    assert(false, 'Public API privacy audit');
  }

  // 10. SEEDED EXPERIENCE CARDS DEMO IDENTITIES
  console.log('\n--- 10. Seeded Experience Cards Test ---');
  try {
    const expRes = await fetch(`${BASE_URL}/experiences`);
    const expJson = await expRes.json();
    const cards = expJson.data || [];
    assert(cards.length >= 36, `Seeded Experience cards loaded (${cards.length} cards)`);
  } catch (e) {
    assert(false, 'Seeded Experience cards test');
  }

  console.log('\n====================================================');
  console.log(`FINAL SCORE: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');
}

runComprehensiveVerification().catch(console.error);
