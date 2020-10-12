import React from "react";
import { Button, Input, Output } from "./ui";
import { getCurrentPrincipal, getWalletPrincipal } from "../api";
import { IAuthenticationController, IRegistration } from "../authentication/types";

interface Properties {
  onClick: () => void;
  webAuthn: IAuthenticationController<IRegistration>;
}

interface State {
  deviceAlias: string;
  devicePrincipal: string;
  walletId: string;
  webAuthnId: string;
}

class RegisterForm extends React.Component<Properties, State> {
  constructor(props: Properties) {
    super(props);
    this.state = {
      deviceAlias: "",
      devicePrincipal: "",
      walletId: getWalletPrincipal(),
      webAuthnId: "",
    };
    this.updateDeviceAlias = this.updateDeviceAlias.bind(this);
  }

  componentDidMount() {
    getCurrentPrincipal()
      .then((devicePrincipal) => this.setState({ devicePrincipal }));
  }

  updateDeviceAlias(event: React.ChangeEvent<HTMLInputElement>) {
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
