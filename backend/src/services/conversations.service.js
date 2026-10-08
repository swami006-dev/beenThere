const { randomUUID } = require('crypto');
const { supabase } = require('../db/supabase');
const AuthService = require('./auth.service');
const ProfilesStore = require('./profiles.store');
const ConversationsStore = require('./conversations.store');
const { DEMO_EXPERIENCES } = require('../db/seedExperiences');
const { NotFoundError, ForbiddenError, BadRequestError, AppError } = require('../utils/errors');

class ConversationsService {
  /**
   * Helper to retrieve anonymous profile by ID, querying Supabase first
   */
  static async getAnonymousProfileById(userClient, profileId) {
    if (!profileId) return null;
    try {
      const client = userClient || supabase;
      const { data: prof, error } = await client
        .from('anonymous_profiles')
        .select('id, user_id, display_name, avatar_key')
        .eq('id', profileId)
        .maybeSingle();

      if (!error && prof) {
        return {
          id: prof.id,
          userId: prof.user_id,
          displayName: prof.display_name,
          avatarKey: prof.avatar_key
        };
      }
    } catch (e) {}
    return ProfilesStore.getProfile(profileId) || null;
  }

  /**
   * Helper to retrieve experience title and category from Supabase
   */
  static async getExperienceMetaById(userClient, postId) {
    if (!postId) {
      return { title: 'Student Reflection', category: 'General' };
    }
    try {
      const client = userClient || supabase;
      const { data: post, error } = await client
        .from('posts')
        .select('content, category')
        .eq('id', postId)
        .maybeSingle();

      if (!error && post) {
        const title = post.content ? (post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '')) : 'Student Reflection';
        return { title, category: post.category || 'General' };
      }
    } catch (e) {}

