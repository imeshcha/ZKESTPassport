import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const chain = searchParams.get('chain') || 'eth'; // eth, polygon, arbitrum

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MORALIS_API_KEY is not configured in .env.local' }, { status: 500 });
  }

  try {
    const url = `https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=${chain}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Moralis API responded with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ tokens: data });
  } catch (error: any) {
    console.error("Token fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
