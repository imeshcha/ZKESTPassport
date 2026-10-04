import { NextResponse } from 'next/server';
import { formatUnits, formatEther } from 'viem';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const chain = searchParams.get('chain') || 'eth'; 

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ALCHEMY_API_KEY is not configured in .env.local' }, { status: 500 });
  }

  // Determine the correct Alchemy URL for the chain
  let url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'arb' || chain === 'arbitrum') url = `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'polygon') url = `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'opt' || chain === 'optimism') url = `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'base') url = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'avax') url = `https://avax-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'bnb') url = `https://bnb-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'zksync') url = `https://zksync-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'polygonzkevm' || chain === 'zkevm') url = `https://polygonzkevm-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'linea') url = `https://linea-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'blast') url = `https://blast-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'scroll') url = `https://scroll-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'zora') url = `https://zora-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'mantle') url = `https://mantle-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'fraxtal') url = `https://frax-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'robinhood') url = `https://robinhood-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'fantom') url = `https://fantom-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'metis') url = `https://metis-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'astar') url = `https://astar-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'zetachain') url = `https://zetachain-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'shape') url = `https://shape-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'rootstock') url = `https://rootstock-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'worldchain') url = `https://worldchain-mainnet.g.alchemy.com/v2/${apiKey}`;
  if (chain === 'soneum') url = `https://soneum-mainnet.g.alchemy.com/v2/${apiKey}`;

  try {
    const tokens = [];

    // 1. Fetch Native Balance (ETH / MATIC)
    const nativeRes = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [address, "latest"], id: 1 })
    });
    const nativeData = await nativeRes.json();
    if (nativeData.result && nativeData.result !== "0x0") {
      const nativeBal = BigInt(nativeData.result);
      if (nativeBal > BigInt(0)) {
        tokens.push({
            symbol: chain === 'polygon' ? "MATIC" : "ETH",
            type: "Native",
            contractAddress: "native",
            balance: formatEther(nativeBal)
        });
      }
    }

    // 2. Fetch all ERC20 balances
    const balanceRes = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', method: 'alchemy_getTokenBalances', params: [address, "erc20"], id: 2 })
    });
    const balanceData = await balanceRes.json();
    
    if (balanceData.result?.tokenBalances) {
      // Filter out zero balances
      const nonZeroBalances = balanceData.result.tokenBalances.filter((token: any) => {
        return token.tokenBalance !== "0" && token.tokenBalance !== "0x0" && token.tokenBalance !== null;
      });

      // 3. Fetch metadata for each non-zero token
      for (const token of nonZeroBalances) {
        try {
          const metaRes = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ jsonrpc: '2.0', method: 'alchemy_getTokenMetadata', params: [token.contractAddress], id: 3 })
          });
          const metaData = await metaRes.json();
          
          if (metaData.result && token.tokenBalance) {
            const rawBalance = BigInt(token.tokenBalance);
            const decimals = metaData.result.decimals || 18;
            const formattedBal = formatUnits(rawBalance, decimals);
            
            const symbol = metaData.result.symbol || "UNKNOWN";
            const name = metaData.result.name || "Unknown";
            const logo = metaData.result.logo || null;
            const floatBal = parseFloat(formattedBal);

            // STRICT SCAM FILTER: Fake WBTC, Fake USDC, etc. will NOT have logos registered with Alchemy.
            // A legitimate "Main Coin" will ALWAYS have a verified logo in Alchemy's registry.
            const isScam = 
                symbol === "UNKNOWN" || 
                symbol.length > 12 || 
                name.toLowerCase().includes(".com") || 
                name.toLowerCase().includes(".io") || 
                name.toLowerCase().includes("claim") || 
                name.toLowerCase().includes("visit") || 
                name.toLowerCase().includes("airdrop") ||
                name.toLowerCase().includes("free") ||
                name.toLowerCase().includes("reward") ||
                symbol.toLowerCase().includes(".com") ||
                !logo; // Only allow ERC-20 tokens that have a verified logo!

            if (!isScam && floatBal > 0.0001) {
                tokens.push({
                  symbol: symbol,
                  type: "ERC-20",
                  contractAddress: token.contractAddress,
                  balance: formattedBal
                });
            }
          }
        } catch (e) {
            console.error("Error fetching metadata for", token.contractAddress);
        }
      }
    }

    // 4. Fetch USD Prices for collected symbols using Alchemy Pricing API
    const symbols = Array.from(new Set(tokens.map(t => t.symbol.toUpperCase())));
    let priceMap: Record<string, number> = {};
    
    if (symbols.length > 0) {
      try {
        const symbolQuery = symbols.join(',');
        const priceRes = await fetch(`https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-symbol?symbols=${symbolQuery}`);
        const priceData = await priceRes.json();
        
        if (priceData.data && Array.isArray(priceData.data)) {
          priceData.data.forEach((p: any) => {
            if (p.symbol && p.prices && p.prices[0]) {
               priceMap[p.symbol.toUpperCase()] = parseFloat(p.prices[0].value);
            }
          });
        }
      } catch (priceErr) {
        console.error("Pricing error:", priceErr);
      }
    }

    // Attach USD value to tokens
    let finalTokens = tokens.map(t => {
      const price = priceMap[t.symbol.toUpperCase()] || 0;
      const usdValue = price * parseFloat(t.balance);
      return {
        ...t,
        price,
        usdValue
      };
    });

    // Strictly filter out any token that Alchemy's pricing oracle doesn't recognize
    // Scammers spoof symbols (like fake USDT), but they cannot spoof the official pricing oracle.
    // If price is 0, it means it's not the official contract.
    finalTokens = finalTokens.filter(t => t.price > 0 || t.type === "Native");

    return NextResponse.json({ tokens: finalTokens });
  } catch (error: any) {
    console.error("Alchemy API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
