import * as React from "react";
import ButtonBase from "@material-ui/core/ButtonBase";
import type { ButtonBaseProps } from "@material-ui/core/ButtonBase";
import { RestaurantMenuSharp } from "@material-ui/icons";
import "../css/Buttons.scss";

export const PrimaryButton = (props: ButtonBaseProps) => {
  const { children, ...rest } = props;
  return (
    <ButtonBase className="primary-button" {...rest}>
      {children}
    </ButtonBase>
  );
};
