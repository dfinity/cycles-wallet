import React from 'react';
import '../css/Input.css';

export default ({ label, onChange = () => { } }) => (
  <div class="input">
    <label>{label}</label>
    <input onChange={onChange} />
  </div>
);
