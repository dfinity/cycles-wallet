import DoneIcon from "@material-ui/icons/Done";
import React, { useEffect, useState } from "react";
import {
  Wallet,
  Principal,
  getAgentPrincipal,
  getWalletId,
} from "../../canister";
import { useHistory } from "react-router";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import Tooltip from "@material-ui/core/Tooltip";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Box from "@material-ui/core/Box";
import { Copyright } from "../App";
import Button from "@material-ui/core/Button";
import { PrimaryButton } from "../Buttons";
import { css } from "@emotion/css";
import { authClient } from "../../utils/authClient";

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

const CopyButton = (props: {
  copyHandler: () => void;
  copied: boolean;
  canisterCallShCode: string;
}) => {
  const { copyHandler, copied, canisterCallShCode } = props;
  return (
    <PrimaryButton
      className={css`
        display: inline-block;
        padding: 8px 16px;
        margin: 8px 12px;
      `}
    >
      <Tooltip
        title="Copied!"
        open={copied}
        className={css`
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
        `}
      >
        <CopyToClipboard text={canisterCallShCode} onCopy={copyHandler}>
          <div>
            {copied ? (
              <DoneIcon />
            ) : (
              <>
                <FileCopyIcon />
                Copy
              </>
            )}
          </div>
        </CopyToClipboard>
      </Tooltip>
    </PrimaryButton>
  );
};

export function Authorize() {
  const [agentPrincipal, setAgentPrincipal] = useState<Principal | null>(null);
  const [copied, setCopied] = useState(false);
  const history = useHistory();
  const classes = useStyles();

  function checkAccess() {
    Wallet.init().then(
      () => history.push("/"),
      () => {}
    );
  }

  useEffect(() => {
    getAgentPrincipal().then(setAgentPrincipal);
    checkAccess();

    const id = setInterval(
      checkAccess,
      CHECK_ACCESS_FREQUENCY_IN_SECONDS * 1000
    );
    return () => clearInterval(id);
  }, []);

  if (agentPrincipal && !agentPrincipal.isAnonymous()) {
    const canisterId = getWalletId();
    const isLocalhost = !!window.location.hostname.match(/^(.*\.)?localhost$/);
    const canisterCallShCode = `dfx canister ${
      isLocalhost ? "" : "--no-wallet  --network alpha"
    } call "${
      canisterId?.toText() || ""
    }" authorize '(principal "${agentPrincipal.toText()}")'`;

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
                <Box mb={2}>
                  <Typography component="h1" variant="h4">
                    Register Device
                  </Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body1">
                    This user does not have access to this wallet. If you have
                    administrative control, or know someone who does, add your
                    principal as a custodian.
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Typography variant="body1">
                    If you are using DFX, use the following command to register
                    your principal as custodian:
                  </Typography>
                </Box>
                <div
                  className={css`
                    background: rgba(0, 0, 0, 0.15);
                    position: relative;
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                  `}
                >
                  <Box p={1}>
                    <Typography variant="h6" component="h3">
                      Code
                    </Typography>
                  </Box>
                  <CopyButton
                    copyHandler={copyHandler}
                    copied={copied}
                    canisterCallShCode={canisterCallShCode}
                  />
                </div>
                <code
                  className={css`
                    font-size: 1.2rem;
                    padding: 0.5rem;
                    margin-bottom: 16px;
                    background: rgba(0, 0, 0, 0.05);
                  `}
                >
                  {canisterCallShCode}
                </code>
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
  } else if (agentPrincipal && agentPrincipal.isAnonymous()) {
    return (
      <main className={classes.content}>
        <div className={classes.appBarSpacer} />
        <Container maxWidth="lg" className={classes.container}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper className={classes.paper}>
                <Typography component="h1" variant="h4">
                  Anonymous Device
                </Typography>
                <Box mb={4}>
                  <Typography variant="body1" color="textPrimary">
                    You are using an anonymous Principal. You need to
                    authenticate.
                  </Typography>
                </Box>
                <PrimaryButton
                  onClick={async () => {
                    await authClient.login();
                    const identity = await authClient.getIdentity();
                    if (identity) {
                      setAgentPrincipal(identity.getPrincipal());
                    } else {
                      console.error("could not get identity");
                    }
                  }}
                >
                  Authenticate
                </PrimaryButton>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </main>
    );
  } else {
    return <></>;
  }
}
