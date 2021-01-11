import { makeStyles } from "@material-ui/core/styles";
import React, { useEffect, useState } from "react";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import Box from "@material-ui/core/Box";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import { Event, EventKind, Wallet } from "../../canister";
import ReactTimeago from "react-timeago";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";

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
  const addressAdded = event.kind.AddressAdded!;
  const role = Object.keys(addressAdded.role!)[0];

  return (
    <>
      <TableRow className={classes.root}>
        <TableCell component="th" scope="row">
          <ReactTimeago date={event.timestamp} />
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

function CyclesSentRow({ event }: TransactionRowProps) {
  const classes = useRowStyles();
  const cyclesSent = event.kind.CyclesSent!;

  return (
    <>
      <TableRow className={classes.root}>
        <TableCell component="th" scope="row">
          <ReactTimeago date={event.timestamp} />
        </TableCell>
        <TableCell>Cycle Sent</TableCell>
        <TableCell>
          Sent {cyclesSent.amount.toNumber().toLocaleString()} cycles to{" "}
          <code>{cyclesSent.to.toText()}</code>
        </TableCell>
        <TableCell />
      </TableRow>
    </>
  );
}

function CyclesReceivedRow({ event }: TransactionRowProps) {
  const classes = useRowStyles();
  const cyclesReceived = event.kind.CyclesReceived!;

  return (
    <>
      <TableRow className={classes.root}>
        <TableCell component="th" scope="row">
          <ReactTimeago date={event.timestamp} />
        </TableCell>
        <TableCell>Cycle Received</TableCell>
        <TableCell>
          Received {cyclesReceived.amount.toNumber().toLocaleString()} cycles
          from <code>{cyclesReceived.from.toText()}</code>
        </TableCell>
        <TableCell />
      </TableRow>
    </>
  );
}

function CanisterCreatedRow({ event }: TransactionRowProps) {
  const classes = useRowStyles();
  const createdCanister = event.kind.CanisterCreated!;

  return (
    <TableRow className={classes.root}>
      <TableCell component="th" scope="row">
        <ReactTimeago date={event.timestamp} />
      </TableCell>
      <TableCell>Canister Created</TableCell>
      <TableCell>
        Created{" "}
        <code>
          {createdCanister.canister.toText()} (used{" "}
          {createdCanister.cycles.toNumber().toLocaleString()} cycles)
        </code>
      </TableCell>
      <TableCell />
    </TableRow>
  );
}

function TransactionRow({ event, expanded, setExpanded }: TransactionRowProps) {
  const classes = useRowStyles();

  const eventKind = Object.keys(event.kind)[0] as keyof EventKind;
  let type;

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

  return (
    <>
      <TableRow className={classes.root}>
        <TableCell component="th" scope="row">
          <ReactTimeago date={event.timestamp} />
        </TableCell>
        <TableCell>{type}</TableCell>
        <TableCell align="right">Some details here</TableCell>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box margin={1}>
              <Typography variant="h6" gutterBottom component="div">
                Details go here...
              </Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function Events() {
  const [transactions, setTransactions] = useState<Event[]>([]);
  const [expanded, setExpanded] = useState(-1);

  useEffect(() => {
    Wallet.events()
      .then((events) => {
        return events.sort((a, b) => {
          // Reverse sort on timestamp.
          return +b.timestamp - +a.timestamp;
        });
      })
      .then(setTransactions);
  }, []);

  return (
    <React.Fragment>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        Recent Events
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
