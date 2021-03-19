import * as React from "react";
import type BigNumber from "bignumber.js";
import { InputLabel } from "@material-ui/core";
import { css } from "@emotion/css";

interface Props {
  cycleBalance?: BigNumber;
}

const thumb = css`
  border: transparent;
  height: 19.5px;
  width: 19.5px;
  border-radius: 100%;
  background-color: transparent;
  background-image: url("Handle.png"),
    -webkit-gradient(linear, left top, left bottom, color-stop(0, #fefefe), color-stop(0.49, #dddddd), color-stop(0.51, #d1d1d1), color-stop(1, #a1a1a1));
  background-size: 20px;
  background-repeat: no-repeat;
  background-position: 50%;
  opacity: 1;
  cursor: pointer;
  -webkit-appearance: none;
  margin-top: -10px;
  box-shadow: 280px 0 0 280px #424242;
`;

const track = css`
  width: 100%;
  height: 2px;
  cursor: pointer;
  box-shadow: none;
  background: linear-gradient(to right, #29abe2, #522785);
  border-radius: 1.3px;
  border: none;
`;

const styles = css`
  .MuiInputLabel-formControl {
    position: static;
    margin-bottom: 24px;
  }

  input[type="range"] {
    -webkit-appearance: none;
    margin: 18px 0;
    width: 100%;
    height: 2px;

    &:focus {
      outline: none;
    }

    /* Thumb Styles */
    &::-webkit-slider-thumb {
      ${thumb}
    }
    &::-moz-range-thumb {
      ${thumb}
    }
    &::-ms-thumb {
      ${thumb}
    }

    /* Track Styles */
    &::-webkit-slider-runnable-track {
      ${track}
    }
    &::-moz-range-track {
      ${track}
    }
    &::-ms-track {
      ${track}
    }

    &::-ms-fill-lower {
      background: #2a6495;
      border: 0.2px solid #010101;
      border-radius: 2.6px;
      box-shadow: 1px 1px 1px #000000, 0px 0px 1px #0d0d0d;
    }

    &::-ms-fill-upper {
      background: #3071a9;
      border: 0.2px solid #010101;
      border-radius: 2.6px;
      box-shadow: 1px 1px 1px #000000, 0px 0px 1px #0d0d0d;
    }

    &:focus {
      &::-ms-fill-lower {
        background: #3071a9;
      }

      &::-ms-fill-upper {
        background: #367ebd;
      }

      &::-webkit-slider-runnable-track {
        background: linear-gradient(to right, #29abe2, #522785);
      }
    }
  }
  @media screen and (-webkit-min-device-pixel-ratio: 0) {
    input[type="range"] {
      overflow-x: clip;
    }
  }
`;

function CycleSlider(props: Props) {
  const [cycles, setCycles] = React.useState(0);

  const { cycleBalance } = props;

  return (
    <div className={styles}>
      <InputLabel>Add Cycles</InputLabel>
      <input type="range" name="cycles" id="cycles-range" min={0} max={1000} />
    </div>
  );
}

export default CycleSlider;
