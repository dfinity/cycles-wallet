import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router";
import ReactCountUp from "react-countup";
import { Wallet } from "../../canister";
import "../../css/CycleBalance.css";
import Typography from "@material-ui/core/Typography";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Timeago from "react-timeago";
import { useLocalStorage } from "../../utils/hooks";

const useStyles = makeStyles((theme) => ({
  depositContext: {
    flex: 1,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    float: "right",
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
}));

const SUFFIX_LIST = " KMGTPE";

export function CycleBalance() {
  const [cycles, setCycles] = useState<number | undefined>(undefined);
  const [first, setFirst] = useState(true);
  const [timeStamp, setTimeStamp] = useState(new Date());
  const [refreshRate, setRefreshRate] = useLocalStorage(
    "cycle-refresh-rate",
    0
  );
  const history = useHistory();
  const classes = useStyles();

  function refreshBalance() {
    Wallet.balance().then(
      (amount) => {
        setTimeStamp(new Date());
        if (cycles !== undefined) {
          setFirst(false);
        }
        setCycles(amount);
      },
      () => history.push("/authorize")
    );
  }

  useEffect(() => {
    if (cycles === undefined || refreshRate > 0) refreshBalance();

    if (refreshRate > 0) {
      const iv = setInterval(refreshBalance, refreshRate * 1000);
      return () => clearInterval(iv);
    }
  }, [refreshRate]);

  if (cycles === undefined) {
    return <></>;
  }

  const suffix =
    SUFFIX_LIST[Math.min(6, Math.floor(Math.log10(5000000000000) / 3))];
  const ll = SUFFIX_LIST.indexOf(suffix);
  const humanCycles = Math.floor(cycles / 10 ** (ll * 3));
  console.log(cycles, humanCycles);

  return (
    <React.Fragment>
      <Typography
        component="h2"
        variant="h5"
        color="primary"
        gutterBottom
        style={{ fontWeight: "bold" }}
      >
        Balance
      </Typography>
      <Typography component="p" color="primary" gutterBottom>
        Current cycles in this wallet
      </Typography>

      <Typography component="h3" variant="h4">
        {humanCycles && (
          <>
            <span style={{ fontSize: "48px", fontWeight: "bold" }}>
              {humanCycles}
            </span>
            <Typography component="span"> TC</Typography>
          </>
        )}
      </Typography>
    </React.Fragment>
  );
}
