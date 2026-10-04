"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { Grid, ArrowRight, User, LogOut, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { createPortal } from "react-dom";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowProfile(false);
    router.push("/");
  };

  return (
    <header className="w-full py-4 px-8 md:px-16 sticky top-0 left-0 z-50 flex justify-between items-center bg-white/90 backdrop-blur-md border-b border-gray-100">
      
      {/* Logo */}
      <div className="flex-1">
        <Link href="/" className="flex flex-col leading-none group">
          <span className="text-3xl font-black tracking-tighter text-black">
            zk<span className="text-[#ff5a1f]">est</span>
          </span>
          <span className="text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mt-0.5 group-hover:text-[#ff5a1f] transition-colors">
            Passport
          </span>
        </Link>
      </div>

      {/* Center Nav Pills */}
      <nav className="hidden md:flex items-center space-x-4">
        {/* Dashboard & Passport Pill */}
        <div className="bg-white shadow-sm rounded-full px-8 py-3 flex items-center space-x-8 font-bold text-xs uppercase tracking-widest text-black border border-gray-100">
          <Link href="/dashboard" className="flex items-center hover:text-[#ff5a1f] transition">
            Dashboard <Grid size={12} className="ml-2 text-[#ff5a1f]" />
          </Link>
          <Link href="/passport" className="hover:text-[#ff5a1f] transition">
            Passport
          </Link>
        </div>

        {/* Verify Pill */}
        <div className="bg-white shadow-sm rounded-full px-8 py-3 flex items-center font-bold text-xs uppercase tracking-widest text-black border border-gray-100">
          <Link href="/verify" className="flex items-center hover:text-[#ff5a1f] transition">
            Verify <Grid size={12} className="ml-2 text-[#ff5a1f]" />
          </Link>
        </div>
      </nav>

      {/* Right Action */}
      <div className="flex-1 flex justify-end">
        {user ? (
          <div className="relative">
            <button 
              onClick={() => setShowProfile(!showProfile)} 
              className="flex items-center bg-white text-black rounded-full font-bold uppercase text-[10px] tracking-widest pr-1 pl-6 py-1 shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <span className="mr-4 text-black">PROFILE</span>
              <div className="bg-black rounded-full p-2 flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
            </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 mt-4 w-72 bg-white border border-gray-100 shadow-2xl rounded-3xl p-6 flex flex-col z-50">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">User Profile</p>
                  
                  <div className="space-y-4 font-mono text-xs text-gray-600 mb-6">
                    <div>
                      <span className="text-gray-400 block mb-1">User ID:</span>
                      <span className="font-bold text-black break-all">{user.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-1">Email:</span>
                      <span className="font-bold text-black break-all">{user.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-1">Active Wallet:</span>
                      {address ? (
                        <span className="font-bold text-black break-all">{address}</span>
                      ) : (
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            setShowConnectorModal(true);
                          }}
                          className="mt-1 w-full flex items-center justify-center gap-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:border-[#ff5a1f] hover:text-[#ff5a1f] transition"
                        >
                          <Wallet size={12} /> Connect Wallet
                        </button>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link 
            href="/login" 
            className="flex items-center bg-white text-black rounded-full font-bold uppercase text-[10px] tracking-widest pr-1 pl-6 py-1 shadow-sm border border-gray-100 hover:shadow-md transition"
          >
            <span className="mr-4 text-black">LOG IN</span>
            <div className="bg-[#ff5a1f] rounded-full p-2 flex items-center justify-center">
              <ArrowRight size={14} className="text-white" />
            </div>
          </Link>
        )}
      </div>

            {/* Wagmi Connect Modal */}
      {showConnectorModal && mounted && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex justify-center items-center p-4" onClick={() => setShowConnectorModal(false)}>
          <div className="bg-white border border-gray-100 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden relative p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-2xl tracking-tight text-black">Connect Wallet</h3>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Select your provider</p>
              </div>
              <button onClick={() => setShowConnectorModal(false)} className="text-gray-400 hover:text-black hover:bg-gray-50 rounded-full p-2 transition">
                <span className="font-bold px-1 text-lg">X</span>
              </button>
            </div>
            
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    if (isConnected) disconnect();
                    setTimeout(() => connect({ connector }), 100);
                    setShowConnectorModal(false);
                  }}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-black font-bold uppercase text-xs tracking-widest hover:border-[#ff5a1f] hover:bg-orange-50 hover:text-[#ff5a1f] transition text-left flex items-center justify-between group shadow-sm"
                >
                  <span>{connector.name}</span>
                  {connector.ready ? (
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

    </header>
  );
}

