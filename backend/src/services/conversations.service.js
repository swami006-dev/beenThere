const { randomUUID } = require('crypto');
const { supabase } = require('../db/supabase');
const AuthService = require('./auth.service');
const { DEMO_EXPERIENCES } = require('../db/seedExperiences');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

class ConversationsService {
  /**
   * Determine experience author and title given an experiencePostId
   */
  static async resolveExperienceDetails(userClient, experiencePostId) {
    const adminClient = supabase;

    // 1. Try posts table
    try {
      const { data: post } = await adminClient
        .from('posts')
        .select('*')
        .eq('id', experiencePostId)
        .maybeSingle();

      if (post) {
        let authorUserId = null;
        let authorAnonymousProfileId = post.anonymous_profile_id;

        if (post.anonymous_profile_id) {
          const { data: profile } = await adminClient
            .from('anonymous_profiles')
            .select('id, user_id')
            .eq('id', post.anonymous_profile_id)
            .maybeSingle();

          if (profile) {
            authorUserId = profile.user_id;
            authorAnonymousProfileId = profile.id;
          }
        }

        return {
          authorUserId: authorUserId || null,
          authorAnonymousProfileId: authorAnonymousProfileId || null,
          title: post.content ? (post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '')) : 'Student Reflection',
          category: post.category || 'General'
        };
      }
    } catch (e) {
      console.warn('resolveExperienceDetails posts query warning:', e.message);
    }

    // 2. Try experience_cards table
    try {
      const { data: exp } = await adminClient
        .from('experience_cards')
        .select('*')
        .eq('id', experiencePostId)
        .maybeSingle();

      if (exp) {
        let authorUserId = null;
        let authorAnonymousProfileId = null;

        // If card references a source post, trace author through post
        if (exp.source_post_id) {
          const { data: sourcePost } = await adminClient
            .from('posts')
            .select('anonymous_profile_id')
            .eq('id', exp.source_post_id)
            .maybeSingle();

          if (sourcePost && sourcePost.anonymous_profile_id) {
            authorAnonymousProfileId = sourcePost.anonymous_profile_id;
            const { data: profile } = await adminClient
              .from('anonymous_profiles')
              .select('id, user_id')
              .eq('id', sourcePost.anonymous_profile_id)
              .maybeSingle();

            if (profile) authorUserId = profile.user_id;
          }
        }

        const expTitle = exp.situation
          ? (exp.situation.split('. Situation:')[0].replace(/^Title:\s*/, '') || exp.situation.substring(0, 60))
          : 'Student Experience';

        return {
          authorUserId,
          authorAnonymousProfileId,
          title: expTitle,
          category: exp.category || 'General'
        };
      }
    } catch (e) {
      console.warn('resolveExperienceDetails experience_cards query warning:', e.message);
    }

    // 3. Fallback for demo seed indices
    const seedIndex = parseInt(String(experiencePostId).replace(/^seed-exp-/, ''), 10);
    if (!isNaN(seedIndex) && DEMO_EXPERIENCES[seedIndex - 1]) {
      const demo = DEMO_EXPERIENCES[seedIndex - 1];
      return {
        authorUserId: null,
        authorAnonymousProfileId: null,
        title: demo.title,
        category: demo.category
      };
    }

