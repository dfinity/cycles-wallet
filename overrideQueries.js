const fs = require("fs");
const path = require("path");
let declarations = fs
  .readFileSync(
    path.join(__dirname, "wallet_ui", "declarations", "wallet", "wallet.did.js")
  )
  .toString();

// replace all instances of ['query'] with []
declarations = declarations.replace(/\['query'\]/g, () => {
  return "[]";
});

fs.writeFileSync(
  path.join(__dirname, "wallet_ui", "declarations", "wallet", "wallet.did.js"),
  declarations
);
