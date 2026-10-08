const fs = require('fs');
const path = require('path');
const { DEMO_EXPERIENCES } = require('../db/seedExperiences');
const { supabase } = require('../db/supabase');

let pipelinePromise = null;

async function getExtractor() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      console.log('🤖 [EMBEDDING] Initializing text embedding model (Xenova/all-MiniLM-L6-v2, 384D)...');
      const { pipeline } = await import('@xenova/transformers');
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('✅ [EMBEDDING] Text embedding model ready!');
      return extractor;
    })();
  }
  return pipelinePromise;
}

// Memory store for precomputed 384D Experience Card vectors (Performance Optimization Cache)
// Key: cardId -> Value: Array of 384 numbers
const experienceVectorsStore = new Map();
const queryEmbeddingCache = new Map();

// Persistent JSON file path for vector storage backup across restarts
const EMBEDDINGS_FILE_PATH = path.join(__dirname, '../db/experience_embeddings.json');

function buildCardText(card) {
  const title = card.title || card.excerpt?.substring(0, 50) || '';
  const category = card.category || 'General';
  const whatHappened = card.what_happened || card.whatHappened || card.excerpt || '';
  const whatHelped = Array.isArray(card.what_helped || card.whatHelped)
    ? (card.what_helped || card.whatHelped).join(', ')
    : (card.what_helped || card.whatHelped || '');
  const tags = Array.isArray(card.tags) ? card.tags.join(', ') : (card.tags || '');

  return `Title: ${title}. Category: ${category}. Situation: ${whatHappened}. What helped: ${whatHelped}. Tags: ${tags}.`.trim();
}

function dotProduct(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += vecA[i] * vecB[i];
  }
  return sum;
}

