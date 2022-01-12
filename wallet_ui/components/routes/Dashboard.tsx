import React, { useState } from "react";
import clsx from "clsx";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import { CycleBalance } from "../panels/CycleBalance";
import Drawer from "@material-ui/core/Drawer";
import { Copyright } from "../App";
import { SendCyclesDialog } from "../panels/SendCycles";
import { BalanceChart } from "../panels/BalanceChart";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import { Wallet, convertIdlEventMap } from "../../canister";
import type { Event } from "../../canister/wallet/wallet";
import Canisters from "../panels/Canisters";
import { PrimaryButton } from "../Buttons";
import Events from "../panels/Transactions";

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  toolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 8px",
    ...theme.mixins.toolbar,
  },
  drawerPaper: {
    position: "relative",
    whiteSpace: "nowrap",
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerPaperClose: {
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing(7),
    [theme.breakpoints.up("sm")]: {
      width: theme.spacing(9),
    },
  },
  menuButton: {
    marginRight: 36,
  },
  menuButtonHidden: {
    display: "none",
  },
  title: {
    flexGrow: 1,
    fontSize: "2rem",
    lineHeight: "2.34rem",
  },
  title2: {
    flexGrow: 1,
    fontSize: "1.5rem",
    lineHeight: "1.76rem",
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    height: "100vh",
    overflow: "auto",
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
}));

export type EventList = {
  canisters: Event[];
  transactions: Event[];
};

export function Dashboard(props: { open: boolean; onOpenToggle: () => void }) {
  const [cyclesDialogOpen, setCyclesDialogOpen] = useState(false);
  const [canisterCreateDialogOpen, setCanisterCreateDialogOpen] = useState(
    false
  );
  const [walletCreateDialogOpen, setWalletCreateDialogOpen] = useState(false);
  const [errorDialogContent, setErrorDialogContent] = useState<any | undefined>(
    undefined
  );
  const { open, onOpenToggle } = props;
  const classes = useStyles();

  const [events, setEvents] = useState<EventList>();
  const [action, setAction] = useState<object[]>([]);
  const [managedCanisters, updateManagedCan] = useState<object[] | undefined>();
  const reduceStart: EventList = {
    canisters: [],
    transactions: [],
  };

  const refreshEvents = async () => {
    const events = await Wallet.events();
    let sortedEvents = events
      .sort((a, b) => {
        // Reverse sort on timestamp.
        return Number(b.timestamp) - Number(a.timestamp);
      })
      .reduce((start, next) => {
        if ("CanisterCreated" in next.kind || "WalletCreated" in next.kind) {
          start.canisters.push(next);
        } else {
          start.transactions.push(next);
        }
        return start;
      }, reduceStart);

    setEvents(sortedEvents);
  };

  function checkManagedCanisters() {
    Wallet.list_managed_canisters().then((r) => {
      const managed_can = r[0];
      const result = managed_can
        .map((c) => {
          return {
            id: c.id.toString(),
            name: c.name[0],
          };
        })
        .reverse();
      updateManagedCan(result);
    });
  }

  React.useEffect(() => {
    refreshEvents();
  }, []);

  React.useEffect(() => {
    checkManagedCanisters();
  }, [action]);

  function handleWalletCreateDialogClose(maybeErr?: any) {
    setWalletCreateDialogOpen(false);
    setErrorDialogContent(maybeErr);
  }

  return (
    <>
      <Drawer
        style={{ display: "none" }}
        variant="permanent"
        classes={{
          paper: clsx(classes.drawerPaper, !open && classes.drawerPaperClose),
        }}
        open={open}
      >
        <div className={classes.toolbarIcon}>
          {" "}
          <IconButton onClick={() => onOpenToggle()}>
            <ChevronLeftIcon />
          </IconButton>
        </div>

        <Divider />
      </Drawer>

      <SendCyclesDialog
        open={cyclesDialogOpen}
        close={() => setCyclesDialogOpen(false)}
      />

      <Dialog
        open={errorDialogContent !== undefined}
        onClose={() => setErrorDialogContent(undefined)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          An error occured during the call
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Details:
            <br />
            {errorDialogContent?.toString()}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setErrorDialogContent(undefined)}
            color="primary"
            variant="contained"
          >
            Okay
          </Button>
        </DialogActions>
      </Dialog>

      <main className={classes.content}>
        <div className={classes.appBarSpacer} />

        <Container maxWidth="lg" className={classes.container}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <h1 className={classes.title}>Cycles Wallet</h1>
            </Grid>
            {/* Balance */}
            <Grid item xs={12} md={4} lg={3}>
              <Paper className={classes.paper}>
                <CycleBalance />
                <PrimaryButton
                  color="secondary"
                  type="button"
                  onClick={() => setCyclesDialogOpen(true)}
                >
                  Send Cycles
                </PrimaryButton>
              </Paper>
            </Grid>

            {/* Chart */}
            <Grid item xs={12} md={8} lg={9}>
              <Paper className={classes.paper}>
                <BalanceChart />
              </Paper>
            </Grid>

            {/* Canisters */}
            <Grid item xs={12}>
              <Paper className={classes.paper}>
                {events?.canisters && managedCanisters && (
                  <Canisters
                    canisters={events?.canisters}
                    refreshEvents={refreshEvents}
                    managedCanisters={managedCanisters}
                  />
                )}
              </Paper>
            </Grid>

            {/* Transactions */}
            <Grid item xs={12}>
              <Paper className={classes.paper}>
                {<Events transactions={events?.transactions} />}
              </Paper>
            </Grid>
          </Grid>
        </Container>

        <Box pt={4}>
          <Copyright />
        </Box>
      </main>
    </>
  );
}
