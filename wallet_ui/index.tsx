/**
 * Module     : index.jsx
 * Copyright  : Enzo Haussecker
 * License    : Apache 2.0 with LLVM Exception
 * Maintainer : Enzo Haussecker <enzo@dfinity.org>
 * Stability  : Stable
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import Page from './components/Page';
import { Button, Header, Footer } from './components/ui';
import TextButton from './components/TextButton';

// Main
import { BalanceWidget } from './components/Balance';
import { TransactionList } from './components/TransactionList';

// Transfer
import TransferForm from './components/TransferForm';

// Connect
import DeviceList from './components/DeviceList';

// Register
import RegisterForm from './components/RegisterForm';
import WebAuthnController from './authentication/controllers/WebAuthnAuthenticationController';

import './css/main.css';
import { getBalance } from "./api";

class App extends React.Component<{}, { active: string }> {
  protected webAuthn = WebAuthnController();

  constructor(props: object) {
    super(props);
    this.state = { active: 'connect' };
    this.setActive = this.setActive.bind(this);
  }

  setActive(page: string) {
    return () => this.setState({ active: page });
  }

  render() {
    const { active } = this.state;
    return (
      <div className="container">
        <Header />

        <Page active={active === 'main'}>
          <BalanceWidget fn={getBalance} unit="cycles" />
          <TransactionList />
          <Button label="Add Transaction" onClick={this.setActive("transfer")} />
        </Page>

        <Page active={active === 'transfer'}>
          <TransferForm onDone={this.setActive("main")} />
          <TextButton label="Cancel" onClick={this.setActive("main")} />
        </Page>

        <Page active={active === 'connect'}>
          <DeviceList onClick={this.setActive("main")} />
          <Button label="Register New Device" onClick={this.setActive("register")} />
        </Page>

        <Page active={active === 'register'}>
          <RegisterForm onClick={this.setActive("main")} webAuthn={this.webAuthn} />
        </Page>

        <Footer />
      </div>
    );
  }
}

export default App;

ReactDOM.render(<App />, document.getElementById('app'));
