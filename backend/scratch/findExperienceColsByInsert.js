const { createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');

async function testWithAnonProfile() {
  const email = `seed_anon_test_${Date.now()}@beenthere.internal`;
  const authRes = await AuthService.register({ email, password: 'TestPassword123!' });
  const userClient = createUserClient(authRes.token);
  const anonProfile = authRes.anonymousProfile;

  console.log('Anon profile:', anonProfile);

  const testObjects = [
    { anonymous_profile_id: anonProfile.id, category: 'Academic', situation: 'Test situation 1' },
    { anonymous_profile_id: anonProfile.id, category: 'Academic', content: 'Test content 1' },
    { anonymous_profile_id: anonProfile.id, category: 'Academic', excerpt: 'Test excerpt 1' },
    { anonymous_profile_id: anonProfile.id, category: 'Academic', title: 'Test title 1' },
    { category: 'Academic', situation: 'Test situation 2', what_helped: 'Test help' }
  ];

  for (let i = 0; i < testObjects.length; i++) {
    const res = await userClient.from('experience_cards').insert(testObjects[i]).select();
    if (res.error) {
      console.log(`Test ${i+1}:`, res.error.message);
    } else {
      console.log(`✅ Test ${i+1} SUCCESS:`, res.data);
    }
  }
}

testWithAnonProfile().catch(err => console.error(err));
