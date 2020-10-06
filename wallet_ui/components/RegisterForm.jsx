import React from "react";
import Input from "./Input";
import Output from "./Output";
import Button from "./Button";
import { getCurrentPrincipal, getWalletPrincipal } from "../api";

class RegisterForm extends React.Component {
  constructor() {
    super();
    this.state = {
      deviceAlias: "",
      devicePrincipal: "",
      walletId: getWalletPrincipal().toString(),
      webAuthnId: "",
    };
    this.updateDeviceAlias = this.updateDeviceAlias.bind(this);
  }

  componentDidMount() {
    getCurrentPrincipal()
      .then((devicePrincipal) => this.setState({ devicePrincipal }));
  }

  updateDeviceAlias(event) {
    this.setState({ deviceAlias: event.target.value });
  }

  render() {
    const { onClick, webAuthn } = this.props;
    const { deviceAlias, devicePrincipal, walletId, webAuthnId } = this.state;
    return (
      <section>
        <h1>Register</h1>
        {webAuthnId ? (
          <div>
            <Input label="Device Alias" onChange={this.updateDeviceAlias} />
            <Output
              label="Run this command in your terminal"
              content={`dfx canister call ${walletId} register '("${deviceAlias.replace(/\W/, "")}", "${webAuthnId}", "${devicePrincipal}")'`}
            />
            <Button label="Connect Device" onClick={onClick} />
          </div>
        ) : (
            <Button onClick={() => {
              webAuthn.register().then(({ credential }) => {
                this.setState({ webAuthnId: credential.id });
              });
            }} label="Generate Registration" />
          )}
      </section>
    );
  }
}

export default RegisterForm;
