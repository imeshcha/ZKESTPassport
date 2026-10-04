const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
c = c.replace(
  '{ id: "worldchain", name: "World Chain" }',
  `{ id: "worldchain", name: "World Chain" },
          { id: "soneum", name: "Soneum" }`
);
fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('dashboard updated');

let api = fs.readFileSync('app/api/alchemy-tokens/route.ts', 'utf8');
api = api.replace(
  'if (chain === \'worldchain\') url = `https://worldchain-mainnet.g.alchemy.com/v2/${apiKey}`;',
  'if (chain === \'worldchain\') url = `https://worldchain-mainnet.g.alchemy.com/v2/${apiKey}`;\n  if (chain === \'soneum\') url = `https://soneum-mainnet.g.alchemy.com/v2/${apiKey}`;'
);
fs.writeFileSync('app/api/alchemy-tokens/route.ts', api);
console.log('api updated');
