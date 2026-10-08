async function testEmbedding() {
  console.log('====================================================');
  console.log('🧪 TESTING REAL TEXT EMBEDDINGS (Xenova/all-MiniLM-L6-v2)');
  console.log('====================================================\n');

  const { pipeline } = await import('@xenova/transformers');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  const text1 = "I spent weeks panicking about my coding midterm.";
  const text2 = "I understand concepts while studying but freeze during timed coding tests.";
  const text3 = "I moved to a new hostel and feel lonely.";

  const output1 = await extractor(text1, { pooling: 'mean', normalize: true });
  const vec1 = Array.from(output1.data);

  const output2 = await extractor(text2, { pooling: 'mean', normalize: true });
  const vec2 = Array.from(output2.data);

  const output3 = await extractor(text3, { pooling: 'mean', normalize: true });
  const vec3 = Array.from(output3.data);

  console.log(`✅ Vector 1 length: ${vec1.length}`);
  console.log(`   Sample vector values [0..4]:`, vec1.slice(0, 5));

  function dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
  }

  const sim1_2 = dotProduct(vec1, vec2);
  const sim1_3 = dotProduct(vec1, vec3);

  console.log(`\n📊 Cosine Similarity Results:`);
  console.log(`   "Coding exam panic" vs "Coding test freeze": ${sim1_2.toFixed(4)} (HIGH SEMANTIC MATCH)`);
  console.log(`   "Coding exam panic" vs "Hostel loneliness":   ${sim1_3.toFixed(4)} (LOW SEMANTIC MATCH)`);

  if (sim1_2 > sim1_3 + 0.2) {
    console.log('\n🎉 SUCCESS: Real 384-dimensional text embeddings generate accurate semantic similarity scores!');
  }
}

testEmbedding().catch(err => console.error('Embedding test failed:', err));
