import * as React from "react";
import type { Principal } from "@dfinity/agent";
import {
  CircularProgress,
  Dialog,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@material-ui/core";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { EventList } from "../routes/Dashboard";
import "../../css/Events.scss";
import { CreateCanisterDialog } from "./CreateCanister";
import { CreateWalletDialog } from "./CreateWallet";
import { CreateDialog } from "./CreateDialog";

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
        <List>
          <ListItem button onClick={() => setCanisterCreateDialogOpen(true)}>
            <ListItemIcon>
              <AddCircleOutlineIcon />
            </ListItemIcon>
            <ListItemText primary="Create a Canister" />
          </ListItem>
          <ListItem button onClick={handleWalletCreateDialogOpen}>
            <ListItemIcon>
              <AddCircleOutlineIcon />
            </ListItemIcon>
            <ListItemText primary="Create a Wallet" />
          </ListItem>
        </List>
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
        id="canisters-trigger"
        onClick={() => setDialogDialogOpen(true)}
        type="button"
        style={{ marginLeft: "auto" }}
      >
        <AddCircleOutlineIcon />
      </button>

      <Typography
        component="h2"
        variant="h5"
        color="primary"
        gutterBottom
        style={{ fontWeight: "bold" }}
      >
        Canisters
      </Typography>
      <Typography component="p" color="primary" gutterBottom>
        Canisters you've created
      </Typography>
      <React.Suspense fallback={<CircularProgress />}>
        <List className="events-list">
          {canisters?.map((canister) => {
            const principal = canister.body[1].canister as Principal;
            const value = canister.body[1].cycles.toString() + " TC";
            return (
              <ListItem key={canister.id} className="flex column">
                <h4>{canister["name"] ?? "Anonymous Canister"}</h4>
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
