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
