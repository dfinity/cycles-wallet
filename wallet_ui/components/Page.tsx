import React from "react";
import '../css/Page.css';

export default ({ active, children }: any) => (
  <div className={`${active ? "active " : ""}page`}>
    {children}
  </div>
);
