require('dotenv').config();
const { supabase } = require('./src/db/supabase');
const EmbeddingService = require('./src/services/embedding.service');
const AiService = require('./src/services/ai.service');

const BASE_URL = 'http://localhost:5000/api';

async function runFinalVerification() {
  console.log('====================================================');
  console.log('🧪 BEENTHERE — FINAL AI MATCHING & FLOW VERIFICATION');
  console.log('====================================================\n');

  // Register accounts
  const pass = 'Password123!';
  const ts = Date.now();
  const userA = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `flowA_${ts}@campus.edu`, password: pass, chosenIdentity: 'NightOwl' })
  })).json();

  const userB = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `flowB_${ts}@campus.edu`, password: pass, chosenIdentity: 'QuietMoon' })
  })).json();

  const tokenA = userA.data?.token;
  const tokenB = userB.data?.token;

  let passed = 0;

  // 1. GOOD MATCH TEST — DSA Exam Panic
  console.log('--- 1. GOOD MATCH TEST (DSA Exam Panic) ---');
  const dsaQuery = "I understand DSA while studying but freeze when the coding test timer starts.";
  const dsaMatch = await AiService.matchExperiences({
    content: dsaQuery,
    category: 'Academic',
    topK: 5
  });

  const topDsaMatch = dsaMatch.matches[0];
  console.log(`Match Type: ${dsaMatch.matchType} | Count: ${dsaMatch.matches.length}`);
  console.log(`Top Match: "${topDsaMatch?.title}" (Label: ${topDsaMatch?.relevanceLabel})`);

  if (topDsaMatch && topDsaMatch.title.toLowerCase().includes('coding exam paralysis')) {
    console.log('✅ PASS: DSA query matched "Overcoming Coding Exam Paralysis"');
    passed++;
  } else {
    console.error('❌ FAIL: DSA query did not match expected card');
  }

  // 2. GOOD MATCH TEST — Hostel Loneliness
  console.log('\n--- 2. GOOD MATCH TEST (Hostel Loneliness) ---');
  const hostelQuery = "I recently moved into a hostel and feel lonely because I don't know anyone.";
  const hostelMatch = await AiService.matchExperiences({
    content: hostelQuery,
    category: 'Social / Communication',
    topK: 5
  });

  const topHostelMatch = hostelMatch.matches[0];
  console.log(`Match Type: ${hostelMatch.matchType} | Count: ${hostelMatch.matches.length}`);
  console.log(`Top Match: "${topHostelMatch?.title}" (Label: ${topHostelMatch?.relevanceLabel})`);

  if (topHostelMatch && topHostelMatch.title.toLowerCase().includes('hostel loneliness')) {
    console.log('✅ PASS: Hostel query matched "Overcoming Hostel Loneliness"');
    passed++;
  } else {
    console.error('❌ FAIL: Hostel query did not match expected card');
  }

  // 3. NO-MATCH TEST — Quantum Propulsion
  console.log('\n--- 3. NO-MATCH TEST (Quantum Propulsion) ---');
  const quantumQuery = "Quantum gravitational warp drive propulsion systems.";
  const quantumMatch = await AiService.matchExperiences({
    content: quantumQuery,
    category: 'General',
    topK: 5
  });

  console.log(`Match Type: ${quantumMatch.matchType} | Matches Count: ${quantumMatch.matches.length}`);
  if (quantumMatch.matchType === 'no_match' && quantumMatch.matches.length === 0) {
    console.log('✅ PASS: Returned no_match for unrelated quantum query');
    passed++;
  } else {
    console.error('❌ FAIL: Did not return no_match for quantum query');
  }

  // 4. ORIGINAL POST CREATION & PRESERVATION
  console.log('\n--- 4. ORIGINAL POST CREATION & PRESERVATION ---');
  const postRes = await (await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      content: dsaQuery,
      category: 'Academic',
      tags: ['DSA', 'Exam Panic']
    })
  })).json();

  const realPostId = postRes.data?.id;
  console.log(`Created Post ID: ${realPostId}`);

  if (realPostId) {
    console.log('✅ PASS: Original post created and received REAL database ID:', realPostId);
    passed++;
  }

  // 5. PRIVATE CONVERSATION CONNECTION FLOW
  console.log('\n--- 5. PRIVATE CONVERSATION CONNECTION FLOW ---');
  const postBRes = await (await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ content: "I spent weeks panicking about my coding midterm.", category: "Academic" })
  })).json();
  const postBId = postBRes.data?.id;

  // Approve post so request can be sent
  await supabase.from('posts').update({ status: 'approved' }).eq('id', postBId);

  const reqRes = await (await fetch(`${BASE_URL}/conversations/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ experiencePostId: postBId, message: "Would love to chat about your routine!" })
  })).json();
  const reqId = reqRes.data?.id;

  if (reqId) {
    const acceptRes = await (await fetch(`${BASE_URL}/conversations/requests/${reqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({ status: 'accepted' })
    })).json();
    const convId = acceptRes.data?.id || acceptRes.data?.conversationId;

    if (convId) {
      const msgRes = await (await fetch(`${BASE_URL}/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
        body: JSON.stringify({ content: "Hi! Thanks for accepting." })
      })).json();

      if (msgRes.data && msgRes.data.content === "Hi! Thanks for accepting.") {
        console.log('✅ PASS: Anonymous private conversation request, accept, and message succeeded!');
        passed++;
      } else {
        console.error('❌ Conversation message note:', msgRes);
      }
    } else {
      console.error('❌ Accept conversation note:', acceptRes);
    }
  } else {
    console.error('❌ Request conversation note:', reqRes);
  }

  // 6. SAFETY AI TEST
  console.log('\n--- 6. SAFETY AI TEST ---');
  const safetyCheck = await AiService.checkMessageSafety("I am going to suicide and kill myself right now.");
  if (safetyCheck.risk === 'high' || safetyCheck.requires_human_review || !safetyCheck.isSafe) {
    console.log('✅ PASS: Safety AI correctly flagged self-harm signal');
    passed++;
  } else {
    console.error('❌ FAIL: Safety AI failed detection:', safetyCheck);
  }

  console.log('\n====================================================');
  console.log(`📊 FINAL VERIFICATION RESULT: ${passed}/6 TESTS PASSED`);
  console.log('====================================================\n');
}

runFinalVerification().catch(console.error);
