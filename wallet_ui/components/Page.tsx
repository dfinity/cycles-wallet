import React, { PropsWithChildren } from "react";
import "../css/Page.css";

export function Page(props: PropsWithChildren<{ active: boolean }>) {
  const { active, children } = props;

  if (active) {
    return <div className={`${active ? "active " : ""}page`}>{children}</div>;
  } else {
    return <></>;
  }
}
