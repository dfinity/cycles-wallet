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
      () => history.push(`/authorize${location.search}`)
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
  const humanCycles = parseFloat((cycles / 10 ** (ll * 3)).toFixed(5));

  return (
    <React.Fragment>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        Balance (cycles)
      </Typography>

      <Typography component="p" variant="h4">
        {(() => {
          if (cycles === undefined) {
            return <></>;
          }

          return (
            <ReactCountUp
              end={humanCycles}
              duration={
                /* countup.js uses falsey checks, so we cannot use 0. Duration is in seconds. */
                first ? 0.001 : undefined
              }
              decimals={6}
              decimal="."
              preserveValue
              separator=","
              suffix={" " + suffix}
            />
          );
        })()}
      </Typography>
      <Typography color="textSecondary" className={classes.depositContext}>
        <Timeago date={timeStamp} />
      </Typography>
      <Typography>
        <FormControl className={classes.formControl}>
          <InputLabel id="autorefresh-label">Autorefresh</InputLabel>
          <Select
            labelId="autorefresh-label"
            value={refreshRate}
            onChange={({ target }) => {
              if (typeof target.value == "number") setRefreshRate(target.value);
            }}
          >
            <MenuItem value={0}>Never</MenuItem>
            <MenuItem value={5}>Constantly</MenuItem>
            <MenuItem value={30}>Few Seconds</MenuItem>
            <MenuItem value={300}>Few Minutes</MenuItem>
          </Select>
        </FormControl>
      </Typography>
    </React.Fragment>
  );
}
