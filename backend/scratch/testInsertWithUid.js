const { createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');

async function testUid() {
  const email = `seed_user_uid_${Date.now()}@beenthere.internal`;
  const authRes = await AuthService.register({ email, password: 'TestPassword123!' });
  const userClient = createUserClient(authRes.token);
  const userId = authRes.user.id;

  const candidateFields = [
    { user_id: userId, category: "Academic", situation: "Test 1", what_helped: "Test help 1", tags: ["Coding"] },
    { created_by_user_id: userId, category: "Academic", situation: "Test 2", what_helped: "Test help 2", tags: ["Coding"] },
    { category: "Academic", situation: "Test 3", what_helped: "Test help 3", tags: ["Coding"], status: "pending" },
    { category: "Academic", situation: "Test 4", what_helped: "Test help 4", tags: ["Coding"], status: "approved" },
    { user_id: userId, category: "Academic", title: "Test 5", excerpt: "Test excerpt", what_happened: "Test", what_helped: ["Item"], what_changed: "Test", where_i_am_now: "Test", tags: ["Coding"], status: "approved" },
    { created_by_user_id: userId, category: "Academic", title: "Test 6", excerpt: "Test excerpt", what_happened: "Test", what_helped: ["Item"], what_changed: "Test", where_i_am_now: "Test", tags: ["Coding"], status: "approved" }
  ];

  for (let i = 0; i < candidateFields.length; i++) {
    const res = await userClient.from('experience_cards').insert(candidateFields[i]).select();
    if (res.error) {
      console.log(`Candidate ${i+1} Error:`, res.error.message);
    } else {
      console.log(`🎉 Candidate ${i+1} SUCCESS! Inserted:`, res.data);
    }
  }
}

testUid().catch(err => console.error(err));
