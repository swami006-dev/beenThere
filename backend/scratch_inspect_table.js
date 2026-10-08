require('dotenv').config();
const { supabase } = require('./src/db/supabase');

async function inspectTable() {
  console.log('--- INSPECTING EXPERIENCE_CARDS SCHEMA ---');
  
  // Try inserting a dummy row with no columns or selecting * with no column spec
  const { data, error } = await supabase.from('experience_cards').select('*').limit(1);
  console.log('Select * result:', { data, error });

  if (error) {
    console.log('Error details:', error);
  } else if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    console.log('Table exists but is empty. Let us try inserting an empty object to see column error hints.');
    const { error: insErr } = await supabase.from('experience_cards').insert({ invalid_col_xyz: 123 });
    console.log('Insert error hint:', insErr);
  }
}

inspectTable().catch(console.error);
