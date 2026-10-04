const fs = require('fs');
let code = fs.readFileSync('d:/Projects/zkest/web/components/Navbar.tsx', 'utf8');

code = code.replace(
  'import { useAccount, useConnect, useDisconnect } from "wagmi";',
  'import { useAccount, useConnect, useDisconnect } from "wagmi";\nimport { createPortal } from "react-dom";'
);

code = code.replace(
  '  const { address, isConnected } = useAccount();\n  const { connect, connectors } = useConnect();\n  const { disconnect } = useDisconnect();\n  const router = useRouter();',
  '  const { address, isConnected } = useAccount();\n  const { connect, connectors } = useConnect();\n  const { disconnect } = useDisconnect();\n  const router = useRouter();\n\n  const [mounted, setMounted] = useState(false);\n  useEffect(() => setMounted(true), []);'
);

code = code.replace(
  '      {/* Wagmi Connect Modal */}\n      {showConnectorModal && (\n        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={() => setShowConnectorModal(false)}>',
  '      {/* Wagmi Connect Modal */}\n      {showConnectorModal && mounted && createPortal(\n        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex justify-center items-center p-4" style={{ position: "fixed" }} onClick={() => setShowConnectorModal(false)}>'
);

code = code.replace(
  '        </div>\n      )}\n\n    </header>',
  '        </div>,\n        document.body\n      )}\n\n    </header>'
);

fs.writeFileSync('d:/Projects/zkest/web/components/Navbar.tsx', code, 'utf8');
