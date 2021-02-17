import { Authenticator } from "@dfinity/authentication";
import { DefaultAuthenticatorTransport } from "@dfinity/authentication/.tsc-out/packages/authentication/src/authenticator/Authenticator";

export const authenticator = new Authenticator({
  identityProvider: { url: new URL('https://auth.ic0.app/design-phase-1') },
  transport: DefaultAuthenticatorTransport(document),
});
