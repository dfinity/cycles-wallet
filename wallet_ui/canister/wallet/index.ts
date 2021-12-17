import WalletIdlFactory from "./wallet.did";
import { IDL } from "@dfinity/candid";

export * from "./wallet";

export default WalletIdlFactory as IDL.InterfaceFactory;
