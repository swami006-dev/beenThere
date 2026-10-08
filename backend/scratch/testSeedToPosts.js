const { createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');

async function seedPostsTest() {
  const seedEmail = `seed_runner_posts_${Date.now()}@beenthere.internal`;
  const authRes = await AuthService.register({ email: seedEmail, password: 'SeedPassword123!' });
  const userClient = createUserClient(authRes.token);

  const testPost = {
    anonymous_profile_id: authRes.anonymousProfile.id,
    content: "I kept studying for coding exams but froze when solving problems.\n\nWhat Helped:\n- Stopped trying to solve huge problems immediately\n- Practiced one small algorithm pattern at a time",
    category: "Academic",
    status: "approved",
    created_at: new Date().toISOString()
  };

  const res = await userClient.from('posts').insert(testPost).select();
  console.log('Insert Post Error:', res.error);
  console.log('Inserted Post:', res.data);
}

seedPostsTest().catch(err => console.error(err));
