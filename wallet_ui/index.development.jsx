import React from "react";
import ReactDOM from "react-dom";


import {
  Actor,
  AnonymousIdentity,
  HttpAgent,
  makeExpiryTransform,
  makeNonceTransform,
  getManagementCanister,
} from "@dfinity/agent";
import "./css/main.css";

import { Ed25519KeyIdentity } from "@dfinity/authentication";

const identity = Ed25519KeyIdentity.generate();

function PolyfillAgent({ log = console } = {}) {
  const agentOptions = {
    host: "http://localhost:8000",
    identity: identity,
  };
  log.debug("PolyfillAgent creating HttpAgent with options", agentOptions);
  const agent = new HttpAgent(agentOptions);
  agent.addTransform(makeNonceTransform());
  agent.addTransform(makeExpiryTransform(5 * 60 * 1000));
  return agent;
}

window.ic = {
  agent: PolyfillAgent(),
  canister: Actor.createActor(({ IDL: IDL_ }) => IDL_.Service({}), {
    canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  }),
};

// Components

import("./components/App").then((App) => {
  ReactDOM.render(<App />, document.getElementById("app"));

  console.log("success");
});

function _addStylesheet(url) {
  // Add the Roboto stylesheet.
  const linkEl = document.createElement("link");
  linkEl.rel = "stylesheet";
  linkEl.href = url;
  document.head.append(linkEl);
}

_addStylesheet(
  "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
);
_addStylesheet("https://fonts.googleapis.com/icon?family=Material+Icons");

if (module.hot) {
  module.hot.accept("./components/App.tsx", function () {
    console.log("Accepting the updated printMe module!");
    printMe();
  });
}
