import React from 'react';
import '../css/Button.css';

export default ({ label, onClick = () => { } }) => (
  <div class="buttonGroup">
    <button onClick={onClick}>{label}</button>
  </div>
);
