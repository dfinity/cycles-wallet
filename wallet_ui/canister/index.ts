/**
 * This file is a HUGE proxy for the Wallet canister itself. It is used because the
 * current SDK has limitations which makes it impossible to do "the right thing" in
 * this event.
 *
 * . We use the same canister ID as the frontend as backend. In this case this means
 *   we cannot just create a new wallet canister actor using the DID.js, as it doesn't
 *   exist when the UI is compiled.
 *
 * It is thus very important that the frontend only uses this file when communicating
 * with the wallet canister.
 *
 * It is also useful because that puts all the code in one place, including the
 * authentication logic. We do not use `window.ic` anywhere in this.
 */
import { convertIdlEventMap, Event, factory } from "./wallet.did";
import { HttpAgent, Actor, Principal, ActorSubclass } from "@dfinity/agent";
import { AuthenticationClient } from "../utils/authClient";
import { SiteInfo } from "./site";

// Need to export the enumaration from wallet.did
export * from "./wallet.did";
export { Principal } from "@dfinity/agent";

const authClient = new AuthenticationClient();
const site = SiteInfo.fromWindow();

export async function getAgentPrincipal(): Promise<Principal> {
  return authClient.getIdentity().getPrincipal();
}
export function getCanisterId(): Principal {
  if (!site.principal) {
    throw new Error("Could not find the canister ID.");
  }
  return site.principal;
}

interface BigNumber {
  toNumber(): number;
}

interface ActorInterface {
  name(): Promise<[string] | []>;
  wallet_balance(): Promise<{ amount: BigNumber }>;
  wallet_create_canister(args: {
    controller: [Principal?];
    cycles: number;
  }): Promise<{ canister_id: Principal }>;
  wallet_create_wallet(args: {
    controller: [Principal?];
    cycles: number;
  }): Promise<{ canister_id: Principal }>;
  wallet_send(args: { canister: Principal; amount: number }): Promise<void>;
  get_events(args: [{ from: [number?]; to: [number?] }?]): Promise<any[]>;
  get_chart(
    args: [{ count: [number?]; precision: [number?] }?]
  ): Promise<[BigNumber, BigNumber][]>;
}

let walletCanisterCache: ActorSubclass<ActorInterface>;

export async function login() {
  const redirectUri = `${location.origin}/${location.search}`;
  await authClient.loginWithRedirect({
    redirectUri,
    scope: [getWalletId()],
  });
}

export async function handleAuthRedirect() {
  // Check if we need to parse the authentication.
  if (authClient.shouldParseResult(location)) {
    await authClient.handleRedirectCallback(location);
  }
}

async function getWalletCanister(): Promise<ActorSubclass<ActorInterface>> {
  if (walletCanisterCache) {
    return walletCanisterCache;
  }

  await handleAuthRedirect();

  let walletId: Principal | null = null;
  walletId = getWalletId(walletId);

  const agent = new HttpAgent({
    host: await site.getHost(),
    identity: authClient.getIdentity(),
  });

  if (!walletId) {
    throw new Error("Need to have a wallet ID.");
  } else {
    walletCanisterCache = (Actor as any).createActor(factory as any, {
      agent,
      canisterId: walletId,
    }) as ActorSubclass<ActorInterface>;
    return walletCanisterCache;
  }
}

export enum ChartPrecision {
  Minutes,
  Hourly,
  Daily,
  Weekly,
  Monthly,
}

export function getWalletId(walletId: Principal | null = null) {
  const params = new URLSearchParams(location.search);
  const maybeWalletId = params.get("wallet");
  if (maybeWalletId) {
    walletId = Principal.fromText(maybeWalletId);
  } else {
    walletId = getCanisterId();
  }
  return walletId;
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
  async name(): Promise<string> {
    return (await (await getWalletCanister()).name())[0] || "";
  },
  async init(): Promise<void> {
    await this.balance();
  },
  async balance(): Promise<number> {
    return (
      await (await getWalletCanister()).wallet_balance()
    ).amount.toNumber();
  },
  async events(from?: number, to?: number): Promise<Event[]> {
    return (
      await (await getWalletCanister()).get_events(
        from ? [{ from: [from], to: [to] }] : []
      )
    ).map(convertIdlEventMap);
  },
  async chart(p: ChartPrecision, count?: number): Promise<[Date, number][]> {
    const precision = precisionToNanoseconds(p);
    return (
      await (await getWalletCanister()).get_chart([
        { count: [count], precision: [precision] },
      ])
    ).map(([a, b]) => [new Date(a.toNumber() / 1000000), b.toNumber()]);
  },
  async create_canister(p: {
    controller?: Principal;
    cycles: number;
  }): Promise<Principal> {
    const result = await (await getWalletCanister()).wallet_create_canister({
      controller: p.controller ? [p.controller] : [],
      cycles: p.cycles,
    });
    return result.canister_id;
  },
  async create_wallet(p: {
    controller?: Principal;
    cycles: number;
  }): Promise<Principal> {
    const result = await (await getWalletCanister()).wallet_create_wallet({
      controller: p.controller ? [p.controller] : [],
      cycles: p.cycles,
    });
    return result.canister_id;
  },
  async send(p: { canister: Principal; amount: number }): Promise<void> {
    await (await getWalletCanister()).wallet_send(p);
  },
};