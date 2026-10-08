const crypto = require('crypto');
const { ChatGroq } = require('@langchain/groq');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
const { env } = require('../config/env');
const { supabase } = require('../db/supabase');
const { DEMO_EXPERIENCES } = require('../db/seedExperiences');
const {
  CANONICAL_CATEGORIES,
  SAFETY_FLAG_TYPES,
  aiAnalysisSchema,
  extractExperienceSchema
} = require('../schemas/ai.schema');
const { AppError } = require('../utils/errors');

// In-memory persistent data store for AI analyses and cache
const aiAnalysesStore = new Map();
const analysisCache = new Map();

function generateContentHash(content, categoryHint = '') {
  const normalized = `${content.trim()}::${(categoryHint || '').trim()}`.toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function normalizeCategory(cat) {
  if (!cat) return 'Academic';
  const c = cat.trim();
  if (CANONICAL_CATEGORIES.includes(c)) return c;

  const lower = c.toLowerCase();
  if (lower.includes('academic') || lower.includes('study') || lower.includes('exam') || lower.includes('grade')) return 'Academic';
  if (lower.includes('career') || lower.includes('job') || lower.includes('interview')) return 'Career';
  if (lower.includes('college') || lower.includes('campus') || lower.includes('dorm')) return 'College Life';
  if (lower.includes('social') || lower.includes('communication') || lower.includes('friend')) return 'Social / Communication';
  if (lower.includes('relation') || lower.includes('dating') || lower.includes('partner')) return 'Relationships';
  if (lower.includes('mental') || lower.includes('wellbeing') || lower.includes('anxiety') || lower.includes('depress')) return 'Mental Wellbeing';
  
  return 'Other';
}

function detectSafetyFlags(text) {
  const lower = text.toLowerCase();
  const flags = [];
  let risk = 'low';
  let requires_human_review = false;

  // 1. Self harm indicators
  if (
    lower.includes('suicide') ||
    lower.includes('end my life') ||
    lower.includes('self harm') ||
    lower.includes('want to die') ||
    lower.includes('overdose') ||
    lower.includes('cut myself')
  ) {
    flags.push('self_harm_signal');
    risk = 'high';
    requires_human_review = true;
  }

  // 2. Urgent safety concern
  if (
    lower.includes('in danger') ||
    lower.includes('immediate crisis') ||
    lower.includes('cannot go on') ||
    lower.includes('emergency')
  ) {
    flags.push('urgent_safety_concern');
    if (risk !== 'high') risk = 'medium';
  }

  // 3. Harassment / Threats
  if (
    lower.includes('kill you') ||
    lower.includes('beat you') ||
    lower.includes('hate you') ||
    lower.includes('threaten')
  ) {
    flags.push('threat');
    flags.push('harassment');
    risk = 'high';
    requires_human_review = true;
  }

  // 4. Personal Information leakage
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (phoneRegex.test(text) || emailRegex.test(text) || lower.includes('@instagram') || lower.includes('whatsapp')) {
    flags.push('personal_information');
    if (risk === 'low') risk = 'medium';
  }

  return { risk, flags, requires_human_review };
}

function generateHeuristicAnalysis(content, categoryHint = 'Academic') {
  const text = content.trim();
  const category = normalizeCategory(categoryHint);

  const firstSentence = text.split(/[.!?\n]/).filter(Boolean)[0] || text;
  const situation = firstSentence.length > 90 ? firstSentence.slice(0, 87) + '...' : firstSentence;

  let need = 'Practical strategies and peer perspectives from students who have been there.';
  const lower = text.toLowerCase();
  if (lower.includes('scared') || lower.includes('panic') || lower.includes('fail')) {
    need = 'Reassurance and practical strategies for handling pressure';
  } else if (lower.includes('lonely') || lower.includes('friend')) {
    need = 'Peer connection and belonging';
  }

  const tags = [];
  if (lower.includes('coding') || lower.includes('dsa')) tags.push('DSA', 'coding');
  if (lower.includes('exam') || lower.includes('test')) tags.push('assessment anxiety', 'exams');
  if (lower.includes('confidence')) tags.push('confidence');
  if (tags.length < 2) tags.push(category, 'peer support');

  const context = lower.includes('coding') || lower.includes('dsa')
    ? 'College coding assessments'
    : `${category} challenges`;

  const safety = detectSafetyFlags(text);

  return {
    category,
    situation,
    need,
    context,
    tags: tags.slice(0, 4),
    risk: safety.risk,
    flags: safety.flags,
    requires_human_review: safety.requires_human_review,
    source: 'fallback',
    model: null
  };
}

// Tokenize text into normalized word n-grams for semantic vector similarity calculation
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function computeCosineSimilarity(vecA, vecB) {
  const allWords = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const word of allWords) {
    const valA = vecA[word] || 0;
    const valB = vecB[word] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class AiService {
  static getGroqModel() {
    const apiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    const modelName = env.GROQ_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    return new ChatGroq({
      apiKey: apiKey,
      model: modelName,
      temperature: 0.2,
      maxTokens: 500,
    });
  }

  /**
   * AI FEATURE 1: 🧠 UNDERSTAND THE PROBLEM
   * Unified AI Understanding & Safety Analysis
   */
  static async analyzeReflection({ content, categoryHint, topic, postId = null }) {
    if (!content || !content.trim()) {
      throw new AppError('Content is required for AI analysis', 400, 'VALIDATION_ERROR');
    }

    const hint = categoryHint || topic || '';
    const hash = generateContentHash(content, hint);

    // CACHE CHECK: Prevent duplicate AI API calls
    if (analysisCache.has(hash)) {
      const cached = analysisCache.get(hash);
      console.log(`⚡ [AI Cache Hit] provider: ${cached.source} | model: ${cached.model || 'none'}`);
      return cached;
    }

    const provider = env.AI_PROVIDER || 'groq';
    const apiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
    const modelName = env.GROQ_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    let result = null;

    if (!apiKey) {
      console.warn('⚠️ GROQ_API_KEY is missing. Using heuristic fallback.');
      result = generateHeuristicAnalysis(content, hint);
    } else {
      console.log(`🤖 AI provider: ${provider} | AI model: ${modelName} | cache hit: false`);

      const systemPrompt = `You analyze student peer-support reflections.

Allowed Categories (MUST pick exactly one):
- Academic
- Career
- College Life
- Social / Communication
- Relationships
- Mental Wellbeing
- Other

Safety Rules:
- Do NOT act as a therapist.
- Do NOT issue medical diagnoses.
- Do NOT generate fake experiences or advice.

Extract:
1. category (exactly one of the allowed categories)
2. situation (one concise sentence describing the problem)
3. need (practical support/reassurance/strategy the student seeks)
4. context (academic or life context e.g. "College coding assessments")
5. tags (2 to 5 short tags without hash symbols)
6. risk (low, medium, or high)
7. flags (array of strings: harassment, threat, dangerous_advice, self_harm_signal, personal_information, urgent_safety_concern)
8. requires_human_review (true if severe safety concern exists)`;

      const userPrompt = `Student reflection: "${content.trim()}"${hint ? `\nCategory hint: "${hint}"` : ''}`;

      try {
        const model = this.getGroqModel();
        const structuredLlm = model.withStructuredOutput(aiAnalysisSchema);

        const response = await structuredLlm.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(userPrompt)
        ]);

        if (response && response.situation) {
          const safety = detectSafetyFlags(content);
          const mergedFlags = Array.from(new Set([...(response.flags || []), ...safety.flags]));
          const isHighRisk = response.risk === 'high' || safety.risk === 'high';

          result = {
            category: normalizeCategory(response.category || hint),
            situation: response.situation,
            need: response.need || 'Practical peer support',
            context: response.context || 'College student experience',
            tags: Array.isArray(response.tags) && response.tags.length > 0
              ? response.tags.map(t => t.replace(/^#/, ''))
              : ['Academic', 'peer support'],
            risk: isHighRisk ? 'high' : response.risk || 'low',
            flags: mergedFlags,
            requires_human_review: response.requires_human_review || safety.requires_human_review || isHighRisk,
            source: 'groq',
            model: modelName
          };
        }
      } catch (err) {
        console.error(`[Groq AI Error] Request to ${modelName} failed:`, err.message);
      }

      if (!result) {
        result = generateHeuristicAnalysis(content, hint);
      }
    }

    analysisCache.set(hash, result);

    // AI OUTPUT PERSISTENCE: Save persistent record in memory & database table `ai_analyses`
    const analysisId = `ai_analysis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const persistentRecord = {
      id: analysisId,
      post_id: postId,
      category: result.category,
      situation: result.situation,
      need: result.need,
      context: result.context,
      tags: result.tags,
      risk_level: result.risk,
      safety_flags: result.flags,
      requires_human_review: result.requires_human_review,
      model: result.model || 'heuristic',
      provider: result.source || 'fallback',
      created_at: new Date().toISOString()
    };

    aiAnalysesStore.set(analysisId, persistentRecord);

    // Quietly record moderation alert if human review required
    if (result.requires_human_review) {
      try {
        await supabase.from('reports').insert({
          reporter_id: 'system_ai_safety',
          target_id: postId || analysisId,
          target_type: 'post',
          reason: `AI Safety Flag: ${result.flags.join(', ') || 'High Risk'}`,
          details: `Content: "${content.substring(0, 200)}"`,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      } catch (e) {}
    }

    // Persist to DB table `ai_analyses` if table exists
    try {
      await supabase.from('ai_analyses').insert(persistentRecord);
    } catch (e) {}

    return result;
  }

  /**
   * AI FEATURE 2: 🤝 UNIFIED SEMANTIC MATCHING
   * 1. Finds the most relevant Canonical Experience Card (institutional guidance)
   * 2. Finds semantically similar real Student Posts (peer reflections for 1-to-1 connection)
   */
  static async matchExperiences({ content, category, tags = [], excludePostId = null, topK = 5, userClient = supabase }) {
    if (!content || !content.trim()) {
      return {
        canonicalExperience: null,
        studentPosts: [],
        hasCanonicalMatch: false,
        hasStudentMatch: false,
        matches: [],
        matchType: 'no_match'
      };
    }

    const EmbeddingService = require('./embedding.service');
    let queryVector = null;
    try {
      queryVector = await EmbeddingService.generateEmbedding(content);
    } catch (e) {
      console.warn('Query embedding generation warning:', e.message);
    }

    // 1. SEARCH CANONICAL EXPERIENCE CARDS (Institutional Guidance)
    let canonicalExperience = null;
    try {
      const canonicalResult = await EmbeddingService.searchSemanticMatches({
        queryText: content,
        category,
        tags,
        topK: 1,
        minThreshold: 0.22
      });

      if (canonicalResult && Array.isArray(canonicalResult.matches) && canonicalResult.matches.length > 0) {
        canonicalExperience = canonicalResult.matches[0];
      }
    } catch (err) {
      console.warn('Canonical match error:', err.message);
    }

    // 2. SEARCH REAL STUDENT POSTS (Authentic Peer Reflections)
    let studentPosts = [];
    try {
      const postsResult = await EmbeddingService.searchSemanticPosts({
        queryText: content,
        queryVector,
        category,
        tags,
        excludePostId,
        topK: 3,
        minThreshold: 0.25,
        userClient
      });

      if (postsResult && Array.isArray(postsResult.matches)) {
        studentPosts = postsResult.matches;
      }
    } catch (err) {
      console.warn('Student posts match error:', err.message);
    }

    return {
      canonicalExperience,
      studentPosts,
      hasCanonicalMatch: !!canonicalExperience,
      hasStudentMatch: studentPosts.length > 0,
      matches: canonicalExperience ? [canonicalExperience] : [],
      matchType: 'unified_semantic_match'
    };
  }

  /**
   * AI FEATURE 3: 🛡️ SAFETY AI FOR PRIVATE MESSAGES
   */
  static async checkMessageSafety(content) {
    const safety = detectSafetyFlags(content);
    return {
      isSafe: !safety.requires_human_review && safety.risk !== 'high',
      risk: safety.risk,
      flags: safety.flags,
      requires_human_review: safety.requires_human_review
    };
  }

  static async extractExperience({ content, responses = [], category, tags = [] }) {
    if (!content || !content.trim()) {
      throw new AppError('Content is required for experience extraction', 400, 'VALIDATION_ERROR');
    }

    const apiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
    const modelName = env.GROQ_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    if (!apiKey) {
      return {
        situation: content.slice(0, 100),
        whatTheyTried: 'Not specified',
        whatHelped: responses.length > 0 ? responses[0].slice(0, 100) : 'Peer connection',
        outcome: 'Shared with community',
        tags: tags.length > 0 ? tags : [category || 'General'],
        source: 'fallback',
        model: null
      };
    }

    const systemPrompt = `You extract structured information from a real student reflection for an Experience Card.
DO NOT invent student stories, identity, quotes, or outcomes.
If information is missing, return "Not specified".`;

    const userPrompt = `Student Reflection: "${content.trim()}"\nResponses: ${responses.join(', ')}\nCategory: ${category || 'General'}`;

    try {
      const model = this.getGroqModel();
      const structuredLlm = model.withStructuredOutput(extractExperienceSchema);

      const response = await structuredLlm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ]);

      return {
        situation: response.situation || content.slice(0, 100),
        whatTheyTried: response.whatTheyTried || 'Not specified',
        whatHelped: response.whatHelped || 'Not specified',
        outcome: response.outcome || 'Not specified',
        tags: Array.isArray(response.tags) && response.tags.length > 0 ? response.tags : tags,
        source: 'groq',
        model: modelName
      };
    } catch (err) {
      return {
        situation: content.slice(0, 100),
        whatTheyTried: 'Not specified',
        whatHelped: responses.length > 0 ? responses[0].slice(0, 100) : 'Peer connection',
        outcome: 'Shared with community',
        tags: tags.length > 0 ? tags : [category || 'General'],
        source: 'fallback',
        model: null
      };
    }
  }
}

module.exports = AiService;
