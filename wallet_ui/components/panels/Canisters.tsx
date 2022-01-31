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
import { format_cycles_trillion } from "../../utils/cycles";
import { Wallet } from "../../canister";

interface Props {
  canisters: EventList["canisters"];
  refreshEvents: () => Promise<void>;
}

type ManagedCanister = {
  id: string;
  name: string | undefined;
};

function Canisters(props: Props) {
  const [
    canisterCreateDialogOpen,
    setCanisterCreateDialogOpen,
  ] = React.useState(false);

  const [walletCreateDialogOpen, setWalletCreateDialogOpen] = React.useState(
    false
  );

  const [dialogDialogOpen, setDialogDialogOpen] = React.useState(false);
  const [managedCanisters, setManagedCan] = React.useState<ManagedCanister[]>(
    []
  );
  const instance = React.useRef<number>(0);

  function handleWalletCreateDialogOpen() {
    setWalletCreateDialogOpen(true);
  }

  const { canisters, refreshEvents } = props;

  function refreshManagedCanisters(context: string) {
    console.log("refreshMC from", context);
    Wallet.list_managed_canisters().then((result) => {
      const mapped: ManagedCanister[] = result[0]
        .map((c) => {
          return {
            id: c.id.toString(),
            name: c.name[0],
          };
        })
        .reverse();
      setManagedCan(mapped);
    });
  }

  const mappedCanisters = React.useMemo(() => {
    return canisters.map((canister) => {
      const kind = canister["kind"];
      if ("CanisterCreated" in kind) {
        const principal = kind.CanisterCreated.canister.toString();
        return {
          id: canister.id,
          principal,
          timestamp: canister.timestamp,
          cycles: format_cycles_trillion(kind.CanisterCreated.cycles),
          name:
            managedCanisters.find(
              (managed: ManagedCanister) => managed.id == principal
            )?.name || "Anonymous Canister",
        };
      }
    });
  }, [canisters, managedCanisters]);

  function setName(canisterPrincipal: string, inputName: string) {
    Wallet.update_canister_name(canisterPrincipal, inputName)
      .then(
        (r) => {
          console.log("canister name set:", r);
        },
        (e) => {
          console.error("Update to Name failed:", e);
        }
      )
      .then(() => refreshManagedCanisters("from setName"));
  }

  React.useEffect(() => {
    refreshManagedCanisters("from first useEffect");
  }, []);

  instance.current++;
  console.log(
    "render Canister",
    instance.current,
    "\n canisters",
    canisters.length,
    "\n Managed Canisters",
    managedCanisters.length,
    managedCanisters[0]
  );

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
        refreshManagedCanisters={refreshManagedCanisters}
        closeDialogDialog={() => setDialogDialogOpen(false)}
        setName={setName}
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
          {mappedCanisters?.map((can) => {
            if (!can || Object.entries(can).length === 0) {
              return null;
            }
            return (
              <ListItem key={can.id} className="flex column">
                <h4>{can.name}</h4>
                <div className="flex row wrap">
                  <p>{can.principal}</p>
                  <p>{can.cycles}</p>
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
