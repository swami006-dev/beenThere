-- ==============================================================================
-- Migration 007: Production Master Persistence & RLS Schema
-- Purpose: Permanently create all production persistence tables in Supabase:
--          1. saved_items
--          2. post_reactions
--          3. conversation_requests
--          4. conversations
--          5. messages
--          6. blocked_users
--          and grant required permissions on posts, responses, and anonymous_profiles.
-- Idempotent, safe, and enforces strict Row Level Security (RLS).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BASE TABLE PERMISSIONS & ANONYMOUS PROFILES ACCESS
-- ------------------------------------------------------------------------------

-- Allow anon & authenticated roles to read posts, responses, and anonymous profiles
GRANT SELECT ON public.posts TO anon, authenticated, service_role, postgres;
GRANT SELECT ON public.responses TO anon, authenticated, service_role, postgres;
GRANT ALL ON public.anonymous_profiles TO anon, authenticated, service_role, postgres;

-- Ensure anyone can read anonymous profiles (persona only: display_name, avatar_key)
ALTER TABLE public.anonymous_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view anonymous profiles" ON public.anonymous_profiles;
CREATE POLICY "Anyone can view anonymous profiles"
    ON public.anonymous_profiles FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert own anonymous profile" ON public.anonymous_profiles;
CREATE POLICY "Users can insert own anonymous profile"
    ON public.anonymous_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own anonymous profile" ON public.anonymous_profiles;
CREATE POLICY "Users can update own anonymous profile"
    ON public.anonymous_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 2. SAVED ITEMS TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('experience', 'post')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

GRANT ALL ON public.saved_items TO anon, authenticated, service_role, postgres;

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved items" ON public.saved_items;
CREATE POLICY "Users can view own saved items"
    ON public.saved_items FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved items" ON public.saved_items;
CREATE POLICY "Users can insert own saved items"
    ON public.saved_items FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved items" ON public.saved_items;
CREATE POLICY "Users can update own saved items"
    ON public.saved_items FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved items" ON public.saved_items;
CREATE POLICY "Users can delete own saved items"
    ON public.saved_items FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 3. POST REACTIONS TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'helpful',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id, reaction_type)
);

GRANT ALL ON public.post_reactions TO anon, authenticated, service_role, postgres;

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view post reactions" ON public.post_reactions;
CREATE POLICY "Anyone can view post reactions"
    ON public.post_reactions FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert own post reactions" ON public.post_reactions;
CREATE POLICY "Users can insert own post reactions"
    ON public.post_reactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own post reactions" ON public.post_reactions;
CREATE POLICY "Users can delete own post reactions"
    ON public.post_reactions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 4. CONVERSATION REQUESTS TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_post_id TEXT NOT NULL,
    requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_anonymous_profile_id UUID NOT NULL REFERENCES public.anonymous_profiles(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_anonymous_profile_id UUID REFERENCES public.anonymous_profiles(id) ON DELETE SET NULL,
    message TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON public.conversation_requests TO anon, authenticated, service_role, postgres;

ALTER TABLE public.conversation_requests ENABLE ROW LEVEL SECURITY;

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
    USING (auth.uid() = recipient_user_id OR auth.uid() = requester_user_id)
    WITH CHECK (auth.uid() = recipient_user_id OR auth.uid() = requester_user_id);


-- ------------------------------------------------------------------------------
-- 5. CONVERSATIONS TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.conversation_requests(id) ON DELETE SET NULL,
    experience_post_id TEXT NOT NULL,
    participant1_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant1_anonymous_profile_id UUID NOT NULL REFERENCES public.anonymous_profiles(id) ON DELETE CASCADE,
    participant2_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant2_anonymous_profile_id UUID NOT NULL REFERENCES public.anonymous_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

GRANT ALL ON public.conversations TO anon, authenticated, service_role, postgres;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

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
    USING (auth.uid() = participant1_user_id OR auth.uid() = participant2_user_id)
    WITH CHECK (auth.uid() = participant1_user_id OR auth.uid() = participant2_user_id);


-- ------------------------------------------------------------------------------
-- 6. MESSAGES TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_anonymous_profile_id UUID NOT NULL REFERENCES public.anonymous_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON public.messages TO anon, authenticated, service_role, postgres;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

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


-- ------------------------------------------------------------------------------
-- 7. BLOCKED USERS TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_user_id, blocked_user_id)
);

GRANT ALL ON public.blocked_users TO anon, authenticated, service_role, postgres;

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage blocks" ON public.blocked_users;
CREATE POLICY "Users can manage blocks"
    ON public.blocked_users FOR ALL
    TO authenticated
    USING (auth.uid() = blocker_user_id)
    WITH CHECK (auth.uid() = blocker_user_id);
