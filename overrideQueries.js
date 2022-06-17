const fs = require("fs");
const path = require("path");

const path1 = path.join(
  __dirname,
  "wallet_ui",
  "declarations",
  "wallet",
  "wallet.did.js"
);
const path2 = path.join(
  __dirname,
  "wallet_ui",
  "canister",
  "wallet",
  "wallet.did.js"
);

const list = [path1, path2];
list.forEach((p) => {
  let declarations = fs.readFileSync(p).toString();

  // replace all instances of ['query'] with []
  declarations = declarations.replace(/\['query'\]/g, () => {
    return "[]";
  });
  declarations = declarations.replace(/\["query"]/g, () => {
    return "[]";
  });

  fs.writeFileSync(p, declarations);
});
