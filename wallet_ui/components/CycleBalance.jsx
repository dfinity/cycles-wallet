import React from 'react';
import ReactCountUp from 'react-countup';
import { getBalance } from '../api';
import '../css/CycleBalance.css';

const FREQUENCY = 5;

class CycleBalanceWidget extends React.Component {

  constructor() {
    super();
    this.state = { cycles: 0 };
  }

  componentDidMount() {
    this.refreshCycleBalance();
    setInterval(this.refreshCycleBalance.bind(this), FREQUENCY * 1000);
  }

  refreshCycleBalance() {
    getBalance().then(cycles => this.setState({ cycles }));
  }

  render() {
    const { cycles } = this.state;
    const fontSize = `${Math.max(16, 8 * (18 - Math.floor(Math.log10(cycles))))}px`;
    return (
      <section>
        <h1>Balance</h1>
        <div className="cycles" style={{ fontSize }}>
          <ReactCountUp
            end={cycles}
            preserveValue
            separator=","
          />
        </div>
        <caption>cycles</caption>
      </section>
    );
  }
}

export default CycleBalanceWidget;
