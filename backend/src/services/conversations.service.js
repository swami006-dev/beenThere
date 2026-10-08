const { randomUUID } = require('crypto');
const { supabase } = require('../db/supabase');
const AuthService = require('./auth.service');
const ProfilesStore = require('./profiles.store');
const ConversationsStore = require('./conversations.store');
const { DEMO_EXPERIENCES } = require('../db/seedExperiences');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

class ConversationsService {
  /**
   * Determine experience author and title given an experiencePostId
   */
  static async resolveExperienceDetails(userClient, experiencePostId) {
    // 1. Check ProfilesStore metadata first
    const meta = ProfilesStore.getPostMeta(experiencePostId);
    if (meta) {
      let authorUserId = meta.authorUserId;
      if (!authorUserId && meta.authorAnonymousProfileId) {
        const prof = ProfilesStore.getProfile(meta.authorAnonymousProfileId);
        if (prof?.userId) authorUserId = prof.userId;
      }
      return {
        authorUserId: authorUserId || null,
        authorAnonymousProfileId: meta.authorAnonymousProfileId || null,
        title: meta.title || 'Student Reflection',
        category: meta.category || 'General',
        isCanonical: false
      };
    }

    // 2. Try posts table with userClient or adminClient
    try {
      const client = userClient || supabase;
      const { data: post } = await client
        .from('posts')
        .select('*')
        .eq('id', experiencePostId)
        .maybeSingle();

      if (post) {
        let authorUserId = null;
        let authorAnonymousProfileId = post.anonymous_profile_id;

        if (post.anonymous_profile_id) {
          const profile = ProfilesStore.getProfile(post.anonymous_profile_id);
          if (profile?.userId) {
            authorUserId = profile.userId;
          } else {
            const { data: dbProf } = await client
              .from('anonymous_profiles')
              .select('id, user_id')
              .eq('id', post.anonymous_profile_id)
              .maybeSingle();
            if (dbProf?.user_id) {
              authorUserId = dbProf.user_id;
            }
          }
        }

        const title = post.content ? (post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '')) : 'Student Reflection';
        return {
          authorUserId: authorUserId || null,
          authorAnonymousProfileId: authorAnonymousProfileId || null,
          title,
          category: post.category || 'General',
          isCanonical: false
        };
      }
    } catch (e) {
      console.warn('resolveExperienceDetails posts query warning:', e.message);
    }

