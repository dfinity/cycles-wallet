import React from 'react';
import { getWalletPrincipal } from "../api";
import '../css/Button.css';
import '../css/Footer.css';
import '../css/Header.css';
import '../css/Input.css';

// Need to use `require` here for hooking into webpack loading logic.
const logo = require('../img/logo.png').default;

interface InputProperties {
  label: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export function Input({ label, onChange = () => { } }: InputProperties) {
  return (
    <div className="input">
      <label>{label}</label>
      <input onChange={onChange}/>
    </div>
  );
}

interface OutputProperties {
  label: string;
  content: string;
}

export function Output({ label, content }: OutputProperties) {
  return (
    <div className="output">
      <label>{label}</label>
      <output>{content}</output>
    </div>
  );
}

export function Button({ disabled = false, label, onClick = () => { } }: any) {
  return (
    <div className="buttonGroup">
      <button onClick={onClick} disabled={disabled}>{label}</button>
    </div>
  );
}

export function Header() {
  return (
    <div>
      <span className="wallet-id">{getWalletPrincipal()}</span>
      <img className="logo" alt="DFINITY Logo" src={logo}/>
    </div>
  );
}

export function Footer() {
  return (
    <footer>
      <span
        >Copyright © 2020 <a href="https://dfinity.org" target="_blank">DFINITY Stiftung</a
        >. All rights reserved.
      </span>
    </footer>
  );
}
