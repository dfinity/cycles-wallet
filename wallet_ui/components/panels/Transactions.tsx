import makeStyles from "@material-ui/core/styles/makeStyles";
import React, { useEffect, useState } from "react";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import { Wallet } from "../../canister";
import ReactTimeago from "react-timeago";
import { Event, EventKind } from "../../canister";

interface TransactionRowProps {
  event: Event;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

const useRowStyles = makeStyles((_theme) => ({
  // Certain rows have two rows; one that's the regular table row, and one
  // that's invisible until the row is "expanded". Both have the same styles
  // which includes a bottom border. This rule removes the bottom border to
  // any row followed by another, which effectively removes the first border
  // when there's 2 (so they don't show double borders on those rows).
  root: {
    "& > *": {
      borderBottom: "unset",
    },
  },
}));

function AddressAddedRow({ event }: TransactionRowProps) {
  const classes = useRowStyles();
  if ("AddressAdded" in event.kind) {
    const addressAdded = event.kind.AddressAdded!;
    const role = Object.keys(addressAdded.role!)[0];

    return (
      <>
        <TableRow className={classes.root}>
          <TableCell component="th" scope="row">
            <ReactTimeago date={new Date(Number(event.timestamp))} />
          </TableCell>
          <TableCell>{role} Added</TableCell>
          <TableCell>
            Principal "<code>{addressAdded.id?.toText()}</code>"
            {addressAdded.name.length == 1
              ? ` with name ${addressAdded.name[0]}`
              : ""}
          </TableCell>
          <TableCell />
        </TableRow>
      </>
    );
  }
  return null;
}

function CyclesSentRow({ event }: TransactionRowProps) {
  const classes = useRowStyles();
  if ("CyclesSent" in event.kind) {
    const cyclesSent = event.kind.CyclesSent!;

    return (
      <>
        <TableRow className={classes.root}>
          <TableCell component="th" scope="row">
            <ReactTimeago date={new Date(Number(event.timestamp))} />
          </TableCell>
          <TableCell>Cycle Sent</TableCell>
          <TableCell>
            Sent {cyclesSent.amount.toLocaleString()} cycles to{" "}
            <code>{cyclesSent.to.toText()}</code>
          </TableCell>
          <TableCell />
        </TableRow>
      </>
    );
  }
  return null;
}

function CyclesReceivedRow({ event }: TransactionRowProps) {
  const classes = useRowStyles();
  if ("CyclesReceived" in event.kind) {
    const cyclesReceived = event.kind.CyclesReceived!;

    return (
      <>
        <TableRow className={classes.root}>
          <TableCell component="th" scope="row">
            <ReactTimeago date={new Date(Number(event.timestamp))} />
          </TableCell>
          <TableCell>Cycle Received</TableCell>
          <TableCell>
            Received {cyclesReceived.amount.toLocaleString()} cycles from{" "}
            <code>{cyclesReceived.from.toText()}</code>
          </TableCell>
          <TableCell />
        </TableRow>
      </>
    );
  }
  return null;
}

function CanisterCreatedRow({ event }: TransactionRowProps) {
  const classes = useRowStyles();
  if ("CanisterCreated" in event.kind) {
    const createdCanister = event.kind.CanisterCreated;

    return (
      <TableRow className={classes.root}>
        <TableCell component="th" scope="row">
          <ReactTimeago date={new Date(Number(event.timestamp))} />
        </TableCell>
        <TableCell>Canister Created</TableCell>
        <TableCell>
          Created{" "}
          <code>
            {createdCanister.canister.toText()} (used{" "}
            {createdCanister.cycles.toLocaleString()} cycles)
          </code>
        </TableCell>
        <TableCell />
      </TableRow>
    );
  }
  return null;
}

function TransactionRow({ event, expanded, setExpanded }: TransactionRowProps) {
  const eventKind = Object.keys(event.kind)[0] as keyof EventKind;

  switch (eventKind) {
    case "CyclesSent":
      return <CyclesSentRow {...{ event, expanded, setExpanded }} />;
    case "CyclesReceived":
      return <CyclesReceivedRow {...{ event, expanded, setExpanded }} />;
    case "AddressAdded":
      return <AddressAddedRow {...{ event, expanded, setExpanded }} />;
    case "AddressRemoved":
      return <></>;
    case "CanisterCreated":
      return <CanisterCreatedRow {...{ event, expanded, setExpanded }} />;
    case "CanisterCalled":
      return <></>;

    default:
      return (
        <TableRow key={event.id}>
          <TableCell colSpan={3}>Unknown Transaction Received...</TableCell>
        </TableRow>
      );
  }
}

type Props = {
  transactions?: Event[];
};
export default function Transactions(props: Props) {
  const { transactions } = props;
  const [expanded, setExpanded] = useState(-1);

  if (!transactions) {
    return null;
  }

  return (
    <React.Fragment>
      <Typography component="h2" variant="h6" gutterBottom>
        Transaction History
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={150}>Date</TableCell>
            <TableCell />
            <TableCell>Details</TableCell>
            <TableCell width={50} />
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((event) => (
            <TransactionRow
              event={event}
              expanded={event.id === expanded}
              key={event.id}
              setExpanded={(isExpanded) =>
                setExpanded(isExpanded ? event.id : -1)
              }
            />
          ))}
        </TableBody>
      </Table>
    </React.Fragment>
  );
}
