const http = require('http');

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING USER JOURNEY VERIFICATION ---');

  const testEmail = `student_${Date.now()}@example.com`;
  const testPass = 'StudentPass123!';

  // 1. Register test student
  console.log('\n1. Testing Registration...');
  const regRes = await makeRequest('POST', '/auth/register', {
    email: testEmail,
    password: testPass,
    chosenIdentity: 'Anonymous Moon',
    academicContext: 'Biology Student'
  });
  console.log('Reg status:', regRes.status, 'Body:', JSON.stringify(regRes.body));

  // 2. Login test student
  console.log('\n2. Testing Login...');
  const loginRes = await makeRequest('POST', '/auth/login', {
    email: testEmail,
    password: testPass
  });
  console.log('Login status:', loginRes.status, 'Token received:', !!loginRes.body?.data?.token);
  const token = loginRes.body?.data?.token;
  const userRole = loginRes.body?.data?.user?.role;
  console.log('Student role returned:', userRole);

  // 3. GET /auth/me
  console.log('\n3. Testing GET /auth/me with session token...');
  const meRes = await makeRequest('GET', '/auth/me', null, token);
  console.log('GetMe status:', meRes.status, 'Role:', meRes.body?.data?.role, 'Identity:', meRes.body?.data?.anonymousProfile?.anonymousDisplayName);

  // 4. Create post as student
  console.log('\n4. Testing Create Post as student...');
  const postRes = await makeRequest('POST', '/posts', {
    content: 'Verification reflection content created during user journey test.',
    category: 'Academic',
    tags: ['Academic']
  }, token);
  console.log('Create post status:', postRes.status, 'Created ID:', postRes.body?.data?.id);

  // 5. Test Student attempting moderator endpoint GET /moderation/reports -> MUST RETURN 403
  console.log('\n5. Testing Student accessing /api/moderation/reports (MUST BE 403 FORBIDDEN)...');
  const modRes = await makeRequest('GET', '/moderation/reports', null, token);
  console.log('Moderation reports response status for student:', modRes.status);
  if (modRes.status === 403) {
    console.log('✅ Student moderation protection SUCCESSFUL (Received 403 Forbidden)!');
  } else {
    console.error('❌ FAILED: Student should get 403 but got:', modRes.status);
  }

  // 6. Test Unauthenticated request to /posts -> 401
  console.log('\n6. Testing unauthenticated POST /posts (MUST BE 401)...');
  const unauthPostRes = await makeRequest('POST', '/posts', { content: 'test' });
  console.log('Unauth post status:', unauthPostRes.status);

  console.log('\n--- VERIFICATION COMPLETED ---');
}

runTests().catch(err => console.error('Verification error:', err));
