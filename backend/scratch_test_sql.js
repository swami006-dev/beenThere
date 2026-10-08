require('dotenv').config();
const { supabase } = require('./src/db/supabase');

async function testSql() {
  console.log('Testing SQL query functions on Supabase...');
  
  // Try common RPC names for sql execution
  const sqlCommands = [
    'CREATE EXTENSION IF NOT EXISTS vector;',
    'ALTER TABLE public.experience_cards ADD COLUMN IF NOT EXISTS embedding vector(384);'
  ];

  for (const fn of ['exec_sql', 'exec', 'execute_sql', 'sql_query', 'query']) {
    for (const sql of sqlCommands) {
      const { data, error } = await supabase.rpc(fn, { query: sql, sql: sql });
      if (!error) {
        console.log(`✅ RPC '${fn}' succeeded for query: ${sql}`);
      } else {
        // console.log(`RPC '${fn}' failed:`, error.message);
      }
    }
  }
}

testSql().catch(console.error);
