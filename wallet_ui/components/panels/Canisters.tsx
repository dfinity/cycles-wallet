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
import { Wallet } from "../../canister";

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
  const [list, updateList] = React.useState<any[]>([]);
  const [managedCanisters, updateManagedCan] = React.useState<object[] | any[]>(
    [{ id: "", name: null }]
  );
  const [namesAdded, addNameCount] = React.useState(0);
  const [test, increment] = React.useState(0);

  function handleWalletCreateDialogOpen() {
    setWalletCreateDialogOpen(true);
  }
  const { canisters, refreshEvents } = props;

  function listCanisters() {
    if (canisters) {
      const newList = canisters.map((canister) => {
        if (!("CanisterCreated" in canister.kind)) {
          //step needed?
          return null;
        }
        let kind = canister["kind"];
        return {
          id: canister.id,
          principal: kind.CanisterCreated.canister.toString(),
          timestamp: canister.timestamp,
          cycles: format_cycles(kind.CanisterCreated.cycles),
          name: "Anonymous Canister",
        };
      });
      return updateList(newList);
    }
  }

  function checkManagedCanisters(scope: any) {
    Wallet.list_managed_canisters().then((r) => {
      const managed_can = r[0];
      const result = managed_can
        .map((c) => {
          return {
            id: c.id.toString(),
            name: c.name[0],
          };
        })
        .reverse();
      console.log("scope:", scope, "checkManagedCanisters", result);
      updateManagedCan(result);
    });
  }

  function setName(canisterPrincipal: string, inputName: string) {
    Wallet.update_canister_name(canisterPrincipal, inputName).then(
      (r) => {
        console.log("canister name set:", r);
      },
      (e) => {
        console.error("Update to Name failed:", e);
      }
    );
  }

  function updateNames(inputList: Array<any>, context: string) {
    //error if inputList and list state length is not same
    let indexes: number[] = [];
    inputList.forEach((ea, ind) => {
      if (ea["name"]) {
        indexes.push(ind);
      }
    });
    updateList((prev) => {
      let result = prev;
      console.log("from context", context, "here is list", prev);
      console.log("indexes", indexes);
      indexes.forEach((ind) => {
        if (result.length > 0) {
          result[ind].name = inputList[ind].name;
        }
      });
      return result;
    });
  }

  React.useEffect(() => {
    listCanisters();
    increment((prev) => prev + 1);
    checkManagedCanisters("canisters");
  }, [canisters]);

  React.useEffect(() => {
    console.log("managed canisters dependency array");
    if (managedCanisters[0].id.length > 0) {
      updateNames(managedCanisters, "useEffect");
    }
    increment((prev) => prev + 1);
  }, [managedCanisters]);

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
        setName={setName}
        nameAdded={() => {
          console.log("name added in Create canister fired");
          return addNameCount(namesAdded + 1);
        }}
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
        {test.toString()}
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
          {console.log("this is LIST", list)}
          {list.map((canister) => {
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
