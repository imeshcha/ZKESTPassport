"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/utils/supabase";
import { ShieldCheck, Lock, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerificationPortal() {
  const [user, setUser] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proofResult, setProofResult] = useState<'IDLE' | 'VALID' | 'INVALID'>('IDLE');
  const [logs, setLogs] = useState<string[]>([]);

  // Dynamic Requirement State for Demo
  const [requester, setRequester] = useState("Global Trust Bank");
  const [reqCategory, setReqCategory] = useState("ALL");
  const [reqMinimum, setReqMinimum] = useState(100000);
  const [passportTarget, setPassportTarget] = useState("ZK-9482-AB77");

  useEffect(() => {
    // Auto-load the generated passport ID if available
    const pid = localStorage.getItem("zkest_passport_id");
    if (pid) setPassportTarget(pid);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        // Pre-fetch all verified assets
        const { data } = await supabase
          .from("assets")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("ownership_status", "VERIFIED");
        
        if (data) setAssets(data);
      }
    };
    fetchUser();
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  const generateZKProof = async () => {
    if (!user) return alert("Please log in first.");
    
    setIsGenerating(true);
    setProofResult('IDLE');
    setLogs([]);

    // Filter local assets for category
    const filteredAssets = reqCategory === "ALL" 
      ? assets 
      : assets.filter(a => a.asset_category === reqCategory);
    
    const totalCategoryValue = filteredAssets.reduce((sum, asset) => sum + Number(asset.current_value_usd), 0);

    // Simulate ZK Proof Generation Steps from Bank Perspective
    addLog(`[SYSTEM] Sending request to Passport ${passportTarget}...`);
    await new Promise(r => setTimeout(r, 800));
    
    addLog(`[NETWORK] User has approved the request. Waiting for proof generation...`);
    await new Promise(r => setTimeout(r, 1000));
    
    addLog(`[PROVER] Receiving cryptographic zero-knowledge proof...`);
    await new Promise(r => setTimeout(r, 800));
    
    addLog(`[CIRCUIT] Verifying mathematical constraint: wealth >= $${reqMinimum.toLocaleString()}...`);
    await new Promise(r => setTimeout(r, 1200));

    if (totalCategoryValue >= reqMinimum) {
      addLog(`[SUCCESS] Proof verified! Identity bound to: Gov-ID ***4829`);
      setProofResult('VALID');
    } else {
      addLog(`[FAILED] Proof rejected. User does not meet minimum condition.`);
      setProofResult('INVALID');
    }
    
    setIsGenerating(false);
  };

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

      <div className="max-w-[80rem] mx-auto space-y-12 relative z-10">
        
        <div className="text-center space-y-4">
          <div className="flex justify-center"><ShieldCheck size={56} className="text-[#ff5a1f]" /></div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-black">Enterprise Verification</h2>
          <p className="text-gray-500 font-medium max-w-2xl mx-auto">
            Request cryptographic wealth verification from a ZKEST Passport holder. You will receive a mathematically proven VALID/INVALID result without ever seeing their private account data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Requester Panel */}
          <div className="bg-white p-8 md:p-12 border border-gray-100 shadow-sm rounded-3xl flex flex-col h-full">
            <h3 className="text-xs uppercase font-bold tracking-widest text-gray-400 mb-8">New Verification Request</h3>
            
            <div className="space-y-6 flex-1">
              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2">Target Passport ID</p>
                <input 
                  type="text" 
                  value={passportTarget}
                  onChange={e => setPassportTarget(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-black font-bold font-mono rounded-xl px-4 py-3 focus:outline-none focus:border-[#ff5a1f] transition"
                  placeholder="e.g. ZK-ABCD-1234"
                />
                <p className="text-[10px] text-gray-400 font-medium mt-1">Enter the Passport ID provided by the user.</p>
              </div>

              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2">Required Asset Category</p>
                <select 
                  value={reqCategory}
                  onChange={e => setReqCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-sm font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-[#ff5a1f] transition"
                >
                  <option value="ALL">Total Global Wealth (All Assets)</option>
                  <option value="LAND">Verified Land</option>
                  <option value="HOUSE">Verified Real Estate (Houses)</option>
                  <option value="CAR">Verified Vehicles</option>
                </select>
              </div>

              <div>
                <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2">Minimum Value Required ($)</p>
                <input 
                  type="number" 
                  value={reqMinimum}
                  onChange={e => setReqMinimum(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 text-lg font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-[#ff5a1f] transition"
                  placeholder="e.g. 100000"
                />
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3">
                <div className="bg-[#ff5a1f] rounded-full p-1 mt-0.5">
                  <Lock size={12} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#ff5a1f] uppercase tracking-wider mb-1">Zero-Knowledge Secure</p>
                  <p className="text-[11px] font-medium text-gray-500">The user's Government ID will be verified during proof generation, but no private financial data will be transmitted to this portal.</p>
                </div>
              </div>
              <button
                onClick={generateZKProof}
                disabled={isGenerating || !user}
                className="w-full flex justify-center items-center gap-3 bg-[#111111] text-white font-bold uppercase tracking-widest py-4 rounded-full hover:bg-[#ff5a1f] transition shadow-lg disabled:opacity-50 text-[11px]"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                {isGenerating ? "Awaiting User Proof..." : "Send Verification Request"}
              </button>
              {!user && <p className="text-red-500 font-bold uppercase text-[10px] mt-4 text-center tracking-wider">Demo: Please login as user first to simulate database.</p>}
            </div>
          </div>

          {/* Prover Terminal & Result Panel */}
          <div className="bg-[#111111] border border-gray-800 shadow-xl rounded-3xl flex flex-col overflow-hidden h-full">
            <div className="bg-gray-900 px-6 py-4 border-b border-gray-800 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-500 text-[10px] ml-4 font-mono uppercase tracking-widest">zk-prover-terminal</span>
            </div>
            
            <div className="p-8 font-mono text-xs flex-1 flex flex-col bg-[#111111]">
              <div className="flex-1 space-y-4 text-gray-400">
                {logs.length === 0 && <p className="text-gray-600">Waiting for proof generation request...</p>}
                {logs.map((log, i) => (
                  <p key={i} className="animate-pulse">{log}</p>
                ))}
              </div>
              
              {proofResult !== 'IDLE' && (
                <div className={`mt-8 p-6 flex items-center gap-6 rounded-2xl ${
                  proofResult === 'VALID' ? 'bg-[#ff5a1f]/10 text-[#ff5a1f] border border-[#ff5a1f]/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {proofResult === 'VALID' ? <CheckCircle size={32} /> : <XCircle size={32} />}
                  <div>
                    <p className="font-bold text-xl uppercase tracking-wider">Proof {proofResult}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">
                      {proofResult === 'VALID' 
                        ? "Cryptographically verified." 
                        : "Requirement not met. Privacy maintained."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


