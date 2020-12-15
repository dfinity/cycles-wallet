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
  const params = new URLSearchParams(location.search);

  let walletId: Principal | null = null;
  const maybeWalletId = params.get("wallet");
  if (maybeWalletId) {
    walletId = Principal.fromText(maybeWalletId);
  } else {
    const maybeCanister = window.ic.canister;
    if (maybeCanister) {
      walletId = Actor.canisterIdOf(maybeCanister);
    }
  }

  if (!walletId) {
    throw new Error("Need to have a wallet ID.");
  } else {
    return Actor.createActor<ActorInterface>(factory, { canisterId: walletId });
  }
})();
