import React from 'react';
import '../css/Button.css';

export default ({ label, onClick = () => { } }: any) => (
  <div className="buttonGroup">
    <p onClick={onClick}>{label}</p>
  </div>
);
