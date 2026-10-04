const fs = require('fs');
let code = fs.readFileSync('d:/Projects/zkest/web/app/passport/page.tsx', 'utf8');

// 1. Imports
code = code.replace(
  'import { createWalletClient, createPublicClient, custom, http, parseAbi } from "viem";\nimport { arbitrumSepolia } from "viem/chains";',
  'import { parseAbi } from "viem";\nimport { useAccount, useConnect, useDisconnect, useWalletClient, usePublicClient } from "wagmi";'
);

// 2. State hooks
code = code.replace(
  '  // Wallet connection for minting\n  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);\n  const [selectedWalletId, setSelectedWalletId] = useState<string>("");',
  '  // Wagmi Hooks for Wallet Connection\n  const { address: connectedAddress, isConnected } = useAccount();\n  const { connect, connectors } = useConnect();\n  const { disconnect } = useDisconnect();\n  const { data: walletClient } = useWalletClient();\n  const publicClient = usePublicClient();\n  const [showConnectorModal, setShowConnectorModal] = useState(false);\n\n  const [selectedWalletId, setSelectedWalletId] = useState<string>("");'
);

// 3. connectSelectedWallet (delete it)
const connectRegex = /  \/\/ Connect the selected wallet via MetaMask\n  const connectSelectedWallet = async \(\) => \{[\s\S]*?  \};\n\n/g;
code = code.replace(connectRegex, '');

// 4. mintSBT logic
code = code.replace(
  '    if (!connectedAddress) return alert("Please connect your wallet first.");',
  '    if (!connectedAddress) return alert("Please connect your wallet first.");\n    if (!walletClient || !publicClient) return alert("Wallet client not ready. Please make sure your wallet is connected on the correct network.");'
);

code = code.replace(
  '      const w = window as any;\n\n      // Step 1\n      setMintStep(1);\n      await new Promise(r => setTimeout(r, 600));\n\n      // Create viem wallet client using the browser provider\n      const walletClient = createWalletClient({\n        chain: arbitrumSepolia,\n        transport: custom(w.ethereum),\n      });\n      const publicClient = createPublicClient({\n        chain: arbitrumSepolia,\n        transport: http("https://sepolia-rollup.arbitrum.io/rpc"),\n      });',
  '      // Step 1\n      setMintStep(1);\n      await new Promise(r => setTimeout(r, 600));'
);

// 5. Connect wallet button
const buttonRegex = /                    \{\/\* Connect Wallet Button \*\/\}\n                    \{wallets\.length > 0 && \([\s\S]*?                      <\/button>\n                    \)\}/g;
code = code.replace(buttonRegex, 
  '                    {/* Connect Wallet Button using Wagmi modal */}\n                    {wallets.length > 0 && (\n                      <button\n                        onClick={() => {\n                          if (isConnected) disconnect();\n                          else setShowConnectorModal(true);\n                        }}\n                        className={w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-bold uppercase text-xs tracking-widest transition }\n                      >\n                        <Wallet size={14} />\n                        {isConnected && connectedAddress\n                          ? Connected: ...\n                          : "Connect Wagmi Wallet"}\n                      </button>\n                    )}'
);

// 6. Add Modal after <div className="max-w-[80rem] mx-auto space-y-10 relative z-10">
const modalHtml =       {/* Wagmi Connect Modal */}
      {showConnectorModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] w-full max-w-sm overflow-hidden relative p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl uppercase tracking-tighter text-black">Select Wallet</h3>
              <button onClick={() => setShowConnectorModal(false)} className="text-black hover:bg-gray-200 border-2 border-black p-1 transition">
                <span className="font-bold px-2">X</span>
              </button>
            </div>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    if (isConnected) disconnect();
                    setTimeout(() => connect({ connector }), 100);
                    setShowConnectorModal(false);
                  }}
                  className="w-full py-4 px-4 bg-gray-50 text-black font-bold uppercase tracking-widest hover:bg-gray-200 border-2 border-black transition text-left flex items-center justify-between"
                >
                  {connector.name}
                  {connector.ready ? (
                    <span className="w-2 h-2 rounded-full bg-green-500 border border-black"></span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}\n\n;

code = code.replace(
  '      <div className="max-w-[80rem] mx-auto space-y-10 relative z-10">',
  modalHtml + '      <div className="max-w-[80rem] mx-auto space-y-10 relative z-10">'
);

// 7. Remove setConnectedAddress(null) from select
code = code.replace('                            setConnectedAddress(null); // reset connection when selection changes\n', '');

// 8. Fix confirmation text
code = code.replace('"Broadcasting transaction (confirm in MetaMask)..."', '"Broadcasting transaction (confirm in Wallet)..."');

fs.writeFileSync('d:/Projects/zkest/web/app/passport/page.tsx', code, 'utf8');
