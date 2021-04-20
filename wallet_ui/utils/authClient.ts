import {
  AnonymousIdentity,
  Identity,
  Principal,
  SignIdentity,
} from "@dfinity/agent";
import {
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from "@dfinity/identity";
import {
  createAuthenticationRequestUrl,
  isDelegationValid,
} from "@dfinity/authentication";

const KEY_LOCALSTORAGE_KEY = "ic-identity";
const KEY_LOCALSTORAGE_DELEGATION = "ic-delegation";

interface AuthenticationClientOptions {
  identityProvider?: string | URL;
  identity?: SignIdentity;
}

export class AuthenticationClient {
  private _identity: Identity;
  private _key: SignIdentity | null;
  private _chain: DelegationChain | null;

  constructor(options: AuthenticationClientOptions = {}) {
    let key = null;
    if (options.identity) {
      key = options.identity;
    } else {
      const maybeIdentityStorage = localStorage.getItem(KEY_LOCALSTORAGE_KEY);
      if (maybeIdentityStorage) {
        try {
          key = Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
        } catch (e) {
          // Ignore this, this means that the localStorage value isn't a valid Ed25519KeyIdentity
          // serialization.
        }
      }
    }

    this._identity = new AnonymousIdentity();
    this._key = key;
    this._chain = null;

    if (key) {
      try {
        const chainStorage = localStorage.getItem(KEY_LOCALSTORAGE_DELEGATION);
        if (chainStorage) {
          const chain = DelegationChain.fromJSON(chainStorage);
          if (isDelegationValid(chain)) {
            this._chain = chain;
            this._identity = DelegationIdentity.fromDelegation(key, chain);
          } else {
            // If any delegation is expired, we logout and ask you to log back in.
            this.logout({});
          }
        }
      } catch (e) {}
    }
  }

  getIdentity() {
    return this._identity;
  }

  _getAccessToken(location: Location) {
    try {
      // Remove the `#` at the start.
      const hashParams = new URLSearchParams(location.hash.substr(1));

      return hashParams.get("access_token") || null;
    } catch (e) {
      // Ignore errors. Return false in that case (maybe the hash params cannot be parsed?).
    }

    return null;
  }

  shouldParseResult(location: Location) {
    return this._getAccessToken(location) !== null;
  }

  async handleRedirectCallback(location: Location) {
    const maybeToken = this._getAccessToken(location);
    if (!maybeToken) {
      return;
    }
    const key = this._key;
    if (!key) {
      return;
    }

    // Parse the token which is a JSON object serialized in Hex form.
    const chainJson = [...maybeToken]
      .reduce((acc, curr, i) => {
        acc[Math.floor(i / 2)] = (acc[(i / 2) | 0] || "") + curr;
        return acc;
      }, [] as string[])
      .map((x) => Number.parseInt(x, 16))
      .map((x) => String.fromCharCode(x))
      .join("");
    this._chain = DelegationChain.fromJSON(chainJson);
    localStorage.setItem(
      KEY_LOCALSTORAGE_DELEGATION,
      JSON.stringify(this._chain.toJSON())
    );
    this._identity = DelegationIdentity.fromDelegation(key, this._chain);

    return {
      identity: this._identity,
    };
  }

  logout(options: { returnTo?: string } = {}) {
    localStorage.removeItem(KEY_LOCALSTORAGE_KEY);
    localStorage.removeItem(KEY_LOCALSTORAGE_DELEGATION);
    // Reset this auth client to a non-authenticated state.
    this._identity = new AnonymousIdentity();
    this._key = null;
    this._chain = null;

    if (options.returnTo) {
      try {
        window.history.pushState({}, "", options.returnTo);
      } catch (e) {
        window.location.href = options.returnTo;
      }
    }
  }

  async loginWithRedirect(
    options: { redirectUri?: string; scope?: Principal[] } = {}
  ) {
    let key = this._key;
    if (!key) {
      // Create a new key (whether or not one was in storage).
      key = Ed25519KeyIdentity.generate();
      this._key = key;
      localStorage.setItem(KEY_LOCALSTORAGE_KEY, JSON.stringify(key));
    }

    window.location.href = createAuthenticationRequestUrl({
      redirectUri: options.redirectUri || window.location.origin,
      scope: options.scope ?? [],
      publicKey: key.getPublicKey(),
    }).toString();
  }
}
