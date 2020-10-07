import React from 'react';
import '../css/Button.css';

export default ({ disabled = false, label, onClick = () => { } }: any) => (
  <div className="buttonGroup">
    <button onClick={onClick} disabled={disabled}>{label}</button>
  </div>
);