    return {
      authorUserId: null,
      authorAnonymousProfileId: null,
      title: 'Student Experience Reflection',
      category: 'General'
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

    const { authorUserId, authorAnonymousProfileId, title, category } = await this.resolveExperienceDetails(userClient, experiencePostId);

    if (!authorUserId) {
      throw new BadRequestError('This experience was shared canonically and does not currently have a direct student author available for 1-to-1 chat.');
    }

    // SECURITY RULE 1: No self conversations
    if (authorUserId === user.id) {
      throw new BadRequestError('You cannot request a private conversation with yourself');
    }

    // SECURITY RULE 2: Block check
    if (await this.isBlocked(userClient, user.id, authorUserId)) {
      throw new ForbiddenError('Cannot send conversation request to this user');
    }

    // SECURITY RULE 3: Duplicate request check in Supabase
    const { data: existingRequests, error: dupCheckErr } = await userClient
      .from('conversation_requests')
      .select('id, status')
      .eq('experience_post_id', experiencePostId)
      .eq('requester_user_id', user.id)
      .eq('recipient_user_id', authorUserId)
      .in('status', ['pending', 'accepted'])
      .limit(1);

    if (!dupCheckErr && existingRequests && existingRequests.length > 0) {
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

    // Execute persistent Supabase INSERT
    const { data: inserted, error: insertErr } = await userClient
      .from('conversation_requests')
      .insert(newRequestPayload)
      .select()
      .single();

    if (insertErr || !inserted) {
      console.error('Supabase conversation_requests insert error:', insertErr);
      throw new Error(`Failed to persist conversation request in Supabase: ${insertErr?.message || 'Database error'}`);
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

    const { data: requests, error } = await userClient
      .from('conversation_requests')
      .select(`
        id,
        experience_post_id,
        requester_user_id,
        requester_anonymous_profile_id,
        recipient_user_id,
        recipient_anonymous_profile_id,
        message,
        status,
        created_at,
        updated_at
      `)
      .or(`requester_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase listUserRequests error:', error);
      throw new Error(`Failed to load conversation requests from Supabase: ${error.message}`);
    }

    if (!Array.isArray(requests) || requests.length === 0) {
      return [];
    }

    // Collect profile IDs and post IDs for batched metadata hydration
    const profileIds = new Set();
    const postIds = new Set();
    requests.forEach(r => {
      if (r.requester_anonymous_profile_id) profileIds.add(r.requester_anonymous_profile_id);
      if (r.recipient_anonymous_profile_id) profileIds.add(r.recipient_anonymous_profile_id);
      if (r.experience_post_id) postIds.add(r.experience_post_id);
    });

    // Hydrate profiles
    const profilesMap = new Map();
    if (profileIds.size > 0) {
      const { data: profiles } = await supabase
        .from('anonymous_profiles')
        .select('id, display_name, avatar_key')
        .in('id', Array.from(profileIds));

      if (Array.isArray(profiles)) {
        profiles.forEach(p => profilesMap.set(p.id, p));
      }
    }

    // Hydrate post titles
    const postsMap = new Map();
    if (postIds.size > 0) {
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, category')
        .in('id', Array.from(postIds));

      if (Array.isArray(posts)) {
        posts.forEach(p => postsMap.set(p.id, p));
      }

      // Check experience_cards for any remaining
      const missingPostIds = Array.from(postIds).filter(id => !postsMap.has(id));
      if (missingPostIds.length > 0) {
        const { data: cards } = await supabase
          .from('experience_cards')
          .select('id, situation, category')
          .in('id', missingPostIds);

        if (Array.isArray(cards)) {
          cards.forEach(c => postsMap.set(c.id, {
            content: c.situation?.split('. Situation:')[0]?.replace(/^Title:\s*/, '') || 'Experience',
            category: c.category || 'General'
          }));
        }
      }
    }

    const userRequests = requests.map(req => {
      const isIncoming = req.recipient_user_id === user.id;
      const otherProfileId = isIncoming ? req.requester_anonymous_profile_id : req.recipient_anonymous_profile_id;
      const otherProfile = profilesMap.get(otherProfileId) || {};
      const post = postsMap.get(req.experience_post_id) || {};

      const title = post.content
        ? (post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''))
        : 'Shared Experience';

      return {
        id: req.id,
        experiencePostId: req.experience_post_id,
        experienceTitle: title,
        category: post.category || 'General',
        isIncoming,
        otherUserDisplayName: otherProfile.display_name || (isIncoming ? 'Anonymous Student' : 'Anonymous Author'),
        otherUserAvatarKey: otherProfile.avatar_key || 'owl',
        message: req.message || '',
        status: req.status,
        createdAt: req.created_at
      };
    });

    return userRequests;
  }

  static async respondToRequest(userClient, user, requestId, status) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const { data: request, error: fetchErr } = await userClient
      .from('conversation_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchErr || !request) {
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

    // Update request status in Supabase
    const { error: updateErr } = await userClient
      .from('conversation_requests')
      .update({
        status,
        recipient_anonymous_profile_id: recipientProfile?.id || request.recipient_anonymous_profile_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateErr) {
      throw new Error(`Failed to update request status in Supabase: ${updateErr.message}`);
    }

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

      const { error: convErr } = await userClient
        .from('conversations')
        .insert(conversationPayload);

      if (convErr) {
        console.error('Supabase conversations insert error:', convErr);
        throw new Error(`Failed to create persistent conversation in Supabase: ${convErr.message}`);
      }

      // If request had an initial message, insert it as the first message
      if (request.message && request.message.trim()) {
        const msgId = randomUUID();
        await userClient.from('messages').insert({
          id: msgId,
          conversation_id: createdConversationId,
          sender_user_id: request.requester_user_id,
          sender_anonymous_profile_id: request.requester_anonymous_profile_id,
          content: request.message.trim(),
          created_at: request.created_at
        });
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

    const { data: convs, error } = await userClient
      .from('conversations')
      .select(`
        id,
        request_id,
        experience_post_id,
        participant1_user_id,
        participant1_anonymous_profile_id,
        participant2_user_id,
        participant2_anonymous_profile_id,
        status,
        created_at,
        ended_at
      `)
      .or(`participant1_user_id.eq.${user.id},participant2_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase listUserConversations error:', error);
      throw new Error(`Failed to load conversations from Supabase: ${error.message}`);
    }

    if (!Array.isArray(convs) || convs.length === 0) {
      return [];
    }

    // Hydrate profiles, post titles, and latest messages
    const profileIds = new Set();
    const postIds = new Set();
    const convIds = convs.map(c => c.id);

    convs.forEach(c => {
      if (c.participant1_anonymous_profile_id) profileIds.add(c.participant1_anonymous_profile_id);
      if (c.participant2_anonymous_profile_id) profileIds.add(c.participant2_anonymous_profile_id);
      if (c.experience_post_id) postIds.add(c.experience_post_id);
    });

    const profilesMap = new Map();
    if (profileIds.size > 0) {
      const { data: profiles } = await supabase
        .from('anonymous_profiles')
        .select('id, display_name, avatar_key')
        .in('id', Array.from(profileIds));

      if (Array.isArray(profiles)) {
        profiles.forEach(p => profilesMap.set(p.id, p));
      }
    }

    const postsMap = new Map();
    if (postIds.size > 0) {
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content')
        .in('id', Array.from(postIds));

      if (Array.isArray(posts)) {
        posts.forEach(p => postsMap.set(p.id, p));
      }
    }

    // Fetch latest messages
    const latestMessagesMap = new Map();
    if (convIds.length > 0) {
      const { data: messages } = await userClient
        .from('messages')
        .select('id, conversation_id, sender_user_id, content, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

      if (Array.isArray(messages)) {
        messages.forEach(m => {
          if (!latestMessagesMap.has(m.conversation_id)) {
            latestMessagesMap.set(m.conversation_id, m);
          }
        });
      }
    }

    return convs.map(c => {
      const isParticipant1 = c.participant1_user_id === user.id;
      const otherProfileId = isParticipant1 ? c.participant2_anonymous_profile_id : c.participant1_anonymous_profile_id;
      const otherProfile = profilesMap.get(otherProfileId) || {};
      const post = postsMap.get(c.experience_post_id) || {};
      const lastMsg = latestMessagesMap.get(c.id);

      const title = post.content
        ? (post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''))
        : 'Shared Experience';

      return {
        id: c.id,
        experienceTitle: title,
        otherUserDisplayName: otherProfile.display_name || 'Anonymous Peer',
        otherUserAvatarKey: otherProfile.avatar_key || 'owl',
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

    const { data: conv, error: convErr } = await userClient
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    // IDOR Protection: Must be participant
    const isParticipant = conv.participant1_user_id === user.id || conv.participant2_user_id === user.id;
    if (!isParticipant) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    // Hydrate profiles
    const profileIds = [conv.participant1_anonymous_profile_id, conv.participant2_anonymous_profile_id].filter(Boolean);
    const { data: profiles } = await supabase
      .from('anonymous_profiles')
      .select('id, user_id, display_name, avatar_key')
      .in('id', profileIds);

    const isParticipant1 = conv.participant1_user_id === user.id;
    const selfProfileId = isParticipant1 ? conv.participant1_anonymous_profile_id : conv.participant2_anonymous_profile_id;
    const otherProfileId = isParticipant1 ? conv.participant2_anonymous_profile_id : conv.participant1_anonymous_profile_id;

    const selfProfile = (profiles || []).find(p => p.id === selfProfileId) || { display_name: 'You', avatar_key: 'owl' };
    const otherProfile = (profiles || []).find(p => p.id === otherProfileId) || { display_name: 'Anonymous Peer', avatar_key: 'owl' };

    // Fetch messages from Supabase
    const { data: messages, error: msgErr } = await userClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgErr) {
      throw new Error(`Failed to load messages from Supabase: ${msgErr.message}`);
    }

    // Post title
    let experienceTitle = 'Shared Experience';
    if (conv.experience_post_id) {
      const { data: post } = await supabase
        .from('posts')
        .select('content')
        .eq('id', conv.experience_post_id)
        .maybeSingle();

      if (post && post.content) {
        experienceTitle = post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '');
      }
    }

    const formattedMessages = (messages || []).map(m => {
      const isSelf = m.sender_user_id === user.id;
      return {
        id: m.id,
        senderDisplayName: isSelf ? (selfProfile.display_name || 'You') : (otherProfile.display_name || 'Anonymous Peer'),
        senderAvatarKey: isSelf ? (selfProfile.avatar_key || 'owl') : (otherProfile.avatar_key || 'owl'),
        content: m.content,
        createdAt: m.created_at,
        isSelf
      };
    });

    return {
      id: conv.id,
      experienceTitle,
      selfDisplayName: selfProfile.display_name || 'You',
      otherUserDisplayName: otherProfile.display_name || 'Anonymous Peer',
      otherUserAvatarKey: otherProfile.avatar_key || 'owl',
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

    const { data: conv, error: convErr } = await userClient
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (convErr || !conv) {
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

    // Execute persistent Supabase INSERT
    const { data: inserted, error: insertErr } = await userClient
      .from('messages')
      .insert(newMsgPayload)
      .select()
      .single();

    if (insertErr || !inserted) {
      console.error('Supabase messages insert error:', insertErr);
      throw new Error(`Failed to persist message in Supabase: ${insertErr?.message || 'Database error'}`);
    }

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
      id: inserted.id,
      conversationId: inserted.conversation_id,
      senderDisplayName: senderProfile.anonymousDisplayName || 'Anonymous Student',
      content: inserted.content,
      createdAt: inserted.created_at,
      isSelf: true
    };
  }

  static async endConversation(userClient, user, conversationId) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const { data: conv, error } = await userClient
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (error || !conv) {
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
    const { data: updated, error: updateErr } = await userClient
      .from('conversations')
      .update({ status: 'ended', ended_at: endedAt })
      .eq('id', conversationId)
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Failed to end conversation in Supabase: ${updateErr.message}`);
    }

    return {
      id: updated.id,
      status: updated.status,
      endedAt: updated.ended_at
    };
  }

  static async blockUserInConversation(userClient, user, conversationId) {
    if (!user || !user.id) {
      throw new ForbiddenError('Authentication required');
    }

    const { data: conv, error } = await userClient
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (error || !conv) {
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

    await userClient.from('conversations').update({
      status: 'blocked',
      ended_at: new Date().toISOString()
    }).eq('id', conversationId);

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

    const { data: conv, error } = await userClient
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (error || !conv) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const reportId = randomUUID();
    const { data: report, error: repErr } = await userClient
      .from('reports')
      .insert({
        id: reportId,
        post_id: conv.experience_post_id,
        reason: `${reason || 'Inappropriate content'}: ${details || ''}`,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (repErr) {
      console.warn('Report user insert warning:', repErr.message);
    }

    return {
      reportId: report?.id || reportId,
      message: 'Report submitted quietly for human moderator review.'
    };
  }
}

module.exports = ConversationsService;
