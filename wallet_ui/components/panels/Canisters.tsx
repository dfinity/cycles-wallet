import * as React from "react";
import type { Principal } from "@dfinity/principal";
import CircularProgress from "@material-ui/core/CircularProgress";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Typography from "@material-ui/core/Typography";
import { EventList } from "../routes/Dashboard";
import "../../css/Events.scss";
import { CreateCanisterDialog } from "./CreateCanister";
import { CreateWalletDialog } from "./CreateWallet";
import { CreateDialog } from "./CreateDialog";
import PlusIcon from "../icons/PlusIcon";
import { css } from "@emotion/css";
import { PlainButton } from "../Buttons";
import { format_cycles } from "../../utils/cycles";

interface Props {
  canisters?: EventList["canisters"];
  refreshEvents: Function;
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
  const { canisters, refreshEvents } = props;

  const listCanisters = canisters
    ? canisters.map((canister) => {
        if (!("CanisterCreated" in canister.kind)) {
          //step needed?
          return {};
        }
        let kind = canister["kind"];
        return {
          id: canister.id,
          principal: kind.CanisterCreated.canister.toString(),
          timestamp: canister.timestamp,
          cycles: format_cycles(kind.CanisterCreated.cycles),
          name: "Anonymous Canister",
        };
      })
    : [];

  const [canisterWithNames, updateNames] = React.useState(listCanisters);

  function updateName(inputName: string, canisterPrincipal: string) {
    let index = listCanisters.findIndex(
      (c) => c?.principal === canisterPrincipal
    );
    if (index === undefined) {
      console.error("No created canisters exist to update name");
    }
    if (index === -1) {
      console.error(
        "Name change incomplete. No matching canister by principal",
        canisterPrincipal,
        "exists"
      );
    }
    let copy = canisterWithNames;
    copy[index].name = inputName;
    updateNames((prev) => {
      console.log("previous");
      console.log(prev);
      return copy;
    });
  }

  React.useEffect(() => {
    console.log("render on useEffect after canisters change");
    updateNames(listCanisters);
  }, [canisters]);

  console.log("list canisters", listCanisters);
  console.log("canister with names", canisterWithNames);

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
        refreshEvents={refreshEvents}
        closeDialogDialog={() => setDialogDialogOpen(false)}
        updateName={updateName}
        canisterList={canisters}
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
          {canisterWithNames?.map((canister) => {
            if (!canister || Object.entries(canister).length === 0) {
              return null;
            }
            return (
              <ListItem key={canister.id} className="flex column">
                <h4>{canister.name}</h4>
                <div className="flex row wrap">
                  <p>{canister.principal}</p>
                  <p>{canister.cycles}</p>
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
