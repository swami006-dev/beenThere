const fs = require('fs');
const path = require('path');
const { DEMO_EXPERIENCES } = require('../db/seedExperiences');
const embeddings = require('../db/experience_embeddings.json');

function escapeSqlString(str) {
  if (!str) return "''";
  return "'" + str.replace(/'/g, "''") + "'";
}

function escapeSqlArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "ARRAY[]::TEXT[]";
  const elements = arr.map(item => escapeSqlString(item)).join(', ');
  return `ARRAY[${elements}]::TEXT[]`;
}

function generateDeterministicUUID(index) {
  const hex = index.toString(16).padStart(12, '0');
  return `00000000-0000-4000-a000-${hex}`;
}

const lines = [];

lines.push(`-- ==============================================================================`);
lines.push(`-- Migration 002: Seed 36 Canonical Experience Cards with pgvector Embeddings`);
lines.push(`-- Idempotent, safe, and fixes match_experiences RPC column type definition.`);
lines.push(`-- ==============================================================================`);
lines.push(``);
lines.push(`-- 1. Ensure pgvector extension is enabled`);
lines.push(`CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;`);
lines.push(``);
lines.push(`-- 2. Ensure embedding column exists with 384 dimensions`);
lines.push(`ALTER TABLE public.experience_cards ADD COLUMN IF NOT EXISTS embedding extensions.vector(384);`);
lines.push(``);
lines.push(`-- 3. Make source_post_id nullable for canonical/seed experience cards`);
lines.push(`ALTER TABLE public.experience_cards ALTER COLUMN source_post_id DROP NOT NULL;`);
lines.push(``);
lines.push(`-- 4. Drop existing function (PostgreSQL requires DROP before changing RETURNS TABLE signature)`);
lines.push(`DROP FUNCTION IF EXISTS public.match_experiences CASCADE;`);
lines.push(``);
lines.push(`-- 5. Correct the match_experiences RPC definition (what_helped TEXT instead of TEXT[])`);
lines.push(`CREATE OR REPLACE FUNCTION public.match_experiences(`);
lines.push(`    query_embedding extensions.vector(384),`);
lines.push(`    match_threshold double precision DEFAULT 0.28,`);
lines.push(`    match_count INT DEFAULT 5`);
lines.push(`)`);
lines.push(`RETURNS TABLE (`);
lines.push(`    id UUID,`);
lines.push(`    created_at TIMESTAMPTZ,`);
lines.push(`    updated_at TIMESTAMPTZ,`);
lines.push(`    category TEXT,`);
lines.push(`    tags TEXT[],`);
lines.push(`    situation TEXT,`);
lines.push(`    what_helped TEXT,`);
lines.push(`    similarity double precision`);
lines.push(`)`);
lines.push(`LANGUAGE plpgsql`);
lines.push(`STABLE`);
lines.push(`SECURITY DEFINER`);
lines.push(`SET search_path = public, extensions`);
lines.push(`AS $$`);
lines.push(`BEGIN`);
lines.push(`    RETURN QUERY`);
lines.push(`    SELECT`);
lines.push(`        ec.id,`);
lines.push(`        ec.created_at,`);
lines.push(`        ec.updated_at,`);
lines.push(`        ec.category,`);
lines.push(`        ec.tags,`);
lines.push(`        ec.situation,`);
lines.push(`        ec.what_helped,`);
lines.push(`        (1 - (ec.embedding <=> query_embedding))::double precision AS similarity`);
lines.push(`    FROM public.experience_cards ec`);
lines.push(`    WHERE ec.embedding IS NOT NULL`);
lines.push(`      AND (1 - (ec.embedding <=> query_embedding)) >= match_threshold`);
lines.push(`    ORDER BY ec.embedding <=> query_embedding ASC`);
lines.push(`    LIMIT match_count;`);
lines.push(`END;`);
lines.push(`$$;`);
lines.push(``);
lines.push(`-- 6. Set Permissions and Row Level Security`);
lines.push(`ALTER TABLE public.experience_cards ENABLE ROW LEVEL SECURITY;`);
lines.push(``);
lines.push(`DROP POLICY IF EXISTS "Allow public read of experience cards" ON public.experience_cards;`);
lines.push(`CREATE POLICY "Allow public read of experience cards" ON public.experience_cards FOR SELECT USING (true);`);
lines.push(``);
lines.push(`DROP POLICY IF EXISTS "Allow authenticated insert of experience cards" ON public.experience_cards;`);
lines.push(`CREATE POLICY "Allow authenticated insert of experience cards" ON public.experience_cards FOR INSERT TO authenticated WITH CHECK (true);`);
lines.push(``);
lines.push(`DROP POLICY IF EXISTS "Allow authenticated update of experience cards" ON public.experience_cards;`);
lines.push(`CREATE POLICY "Allow authenticated update of experience cards" ON public.experience_cards FOR UPDATE TO authenticated USING (true);`);
lines.push(``);
lines.push(`DROP POLICY IF EXISTS "Allow all for experience cards" ON public.experience_cards;`);
lines.push(`CREATE POLICY "Allow all for experience cards" ON public.experience_cards FOR ALL USING (true) WITH CHECK (true);`);
lines.push(``);
lines.push(`GRANT ALL ON public.experience_cards TO anon, authenticated, service_role, postgres;`);
lines.push(`GRANT EXECUTE ON FUNCTION public.match_experiences(extensions.vector(384), double precision, INT) TO anon, authenticated, service_role;`);
lines.push(``);
lines.push(`-- 7. Seed 36 Canonical Experience Cards (Idempotent: ON CONFLICT (id) DO UPDATE)`);

