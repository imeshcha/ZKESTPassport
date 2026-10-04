import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: fetch existing passport for the logged-in user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('passports')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ passport: data });
}

// POST: create a new passport (called after generation)
export async function POST(request: Request) {
  const body = await request.json();
  const { user_id, passport_id, zk_proof_hash, rwa_total, crypto_total, grand_total } = body;

  if (!user_id || !passport_id) {
    return NextResponse.json({ error: 'user_id and passport_id are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('passports')
    .insert({
      user_id,
      passport_id,
      zk_proof_hash: zk_proof_hash || '0x0',
      rwa_total: rwa_total || 0,
      crypto_total: crypto_total || 0,
      grand_total: grand_total || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ passport: data });
}

// PATCH: update mint details after on-chain minting
export async function PATCH(request: Request) {
  const body = await request.json();
  const { user_id, minted_tx_hash, minted_wallet } = body;

  if (!user_id || !minted_tx_hash || !minted_wallet) {
    return NextResponse.json({ error: 'user_id, minted_tx_hash and minted_wallet are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('passports')
    .update({
      minted_tx_hash,
      minted_wallet,
      minted_at: new Date().toISOString(),
    })
    .eq('user_id', user_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ passport: data });
}
