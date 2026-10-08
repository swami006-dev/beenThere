async function check() {
  const res = await fetch('https://been-there-g5on.vercel.app');
  const html = await res.text();
  console.log('HTML length:', html.length);
  const scriptRegex = /src="(\/assets\/[^"]+\.js)"/g;
  let m;
  const scripts = [];
  while ((m = scriptRegex.exec(html)) !== null) {
    scripts.push(m[1]);
  }
  console.log('Scripts:', scripts);

  for (const scriptUrl of scripts) {
    const jsRes = await fetch('https://been-there-g5on.vercel.app' + scriptUrl);
    const js = await jsRes.text();
    console.log(`Script ${scriptUrl} length: ${js.length}`);
    
    // Check for API URLs or localhost
    const localhostMatches = js.match(/http:\/\/localhost:[0-9]+/g);
    console.log('localhost matches in bundle:', localhostMatches);

    const apiMatches = js.match(/https?:\/\/[a-zA-Z0-9.-]+\.vercel\.app[a-zA-Z0-9/_.-]*/g);
    console.log('vercel.app matches in bundle:', apiMatches);
  }
}

check().catch(console.error);
