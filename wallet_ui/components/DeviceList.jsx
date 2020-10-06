import React from 'react';
import { getDevices } from '../api';
import Button from './Button';

class DeviceList extends React.Component {
  constructor() {
    super();
    this.state = { devices: [] };
  }

  componentDidMount() {
    getDevices().then(devices => this.setState({ devices }));
  }

  render() {
    const { devices } = this.state;
    return (
      <section>
        <h1>Connect</h1>
        {devices.length
          ? devices.map(device => <Button label={device} onClick={this.props.onClick} />)
          : <p>You have no registered devices.</p>
        }
      </section>
    );
  }
}

export default DeviceList;
