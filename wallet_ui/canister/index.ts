/**
 * This file is a HUGE proxy for the Wallet canister itself. It is used because the
 * current SDK has limitations which makes it impossible to do "the right thing" in
 * this event.
 *
 * . We use the same canister ID as the frontend as backend. In this case this means
 *   we cannot just create a new wallet canister actor using the DID.js, as it doesn't
 *   exist when the UI is compiled.
 * . We use many types from the Agent, but in order to save on space, we should not
 *   import directly from `@dfinity/agent`. Instead we import types and stub the runtime
 *   implementation of those types to the ones in `window.ic`. This tricks the compiler
 *   into using those classes at runtime, but still validating typescript using the
 *   correct types.
 *   This saves us about 150kb of frontend code already exists in bootstrap.
 * . We want to memoize values as much as possible (like charts and events). Although
 *   this is not yet implemented, this allows to have a single point of override when
 *   we want to do so.
 *
 * It is thus very important that the frontend only uses this file when communicating
 * with the wallet canister.
 */
import { convertIdlEventMap, Event, factory } from "./wallet.did";
import type * as agent from "@dfinity/agent";

export * from "./wallet.did";

declare const window: agent.GlobalInternetComputer;

export const canister = window.ic.canister;

// Reuse the types from window, as they don't take any space (coming from bootstrap)
export const Actor = window.ic.canister!.constructor! as typeof agent.Actor;
export const Principal = Actor.canisterIdOf(window.ic.canister!)
  .constructor as typeof agent.Principal;
export type Principal = agent.Principal;

export async function getPrincipal(): Promise<Principal | null> {
  return window.ic.agent.getPrincipal();
}

interface BigNumber {
  toNumber(): number;
}

interface ActorInterface {
  wallet_balance(): Promise<{ amount: BigNumber }>;
  wallet_send(args: { canister: Principal; amount: number }): Promise<void>;
  get_events(args: [{ from: [number?]; to: [number?] }?]): Promise<any[]>;
  get_chart(
    args: [{ count: [number?]; precision: [number?] }?]
  ): Promise<[BigNumber, BigNumber][]>;
}

export const WalletCanister: agent.ActorSubclass<ActorInterface> = (() => {
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
    return (Actor as any).createActor(factory as any, {
      canisterId: walletId,
    }) as agent.ActorSubclass<ActorInterface>;
  }
})();

export enum ChartPrecision {
  Minutes,
  Hourly,
  Daily,
  Weekly,
  Monthly,
}

function precisionToNanoseconds(precision: ChartPrecision) {
  // Precision is a second by default (in nanoseconds).
  let result = 1000000;
  if (precision >= ChartPrecision.Monthly) result *= 4;
  if (precision >= ChartPrecision.Weekly) result *= 7;
  if (precision >= ChartPrecision.Daily) result *= 24;
  if (precision >= ChartPrecision.Hourly) result *= 60;
  if (precision >= ChartPrecision.Minutes) result *= 60;

  return result;
}

export const Wallet = {
  async init(): Promise<void> {
    await this.balance();
  },
  async balance(): Promise<number> {
    return (await WalletCanister.wallet_balance()).amount.toNumber();
  },
  async events(from?: number, to?: number): Promise<Event[]> {
    return (
      await WalletCanister.get_events(from ? [{ from: [from], to: [to] }] : [])
    ).map(convertIdlEventMap);
  },
  async chart(p: ChartPrecision, count?: number): Promise<[Date, number][]> {
    const precision = precisionToNanoseconds(p);
    return (
      await WalletCanister.get_chart([
        { count: [count], precision: [precision] },
      ])
    ).map(([a, b]) => [new Date(a.toNumber() / 1000000), b.toNumber()]);
  },
  async send(p: { canister: Principal; amount: number }): Promise<void> {
    await WalletCanister.wallet_send(p);
    console.log(p);
  },
};
