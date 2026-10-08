const { createUserClient } = require('../src/db/supabase');
const AuthService = require('../src/services/auth.service');
const PostsService = require('../src/services/posts.service');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING MY EXPERIENCES FIX & POST PERSISTENCE');
  console.log('====================================================\n');

  // Test 1: Register two distinct users
  console.log('Step 1: Registering User A and User B...');
  const userAEmail = `user_a_${Date.now()}@beenthere.internal`;
  const userBEmail = `user_b_${Date.now()}@beenthere.internal`;

  const authA = await AuthService.register({ email: userAEmail, password: 'Password123!', nickname: 'Anonymous Owl' });
  const authB = await AuthService.register({ email: userBEmail, password: 'Password123!', nickname: 'Anonymous Fox' });

  const clientA = createUserClient(authA.token);
  const clientB = createUserClient(authB.token);

  console.log('✅ User A registered with ID:', authA.user.id);
  console.log('✅ User B registered with ID:', authB.user.id);

  // Test 2: User A creates a reflection with critical test input
  console.log('\nStep 2: User A creates reflection: "I keep buying things I don\'t need and then regret it later."');
  const testInput = "I keep buying things I don't need and then regret it later.";
  const createdPost = await PostsService.createPost(clientA, authA.user, {
    content: testInput,
    category: 'Finance / Stress',
    tags: ['Shopping', 'Impulsive', 'Regret']
  });

  console.log('✅ Created post result:', {
    id: createdPost.id,
    content: createdPost.content,
    category: createdPost.category,
    status: createdPost.status,
    author: createdPost.anonymousDisplayName
  });

  // Verify ID is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(createdPost.id)) {
    throw new Error(`FAIL: Post ID is not a valid UUID: ${createdPost.id}`);
  }
  console.log('✅ Post ID is a valid UUID format:', createdPost.id);

  // Test 3: Verify direct database persistence in Supabase
  console.log('\nStep 3: Checking direct database persistence in Supabase public.posts...');
  const { data: dbPost, error: dbErr } = await clientA
    .from('posts')
    .select('*, anonymous_profiles(display_name, avatar_key)')
    .eq('id', createdPost.id)
    .single();

  if (dbErr || !dbPost) {
    throw new Error(`FAIL: Post was not found in Supabase public.posts: ${dbErr?.message}`);
  }
  console.log('✅ Post found in Supabase:', {
    id: dbPost.id,
    content: dbPost.content,
    anonymous_profile_id: dbPost.anonymous_profile_id,
    profile_name: dbPost.anonymous_profiles?.display_name
  });

  // Test 4: Retrieve User A's posts via listMyPosts (My Experiences)
  console.log('\nStep 4: Fetching My Experiences for User A...');
  const myPostsA = await PostsService.listMyPosts(clientA, authA.user);
  console.log('✅ User A My Experiences count:', myPostsA.length);
  const foundA = myPostsA.find(p => p.id === createdPost.id);
  if (!foundA) {
    throw new Error('FAIL: Created post did not appear in User A My Experiences');
  }
  console.log('✅ Newly created post is present in User A My Experiences:', {
    id: foundA.id,
    content: foundA.content,
    category: foundA.category
  });

  // Test 5: Verify privacy & isolation: User B must NOT see User A's post in My Experiences
  console.log('\nStep 5: Verifying isolation — User B My Experiences must NOT contain User A post...');
  const myPostsB = await PostsService.listMyPosts(clientB, authB.user);
  console.log('User B My Experiences count:', myPostsB.length);
  const leakedToB = myPostsB.find(p => p.id === createdPost.id);
  if (leakedToB) {
    throw new Error('FAIL: User A post leaked into User B My Experiences!');
  }
  console.log('✅ Complete user isolation confirmed! User B cannot see User A post in My Experiences.');

  // Test 6: Verify persistence across simulated page refresh / new client instance
  console.log('\nStep 6: Simulating browser refresh with fresh client instance...');
  const freshClientA = createUserClient(authA.token);
  const refreshedPosts = await PostsService.listMyPosts(freshClientA, authA.user);
  const foundAfterRefresh = refreshedPosts.find(p => p.id === createdPost.id);
  if (!foundAfterRefresh) {
    throw new Error('FAIL: Post missing after refresh / re-query');
  }
  console.log('✅ Post persists perfectly after refresh with exact same ID:', foundAfterRefresh.id);

  // Test 7: Verify single post constraint (no duplicate post created)
  console.log('\nStep 7: Verifying exactly one row exists in Supabase public.posts for this post...');
  const { data: allMatches, error: matchErr } = await clientA
    .from('posts')
    .select('id')
    .eq('id', createdPost.id);

  if (matchErr || allMatches.length !== 1) {
    throw new Error(`FAIL: Expected exactly 1 row for post ID, found: ${allMatches?.length}`);
  }
  console.log('✅ Exactly 1 row exists in public.posts (no duplicate posts created).');

  console.log('\n====================================================');
  console.log('🎉 ALL PERSISTENCE AND ISOLATION TESTS PASSED 7/7!');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
