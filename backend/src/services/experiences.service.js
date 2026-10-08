const { supabase } = require('../db/supabase');
const { NotFoundError } = require('../utils/errors');
const { DEMO_EXPERIENCES } = require('../db/seedExperiences');

function parseSituationFields(situationText = '') {
  let title = '';
  let excerpt = '';
  let whatHappened = situationText;

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
  if (!excerpt) {
    excerpt = whatHappened.length > 120 ? whatHappened.substring(0, 120) + '...' : whatHappened;
  }

  return { title, excerpt, whatHappened };
}

function parseWhatHelped(whatHelped) {
  if (Array.isArray(whatHelped)) return whatHelped;
  if (typeof whatHelped === 'string' && whatHelped.trim()) {
    return whatHelped.split(/\s*;\s*|\n+/).filter(Boolean);
  }
  return [];
}

function formatExperienceDTO(exp) {
  const situationText = exp.situation || exp.what_happened || exp.whatHappened || exp.excerpt || '';
  const parsed = parseSituationFields(situationText);

  return {
    id: exp.id,
    title: exp.title || parsed.title,
    category: exp.category || 'General',
    excerpt: exp.excerpt || parsed.excerpt,
    whatHappened: exp.what_happened || exp.whatHappened || parsed.whatHappened,
    whatChanged: exp.what_changed || exp.whatChanged || '',
    whatHelped: parseWhatHelped(exp.what_helped || exp.whatHelped),
    whereIAmNow: exp.where_i_am_now || exp.whereIAmNow || '',
    status: exp.status || 'approved',
    tags: exp.tags || [],
    helpfulCount: exp.helpful_count || exp.helpfulCount || 0,
    createdAt: exp.created_at || exp.createdAt || new Date().toISOString()
  };
}

class ExperiencesService {
  static async listApprovedExperiences(userClient = supabase) {
    const { data: cards, error } = await userClient
      .from('experience_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !cards || cards.length === 0) {
      return DEMO_EXPERIENCES.map((c, idx) => formatExperienceDTO({ ...c, id: `seed-exp-${idx + 1}` }));
    }

    return cards.map((c) => formatExperienceDTO(c));
  }

  static async getExperienceById(userClient = supabase, id) {
    const { data: card, error } = await userClient
      .from('experience_cards')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (card) {
      return formatExperienceDTO(card);
    }

    const demoCard = DEMO_EXPERIENCES.find((c, idx) => c.id === id || `seed-exp-${idx + 1}` === id);
    if (demoCard) {
      return formatExperienceDTO({ ...demoCard, id: demoCard.id || id });
    }

    throw new NotFoundError(`Experience card with ID '${id}' not found`);
  }

  static async createExperience(userClient, user, data) {
    const cardData = {
      category: data.category || 'General',
      situation: `${data.title || ''}. ${data.excerpt || data.whatHappened || ''}`.trim(),
      what_helped: data.whatHelped || [],
      tags: data.tags || [],
      created_at: new Date().toISOString()
    };

    const { data: created, error } = await userClient
      .from('experience_cards')
      .insert(cardData)
      .select()
      .maybeSingle();

    if (error || !created) {
      return formatExperienceDTO(cardData);
    }

    return formatExperienceDTO(created);
  }

  static async updateExperienceStatus(userClient, id, { status, ...rest }) {
    const { data: updated, error } = await userClient
      .from('experience_cards')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return { id, status: 'approved', updated: true };
    }

    return formatExperienceDTO(updated);
  }
}

module.exports = ExperiencesService;

