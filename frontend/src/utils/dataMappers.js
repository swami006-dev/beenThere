/**
 * Data mapping utilities to bridge backend API response schemas with existing frontend UI component expectations.
 */

export function mapExperienceToUI(item) {
  if (!item) return null;

  const id = item.id || `exp-${Math.random().toString(36).substring(2, 7)}`;
  const title = item.title || item.excerpt || 'Anonymous Reflection';
  const categoryLabel = item.category || item.categoryLabel || 'General Support';
  
  const excerpt = item.excerpt || item.content || '';
  const whatHappened = item.whatHappened || item.what_happened || item.content || excerpt || 'Sharing an experience with the community.';
  const whatChanged = item.whatChanged || item.what_changed || 'Reflecting on the steps taken and small mindset shifts over time.';
  
  let whatHelped = item.whatHelped || item.what_helped || ['Talking to peers who understand', 'Taking things one day at a time'];
  if (typeof whatHelped === 'string') {
    whatHelped = [whatHelped];
  }

  const whereIAmNow = item.whereIAmNow || item.where_i_am_now || 'Still learning, but feeling much more grounded.';
  const tags = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : [categoryLabel];
  const author = item.anonymousDisplayName || item.author || 'Anonymous Peer';
  const context = item.academicContext || item.context || 'Student Reflection';
  const helpfulCount = typeof item.helpfulCount === 'number' ? item.helpfulCount : 12;

  return {
    id,
    title,
    categoryLabel,
    category: categoryLabel,
    tags,
    author,
    context,
    excerpt,
    openingQuote: title,
    whatHappened,
    whatChanged,
    whatHelped,
    whereIAmNow,
    helpfulCount,
    readTime: '3 min read',
    timeAgo: 'Recently shared',
    createdAt: item.createdAt || new Date().toISOString()
  };
}

export function mapPostToUI(post) {
  if (!post) return null;

  const id = post.id || `post-${Math.random().toString(36).substring(2, 7)}`;
  const content = post.content || '';
  const categoryLabel = post.category || 'General';
  const author = post.anonymousDisplayName || post.author || 'Anonymous Student';
  const avatar = post.avatarKey ? (post.avatarKey === 'moon' ? '🌙' : post.avatarKey === 'star' ? '⭐' : '🦉') : '🦉';
  const timeAgo = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Just now';

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
    anonymousAvatar: avatar,
    context: post.academicContext || 'Student',
    whatHappened: content,
    whatChanged: 'Gained perspective by opening up.',
    whatHelped: ['Reaching out', 'Peer connection'],
    whereIAmNow: 'Processing step by step.',
    status: post.status || 'approved',
    helpfulCount: 0,
    readTime: '2 min read',
    timeAgo,
    createdAt: post.createdAt || new Date().toISOString()
  };
}
