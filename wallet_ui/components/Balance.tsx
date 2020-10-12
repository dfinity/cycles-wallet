import React, {useState} from 'react';
import ReactCountUp from 'react-countup';
import { getBalance } from '../api';
import '../css/CycleBalance.css';

const FREQUENCY = 5;
const SUFFIX_LIST = " KMGTPE";

export function BalanceWidget({fn, unit}: { fn: () => Promise<number>, unit: string }) {
  const [cycles, setCycles] = useState(0);
  const [first, setFirst] = useState(true);

  if (first) {
    setFirst(false);
    fn().then(cycles => {
      setCycles(cycles);
      update();

      // We declare a function here to ensure we only call the get function in
      // series (don't call it twice if it takes more than FREQUENCY seconds).
      function update() {
        setTimeout(async () => {
          const cycles = await fn();
          setCycles(cycles);
          update();
        }, FREQUENCY * 1000);
      }
    });
  }

  const logCycles = Math.floor(Math.log10(cycles));
  const fontSize = `${Math.max(16, 8 * (18 - logCycles))}px`;
  const suffix = SUFFIX_LIST[Math.min(6, Math.floor(Math.log10(5000000000000) / 3))];
  const ll = SUFFIX_LIST.indexOf(suffix);
  const humanCycles = parseFloat((cycles / (10 ** (ll * 3))).toFixed(5));

  return (
    <section>
      <h1>Balance</h1>
      <div className="cycles" style={{ fontSize }}>
        <ReactCountUp
          end={humanCycles}
          decimals={6}
          decimal="."
          preserveValue
          separator=","
          suffix={" " + suffix}
        />
      </div>
      <caption>{unit}</caption>
    </section>
  );
}
