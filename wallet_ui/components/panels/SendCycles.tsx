import NumberFormat from "react-number-format";
import React, { ChangeEvent, useEffect, useState } from "react";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContentText from "@material-ui/core/DialogContentText";
import Button from "@material-ui/core/Button";
import { Box, CircularProgress } from "@material-ui/core";
import makeStyles from "@material-ui/core/styles/makeStyles";
import green from "@material-ui/core/colors/green";
import Typography from "@material-ui/core/Typography";
import FormControl from "@material-ui/core/FormControl";
import TextField from "@material-ui/core/TextField";
import { Principal, Wallet } from "../../canister";
import CycleSlider from "../CycleSlider";

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
    marginBottom: "24px",
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
  const [balance, setBalance] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [error, setError] = useState(false);
  const classes = useStyles();

  useEffect(() => {
    Wallet.balance().then((amount) => {
      setBalance(amount);
    });
  }, []);

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
      <Box p={3}>
        <Typography id="alert-dialog-title" variant="h4" component="h2">
          Send Cycles
        </Typography>
        <Typography>Send to an existing or new canister.</Typography>
      </Box>
      <DialogContent>
        <div>
          <FormControl className={classes.formControl}>
            <TextField
              label="Enter Canister Principal"
              value={principal}
              fullWidth
              disabled={loading}
              onChange={handlePrincipalChange}
              error={error}
              autoFocus
              InputLabelProps={{ shrink: true }}
            />
          </FormControl>
          <CycleSlider balance={balance} />
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