DEMO_EXPERIENCES.forEach((exp, idx) => {
  const cardIndex = idx + 1;
  const uuid = generateDeterministicUUID(cardIndex);
  const embedKey = `seed-exp-${cardIndex}`;
  const vector = embeddings[embedKey];

  if (!vector || vector.length !== 384) {
    throw new Error(`Embedding missing for ${embedKey}`);
  }

  const fullSituationText = `Title: ${exp.title}. Excerpt: ${exp.excerpt}. Situation: ${exp.what_happened}`.trim();
  const whatHelpedText = Array.isArray(exp.what_helped) ? exp.what_helped.join('; ') : (exp.what_helped || '');
  const vectorStr = `'[${vector.join(',')}]'::extensions.vector(384)`;

  lines.push(`INSERT INTO public.experience_cards (id, category, tags, situation, what_helped, source_post_id, embedding, created_at, updated_at)`);
  lines.push(`VALUES (`);
  lines.push(`    ${escapeSqlString(uuid)}::UUID,`);
  lines.push(`    ${escapeSqlString(exp.category)},`);
  lines.push(`    ${escapeSqlArray(exp.tags)},`);
  lines.push(`    ${escapeSqlString(fullSituationText)},`);
  lines.push(`    ${escapeSqlString(whatHelpedText)},`);
  lines.push(`    NULL,`);
  lines.push(`    ${vectorStr},`);
  lines.push(`    NOW(),`);
  lines.push(`    NOW()`);
  lines.push(`)`);
  lines.push(`ON CONFLICT (id) DO UPDATE SET`);
  lines.push(`    category = EXCLUDED.category,`);
  lines.push(`    tags = EXCLUDED.tags,`);
  lines.push(`    situation = EXCLUDED.situation,`);
  lines.push(`    what_helped = EXCLUDED.what_helped,`);
  lines.push(`    source_post_id = EXCLUDED.source_post_id,`);
  lines.push(`    embedding = EXCLUDED.embedding,`);
  lines.push(`    updated_at = NOW();`);
  lines.push(``);
});

const outputPath = path.join(__dirname, '../db/migrations/002_seed_36_experience_cards_with_pgvector.sql');
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`Generated SQL migration file at: ${outputPath}`);
console.log(`Total cards included: ${DEMO_EXPERIENCES.length}`);
