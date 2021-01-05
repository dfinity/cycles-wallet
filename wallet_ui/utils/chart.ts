import { ChartPrecision } from "../canister";

export interface ChartData {
  date: Date;
  humanDate: string;
  realAmount: number;
  scaledAmount: number;
}

/**
 * Round up the date to the precision.
 */
export function ceilTime(date: Date, precision: ChartPrecision) {
  // Round up to nearest minute, then apply a delta milliseconds to reach the proper ceiling.
  if (date.getMilliseconds() > 0 || date.getSeconds() > 0) {
    date.setMinutes(date.getMinutes() + 1);
  }
  date.setMilliseconds(0);
  date.setSeconds(0);

  if (precision >= ChartPrecision.Hourly && date.getMinutes() > 0) {
    date.setMinutes(0);
    date.setHours(date.getHours() + 1);
  }
  if (precision >= ChartPrecision.Daily && date.getHours() > 0) {
    date.setHours(0);
    date.setDate(date.getDate() + 1);
  }

  // Weeks and Month can round up in surprising way so we distinguish them separately.
  if (precision == ChartPrecision.Weekly && date.getDay() > 0) {
    date.setDate(date.getDate() + (7 - date.getDay()));
  } else if (precision >= ChartPrecision.Monthly && date.getDate() > 0) {
    date.setDate(1); // JavaScript _date_ is 1 based.
    date.setMonth(date.getMonth() + 1);
  }
  return date;
}

/**
 * Build a time table backward, with precision, from the date.
 */
export function buildTimeArray(
  from: Date,
  precision: ChartPrecision,
  count = 20
): [Date, string][] {
  const result: [Date, string][] = [];
  from = ceilTime(from, precision);

  for (let i = 0; i < count; i++) {
    const d = from.toLocaleDateString();
    const t = from.toLocaleTimeString();
    const s = new Date(+from);
    let time = `${d} ${t}`;

    switch (precision) {
      case ChartPrecision.Minutes:
        time = t;
        from = new Date(+from - 60 * 1000);
        break;
      case ChartPrecision.Hourly:
        time = t;
        from = new Date(+from - 60 * 60 * 1000);
        break;
      case ChartPrecision.Daily:
        time = d;
        from = new Date(+from - 24 * 60 * 60 * 1000);
        break;
      case ChartPrecision.Weekly:
        time = d;
        from = new Date(+from - 7 * 24 * 60 * 60 * 1000);
        break;
      case ChartPrecision.Monthly:
        time = d;
        from.setMonth(from.getMonth() - 1);
        break;
    }

    result.push([s, time]);
  }

  return result;
}

export function buildData(
  data: [Date, number][],
  precision: ChartPrecision,
  count = 20
): ChartData[] {
  // Do not trust of the order of data from canister, as it can be unsorted.
  const actualData = [...data].sort((a, b) => +a[0] - +b[0]);
  const maxDate = new Date(Math.max(...data.map((x) => +x[0])));

  const times = buildTimeArray(maxDate, precision, count);
  return times
    .map(([date, humanDate]) => {
      const i = actualData.find((v) => +v[0] >= +date);
      const amount = (i || actualData[actualData.length - 1])[1];

      return {
        date,
        humanDate,
        realAmount: amount,
        scaledAmount: Math.log10(amount),
      };
    })
    .reverse();
}
