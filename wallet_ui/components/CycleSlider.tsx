import * as React from "react";
import { Box, InputLabel, Typography } from "@material-ui/core";
import { css } from "@emotion/css";
import TextField from "@material-ui/core/TextField";
import NumberFormat from "react-number-format";

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
  /* box-shadow: 280px 0 0 280px #424242; */
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
  position: relative;
  border: 1px solid #d9d9da;
  @media (prefers-color-scheme: dark) {
  }

  .input-container {
    overflow: hidden;
    position: absolute;
    bottom: -11px;
    width: 100%;
    z-index: 0;
  }

  .MuiInputLabel-formControl {
    position: static;
    margin-bottom: 24px;
  }

  input[type="range"] {
    -webkit-appearance: none;
    margin: 10px 0;
    width: 100%;
    height: 2px;

    &:focus:not(:focus-visible) {
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
`;

function NumberFormatCustom(props: any) {
  const { inputRef, onChange, ...other } = props;

  return (
    <NumberFormat
      {...other}
      getInputRef={inputRef}
      onValueChange={(values) => {
        onChange({
          target: {
            value: values.value,
          },
        });
      }}
      thousandSeparator
      isNumericString
    />
  );
}

interface Props {
  cycles: number;
  setCycles: (c: number) => void;
  balance?: number;
  startingNumber?: number;
  loading?: boolean;
}

function CycleSlider(props: Props) {
  const { balance = 0, cycles, setCycles, loading } = props;

  // TODO: Replace with dynamic value
  const cyclesSdrRate = (cycles / 1000000000000) * 0.65;
  const sdrUsdRate = 0.69977;

  function handleSlide(e: any) {
    console.log("slide", e.target.value);
    if (balance && e.target?.value) {
      const newValue = Math.floor((balance * e.target.value) / 1000);
      setCycles(newValue);
    }
  }

  return (
    <fieldset
      className={css`
        margin: 0 0 16px;
        border: none;
        padding: 0;
        &:focus-within,
        &:hover {
          label {
            color: var(--primaryContrast);
          }
        }
      `}
    >
      <InputLabel
        className={css`
          transform: scale(0.75);
          margin-bottom: 8px;
          &#cycles-label {
            position: static;
          }
        `}
        shrink={true}
        id="cycles-label"
      >
        Add Cycles
      </InputLabel>
      <div className={styles}>
        <div>
          <Box fontWeight="fontWeightBold" pt="10px" pl="12px" pr="12px">
            <TextField
              className={css`
                .MuiInputBase-root:after,
                .MuiInputBase-root:before {
                  border: none !important;
                }
              `}
              value={Number(cycles)}
              style={{ margin: "0" }}
              fullWidth
              disabled={loading}
              onChange={(e) => setCycles(Number(e.target.value))}
              InputProps={{
                inputComponent: NumberFormatCustom,
              }}
            />
          </Box>
          <Box pl="12px" mb="12px">
           ~ ${(cyclesSdrRate * sdrUsdRate).toFixed(2)}
          </Box>
        </div>
        <div className="input-container">
          <input
            type="range"
            name="cycles"
            id="cycles-range"
            disabled={loading}
            min={0}
            max={1000}
            onChange={handleSlide}
            value={(cycles * 1000) / balance}
          />
        </div>
      </div>
    </fieldset>
  );
}

export default CycleSlider;
