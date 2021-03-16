import * as React from "react";
import type { Principal } from "@dfinity/agent";
import {
  Button,
  CircularProgress,
  Dialog,
  Grid,
  Icon,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  SvgIcon,
  Typography,
} from "@material-ui/core";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { EventList } from "../routes/Dashboard";
import "../../css/Events.scss";
import { CreateCanisterDialog } from "./CreateCanister";
import { CreateWalletDialog } from "./CreateWallet";
import { CreateDialog } from "./CreateDialog";
import PlusIcon from "../icons/PlusIcon";
import { css } from "@emotion/css";
import { PlainButton, PrimaryButton } from "../Buttons";

interface Props {
  canisters?: EventList["canisters"];
}

function Canisters(props: Props) {
  const [
    canisterCreateDialogOpen,
    setCanisterCreateDialogOpen,
  ] = React.useState(false);
  const [walletCreateDialogOpen, setWalletCreateDialogOpen] = React.useState(
    false
  );
  const [dialogDialogOpen, setDialogDialogOpen] = React.useState(false);
  function handleWalletCreateDialogOpen() {
    setWalletCreateDialogOpen(true);
  }
  const { canisters } = props;

  return (
    <Grid className="canisters">
      <CreateDialog
        open={dialogDialogOpen}
        close={() => setDialogDialogOpen(false)}
      >
        <div
          className={css`
            display: flex;
            flex-direction: column;
            button {
              text-align: left;
              padding-left: 4px;
            }
          `}
        >
          <PlainButton
            type="button"
            onClick={() => setCanisterCreateDialogOpen(true)}
          >
            Create a Canister
          </PlainButton>
          <PlainButton type="button" onClick={handleWalletCreateDialogOpen}>
            Create a Wallet
          </PlainButton>
        </div>
      </CreateDialog>

      <CreateCanisterDialog
        open={canisterCreateDialogOpen}
        close={() => setCanisterCreateDialogOpen(false)}
      />

      <CreateWalletDialog
        open={walletCreateDialogOpen}
        close={() => setWalletCreateDialogOpen(false)}
      />

      <button
        color="primary"
        id="canisters-trigger"
        onClick={() => setDialogDialogOpen(true)}
        type="button"
        className={css`
          margin-left: auto;
          padding: 0.5rem;
          border-radius: 4px;
          background: var(--primaryColor);
          color: var(--primaryContrast);
        `}
      >
        <PlusIcon size="11px"></PlusIcon>
      </button>

      <Typography
        component="h2"
        variant="h5"
        gutterBottom
        style={{ fontWeight: "bold" }}
      >
        Canisters
      </Typography>
      <p
        className={css`
          color: var(--textColor);
          margin: initial;
          margin-bottom: 32px;
        `}
      >
        Canisters you've created
      </p>
      <React.Suspense fallback={<CircularProgress />}>
        <List className="events-list">
          {canisters?.map((canister) => {
            if (!("CanisterCreated" in canister.kind)) {
              return null;
            }
            canister.kind["CanisterCreated"].canister;

            const principal = canister.kind["CanisterCreated"]
              .canister as Principal;
            const value =
              canister.kind["CanisterCreated"].cycles.toString() + " TC";
            return (
              <ListItem key={canister.id} className="flex column">
                <h4>{"Anonymous Canister"}</h4>
                <div className="flex row wrap">
                  <p>{principal.toString()}</p>
                  <p>{value}</p>
                </div>
              </ListItem>
            );
          })}
        </List>
      </React.Suspense>
    </Grid>
  );
}

export default React.memo(Canisters);
