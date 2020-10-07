import React from 'react';
import '../css/Input.css';

export default ({ label, onChange = () => { } }: any) => (
  <div className="input">
    <label>{label}</label>
    <input onChange={onChange} />
  </div>
);
