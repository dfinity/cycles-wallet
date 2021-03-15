import * as React from "react";
import type { ButtonBaseProps } from "@material-ui/core/ButtonBase";
import { css } from "@emotion/css";

export const PrimaryButton = (props: ButtonBaseProps) => {
  const { children, ...rest } = props;
  return (
    <button
      className={
        "primary-button " +
        css`
          padding: 10px 64px;
          font-size: 1rem;
          border-radius: 4px;
          margin-bottom: 24px;
          &.primary-button {
            background-color: var(--primaryColor);
            color: var(--primaryContrast);
          }
        `
      }
      {...rest}
    >
      {children}
    </button>
  );
};

export const PlainButton = (props: ButtonBaseProps) => {
  const { children, ...rest } = props;
  return (
    <button
      className={css`
        padding: 10px 64px;
        font-size: 1rem;
        border-radius: 4px;
        margin-bottom: 24px;
        color: var(--textColor);
      `}
      {...rest}
    >
      {children}
    </button>
  );
};
