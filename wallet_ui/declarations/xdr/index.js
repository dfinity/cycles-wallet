import { Actor, HttpAgent, AnonymousIdentity } from "@dfinity/agent";

// Imports and re-exports candid interface
import { idlFactory } from "./canister.did.js";
export { idlFactory } from "./canister.did.js";
// CANISTER_ID is replaced by webpack based on node environment
export const canisterId = "rkp4c-7iaaa-aaaaa-aaaca-cai";

/**
 *
 * @param {string | import("@dfinity/principal").Principal} canisterId Canister ID of Agent
 * @param {{agentOptions?: import("@dfinity/agent").HttpAgentOptions; actorOptions?: import("@dfinity/agent").ActorConfig}} [options]
 * @return {import("@dfinity/agent").ActorSubclass<import("./canister.did.js")._SERVICE>}
 */
export const createActor = (canisterId, options) => {
  const agent = new HttpAgent({ ...options?.agentOptions });

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options?.actorOptions,
  });
};

/**
 * A ready-to-use agent for the canister canister
 * @type {import("@dfinity/agent").ActorSubclass<import("./canister.did.js")._SERVICE>}
 */
export const xdr = createActor(canisterId, {
  agentOptions: {
    host: 'https://ic0.app'
  }
});
