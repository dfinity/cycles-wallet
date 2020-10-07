import React from 'react';

import '../css/Header.css';
const logo = require('../img/logo.png').default;

export default () => (
  <img className="logo" alt="DFINITY Logo" src={logo} />
);
