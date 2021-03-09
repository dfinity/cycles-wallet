import {
  CircularProgress,
  Grid,
  List,
  ListItem,
  Typography,
} from "@material-ui/core";
import * as React from "react";
import { EventList } from "../routes/Dashboard";

interface Props {
  canisters?: EventList["canisters"];
}

function Canisters(props: Props) {
  const { canisters } = props;

  return (
    <Grid className="canisters-list">
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
        <List>
          {canisters?.map((canister) => {
            return (
              <ListItem key={canister.id}>{JSON.stringify(canister)}</ListItem>
            );
          })}
        </List>
      </React.Suspense>
    </Grid>
  );
}

export default React.memo(Canisters);
