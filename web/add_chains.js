const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
c = c.replace(
  '{ id: "robinhood", name: "Robinhood Chain" }',
  `{ id: "robinhood", name: "Robinhood Chain" },
          { id: "fantom", name: "Fantom" },
          { id: "metis", name: "Metis" },
          { id: "astar", name: "Astar" },
          { id: "zetachain", name: "ZetaChain" },
          { id: "shape", name: "Shape" },
          { id: "rootstock", name: "Rootstock" },
          { id: "worldchain", name: "World Chain" }`
);
fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
