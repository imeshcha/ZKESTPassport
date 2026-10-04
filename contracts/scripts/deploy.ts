import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment to Arbitrum Sepolia...");

  // 1. Deploy Wealth Passport (ERC721)
  const WealthPassport = await ethers.getContractFactory("WealthPassport");
  const wealthPassport = await WealthPassport.deploy();
  await wealthPassport.waitForDeployment();
  const passportAddress = await wealthPassport.getAddress();
  
  console.log(`✅ WealthPassport deployed to: ${passportAddress}`);

  // 2. Deploy Attestation Registry
  const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
  const attestationRegistry = await AttestationRegistry.deploy(passportAddress);
  await attestationRegistry.waitForDeployment();
  const registryAddress = await attestationRegistry.getAddress();

  console.log(`✅ AttestationRegistry deployed to: ${registryAddress}`);
  console.log("Deployment complete! Make sure to update NEXT_PUBLIC_CONTRACT_ADDRESS in your frontend.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
