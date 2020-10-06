import React from 'react';
import { getTransactions } from '../api';
import '../css/TransactionList.css';

const FREQUENCY = 5;

class TransactionList extends React.Component {
  constructor() {
    super();
    this.state = { transactions: [] };
  }

  componentDidMount() {
    this.refreshTransactions();
    setInterval(this.refreshTransactions.bind(this), FREQUENCY * 1000);
  }

  refreshTransactions() {
    getTransactions().then(transactions => this.setState({ transactions }));
  }

  render() {
    return (
      <section>
        <h1>Transactions</h1>
        <table>
          <thead>
            <th>Date</th>
            <th>To/From</th>
            <th>Amount</th>
          </thead>
          <tbody>
            {this.state.transactions.map(transaction => (
              <tr>
                <td>{new Date(transaction.timestamp).toLocaleString()}</td>
                <td className="code">{transaction.account}</td>
                <td align="right">{Number(transaction.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }
}

export default TransactionList;
