import React, { useEffect, useState } from "react";
import { Actor, GlobalInternetComputer, Principal } from "@dfinity/agent";
import { Wallet } from "../../canister";
import { useHistory } from "react-router";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";

import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import sh from "react-syntax-highlighter/dist/esm/languages/hljs/shell";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

SyntaxHighlighter.registerLanguage("shell", sh);

declare const window: GlobalInternetComputer;

const CHECK_ACCESS_FREQUENCY_IN_SECONDS = 15;

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
  seeMore: {
    marginTop: theme.spacing(3),
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
}));

export function Authorize() {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const history = useHistory();
  const classes = useStyles();

  function checkAccess() {
    Wallet.wallet_balance().then(
      () => history.push("/"),
      () => {}
    );
  }

  useEffect(() => {
    window.ic.agent.getPrincipal().then(setPrincipal);
    checkAccess();

    const id = setInterval(
      checkAccess,
      CHECK_ACCESS_FREQUENCY_IN_SECONDS * 1000
    );
    return () => clearInterval(id);
  }, []);

  if (principal && !principal.isAnonymous()) {
    const canisterId =
      window.ic.canister && Actor.canisterIdOf(window.ic.canister);

    return (
      <Container maxWidth="lg" className={classes.container}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <Typography
                component="h2"
                variant="h6"
                color="primary"
                gutterBottom
              >
                Register Device
              </Typography>
              <Typography variant="body1" color="textPrimary">
                This principal do not have access to this wallet. If you have
                administrative control or know someone who does, add your
                principal as custodian:
                <pre>{principal.toText()}</pre>
              </Typography>
              <Typography variant="body1" color="textPrimary">
                If you are using DFX, use the following command to register your
                principal as custodian:
                <SyntaxHighlighter language="sh" style={docco}>
                  {`dfx canister call ${
                    canisterId?.toText() || ""
                  } authorize '(principal "{principal.toText()}")'`}
                </SyntaxHighlighter>
              </Typography>
              <Typography variant="body1" color="textPrimary">
                After this step has been performed, you can refresh this page
                (or it will refresh automatically after a while).
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    );
  } else if (principal && principal.isAnonymous()) {
    return (
      <section className="active page">
        <h1>Anonymous Device</h1>
        You are using an anonymous Principal. You need to sign up.
      </section>
    );
  } else {
    return <></>;
  }
}
