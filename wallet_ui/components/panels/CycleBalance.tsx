import React, { useEffect, useState } from "react";
import { useHistory } from "react-router";
import { Wallet } from "../../canister";
import "../../css/CycleBalance.css";
import { createMuiTheme, MuiThemeProvider } from "@material-ui/core/styles";
import { format_cycles_trillion_fullrange } from "../../utils/cycles";
import { Box, Tooltip, Typography } from "@material-ui/core";

const theme = createMuiTheme({
  overrides: {
    MuiTooltip: {
      tooltipPlacementRight: {
        position: "relative",
        left: 20,
      },
      tooltip: {
        fontSize: 16,
      },
    },
  },
});

export function CycleBalance() {
  const [cycles, setCycles] = useState<number | undefined>(undefined);
  const [first, setFirst] = useState(true);
  const [timeStamp, setTimeStamp] = useState(new Date());
  const [refreshRate, setRefreshRate] = useState(2);
  const history = useHistory();

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

  const cycles_string = format_cycles_trillion_fullrange(BigInt(cycles));

  return (
    <Box m={1}>
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

      <Typography component="h3" variant="h4" display="inline">
        {cycles_string && (
          <>
            <MuiThemeProvider theme={theme}>
              <Tooltip
                title={cycles.toLocaleString() + " Cycles"}
                placement="right"
              >
                <Typography
                  component="span"
                  style={{
                    fontSize: "30px",
                    fontWeight: "bold",
                  }}
                >
                  {cycles_string}
                </Typography>
              </Tooltip>
            </MuiThemeProvider>
            <Typography component="span"> TC </Typography>
          </>
        )}
      </Typography>
    </Box>
  );
}
