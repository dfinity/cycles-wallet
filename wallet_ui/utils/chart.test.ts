import { buildData, buildTimeArray, ceilTime } from "./chart";
import { ChartPrecision } from "../canister";
import exp from "constants";

// For reference, through this file, (in milliseconds);
//     100000000     => Thu Jan 01 1970 19:46:40 GMT-0800 (Pacific Standard Time)
//     1000000000000 => Sat Sep 08 2001 18:46:40 GMT-0700 (Pacific Daylight Time)

const ceilTimeCases: [Date, ChartPrecision, Date][] = [
  [new Date(100000000), ChartPrecision.Minutes, new Date(100020000)], // 0
  [new Date(100010000), ChartPrecision.Minutes, new Date(100020000)], // 1
  [new Date(100020000), ChartPrecision.Minutes, new Date(100020000)], // 2
  [new Date(100020001), ChartPrecision.Minutes, new Date(100080000)], // 3
  [new Date(100000000), ChartPrecision.Hourly, new Date(100800000)], // 4
  [new Date(100200000), ChartPrecision.Hourly, new Date(100800000)], // 5
  [new Date(100800000), ChartPrecision.Hourly, new Date(100800000)], // 6
  [new Date(102000000), ChartPrecision.Hourly, new Date(104400000)], // 7
  [new Date(100000000), ChartPrecision.Daily, new Date(115200000)], // 8
  [new Date(100000000), ChartPrecision.Weekly, new Date(288000000)], // 9
  [new Date(201600001), ChartPrecision.Weekly, new Date(288000000)], // 10
  [new Date(288000001), ChartPrecision.Weekly, new Date(892800000)], // 11
  [new Date(100000000), ChartPrecision.Monthly, new Date(2707200000)], // 12
];

test.each(ceilTimeCases)("(%#) ceilTime %s(%s) == %s", (i, p, expected) => {
  expect(+ceilTime(i, p)).toEqual(+expected);
});

// This test only valid if your locale is PST, sorry.
const buildTimeArrayCases: [ChartPrecision, number, number[]][] = [
  [ChartPrecision.Minutes, 1, [1000000020000, 999999960000, 999999900000]],
  [ChartPrecision.Hourly, 1, [1000000800000, 999997200000, 999993600000]],
  [ChartPrecision.Daily, 0, [1000018800000, 999932400000, 999846000000]],
  [ChartPrecision.Weekly, 0, [1000018800000, 999414000000, 998809200000]],
  [ChartPrecision.Monthly, 0, [1001919600000, 999327600000, 996649200000]],
];

test.each(buildTimeArrayCases)(
  "(%#) buildTimeArray(" + new Date(1000000000000) + ", %i)",
  (p, type, date) => {
    let expected;
    if (type == 0) {
      expected = date.map((d) => new Date(d).toLocaleDateString());
    } else if (type == 1) {
      expected = date.map((d) => new Date(d).toLocaleTimeString());
    } else {
      expected = date.map(
        (d) =>
          new Date(d).toLocaleDateString() +
          " " +
          new Date(d).toLocaleTimeString()
      );
    }

    expect(
      buildTimeArray(new Date(1000000000000), p, 3).map((x) => x[1])
    ).toEqual(expected);
  }
);

const buildDataCases: [ChartPrecision, [Date, number][], number[]][] = [
  [
    ChartPrecision.Minutes,
    [
      [new Date(100000000), 1],
      [new Date(100001000), 2],
      [new Date(100002000), 3],
      [new Date(100003000), 4],
      [new Date(100100000), 5],
      [new Date(100101000), 6],
      [new Date(100102000), 7],
      [new Date(100103000), 8],
      [new Date(100200000), 9],
      [new Date(100201000), 10],
      [new Date(100202000), 11],
      [new Date(100203000), 12],
    ],
    [1, 1, 1, 1, 1, 5, 5, 9, 9, 12],
  ],
  [
    ChartPrecision.Hourly,
    [
      [new Date(1000000000), 1],
      [new Date(1000010000), 2],
      [new Date(1000020000), 3],
      [new Date(1000030000), 4],
      [new Date(1001000000), 5],
      [new Date(1001010000), 6],
      [new Date(1001020000), 7],
      [new Date(1001030000), 8],
      [new Date(1002000000), 9],
      [new Date(1002010000), 10],
      [new Date(1002020000), 11],
      [new Date(1002030000), 12],
      [new Date(1003000000), 13],
      [new Date(1004000000), 14],
      [new Date(1005000000), 15],
      [new Date(1006000000), 16],
      [new Date(1007000000), 17],
      [new Date(1008000000), 18],
      [new Date(1008500000), 19],
      [new Date(1009000000), 20],
      [new Date(1009500000), 21],
      [new Date(1010000000), 22],
      [new Date(1010500000), 23],
      [new Date(1011000000), 24],
      [new Date(1011500000), 25],
      [new Date(1021500000), 26],
    ],
    [1, 1, 1, 5, 15, 18, 26, 26, 26, 26],
  ],
  [
    ChartPrecision.Monthly,
    [
      [new Date(1000000000), 1],
      [new Date(2000000000), 2],
      [new Date(3000000000), 3],
      [new Date(4000000000), 4],
      [new Date(5000000000), 5],
      [new Date(6000000000), 6],
      [new Date(7000000000), 7],
      [new Date(8000000000), 8],
      [new Date(9000000000), 9],
      [new Date(10000000000), 10],
      [new Date(11000000000), 11],
      [new Date(12000000000), 12],
      [new Date(13000000000), 13],
    ],
    [1, 1, 1, 1, 3, 6, 8, 11, 13, 13],
  ],
];

test.each(buildDataCases)("(%#) buildDataCases(%i)", (p, chart, expected) => {
  const actual = buildData(chart, p, 10);
  expect(actual.map((x) => x.realAmount)).toEqual(expected);
});
