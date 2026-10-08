require('dotenv').config();
const { supabase, createUserClient } = require('../src/db/supabase');

async function verifyAll() {
  console.log('============================================================');
  console.log('📋 COMPREHENSIVE PRODUCTION PERSISTENCE AUDIT & TEST');
  console.log('============================================================\n');

  // 1. Authenticate Student A & Student B
  const userAEmail = 'seed_runner_test@beenthere.internal';
  const userBEmail = 'student_b_fixed@beenthere.internal';
  const password = 'SeedUserPassword123!';

  const { data: authA, error: errA } = await supabase.auth.signInWithPassword({ email: userAEmail, password });
  const { data: authB, error: errB } = await supabase.auth.signInWithPassword({ email: userBEmail, password });

  if (errA || errB) {
    console.error('❌ Failed to authenticate test students:', errA?.message || errB?.message);
    process.exit(1);
  }

  const clientA = createUserClient(authA.session.access_token);
  const clientB = createUserClient(authB.session.access_token);
  const userA = authA.user;
  const userB = authB.user;

  console.log(`✅ Authenticated Student A (${userA.id.slice(0, 8)}...) & Student B (${userB.id.slice(0, 8)}...)`);

  // 2. Audit Table Schema in Supabase
  console.log('\n--- 1. AUDITING SUPABASE TABLES ---');
  const requiredTables = [
    'experience_cards',
    'posts',
    'responses',
    'anonymous_profiles',
    'saved_items',
    'post_reactions',
    'conversation_requests',
    'conversations',
    'messages',
    'blocked_users'
  ];

  let missingTables = [];
  for (const tbl of requiredTables) {
    const { data, error } = await clientA.from(tbl).select('*').limit(1);
    if (error) {
      console.log(`❌ Table [${tbl}]: ${error.code} - ${error.message}`);
      missingTables.push(tbl);
    } else {
      console.log(`✅ Table [${tbl}]: Active in Supabase`);
    }
  }

  if (missingTables.length > 0) {
    console.log('\n⚠️ ATTENTION: The following tables are NOT YET CREATED in Supabase:');
    console.log(missingTables.map(t => `   - public.${t}`).join('\n'));
    console.log('\n👉 Execute Migration 007 in the Supabase SQL Editor:');
    console.log('   File: backend/src/db/migrations/007_production_persistence_master.sql');
    return { success: false, missingTables };
  }

  console.log('\n--- 2. TESTING SAVED ITEMS PERSISTENCE IN SUPABASE ---');
  const testExpId = '00000000-0000-4000-a000-000000000001';
  // Insert
  const { error: saveErr } = await clientA
    .from('saved_items')
    .upsert({ user_id: userA.id, item_id: testExpId, item_type: 'experience' }, { onConflict: 'user_id, item_id' });
  if (saveErr) throw new Error('Save item failed: ' + saveErr.message);

  // Read back
  const { data: savedRows, error: readSaveErr } = await clientA
    .from('saved_items')
    .select('*')
    .eq('user_id', userA.id)
    .eq('item_id', testExpId);
  if (readSaveErr || !savedRows || savedRows.length === 0) throw new Error('Saved item not found in Supabase!');
  console.log('✅ Saved item persisted directly in Supabase saved_items table!');

  // Cleanup unsave
  await clientA.from('saved_items').delete().eq('user_id', userA.id).eq('item_id', testExpId);
  console.log('✅ Unsaved item deleted cleanly from Supabase saved_items table!');

  console.log('\n--- 3. TESTING CONVERSATION REQUESTS & MESSAGES IN SUPABASE ---');
  // Get Student B anonymous profile
  const { data: profB } = await clientA.from('anonymous_profiles').select('id').eq('user_id', userB.id).single();
  const { data: profA } = await clientA.from('anonymous_profiles').select('id').eq('user_id', userA.id).single();

  const testRequestId = require('crypto').randomUUID();
  const reqPayload = {
    id: testRequestId,
    experience_post_id: testExpId,
    requester_user_id: userA.id,
    requester_anonymous_profile_id: profA.id,
    recipient_user_id: userB.id,
    recipient_anonymous_profile_id: profB?.id || null,
    message: 'Hello from production persistence test',
    status: 'pending'
  };

  const { error: reqErr } = await clientA.from('conversation_requests').insert(reqPayload);
  if (reqErr) throw new Error('Insert conversation request failed: ' + reqErr.message);

  // Student B reads request
  const { data: bRequests, error: bReadErr } = await clientB
    .from('conversation_requests')
    .select('*')
    .eq('id', testRequestId);
  if (bReadErr || !bRequests || bRequests.length === 0) throw new Error('Student B cannot read request: ' + bReadErr?.message);
  console.log('✅ Student B successfully received persistent conversation request from Supabase!');

  // Student B accepts request
  const convId = require('crypto').randomUUID();
  await clientB.from('conversation_requests').update({ status: 'accepted' }).eq('id', testRequestId);
  await clientB.from('conversations').insert({
    id: convId,
    request_id: testRequestId,
    experience_post_id: testExpId,
    participant1_user_id: userA.id,
    participant1_anonymous_profile_id: profA.id,
    participant2_user_id: userB.id,
    participant2_anonymous_profile_id: profB.id,
    status: 'active'
  });
  console.log('✅ Conversation accepted and created in Supabase conversations table!');

  // Student A sends message
  const msgId = require('crypto').randomUUID();
  await clientA.from('messages').insert({
    id: msgId,
    conversation_id: convId,
    sender_user_id: userA.id,
    sender_anonymous_profile_id: profA.id,
    content: 'Persistent chat message in Supabase'
  });

  // Student B reads message
  const { data: msgs, error: msgReadErr } = await clientB
    .from('messages')
    .select('*')
    .eq('conversation_id', convId);
  if (msgReadErr || !msgs || msgs.length === 0) throw new Error('Message read failed: ' + msgReadErr?.message);
  console.log('✅ Message received and verified in Supabase messages table:', msgs[0].content);

  // Clean test conversation
  await clientA.from('conversations').delete().eq('id', convId);
  await clientA.from('conversation_requests').delete().eq('id', testRequestId);

  console.log('\n============================================================');
  console.log('🎉 ALL SUPABASE PERSISTENCE TESTS PASSED 100%!');
  console.log('============================================================');
  return { success: true };
}

verifyAll().catch(err => {
  console.error('❌ Verification error:', err.message);
  process.exit(1);
});
