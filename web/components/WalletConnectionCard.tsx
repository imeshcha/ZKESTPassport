"use client";

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { Wallet, Plus, Check } from 'lucide-react'
import { supabase } from '@/app/utils/supabase'
import { useEffect, useState } from 'react'

export default function WalletConnectionCard({ userId }: { userId: string }) {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [savedWallets, setSavedWallets] = useState<any[]>([])

  const fetchWallets = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('wallet_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setSavedWallets(data);
  }

  useEffect(() => {
    fetchWallets();
  }, [userId]);

  useEffect(() => {
    // If connected, sync the wallet to the database and refresh
    if (isConnected && address && userId) {
      syncWalletToDatabase(address, userId);
    }
  }, [isConnected, address, userId]);

  const syncWalletToDatabase = async (walletAddress: string, uid: string) => {
    try {
      const { error } = await supabase
        .from('wallet_connections')
        .upsert({ 
          user_id: uid, 
          wallet_address: walletAddress, 
          blockchain: 'EVM' 
        }, { onConflict: 'user_id, wallet_address' });

      if (!error) {
        fetchWallets();
      }
    } catch (e) {
      console.error("Exception saving wallet:", e);
    }
  };

  const isCurrentWalletSaved = savedWallets.some(w => w.wallet_address.toLowerCase() === address?.toLowerCase());

  const [showConnectorModal, setShowConnectorModal] = useState(false);

  const removeWalletFromDatabase = async (walletAddress: string) => {
    try {
      await supabase
        .from('wallet_connections')
        .delete()
        .eq('user_id', userId)
        .eq('wallet_address', walletAddress);
      fetchWallets();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col h-full relative">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 border-2 border-black bg-gray-100"><Wallet size={24} className="text-black"/></div>
        <h3 className="font-bold text-xl uppercase tracking-tighter text-black">Crypto Wallets</h3>
      </div>
      
      <p className="text-gray-700 font-medium text-sm mb-4">
        Connect multiple Web3 wallets to aggregate your on-chain identity.
      </p>

      <div className="flex-1 space-y-3 mb-6 overflow-y-auto max-h-32 pr-2">
        {savedWallets.length === 0 ? (
          <p className="text-xs text-gray-400 font-bold uppercase">No wallets connected yet.</p>
        ) : (
          savedWallets.map((w, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 border-2 border-black bg-gray-50 group">
              <span className="font-mono text-sm font-bold truncate">
                {w.wallet_address.substring(0, 6)}...{w.wallet_address.substring(w.wallet_address.length - 4)}
              </span>
              <div className="flex items-center gap-3">
                <Check size={16} className="text-green-600" />
                <button 
                  onClick={() => removeWalletFromDatabase(w.wallet_address)}
                  className="text-black hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove Wallet"
                >
                  <span className="font-black text-sm">X</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-auto space-y-3">
        {isConnected ? (
           <div className="flex flex-col gap-2">
             {!isCurrentWalletSaved && (
               <button 
                 onClick={() => syncWalletToDatabase(address as string, userId)}
                 className="w-full py-3 bg-black text-white rounded-none font-bold uppercase tracking-widest hover:bg-gray-800 border-2 border-black transition"
               >
                 Save Active Wallet
               </button>
             )}
             <button 
               onClick={() => disconnect()}
               className="w-full py-2 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-100 border-2 border-black transition text-xs"
             >
               Disconnect Active Session
             </button>
           </div>
        ) : (
          <button 
            onClick={() => setShowConnectorModal(true)}
            className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-100 border-2 border-black transition flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Connect Wallet
          </button>
        )}
      </div>

      {/* Custom Wallet Selection Modal */}
      {showConnectorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={() => setShowConnectorModal(false)}>
          <div className="bg-white border border-gray-100 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden relative p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-2xl tracking-tight text-black">Connect Wallet</h3>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Select your provider</p>
              </div>
              <button onClick={() => setShowConnectorModal(false)} className="text-gray-400 hover:text-black hover:bg-gray-50 rounded-full p-2 transition">
                <span className="font-bold px-1 text-lg">✕</span>
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
        </div>
      )}
    </div>
  )
}
