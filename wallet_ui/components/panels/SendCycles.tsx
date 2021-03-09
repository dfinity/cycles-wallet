import NumberFormat from "react-number-format";
import React, { ChangeEvent, useState } from "react";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContentText from "@material-ui/core/DialogContentText";
import Button from "@material-ui/core/Button";
import { CircularProgress } from "@material-ui/core";
import makeStyles from "@material-ui/core/styles/makeStyles";
import green from "@material-ui/core/colors/green";
import Typography from "@material-ui/core/Typography";
import FormControl from "@material-ui/core/FormControl";
import TextField from "@material-ui/core/TextField";
import { Principal, Wallet } from "../../canister";

const useStyles = makeStyles((theme) => ({
  wrapper: {
    margin: theme.spacing(1),
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    display: "flex",
    flexWrap: "wrap",
  },
}));

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
      suffix=" cycles"
    />
  );
}

export function SendCyclesDialog(props: {
  open: boolean;
  close: (err?: any) => void;
}) {
  const { open, close } = props;

  const [loading, setLoading] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [cycles, setCycles] = useState(0);
  const [error, setError] = useState(false);
  const classes = useStyles();

  function handleClose() {
    close();
  }
  function handlePrincipalChange(ev: ChangeEvent<HTMLInputElement>) {
    let p = ev.target.value;

    setPrincipal(p);
    try {
      Principal.fromText(p);
      setError(false);
    } catch {
      setError(true);
    }
  }
  function handleCycleChange(ev: ChangeEvent<HTMLInputElement>) {
    let c = +ev.target.value;
    setCycles(c);
  }

  function send() {
    setLoading(true);

    Wallet.send({
      canister: Principal.fromText(principal),
      amount: cycles,
    }).then(
      () => {
        setLoading(false);
        close();
      },
      (err) => {
        setLoading(false);
        close(err);
      }
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableEscapeKeyDown={loading}
      disableBackdropClick={loading}
      aria-labelledby="alert-dialog-title"
    >
      <DialogTitle id="alert-dialog-title">
        {"Send Cycles to Another Canister"}
      </DialogTitle>
      <DialogContent>
        <div>
          <DialogContentText>
            Send cycles to a canister. Do not send cycles to a user, the call
            will fail. This cannot be validated from the user interface.
          </DialogContentText>
          <FormControl className={classes.formControl}>
            <TextField
              label="Principal"
              value={principal}
              style={{ margin: 8 }}
              fullWidth
              disabled={loading}
              onChange={handlePrincipalChange}
              error={error}
              autoFocus
            />
            <TextField
              label="Cycles"
              value={cycles}
              style={{ margin: 8 }}
              fullWidth
              disabled={loading}
              onChange={handleCycleChange}
              InputProps={{
                inputComponent: NumberFormatCustom,
              }}
            />
          </FormControl>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary" disabled={loading}>
          Cancel
        </Button>
        <div className={classes.wrapper}>
          <Button
            variant="contained"
            disabled={loading || principal == "" || error}
            onClick={send}
            color="secondary"
            autoFocus
          >
            Send Cycles
          </Button>
          {loading && (
            <CircularProgress size={24} className={classes.buttonProgress} />
          )}
        </div>
      </DialogActions>
    </Dialog>
  );
}
