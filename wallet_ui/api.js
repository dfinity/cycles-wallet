import Wallet from 'ic:canisters/wallet';

const DEBUG = false;

export const getBalance = async () => {
  if (DEBUG) { return 5 * Math.pow(10, 12); }
  return await Wallet.cycle_balance().then((cycles) => cycles.toNumber());
}

const mockTxn = {
  account: "do2cr-xieaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-q",
  amount: 250000,
  timestamp: 1601071776000,
};

export const getTransactions = async () => {
  if (DEBUG) { return new Promise((resolve) => resolve([mockTxn, mockTxn, mockTxn])); }
  const events = await Wallet.get_events();
  return events.map(formatEvent);
};

export const sendCycles = (to, amount) => {
  if (DEBUG) { return; }
  return Wallet.send_cycles(to, amount);
};

const formatEvent = ({ CyclesSent, CyclesReceived }) => {
  let { id, to, from, amount, timestamp } = CyclesSent || CyclesReceived;
  return ({
    id: id,
    account: to ? to.toString() : from.toString(),
    amount: to ? -amount.toNumber() : amount.toNumber(),
    timestamp: timestamp.toNumber() / Math.pow(10, 6),
  });
};

export const getDevices = async () => {
  if (DEBUG) { return new Promise((resolve) => resolve([])); }
  const devices = await Wallet.get_devices();
  return devices.map(device => device.name);
};

export const getCurrentPrincipal = async () => {
  if (DEBUG) { return new Promise((resolve) => { resolve("abc123") }); }
  return await window.ic.agent._principal;
}

export const getWalletPrincipal = () => {
  const symbols = Object.getOwnPropertySymbols(Wallet);
  return Wallet[symbols[0]].canisterId;
}
