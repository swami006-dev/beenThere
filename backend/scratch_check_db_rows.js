require('dotenv').config();
const { createUserClient } = require('./src/db/supabase');
const BASE_URL = 'http://localhost:5000/api';

async function checkRows() {
  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `check_rows_${ts}@campus.edu`, password: 'Password123!', chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  const userClient = createUserClient(token);

  const { data: cards, error } = await userClient
    .from('experience_cards')
    .select('id, category, tags, situation, what_helped, embedding');

  console.log('experience_cards select:', {
    count: cards?.length,
    error: error?.message
  });

  if (cards && cards.length > 0) {
    console.log('Sample card:', cards[0]);
    const embeddedCount = cards.filter(c => c.embedding !== null && c.embedding !== undefined).length;
    console.log(`Embedded count: ${embeddedCount}/${cards.length}`);
  }
}

checkRows().catch(console.error);
