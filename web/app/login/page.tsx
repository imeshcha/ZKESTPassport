"use client";

import { useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, ChevronRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Success! Check your email to confirm your account.");
      }
    } catch (err: any) {
      setMessage(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fafafa] flex flex-col justify-center items-center py-20 px-4 relative">
      
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.1]" 
        style={{
          backgroundImage: 'radial-gradient(#000000 2px, transparent 2px)',
          backgroundSize: '40px 40px'
        }}
      ></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Header Logo Area */}
        <div className="flex justify-center mb-10">
          <div className="text-2xl font-bold tracking-tight text-black flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">ZK</span>
            </div>
            ZKEST
          </div>
        </div>

        <div className="bg-white p-8 md:p-10 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl w-full">
          <h2 className="text-3xl font-bold text-black mb-2 text-center">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-gray-500 font-medium text-sm mb-8 text-center">
            {isLogin ? "Enter your details to access your portfolio." : "Sign up to track your global wealth."}
          </p>
          
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] bg-gray-50 text-sm font-medium transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={16} className="text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] bg-gray-50 text-sm font-medium transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#111111] text-white font-bold uppercase text-xs tracking-widest py-4 rounded-full hover:bg-gray-800 transition shadow-lg mt-2 disabled:opacity-50"
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
              {!loading && <ChevronRight size={16} />}
            </button>
          </form>

          <div className="my-8 flex items-center justify-center space-x-4">
            <div className="h-px bg-gray-100 flex-1"></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
            <div className="h-px bg-gray-100 flex-1"></div>
          </div>

          <button
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/dashboard`
                }
              });
              if (error) setMessage(error.message);
            }}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-black font-bold uppercase text-xs tracking-widest py-4 rounded-full hover:bg-gray-50 transition shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#000000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#000000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#000000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          {message && (
            <div className="mt-6 p-4 border border-gray-100 text-gray-600 font-medium text-sm rounded-2xl text-center bg-gray-50">
              {message}
            </div>
          )}
        </div>

        <div className="mt-8 text-center relative z-10">
          <p className="text-gray-500 text-sm font-medium">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage("");
              }}
              className="text-[#ff5a1f] font-bold hover:underline transition ml-1"
            >
              {isLogin ? "Sign up here" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

