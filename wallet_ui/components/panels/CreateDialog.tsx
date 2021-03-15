import React, { ChangeEvent, useState } from "react";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import { CircularProgress } from "@material-ui/core";
import makeStyles from "@material-ui/core/styles/makeStyles";
import green from "@material-ui/core/colors/green";
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

export function CreateDialog(props: {
  open: boolean;
  close: (err?: any) => void;
  children: React.ReactNode;
}) {
  const { open, close, children } = props;

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

    Wallet.create_wallet({
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
      <DialogTitle id="alert-dialog-title">{"Create"}</DialogTitle>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}
