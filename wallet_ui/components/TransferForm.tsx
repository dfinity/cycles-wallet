import { Principal } from "@dfinity/agent";
import React from "react";
import { Button, Input } from "./ui";
import { sendCycles } from "../api";

export default function ({ onDone }: any) {
  const [ disabled, setDisabled ] = React.useState(false);
  const [ wallet, setWallet ] = React.useState('');
  const [ amount, setAmount ] = React.useState(0);

  function onClick() {
    setDisabled(true);
    sendCycles(Principal.fromText(wallet), amount).then(() => onDone());
  }

  return (
    <section>
      <h1>Transfer</h1>

      <Input label="Wallet Identifier" onChange={(ev: any) => setWallet(ev.target.value)} />
      <Input label="Amount" onChange={(ev: any) => setAmount(Number.parseInt(ev.target.value, 10))} />

      <Button disabled={disabled} label="Send Transaction" onClick={onClick} />
    </section>
  );
}
