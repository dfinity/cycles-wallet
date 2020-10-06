import React from 'react';

export default ({ label, content }) => (
  <div class="output">
    <label>{label}</label>
    <output>{content}</output>
  </div>
);
