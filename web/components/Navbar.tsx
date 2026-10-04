"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { Grid, ArrowRight, User, LogOut } from "lucide-react";
import { useAccount } from "wagmi";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { address } = useAccount();
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
                      <span className="font-bold text-black break-all">{address || "Not connected"}</span>
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

    </header>
  );
}

