const { supabase } = require('../db/supabase');
const AuthService = require('./auth.service');
const { DEMO_EXPERIENCES } = require('../db/seedExperiences');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

// In-memory persistent data stores for conversations feature
const requestsStore = new Map();
const conversationsStore = new Map();
const messagesStore = new Map();
const blocksStore = new Set(); // Key: `${blockerUserId}:${blockedUserId}`
const reportsStore = new Map();

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

class ConversationsService {
  /**
   * Determine experience author and title given an experiencePostId
   */
  static async resolveExperienceDetails(userClient, experiencePostId) {
    const adminClient = supabase;
    const PostsService = require('./posts.service');
    if (PostsService.postsMemoryCache && PostsService.postsMemoryCache.has(experiencePostId)) {
      const cached = PostsService.postsMemoryCache.get(experiencePostId);
      return {
        authorUserId: cached.user_id || cached.anonymous_profile_id || 'demo_author_user_id',
        title: cached.content ? (cached.content.substring(0, 50) + (cached.content.length > 50 ? '...' : '')) : 'Student Reflection',
        category: cached.category || 'General'
      };
    }

    // 1. Try posts table
    try {
      const { data: post } = await adminClient
        .from('posts')
        .select('*')
        .eq('id', experiencePostId)
        .maybeSingle();

      if (post) {
        console.log('DEBUG resolveExperienceDetails post fetched:', { id: post.id, user_id: post.user_id, anonymous_profile_id: post.anonymous_profile_id });
        let authorUserId = post.user_id;
        if (!authorUserId && post.anonymous_profile_id) {
          const { data: profile } = await adminClient
            .from('anonymous_profiles')
            .select('*')
            .or(`id.eq.${post.anonymous_profile_id},user_id.eq.${post.anonymous_profile_id}`)
            .maybeSingle();
          if (profile) {
            authorUserId = profile.user_id || profile.user_uuid || profile.id;
          } else {
            authorUserId = post.anonymous_profile_id;
          }
        }

        return {
          authorUserId: authorUserId || 'demo_author_user_id',
          title: post.content ? (post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '')) : 'Student Reflection',
          category: post.category || 'General'
        };
      }
    } catch (e) {}

    // 2. Try experience_cards table
    try {
      const { data: exp } = await userClient
        .from('experience_cards')
        .select('*')
        .eq('id', experiencePostId)
        .maybeSingle();

      if (exp) {
        return {
          authorUserId: exp.created_by_user_id || 'demo_author_user_id',
          title: exp.title || exp.excerpt?.substring(0, 50) || 'Student Experience',
          category: exp.category || 'General'
        };
      }
    } catch (e) {}

    // 3. Fallback to seed experiences matching
    const seedIndex = parseInt(experiencePostId.replace(/^seed-exp-/, ''), 10);
    if (!isNaN(seedIndex) && DEMO_EXPERIENCES[seedIndex - 1]) {
      const demo = DEMO_EXPERIENCES[seedIndex - 1];
      return {
        authorUserId: `demo_user_${seedIndex}`,
        title: demo.title,
        category: demo.category
      };
    }

