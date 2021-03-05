import { CircularProgress, Grid } from "@material-ui/core";
import * as React from "react";
import { EventList } from "../routes/Dashboard";

interface Props {
  canisters?: EventList["canisters"];
}

function Canisters(props: Props) {
  const { canisters } = props;

  return (
    <Grid>
      <React.Suspense fallback={<CircularProgress />}>
        {JSON.stringify(canisters)}
      </React.Suspense>
      ;
    </Grid>
  );
}

export default React.memo(Canisters);
