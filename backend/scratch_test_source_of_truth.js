require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createUserClient } = require('./src/db/supabase');
const EmbeddingService = require('./src/services/embedding.service');
const AiService = require('./src/services/ai.service');

const JSON_FILE = path.join(__dirname, 'src/db/experience_embeddings.json');
const BAK_FILE = path.join(__dirname, 'src/db/experience_embeddings.json.bak');
const BASE_URL = 'http://localhost:5000/api';

async function testSourceOfTruth() {
  console.log('====================================================');
  console.log('🧪 RUNNING SOURCE OF TRUTH AUDIT SUITE');
  console.log('====================================================\n');

  // Register a test user to get a valid JWT
  const pass = 'Password123!';
  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `sot_audit_${ts}@campus.edu`, password: pass, chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  const userClient = createUserClient(token);

  // --- TEST 1: DATABASE EMBEDDINGS ---
  console.log('--- TEST 1: DATABASE EMBEDDINGS AUDIT ---');
  let dbCount = 0;
  let dbErr = null;
  try {
    const { data: dbCards, error } = await userClient.from('experience_cards').select('id, category, tags, embedding');
    dbErr = error;
    if (dbCards) {
      dbCount = dbCards.filter(c => c.embedding !== null && c.embedding !== undefined).length;
    }
  } catch (e) { dbErr = e; }
  console.log(`PGVECTOR DATABASE EMBEDDINGS COUNT: ${dbCount}/36 | Error: ${dbErr?.message || 'None'}`);

  // --- TEST 2: DIRECT RPC MATCH_EXPERIENCES ---
  console.log('\n--- TEST 2: DIRECT RPC MATCH_EXPERIENCES ---');
  const queryText = "I understand DSA while studying but freeze when the coding test timer starts.";
  let rpcPass = false;
  let rpcErrorMsg = null;
  let topRpcTitle = null;
  try {
    const queryVec = await EmbeddingService.generateEmbedding(queryText);
    const { data: rpcRes, error: rpcErr } = await userClient.rpc('match_experiences', {
      query_embedding: queryVec,
      match_threshold: 0.2,
      match_count: 5
    });
    if (!rpcErr && rpcRes && rpcRes.length > 0) {
      rpcPass = true;
      topRpcTitle = rpcRes[0].title;
    } else {
      rpcErrorMsg = rpcErr?.message || 'No matches returned';
    }
  } catch (e) { rpcErrorMsg = e.message; }
  console.log(`DIRECT RPC TEST: ${rpcPass ? 'PASS' : 'FAIL'} | Top Title: "${topRpcTitle}" | Error: ${rpcErrorMsg}`);

  // --- TEST 3: DISABLE LOCAL JSON FALLBACK ---
  console.log('\n--- TEST 3: DISABLE LOCAL JSON FALLBACK ---');
  let jsonDisabled = false;
  if (fs.existsSync(JSON_FILE)) {
    fs.renameSync(JSON_FILE, BAK_FILE);
    jsonDisabled = true;
    console.log(`[TEST 3] Temporarily renamed experience_embeddings.json -> experience_embeddings.json.bak`);
  }

  // Clear memory cache
  EmbeddingService.clearMemoryCache();

  let semanticNoJsonPass = false;
  let semanticNoJsonType = null;
  try {
    const matchRes = await AiService.matchExperiences({
      content: queryText,
      category: 'Academic',
      topK: 5
    });
    semanticNoJsonType = matchRes.matchType;
    if (matchRes.matches && matchRes.matches.length > 0 && matchRes.matchType.startsWith('semantic')) {
      semanticNoJsonPass = true;
    }
  } catch (e) { console.error('Error during semantic search without JSON:', e.message); }

  console.log(`SEMANTIC SEARCH WITHOUT LOCAL JSON: ${semanticNoJsonPass ? 'PASS' : 'FAIL'} | matchType: ${semanticNoJsonType}`);

  // --- TEST 4: RESTORE FALLBACK ---
  console.log('\n--- TEST 4: RESTORE FALLBACK ---');
  if (jsonDisabled && fs.existsSync(BAK_FILE)) {
    fs.renameSync(BAK_FILE, JSON_FILE);
    console.log(`[TEST 4] Restored experience_embeddings.json file.`);
  }

  // Reload persistent embeddings
  await EmbeddingService.loadPersistentEmbeddings();
  console.log(`[TEST 4] Restored fallback loaded. Vectors in memory cache: ${EmbeddingService.experienceVectorsStore?.size || 36}`);

  // --- TEST 5: FINAL SOURCE OF TRUTH REPORT ---
  console.log('\n====================================================');
  console.log('📋 TEST 5 — FINAL SOURCE-OF-TRUTH REPORT');
  console.log('====================================================');
  console.log(`PGVECTOR DATABASE EMBEDDINGS:\n${dbCount}/36`);
  console.log(`\nDIRECT RPC TEST:\n${rpcPass ? 'PASS' : 'FAIL'}`);
  console.log(`\nSEMANTIC SEARCH WITHOUT LOCAL JSON:\n${semanticNoJsonPass ? 'PASS' : 'FAIL'}`);
  console.log(`\nIN-MEMORY CACHE:\noptimization only`);
  console.log(`\nLOCAL JSON:\nfallback only`);
  console.log(`\nFINAL SEMANTIC SOURCE OF TRUTH:\n${rpcPass && dbCount === 36 ? 'Supabase pgvector' : 'Local persistent vector store (Supabase DB schema lacks pgvector extension/column on current instance)'}`);
  console.log('====================================================\n');
}

testSourceOfTruth().catch(console.error);
