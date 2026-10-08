const BASE_URL = 'http://localhost:5000/api';

async function runConversationsTests() {
  console.log('====================================================');
  console.log('🧪 TESTING PRIVATE CONVERSATIONS MVP BACKEND API');
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

  // 1. Create two test accounts: Student A (NightOwl) and Student B (QuietMoon) and Student C (LostStar)
  const pass = 'Password123!';
  const ts = Date.now();

  const regA = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `conv_a_${ts}@test.com`, password: pass, chosenIdentity: 'NightOwl' })
  })).json();

  const regB = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `conv_b_${ts}@test.com`, password: pass, chosenIdentity: 'QuietMoon' })
  })).json();

  const regC = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `conv_c_${ts}@test.com`, password: pass, chosenIdentity: 'LostStar' })
  })).json();

  const tokenA = regA.data.token;
  const tokenB = regB.data.token;
  const tokenC = regC.data.token;

  assert(tokenA && tokenB && tokenC, 'Successfully registered Accounts A (NightOwl), B (QuietMoon), and C (LostStar)');

  // 2. Student B creates a post
  const postB = await (await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ content: 'I spent weeks panicking about my coding midterm.', category: 'Academic' })
  })).json();

  console.log('DEBUG postB response:', postB);
  const expPostId = postB.data?.id;
  assert(expPostId, `Student B created experience post (ID: ${expPostId})`);

  // 3. Student B tries to request conversation with themselves -> SHOULD FAIL
  const selfReqRes = await (await fetch(`${BASE_URL}/conversations/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ experiencePostId: expPostId, message: 'Self request' })
  })).json();

  assert(selfReqRes.success === false, 'Backend blocks self-conversation requests (Student B cannot request own post)');

  // 4. Student A sends conversation request to Student B's experience post
  const reqRes = await (await fetch(`${BASE_URL}/conversations/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      experiencePostId: expPostId,
      message: 'I have been going through something similar and would like to know what helped you.'
    })
  })).json();

  const requestId = reqRes.data?.id;
  assert(reqRes.success && requestId && reqRes.data.status === 'pending', 'Student A successfully sent pending conversation request to Student B');

  // 5. Student A tries duplicate request -> SHOULD FAIL
  const dupReqRes = await (await fetch(`${BASE_URL}/conversations/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ experiencePostId: expPostId, message: 'Duplicate request' })
  })).json();

  assert(dupReqRes.success === false, 'Backend blocks duplicate pending request between the same users for an experience');

  // 6. Student B lists incoming requests and sees request from NightOwl
  const listReqB = await (await fetch(`${BASE_URL}/conversations/requests`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  })).json();

  console.log('DEBUG listReqB result:', JSON.stringify(listReqB, null, 2));
  console.log('DEBUG Student B User ID:', regB.data.user.id);

  const incomingReq = listReqB.data?.find(r => r.id === requestId);
  assert(incomingReq && incomingReq.otherUserDisplayName === 'NightOwl', 'Student B receives request showing requester pseudonym "NightOwl"');

  // 7. Student B accepts request -> Creates conversation
  const acceptRes = await (await fetch(`${BASE_URL}/conversations/requests/${requestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ status: 'accepted' })
  })).json();

  const convId = acceptRes.data?.conversationId;
  assert(acceptRes.success && convId, `Student B accepts request, creating conversation (ID: ${convId})`);

  // 8. IDOR SECURITY TEST: Student C tries to access Student A & B's conversation -> SHOULD FAIL (404/403)
  const idorGetRes = await (await fetch(`${BASE_URL}/conversations/${convId}`, {
    headers: { 'Authorization': `Bearer ${tokenC}` }
  })).json();

  assert(idorGetRes.success === false, 'IDOR Protection: Unrelated Student C cannot read Conversation 123 details');

  const idorMsgRes = await (await fetch(`${BASE_URL}/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenC}` },
    body: JSON.stringify({ content: 'I am eavesdropping' })
  })).json();

  assert(idorMsgRes.success === false, 'IDOR Protection: Unrelated Student C cannot send messages to Conversation 123');

  // 9. Student A fetches conversation details
  const getConvA = await (await fetch(`${BASE_URL}/conversations/${convId}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  })).json();

  assert(getConvA.data?.otherUserDisplayName === 'QuietMoon' && getConvA.data?.messages?.length >= 1, 'Student A sees active conversation with "QuietMoon" and initial message');

  // 10. Message validation: Empty string -> SHOULD FAIL
  const emptyMsgRes = await (await fetch(`${BASE_URL}/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ content: '   ' })
  })).json();

  assert(emptyMsgRes.success === false, 'Zod message validation rejects whitespace-only messages');

  // 11. Student A sends message to Student B
  const sendMsgRes = await (await fetch(`${BASE_URL}/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ content: 'Thank you for accepting! How did you prepare for the coding test?' })
  })).json();

  assert(sendMsgRes.success && sendMsgRes.data?.content.includes('coding test'), 'Student A sends message in conversation');

  // 12. Student B reads updated conversation
  const getConvB = await (await fetch(`${BASE_URL}/conversations/${convId}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  })).json();

  assert(getConvB.data?.messages?.length === 2, 'Student B receives message in conversation history');

  // 13. Student A ends conversation
  const endRes = await (await fetch(`${BASE_URL}/conversations/${convId}/end`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  })).json();

  assert(endRes.data?.status === 'ended', 'Student A ends conversation');

  // 14. Post-end messaging test -> SHOULD FAIL
  const postEndMsgRes = await (await fetch(`${BASE_URL}/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ content: 'Trying to send after ended' })
  })).json();

  assert(postEndMsgRes.success === false, 'Backend prevents sending messages after conversation is ended');

  // 15. Student A blocks Student B in another test conversation
  const req2Res = await (await fetch(`${BASE_URL}/conversations/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ experiencePostId: expPostId, message: 'Second test' })
  })).json();

  // Student B blocks Student A
  const blockRes = await (await fetch(`${BASE_URL}/conversations/${convId}/block`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  })).json();

  assert(blockRes.data?.status === 'blocked', 'Student B blocks user in conversation');

  // 16. Student A attempts new request after block -> SHOULD FAIL
  const postBlockReqRes = await (await fetch(`${BASE_URL}/conversations/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ experiencePostId: expPostId, message: 'After block' })
  })).json();

  assert(postBlockReqRes.success === false, 'Backend enforces block rule for future requests');

  // 17. Student A submits report
  const reportRes = await (await fetch(`${BASE_URL}/conversations/${convId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ reason: 'Harassment', details: 'Felt uncomfortable' })
  })).json();

  assert(reportRes.success && reportRes.data?.reportId, 'Student A submits report quietly for human moderators');

  console.log('\n====================================================');
  console.log(`FINAL CONVERSATIONS SCORE: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');
}

runConversationsTests().catch(console.error);
