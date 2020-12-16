import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { makeStyles } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import Switch from "@material-ui/core/Switch";
import Drawer from "@material-ui/core/Drawer";
import Box from "@material-ui/core/Box";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import List from "@material-ui/core/List";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import Badge from "@material-ui/core/Badge";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Link from "@material-ui/core/Link";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import NotificationsIcon from "@material-ui/icons/Notifications";
import {
  orange,
  lightBlue,
  deepPurple,
  deepOrange,
} from "@material-ui/core/colors";
import {
  HashRouter as Router,
  Switch as RouterSwitch,
  Route,
} from "react-router-dom";

// For Switch Theming
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";

// Routes
import { Authorize } from "./routes/Authorize";
import { CycleBalance } from "./routes/CycleBalance";

function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {"Copyright © "}
      <Link color="inherit" href="https://dfinity.org/">
        DFINITY Stiftung. All rights reserved.
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  toolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 8px",
    ...theme.mixins.toolbar,
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
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
    height: 240,
  },
}));

function useDarkState(): [boolean, (newState?: boolean) => void] {
  const localStorageKey = "dark-mode";
  const darkModeMediaMatch = "(prefers-color-scheme: dark)";
  const darkStorage = localStorage.getItem(localStorageKey);
  const defaultDarkMode =
    darkStorage === null
      ? window.matchMedia(darkModeMediaMatch).matches
      : darkStorage == "1";

  const [dark, setDark] = useState(defaultDarkMode);

  // Listen to media changes, and if local storage isn't set, change it when dark mode is
  // enabled system-wide.
  useEffect(() => {
    function listener(event: MediaQueryListEvent) {
      if (darkStorage !== null) {
        return;
      }
      if (event.matches) {
        setDark(true);
      } else {
        setDark(false);
      }
    }

    const media = window.matchMedia(darkModeMediaMatch);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, []);

  return [
    dark,
    function (newDark: boolean = !dark) {
      setDark(newDark);
      localStorage.setItem(localStorageKey, newDark ? "1" : "0");
    },
  ];
}

export default function Dashboard() {
  const [open, setOpen] = useState(true);
  const [darkState, setDarkState] = useDarkState();
  const palletType = darkState ? "dark" : "light";
  const mainPrimaryColor = darkState ? orange[500] : lightBlue[500];
  const mainSecondaryColor = darkState ? deepOrange[900] : deepPurple[500];
  const darkTheme = createMuiTheme({
    palette: {
      type: palletType,
      primary: {
        main: mainPrimaryColor,
      },
      secondary: {
        main: mainSecondaryColor,
      },
    },
  });
  const classes = useStyles();

  const fixedHeightPaper = clsx(classes.paper, classes.fixedHeight);

  return (
    <ThemeProvider theme={darkTheme}>
      <Router>
        <div className={classes.root}>
          <CssBaseline />
          <AppBar position="absolute" className={classes.appBar}>
            <Toolbar className={classes.toolbar}>
              <Typography
                component="h1"
                variant="h6"
                color="inherit"
                noWrap
                className={classes.title}
              >
                Wallet
              </Typography>
              <Switch
                checked={darkState}
                onChange={() => setDarkState(!darkState)}
              />
              <IconButton color="inherit">
                <Badge badgeContent={4} color="secondary">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Toolbar>
          </AppBar>

          <main className={classes.content}>
            <div className={classes.appBarSpacer} />

            <RouterSwitch>
              <Route path="/authorize">
                <Authorize />
              </Route>

              <Route path="/">
                <CycleBalance />
              </Route>
            </RouterSwitch>

            <Box pt={4}>
              <Copyright />
            </Box>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}
