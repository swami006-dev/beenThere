const { supabase } = require('../src/db/supabase');

async function findCols() {
  // Test common column names
  const testKeys = ['title', 'content', 'description', 'summary', 'situation', 'what_happened', 'what_helped', 'what_changed', 'where_i_am_now', 'category', 'tags', 'status'];

  for (const k of testKeys) {
    const obj = {};
    obj[k] = 'test';
    const res = await supabase.from('experience_cards').insert(obj).select();
    console.log(`Key '${k}':`, res.error?.message || 'SUCCESS!');
  }
}

findCols().catch(err => console.error(err));
