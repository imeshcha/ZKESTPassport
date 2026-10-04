const fs = require('fs');
const files = [
  'd:/Projects/zkest/web/components/Navbar.tsx',
  'd:/Projects/zkest/web/components/WalletConnectionCard.tsx',
  'd:/Projects/zkest/web/app/passport/page.tsx'
];

const modalOld =       {/* Wagmi Connect Modal */}
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
      )};

const modalNew =       {/* Wagmi Connect Modal */}
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
      )};

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(modalOld)) {
    content = content.replace(modalOld, modalNew);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Updated", file);
  } else {
    console.log("Could not find modalOld in", file);
  }
}
