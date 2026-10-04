const { ReclaimProofRequest } = require("@reclaimprotocol/js-sdk");

async function test() {
  try {
    const APP_ID = "0xfaE001F86bf215dEFd9Bfa2312f4aFC7925920d0";
    const APP_SECRET = "0x0b68e2258e4d19e5cd4c23a7f3ba20f563d417c04586fa4c10bf30f7bdecb20d";
    const PROVIDER_ID = "4dcff10d-d684-417f-9064-f2c8484d3353";
    
    const req = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID);
    console.log(await req.getRequestUrl());
  } catch (e) {
    console.error(e);
  }
}
test();
