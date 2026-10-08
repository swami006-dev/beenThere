async function testUrls() {
  const candidates = [
    'https://been-there-backend.vercel.app',
    'https://beenthere-backend.vercel.app',
    'https://been-there-api.vercel.app',
    'https://beenthere-api.vercel.app',
    'https://been-there-server.vercel.app',
    'https://been-there.vercel.app',
    'https://beenthere.vercel.app',
    'https://been-there-fs-backend.vercel.app',
    'https://beenthere-fs-backend.vercel.app',
    'https://swami006-dev-been-there.vercel.app',
    'https://swami006-dev-beenthere.vercel.app',
    'https://been-there-g5on-backend.vercel.app',
    'https://been-there-g5on-api.vercel.app'
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
      console.log(`URL: ${url} -> Status: ${res.status}`);
      if (res.status === 200) {
        const text = await res.text();
        console.log(`  Response: ${text}`);
      }
    } catch (e) {
      // not found / timed out
    }
  }
}

testUrls().catch(console.error);
