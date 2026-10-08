-- ==============================================================================
-- Migration 004: Create Conversations, Requests, Messages & Blocks Persistence
-- Non-destructive, idempotent, and secure with Row Level Security (RLS).
-- ==============================================================================

-- 1. Conversation Requests Table
CREATE TABLE IF NOT EXISTS public.conversation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_post_id UUID NOT NULL,
    requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_anonymous_profile_id UUID NOT NULL REFERENCES public.anonymous_profiles(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_anonymous_profile_id UUID REFERENCES public.anonymous_profiles(id) ON DELETE SET NULL,
    message TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.conversation_requests(id) ON DELETE SET NULL,
    experience_post_id UUID NOT NULL,
    participant1_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant1_anonymous_profile_id UUID NOT NULL REFERENCES public.anonymous_profiles(id) ON DELETE CASCADE,
    participant2_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant2_anonymous_profile_id UUID NOT NULL REFERENCES public.anonymous_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_anonymous_profile_id UUID NOT NULL REFERENCES public.anonymous_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Blocked Users Table
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_user_id, blocked_user_id)
);

-- 5. Grant Permissions
GRANT ALL ON public.conversation_requests TO anon, authenticated, service_role, postgres;
GRANT ALL ON public.conversations TO anon, authenticated, service_role, postgres;
GRANT ALL ON public.messages TO anon, authenticated, service_role, postgres;
GRANT ALL ON public.blocked_users TO anon, authenticated, service_role, postgres;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.conversation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: conversation_requests
DROP POLICY IF EXISTS "Participants can view conversation requests" ON public.conversation_requests;
CREATE POLICY "Participants can view conversation requests"
    ON public.conversation_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = requester_user_id OR auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS "Requesters can insert conversation requests" ON public.conversation_requests;
CREATE POLICY "Requesters can insert conversation requests"
    ON public.conversation_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = requester_user_id);

DROP POLICY IF EXISTS "Participants can update conversation requests" ON public.conversation_requests;
CREATE POLICY "Participants can update conversation requests"
    ON public.conversation_requests FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_user_id OR auth.uid() = requester_user_id);

-- 8. RLS Policies: conversations
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (auth.uid() = participant1_user_id OR auth.uid() = participant2_user_id);

DROP POLICY IF EXISTS "Participants can insert conversations" ON public.conversations;
CREATE POLICY "Participants can insert conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = participant1_user_id OR auth.uid() = participant2_user_id);

DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
    ON public.conversations FOR UPDATE
    TO authenticated
    USING (auth.uid() = participant1_user_id OR auth.uid() = participant2_user_id);

-- 9. RLS Policies: messages
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (auth.uid() = c.participant1_user_id OR auth.uid() = c.participant2_user_id)
        )
    );

DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
CREATE POLICY "Participants can insert messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_user_id
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND c.status = 'active'
              AND (auth.uid() = c.participant1_user_id OR auth.uid() = c.participant2_user_id)
        )
    );

-- 10. RLS Policies: blocked_users
DROP POLICY IF EXISTS "Users can manage blocks" ON public.blocked_users;
CREATE POLICY "Users can manage blocks"
    ON public.blocked_users FOR ALL
    TO authenticated
    USING (auth.uid() = blocker_user_id)
    WITH CHECK (auth.uid() = blocker_user_id);
