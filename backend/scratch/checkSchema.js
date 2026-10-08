const { supabase } = require('../src/db/supabase');

async function check() {
  const { data, error } = await supabase.from('experience_cards').select('*').limit(1);
  console.log('Error:', error);
  console.log('Sample Data:', data);
}

check();
