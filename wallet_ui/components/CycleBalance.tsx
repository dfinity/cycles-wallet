import React, { useEffect, useState } from "react";
import { useHistory } from "react-router";
import ReactCountUp from "react-countup";
import { Wallet } from "../canister";
import "../css/CycleBalance.css";

const FREQUENCY_IN_SECONDS = 5;

export function CycleBalance() {
  const [cycles, setCycles] = useState<number | undefined>(undefined);
  const history = useHistory();

  function refreshBalance() {
    Wallet.wallet_balance().then(
      ({ amount }) => setCycles(amount.toNumber()),
      () => history.push("/authorize")
    );
  }

  useEffect(() => {
    const iv = setInterval(refreshBalance, FREQUENCY_IN_SECONDS * 1000);
    refreshBalance();
    return () => clearInterval(iv);
  });

  if (cycles !== undefined) {
    const fontSize = `${Math.max(
      16,
      8 * (18 - Math.floor(Math.log10(cycles)))
    )}px`;

    return (
      <section>
        <h1>Balance</h1>
        <div className="cycles" style={{ fontSize }}>
          <ReactCountUp end={cycles} preserveValue separator="," />
        </div>
        <caption>cycles</caption>
      </section>
    );
  } else {
    return <></>;
  }
}
