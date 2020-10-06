import React from 'react';
import '../css/Button.css';

export default ({ label, onClick = () => { } }) => (
  <div class="buttonGroup">
    <p onClick={onClick}>{label}</p>
  </div>
);
