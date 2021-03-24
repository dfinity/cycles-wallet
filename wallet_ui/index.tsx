import React from "react";
import ReactDOM from "react-dom";

// Components
import App from "./components/App";

import "./css/main.css";

const render = () => {
  ReactDOM.render(<App />, document.getElementById("app"));
};
render();

// Hot Module Replacement API
if (module.hot) {
  module.hot.accept("./components/App", render);
}
