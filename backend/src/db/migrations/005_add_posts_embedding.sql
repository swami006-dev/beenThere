-- ==============================================================================
-- Migration 005: Add pgvector Embedding to Student Posts & Match Posts RPC
-- Idempotent, safe, and extends semantic search to real student reflections.
-- ==============================================================================

-- 1. Ensure embedding column exists on posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS embedding extensions.vector(384);

-- 2. Create index on posts embedding for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_posts_embedding ON public.posts USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- 3. Stored Procedure: match_posts
-- Searches real student posts excluding a specific post (the current user's post)
CREATE OR REPLACE FUNCTION public.match_posts(
    query_embedding extensions.vector(384),
    match_threshold double precision DEFAULT 0.28,
    match_count INT DEFAULT 5,
    exclude_post_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    anonymous_profile_id UUID,
    content TEXT,
    category TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    similarity double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.anonymous_profile_id,
        p.content,
        p.category,
        p.status,
        p.created_at,
        (1 - (p.embedding <=> query_embedding))::double precision AS similarity
    FROM public.posts p
    WHERE p.status = 'approved'
      AND p.embedding IS NOT NULL
      AND (exclude_post_id IS NULL OR p.id <> exclude_post_id)
      AND (1 - (p.embedding <=> query_embedding)) >= match_threshold
    ORDER BY p.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.match_posts(extensions.vector(384), double precision, INT, UUID) TO anon, authenticated, service_role;
