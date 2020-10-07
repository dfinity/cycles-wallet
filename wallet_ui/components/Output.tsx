import React from 'react';

export default ({ label, content }: any) => (
  <div className="output">
    <label>{label}</label>
    <output>{content}</output>
  </div>
);
