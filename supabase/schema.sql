-- ==========================================
-- ZKEST Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Wealth Passports
CREATE TABLE public.wealth_passports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    blockchain_passport_id NUMERIC, -- The ID from the Smart Contract
    network TEXT DEFAULT 'Arbitrum Sepolia',
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, REVOKED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Wallet Connections
CREATE TABLE public.wallet_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    blockchain TEXT NOT NULL,
    ownership_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, wallet_address)
);

-- 4. Exchange Connections
CREATE TABLE public.exchange_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    exchange_name TEXT NOT NULL,
    status TEXT DEFAULT 'CONNECTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, exchange_name)
);

-- 5. Assets
CREATE TABLE public.assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset_category TEXT NOT NULL, -- e.g., 'CRYPTO', 'LAND', 'VEHICLE'
    source_type TEXT NOT NULL,    -- 'WALLET', 'EXCHANGE', 'RWA'
    source_reference_id UUID,     -- Can point to wallet_connections.id or exchange_connections.id
    name TEXT NOT NULL,
    quantity NUMERIC,
    current_value_usd NUMERIC NOT NULL,
    valuation_status TEXT DEFAULT 'PENDING', -- PENDING, CURRENT, EXPIRED
    ownership_status TEXT DEFAULT 'PENDING', -- PENDING, VERIFIED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Asset Documents (For Real-World Assets)
CREATE TABLE public.asset_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    document_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Blockchain Attestations
CREATE TABLE public.blockchain_attestations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    passport_id UUID REFERENCES public.wealth_passports(id) ON DELETE CASCADE,
    attestation_hash TEXT NOT NULL,
    status TEXT DEFAULT 'CURRENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Proof Requests
CREATE TABLE public.proof_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    requester_name TEXT NOT NULL,
    requested_category TEXT NOT NULL,
    minimum_value NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, VERIFIED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Other tables: Users can only view/manage their own data
CREATE POLICY "Users can manage own passports" ON public.wealth_passports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own wallets" ON public.wallet_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own exchanges" ON public.exchange_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own assets" ON public.assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own asset documents" ON public.asset_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.assets WHERE assets.id = asset_documents.asset_id AND assets.user_id = auth.uid())
);
CREATE POLICY "Users can manage own attestations" ON public.blockchain_attestations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.assets WHERE assets.id = blockchain_attestations.asset_id AND assets.user_id = auth.uid())
);
CREATE POLICY "Users can manage own proof requests" ON public.proof_requests FOR ALL USING (auth.uid() = user_id);
