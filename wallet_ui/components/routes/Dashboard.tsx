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
import Events from "../panels/Events";
import Drawer from "@material-ui/core/Drawer";
import { Copyright } from "../App";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItem from "@material-ui/core/ListItem";
import SendIcon from "@material-ui/icons/Send";
import List from "@material-ui/core/List";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { SendCyclesDialog } from "../panels/SendCycles";
import { BalanceChart } from "../panels/BalanceChart";
import { CreateCanisterDialog } from "../panels/CreateCanister";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import { DialogContent } from "@material-ui/core";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";

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
  fixedHeight: {
    height: 360,
  },
}));

export function Dashboard(props: { open: boolean; onOpenToggle: () => void }) {
  const [cyclesDialogOpen, setCyclesDialogOpen] = useState(false);
  const [canisterCreateDialogOpen, setCanisterCreateDialogOpen] = useState(false);
  const [errorDialogContent, setErrorDialogContent] = useState<any | undefined>(
    undefined
  );
  const { open, onOpenToggle } = props;
  const classes = useStyles();
  const fixedHeightPaper = clsx(classes.paper, classes.fixedHeight);

  function handleCyclesDialogClose(maybeErr?: any) {
    setCyclesDialogOpen(false);
    setErrorDialogContent(maybeErr);
  }
  function handleCyclesDialogOpen() {
    setCyclesDialogOpen(true);
  }

  function handleCanisterCreateDialogClose(maybeErr?: any) {
    setCanisterCreateDialogOpen(false);
    setErrorDialogContent(maybeErr);
  }
  function handleCanisterCreateDialogOpen() {
    setCanisterCreateDialogOpen(true);
  }

  return (
    <>
      <Drawer
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
        <List>
          <ListItem button onClick={handleCyclesDialogOpen}>
            <ListItemIcon>
              <SendIcon />
            </ListItemIcon>
            <ListItemText primary="Send Cycles" />
          </ListItem>
          <ListItem button onClick={handleCanisterCreateDialogOpen}>
            <ListItemIcon>
              <AddCircleOutlineIcon />
            </ListItemIcon>
            <ListItemText primary="Create a Canister" />
          </ListItem>
        </List>
      </Drawer>

      <SendCyclesDialog
        open={cyclesDialogOpen}
        close={handleCyclesDialogClose}
      />

      <CreateCanisterDialog
        open={canisterCreateDialogOpen}
        close={handleCanisterCreateDialogClose}
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
          >
            Okay
          </Button>
        </DialogActions>
      </Dialog>

      <main className={classes.content}>
        <div className={classes.appBarSpacer} />

        <Container maxWidth="lg" className={classes.container}>
          <Grid container spacing={3}>
            {/* Balance */}
            <Grid item xs={12} md={4} lg={3}>
              <Paper className={fixedHeightPaper}>
                <CycleBalance />
              </Paper>
            </Grid>

            {/* Chart */}
            <Grid item xs={12} md={8} lg={9}>
              <Paper className={fixedHeightPaper}>
                <BalanceChart />
              </Paper>
            </Grid>

            {/* Recent Events */}
            <Grid item xs={12}>
              <Paper className={classes.paper}>
                <Events />
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
