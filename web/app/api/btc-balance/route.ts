import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  
  if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

  try {
    // 1. Fetch balance from Mempool.space public API
    const res = await fetch(`https://mempool.space/api/address/${address}`);
    if (!res.ok) {
        throw new Error("Failed to fetch from Mempool API");
    }
    const data = await res.json();
    
    // Balance is sum of funded_txo_sum - spent_txo_sum (in satoshis)
    const satoshis = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum);
    const btcBalance = satoshis / 100000000;

    // 2. Get live BTC Price from CoinGecko
    let price = 60000; // Fallback
    try {
        const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`);
        const priceData = await priceRes.json();
        if (priceData.bitcoin?.usd) {
            price = priceData.bitcoin.usd;
        }
    } catch (e) {
        console.warn("Failed to fetch BTC price, using fallback");
    }

    return NextResponse.json({
        symbol: "BTC",
        balance: btcBalance.toString(),
        usdValue: btcBalance * price
    });
  } catch (error: any) {
     console.error("BTC fetch error", error);
     return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
