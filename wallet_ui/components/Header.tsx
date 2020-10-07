import React from 'react';

import { getWalletPrincipal } from "../api";
import '../css/Header.css';
const logo = require('../img/logo.png').default;

export default () => (
  <div>
    <span className="wallet-id">{getWalletPrincipal()}</span>
    <img className="logo" alt="DFINITY Logo" src={logo} />
  </div>
);
