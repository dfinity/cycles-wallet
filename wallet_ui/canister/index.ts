import { factory } from "./wallet.did";
import {
  Actor,
  ActorSubclass,
  GlobalInternetComputer,
  Principal,
} from "@dfinity/agent";

declare const window: GlobalInternetComputer;

interface ActorInterface {
  wallet_balance(): Promise<{ amount: { toNumber(): number } }>;
  wallet_send(args: { canister: Principal; amount: number }): Promise<void>;
}

export const Wallet: ActorSubclass<ActorInterface> = (() => {
  const canister = window.ic.canister;
  if (canister) {
    const canisterId = Actor.canisterIdOf(canister);
    return Actor.createActor<ActorInterface>(factory, { canisterId });
  } else {
    throw new Error("Need to have a canister set in bootstrap.");
  }
})();
