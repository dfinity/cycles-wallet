import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import React, { useEffect, useState } from "react";
import { ChartPrecision, Wallet } from "../../canister";
import "../../css/CycleBalance.css";
import Typography from "@material-ui/core/Typography";
import { useLocalStorage } from "../../utils/hooks";
import useTheme from "@material-ui/core/styles/useTheme";
import makeStyles from "@material-ui/core/styles/makeStyles";
import { buildData, ChartData } from "../../utils/chart";

const useStyles = makeStyles((theme) => ({
  depositContext: {
    flex: 1,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    right: 0,
    position: "absolute",
  },
  formControlParagraph: {
    position: "relative",
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  title: {
    marginBottom: "0.5em",
  },
  chartContainer: {
    aspectRatio: "1 / 1",
    position: "relative",
    left: "-20px",
  },
}));

function CustomTooltip({ payload, active }: any) {
  if (active) {
    const p: ChartData = payload[0].payload;
    return (
      <div
        className="custom-tooltip"
        style={{ color: "black", backgroundColor: "white", border: "black" }}
      >
        <p className="label" style={{ padding: 16 }}>
          Timestamp: {p.date.toLocaleString()}
          <br />
          Amount: {p.realAmount.toLocaleString()} cycles
        </p>
      </div>
    );
  }

  return null;
}

export function BalanceChart() {
  const [precision, setPrecision] = useLocalStorage<ChartPrecision>(
    "chart-precision",
    ChartPrecision.Hourly
  );
  const [data, setData] = useState<ChartData[] | undefined>(undefined);
  const theme = useTheme();
  const classes = useStyles();

  useEffect(() => {
    Wallet.chart(precision, 20).then((data) =>
      setData(buildData(data, precision))
    );
  }, [precision]);

  if (data === undefined) {
    return <></>;
  }

  const min = Math.min(
    ...data.map(({ scaledAmount }) => Math.floor(scaledAmount))
  );
  const max = Math.min(
    ...data.map(({ scaledAmount }) => Math.ceil(scaledAmount))
  );

  // prettier-ignore
  const ticks = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ].slice(min, max + 1);
  // prettier-ignore
  const tickArray = [
      "1", "10", "100", "1,000", "10k", "100k", "1M", "10M", "100M", "1B", "10B", "100B",
      "1T", "10T", "100T", "1P", "10P", "100P",
    ];

  return (
    <>
      <Typography className={classes.formControlParagraph}>
        <FormControl hiddenLabel className={classes.formControl}>
          <Select
            value={precision}
            onChange={({ target }) => {
              if (typeof target.value == "number") setPrecision(target.value);
            }}
          >
            <MenuItem value={0}>Minutes</MenuItem>
            <MenuItem value={1}>Hours</MenuItem>
            <MenuItem value={2}>Days</MenuItem>
            <MenuItem value={3}>Weeks</MenuItem>
            <MenuItem value={4}>Months</MenuItem>
          </Select>
        </FormControl>
      </Typography>
      <Typography
        component="h2"
        variant="h6"
        color="primary"
        className={classes.title}
      >
        Balance History
      </Typography>
      <ResponsiveContainer className={classes.chartContainer}>
        <LineChart
          data={data}
          margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
        >
          <XAxis dataKey="humanDate" stroke={theme.palette.text.secondary} />
          <YAxis
            stroke={theme.palette.text.secondary}
            ticks={ticks}
            tickFormatter={(x) => tickArray[x]}
            dataKey="scaledAmount"
            domain={[min, max]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={(x) => x.scaledAmount}
            stroke={theme.palette.primary.main}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
