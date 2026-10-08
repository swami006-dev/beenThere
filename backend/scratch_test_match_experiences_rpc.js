require('dotenv').config();
const { supabase, createUserClient } = require('./src/db/supabase');
const EmbeddingService = require('./src/services/embedding.service');
const BASE_URL = 'http://localhost:5000/api';

async function testMatchExperiences() {
  console.log('====================================================');
  console.log('🔍 TESTING match_experiences RPC ON SUPABASE');
  console.log('====================================================\n');

  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `rpc_check_${ts}@campus.edu`, password: 'Password123!', chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  const userClient = createUserClient(token);

  const queryText = "I understand DSA while studying but freeze when the coding test timer starts.";
  const queryVec = await EmbeddingService.generateEmbedding(queryText);

  console.log('Calling match_experiences RPC with 384D query vector...');

  const { data: rpcRes, error: rpcErr } = await userClient.rpc('match_experiences', {
    query_embedding: queryVec,
    match_threshold: 0.1,
    match_count: 5
  });

  console.log('RPC Response:', {
    success: !rpcErr,
    dataCount: rpcRes?.length,
    error: rpcErr?.message
  });

  if (rpcRes) {
    console.log('Returned rows:', rpcRes);
  }
}

testMatchExperiences().catch(console.error);
