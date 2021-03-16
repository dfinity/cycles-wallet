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
import { PlainButton, PrimaryButton } from "../Buttons";

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

export function CreateCanisterDialog(props: {
  open: boolean;
  close: (err?: any) => void;
}) {
  const { open, close } = props;

  const [loading, setLoading] = useState(false);
  const [controller, setController] = useState("");
  const [cycles, setCycles] = useState(0);
  const [canisterId, setCanisterId] = useState<Principal | undefined>();
  const [error, setError] = useState(false);
  const classes = useStyles();

  function handleClose() {
    close();
  }
  function handleControllerChange(ev: ChangeEvent<HTMLInputElement>) {
    let p = ev.target.value;

    setController(p);
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

  function create() {
    setLoading(true);

    Wallet.create_canister({
      controller: controller ? Principal.fromText(controller) : undefined,
      cycles,
    }).then(
      (canisterId) => {
        setLoading(false);
        setCanisterId(canisterId);
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
        {"Create a new Canister"}
      </DialogTitle>
      <DialogContent>
        <div>
          <DialogContentText>
            Create a canister. If the controller field is left empty, the
            controller will be this wallet canister.
          </DialogContentText>
          <FormControl className={classes.formControl}>
            <TextField
              label="Controller"
              value={controller}
              style={{ margin: 8 }}
              fullWidth
              disabled={loading}
              onChange={handleControllerChange}
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
        <PlainButton onClick={handleClose} color="primary" disabled={loading}>
          Cancel
        </PlainButton>
        <div className={classes.wrapper}>
          <PrimaryButton
            disabled={loading || error}
            onClick={create}
            color="secondary"
            autoFocus
          >
            Create
          </PrimaryButton>
          {loading && (
            <CircularProgress size={24} className={classes.buttonProgress} />
          )}
        </div>

        <Dialog
          open={canisterId !== undefined}
          onClose={() => close(undefined)}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">New Canister ID</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Canister ID: {canisterId?.toString()}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => close(undefined)} color="primary">
              Okay
            </Button>
          </DialogActions>
        </Dialog>
      </DialogActions>
    </Dialog>
  );
}
