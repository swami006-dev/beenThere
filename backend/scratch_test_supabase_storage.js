require('dotenv').config();
const { supabase } = require('./src/db/supabase');

async function testSupabaseDb() {
  console.log('--- TESTING SUPABASE DB FOR EXPERIENCE CARDS ---');

  // Try select with supabase client
  const { data: selectRes, error: selectErr } = await supabase
    .from('experience_cards')
    .select('id, title, category, embedding')
    .limit(5);

  console.log('Select result:', { data: selectRes, error: selectErr });

  // Try creating/upserting a card with embedding if table allows
  const dummyVector = Array(384).fill(0.05);
  const testCard = {
    id: 'test-exp-card-1',
    title: 'Test Experience Card with Embedding',
    category: 'Academic',
    excerpt: 'This is a test experience card.',
    what_happened: 'Test situation.',
    what_helped: ['Test item'],
    what_changed: 'Test result.',
    where_i_am_now: 'Test status.',
    status: 'approved',
    tags: ['Test'],
    embedding: dummyVector
  };

  const { data: upsertRes, error: upsertErr } = await supabase
    .from('experience_cards')
    .upsert(testCard, { onConflict: 'id' })
    .select();

  console.log('Upsert result:', { data: upsertRes, error: upsertErr });
}

testSupabaseDb().catch(console.error);
