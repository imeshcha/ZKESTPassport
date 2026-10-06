# zkest 🛡️ - Provable Net Worth Passport

Built for the **Arbitrum Open House Hackathon, Singapore 🇸🇬**

**zkest** is a decentralized application that unifies on-chain crypto holdings and off-chain Web2 financial assets (like bank accounts and Centralized Exchanges) into a single, verifiable identity. By utilizing **zkTLS (Zero-Knowledge Transport Layer Security)**, users can cryptographically prove their liquidity without ever exposing personally identifiable information (PII), login credentials, or session cookies.

---

## 🔴 The Problem
In the current Web3 landscape, verifying real-world assets or off-chain liquidity requires relying on trusted third-party oracles or centralized KYC providers. This fundamentally breaks the trustless nature of crypto and forces users to expose highly sensitive data (passwords, exact account numbers, full transaction histories) just to prove a simple statement, such as "My net worth exceeds $10,000."

## 🟢 The Solution
**zkest** removes the need for centralized trust by implementing client-side zero-knowledge proofs via **zkTLS**. 

When a user connects their bank or CEX, zkTLS acts as a cryptographic proxy. It allows the user's local client to prove to a smart contract that a specific payload (e.g., an HTTP response containing an account balance) was securely transmitted from a legitimate, TLS-secured web server. 

The resulting ZK proof is submitted on-chain to mint a **dynamic Passport SBT (Soulbound Token)**. This SBT acts as a tamper-proof credential tied to the user's Web3 wallet. Because the net worth is dynamic, the smart contract allows the SBT owner to submit fresh ZK proofs to update their credential's value over time.

---

## 🏗️ System Architecture & Tech Stack

### 1. Zero-Knowledge Proofs & zkTLS
*   **Reclaim Protocol (`@reclaimprotocol/js-sdk`):** Provides the core zkTLS infrastructure. It allows the client to generate a ZK proof of the TLS session with the Web2 server. The proof asserts that the HTTPS response body contains specific JSON data (the balance) without revealing the authentication headers used to fetch it.
*   **Custom ZK Circuits (`/circuits`):** Specialized circuits designed to parse and verify specific banking/CEX payloads before generating the final proof submission.

### 2. Web3 & Smart Contracts
*   **Arbitrum:** The target deployment network, chosen for its high throughput and low gas fees, which are critical when verifying complex cryptographic proofs on-chain.
*   **Wagmi & Viem:** Handles wallet connection state, typed smart contract interactions, and transaction signing on the client side.
*   **Alchemy SDK:** Serves as the primary RPC provider, ensuring reliable, high-speed blockchain data querying for on-chain asset aggregation.
*   **Solidity Smart Contracts (`/contracts`):** Contains the logic for the Passport SBT (ERC-5192/ERC-721 based). The contract includes an on-chain verifier that checks the validity of the zkTLS proof before minting or updating the SBT's metadata.

### 3. Frontend & Off-chain Backend
*   **Next.js (App Router):** Provides a highly responsive frontend architecture with seamless Server-Side Rendering (SSR) for optimal performance.
*   **Tailwind CSS & Lucide React:** Used for rapid UI prototyping, delivering a clean, modern, and accessible user interface.
*   **Supabase:** A scalable PostgreSQL database used to manage off-chain user sessions, store non-sensitive application metadata, and cache verified proofs to minimize redundant on-chain calls.

---

## 📂 Project Structure

```text
zkest/
├── circuits/       # Custom Zero-Knowledge circuits for payload verification
├── contracts/      # Solidity smart contracts for the Passport SBT
├── supabase/       # Database schemas, Edge Functions, and RLS policies
└── web/            # Next.js frontend application
    ├── app/        # Next.js App Router pages (dashboard, login, passport)
    └── package.json# Frontend dependencies (Reclaim, Wagmi, Supabase)
```

## 🚀 Getting Started (Frontend)

1. Navigate to the web directory:
   ```bash
   cd web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables (requires Reclaim App ID/Secret and Supabase keys).
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
