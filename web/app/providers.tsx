"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { ReactNode, useState } from 'react'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [arbitrumSepolia],
  multiInjectedProviderDiscovery: true, // Option 1: Automatically detects all installed browser wallets (MetaMask, Phantom, etc.)
  connectors: [
    injected(), // Standard browser extension wallets
    coinbaseWallet({ appName: 'ZKEST Wealth Passport' }), // Specific Coinbase Wallet connector
    walletConnect({ 
      projectId: '3fcc6bba6f1de962d911bb5b5c3dba68', // Option 2: Mobile QR Code
      showQrModal: true 
    })
  ],
  transports: {
    [arbitrumSepolia.id]: http(),
  },
})

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
