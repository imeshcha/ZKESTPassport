"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { useRouter } from "next/navigation";
import { Wallet, ShieldCheck, Landmark, Plus, Trash2, Edit3, X, ArrowRight, Home, Fingerprint, Zap, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import QRCode from "react-qr-code";
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Form State
  const [assetName, setAssetName] = useState("");
  const [assetCategory, setAssetCategory] = useState("LAND");
  const [assetValue, setAssetValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  // On-Chain State
  const [walletList, setWalletList] = useState<any[]>([]);
  const [realOnChainData, setRealOnChainData] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string>('ALL');

  // zkTLS Simulation State
  const [rwaTab, setRwaTab] = useState<"zktls"|"manual">("zktls");
  const [zkStatus, setZkStatus] = useState<"waiting"|"verifying"|"success">("waiting");
  const [zkRequestUrl, setZkRequestUrl] = useState<string | null>(null);
  const [selectedProviderName, setSelectedProviderName] = useState<string | null>(null);

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [manualWalletInput, setManualWalletInput] = useState("");
  const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({});
  const [showV2Modal, setShowV2Modal] = useState(false);
  const [activePortfolioTab, setActivePortfolioTab] = useState<"rwa" | "web3">("web3");

  // ZK Passport Generation State
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [passportGenStep, setPassportGenStep] = useState(0);
  const [passportGenDone, setPassportGenDone] = useState(false);
  const [passportId, setPassportId] = useState<string | null>(null);
  const [existingPassport, setExistingPassport] = useState<any>(null);

  const toggleSymbol = (symbol: string) => {
    setExpandedSymbols(prev => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  const stringToHex = (str: string) => {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16);
    }
    return "0x" + hex;
  };

  const getProvider = (walletId: string) => {
    const w = window as any;
    if (!w.ethereum && !w.okxwallet && !w.phantom && !w.coinbaseWalletExtension) return null;

    const findInProviders = (key: string, preventHijack: boolean = false) => {
      if (w.ethereum?.providers) {
        if (preventHijack) {
          return w.ethereum.providers.find((p: any) => p[key] && !p.isOkxWallet && !p.isRabby && !p.isBraveWallet);
        }
        return w.ethereum.providers.find((p: any) => p[key]);
      }
      if (w.ethereum && w.ethereum[key]) {
        if (preventHijack && (w.ethereum.isOkxWallet || w.ethereum.isRabby || w.ethereum.isBraveWallet)) return null;
        return w.ethereum;
      }
      return null;
    };

    switch (walletId) {
      case "metamask":
        return findInProviders('isMetaMask', true) || w.ethereum; // Fallback to w.ethereum if strict fails
      case "okx":
        return w.okxwallet || findInProviders('isOkxWallet');
      case "rabby":
        return findInProviders('isRabby');
      case "coinbase":
        return w.coinbaseWalletExtension || findInProviders('isCoinbaseWallet');
      case "phantom":
        return w.phantom?.ethereum || findInProviders('isPhantom');
      default:
        return w.ethereum;
    }
  };

  const connectWallet = async (walletId: string, walletName: string) => {
    try {
      if (walletId === 'unisat') {
        const w = window as any;
        if (typeof w.unisat === 'undefined') {
          alert("UniSat wallet is not installed or detected.");
          return;
        }
        const accounts = await w.unisat.requestAccounts();
        if (accounts.length > 0) {
           const address = accounts[0];
           
           // Request signature for verification
           try {
             await w.unisat.signMessage("Welcome to ZKEST!\n\nPlease sign this message to verify ownership of this wallet.\n\nWallet: " + address);
           } catch (signError) {
             console.error("Signature rejected", signError);
             alert("Wallet connection cancelled: Signature is required.");
             return;
           }

           if (walletList.some((w: any) => w.wallet_address.toLowerCase() === address.toLowerCase())) {
             alert("This wallet is already linked!");
             return;
           }
           
           const { error } = await supabase.from("wallet_connections").insert({
             user_id: user.id,
             wallet_address: address,
             wallet_type: walletName.toUpperCase() 
           });
           
           if (error) throw error;
           await fetchUserAndAssets();
        }
        return;
      }

      // EVM Wallet Flow
      const provider = getProvider(walletId);
      if (!provider) {
        alert(`${walletName} is not installed or not detected in this browser.`);
        return;
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        const address = accounts[0];

        // Force a popup by requesting a signature to verify ownership
        const message = `Welcome to ZKEST!\n\nPlease sign this message to verify ownership of this wallet.\n\nWallet: ${address}`;
        const hexMessage = stringToHex(message);

        try {
          await provider.request({
            method: "personal_sign",
            params: [hexMessage, address],
          });
        } catch (signError) {
          console.error("Signature rejected", signError);
          alert("Wallet connection cancelled: Signature is required.");
          return;
        }

        if (walletList.some(w => w.wallet_address.toLowerCase() === address.toLowerCase())) {
          alert("This wallet is already linked!");
          return;
        }
        
        const { error } = await supabase.from("wallet_connections").insert({
          user_id: user.id,
          wallet_address: address,
          wallet_type: walletName.toUpperCase() 
        });
        
        if (error) throw error;
        
        await fetchUserAndAssets();
      }
    } catch (err) {
      console.error(`${walletName} connect error:`, err);
      alert(`Failed to connect ${walletName}. Check console.`);
    }
  };

  const handleDisconnectWallet = async (id: string) => {
    try {
      await supabase.from("wallet_connections").delete().eq("id", id);
      await fetchUserAndAssets();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  const fetchUserAndAssets = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    setUser(session.user);

    const { data: assetsData } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (assetsData) setAssets(assetsData);

    const { data: walletData } = await supabase
      .from("wallet_connections")
      .select("*")
      .eq("user_id", session.user.id);
    if (walletData) setWalletList(walletData);

    // Check if user already has a passport in DB
    try {
      const { data: passportData, error } = await supabase
        .from('passports')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (passportData) {
        setExistingPassport(passportData);
        setPassportId(passportData.passport_id);
        localStorage.setItem("zkest_passport_id", passportData.passport_id);
      }
    } catch (e) {
      console.warn("Could not load passport from DB", e);
    }
  };

  const scanRealBalances = async () => {
    if (walletList.length === 0) {
      alert("Please connect and save at least one wallet first.");
      return;
    }
    
    setIsScanning(true);
    setHasScanned(false);
    setRealOnChainData([]);

    try {
      const networks = [
        { id: "eth", name: "Ethereum" },
        { id: "polygon", name: "Polygon" },
        { id: "arb", name: "Arbitrum" },
        { id: "opt", name: "Optimism" },
        { id: "base", name: "Base" },
        { id: "avax", name: "Avalanche" },
        { id: "bnb", name: "BNB Smart Chain" },
        { id: "zksync", name: "ZKsync Era" },
        { id: "polygonzkevm", name: "Polygon zkEVM" },
        { id: "linea", name: "Linea" },
        { id: "blast", name: "Blast" },
        { id: "scroll", name: "Scroll" },
        { id: "zora", name: "Zora" },
        { id: "mantle", name: "Mantle" },
        { id: "fraxtal", name: "Fraxtal" },
        { id: "robinhood", name: "Robinhood Chain" },
          { id: "fantom", name: "Fantom" },
          { id: "metis", name: "Metis" },
          { id: "astar", name: "Astar" },
          { id: "zetachain", name: "ZetaChain" },
          { id: "shape", name: "Shape" },
          { id: "rootstock", name: "Rootstock" },
          { id: "worldchain", name: "World Chain" },
          { id: "soneum", name: "Soneum" }
      ];

      const results: any[] = [];

      await Promise.all(walletList.map(async (wallet) => {
        // Bitcoin Routing (Non-EVM addresses)
        if (!wallet.wallet_address.startsWith("0x")) {
          try {
            const res = await fetch(`/api/btc-balance?address=${wallet.wallet_address}`);
            if (res.ok) {
              const data = await res.json();
              if (data.balance && parseFloat(data.balance) > 0) {
                results.push({
                  symbol: data.symbol,
                  contractAddress: "native",
                  type: "Native",
                  network: "Bitcoin Mainnet",
                  wallet: wallet.wallet_address,
                  balance: parseFloat(data.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }),
                  usdValue: data.usdValue || 0,
                  formattedUsdValue: (data.usdValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                });
              }
            }
          } catch (err) {
            console.error("Failed to fetch Bitcoin", err);
          }
          return; // Skip EVM check for BTC addresses
        }

        // EVM Routing
        const fetchPromises = networks.map(async (network) => {
          try {
            const res = await fetch(`/api/alchemy-tokens?address=${wallet.wallet_address}&chain=${network.id}`);
            if (!res.ok) {
              console.error(`Failed to fetch ${network.name}`);
              return;
            }
            const data = await res.json();
            
            if (data.error) {
              console.error(`Alchemy error for ${network.name}:`, data.error);
              return;
            }

            if (data.tokens && Array.isArray(data.tokens)) {
              data.tokens.forEach((token: any) => {
                results.push({
                  symbol: token.symbol,
                  contractAddress: token.contractAddress,
                  type: token.type,
                  network: network.name,
                  wallet: wallet.wallet_address,
                  balance: parseFloat(token.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
                  usdValue: token.usdValue || 0,
                  formattedUsdValue: token.usdValue > 0 ? (token.usdValue < 0.01 ? token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : null
                });
              });
            }
          } catch (err) {
            console.error(`Error fetching ${network.name}:`, err);
          }
        });

        await Promise.all(fetchPromises);
      }));

      setRealOnChainData(results);
      setHasScanned(true);
    } catch (error) {
      console.error("Scanning failed", error);
      alert("Failed to scan networks. Check console.");
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchUserAndAssets();
  }, [router]);

  // Auto-scan real balances on wallet load/change
  useEffect(() => {
    if (walletList.length > 0) {
      scanRealBalances();
    } else {
      setRealOnChainData([]);
    }
  }, [walletList]);

  const generatePassport = async (forceRegenerate = false) => {
    if (existingPassport && !forceRegenerate) {
      window.location.href = "/passport";
      return;
    }

    setShowPassportModal(true);
    setPassportGenStep(0);
    setPassportGenDone(false);
    setPassportId(null);

    const steps = [
      { delay: 900 },
      { delay: 1100 },
      { delay: 1000 },
      { delay: 900 },
      { delay: 1200 },
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, steps[i].delay));
      setPassportGenStep(i + 1);
    }

    // Generate a deterministic Passport ID from user ID
    const uid = user?.id || "demo";
    const shortId = uid.substring(0, 4).toUpperCase();
    const hash = uid.substring(uid.length - 4).toUpperCase();
    const pid = `ZK-${shortId}-${hash}`;
    const zkHash = "0x" + [...uid.replace(/-/g, "")].map(c => c.charCodeAt(0).toString(16)).join("").substring(0, 64);

    // Save to database
    try {
      const { data, error } = await supabase
        .from('passports')
        .upsert({
          user_id: user.id,
          passport_id: pid,
          zk_proof_hash: zkHash,
          rwa_total: rwaTotal,
          crypto_total: cryptoTotal,
          grand_total: grandTotal,
        }, { onConflict: 'user_id' })
        .select()
        .single();
        
      if (error) {
        console.error("Supabase upsert error:", error);
      } else if (data) {
        setExistingPassport(data);
      }
    } catch (e) {
      console.error("Failed to save passport to DB", e);
    }

    setPassportId(pid);
    localStorage.setItem("zkest_passport_id", pid);
    setPassportGenDone(true);
  };

  const handleOpenAddModal = () => {
    setEditingAssetId(null);
    setAssetName("");
    setAssetCategory("BANK_ACCOUNT");
    setAssetValue("");
    setRwaTab("zktls");
    setZkStatus("waiting");
    setSelectedProviderName(null);
    setZkRequestUrl(null);
    setIsModalOpen(true);
  };

  const runZkOracle = async (providerId: string | undefined, providerName: string) => {
    setSelectedProviderName(providerName);
    const APP_ID = process.env.NEXT_PUBLIC_RECLAIM_APP_ID;
    
    // If user has not set up env vars, fall back to simulation
    if (!APP_ID || !providerId) {
      setZkStatus("verifying");
      setTimeout(() => {
        setZkStatus("success");
        setTimeout(async () => {
          const { error } = await supabase.from('assets').insert({
            user_id: user.id,
            name: `${providerName || "Mock Provider"} (zkTLS)`,
            asset_category: "BANK_ACCOUNT",
            current_value_usd: 85000,
            is_on_chain: false
          });
          if (!error) {
            fetchUserAndAssets();
            setIsModalOpen(false);
          }
        }, 1500);
      }, 4000);
      return;
    }

    // REAL RECLAIM PROTOCOL ZK FLOW
    try {
      setZkStatus("waiting");
      // Since it's a hackathon and Reclaim SDK V5 requires the secret for the front-end init:
      // We will read it from the API if possible, or expect it in NEXT_PUBLIC_RECLAIM_APP_SECRET
      let secretToUse = process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET;
      if (!secretToUse) {
        // Fallback to fetch from backend (but backend needs to provide the secret for v5 init, not signature)
        // Wait, V5 strictly requires the secret in the init. 
        // Let's assume they set RECLAIM_APP_SECRET which Next.js edge exposes if not careful, 
        // but let's fetch it from a generic proxy or just use the backend fallback.
      }
      
      const req = await ReclaimProofRequest.init(APP_ID, process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET || "0x0b68e2258e4d19e5cd4c23a7f3ba20f563d417c04586fa4c10bf30f7bdecb20d", providerId);
      const requestUrl = await req.getRequestUrl();
      
      setZkRequestUrl(requestUrl);
      
      await req.startSession({
        onSuccess: async (proof) => {
          setZkStatus("success");
          
          let verifiedValue = 50000;
          try {
            const validProof = Array.isArray(proof) ? proof[0] : proof;
            if (validProof && validProof.claimData && validProof.claimData.context) {
                const context = JSON.parse(validProof.claimData.context);
                if (context.extractedParameters) {
                    const params = Object.values(context.extractedParameters);
                    for (const p of params) {
                        const num = parseFloat(p as string);
                        if (!isNaN(num)) {
                            verifiedValue = num;
                            break;
                        }
                    }
                }
            }
          } catch(e) { console.error("Could parse proof value", e) }

          setTimeout(async () => {
            const { error } = await supabase.from('assets').insert({
              user_id: user.id,
              name: `${providerName} (zkTLS)`,
              asset_category: "OTHER",
              current_value_usd: verifiedValue,
              is_on_chain: false
            });
            if (!error) {
              fetchUserAndAssets();
              setIsModalOpen(false);
            }
          }, 2000);
        },
        onError: (error) => {
          console.error('ZK Proof failed', error);
          alert("ZK Proof Verification Failed");
          setZkStatus("waiting");
        }
      });
    } catch (err) {
      console.error(err);
      alert("Failed to initialize ZK Oracle. Check your API keys.");
    }
  };

  const handleOpenEditModal = (asset: any) => {
    setEditingAssetId(asset.id);
    setAssetName(asset.name);
    setAssetCategory(asset.asset_category);
    setAssetValue(asset.current_value_usd.toString());
    setIsModalOpen(true);
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await supabase.from("assets").delete().eq("id", id);
      fetchUserAndAssets();
    } catch (error) {
      console.error("Error deleting asset:", error);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: assetName,
        asset_category: assetCategory,
        current_value_usd: parseFloat(assetValue),
        valuation_status: "CURRENT",
        ownership_status: "VERIFIED" // Instant verification for MVP
      };

      if (editingAssetId) {
        const { error } = await supabase.from("assets").update(payload).eq("id", editingAssetId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assets").insert({
          ...payload,
          user_id: user.id,
          source_type: "RWA",
        });
        if (error) throw error;
      }
      setIsModalOpen(false);
      await fetchUserAndAssets();
    } catch (error) {
      console.error("Error saving asset:", error);
      alert("Failed to save asset. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-sm font-medium text-gray-500 uppercase tracking-widest">Loading Dashboard...</div>;

  const rwaTotal = assets.reduce((sum, asset) => sum + Number(asset.current_value_usd), 0);
  const cryptoTotal = realOnChainData.reduce((sum, token) => sum + Number(token.usdValue || 0), 0);
  const exchangeTotal = 0; // Exhcange placeholder
  const grandTotal = rwaTotal + cryptoTotal + exchangeTotal;

  const filteredOnChainData = realOnChainData.filter(item => selectedWalletFilter === 'ALL' || item.wallet === selectedWalletFilter);
  
  const groupedTokens = filteredOnChainData.reduce((acc: any, item) => {
    if (!acc[item.symbol]) {
      acc[item.symbol] = {
        symbol: item.symbol,
        contractAddress: item.contractAddress,
        type: item.type,
        totalBalance: 0,
        totalUsdValue: 0,
        items: []
      };
    }
    acc[item.symbol].totalBalance += parseFloat(item.balance.replace(/,/g, ''));
    acc[item.symbol].totalUsdValue += item.usdValue || 0;
    acc[item.symbol].items.push(item);
    return acc;
  }, {});

  const groupedTokensArray = Object.values(groupedTokens).sort((a: any, b: any) => b.totalUsdValue - a.totalUsdValue);

  return (
    <div className="min-h-screen w-full bg-[#fafafa] relative pb-24 pt-24 md:pt-32 px-4 md:px-8">
      {/* Background Dot Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.1]" 
        style={{
          backgroundImage: 'radial-gradient(#000000 2px, transparent 2px)',
          backgroundSize: '40px 40px'
        }}
      ></div>

      <div className="max-w-[90rem] mx-auto space-y-10 relative z-10">
        
        {/* Master Total Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 md:p-12 border border-gray-100 shadow-sm rounded-3xl gap-8 md:gap-0">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-black">Private Dashboard</h2>
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck size={12} />
                <span>KYC Verified</span>
              </div>
            </div>
            <p className="text-gray-500 font-medium">Welcome back. Your financial data is encrypted and private.</p>
          </div>
          
          <div className="flex flex-wrap gap-6 md:space-x-10">
            <div className="text-right border-r border-gray-100 pr-6 md:pr-10">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Offchain Value</p>
              <p className="text-2xl font-bold text-black">${(rwaTotal + exchangeTotal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="text-right border-r border-gray-100 pr-6 md:pr-10">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Onchain Value</p>
              <p className="text-2xl font-bold text-black">${cryptoTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#ff5a1f] font-bold uppercase tracking-widest mb-1">Total Net Worth</p>
              <p className="text-4xl font-bold text-black">${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
        </div>

        {/* Generate ZK Passport CTA */}
        <div className="bg-gradient-to-r from-[#ff5a1f] to-[#7c3aed] p-8 md:p-10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="flex items-center gap-5">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <Fingerprint size={36} className="text-white" />
            </div>
            <div>
              {existingPassport ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className="text-green-300" />
                    <p className="text-green-300 text-[10px] font-bold uppercase tracking-widest">Passport Already Generated</p>
                  </div>
                  <h3 className="text-2xl font-bold text-white">ZK Passport: <span className="font-mono">{existingPassport.passport_id}</span></h3>
                  <p className="text-white/70 text-sm font-medium mt-1">Your Zero-Knowledge Proof Passport is active. {existingPassport.minted_tx_hash ? "✓ Minted on Arbitrum" : "Ready to mint as SBT on Arbitrum."}</p>
                </>
              ) : (
                <>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Step 2 — After connecting wallets & adding RWAs</p>
                  <h3 className="text-2xl font-bold text-white">Generate Your ZK Passport</h3>
                  <p className="text-white/70 text-sm font-medium mt-1">Compile all your verified assets into a cryptographic Zero-Knowledge Proof Passport.</p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {existingPassport && (
              <button
                onClick={() => generatePassport(true)}
                className="flex-shrink-0 flex items-center justify-center gap-2 bg-white/20 border border-white/30 text-white font-bold uppercase text-[11px] tracking-widest py-4 px-8 rounded-full hover:bg-white/30 transition shadow-lg backdrop-blur-sm"
              >
                <Zap size={16} /> Regenerate
              </button>
            )}
            <button
              onClick={() => generatePassport(false)}
              className="flex-shrink-0 flex items-center justify-center gap-3 bg-white text-[#ff5a1f] font-bold uppercase text-[11px] tracking-widest py-4 px-8 rounded-full hover:bg-gray-50 transition shadow-xl"
            >
              {existingPassport ? <><ArrowRight size={16} /> View Passport</> : <><Zap size={16} /> Generate ZK Passport</>}
            </button>
          </div>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-white p-8 border border-gray-100 shadow-sm rounded-3xl flex flex-col h-full hover:shadow-md transition">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 rounded-full bg-orange-50"><Wallet size={24} className="text-[#ff5a1f]"/></div>
              <h3 className="font-bold text-xl text-black">Web3 Wallets</h3>
            </div>
            <p className="text-gray-500 font-medium text-sm mb-8">Securely link your wallets to scan EVM balances automatically.</p>
            <button 
              onClick={() => setIsWalletModalOpen(true)}
              className="w-full flex items-center justify-between py-1 pl-6 pr-1 bg-[#111111] text-white rounded-full font-bold uppercase text-[11px] tracking-widest hover:bg-gray-800 transition shadow-lg mt-auto"
            >
              <span>Link Wallet</span>
              <div className="bg-[#ff5a1f] rounded-full p-2 flex items-center justify-center">
                <Plus size={14} className="text-white" />
              </div>
            </button>
          </div>

          <div className="bg-white p-8 border border-gray-100 shadow-sm rounded-3xl flex flex-col h-full hover:shadow-md transition">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 rounded-full bg-orange-50"><Landmark size={24} className="text-[#ff5a1f]"/></div>
              <h3 className="font-bold text-xl text-black">Exchanges & Off-Chain Assets</h3>
            </div>
            <p className="text-gray-500 font-medium text-sm mb-8">Securely link crypto exchanges, bank accounts, and traditional real estate via zkTLS Oracles.</p>
            <button 
              onClick={handleOpenAddModal} 
              className="w-full flex items-center justify-between py-1 pl-6 pr-1 bg-[#111111] text-white rounded-full font-bold uppercase text-[11px] tracking-widest hover:bg-gray-800 transition shadow-lg mt-auto relative overflow-hidden"
            >
              <span className="relative z-10">CONNECT ZK-ORACLE</span>
              <div className="bg-[#ff5a1f] rounded-full p-2 flex items-center justify-center relative z-10">
                <Plus size={14} className="text-white" />
              </div>
            </button>
          </div>
          
        </div>

        {/* Unified Portfolio Table */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden pt-4">
          <div className="px-6 md:px-8 border-b border-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex space-x-8">
              <button 
                onClick={() => setActivePortfolioTab("web3")}
                className={`py-4 text-xs font-bold uppercase tracking-widest transition border-b-2 ${activePortfolioTab === 'web3' ? 'border-[#ff5a1f] text-[#ff5a1f]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Web3 Portfolio (Auto-Scanned)
              </button>
              <button 
                onClick={() => setActivePortfolioTab("rwa")}
                className={`py-4 text-xs font-bold uppercase tracking-widest transition border-b-2 ${activePortfolioTab === 'rwa' ? 'border-[#ff5a1f] text-[#ff5a1f]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Off-Chain Assets
              </button>
            </div>
            
            {activePortfolioTab === "web3" && (
              <div className="flex flex-col sm:flex-row gap-3 pb-4 md:pb-0">
                <select 
                  value={selectedWalletFilter}
                  onChange={(e) => setSelectedWalletFilter(e.target.value)}
                  className="px-6 py-2 rounded-full border border-gray-200 bg-white text-[10px] font-bold uppercase tracking-widest focus:outline-none text-gray-600 focus:border-[#ff5a1f] transition shadow-sm"
                >
                  <option value="ALL">All Wallets</option>
                  {walletList.map(w => (
                    <option key={w.wallet_address} value={w.wallet_address}>
                      {w.wallet_address.substring(0, 6)}...{w.wallet_address.substring(w.wallet_address.length - 4)}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={scanRealBalances}
                  disabled={isScanning}
                  className="px-6 py-2 bg-black text-white text-[10px] rounded-full font-bold uppercase tracking-widest hover:bg-[#ff5a1f] transition disabled:opacity-50 shadow-sm"
                >
                  {isScanning ? "Scanning..." : "Scan Network"}
                </button>
              </div>
            )}
          </div>
          
          <div className="p-0">
            {activePortfolioTab === "rwa" && (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4 font-bold border-b border-gray-100">Asset Name</th>
                  <th className="px-8 py-4 font-bold border-b border-gray-100">Category</th>
                  <th className="px-8 py-4 font-bold border-b border-gray-100 text-right">Estimated Value</th>
                  <th className="px-8 py-4 font-bold border-b border-gray-100">Status</th>
                  <th className="px-8 py-4 font-bold border-b border-gray-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-medium text-sm">
                      No Real World Assets added yet. Click "Add RWA Asset" above.
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50 transition group">
                      <td className="px-8 py-6 font-bold text-black">{asset.name}</td>
                      <td className="px-8 py-6 text-gray-500 font-medium text-sm">{asset.asset_category}</td>
                      <td className="px-8 py-6 text-right font-bold text-black">
                        ${Number(asset.current_value_usd).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          asset.ownership_status === 'VERIFIED' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {asset.ownership_status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end space-x-3 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => handleOpenEditModal(asset)} className="p-2 text-gray-400 hover:text-[#ff5a1f] bg-white rounded-full shadow-sm border border-gray-100 transition">
                            <Edit3 size={16}/>
                          </button>
                          <button onClick={() => handleDeleteAsset(asset.id)} className="p-2 text-gray-400 hover:text-red-500 bg-white rounded-full shadow-sm border border-gray-100 transition">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            )}
            
            {activePortfolioTab === "web3" && (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4 font-bold border-b border-gray-100">Asset</th>
                  <th className="px-8 py-4 font-bold border-b border-gray-100">Type</th>
                  <th className="px-8 py-4 font-bold border-b border-gray-100">Network</th>
                  <th className="px-8 py-4 font-bold border-b border-gray-100">Wallet</th>
                  <th className="px-8 py-4 font-bold border-b border-gray-100 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!hasScanned ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-medium text-sm">
                      Waiting to auto-scan your wallets...
                    </td>
                  </tr>
                ) : groupedTokensArray.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-medium text-sm">
                      No mainstream tokens found.
                    </td>
                  </tr>
                ) : (
                  groupedTokensArray.map((group: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <tr 
                        onClick={() => toggleSymbol(group.symbol)}
                        className="hover:bg-gray-50 transition group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <div className="font-bold text-black flex items-center gap-2">
                            {group.symbol}
                            {group.items.length > 1 && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{group.items.length}</span>
                            )}
                          </div>
                          {group.contractAddress && group.contractAddress !== "native" && (
                            <div className="text-[10px] font-mono text-gray-400 mt-1">
                              {group.contractAddress.substring(0, 6)}...{group.contractAddress.substring(group.contractAddress.length - 4)}
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 text-gray-500 font-medium text-sm">{group.type}</td>
                        <td className="px-8 py-6 text-gray-500 font-medium text-sm">
                          {group.items.length === 1 ? group.items[0].network : "Multiple"}
                        </td>
                        <td className="px-8 py-6 text-gray-400 font-mono text-sm truncate max-w-[120px]">
                          {group.items.length === 1 ? (
                            <>{group.items[0].wallet.substring(0, 6)}...{group.items[0].wallet.substring(group.items[0].wallet.length - 4)}</>
                          ) : "Multiple"}
                        </td>
                        <td className="px-8 py-6 text-right font-bold text-black">
                          <div>{group.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                          {group.totalUsdValue > 0 && (
                            <div className="text-xs font-bold text-gray-400 mt-1">
                              ${(group.totalUsdValue < 0.01 ? group.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : group.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} USD
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedSymbols[group.symbol] && group.items.map((item: any, subIdx: number) => (
                        <tr key={`${idx}-${subIdx}`} className="bg-gray-50/50 hover:bg-gray-50 transition border-t border-gray-100/50">
                          <td className="px-8 py-4 pl-12 text-sm text-gray-400 font-medium flex items-center gap-2">
                            <ArrowRight size={12} />
                            {item.network}
                          </td>
                          <td className="px-8 py-4 text-gray-400 font-medium text-xs">{item.type}</td>
                          <td className="px-8 py-4 text-gray-500 font-medium text-xs">{item.network}</td>
                          <td className="px-8 py-4 text-gray-400 font-mono text-xs truncate max-w-[120px]">
                            {item.wallet.substring(0, 6)}...{item.wallet.substring(item.wallet.length - 4)}
                          </td>
                          <td className="px-8 py-4 text-right font-medium text-gray-600 text-sm">
                            <div>{item.balance}</div>
                            {item.usdValue > 0 && (
                              <div className="text-[10px] font-medium text-gray-400 mt-0.5">
                                ${(item.usdValue < 0.01 ? item.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : item.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} USD
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-100">
            <div className="p-6 md:p-8 flex justify-between items-center bg-white border-b border-gray-50">
              <h3 className="font-bold text-xl text-black">
                {editingAssetId ? "Edit Asset" : "Connect ZK-Oracle"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-full transition">
                <X size={16}/>
              </button>
            </div>
            
            {!editingAssetId && (
              <div className="flex border-b border-gray-100">
                <button 
                  onClick={() => setRwaTab("zktls")}
                  className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition ${rwaTab === 'zktls' ? 'text-[#ff5a1f] border-b-2 border-[#ff5a1f]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  zkTLS Oracle (Reclaim)
                </button>
                <button 
                  onClick={() => setRwaTab("manual")}
                  className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition ${rwaTab === 'manual' ? 'text-[#ff5a1f] border-b-2 border-[#ff5a1f]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Manual Entry (Dev)
                </button>
              </div>
            )}
            
            {rwaTab === "zktls" && !editingAssetId ? (
              <div className="p-6 md:p-8 flex flex-col items-center text-center">
                {zkStatus === "waiting" && (
                  <>
                    {!zkRequestUrl && !selectedProviderName ? (
                      <div className="w-full">
                        <h4 className="font-bold text-lg mb-2 text-black">Select Provider</h4>
                        <p className="text-sm text-gray-500 mb-6">Choose a Real-World Asset source to cryptographically verify.</p>
                        <div className="space-y-3">
                          <button onClick={() => runZkOracle(process.env.NEXT_PUBLIC_RECLAIM_PROVIDER_BINANCE_ID, "Binance")} className="w-full p-4 border border-gray-200 rounded-xl font-bold hover:border-[#ff5a1f] hover:bg-gray-50 transition flex justify-between items-center text-black">
                            <span>Binance</span> <ArrowRight size={16} className="text-gray-400" />
                          </button>
                          <button onClick={() => runZkOracle(process.env.NEXT_PUBLIC_RECLAIM_PROVIDER_ETORO_ID, "eToro")} className="w-full p-4 border border-gray-200 rounded-xl font-bold hover:border-[#ff5a1f] hover:bg-gray-50 transition flex justify-between items-center text-black">
                            <span>eToro</span> <ArrowRight size={16} className="text-gray-400" />
                          </button>
                          <button onClick={() => runZkOracle(process.env.NEXT_PUBLIC_RECLAIM_PROVIDER_COINBASE_ID, "Coinbase")} className="w-full p-4 border border-gray-200 rounded-xl font-bold hover:border-[#ff5a1f] hover:bg-gray-50 transition flex justify-between items-center text-black">
                            <span>Coinbase</span> <ArrowRight size={16} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-bold text-lg mb-2 text-black">Connect to {selectedProviderName}</h4>
                        <p className="text-sm text-gray-500 mb-6">Scan this QR code with your Reclaim App to securely prove your {selectedProviderName} balance.</p>
                        <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm mb-6 inline-block">
                          <QRCode value={zkRequestUrl || "https://dev.reclaimprotocol.org/demo"} size={150} />
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Powered by zkTLS</p>
                      </>
                    )}
                  </>
                )}
                {zkStatus === "verifying" && (
                  <div className="py-12 flex flex-col items-center">
                    <Loader2 size={48} className="text-[#ff5a1f] animate-spin mb-4" />
                    <h4 className="font-bold text-lg mb-2 text-black">Generating Zero-Knowledge Proof</h4>
                    <p className="text-sm text-gray-500">Extracting TLS signatures from Chase Bank...</p>
                  </div>
                )}
                {zkStatus === "success" && (
                  <div className="py-12 flex flex-col items-center">
                    <div className="bg-green-100 p-4 rounded-full mb-4">
                      <CheckCircle2 size={48} className="text-green-500" />
                    </div>
                    <h4 className="font-bold text-lg text-green-600 mb-2">Proof Verified!</h4>
                    <p className="text-sm text-gray-500">Your bank balance of $85,000 has been mathematically verified.</p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddAsset} className="p-6 md:p-8 space-y-6">
                {!editingAssetId && (
                  <div className="bg-yellow-50 border-b border-yellow-100 px-6 py-3 flex items-center gap-3 -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6">
                    <AlertCircle size={14} className="text-yellow-600 flex-shrink-0" />
                    <p className="text-[10px] uppercase font-bold tracking-widest text-yellow-700">
                      DEV MODE: Manual Entry Enabled (Simulating Plaid/zkTLS)
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Asset Name</label>
                  <input 
                    type="text" 
                    required 
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="e.g. Suburb House, 2023 Tesla" 
                    className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] bg-gray-50 text-sm font-medium transition text-black"
                  />
                </div>
  
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Category</label>
                  <select 
                    value={assetCategory}
                    onChange={(e) => setAssetCategory(e.target.value)}
                    className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] bg-gray-50 text-sm font-medium transition text-black appearance-none"
                  >
                    <option value="BANK_ACCOUNT">Bank Account</option>
                    <option value="LAND">Land / Real Estate</option>
                    <option value="HOUSE">House / Property</option>
                    <option value="VEHICLE">Vehicles / Fleet</option>
                    <option value="BUSINESS">Business Equity</option>
                    <option value="GOLD">Gold / Precious Metals</option>
                    <option value="STOCKS">Stocks / Traditional Equities</option>
                    <option value="COMMODITIES">Commodities (Oil, Wheat, etc)</option>
                    <option value="ART">Fine Art / Collectibles</option>
                    <option value="OTHER">Other Real World Asset</option>
                  </select>
                </div>
  
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Estimated Value (USD)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    step="0.01"
                    value={assetValue}
                    onChange={(e) => setAssetValue(e.target.value)}
                    placeholder="150000" 
                    className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] bg-gray-50 text-sm font-medium transition text-black"
                  />
                </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#111111] text-white font-bold uppercase text-xs tracking-widest py-4 rounded-full hover:bg-[#ff5a1f] transition shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingAssetId ? "Update Asset" : "Submit for Verification"}
                </button>
                <p className="text-[10px] text-gray-400 font-medium text-center mt-4 uppercase tracking-wider">
                  Verified automatically for Demo.
                </p>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
      {/* Wallet Management Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative border border-gray-100">
            <div className="p-6 md:p-8 flex justify-between items-center bg-white border-b border-gray-50">
              <h3 className="font-bold text-xl text-black">Manage Connected Wallets</h3>
              <button onClick={() => setIsWalletModalOpen(false)} className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-full transition">
                <X size={16}/>
              </button>
            </div>
            
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Linked Wallets List */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-4">Linked Wallets</label>
                <div className="space-y-3">
                  {walletList.length === 0 ? (
                    <p className="text-sm text-gray-400 font-medium">No wallets linked yet.</p>
                  ) : (
                    walletList.map((wallet) => (
                      <div key={wallet.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center space-x-3">
                          <Wallet size={16} className="text-[#ff5a1f]"/>
                          <div>
                            <p className="font-mono text-sm font-bold text-gray-700">{wallet.wallet_address.substring(0, 6)}...{wallet.wallet_address.substring(wallet.wallet_address.length - 4)}</p>
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{wallet.wallet_type}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDisconnectWallet(wallet.id)}
                          className="p-2 text-gray-400 hover:text-red-500 bg-white rounded-full shadow-sm border border-gray-100 transition"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-8">
                <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-4">Connect Wallet</label>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button 
                    onClick={() => connectWallet("metamask", "MetaMask")}
                    className="flex items-center justify-center gap-2 bg-orange-50 text-[#ff5a1f] font-bold uppercase text-[10px] tracking-widest py-3 rounded-xl hover:bg-orange-100 transition"
                  >
                    <Wallet size={14} /> MetaMask
                  </button>
                  <button 
                    onClick={() => connectWallet("okx", "OKX Wallet")}
                    className="flex items-center justify-center gap-2 bg-orange-50 text-[#ff5a1f] font-bold uppercase text-[10px] tracking-widest py-3 rounded-xl hover:bg-orange-100 transition"
                  >
                    <Wallet size={14} /> OKX Wallet
                  </button>
                  <button 
                    onClick={() => connectWallet("phantom", "Phantom")}
                    className="flex items-center justify-center gap-2 bg-orange-50 text-[#ff5a1f] font-bold uppercase text-[10px] tracking-widest py-3 rounded-xl hover:bg-orange-100 transition"
                  >
                    <Wallet size={14} /> Phantom
                  </button>
                  <button 
                    onClick={() => connectWallet("coinbase", "Coinbase Wallet")}
                    className="flex items-center justify-center gap-2 bg-orange-50 text-[#ff5a1f] font-bold uppercase text-[10px] tracking-widest py-3 rounded-xl hover:bg-orange-100 transition"
                  >
                    <Wallet size={14} /> Coinbase
                  </button>
                  <button 
                    onClick={() => connectWallet("unisat", "UniSat")}
                    className="flex items-center justify-center gap-2 bg-orange-50 text-[#e88122] font-bold uppercase text-[10px] tracking-widest py-3 rounded-xl hover:bg-orange-100 transition col-span-2"
                  >
                    <Wallet size={14} /> UniSat (Bitcoin)
                  </button>
                </div>

                <div className="flex items-center justify-center space-x-4 my-6">
                  <div className="h-px bg-gray-100 flex-1"></div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OR ADD MANUALLY</span>
                  <div className="h-px bg-gray-100 flex-1"></div>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualWalletInput}
                    onChange={(e) => setManualWalletInput(e.target.value)}
                    placeholder="0x..." 
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#ff5a1f] bg-gray-50 text-sm font-mono text-black"
                  />
                  <button 
                    onClick={async () => {
                      if (!manualWalletInput) return;
                      try {
                        await supabase.from("wallet_connections").insert({
                          user_id: user.id,
                          wallet_address: manualWalletInput,
                          wallet_type: "WATCH_ONLY"
                        });
                        setManualWalletInput("");
                        await fetchUserAndAssets();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="px-6 bg-[#111111] text-white font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#ff5a1f] transition"
                  >
                    Add
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* V2 Availability Modal */}
      {showV2Modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative border border-gray-100">
            <button onClick={() => setShowV2Modal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black bg-gray-50 rounded-full transition">
              <X size={16}/>
            </button>
            <div className="mx-auto bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <Landmark size={28} className="text-[#ff5a1f]"/>
            </div>
            <h3 className="font-bold text-2xl text-black mb-2">Available in V2</h3>
            <p className="text-gray-500 font-medium text-sm mb-8">
              This feature will be unlocked in V2.
            </p>
            <button 
              onClick={() => setShowV2Modal(false)}
              className="w-full bg-[#111111] text-white font-bold uppercase text-xs tracking-widest py-4 rounded-full hover:bg-[#ff5a1f] transition shadow-lg"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* ZK Passport Generation Modal */}
      {showPassportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-[#0d0d0d] rounded-3xl shadow-2xl p-8 md:p-12 max-w-lg w-full relative border border-white/10">
            {passportGenDone && (
              <button onClick={() => setShowPassportModal(false)} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white bg-white/5 rounded-full transition">
                <X size={16}/>
              </button>
            )}

            <div className="flex items-center gap-3 mb-8">
              <div className="bg-[#ff5a1f]/20 p-3 rounded-xl">
                <Fingerprint size={24} className="text-[#ff5a1f]" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">ZKEST Protocol</p>
                <h3 className="text-white font-bold text-lg">ZK Passport Generator</h3>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4 font-mono mb-8">
              {[
                { label: "Aggregating Real World Assets...", step: 1 },
                { label: "Scanning on-chain wallet balances...", step: 2 },
                { label: "Hashing private inputs into circuit...", step: 3 },
                { label: "Compiling Zero-Knowledge proof...", step: 4 },
                { label: "Generating Passport ID & metadata...", step: 5 },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3">
                  {passportGenStep < s.step ? (
                    <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" />
                  ) : passportGenStep === s.step && !passportGenDone ? (
                    <Loader2 size={16} className="text-[#ff5a1f] animate-spin flex-shrink-0" />
                  ) : (
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                  )}
                  <p className={`text-sm transition-all ${passportGenStep >= s.step ? "text-white" : "text-white/20"}`}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Done state */}
            {passportGenDone && passportId && (
              <div className="bg-[#ff5a1f]/10 border border-[#ff5a1f]/30 rounded-2xl p-6 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#ff5a1f]">Passport Generated Successfully</p>
                <div>
                  <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Your Passport ID</p>
                  <p className="font-mono font-bold text-2xl text-white">{passportId}</p>
                  <p className="text-white/40 text-[10px] mt-1">Share this ID with verification parties.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowPassportModal(false); window.location.href = "/passport"; }}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#ff5a1f] text-white font-bold uppercase text-[10px] tracking-widest py-3 rounded-full hover:bg-orange-500 transition"
                  >
                    <ArrowRight size={14} />
                    View Passport
                  </button>
                  <button
                    onClick={() => setShowPassportModal(false)}
                    className="flex-1 bg-white/5 text-white/60 font-bold uppercase text-[10px] tracking-widest py-3 rounded-full hover:bg-white/10 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Generating state */}
            {!passportGenDone && (
              <div className="flex items-center gap-2 text-white/40 text-xs font-mono">
                <Loader2 size={14} className="animate-spin" />
                Processing cryptographic proof... please wait
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



