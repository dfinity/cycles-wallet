import React, { useEffect, useState } from "react";
import { useHistory } from "react-router";
import { Wallet } from "../../canister";
import "../../css/CycleBalance.css";
import Typography from "@material-ui/core/Typography";
import makeStyles from "@material-ui/core/styles/makeStyles";
import { useLocalStorage } from "../../utils/hooks";
import { format_cycles_and_suffix } from "../../utils/cycles";
import Box from "@material-ui/core/Box";

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
  const [refreshRate, setRefreshRate] = useState(2);
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

  const [cycles_string, suffix] = format_cycles_and_suffix(BigInt(cycles));
  return (
    <Box mb={2}>
      <Typography
        component="h2"
        variant="h5"
        gutterBottom
        style={{ fontWeight: "bold" }}
      >
        Balance
      </Typography>
      <Typography component="p" gutterBottom>
        Current cycles in this wallet
      </Typography>

      <Typography component="h3" variant="h4">
        {cycles_string && (
          <>
            <span style={{ fontSize: "48px", fontWeight: "bold" }}>
              {cycles_string}
            </span>
            <Typography component="span"> {suffix}C</Typography>
          </>
        )}
      </Typography>
    </Box>
  );
}
