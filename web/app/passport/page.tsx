"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { useRouter } from "next/navigation";
import {
  Shield, Fingerprint, Activity, Hash, CheckCircle2,
  ArrowRight, Wallet, Loader2, Zap, ExternalLink, Copy,
  AlertCircle, RefreshCw
} from "lucide-react";
import { createWalletClient, createPublicClient, custom, http, parseAbi } from "viem";
import { arbitrumSepolia } from "viem/chains";

// ─── Contract config ─────────────────────────────────────────────────────────
// Deploy ZKESTPassport.sol to Arbitrum and paste the address here (or in .env)
const SBT_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_SBT_CONTRACT_ADDRESS || "") as `0x${string}`;

const SBT_ABI = parseAbi([
  "function mint(string calldata passportId, string calldata zkProofHash, uint256 grandTotalUSD) external",
  "function updatePassport(string calldata newZkProofHash, uint256 newGrandTotalUSD) external",
  "function walletToTokenId(address) external view returns (uint256)",
  "function passportData(uint256) external view returns (string passportId, string zkProofHash, uint256 grandTotalUSD, uint256 mintedAt)",
]);
// ─────────────────────────────────────────────────────────────────────────────

export default function PassportPage() {
  const [user, setUser] = useState<any>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [passport, setPassport] = useState<any>(null);

  // Wallet connection for minting
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  // Mint state
  const [isMinting, setIsMinting] = useState(false);
  const [mintStep, setMintStep] = useState(0);
  const [mintDone, setMintDone] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // UI
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setUser(session.user);

      // Load passport from DB
      const { data: passportData } = await supabase
        .from('passports')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
        
      if (passportData) {
        setPassport(passportData);
        if (passportData.minted_tx_hash) {
          setTxHash(passportData.minted_tx_hash);
          setMintDone(true);
        }
      }

      // Load connected wallets from Supabase
      const { data } = await supabase
        .from("wallet_connections")
        .select("*")
        .eq("user_id", session.user.id);
      if (data && data.length > 0) {
        const evmWallets = data.filter((w: any) => w.wallet_address?.startsWith("0x"));
        setWallets(evmWallets);
        if (evmWallets.length > 0) setSelectedWalletId(evmWallets[0].id);
      }
    };
    init();
  }, [router]);

  const copyPassportId = () => {
    if (!passport?.passport_id) return;
    navigator.clipboard.writeText(passport.passport_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Connect the selected wallet via MetaMask
  const connectSelectedWallet = async () => {
    const w = window as any;
    if (!w.ethereum) {
      alert("MetaMask not found. Please install MetaMask.");
      return;
    }
    try {
      const accounts = await w.ethereum.request({ method: "eth_requestAccounts" });
      setConnectedAddress(accounts[0]);

      // Switch to Arbitrum
      try {
        await w.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x66eee" }], // Arbitrum One
        });
      } catch (switchErr: any) {
        // Add Arbitrum if not present
        if (switchErr.code === 4902) {
          await w.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x66eee",
              chainName: "Arbitrum Sepolia",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
              blockExplorerUrls: ["https://sepolia.arbiscan.io"],
            }],
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Wallet connection failed: " + (err.message || "Unknown error"));
    }
  };

  const mintSBT = async () => {
    if (!passport) return alert("No passport found. Generate one from the Dashboard first.");
    if (!connectedAddress) return alert("Please connect your wallet first.");
    if (!SBT_CONTRACT_ADDRESS) {
      alert("Smart contract not deployed yet.\n\nPlease deploy ZKESTPassport.sol to Arbitrum and add the address to NEXT_PUBLIC_SBT_CONTRACT_ADDRESS in .env.local");
      return;
    }

    // Verify the connected address matches a saved wallet
    const selectedWallet = wallets.find(w => w.id === selectedWalletId);
    if (selectedWallet && selectedWallet.wallet_address.toLowerCase() !== connectedAddress.toLowerCase()) {
      alert(`Connected wallet (${connectedAddress.substring(0, 8)}...) doesn't match selected wallet (${selectedWallet.wallet_address.substring(0, 8)}...). Please connect the correct wallet.`);
      return;
    }

    setIsMinting(true);
    setMintStep(0);
    setMintDone(false);
    setMintError(null);
    setTxHash(null);

    try {
      const w = window as any;

      // Step 1
      setMintStep(1);
      await new Promise(r => setTimeout(r, 600));

      // Create viem wallet client using the browser provider
      const walletClient = createWalletClient({
        chain: arbitrumSepolia,
        transport: custom(w.ethereum),
      });
      const publicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http("https://sepolia-rollup.arbitrum.io/rpc"),
      });

      // Step 2 - Check if already minted
      setMintStep(2);
      const existingTokenId = await publicClient.readContract({
        address: SBT_CONTRACT_ADDRESS,
        abi: SBT_ABI,
        functionName: "walletToTokenId",
        args: [connectedAddress as `0x${string}`],
      });

      const isUpdate = existingTokenId && existingTokenId > BigInt(0);

      // Step 3 - Prepare tx
      setMintStep(3);
      await new Promise(r => setTimeout(r, 400));

      const grandTotalUSD = BigInt(Math.floor(Number(passport.grand_total)));

      // Step 4 - Broadcast transaction (user pays gas from MetaMask popup)
      setMintStep(4);
      let hash;
      
      if (isUpdate) {
        hash = await walletClient.writeContract({
          address: SBT_CONTRACT_ADDRESS,
          abi: SBT_ABI,
          functionName: "updatePassport",
          args: [passport.zk_proof_hash, grandTotalUSD],
          account: connectedAddress as `0x${string}`,
        });
      } else {
        hash = await walletClient.writeContract({
          address: SBT_CONTRACT_ADDRESS,
          abi: SBT_ABI,
          functionName: "mint",
          args: [passport.passport_id, passport.zk_proof_hash, grandTotalUSD],
          account: connectedAddress as `0x${string}`,
        });
      }

      // Step 5 - Wait for confirmation
      setMintStep(5);
      await publicClient.waitForTransactionReceipt({ hash });

      // Save to DB
      await supabase
        .from('passports')
        .update({
          minted_tx_hash: hash,
          minted_wallet: connectedAddress,
          minted_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      setTxHash(hash);
      setMintDone(true);
      setPassport((prev: any) => ({ ...prev, minted_tx_hash: hash, minted_wallet: connectedAddress }));
    } catch (err: any) {
      console.error("Mint error:", err);
      setMintError(err.shortMessage || err.message || "Transaction failed. Check console.");
    } finally {
      setIsMinting(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-sm font-medium text-gray-500 uppercase tracking-widest">
      Loading Passport...
    </div>
  );

  const passportId = passport?.passport_id || "—";
  const alreadyMinted = !!(passport?.minted_tx_hash);

  return (
    <div className="min-h-screen w-full bg-[#fafafa] relative pb-24 pt-24 md:pt-32 px-4 md:px-8">
      <div
        className="absolute inset-0 z-0 opacity-[0.1]"
        style={{ backgroundImage: 'radial-gradient(#000000 2px, transparent 2px)', backgroundSize: '40px 40px' }}
      />

      <div className="max-w-[80rem] mx-auto space-y-10 relative z-10">

        <div className="text-center space-y-3 mb-2">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-black">Your Wealth Passport</h2>
          <p className="text-gray-500 font-medium max-w-2xl mx-auto">
            Your decentralized financial identity. Mint it as a Soul-Bound Token on Arbitrum to make it permanently verifiable on-chain.
          </p>
        </div>

        {/* No passport yet */}
        {!passport && (
          <div className="max-w-lg mx-auto bg-yellow-50 border border-yellow-200 rounded-3xl p-8 text-center">
            <AlertCircle size={32} className="text-yellow-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-black mb-2">No Passport Generated Yet</h3>
            <p className="text-gray-600 text-sm font-medium mb-6">Go to your Dashboard, connect your wallets and add your RWAs, then click "Generate ZK Passport".</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 mx-auto bg-[#111111] text-white font-bold uppercase text-[11px] tracking-widest py-3 px-8 rounded-full hover:bg-[#ff5a1f] transition"
            >
              <ArrowRight size={14} /> Go to Dashboard
            </button>
          </div>
        )}

        {passport && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

            {/* Left: Passport Card */}
            <div className="space-y-4">
              <div className="bg-[#ff5a1f] text-white p-10 shadow-2xl rounded-3xl relative overflow-hidden">
                <div className="absolute -right-20 -top-20 opacity-10">
                  <Shield size={350} className="text-white" />
                </div>

                <div className="flex justify-between items-start mb-10 relative z-10">
                  <div>
                    <p className="text-white/60 text-[10px] font-bold tracking-widest uppercase mb-1">Decentralized Identity</p>
                    <h3 className="text-3xl font-bold tracking-tight text-white">zkest passport</h3>
                  </div>
                  <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                    <Fingerprint className="text-white" size={32} />
                  </div>
                </div>

                <div className="space-y-5 relative z-10">
                  <div>
                    <p className="text-white/60 font-bold text-[10px] uppercase tracking-widest mb-1">Passport ID</p>
                    <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/10">
                      <p className="font-mono text-xl font-bold tracking-widest">{passportId}</p>
                      <button onClick={copyPassportId} className="ml-auto bg-white/10 hover:bg-white/20 p-2 rounded-lg transition">
                        {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} className="text-white/60" />}
                      </button>
                    </div>
                    <p className="text-white/40 text-[10px] mt-1">Share this ID with verification parties</p>
                  </div>

                  <div>
                    <p className="text-white/60 font-bold text-[10px] uppercase tracking-widest mb-1">Owner</p>
                    <p className="font-mono text-xs break-all bg-black/20 p-3 rounded-xl border border-white/10">{user.id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/60 font-bold text-[10px] uppercase tracking-widest mb-1">Network</p>
                      <div className="flex items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/10">
                        <Activity size={12} className="text-white/80" />
                        <span className="font-bold text-xs uppercase">Arbitrum</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-white/60 font-bold text-[10px] uppercase tracking-widest mb-1">Standard</p>
                      <div className="flex items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/10">
                        <Hash size={12} className="text-white/80" />
                        <span className="font-bold text-xs uppercase">ERC-5192</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-white/60 font-bold text-[10px] uppercase tracking-widest mb-1">Status</p>
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${alreadyMinted ? "bg-green-500/20 border-green-500/30" : "bg-white/10 border-white/20"}`}>
                      <CheckCircle2 size={14} className={alreadyMinted ? "text-green-300" : "text-white"} />
                      <span className="font-bold text-xs uppercase">{alreadyMinted ? "✓ Minted On Arbitrum" : "Ready to Mint"}</span>
                    </div>
                  </div>

                  {alreadyMinted && passport.minted_wallet && (
                    <div>
                      <p className="text-white/60 font-bold text-[10px] uppercase tracking-widest mb-1">Minted From</p>
                      <p className="font-mono text-xs break-all bg-black/20 p-3 rounded-xl border border-white/10">{passport.minted_wallet}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Net Worth Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "RWA", value: `$${Number(passport.rwa_total).toLocaleString()}` },
                  { label: "Crypto", value: `$${Number(passport.crypto_total).toLocaleString()}` },
                  { label: "Total", value: `$${Number(passport.grand_total).toLocaleString()}` },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{s.label}</p>
                    <p className="font-bold text-sm text-black">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Mint Panel */}
            <div className="space-y-6">
              {alreadyMinted ? (
                /* Already minted — show receipt */
                <div className="bg-white p-8 border border-gray-100 shadow-sm rounded-3xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-green-50 p-3 rounded-full"><CheckCircle2 size={24} className="text-green-500" /></div>
                    <div>
                      <h3 className="font-bold text-xl text-black">SBT Minted</h3>
                      <p className="text-gray-500 text-sm">Your passport is permanently recorded on Arbitrum.</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3 font-mono text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">passport_id:</span><span className="font-bold">{passportId}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">network:</span><span className="font-bold">Arbitrum One</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">standard:</span><span className="font-bold">ERC-5192 (SBT)</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">transferable:</span><span className="font-bold text-red-500">false</span></div>
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-gray-400">tx_hash:</span>
                      <p className="font-bold break-all mt-1">{passport.minted_tx_hash}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${passport.minted_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-[#111111] text-white font-bold uppercase text-[11px] tracking-widest py-4 rounded-full hover:bg-[#ff5a1f] transition"
                    >
                      <ExternalLink size={14} /> View on Arbiscan
                    </a>
                    
                    <button
                      onClick={async () => {
                        // Pre-select the minted wallet
                        const mintedWallet = wallets.find(w => w.wallet_address.toLowerCase() === passport.minted_wallet?.toLowerCase());
                        if (mintedWallet) setSelectedWalletId(mintedWallet.id);
                        setPassport((prev: any) => ({...prev, minted_tx_hash: null})); // Hide receipt to show mint panel
                      }}
                      className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-700 font-bold uppercase text-[11px] tracking-widest py-4 rounded-full hover:bg-gray-50 transition"
                    >
                      <RefreshCw size={14} /> Update On-Chain SBT
                    </button>
                  </div>
                </div>
              ) : (
                /* Mint panel */
                <div className="bg-white p-8 border border-gray-100 shadow-sm rounded-3xl">
                  <h3 className="font-bold text-xl text-black mb-2">Mint Soul-Bound Token</h3>
                  <p className="text-gray-500 text-sm font-medium mb-6">Select a wallet, connect it, and mint your ZK Passport as an SBT on Arbitrum. Gas fees are paid from your wallet.</p>

                  {/* Wallet Selector */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Select Minting Wallet</label>
                      {wallets.length === 0 ? (
                        <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center">
                          <p className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">No EVM wallets connected</p>
                          <button onClick={() => router.push("/dashboard")} className="text-[#ff5a1f] font-bold text-xs hover:underline">Connect a wallet on Dashboard →</button>
                        </div>
                      ) : (
                        <select
                          value={selectedWalletId}
                          onChange={e => {
                            setSelectedWalletId(e.target.value);
                            setConnectedAddress(null); // reset connection when selection changes
                          }}
                          className="w-full bg-gray-50 border border-gray-200 text-sm font-mono font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-[#ff5a1f] transition"
                        >
                          {wallets.map((w: any) => (
                            <option key={w.id} value={w.id}>
                              {w.wallet_name} — {w.wallet_address.substring(0, 10)}...{w.wallet_address.substring(w.wallet_address.length - 6)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Connect Wallet Button */}
                    {wallets.length > 0 && (
                      <button
                        onClick={connectSelectedWallet}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-bold uppercase text-xs tracking-widest transition ${
                          connectedAddress
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:border-[#ff5a1f] hover:text-[#ff5a1f]"
                        }`}
                      >
                        <Wallet size={14} />
                        {connectedAddress
                          ? `Connected: ${connectedAddress.substring(0, 8)}...${connectedAddress.substring(connectedAddress.length - 4)}`
                          : "Connect Wallet (MetaMask)"}
                      </button>
                    )}
                  </div>

                  {/* SBT Metadata Preview */}
                  <div className="mb-6 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">SBT Metadata (Will be stored on-chain)</p>
                    <div className="space-y-2 font-mono text-xs text-gray-600">
                      <div className="flex justify-between gap-4"><span className="text-gray-400 flex-shrink-0">passport_id:</span><span className="font-bold text-black text-right">{passportId}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-gray-400 flex-shrink-0">minting_wallet:</span><span className="font-bold text-black text-right">{connectedAddress ? `${connectedAddress.substring(0, 8)}...` : "not connected"}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-gray-400 flex-shrink-0">network:</span><span className="font-bold text-black">Arbitrum One</span></div>
                      <div className="flex justify-between gap-4"><span className="text-gray-400 flex-shrink-0">standard:</span><span className="font-bold text-black">ERC-5192 (SBT)</span></div>
                      <div className="flex justify-between gap-4"><span className="text-gray-400 flex-shrink-0">zk_proof_hash:</span><span className="font-bold text-black text-right break-all">{passport.zk_proof_hash?.substring(0, 18)}...</span></div>
                      <div className="flex justify-between gap-4"><span className="text-gray-400 flex-shrink-0">grand_total_usd:</span><span className="font-bold text-black">${Number(passport.grand_total).toLocaleString()}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-gray-400 flex-shrink-0">transferable:</span><span className="font-bold text-red-500">false</span></div>
                    </div>
                  </div>

                  {mintError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                      <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-red-600 text-sm font-medium">{mintError}</p>
                    </div>
                  )}

                  <button
                    onClick={mintSBT}
                    disabled={isMinting || wallets.length === 0 || !connectedAddress}
                    className="w-full flex items-center justify-center gap-3 bg-[#111111] text-white font-bold uppercase text-[11px] tracking-widest py-4 rounded-full hover:bg-[#ff5a1f] transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isMinting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    {isMinting ? "Minting on Arbitrum..." : "Mint SBT on Arbitrum"}
                  </button>
                  {!connectedAddress && wallets.length > 0 && (
                    <p className="text-center text-gray-400 text-xs font-medium mt-2">Connect your wallet above before minting</p>
                  )}
                </div>
              )}

              {/* Mint Progress terminal */}
              {(isMinting || (mintDone && !alreadyMinted)) && (
                <div className="bg-[#0d0d0d] p-6 rounded-3xl border border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-5">Arbitrum Transaction</p>
                  <div className="space-y-3 font-mono mb-4">
                    {[
                      "Connecting to Arbitrum mainnet...",
                      "Checking existing SBT on-chain...",
                      "Preparing contract call data...",
                      "Broadcasting transaction (confirm in MetaMask)...",
                      "Waiting for on-chain confirmation...",
                    ].map((label, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {mintStep < i + 1 ? (
                          <div className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0" />
                        ) : mintStep === i + 1 && isMinting ? (
                          <Loader2 size={12} className="text-[#ff5a1f] animate-spin flex-shrink-0" />
                        ) : (
                          <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />
                        )}
                        <p className={`text-xs ${mintStep >= i + 1 ? "text-white" : "text-white/20"}`}>{label}</p>
                      </div>
                    ))}
                  </div>
                  {txHash && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mt-4">
                      <p className="text-green-400 font-bold text-[10px] uppercase tracking-widest mb-2">SBT Minted Successfully!</p>
                      <p className="text-white/40 text-[10px] font-mono break-all mb-3">Tx: {txHash}</p>
                      <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#ff5a1f] font-bold text-[10px] uppercase tracking-wider hover:underline">
                        <ExternalLink size={12} /> View on Arbiscan
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

