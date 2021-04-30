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
import { HttpAgent, Actor, Principal, ActorSubclass } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import _SERVICE from "./wallet/wallet";
import wallet_idl from "./interface.js";
export * from "./wallet";

function convertIdlEventMap(idlEvent: any): Event {
  return {
    id: idlEvent.id,
    timestamp: idlEvent.timestamp / BigInt(1000000),
    kind: idlEvent.kind,
  };
}
// Need to export the enumeration from wallet.did
export { Principal } from "@dfinity/agent";

async function _getAuthClient() {
  return await AuthClient.create();
}

export const authClient = _getAuthClient();

function getCanisterId(): Principal {
  // Check the query params.
  const maybeCanisterId = new URLSearchParams(window.location.search).get(
    "canisterId"
  );
  if (maybeCanisterId) {
    return Principal.fromText(maybeCanisterId);
  }

  // Return the first canister ID when resolving from the right hand side.
  const domain = window.location.hostname.split(".").reverse();
  for (const subdomain of domain) {
    try {
      if (subdomain.length >= 25) {
        // The following throws if it can't decode or the checksum is invalid.
        return Principal.fromText(subdomain);
      }
    } catch (_) {}
  }

  throw new Error("Could not find the canister ID.");
}
let walletCanisterCache: ActorSubclass<_SERVICE>;

export async function getAgentPrincipal(): Promise<Principal> {
  return (await authClient).getIdentity().getPrincipal();
}

async function getWalletCanister(): Promise<ActorSubclass<_SERVICE>> {
  if (walletCanisterCache) {
    return walletCanisterCache;
  }

  let walletId: Principal | null = null;
  walletId = getWalletId(walletId);
  const identity = (await authClient).getIdentity();
  const agent = new HttpAgent({
    identity,
  });
  if (!walletId) {
    throw new Error("Need to have a wallet ID.");
  } else {
    walletCanisterCache = Actor.createActor<_SERVICE>(wallet_idl, {
      agent,
      canisterId: (await getWalletId()) || "",
    }) as ActorSubclass<_SERVICE>;
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

  return BigInt(result);
}

export const Wallet = {
  async name(): Promise<string> {
    return (await (await getWalletCanister()).name())[0] || "";
  },
  async init(): Promise<void> {
    await this.balance();
  },
  async balance(): Promise<number> {
    return Number((await (await getWalletCanister()).wallet_balance()).amount);
  },
  async events(from?: number, to?: number): Promise<Event[]> {
    return (
      await (await getWalletCanister()).get_events([
        {
          to: to ? [to] : [],
          from: from ? [from] : [],
        },
      ])
    ).map(convertIdlEventMap);
  },
  async chart(p: ChartPrecision, count?: number): Promise<[Date, number][]> {
    const precision = precisionToNanoseconds(p);
    const optCount: [] | [number] = count ? [count] : [];
    const optPrecision: [] | [bigint] = precision ? [precision] : [];
    return (
      await (await getWalletCanister()).get_chart([
        {
          count: optCount,
          precision: optPrecision,
        },
      ])
    ).map(([a, b]) => [
      new Date(Number(BigInt(a) / BigInt(1000000))),
      Number(b),
    ]);
  },
  async create_canister(p: {
    controller?: Principal;
    cycles: number;
  }): Promise<Principal> {
    const result = await (await getWalletCanister()).wallet_create_canister({
      settings: {
        compute_allocation: [],
        controller: p.controller ? [p.controller] : [],
        freezing_threshold: [],
        memory_allocation: [],
      },
      cycles: BigInt(p.cycles),
    });
    if ("Ok" in result) {
      return result.Ok.canister_id;
    } else {
      throw result.Err;
    }
  },
  async create_wallet(p: {
    controller?: Principal;
    cycles: number;
  }): Promise<Principal> {
    const result = await (await getWalletCanister()).wallet_create_wallet({
      settings: {
        compute_allocation: [],
        controller: p.controller ? [p.controller] : [],
        freezing_threshold: [],
        memory_allocation: [],
      },
      cycles: BigInt(p.cycles),
    });
    if ("Ok" in result) {
      return result.Ok.canister_id;
    } else {
      throw result.Err;
    }
  },
  async send(p: { canister: Principal; amount: BigInt }): Promise<void> {
    await (await getWalletCanister()).wallet_send({
      canister: p.canister,
      amount: BigInt(p.amount),
    });
  },
};
