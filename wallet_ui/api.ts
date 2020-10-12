import { Actor, GlobalInternetComputer, Principal } from '@dfinity/agent';
import WalletIdl from './wallet.did';

declare const window: GlobalInternetComputer;

const wallet = new (Actor.createActorClass(WalletIdl))({
  canisterId: '' + process.env.CANISTER_ID,
});

export async function getBalance(): Promise<number> {
  const cycles = await wallet.cycle_balance() as any;
  return cycles.toNumber();
}

export interface Transaction {
  id: number;
  unit: string;
  account: string;
  amount: number;
  timestamp: number;
}

export async function getTransactions(): Promise<Transaction[]> {
  const events = await wallet.get_events() as any;
  return events.filter((ev: any) => ev.kind.UnitSent || ev.kind.UnitReceived).map(formatEvent);
};

export const sendCycles = (to: Principal, amount: number) => {
  return wallet.send_cycles(to, amount) as any;
};

function getUnitName(unit: Uint8Array): string {
  // It's almost cheating...
  switch (unit.toString()) {
    case "[0]": return "cycles";
    case "[1]": return "tokens";
    default: return "unknown";
  }
}

const formatEvent = ({ id, kind, timestamp }: any) => {
  let { to, from, amount, unit } = kind.UnitSent || kind.UnitReceived || {};
  return ({
    id: id,
    unit: unit ? getUnitName(unit) : "",
    account: to ? to.toString() : from.toString(),
    amount: to ? -amount.toNumber() : amount.toNumber(),
    timestamp: timestamp.toNumber() / Math.pow(10, 6),
  });
};

export const getDevices = async () => {
  const devices = await wallet.get_devices() as any;
  return devices.map((device: any) => device.name);
};

export async function getCurrentPrincipal(): Promise<string> {
  return (window.ic.agent as any)._principal;
}

export function getWalletPrincipal(): string {
  return Actor.canisterIdOf(wallet).toText();
}
