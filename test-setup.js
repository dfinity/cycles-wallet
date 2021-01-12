global.TextEncoder = require("text-encoding").TextEncoder;

const { Actor, Principal } = require("@dfinity/agent");

window.ic = {
  canister: Actor.createActor(({ IDL }) => IDL.Service({}), {
    canisterId: Principal.anonymous(),
  }),
};
