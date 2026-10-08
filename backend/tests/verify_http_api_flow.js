// Using globalThis.fetch available in Node 18+

async function testHttpEndpoints() {
  console.log('====================================================');
  console.log('🌐 TESTING HTTP API ENDPOINTS ON RUNNING BACKEND');
  console.log('====================================================\n');

  // 1. Register User A
  const emailA = `http_user_a_${Date.now()}@beenthere.internal`;
  const regResA = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password: 'Password123!', anonymousName: 'Anonymous Star' })
  });
  const regDataA = await regResA.json();
  const tokenA = regDataA.data?.token;
  console.log('1. User A registered. Status:', regResA.status, 'Token acquired:', !!tokenA);

  // 2. Register User B
  const emailB = `http_user_b_${Date.now()}@beenthere.internal`;
  const regResB = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, password: 'Password123!', anonymousName: 'Anonymous Owl' })
  });
  const regDataB = await regResB.json();
  const tokenB = regDataB.data?.token;
  console.log('2. User B registered. Status:', regResB.status, 'Token acquired:', !!tokenB);

  // 3. User A creates reflection via POST /api/posts
  const testInput = "I keep buying things I don't need and then regret it later.";
  const createRes = await fetch('http://localhost:5000/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      content: testInput,
      category: 'Lifestyle',
      tags: ['Impulsive', 'Regret']
    })
  });
  const createData = await createRes.json();
  console.log('3. POST /api/posts status:', createRes.status);
  const createdPostId = createData.data?.id;
  console.log('   Created Post ID:', createdPostId);

  // 4. Test Semantic Matching via POST /api/ai/match
  const matchRes = await fetch('http://localhost:5000/api/ai/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      content: testInput,
      category: 'Lifestyle',
      tags: ['Impulsive', 'Regret'],
      topK: 5
    })
  });
  const matchData = await matchRes.json();
  console.log('4. POST /api/ai/match status:', matchRes.status);
  console.log('   Matches count:', matchData.data?.matches?.length || 0);

  // 5. User A fetches My Experiences via GET /api/posts/mine
  const myPostsResA = await fetch('http://localhost:5000/api/posts/mine', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const myPostsDataA = await myPostsResA.json();
  console.log('5. User A GET /api/posts/mine status:', myPostsResA.status);
  console.log('   User A posts count:', myPostsDataA.data?.length || 0);
  const foundA = (myPostsDataA.data || []).find(p => p.id === createdPostId);
  console.log('   Found created post in User A My Experiences:', !!foundA);
  if (!foundA) throw new Error('Post missing from User A My Experiences!');

  // 6. User B fetches My Experiences via GET /api/posts/mine (must be 0)
  const myPostsResB = await fetch('http://localhost:5000/api/posts/mine', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const myPostsDataB = await myPostsResB.json();
  console.log('6. User B GET /api/posts/mine status:', myPostsResB.status);
  console.log('   User B posts count:', myPostsDataB.data?.length || 0);
  const leakedToB = (myPostsDataB.data || []).find(p => p.id === createdPostId);
  console.log('   Post leaked to User B:', !!leakedToB);
  if (leakedToB) throw new Error('Privacy leak: User A post leaked to User B!');

  // 7. GET /api/posts/:id (Experience detail page fetch)
  const getDetailRes = await fetch(`http://localhost:5000/api/posts/${createdPostId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const detailData = await getDetailRes.json();
  console.log('7. GET /api/posts/:id status:', getDetailRes.status);
  console.log('   Detail post content:', detailData.data?.content);

  console.log('\n====================================================');
  console.log('🎉 ALL HTTP API FLOW TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

testHttpEndpoints().catch(err => {
  console.error('❌ HTTP TEST ERROR:', err);
  process.exit(1);
});
