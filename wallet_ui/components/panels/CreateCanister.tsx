import * as React from "react";
import NumberFormat from "react-number-format";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContentText from "@material-ui/core/DialogContentText";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import makeStyles from "@material-ui/core/styles/makeStyles";
import green from "@material-ui/core/colors/green";
import FormControl from "@material-ui/core/FormControl";
import TextField from "@material-ui/core/TextField";
import { getWalletId, Principal, Wallet } from "../../canister";
import { PlainButton, PrimaryButton } from "../Buttons";
import CycleSlider from "../CycleSlider";
import AddIcon from '@material-ui/icons/Add';
import Cancel from '@material-ui/icons/Cancel';

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

const walletPrincipal = getWalletId().toString();

export function CreateCanisterDialog(props: {
  open: boolean;
  close: (err?: any) => void;
}) {
  const { open, close } = props;

  const [loading, setLoading] = React.useState(false);
  const [controller, setController] = React.useState(getWalletId().toString());
  const [cycles, setCycles] = React.useState(0);
  const [balance, setBalance] = React.useState(0);
  const [canisterId, setCanisterId] = React.useState<Principal | undefined>();
  const [error1, setError1] = React.useState(false);
  const [error2, setError2] = React.useState(false);
  const [moreControllers, setMoreControllers] = React.useState<string[] | []>([]);
  const [count, setCount] = React.useState(0);
  const classes = useStyles();

  React.useEffect(() => {
    Wallet.balance().then((amount) => {
      setBalance(amount);
    });
  }, []);

  function handleClose() {
    close();
  }
  function increaseInput() {
    setCount(count + 1);
    setMoreControllers(prev => [...prev, ""]);
  }

  function handleInputChange(ind: number, ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const newInput = moreControllers.map((controller : string, i : number) => {
      if(ind === i) {
        return ev.target.value;
      }
      return controller;
    })
    setMoreControllers(newInput);
    try {
      Principal.fromText(ev.target.value);
      setError2(false);
    } catch {
      setError2(true);
    }
  }

  function deleteInput(ind : number) {
    const result = moreControllers.filter((con : string, i: number) => {
      return ind !== i;
    });
    setMoreControllers(result);
  }

  function handleControllerChange(ev: React.ChangeEvent<HTMLInputElement>) {
    let p = ev.target.value;

    setController(p);
    try {
      Principal.fromText(p);
      setError1(false);
    } catch {
      setError1(true);
    }
  }
  function handleCycleChange(ev: React.ChangeEvent<HTMLInputElement>) {
    let c = +ev.target.value;
    setCycles(c);
  }

  function create() {
    setLoading(true);

    let additional = moreControllers.filter(ea => ea.length !== 0);
    let allControllers = [controller, ...additional];
    let result = allControllers.map(ea => Principal.fromText(ea));

    Wallet.create_canister({
      controller: result,
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
    ).catch(e => {
      console.error(e)
    });
  }

  function closeCreated() {
    close(undefined);
    setCanisterId(undefined);
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
            <div style={{display: "flex"}}>
              <TextField
                label="Controller"
                value={controller} //should default controller(walletId) be editable in the first place?
                style={{ margin: "8px 0 24px" }}
                fullWidth
                disabled={loading}
                onChange={handleControllerChange}
                error={error1}
                autoFocus
                InputLabelProps={{ shrink: true }}
              />
              <Button onClick={increaseInput}>
                <AddIcon/>
              </Button>
            </div>
            {moreControllers.map((field : string, ind : number) => (
              <div key={ind} style={{display: "flex", marginBottom: "10px"}}>
                <TextField style={{width: "95%"}}
                  label="Controller"
                  value={field}
                  disabled={loading}
                  onChange={(event) => handleInputChange(ind, event)}
                  error={error2}
                  autoFocus
                  InputLabelProps={{ shrink: true }}
                />
                <Button onClick={() => deleteInput(ind)}>
                  <Cancel/>
                </Button>
              </div>
            ))}
            <CycleSlider
              balance={balance}
              cycles={cycles}
              setCycles={setCycles}
              loading={loading}
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
            disabled={loading || error1 || error2 }
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
            <Button onClick={closeCreated} color="primary">
              Okay
            </Button>
          </DialogActions>
        </Dialog>
      </DialogActions>
    </Dialog>
  );
}
