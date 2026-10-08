/**
 * Data mapping utilities cleanly separating:
 * 1. Canonical Experience Cards (Curated institutional peer guidance)
 * 2. Student Posts (Individual authentic anonymous reflections)
 */

export function mapExperienceToUI(item) {
  if (!item) return null;

  const id = item.id || `exp-${Math.random().toString(36).substring(2, 7)}`;
  const title = item.title || item.excerpt || 'Curated Student Experience';
  const categoryLabel = item.category || item.categoryLabel || 'General';
  
  const excerpt = item.excerpt || item.situation || item.whatHappened || item.what_happened || '';
  const whatHappened = item.whatHappened || item.what_happened || excerpt || '';
  const whatChanged = item.whatChanged || item.what_changed || '';
  
  let whatHelped = item.whatHelped || item.what_helped || [];
  if (typeof whatHelped === 'string') {
    whatHelped = whatHelped.split(/\s*;\s*|\n+/).filter(Boolean);
  } else if (!Array.isArray(whatHelped)) {
    whatHelped = [];
  }

  const whereIAmNow = item.whereIAmNow || item.where_i_am_now || '';
  const tags = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : [categoryLabel];
  const helpfulCount = typeof item.helpfulCount === 'number' ? item.helpfulCount : 12;

  return {
    id,
    title,
    categoryLabel,
    category: categoryLabel,
    tags,
    author: 'Curated Peer Guidance',
    context: 'BeenThere Collective',
    excerpt,
    openingQuote: title,
    whatHappened,
    whatChanged,
    whatHelped,
    whereIAmNow,
    helpfulCount,
    readTime: item.readTime || '3 min read',
    timeAgo: 'Curated knowledge',
    createdAt: item.createdAt || new Date().toISOString(),
    isCanonicalCard: true
  };
}

export function mapPostToUI(post) {
  if (!post) return null;

  const id = post.id || `post-${Math.random().toString(36).substring(2, 7)}`;
  const content = post.content || '';
  const categoryLabel = post.category || 'General';
  const author = post.anonymousDisplayName || post.author || post.anonymous_profiles?.display_name || 'Anonymous Student';
  const avatarKey = post.avatarKey || post.anonymous_profiles?.avatar_key || 'owl';
  const avatar = avatarKey === 'moon' ? '🌙' : avatarKey === 'star' ? '⭐' : avatarKey === 'panda' ? '🐼' : '🦉';
  const timeAgo = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recently';

  return {
    id,
    content,
    title: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
    excerpt: content,
    openingQuote: content,
    categoryLabel,
    category: categoryLabel,
    tags: Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [categoryLabel],
    author,
    anonymousDisplayName: author,
    avatarKey,
    anonymousAvatar: avatar,
    context: 'College student',
    status: post.status || 'approved',
    similarity: post.similarity,
    relevanceLabel: post.relevanceLabel,
    timeAgo,
    createdAt: post.createdAt || post.created_at || new Date().toISOString(),
    isPost: true
  };
}
