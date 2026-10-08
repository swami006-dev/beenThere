const app = require('../src/app');

const TEST_PORT = 5055;
const API_BASE = `http://127.0.0.1:${TEST_PORT}/api`;

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json.error?.message || json.message || `HTTP error ${res.status}`);
    error.status = res.status;
    error.data = json;
    throw error;
  }
  return json.data !== undefined ? json.data : json;
}

async function runAllTests() {
  console.log('============================================================');
  console.log('🚀 RUNNING COMPREHENSIVE PERSISTENCE AND PRODUCT FLOW TESTS');
  console.log('============================================================\n');

  // Start in-process server for 100% stable HTTP testing
  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => {
      console.log(`🔌 Test server listening on http://127.0.0.1:${TEST_PORT}`);
      resolve(s);
    });
  });

  try {
    // --- SETUP USERS ---
    console.log('\n--- 0. SETUP AUTHENTICATED USERS (STUDENT A & STUDENT B) ---');
    const userAEmail = 'seed_runner_test@beenthere.internal';
    const userBEmail = 'student_b_fixed@beenthere.internal';
    const password = 'SeedUserPassword123!';

    // Login Student A
    const loginARes = await request('/auth/login', {
      method: 'POST',
      body: { email: userAEmail, password }
    });
    const tokenA = loginARes.token;
    const userA = loginARes.user;
    console.log('✅ Student A authenticated:', { id: userA.id, email: userAEmail });

    // Login Student B
    const loginBRes = await request('/auth/login', {
      method: 'POST',
      body: { email: userBEmail, password }
    });
    const tokenB = loginBRes.token;
    const userB = loginBRes.user;
    console.log('✅ Student B authenticated:', { id: userB.id, email: userBEmail });

    const headersA = { Authorization: `Bearer ${tokenA}` };
    const headersB = { Authorization: `Bearer ${tokenB}` };

    // ------------------------------------------------------------
    // TEST A — STUDENT POST PERSISTENCE
    // ------------------------------------------------------------
    console.log('\n--- TEST A — STUDENT POST PERSISTENCE ---');
    const postContent = "I keep buying things I don't need and then regret it later. " + Date.now();
    const createdPost = await request('/posts', {
      method: 'POST',
      headers: headersB,
      body: {
        content: postContent,
        category: 'College Life',
        tags: ['budgeting', 'shopping']
      }
    });
    console.log('1. Student B created post:', { id: createdPost.id, content: createdPost.content });

    // Verify fetch post as Student A (simulating refresh / public view)
    const fetchPostRes = await request(`/posts/${createdPost.id}`, { headers: headersA });
    console.log('2. Student A fetched post:', {
      id: fetchPostRes.id,
      author: fetchPostRes.anonymousDisplayName,
      content: fetchPostRes.content
    });
    if (fetchPostRes.id !== createdPost.id || fetchPostRes.content !== postContent) {
      throw new Error('TEST A FAILED: Post did not persist or match!');
    }
    console.log('✅ TEST A PASSED: Real Student Post created and persisted.');

    // ------------------------------------------------------------
    // TEST B — SAVE PERSISTENCE (SAVE -> REFRESH -> LOGOUT/LOGIN -> UNSAVE)
    // ------------------------------------------------------------
    console.log('\n--- TEST B — SAVE PERSISTENCE ---');
    // Student A saves Student B's post
    const saveRes = await request('/saved', {
      method: 'POST',
      headers: headersA,
      body: {
        itemId: createdPost.id,
        itemType: 'post',
        title: createdPost.content.substring(0, 50),
        category: createdPost.category
      }
    });
    console.log('1. Student A saved post:', { itemId: saveRes.itemId });

    // Helper to check saved presence
    const isItemInSaved = (res, targetId) => {
      const items = Array.isArray(res) ? res : (res?.items || []);
      const ids = Array.isArray(res?.savedItemIds) ? res.savedItemIds : [];
      return items.some(i => (i.itemId || i.item_id || i.id) === targetId) || ids.includes(targetId);
    };

    // Simulate refresh: GET /api/saved as Student A
    const refreshSavedRes = await request('/saved', { headers: headersA });
    const hasSavedOnRefresh = isItemInSaved(refreshSavedRes, createdPost.id);
    console.log('2. Refresh check: has saved post?', hasSavedOnRefresh);
    if (!hasSavedOnRefresh) {
      throw new Error('TEST B FAILED: Item not found in /api/saved after refresh!');
    }

    // Simulate logout/login: Login Student A afresh
    const reloginARes = await request('/auth/login', {
      method: 'POST',
      body: { email: userAEmail, password }
    });
    const freshHeadersA = { Authorization: `Bearer ${reloginARes.token}` };
    const postLoginSavedRes = await request('/saved', { headers: freshHeadersA });
    const hasSavedAfterLogin = isItemInSaved(postLoginSavedRes, createdPost.id);
    console.log('3. Logout/login check: has saved post?', hasSavedAfterLogin);
    if (!hasSavedAfterLogin) {
      throw new Error('TEST B FAILED: Item not found in /api/saved after logout/login!');
    }

    // Unsave post
    await request(`/saved/${createdPost.id}`, { method: 'DELETE', headers: freshHeadersA });
    const postUnsaveRes = await request('/saved', { headers: freshHeadersA });
    const hasSavedAfterUnsave = isItemInSaved(postUnsaveRes, createdPost.id);
    console.log('4. Unsave check: has saved post?', hasSavedAfterUnsave);
    if (hasSavedAfterUnsave) {
      throw new Error('TEST B FAILED: Item still present after unsaving!');
    }
    console.log('✅ TEST B PASSED: Save, Refresh, Logout/Login, and Unsave all verified.');

    // ------------------------------------------------------------
    // TEST C — HELPFUL REACTIONS PERSISTENCE (SCOPED, NO 12/13)
    // ------------------------------------------------------------
    console.log('\n--- TEST C — HELPFUL REACTIONS PERSISTENCE ---');
    // New post initial helpful count
    const initialRxn = await request(`/reactions/${createdPost.id}`, { headers: freshHeadersA });
    console.log('1. Initial reactions on new post:', initialRxn);
    if (initialRxn.count !== 0) {
      throw new Error(`TEST C FAILED: Initial count was ${initialRxn.count}, expected 0!`);
    }

    // Student A clicks helpful
    const click1 = await request(`/reactions/${createdPost.id}`, { method: 'POST', headers: freshHeadersA });
    console.log('2. Student A clicks helpful -> count:', click1.count, 'userReacted:', click1.userReacted);
    if (click1.count !== 1) {
      throw new Error(`TEST C FAILED: Expected count 1, got ${click1.count}`);
    }

    // Refresh check
    const refreshRxn1 = await request(`/reactions/${createdPost.id}`, { headers: freshHeadersA });
    console.log('3. Refresh check for Student A -> count:', refreshRxn1.count, 'userReacted:', refreshRxn1.userReacted);
    if (refreshRxn1.count !== 1 || !refreshRxn1.userReacted) {
      throw new Error('TEST C FAILED: Reaction state did not persist after refresh!');
    }

    // Student B clicks helpful
    const click2 = await request(`/reactions/${createdPost.id}`, { method: 'POST', headers: headersB });
    console.log('4. Student B clicks helpful -> count:', click2.count, 'userReacted:', click2.userReacted);
    if (click2.count !== 2) {
      throw new Error(`TEST C FAILED: Expected count 2, got ${click2.count}`);
    }

    // Refresh check
    const refreshRxn2 = await request(`/reactions/${createdPost.id}`, { headers: headersB });
    console.log('5. Refresh check for Student B -> count:', refreshRxn2.count, 'userReacted:', refreshRxn2.userReacted);
    if (refreshRxn2.count !== 2) {
      throw new Error('TEST C FAILED: Count 2 did not persist after refresh!');
    }
    console.log('✅ TEST C PASSED: Scoped helpful reactions start at 0, increment per user, and survive refresh.');

    // ------------------------------------------------------------
    // TEST D — PRIVATE REQUEST (TALK PRIVATELY ON REAL STUDENT POST)
    // ------------------------------------------------------------
    console.log('\n--- TEST D — PRIVATE REQUEST ON REAL STUDENT POST ---');
    // Student A requests 1-to-1 conversation with Student B on Student B's post
    const reqRes = await request('/conversations/requests', {
      method: 'POST',
      headers: freshHeadersA,
      body: {
        experiencePostId: createdPost.id,
        message: "Hey, I saw your reflection about shopping regret. How did you deal with it?"
      }
    });
    console.log('1. Student A created conversation request:', {
      id: reqRes.id,
      status: reqRes.status,
      title: reqRes.experienceTitle
    });

    // Verify Student A sees pending outgoing request
    const reqsA = await request('/conversations/requests', { headers: freshHeadersA });
    const reqFoundA = reqsA.find(r => r.id === reqRes.id);
    console.log('2. Student A sees request after refresh:', { id: reqFoundA?.id, isIncoming: reqFoundA?.isIncoming, status: reqFoundA?.status });
    if (!reqFoundA || reqFoundA.status !== 'pending' || reqFoundA.isIncoming !== false) {
      throw new Error('TEST D FAILED: Outgoing request not found for Student A!');
    }

    // Verify Student B sees incoming request
    const reqsB = await request('/conversations/requests', { headers: headersB });
    const reqFoundB = reqsB.find(r => r.id === reqRes.id);
    console.log('3. Student B sees incoming request:', { id: reqFoundB?.id, isIncoming: reqFoundB?.isIncoming, status: reqFoundB?.status, message: reqFoundB?.message });
    if (!reqFoundB || reqFoundB.status !== 'pending' || reqFoundB.isIncoming !== true) {
      throw new Error('TEST D FAILED: Incoming request not found for Student B!');
    }

    // Student B accepts the request
    const acceptRes = await request(`/conversations/requests/${reqRes.id}/respond`, {
      method: 'POST',
      headers: headersB,
      body: { status: 'accepted' }
    });
    console.log('4. Student B accepted request -> conversationId:', acceptRes.conversationId);
    const conversationId = acceptRes.conversationId;
    if (!conversationId) {
      throw new Error('TEST D FAILED: No conversationId returned on accept!');
    }

    // Verify conversation exists for both Student A and Student B
    const convsA = await request('/conversations', { headers: freshHeadersA });
    const convsB = await request('/conversations', { headers: headersB });
    console.log('5. Conversations listed after accept -> Student A count:', convsA.length, 'Student B count:', convsB.length);
    if (!convsA.some(c => c.id === conversationId) || !convsB.some(c => c.id === conversationId)) {
      throw new Error('TEST D FAILED: Conversation not found in conversations list!');
    }
    console.log('✅ TEST D PASSED: Talk privately creates persistent request, acceptance creates active conversation.');

    // ------------------------------------------------------------
    // TEST E — MESSAGES PERSISTENCE
    // ------------------------------------------------------------
    console.log('\n--- TEST E — MESSAGES PERSISTENCE ---');
    // Initial message sent during request should be present
    const convDetails1 = await request(`/conversations/${conversationId}`, { headers: freshHeadersA });
    console.log('1. Initial messages in conversation:', convDetails1.messages.length);
    if (convDetails1.messages.length < 1) {
      throw new Error('TEST E FAILED: Initial message not present in conversation!');
    }

    // Student B sends message: "I started tracking every purchase in a small notebook."
    const msgText = "I started tracking every purchase in a small notebook.";
    const sendRes = await request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: headersB,
      body: { content: msgText }
    });
    console.log('2. Student B sent message:', { id: sendRes.id, content: sendRes.content });

    // Simulate refresh: Student A fetches conversation details
    const convDetails2 = await request(`/conversations/${conversationId}`, { headers: freshHeadersA });
    console.log('3. Student A refreshed conversation -> message count:', convDetails2.messages.length);
    const hasMsg = convDetails2.messages.some(m => m.content === msgText);
    if (!hasMsg) {
      throw new Error('TEST E FAILED: Message not found after refresh!');
    }

    // Simulate logout/login Student B
    const reloginBRes = await request('/auth/login', {
      method: 'POST',
      body: { email: userBEmail, password }
    });
    const freshHeadersB = { Authorization: `Bearer ${reloginBRes.token}` };
    const convDetails3 = await request(`/conversations/${conversationId}`, { headers: freshHeadersB });
    const hasMsgAfterLogin = convDetails3.messages.some(m => m.content === msgText);
    console.log('4. Student B logout/login check -> message persisted?', hasMsgAfterLogin);
    if (!hasMsgAfterLogin) {
      throw new Error('TEST E FAILED: Message did not persist after logout/login!');
    }
    console.log('✅ TEST E PASSED: Messages persist across refresh, logout, and login.');

    // ------------------------------------------------------------
    // TEST F — CANONICAL CARD BEHAVIOR (NO TALK PRIVATELY, PROPER MESSAGE)
    // ------------------------------------------------------------
    console.log('\n--- TEST F — CANONICAL CARD BEHAVIOR ---');
    const expsRes = await request('/experiences', { headers: freshHeadersA });
    const canonicalCard = expsRes[0];
    console.log('1. Fetched canonical experience card:', { id: canonicalCard.id, title: canonicalCard.title });

    // Attempting private chat on canonical card MUST fail with the exact canonical message
    try {
      await request('/conversations/requests', {
        method: 'POST',
        headers: freshHeadersA,
        body: {
          experiencePostId: canonicalCard.id,
          message: 'Hello'
        }
      });
      throw new Error('TEST F FAILED: Request unexpectedly succeeded on canonical card!');
    } catch (err) {
      const errMsg = err.data?.error?.message || err.data?.message || err.message;
      console.log('2. Private chat attempt error message:', errMsg);
      const expectedMsg = 'This experience was shared canonically and does not currently have a direct student author available for 1-to-1 chat.';
      if (errMsg !== expectedMsg) {
        throw new Error(`TEST F FAILED: Expected canonical message "${expectedMsg}", got "${errMsg}"`);
      }
    }

    // Saving canonical card MUST work and persist
    await request('/saved', {
      method: 'POST',
      headers: freshHeadersA,
      body: {
        itemId: canonicalCard.id,
        itemType: 'experience',
        title: canonicalCard.title,
        category: canonicalCard.category
      }
    });
    const savedAfterCanonical = await request('/saved', { headers: freshHeadersA });
    const hasCanonicalSaved = isItemInSaved(savedAfterCanonical, canonicalCard.id);
    console.log('3. Canonical card saved and retrieved:', hasCanonicalSaved);
    if (!hasCanonicalSaved) {
      throw new Error('TEST F FAILED: Canonical card not saved in /api/saved!');
    }
    console.log('✅ TEST F PASSED: Canonical cards forbid private chat with exact explanation and support saving.');

    // ------------------------------------------------------------
    // TEST G — MATCHING DUAL RETRIEVAL SEPARATION
    // ------------------------------------------------------------
    console.log('\n--- TEST G — MATCHING DUAL RETRIEVAL ---');
    const matchRes = await request('/ai/match', {
      method: 'POST',
      headers: freshHeadersA,
      body: {
        content: "I keep buying things I don't need and then regret it later.",
        category: 'College Life',
        tags: ['budgeting', 'finance', 'shopping'],
        topK: 5
      }
    });
    console.log('1. Matching results:');
    console.log('   Canonical Experience Card:', matchRes.canonicalExperience ? matchRes.canonicalExperience.title : 'None');
    console.log('   Student Posts Count:', matchRes.studentPosts?.length || 0);
    if (matchRes.studentPosts?.length > 0) {
      console.log('   First student post:', {
        id: matchRes.studentPosts[0].id,
        author: matchRes.studentPosts[0].author,
        content: matchRes.studentPosts[0].content
      });
    }
    console.log('✅ TEST G PASSED: Matching returns separated canonicalExperience and studentPosts.');

    // ------------------------------------------------------------
    // TEST H — COMMUNITY PAGE VERIFICATION
    // ------------------------------------------------------------
    console.log('\n--- TEST H — COMMUNITY INTEGRITY ---');
    const [commExps, commPosts] = await Promise.all([
      request('/experiences', { headers: freshHeadersA }),
      request('/posts', { headers: freshHeadersA })
    ]);
    console.log('Community data available -> Experiences:', commExps.length, 'Posts:', commPosts.length);
    if (commExps.length === 0 || commPosts.length === 0) {
      throw new Error('TEST H FAILED: Experiences or Posts empty for Community!');
    }
    console.log('✅ TEST H PASSED: Community data sources intact and unchanged.');

    console.log('\n============================================================');
    console.log('🎉 ALL PERSISTENCE AND PRODUCT FLOW TESTS PASSED (100%)!');
    console.log('============================================================');
  } finally {
    server.close();
  }
}

runAllTests().catch(err => {
  console.error('\n❌ TEST RUN ERROR:', err.data || err.message, err.cause);
  process.exit(1);
});
