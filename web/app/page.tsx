import Link from "next/link";
import { ArrowRight, Grid, Fingerprint } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] relative w-full overflow-hidden bg-[#fafafa]">
      {/* Background Dot Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.1]" 
        style={{
          backgroundImage: 'radial-gradient(#000000 2px, transparent 2px)',
          backgroundSize: '40px 40px'
        }}
      ></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 w-full max-w-[95rem] mx-auto px-8 md:px-16 relative z-10 items-center">
        
        {/* Column 1 - Headline */}
        <div className="flex flex-col justify-center order-1">
          <h1 className="text-[4rem] lg:text-[6rem] xl:text-[7rem] leading-[0.9] font-bold tracking-tighter text-black">
            Provable<br/>Net Worth.
          </h1>
        </div>

        {/* Column 2 - Graphic */}
        <div className="flex justify-center items-center order-2 py-12 lg:py-0">
          <div className="w-64 h-64 md:w-96 md:h-96 text-[#ff5a1f] flex justify-center items-center">
            <Fingerprint className="w-48 h-48 md:w-72 md:h-72 text-[#ff5a1f]" strokeWidth={1} />
          </div>
        </div>

        {/* Column 3 - Text & Button */}
        <div className="flex flex-col items-start justify-center order-3 lg:pl-12">
          <p className="text-gray-500 text-[16px] font-medium leading-relaxed mb-8 max-w-sm">
            Unify your on-chain crypto wallets and off-chain assets (bank accounts, centralized exchanges). Prove your financial status cryptographically via zkTLS without exposing your private data.
          </p>
          
          <Link 
            href="/dashboard" 
            className="inline-flex items-center bg-[#111111] text-white rounded-full font-bold uppercase text-[11px] tracking-widest pr-1 pl-6 py-1 hover:bg-gray-800 transition shadow-xl"
          >
            <span className="mr-6">CREATE PASSPORT</span>
            <div className="bg-[#ff5a1f] rounded-full p-3 flex items-center justify-center">
              <ArrowRight size={16} className="text-white" />
            </div>
          </Link>
        </div>
        
      </div>
      
      {/* Bottom middle crosshair icon */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-40">
        
      </div>

    </div>
  );
}


