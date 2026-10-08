require('dotenv').config();
const { createUserClient } = require('./src/db/supabase');
const BASE_URL = 'http://localhost:5000/api';

async function checkCols() {
  const ts = Date.now();
  const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `col_audit_${ts}@campus.edu`, password: 'Password123!', chosenIdentity: 'StudyBear' })
  })).json();

  const token = regRes.data?.token;
  const userClient = createUserClient(token);

  const cardPayload = {
    title: 'Test Title',
    category: 'Academic',
    excerpt: 'Test Excerpt',
    what_happened: 'Happened',
    what_helped: ['Helped'],
    what_changed: 'Changed',
    where_i_am_now: 'Now',
    tags: ['Tag1'],
    status: 'approved'
  };

  const { data, error } = await userClient
    .from('experience_cards')
    .insert(cardPayload)
    .select();

  console.log('Insert without embedding:', { data, error });
}

checkCols().catch(console.error);
