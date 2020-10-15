import React, { useState } from 'react';
import ago from 's-ago';
import { Transaction, getTransactions } from '../api';
import '../css/TransactionList.css';

const FREQUENCY = 5;

export function TransactionList(_: {}) {
  const [transactions, setTransactions] = React.useState<null | Transaction[]>(null);
  const [first, setFirst] = useState(true);

  if (first) {
    setFirst(false);
    getTransactions().then(transactions => {
      setTransactions(transactions);
      update();

      // We declare a function here to ensure we only call the get function in
      // series (don't call it twice if it takes more than FREQUENCY seconds).
      function update() {
        setTimeout(async () => {
          const transactions = await getTransactions();
          setTransactions(transactions);
          update();
        }, FREQUENCY * 1000);
      }
    });
  }

  return (
    <section>
      <h1>Transactions</h1>
      <table>
        <thead>
        <th>Date</th>
        <th>To/From</th>
        <th align="right">Amount</th>
        </thead>
        <tbody>
        {(transactions || []).map(transaction => (
          <tr>
            <td>{ago(new Date(transaction.timestamp))}</td>
            <td className="code">{transaction.account}</td>
            <td align="right">{Number(transaction.amount).toLocaleString()} {transaction.unit}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </section>
  );
}