    // 3. Try PostsService memory cache
    const PostsService = require('./posts.service');
    if (PostsService.postsMemoryCache && PostsService.postsMemoryCache.has(experiencePostId)) {
      const post = PostsService.postsMemoryCache.get(experiencePostId);
      let authorUserId = null;
      if (post.anonymous_profile_id) {
        const profile = ProfilesStore.getProfile(post.anonymous_profile_id);
        if (profile?.userId) authorUserId = profile.userId;
      }
      return {
        authorUserId,
        authorAnonymousProfileId: post.anonymous_profile_id || null,
        title: post.content ? (post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '')) : 'Student Reflection',
        category: post.category || 'General',
        isCanonical: false
      };
    }

    // 4. Try experience_cards table
    try {
      const { data: exp } = await supabase
        .from('experience_cards')
        .select('*')
        .eq('id', experiencePostId)
        .maybeSingle();

      if (exp) {
        const expTitle = exp.situation
          ? (exp.situation.split('. Situation:')[0].replace(/^Title:\s*/, '') || exp.situation.substring(0, 60))
          : 'Student Experience';

        return {
          authorUserId: null,
          authorAnonymousProfileId: null,
          title: expTitle,
          category: exp.category || 'General',
          isCanonical: true
        };
      }
    } catch (e) {
      console.warn('resolveExperienceDetails experience_cards query warning:', e.message);
    }

    // 5. Fallback for demo seed indices
    const seedIndex = parseInt(String(experiencePostId).replace(/^seed-exp-/, ''), 10);
    if (!isNaN(seedIndex) && DEMO_EXPERIENCES[seedIndex - 1]) {
      const demo = DEMO_EXPERIENCES[seedIndex - 1];
      return {
        authorUserId: null,
        authorAnonymousProfileId: null,
        title: demo.title,
        category: demo.category,
        isCanonical: true
      };
    }

    return {
      authorUserId: null,
      authorAnonymousProfileId: null,
      title: 'Student Experience Reflection',
      category: 'General',
      isCanonical: true
    };
  }

  static async isBlocked(userClient, userAId, userBId) {
    if (!userAId || !userBId) return false;
    try {
      const { data } = await userClient
        .from('blocked_users')
        .select('id')
        .or(`and(blocker_user_id.eq.${userAId},blocked_user_id.eq.${userBId}),and(blocker_user_id.eq.${userBId},blocked_user_id.eq.${userAId})`)
        .limit(1);

      return Array.isArray(data) && data.length > 0;
    } catch (e) {
      return false;
    }
  }

  static async createRequest(userClient, user, { experiencePostId, message }) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required to create a request');
    }

    const { authorUserId, authorAnonymousProfileId, title, category, isCanonical } = await this.resolveExperienceDetails(userClient, experiencePostId);

    if (isCanonical) {
      throw new BadRequestError('This experience was shared canonically and does not currently have a direct student author available for 1-to-1 chat.');
    }

    if (!authorUserId) {
      throw new BadRequestError('The author of this student reflection is currently unavailable for 1-to-1 chat.');
    }

    // SECURITY RULE 1: No self conversations
    if (authorUserId === user.id) {
      throw new BadRequestError('You cannot request a private conversation with yourself');
    }

    // SECURITY RULE 2: Block check
    if (await this.isBlocked(userClient, user.id, authorUserId)) {
      throw new ForbiddenError('Cannot send conversation request to this user');
    }

    // SECURITY RULE 3: Duplicate request check in Supabase and store
    let existingInDb = false;
    try {
      const { data: existingRequests } = await userClient
        .from('conversation_requests')
        .select('id, status')
        .eq('experience_post_id', experiencePostId)
        .eq('requester_user_id', user.id)
        .eq('recipient_user_id', authorUserId)
        .in('status', ['pending', 'accepted'])
        .limit(1);
      if (existingRequests && existingRequests.length > 0) existingInDb = true;
    } catch (e) {}

    const existingInStore = ConversationsStore.findExistingRequest(experiencePostId, user.id, authorUserId);
    if (existingInDb || existingInStore) {
      throw new BadRequestError('A conversation request or active conversation already exists for this experience');
    }

    // Get requester profile
    const requesterProfile = await AuthService.getOrCreateAnonymousProfile(userClient, user.id);
    if (!requesterProfile?.id) {
      throw new BadRequestError('Failed to retrieve your anonymous profile');
    }

    const requestId = randomUUID();
    const newRequestPayload = {
      id: requestId,
      experience_post_id: experiencePostId,
      requester_user_id: user.id,
      requester_anonymous_profile_id: requesterProfile.id,
      recipient_user_id: authorUserId,
      recipient_anonymous_profile_id: authorAnonymousProfileId || null,
      message: message ? message.trim() : '',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Execute persistent Supabase INSERT with fallback
    let inserted = null;
    try {
      const res = await userClient
        .from('conversation_requests')
        .insert(newRequestPayload)
        .select()
        .single();
      if (res.data) {
        inserted = res.data;
      }
    } catch (e) {
      console.warn('Supabase conversation_requests notice:', e.message);
    }

    if (!inserted) {
      inserted = newRequestPayload;
    }

    ConversationsStore.saveRequest(inserted);

    return {
      id: inserted.id,
      experiencePostId: inserted.experience_post_id,
      experienceTitle: title,
      requesterDisplayName: requesterProfile.anonymousDisplayName || 'Anonymous Student',
      status: inserted.status,
      message: inserted.message,
      createdAt: inserted.created_at
    };
  }

  static async listUserRequests(userClient, user) {
    if (!user || !user.id) return [];

    let allRequests = [];
    try {
      const { data: requests, error } = await userClient
        .from('conversation_requests')
        .select('*')
        .or(`requester_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (Array.isArray(requests)) {
        allRequests.push(...requests);
      }
    } catch (e) {
      console.warn('Supabase listUserRequests notice:', e.message);
    }

    const storeReqs = ConversationsStore.listRequestsForUser(user.id);
    storeReqs.forEach(sr => {
      const existingIdx = allRequests.findIndex(r => r.id === sr.id);
      if (existingIdx >= 0) {
        if (sr.status && sr.status !== allRequests[existingIdx].status) {
          allRequests[existingIdx] = { ...allRequests[existingIdx], ...sr };
        }
      } else {
        allRequests.push(sr);
      }
    });

    if (allRequests.length === 0) return [];

    return allRequests.map(req => {
      const isIncoming = req.recipient_user_id === user.id;
      const otherProfileId = isIncoming ? req.requester_anonymous_profile_id : req.recipient_anonymous_profile_id;
      const otherProfile = ProfilesStore.getProfile(otherProfileId) || {};
      const postMeta = ProfilesStore.getPostMeta(req.experience_post_id) || {};

      return {
        id: req.id,
        experiencePostId: req.experience_post_id,
        experienceTitle: postMeta.title || 'Student Reflection',
        category: postMeta.category || 'General',
        isIncoming,
        otherUserDisplayName: otherProfile.displayName || (isIncoming ? 'Anonymous Student' : 'Anonymous Author'),
        otherUserAvatarKey: otherProfile.avatarKey || 'owl',
        message: req.message || '',
        status: req.status,
        createdAt: req.created_at
      };
    });
  }

  static async respondToRequest(userClient, user, requestId, status) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    let request = null;
    try {
      const { data: req } = await userClient
        .from('conversation_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();
      if (req) request = req;
    } catch (e) {}

    if (!request) {
      request = ConversationsStore.getRequest(requestId);
    }

    if (!request) {
      throw new NotFoundError(`Request with ID '${requestId}' not found`);
    }

    // SECURITY RULE: Only recipient can accept/decline
    if (request.recipient_user_id !== user.id) {
      throw new ForbiddenError('You are not authorized to respond to this request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestError(`Request has already been ${request.status}`);
    }

    const recipientProfile = await AuthService.getOrCreateAnonymousProfile(userClient, user.id);

    try {
      await userClient
        .from('conversation_requests')
        .update({
          status,
          recipient_anonymous_profile_id: recipientProfile?.id || request.recipient_anonymous_profile_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
    } catch (e) {}

    ConversationsStore.updateRequest(requestId, {
      status,
      recipient_anonymous_profile_id: recipientProfile?.id || request.recipient_anonymous_profile_id
    });

    let createdConversationId = null;

    if (status === 'accepted') {
      createdConversationId = randomUUID();
      const conversationPayload = {
        id: createdConversationId,
        request_id: request.id,
        experience_post_id: request.experience_post_id,
        participant1_user_id: request.requester_user_id,
        participant1_anonymous_profile_id: request.requester_anonymous_profile_id,
        participant2_user_id: request.recipient_user_id,
        participant2_anonymous_profile_id: recipientProfile?.id || request.recipient_anonymous_profile_id,
        status: 'active',
        created_at: new Date().toISOString()
      };

      try {
        await userClient
          .from('conversations')
          .insert(conversationPayload);
      } catch (e) {
        console.warn('Supabase conversations insert notice:', e.message);
      }

      ConversationsStore.saveConversation(conversationPayload);

      if (request.message && request.message.trim()) {
        const msgId = randomUUID();
        const initialMsg = {
          id: msgId,
          conversation_id: createdConversationId,
          sender_user_id: request.requester_user_id,
          sender_anonymous_profile_id: request.requester_anonymous_profile_id,
          content: request.message.trim(),
          created_at: request.created_at
        };

        try {
          await userClient.from('messages').insert(initialMsg);
        } catch (e) {
          console.warn('Supabase initial message notice:', e.message);
        }

        ConversationsStore.saveMessage(initialMsg);
      }
    }

    return {
      requestId: request.id,
      status,
      conversationId: createdConversationId
    };
  }

  static async listUserConversations(userClient, user) {
    if (!user || !user.id) return [];

    let allConvs = [];
    try {
      const { data: convs } = await userClient
        .from('conversations')
        .select('*')
        .or(`participant1_user_id.eq.${user.id},participant2_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (Array.isArray(convs)) {
        allConvs.push(...convs);
      }
    } catch (e) {
      console.warn('Supabase listUserConversations notice:', e.message);
    }

    const storeConvs = ConversationsStore.listConversationsForUser(user.id);
    storeConvs.forEach(sc => {
      const idx = allConvs.findIndex(c => c.id === sc.id);
      if (idx >= 0) {
        allConvs[idx] = { ...allConvs[idx], ...sc };
      } else {
        allConvs.push(sc);
      }
    });

    if (allConvs.length === 0) return [];

    return allConvs.map(c => {
      const isParticipant1 = c.participant1_user_id === user.id;
      const otherProfileId = isParticipant1 ? c.participant2_anonymous_profile_id : c.participant1_anonymous_profile_id;
      const otherProfile = ProfilesStore.getProfile(otherProfileId) || {};
      const postMeta = ProfilesStore.getPostMeta(c.experience_post_id) || {};

      const messages = ConversationsStore.listMessagesForConversation(c.id);
      const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

      const title = postMeta.title || 'Shared Experience';

      return {
        id: c.id,
        experienceTitle: title,
        otherUserDisplayName: otherProfile.displayName || 'Anonymous Peer',
        otherUserAvatarKey: otherProfile.avatarKey || 'owl',
        status: c.status,
        createdAt: c.created_at,
        endedAt: c.ended_at,
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          createdAt: lastMsg.created_at,
          isSelf: lastMsg.sender_user_id === user.id
        } : null
      };
    });
  }

  static async getConversationDetails(userClient, user, conversationId) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    let conv = null;
    try {
      const { data } = await userClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (data) conv = data;
    } catch (e) {}

    if (!conv) {
      conv = ConversationsStore.getConversation(conversationId);
    }

    if (!conv) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    // IDOR Protection: Must be participant
    const isParticipant = conv.participant1_user_id === user.id || conv.participant2_user_id === user.id;
    if (!isParticipant) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const isParticipant1 = conv.participant1_user_id === user.id;
    const selfProfileId = isParticipant1 ? conv.participant1_anonymous_profile_id : conv.participant2_anonymous_profile_id;
    const otherProfileId = isParticipant1 ? conv.participant2_anonymous_profile_id : conv.participant1_anonymous_profile_id;

    const selfProfile = ProfilesStore.getProfile(selfProfileId) || { displayName: 'You', avatarKey: 'owl' };
    const otherProfile = ProfilesStore.getProfile(otherProfileId) || { displayName: 'Anonymous Peer', avatarKey: 'owl' };

    let allMessages = [];
    try {
      const { data: messages } = await userClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (Array.isArray(messages)) {
        allMessages.push(...messages);
      }
    } catch (e) {}

    const storeMsgs = ConversationsStore.listMessagesForConversation(conversationId);
    storeMsgs.forEach(sm => {
      if (!allMessages.some(m => m.id === sm.id)) {
        allMessages.push(sm);
      }
    });

    allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const postMeta = ProfilesStore.getPostMeta(conv.experience_post_id) || {};

    const formattedMessages = allMessages.map(m => {
      const isSelf = m.sender_user_id === user.id;
      return {
        id: m.id,
        senderDisplayName: isSelf ? (selfProfile.displayName || 'You') : (otherProfile.displayName || 'Anonymous Peer'),
        senderAvatarKey: isSelf ? (selfProfile.avatarKey || 'owl') : (otherProfile.avatarKey || 'owl'),
        content: m.content,
        createdAt: m.created_at,
        isSelf
      };
    });

    return {
      id: conv.id,
      experienceTitle: postMeta.title || 'Shared Experience',
      selfDisplayName: selfProfile.displayName || 'You',
      otherUserDisplayName: otherProfile.displayName || 'Anonymous Peer',
      otherUserAvatarKey: otherProfile.avatarKey || 'owl',
      status: conv.status,
      createdAt: conv.created_at,
      endedAt: conv.ended_at,
      messages: formattedMessages
    };
  }

  static async sendMessage(userClient, user, conversationId, content) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    let conv = null;
    try {
      const { data } = await userClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (data) conv = data;
    } catch (e) {}

    if (!conv) {
      conv = ConversationsStore.getConversation(conversationId);
    }

    if (!conv) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    // IDOR Protection
    const isParticipant = conv.participant1_user_id === user.id || conv.participant2_user_id === user.id;
    if (!isParticipant) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    if (conv.status !== 'active') {
      throw new BadRequestError(`Cannot send message to an ${conv.status} conversation`);
    }

    const otherUserId = conv.participant1_user_id === user.id ? conv.participant2_user_id : conv.participant1_user_id;
    if (await this.isBlocked(userClient, user.id, otherUserId)) {
      throw new ForbiddenError('Cannot send message due to block');
    }

    const senderProfile = await AuthService.getOrCreateAnonymousProfile(userClient, user.id);
    const msgId = randomUUID();
    const newMsgPayload = {
      id: msgId,
      conversation_id: conversationId,
      sender_user_id: user.id,
      sender_anonymous_profile_id: senderProfile.id,
      content: content.trim(),
      created_at: new Date().toISOString()
    };

    try {
      await userClient
        .from('messages')
        .insert(newMsgPayload);
    } catch (e) {
      console.warn('Supabase messages insert notice:', e.message);
    }

    ConversationsStore.saveMessage(newMsgPayload);

    // Silent AI safety check
    try {
      const AiService = require('./ai.service');
      AiService.checkMessageSafety(content).then(safety => {
        if (safety.requires_human_review || safety.risk === 'high') {
          console.warn('⚠️ [AI Safety Flag on Private Message]', { conversationId, flags: safety.flags });
          userClient.from('reports').insert({
            post_id: conv.experience_post_id,
            reason: `AI Message Safety Flag: ${safety.flags.join(', ') || 'High Risk'}`,
            status: 'pending'
          }).then(() => {}).catch(() => {});
        }
      }).catch(() => {});
    } catch (e) {}

    return {
      id: newMsgPayload.id,
      conversationId: newMsgPayload.conversation_id,
      senderDisplayName: senderProfile.anonymousDisplayName || 'Anonymous Student',
      content: newMsgPayload.content,
      createdAt: newMsgPayload.created_at,
      isSelf: true
    };
  }

  static async endConversation(userClient, user, conversationId) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    let conv = null;
    try {
      const { data } = await userClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (data) conv = data;
    } catch (e) {}

    if (!conv) {
      conv = ConversationsStore.getConversation(conversationId);
    }

    if (!conv) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const isParticipant = conv.participant1_user_id === user.id || conv.participant2_user_id === user.id;
    if (!isParticipant) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    if (conv.status === 'ended') {
      return { id: conv.id, status: 'ended', endedAt: conv.ended_at };
    }

    const endedAt = new Date().toISOString();
    try {
      await userClient
        .from('conversations')
        .update({ status: 'ended', ended_at: endedAt })
        .eq('id', conversationId);
    } catch (e) {}

    ConversationsStore.updateConversation(conversationId, { status: 'ended', ended_at: endedAt });

    return {
      id: conv.id,
      status: 'ended',
      endedAt
    };
  }

  static async blockUserInConversation(userClient, user, conversationId) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    let conv = null;
    try {
      const { data } = await userClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (data) conv = data;
    } catch (e) {}

    if (!conv) {
      conv = ConversationsStore.getConversation(conversationId);
    }

    if (!conv) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const isParticipant = conv.participant1_user_id === user.id || conv.participant2_user_id === user.id;
    if (!isParticipant) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const otherUserId = conv.participant1_user_id === user.id ? conv.participant2_user_id : conv.participant1_user_id;

    // Register block in Supabase
    await userClient.from('blocked_users').insert({
      id: randomUUID(),
      blocker_user_id: user.id,
      blocked_user_id: otherUserId,
      created_at: new Date().toISOString()
    }).catch(e => console.warn('Block insert notice:', e.message));

    const endedAt = new Date().toISOString();
    try {
      await userClient.from('conversations').update({
        status: 'blocked',
        ended_at: endedAt
      }).eq('id', conversationId);
    } catch (e) {}

    ConversationsStore.updateConversation(conversationId, {
      status: 'blocked',
      ended_at: endedAt
    });

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

    let conv = null;
    try {
      const { data } = await userClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (data) conv = data;
    } catch (e) {}

    if (!conv) {
      conv = ConversationsStore.getConversation(conversationId);
    }

    if (!conv) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const reportId = randomUUID();
    try {
      await userClient
        .from('reports')
        .insert({
          id: reportId,
          post_id: conv.experience_post_id,
          reason: `${reason || 'Inappropriate content'}: ${details || ''}`,
          status: 'pending',
          created_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn('Report user insert warning:', e.message);
    }

    return {
      reportId,
      message: 'Report submitted quietly for human moderator review.'
    };
  }
}

module.exports = ConversationsService;
