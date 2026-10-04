import { NextResponse } from 'next/server';
import { Reclaim } from '@reclaimprotocol/js-sdk';

export async function GET() {
  try {
    const APP_ID = process.env.NEXT_PUBLIC_RECLAIM_APP_ID;
    const APP_SECRET = process.env.RECLAIM_APP_SECRET;
    
    if (!APP_ID || !APP_SECRET) {
      return NextResponse.json({ error: "Missing Reclaim Env Vars" }, { status: 500 });
    }

    const reclaimClient = new Reclaim.ProofRequest(APP_ID);
    const signature = await reclaimClient.generateSignature(APP_SECRET);

    return NextResponse.json({ signature });
  } catch (error: any) {
    console.error("Reclaim Signature Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
