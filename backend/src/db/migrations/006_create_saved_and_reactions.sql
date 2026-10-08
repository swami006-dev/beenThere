-- ==============================================================================
-- Migration 006: Create Saved Items and Post Reactions Tables with RLS
-- Idempotent, safe, and guarantees data isolation per user.
-- ==============================================================================

-- 1. Saved Items Table
CREATE TABLE IF NOT EXISTS public.saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('experience', 'post')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- 2. Post Reactions Table
CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'helpful',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id, reaction_type)
);

-- 3. Grant Permissions
GRANT ALL ON public.saved_items TO anon, authenticated, service_role, postgres;
GRANT ALL ON public.post_reactions TO anon, authenticated, service_role, postgres;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: saved_items
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

DROP POLICY IF EXISTS "Users can delete own saved items" ON public.saved_items;
CREATE POLICY "Users can delete own saved items"
    ON public.saved_items FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 6. RLS Policies: post_reactions
DROP POLICY IF EXISTS "Anyone can view post reactions" ON public.post_reactions;
CREATE POLICY "Anyone can view post reactions"
    ON public.post_reactions FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can manage own post reactions" ON public.post_reactions;
CREATE POLICY "Users can manage own post reactions"
    ON public.post_reactions FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