function savePersistentStoreToFile() {
  try {
    const obj = {};
    for (const [key, val] of experienceVectorsStore.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(EMBEDDINGS_FILE_PATH, JSON.stringify(obj, null, 2), 'utf8');
    console.log(`💾 [EMBEDDING PERSISTENCE] Persisted ${Object.keys(obj).length} vectors to ${EMBEDDINGS_FILE_PATH}`);
  } catch (err) {
    console.warn('⚠️ [EMBEDDING PERSISTENCE] Failed to write embeddings file:', err.message);
  }
}

function loadPersistentStoreFromFile() {
  try {
    if (fs.existsSync(EMBEDDINGS_FILE_PATH)) {
      const content = fs.readFileSync(EMBEDDINGS_FILE_PATH, 'utf8');
      const obj = JSON.parse(content);
      let loaded = 0;
      for (const [key, val] of Object.entries(obj)) {
        if (Array.isArray(val) && val.length === 384) {
          experienceVectorsStore.set(key, val);
          loaded++;
        }
      }
      if (loaded > 0) {
        console.log(`📂 [EMBEDDING PERSISTENCE] Loaded ${loaded} vectors from persistent storage file.`);
        return loaded;
      }
    }
  } catch (err) {
    console.warn('⚠️ [EMBEDDING PERSISTENCE] Failed to load embeddings file:', err.message);
  }
  return 0;
}

class EmbeddingService {
  static get MODEL_NAME() {
    return 'Xenova/all-MiniLM-L6-v2';
  }

  static get VECTOR_DIMENSION() {
    return 384;
  }

  /**
   * Clear in-memory cache (for restart & persistence testing)
   */
  static clearMemoryCache() {
    experienceVectorsStore.clear();
    queryEmbeddingCache.clear();
    console.log('🧹 [EMBEDDING] In-memory vector cache cleared.');
  }

  /**
   * Load vectors from persistent storage (Supabase or persistent file store)
   */
  static async loadPersistentEmbeddings() {
    // 1. Check persistent file store
    let fileLoaded = loadPersistentStoreFromFile();

    // 2. Try loading from Supabase experience_cards table if available
    try {
      const { data: dbCards } = await supabase
        .from('experience_cards')
        .select('id, embedding')
        .not('embedding', 'is', null);

      if (dbCards && dbCards.length > 0) {
        let dbLoaded = 0;
        for (const card of dbCards) {
          if (card.embedding) {
            let vec = card.embedding;
            if (typeof vec === 'string') {
              try { vec = JSON.parse(vec); } catch (e) {}
            }
            if (Array.isArray(vec) && vec.length === 384) {
              experienceVectorsStore.set(card.id, vec);
              dbLoaded++;
            }
          }
        }
        if (dbLoaded > 0) {
          console.log(`🗄️ [EMBEDDING PERSISTENCE] Loaded ${dbLoaded} vectors from Supabase database.`);
          return dbLoaded;
        }
      }
    } catch (err) {
      // Supabase pgvector column not populated or inaccessible
    }

    return fileLoaded;
  }

  /**
   * Generate 384-dimensional normalized float embedding vector for text
   */
  static async generateEmbedding(text) {
    if (!text || !text.trim()) return null;

    const trimmed = text.trim();
    if (queryEmbeddingCache.has(trimmed)) {
      return queryEmbeddingCache.get(trimmed);
    }

    try {
      const extractor = await getExtractor();
      const output = await extractor(trimmed, { pooling: 'mean', normalize: true });
      const vector = Array.from(output.data);
      
      if (vector.length === 384) {
        queryEmbeddingCache.set(trimmed, vector);
        return vector;
      }
    } catch (err) {
      console.error('❌ [EMBEDDING] Embedding generation error:', err.message);
    }

    return null;
  }

  /**
   * Backfill / Seed embeddings for all 36 Experience Cards and persist them
   */
  static async seedExperienceEmbeddings(cardsList = DEMO_EXPERIENCES) {
    console.log(`\n⏳ [EMBEDDING SEED] Backfilling embeddings for ${cardsList.length} Experience Cards...`);
    let count = 0;

    // Load existing persistent store first
    await this.loadPersistentEmbeddings();

    for (let idx = 0; idx < cardsList.length; idx++) {
      const card = cardsList[idx];
      const cardIndex = idx + 1;
      const deterministicUuid = `00000000-0000-4000-a000-${cardIndex.toString(16).padStart(12, '0')}`;
      const cardId = card.id || deterministicUuid;
      const fallbackKey = `seed-exp-${cardIndex}`;
      
      // If already in store, skip regeneration unless card text changed
      if (experienceVectorsStore.has(cardId) || experienceVectorsStore.has(fallbackKey)) {
        const existingVec = experienceVectorsStore.get(cardId) || experienceVectorsStore.get(fallbackKey);
        experienceVectorsStore.set(cardId, existingVec);
        experienceVectorsStore.set(fallbackKey, existingVec);
        count++;
        continue;
      }

      const textToEmbed = buildCardText(card);
      const vector = await this.generateEmbedding(textToEmbed);

      if (vector && vector.length === 384) {
        experienceVectorsStore.set(cardId, vector);
        experienceVectorsStore.set(fallbackKey, vector);
        count++;

        // Attempt persisting vector into Supabase DB table experience_cards
        try {
          await supabase
            .from('experience_cards')
            .update({ embedding: vector })
            .eq('id', card.id || deterministicUuid);
        } catch (e) {}
      }
    }

    // Save to persistent file backup
    savePersistentStoreToFile();

    console.log(`✅ [EMBEDDING SEED] ${count}/${cardsList.length} Experience Cards have valid, persistent 384D embeddings.`);
    return count;
  }

  /**
   * Perform pgvector / cosine vector similarity search over Experience Cards
   */
  static async searchSemanticMatches({ queryText, category, tags = [], topK = 5, minThreshold = 0.28 }) {
    // 1. Ensure persistent vectors are loaded into memory cache
    if (experienceVectorsStore.size === 0) {
      await this.loadPersistentEmbeddings();
      if (experienceVectorsStore.size === 0) {
        await this.seedExperienceEmbeddings();
      }
    }

    // 2. Generate 384D query vector
    const queryVector = await this.generateEmbedding(queryText);
    if (!queryVector) {
      throw new Error('Failed to generate query embedding vector');
    }

    // 3. Try Supabase pgvector RPC search first
    try {
      const { data: rpcMatches, error: rpcErr } = await supabase.rpc('match_experiences', {
        query_embedding: queryVector,
        match_threshold: minThreshold,
        match_count: topK
      });

      if (!rpcErr && Array.isArray(rpcMatches) && rpcMatches.length > 0) {
        console.log(`⚡ [PGVECTOR RPC MATCH] Found ${rpcMatches.length} matches via Supabase pgvector RPC.`);
        const matches = rpcMatches.map(card => {
          const situationText = card.situation || card.what_happened || '';
          let title = card.title;
          let excerpt = card.excerpt;
          let whatHappened = card.what_happened || '';

          if (situationText.includes('Title: ')) {
            const tMatch = situationText.match(/Title:\s*(.*?)(?:\.\s*Excerpt:|\.\s*Situation:|\.|$)/);
            if (tMatch) title = tMatch[1].trim();
          }
          if (situationText.includes('Excerpt: ')) {
            const eMatch = situationText.match(/Excerpt:\s*(.*?)(?:\.\s*Situation:|\.|$)/);
            if (eMatch) excerpt = eMatch[1].trim();
          }
          if (situationText.includes('Situation: ')) {
            const sMatch = situationText.match(/Situation:\s*(.*)/s);
            if (sMatch) whatHappened = sMatch[1].trim();
          }

          if (!title) {
            const firstSentence = situationText.split('.')[0] || 'Student Experience';
            title = firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
          }
          if (!whatHappened) whatHappened = situationText;
          if (!excerpt) {
            excerpt = whatHappened.length > 120 ? whatHappened.substring(0, 120) + '...' : whatHappened;
          }

          let whatHelped = card.what_helped;
          if (Array.isArray(whatHelped)) {
            // Already array
          } else if (typeof whatHelped === 'string' && whatHelped.trim()) {
            whatHelped = whatHelped.split(/\s*;\s*|\n+/).filter(Boolean);
          } else {
            whatHelped = [];
          }

          return {
            id: card.id,
            title,
            category: card.category || 'General',
            excerpt,
            whatHappened,
            whatChanged: card.what_changed || '',
            whatHelped,
            whereIAmNow: card.where_i_am_now || '',
            tags: card.tags || [],
            similarity: card.similarity,
            relevanceLabel: (card.similarity > 0.45) ? 'Highly relevant' : 'Similar experience',
            readTime: '3 min read'
          };
        });

        return {
          matches,
          matchType: 'semantic_vector',
          modelUsed: this.MODEL_NAME,
          dimension: this.VECTOR_DIMENSION
        };
      }
    } catch (err) {
      // RPC fallback to persistent vector search
    }

    // 4. Perform Cosine Similarity Search over Persistent Vectors Store
    let rawCards = [];
    try {
      const { data: dbCards } = await supabase.from('experience_cards').select('*');
      if (dbCards && dbCards.length > 0) {
        rawCards = dbCards;
      }
    } catch (e) {}

    if (rawCards.length === 0) {
      rawCards = DEMO_EXPERIENCES.map((c, idx) => ({ ...c, id: `seed-exp-${idx + 1}` }));
    }

    const scoredList = [];

    for (let idx = 0; idx < rawCards.length; idx++) {
      const card = rawCards[idx];
      const cardId = card.id;
      let cardVector = experienceVectorsStore.get(cardId) || experienceVectorsStore.get(`seed-exp-${idx + 1}`);

      // If card vector missing in store, attempt to generate on-demand
      if (!cardVector) {
        const cardText = buildCardText(card);
        cardVector = await this.generateEmbedding(cardText);
        if (cardVector) {
          experienceVectorsStore.set(cardId, cardVector);
        }
      }

      if (!cardVector) continue;

      // Primary signal: Cosine similarity [0..1]
      const vectorSimilarity = dotProduct(queryVector, cardVector);

      // Secondary signals: Category match & Tag overlap
      let hybridScore = vectorSimilarity;
      if (category && card.category && card.category.toLowerCase() === category.toLowerCase()) {
        hybridScore += 0.15;
      }
      if (Array.isArray(card.tags) && Array.isArray(tags)) {
        const overlap = card.tags.filter(t => tags.includes(t)).length;
        hybridScore += overlap * 0.05;
      }

      scoredList.push({
        card,
        vectorSimilarity,
        hybridScore
      });
    }

    // Sort descending by hybrid score
    scoredList.sort((a, b) => b.hybridScore - a.hybridScore);

    // Filter by similarity threshold
    const topScored = scoredList.filter(item => item.vectorSimilarity >= minThreshold || (item.vectorSimilarity >= 0.20 && item.hybridScore >= 0.38));

    if (topScored.length === 0) {
      return {
        matches: [],
        matchType: 'no_match',
        message: 'No closely related experience found.'
      };
    }

    const matches = topScored.slice(0, topK).map(({ card, vectorSimilarity, hybridScore }) => {
      const relevanceLabel = (vectorSimilarity > 0.45 || hybridScore > 0.55) ? 'Highly relevant' : 'Similar experience';
      return {
        id: card.id,
        title: card.title || card.excerpt?.substring(0, 50) || 'Student Experience',
        category: card.category || 'General',
        excerpt: card.excerpt || card.what_happened || card.whatHappened || '',
        whatHappened: card.what_happened || card.whatHappened || '',
        whatChanged: card.what_changed || card.whatChanged || '',
        whatHelped: card.what_helped || card.whatHelped || [],
        whereIAmNow: card.where_i_am_now || card.whereIAmNow || '',
        tags: card.tags || [],
        relevanceLabel,
        readTime: card.readTime || '3 min read'
      };
    });

    return {
      matches,
      matchType: 'semantic_vector',
      modelUsed: this.MODEL_NAME,
      dimension: this.VECTOR_DIMENSION
    };
  }
}

module.exports = EmbeddingService;

