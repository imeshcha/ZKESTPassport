-- ============================================================
-- Run this SQL in your Supabase SQL Editor
-- Table: passports
-- ============================================================

CREATE TABLE IF NOT EXISTS public.passports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passport_id TEXT UNIQUE NOT NULL,
  zk_proof_hash TEXT NOT NULL,
  rwa_total NUMERIC(20, 4) DEFAULT 0,
  crypto_total NUMERIC(20, 4) DEFAULT 0,
  grand_total NUMERIC(20, 4) DEFAULT 0,
  minted_tx_hash TEXT,
  minted_wallet TEXT,
  minted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)  -- One passport per user
);

ALTER TABLE public.passports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own passport
CREATE POLICY "Users can view own passport"
  ON public.passports FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only create their own passport
CREATE POLICY "Users can insert own passport"
  ON public.passports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own passport
CREATE POLICY "Users can update own passport"
  ON public.passports FOR UPDATE
  USING (auth.uid() = user_id);
