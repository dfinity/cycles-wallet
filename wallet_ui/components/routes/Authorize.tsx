import DoneIcon from "@material-ui/icons/Done";
import React, { useContext, useEffect, useState } from "react";
import {
  Wallet,
  Principal,
  Actor,
  canister,
  getPrincipal,
} from "../../canister";
import { useHistory } from "react-router";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import Tooltip from "@material-ui/core/Tooltip";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import plaintext from "react-syntax-highlighter/dist/esm/languages/hljs/plaintext";
import { darcula, docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Box from "@material-ui/core/Box";
import { Copyright } from "../App";
import AuthenticationButton from "../authentication/AuthenticationButton";
import AuthenticationContext from "../authentication/AuthenticationContext";
import { makeLog } from "@dfinity/agent";
// // @ts-ignore
// import walletCanister from 'ic:canisters/wallet';
// // @ts-ignore
// import aliceCanister from 'ic:canisters/alice';
// // @ts-ignore
// import bobCanister from 'ic:canisters/bob';

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("plaintext", plaintext);

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
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    height: "100vh",
    overflow: "auto",
  },
}));

export function Authorize({ dark }: { dark: boolean }) {
  const log = makeLog('Authorize')
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [copied, setCopied] = useState(false);
  const history = useHistory();
  const classes = useStyles();
  const authentication = useContext(AuthenticationContext)
  makeLog('Authorize')('debug', 'authentication from AuthenticationContext', { authentication })
  function checkAccess() {
    Wallet.init().then(
      () => history.push("/"),
      () => {}
    );
  }

  useEffect(() => {
    getPrincipal().then(p => {
      log('debug', 'getPrincipal() got p, passing it to setPrincipal now', p)
      setPrincipal(p);
    });
    checkAccess();

    const id = setInterval(
      checkAccess,
      CHECK_ACCESS_FREQUENCY_IN_SECONDS * 1000
    );
    return () => clearInterval(id);
  }, [authentication]);

  if (principal && !principal.isAnonymous()) {
    const canisterId = canister && Actor.canisterIdOf(canister);
    const isLocalhost = !!window.location.hostname.match(/^(.*\.)?localhost$/);
    const canisterCallShCode = `dfx canister${
      isLocalhost ? "" : " --network ic"
    } call "${
      canisterId?.toText() || ""
    }" authorize '(principal "${principal.toText()}")'`;

    function copyHandler() {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    return (
      <main className={classes.content}>
        <div className={classes.appBarSpacer} />
        <Container maxWidth="lg" className={classes.container}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper className={classes.paper}>
                <Typography component="h1" variant="h4" color="primary">
                  Register Device
                </Typography>
                <Typography variant="body1" color="textPrimary">
                  This user do not have access to this wallet. If you have
                  administrative control or know someone who does, add your
                  principal as custodian. If you are using DFX, use the
                  following command to register your principal as custodian:
                  <div style={{ position: "relative" }}>
                    <Tooltip title="Copied!" open={copied}>
                      <CopyToClipboard
                        text={canisterCallShCode}
                        onCopy={copyHandler}
                      >
                        <div
                          style={{
                            position: "absolute",
                            right: "1em",
                            top: "1.1em",
                          }}
                        >
                          {copied ? <DoneIcon /> : <FileCopyIcon />}
                        </div>
                      </CopyToClipboard>
                    </Tooltip>
                  </div>
                  <SyntaxHighlighter
                    language="bash"
                    style={dark ? darcula : docco}
                    customStyle={{ borderRadius: 5 }}
                  >
                    {canisterCallShCode}
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

        <Box pt={4}>
          <Copyright />
        </Box>
      </main>
    );
  } else if (principal && principal.isAnonymous()) {
    return (
      <Container maxWidth="lg" className={classes.container}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <Typography component="h1" variant="h4" color="primary">
                Anonymous Device
              </Typography>
              <Typography variant="body1" color="textPrimary">
                You are using an anonymous Principal. You need to sign up.
              </Typography>
              <AuthenticationButton
                session={authentication.session}
                request={{
                  scope: [
                    ...[
                      canister ? Actor.canisterIdOf(canister): getLocationCanisterPrincipal(location),
                    ].map(principal => ({
                      type: "CanisterScope" as const,
                      principal,
                    }))
                  ],
                  redirectUri: new URL(location.href)
                }}
              >
                Sign Up
              </AuthenticationButton>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    );
  } else {
    return <></>;
  }
}

function getLocationCanisterPrincipal(location: Location): Principal {
  const pattern = /canisterId=([^$&]+)/;
  const match = location.href.match(pattern);
  if ( ! match) {
    throw new Error('Failed to parse url containing canisterId')
  }
  const [,canisterId] = match;
  const canisterPrincipal = Principal.fromText(canisterId);
  return canisterPrincipal;
}
