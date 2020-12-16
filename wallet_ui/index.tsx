import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import AppBar from "@material-ui/core/AppBar";
import Link from "@material-ui/core/Link";
import Toolbar from "@material-ui/core/Toolbar";
import CssBaseline from "@material-ui/core/CssBaseline";
import {
  createMuiTheme,
  ThemeProvider,
  makeStyles,
} from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import Button from "@material-ui/core/Button";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import UiSwitch from "@material-ui/core/Switch";
import { Actor, GlobalInternetComputer, Principal } from "@dfinity/agent";
import { Wallet } from "./canister";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import {
  orange,
  lightBlue,
  deepPurple,
  deepOrange,
} from "@material-ui/core/colors";

// Routes
import { Authorize } from "./components/routes/Authorize";
import { CycleBalance } from "./components/routes/CycleBalance";

// Components
import App from "./components/App";

import "./css/main.css";

//
// function Copyright() {
// }
//
// function App() {
//   const palette = dark ? "dark" : "light";
//   const mainPrimaryColor = dark ? orange[500] : lightBlue[500];
//   const mainSecondaryColor = dark ? deepOrange[900] : deepPurple[500];
//   const theme = createMuiTheme({
//     palette: {
//       type: palette,
//       primary: {
//         main: mainPrimaryColor,
//       },
//       secondary: {
//         main: mainSecondaryColor,
//       },
//     },
//   });
//   const classes = useStyles(theme);
//
//
//   function toggleDark() {
//     const newDark = !dark;
//     setDark(newDark);
//     localStorage.setItem("dark-mode", newDark ? "1" : "");
//   }
//
//   return (
//     <ThemeProvider theme={theme}>
//       <div className={classes.root}>
//         <Router>
//           <CssBaseline />
//
//           <AppBar position="absolute" className={classes.appBar}>
//             <Toolbar>
//               <Typography variant="h6" className={classes.title}>
//                 Wallet (<span>{Actor.canisterIdOf(Wallet).toText()}</span>)
//               </Typography>
//
//               <FormGroup>
//                 <FormControlLabel
//                   control={<UiSwitch checked={dark} onChange={toggleDark} />}
//                   label={dark ? "Dark" : "Light"}
//                 />
//               </FormGroup>
//             </Toolbar>
//           </AppBar>
//
//           <main className={classes.content}>
//             <div className={classes.appBarSpacer} />
//             <Container maxWidth="lg" className={classes.container}>
//               <Grid container spacing={3}>
//                 <Switch>
//                   <Route path="/authorize">
//                     <Authorize />
//                   </Route>
//
//                   <Route path="/">
//                     <CycleBalance />
//                   </Route>
//                 </Switch>
//               </Grid>
//             </Container>
//           </main>
//
//           <Copyright />
//         </Router>
//       </div>
//     </ThemeProvider>
//   );
// }

ReactDOM.render(<App />, document.getElementById("app"));

function _addStylesheet(url: string) {
  // Add the Roboto stylesheet.
  const linkEl = document.createElement("link");
  linkEl.rel = "stylesheet";
  linkEl.href = url;
  document.head.append(linkEl);
}

_addStylesheet(
  "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
);
_addStylesheet("https://fonts.googleapis.com/icon?family=Material+Icons");
