import React from "react";
import ReactDOM from "react-dom";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";

// Main
import { Authorize } from "./components/Authorize";
import { CycleBalance } from "./components/CycleBalance";

import "./css/main.css";

function App() {
  return (
    <Router>
      <Header />

      <Switch>
        <Route path="/authorize">
          <Authorize />
        </Route>

        <Route path="/">
          <CycleBalance />
        </Route>
      </Switch>

      <Footer />
    </Router>
  );
}

ReactDOM.render(<App />, document.getElementById("app"));
