import React from "react";
import '../css/Page.css';

export default ({ active, children }) => (
  <div className={`${active ? "active " : ""}page`}>
    {children}
  </div>
);
