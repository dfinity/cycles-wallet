import React from "react";
import ReactDOM from "react-dom";

// Components
import App from "./components/App";

import "./css/main.css";

ReactDOM.render(<App />, document.getElementById("app"));

function _addStylesheet(url: string) {
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