    // Default fallback
    return {
      authorUserId: 'demo_author_user_id',
      title: 'Student Experience Reflection',
      category: 'General'
    };
  }

  static isBlocked(userAId, userBId) {
    return blocksStore.has(`${userAId}:${userBId}`) || blocksStore.has(`${userBId}:${userAId}`);
  }

  static async createRequest(userClient, user, { experiencePostId, message }) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required to create a request');
    }

    const { authorUserId, title, category } = await this.resolveExperienceDetails(userClient, experiencePostId);
    console.log('DEBUG createRequest:', { requesterId: user.id, authorUserId, experiencePostId, title });

    // SECURITY RULE 1: No self conversations
    if (authorUserId === user.id) {
      throw new BadRequestError('You cannot request a private conversation with yourself');
    }

    // SECURITY RULE 2: Block check
    if (this.isBlocked(user.id, authorUserId)) {
      throw new ForbiddenError('Cannot send conversation request to this user');
    }

    // SECURITY RULE 3: Duplicate request check
    for (const req of requestsStore.values()) {
      if (
        req.experiencePostId === experiencePostId &&
        req.requesterUserId === user.id &&
        req.recipientUserId === authorUserId &&
        (req.status === 'pending' || req.status === 'accepted')
      ) {
        throw new BadRequestError('A conversation request or active conversation already exists for this experience');
      }
    }

    // Get requester profile
    const requesterProfile = await AuthService.getOrCreateAnonymousProfile(userClient, user.id);

    const requestId = generateId('req');
    const newRequest = {
      id: requestId,
      experiencePostId,
      experienceTitle: title,
      category,
      requesterUserId: user.id,
      recipientUserId: authorUserId,
      requesterDisplayName: requesterProfile.anonymousDisplayName || 'Anonymous Student',
      requesterAvatarKey: requesterProfile.avatarKey || 'owl',
      recipientDisplayName: 'Anonymous Author',
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    requestsStore.set(requestId, newRequest);
    console.log('DEBUG newRequest created in store:', newRequest);

    // Attempt DB insert if table exists
    try {
      await userClient.from('conversation_requests').insert({
        id: requestId,
        experience_post_id: experiencePostId,
        requester_user_id: user.id,
        recipient_user_id: authorUserId,
        message: message || '',
        status: 'pending',
        created_at: newRequest.createdAt
      });
    } catch (e) {}

    return {
      id: newRequest.id,
      experiencePostId: newRequest.experiencePostId,
      experienceTitle: newRequest.experienceTitle,
      requesterDisplayName: newRequest.requesterDisplayName,
      status: newRequest.status,
      message: newRequest.message,
      createdAt: newRequest.createdAt
    };
  }

  static async listUserRequests(userClient, user) {
    if (!user || !user.id) return [];

    const userProfile = await AuthService.getOrCreateAnonymousProfile(userClient, user.id);
    const userRequests = [];

    for (const req of requestsStore.values()) {
      if (req.requesterUserId === user.id || req.recipientUserId === user.id) {
        // Hide blocked user requests
        if (this.isBlocked(req.requesterUserId, req.recipientUserId)) {
          continue;
        }

        const isIncoming = req.recipientUserId === user.id;
        userRequests.push({
          id: req.id,
          experiencePostId: req.experiencePostId,
          experienceTitle: req.experienceTitle,
          category: req.category,
          isIncoming,
          otherUserDisplayName: isIncoming ? req.requesterDisplayName : req.recipientDisplayName,
          otherUserAvatarKey: isIncoming ? req.requesterAvatarKey : 'owl',
          message: req.message,
          status: req.status,
          createdAt: req.createdAt
        });
      }
    }

    return userRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async respondToRequest(userClient, user, requestId, status) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const request = requestsStore.get(requestId);
    if (!request) {
      throw new NotFoundError(`Request with ID '${requestId}' not found`);
    }

    // SECURITY RULE: Only recipient can accept/decline
    if (request.recipientUserId !== user.id) {
      throw new ForbiddenError('You are not authorized to respond to this request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestError(`Request has already been ${request.status}`);
    }

    const recipientProfile = await AuthService.getOrCreateAnonymousProfile(userClient, user.id);
    request.recipientDisplayName = recipientProfile.anonymousDisplayName || 'Anonymous Peer';
    request.recipientAvatarKey = recipientProfile.avatarKey || 'owl';
    request.status = status;
    request.updatedAt = new Date().toISOString();

    let createdConversation = null;

    if (status === 'accepted') {
      const conversationId = generateId('conv');
      createdConversation = {
        id: conversationId,
        requestId: request.id,
        experiencePostId: request.experiencePostId,
        experienceTitle: request.experienceTitle,
        participantUserIds: [request.requesterUserId, request.recipientUserId],
        participantProfiles: {
          [request.requesterUserId]: {
            displayName: request.requesterDisplayName,
            avatarKey: request.requesterAvatarKey
          },
          [request.recipientUserId]: {
            displayName: request.recipientDisplayName,
            avatarKey: request.recipientAvatarKey
          }
        },
        status: 'active',
        createdAt: new Date().toISOString(),
        endedAt: null
      };

      conversationsStore.set(conversationId, createdConversation);
      messagesStore.set(conversationId, []);

      // If request came with a initial message, convert to first chat message
      if (request.message && request.message.trim()) {
        const msgId = generateId('msg');
        messagesStore.get(conversationId).push({
          id: msgId,
          conversationId,
          senderUserId: request.requesterUserId,
          senderDisplayName: request.requesterDisplayName,
          senderAvatarKey: request.requesterAvatarKey,
          content: request.message,
          createdAt: request.createdAt
        });
      }

      // Attempt DB inserts
      try {
        await userClient.from('conversations').insert({
          id: conversationId,
          request_id: request.id,
          status: 'active',
          created_at: createdConversation.createdAt
        });
      } catch (e) {}
    }

    return {
      requestId: request.id,
      status: request.status,
      conversationId: createdConversation ? createdConversation.id : null
    };
  }

  static async listUserConversations(userClient, user) {
    if (!user || !user.id) return [];

    const userConversations = [];

    for (const conv of conversationsStore.values()) {
      if (conv.participantUserIds.includes(user.id)) {
        const otherUserId = conv.participantUserIds.find(id => id !== user.id);
        const otherProfile = conv.participantProfiles[otherUserId] || { displayName: 'Anonymous Peer', avatarKey: 'owl' };
        const convMessages = messagesStore.get(conv.id) || [];
        const lastMessage = convMessages.length > 0 ? convMessages[convMessages.length - 1] : null;

        userConversations.push({
          id: conv.id,
          experienceTitle: conv.experienceTitle,
          otherUserDisplayName: otherProfile.displayName,
          otherUserAvatarKey: otherProfile.avatarKey,
          status: conv.status,
          createdAt: conv.createdAt,
          endedAt: conv.endedAt,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            isSelf: lastMessage.senderUserId === user.id
          } : null
        });
      }
    }

    return userConversations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async getConversationDetails(userClient, user, conversationId) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const conv = conversationsStore.get(conversationId);
    
    // SECURITY RULE: IDOR Protection (404 if not participant)
    if (!conv || !conv.participantUserIds.includes(user.id)) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const otherUserId = conv.participantUserIds.find(id => id !== user.id);
    const selfProfile = conv.participantProfiles[user.id] || { displayName: 'You', avatarKey: 'owl' };
    const otherProfile = conv.participantProfiles[otherUserId] || { displayName: 'Anonymous Peer', avatarKey: 'owl' };
    
    const convMessages = messagesStore.get(conversationId) || [];
    const formattedMessages = convMessages.map(m => ({
      id: m.id,
      senderDisplayName: m.senderDisplayName,
      senderAvatarKey: m.senderAvatarKey,
      content: m.content,
      createdAt: m.createdAt,
      isSelf: m.senderUserId === user.id
    }));

    return {
      id: conv.id,
      experienceTitle: conv.experienceTitle,
      selfDisplayName: selfProfile.displayName,
      otherUserDisplayName: otherProfile.displayName,
      otherUserAvatarKey: otherProfile.avatarKey,
      status: conv.status,
      createdAt: conv.createdAt,
      endedAt: conv.endedAt,
      messages: formattedMessages
    };
  }

  static async sendMessage(userClient, user, conversationId, content) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const conv = conversationsStore.get(conversationId);

    // SECURITY RULE: IDOR Protection
    if (!conv || !conv.participantUserIds.includes(user.id)) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    // SECURITY RULE: Cannot message if conversation is not active
    if (conv.status !== 'active') {
      throw new BadRequestError(`Cannot send message to an ${conv.status} conversation`);
    }

    // SECURITY RULE: Cannot message if block exists
    const otherUserId = conv.participantUserIds.find(id => id !== user.id);
    if (this.isBlocked(user.id, otherUserId)) {
      throw new ForbiddenError('Cannot send message due to block');
    }

    const senderProfile = conv.participantProfiles[user.id] || (await AuthService.getOrCreateAnonymousProfile(userClient, user.id));

    const msgId = generateId('msg');
    const newMsg = {
      id: msgId,
      conversationId,
      senderUserId: user.id,
      senderDisplayName: senderProfile.anonymousDisplayName || senderProfile.displayName || 'Anonymous Student',
      senderAvatarKey: senderProfile.avatarKey || 'owl',
      content,
      createdAt: new Date().toISOString()
    };

    if (!messagesStore.has(conversationId)) {
      messagesStore.set(conversationId, []);
    }
    messagesStore.get(conversationId).push(newMsg);

    // AI SAFETY FEATURE 3: Silent safety check on private messages
    try {
      const AiService = require('./ai.service');
      AiService.checkMessageSafety(content).then(safety => {
        if (safety.requires_human_review || safety.risk === 'high') {
          console.warn('⚠️ [AI Safety Flag on Private Message]', { conversationId, flags: safety.flags });
          userClient.from('reports').insert({
            reporter_id: 'system_ai_safety',
            target_id: conversationId,
            target_type: 'conversation',
            reason: `AI Message Safety Flag: ${safety.flags.join(', ') || 'High Risk'}`,
            details: `Message content: "${content.substring(0, 200)}"`,
            status: 'pending',
            created_at: new Date().toISOString()
          }).then(() => {}).catch(() => {});
        }
      }).catch(() => {});
    } catch (e) {}

    // Attempt DB insert
    try {
      await userClient.from('messages').insert({
        id: msgId,
        conversation_id: conversationId,
        sender_user_id: user.id,
        content,
        created_at: newMsg.createdAt
      });
    } catch (e) {}

    return {
      id: newMsg.id,
      conversationId: newMsg.conversationId,
      senderDisplayName: newMsg.senderDisplayName,
      content: newMsg.content,
      createdAt: newMsg.createdAt,
      isSelf: true
    };
  }

  static async endConversation(userClient, user, conversationId) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const conv = conversationsStore.get(conversationId);
    if (!conv || !conv.participantUserIds.includes(user.id)) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    if (conv.status === 'ended') {
      return { id: conv.id, status: 'ended', endedAt: conv.endedAt };
    }

    conv.status = 'ended';
    conv.endedAt = new Date().toISOString();

    try {
      await userClient.from('conversations').update({
        status: 'ended',
        ended_at: conv.endedAt
      }).eq('id', conversationId);
    } catch (e) {}

    return {
      id: conv.id,
      status: 'ended',
      endedAt: conv.endedAt
    };
  }

  static async blockUserInConversation(userClient, user, conversationId) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const conv = conversationsStore.get(conversationId);
    if (!conv || !conv.participantUserIds.includes(user.id)) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const otherUserId = conv.participantUserIds.find(id => id !== user.id);

    // Register block
    blocksStore.add(`${user.id}:${otherUserId}`);

    conv.status = 'blocked';
    conv.endedAt = conv.endedAt || new Date().toISOString();

    try {
      await userClient.from('blocked_users').insert({
        blocker_user_id: user.id,
        blocked_user_id: otherUserId,
        created_at: new Date().toISOString()
      });
    } catch (e) {}

    return {
      id: conv.id,
      status: 'blocked',
      message: 'User has been blocked successfully'
    };
  }

  static async reportUserInConversation(userClient, user, conversationId, { reason, details }) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const conv = conversationsStore.get(conversationId);
    if (!conv || !conv.participantUserIds.includes(user.id)) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const reportedUserId = conv.participantUserIds.find(id => id !== user.id);

    const reportId = generateId('rep');
    const reportObj = {
      id: reportId,
      reporterUserId: user.id,
      reportedUserId,
      conversationId,
      reason,
      details: details || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    reportsStore.set(reportId, reportObj);

    // Reuse existing reports table if compatible
    try {
      await userClient.from('reports').insert({
        reporter_id: user.id,
        target_id: conversationId,
        target_type: 'conversation',
        reason,
        details: details || '',
        status: 'pending',
        created_at: reportObj.createdAt
      });
    } catch (e) {}

    return {
      reportId: reportObj.id,
      message: 'Report submitted quietly for human moderator review.'
    };
  }
}

module.exports = ConversationsService;
