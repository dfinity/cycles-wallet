import React, { useEffect, useState } from "react";
import makeStyles from "@material-ui/core/styles/makeStyles";
import CssBaseline from "@material-ui/core/CssBaseline";
import { WalletAppBar } from "./WalletAppBar";
import Typography from "@material-ui/core/Typography";
import Link from "@material-ui/core/Link";
import {
  BrowserRouter as Router,
  Switch as RouterSwitch,
  Route,
  Redirect,
} from "react-router-dom";

// For Switch Theming
import ThemeProvider from "@material-ui/styles/ThemeProvider";

// For document title setting
import { Wallet } from "../canister";

// Routes
import { Authorize } from "./routes/Authorize";
import { Dashboard } from "./routes/Dashboard";
import { useLocalStorage } from "../utils/hooks";
import generateTheme from "../utils/materialTheme";
import { authClient } from "../utils/authClient";

export function Copyright() {
  return (
    <Typography
      variant="body2"
      color="textSecondary"
      align="center"
      style={{ marginBottom: "32px" }}
    >
      {"Copyright © "}
      <Link color="inherit" href="https://dfinity.org/">
        DFINITY Stiftung. All rights reserved.
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

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

export default function App() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<null | boolean>(null);
  const [open, setOpen] = useLocalStorage("app-menu-open", false);
  const [darkState, setDarkState] = useDarkState();
  const classes = useStyles();
  const theme = generateTheme(darkState);

  useEffect(() => {
    Wallet.name().then((name) => {
      document.title = name;
    });
  }, []);

  useEffect(() => {
    if (!authClient.ready) {
      return;
    }
    setReady(true);
    authClient.isAuthenticated().then((value) => {
      setIsAuthenticated(value ?? false);
    });
  }, [authClient.ready]);

  if (!ready) return null;

  return (
    <ThemeProvider theme={theme}>
      <style key={`darkState-${darkState}`}>
        {`
        :root {
          --primaryColor: ${darkState ? "rgba(69, 70, 81, 0.75)" : "#292a2e"};
          --primaryContrast: white;
          --textColor: ${darkState ? "white" : "black"};
          --backgroundColor: ${darkState ? "#3030" : "white"};
        }
      `}
      </style>
      <Router>
        <div className={classes.root}>
          <CssBaseline />
          <WalletAppBar
            dark={darkState}
            onDarkToggle={() => setDarkState(!darkState)}
            open={open}
            onOpenToggle={() => setOpen(!open)}
          />

          <RouterSwitch>
            <Route path="/authorize">
              <Authorize setIsAuthenticated={setIsAuthenticated} />
            </Route>

            <Route path="/">
              {authClient.ready && isAuthenticated === false ? (
                <Redirect
                  to={{
                    pathname: `/authorize`,
                    search: location.search,
                  }}
                />
              ) : (
                <Dashboard open={open} onOpenToggle={() => setOpen(!open)} />
              )}
            </Route>
          </RouterSwitch>
        </div>
      </Router>
    </ThemeProvider>
  );
}
