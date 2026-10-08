const { createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');
const { DEMO_EXPERIENCES } = require('../src/db/seedExperiences');

async function testSeed() {
  const email = `seed_post_user_${Date.now()}@beenthere.edu`;
  const pass = 'P@ssword123!';
  const authRes = await AuthService.register({ email, password: pass });
  const userClient = createUserClient(authRes.token);

  console.log('Anon Profile ID:', authRes.anonymousProfile.id);

  const sample = DEMO_EXPERIENCES[0];
  const postData = {
    anonymous_profile_id: authRes.anonymousProfile.id,
    content: `${sample.excerpt}\n\nWhat Helped:\n${sample.what_helped.map(h => '• ' + h).join('\n')}`,
    category: sample.category,
    status: 'approved',
    created_at: new Date().toISOString()
  };

  const res = await userClient.from('posts').insert(postData).select();
  console.log('Insert Post Error:', res.error);
  console.log('Inserted Post Data:', res.data);
}

testSeed().catch(err => console.error(err));