    const meta = ProfilesStore.getPostMeta(postId);
    return {
      title: meta?.title || 'Student Reflection',
      category: meta?.category || 'General'
    };
  }

  /**
   * Determine experience author and title given an experiencePostId
   */
  static async resolveExperienceDetails(userClient, experiencePostId) {
    const client = userClient || supabase;

    // 1. Try posts table with userClient or adminClient
    try {
      const { data: post } = await client
        .from('posts')
        .select('*')
        .eq('id', experiencePostId)
        .maybeSingle();

      if (post) {
        let authorUserId = null;
        let authorAnonymousProfileId = post.anonymous_profile_id;

        if (post.anonymous_profile_id) {
          const profile = await this.getAnonymousProfileById(client, post.anonymous_profile_id);
          if (profile?.userId) {
            authorUserId = profile.userId;
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

    // 2. Check ProfilesStore metadata fallback
    const meta = ProfilesStore.getPostMeta(experiencePostId);
    if (meta) {
      let authorUserId = meta.authorUserId;
      if (!authorUserId && meta.authorAnonymousProfileId) {
        const prof = await this.getAnonymousProfileById(client, meta.authorAnonymousProfileId);
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

    // 3. Try experience_cards table (Canonical)
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

    // 4. Fallback for demo seed indices
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
      const client = userClient || supabase;
      const { data } = await client
        .from('blocked_users')
        .select('id')
        .or(`and(blocker_user_id.eq.${userAId},blocked_user_id.eq.${userBId}),and(blocker_user_id.eq.${userBId},blocked_user_id.eq.${userAId})`)
        .limit(1);

      return Array.isArray(data) && data.length > 0;
    } catch (e) {
      return false;
    }
  }

  static async createRequest(userClient, user, { experiencePostId, targetAnonymousProfileId, message }) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required to create a request');
    }

    let authorUserId = null;
    let authorAnonymousProfileId = null;
    let title = 'Student Reflection';
    let category = 'General';
    let isCanonical = false;

    const client = userClient || supabase;

    if (targetAnonymousProfileId) {
      authorAnonymousProfileId = targetAnonymousProfileId;
      const prof = await this.getAnonymousProfileById(client, targetAnonymousProfileId);
      if (prof?.userId) {
        authorUserId = prof.userId;
      }

      if (experiencePostId) {
        const expMeta = await this.getExperienceMetaById(client, experiencePostId);
        title = expMeta.title || 'Student Discussion Response';
        category = expMeta.category || 'General';
      }
    } else {
      const details = await this.resolveExperienceDetails(client, experiencePostId);
      authorUserId = details.authorUserId;
      authorAnonymousProfileId = details.authorAnonymousProfileId;
      title = details.title;
      category = details.category;
      isCanonical = details.isCanonical;
    }

    if (isCanonical && !targetAnonymousProfileId) {
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
    if (await this.isBlocked(client, user.id, authorUserId)) {
      throw new ForbiddenError('Cannot send conversation request to this user');
    }

    // SECURITY RULE 3: Duplicate request check in Supabase
    try {
      const { data: existingRequests } = await client
        .from('conversation_requests')
        .select('id, status')
        .eq('experience_post_id', experiencePostId)
        .eq('requester_user_id', user.id)
        .eq('recipient_user_id', authorUserId)
        .in('status', ['pending', 'accepted'])
        .limit(1);

      if (Array.isArray(existingRequests) && existingRequests.length > 0) {
        throw new BadRequestError('A conversation request or active conversation already exists for this experience');
      }
    } catch (e) {
      if (e instanceof BadRequestError) throw e;
    }

    const existingInStore = ConversationsStore.findExistingRequest(experiencePostId, user.id, authorUserId);
    if (existingInStore) {
      throw new BadRequestError('A conversation request or active conversation already exists for this experience');
    }

    // Get requester profile
    const requesterProfile = await AuthService.getOrCreateAnonymousProfile(client, user.id);
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

    // Primary: Execute persistent Supabase INSERT
    let inserted = null;
    const { data: resData, error: insErr } = await client
      .from('conversation_requests')
      .insert(newRequestPayload)
      .select()
      .single();

    if (insErr) {
      console.error('❌ [ConversationsService.createRequest] Supabase error:', insErr.message, insErr.details || '');
      if (process.env.NODE_ENV !== 'production' && insErr.code === 'PGRST205') {
        console.warn('⚠️ [ConversationsService] Falling back to local store in non-production because conversation_requests table is not yet migrated.');
        inserted = newRequestPayload;
        ConversationsStore.saveRequest(inserted);
      } else {
        throw new AppError(`Failed to send conversation request: ${insErr.message}`, 500, insErr.code || 'DATABASE_ERROR');
      }
    } else {
      inserted = resData;
      // Sync local cache
      try { ConversationsStore.saveRequest(inserted); } catch (e) {}
    }

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

    const client = userClient || supabase;
    let allRequests = [];

    const { data: requests, error } = await client
      .from('conversation_requests')
      .select('*')
      .or(`requester_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [ConversationsService.listUserRequests] Supabase error:', error.message);
      if (process.env.NODE_ENV !== 'production' && error.code === 'PGRST205') {
        console.warn('⚠️ [ConversationsService] Falling back to local store in non-production.');
        allRequests = ConversationsStore.listRequestsForUser(user.id);
      } else {
        throw new AppError(`Failed to load conversation requests: ${error.message}`, 500, error.code || 'DATABASE_ERROR');
      }
    } else {
      allRequests = Array.isArray(requests) ? requests : [];
      // Merge any local dev requests if needed
      if (process.env.NODE_ENV !== 'production') {
        const storeReqs = ConversationsStore.listRequestsForUser(user.id);
        storeReqs.forEach(sr => {
          if (!allRequests.some(r => r.id === sr.id)) allRequests.push(sr);
        });
      }
    }

    if (allRequests.length === 0) return [];

    // Hydrate requests with profiles and experience titles
    const formatted = [];
    for (const req of allRequests) {
      const isIncoming = req.recipient_user_id === user.id;
      const otherProfileId = isIncoming ? req.requester_anonymous_profile_id : req.recipient_anonymous_profile_id;
      const otherProfile = await this.getAnonymousProfileById(client, otherProfileId) || {};
      const expMeta = await this.getExperienceMetaById(client, req.experience_post_id);

      formatted.push({
        id: req.id,
        experiencePostId: req.experience_post_id,
        experienceTitle: expMeta.title || 'Student Reflection',
        category: expMeta.category || 'General',
        isIncoming,
        otherUserDisplayName: otherProfile.displayName || (isIncoming ? 'Anonymous Student' : 'Anonymous Author'),
        otherUserAvatarKey: otherProfile.avatarKey || 'owl',
        message: req.message || '',
        status: req.status,
        createdAt: req.created_at
      });
    }

    return formatted;
  }

  static async respondToRequest(userClient, user, requestId, status) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const client = userClient || supabase;

    let request = null;
    const { data: req, error: fetchErr } = await client
      .from('conversation_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchErr && !(process.env.NODE_ENV !== 'production' && fetchErr.code === 'PGRST205')) {
      console.error('❌ [ConversationsService.respondToRequest] Fetch error:', fetchErr.message);
      throw new AppError(`Failed to load request: ${fetchErr.message}`, 500, fetchErr.code || 'DATABASE_ERROR');
    }

    if (req) {
      request = req;
    } else {
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

    const recipientProfile = await AuthService.getOrCreateAnonymousProfile(client, user.id);

    // Update request in Supabase
    const { error: updateErr } = await client
      .from('conversation_requests')
      .update({
        status,
        recipient_anonymous_profile_id: recipientProfile?.id || request.recipient_anonymous_profile_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateErr && !(process.env.NODE_ENV !== 'production' && updateErr.code === 'PGRST205')) {
      console.error('❌ [ConversationsService.respondToRequest] Update error:', updateErr.message);
      throw new AppError(`Failed to update request: ${updateErr.message}`, 500, updateErr.code || 'DATABASE_ERROR');
    }

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

      const { error: convErr } = await client
        .from('conversations')
        .insert(conversationPayload);

      if (convErr && !(process.env.NODE_ENV !== 'production' && convErr.code === 'PGRST205')) {
        console.error('❌ [ConversationsService.respondToRequest] Conversation insert error:', convErr.message);
        throw new AppError(`Failed to create conversation: ${convErr.message}`, 500, convErr.code || 'DATABASE_ERROR');
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

        const { error: msgErr } = await client
          .from('messages')
          .insert(initialMsg);

        if (msgErr && !(process.env.NODE_ENV !== 'production' && msgErr.code === 'PGRST205')) {
          console.error('❌ [ConversationsService.respondToRequest] Initial message insert error:', msgErr.message);
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

    const client = userClient || supabase;
    let allConvs = [];

    const { data: convs, error } = await client
      .from('conversations')
      .select('*')
      .or(`participant1_user_id.eq.${user.id},participant2_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [ConversationsService.listUserConversations] Supabase error:', error.message);
      if (process.env.NODE_ENV !== 'production' && error.code === 'PGRST205') {
        allConvs = ConversationsStore.listConversationsForUser(user.id);
      } else {
        throw new AppError(`Failed to load conversations: ${error.message}`, 500, error.code || 'DATABASE_ERROR');
      }
    } else {
      allConvs = Array.isArray(convs) ? convs : [];
      if (process.env.NODE_ENV !== 'production') {
        const storeConvs = ConversationsStore.listConversationsForUser(user.id);
        storeConvs.forEach(sc => {
          if (!allConvs.some(c => c.id === sc.id)) allConvs.push(sc);
        });
      }
    }

    if (allConvs.length === 0) return [];

    const formatted = [];
    for (const c of allConvs) {
      const isParticipant1 = c.participant1_user_id === user.id;
      const otherProfileId = isParticipant1 ? c.participant2_anonymous_profile_id : c.participant1_anonymous_profile_id;
      const otherProfile = await this.getAnonymousProfileById(client, otherProfileId) || {};
      const expMeta = await this.getExperienceMetaById(client, c.experience_post_id);

      // Fetch last message from Supabase
      let lastMsg = null;
      try {
        const { data: msgs } = await client
          .from('messages')
          .select('*')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (Array.isArray(msgs) && msgs.length > 0) {
          lastMsg = msgs[0];
        }
      } catch (e) {}

      if (!lastMsg) {
        const storeMsgs = ConversationsStore.listMessagesForConversation(c.id);
        lastMsg = storeMsgs.length > 0 ? storeMsgs[storeMsgs.length - 1] : null;
      }

      formatted.push({
        id: c.id,
        experienceTitle: expMeta.title || 'Shared Experience',
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
      });
    }

    return formatted;
  }

  static async getConversationDetails(userClient, user, conversationId) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const client = userClient || supabase;

    let conv = null;
    const { data: dbConv, error: fetchErr } = await client
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (fetchErr && !(process.env.NODE_ENV !== 'production' && fetchErr.code === 'PGRST205')) {
      console.error('❌ [ConversationsService.getConversationDetails] Fetch error:', fetchErr.message);
      throw new AppError(`Failed to load conversation: ${fetchErr.message}`, 500, fetchErr.code || 'DATABASE_ERROR');
    }

    if (dbConv) {
      conv = dbConv;
    } else {
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

    const selfProfile = await this.getAnonymousProfileById(client, selfProfileId) || { displayName: 'You', avatarKey: 'owl' };
    const otherProfile = await this.getAnonymousProfileById(client, otherProfileId) || { displayName: 'Anonymous Peer', avatarKey: 'owl' };

    let allMessages = [];
    const { data: dbMessages } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (Array.isArray(dbMessages)) {
      allMessages.push(...dbMessages);
    }

    if (process.env.NODE_ENV !== 'production') {
      const storeMsgs = ConversationsStore.listMessagesForConversation(conversationId);
      storeMsgs.forEach(sm => {
        if (!allMessages.some(m => m.id === sm.id)) {
          allMessages.push(sm);
        }
      });
    }

    allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const expMeta = await this.getExperienceMetaById(client, conv.experience_post_id);

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
      experienceTitle: expMeta.title || 'Shared Experience',
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

    const client = userClient || supabase;

    let conv = null;
    const { data: dbConv } = await client
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (dbConv) {
      conv = dbConv;
    } else {
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
    if (await this.isBlocked(client, user.id, otherUserId)) {
      throw new ForbiddenError('Cannot send message due to block');
    }

    const senderProfile = await AuthService.getOrCreateAnonymousProfile(client, user.id);
    const msgId = randomUUID();
    const newMsgPayload = {
      id: msgId,
      conversation_id: conversationId,
      sender_user_id: user.id,
      sender_anonymous_profile_id: senderProfile.id,
      content: content.trim(),
      created_at: new Date().toISOString()
    };

    const { error: insErr } = await client
      .from('messages')
      .insert(newMsgPayload);

    if (insErr && !(process.env.NODE_ENV !== 'production' && insErr.code === 'PGRST205')) {
      console.error('❌ [ConversationsService.sendMessage] Supabase error:', insErr.message);
      throw new AppError(`Failed to send message: ${insErr.message}`, 500, insErr.code || 'DATABASE_ERROR');
    }

    ConversationsStore.saveMessage(newMsgPayload);

    // Silent AI safety check
    try {
      const AiService = require('./ai.service');
      AiService.checkMessageSafety(content).then(safety => {
        if (safety.requires_human_review || safety.risk === 'high') {
          console.warn('⚠️ [AI Safety Flag on Private Message]', { conversationId, flags: safety.flags });
          client.from('reports').insert({
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

    const client = userClient || supabase;

    let conv = null;
    const { data: dbConv } = await client
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (dbConv) {
      conv = dbConv;
    } else {
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
    const { error: updErr } = await client
      .from('conversations')
      .update({ status: 'ended', ended_at: endedAt })
      .eq('id', conversationId);

    if (updErr && !(process.env.NODE_ENV !== 'production' && updErr.code === 'PGRST205')) {
      console.error('❌ [ConversationsService.endConversation] Update error:', updErr.message);
      throw new AppError(`Failed to end conversation: ${updErr.message}`, 500, updErr.code || 'DATABASE_ERROR');
    }

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

    const client = userClient || supabase;

    let conv = null;
    const { data: dbConv } = await client
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (dbConv) {
      conv = dbConv;
    } else {
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
    await client.from('blocked_users').insert({
      id: randomUUID(),
      blocker_user_id: user.id,
      blocked_user_id: otherUserId,
      created_at: new Date().toISOString()
    }).catch(() => {});

    // End the conversation
    return this.endConversation(client, user, conversationId);
  }

  static async reportUserInConversation(userClient, user, conversationId, { reason, details }) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const client = userClient || supabase;

    let conv = null;
    const { data: dbConv } = await client
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (dbConv) {
      conv = dbConv;
    } else {
      conv = ConversationsStore.getConversation(conversationId);
    }

    if (!conv) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const isParticipant = conv.participant1_user_id === user.id || conv.participant2_user_id === user.id;
    if (!isParticipant) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const reportId = randomUUID();
    await client.from('reports').insert({
      id: reportId,
      post_id: conv.experience_post_id,
      user_id: user.id,
      reason: `${reason}: ${details || ''}`.trim(),
      status: 'pending',
      created_at: new Date().toISOString()
    }).catch(() => {});

    return {
      reportId,
      success: true,
      message: 'Report submitted successfully. Our team will review the conversation for safety violations.'
    };
  }
}

module.exports = ConversationsService;
