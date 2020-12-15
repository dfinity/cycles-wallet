import React, { useEffect, useState } from "react";
import { Actor, GlobalInternetComputer, Principal } from "@dfinity/agent";
import "../css/Input.css";
import "../css/Page.css";
import { Wallet } from "../canister";
import { useHistory } from "react-router";

declare const window: GlobalInternetComputer;

export function Authorize() {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const history = useHistory();

  useEffect(() => {
    window.ic.agent.getPrincipal().then(setPrincipal);
    Wallet.wallet_balance().then(
      () => history.push("/"),
      () => {}
    );
  });

  if (principal && !principal.isAnonymous()) {
    const canisterId =
      window.ic.canister && Actor.canisterIdOf(window.ic.canister);

    return (
      <section className="active page">
        <h1>Register Device</h1>
        <p>
          This principal do not have access to this wallet. If you have
          administrative control or know someone who does, add your principal as
          custodian:
          <pre>{principal.toText()}</pre>
        </p>
        <p>
          If you are using DFX, use the following command to register your
          principal as custodian:
          <div className="output">
            <output>
              dfx canister call {canisterId?.toText() || ""} authorize
              '(principal "{principal.toText()}")'
            </output>
          </div>
        </p>
        <p>
          After this step has been performed, you can refresh this page (or it
          will refresh automatically after a while).
        </p>
      </section>
    );
  } else if (principal && principal.isAnonymous()) {
    return (
      <section className="active page">
        <h1>Anonymous Device</h1>
        You are using an anonymous Principal. You need to sign up.
      </section>
    );
  } else {
    return <></>;
  }
}
