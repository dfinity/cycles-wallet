import React from 'react';
import { getDevices } from '../api';
import Button from './Button';

interface Properties {
  onClick(): void
}

class DeviceList extends React.Component<Properties, { devices: any[] }> {
  constructor(props: Properties) {
    super(props);
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
