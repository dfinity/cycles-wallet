import {
  AnonymousIdentity,
  Identity,
  Principal,
  SignIdentity,
} from '@dfinity/agent';
import {
  Authenticator,
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from '@dfinity/authentication';

// TODO: move this into @dfinity/authentication
const KEY_LOCALSTORAGE_KEY = 'ic-identity';
const KEY_LOCALSTORAGE_DELEGATION = 'ic-delegation';
const DEFAULT_IDP_URL = 'https://auth.ic0.app/authorize';

interface AuthenticationClientOptions {
  identityProvider?: string | URL;
  identity?: SignIdentity;
}

export class AuthenticationClient {
  private _auth: Authenticator;
  private _identity: Identity;
  private _key: SignIdentity | null;
  private _chain: DelegationChain | null;

  constructor(options: AuthenticationClientOptions = {}) {
    const idpUrl = new URL(options.identityProvider?.toString() || DEFAULT_IDP_URL);

    this._auth = new Authenticator({
      identityProvider: {
        url: idpUrl,
      }
    });

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
          this._chain = chain;
          this._identity = DelegationIdentity.fromDelegation(key, chain);
        }
      } catch (e) {
      }
    }
  }

  getIdentity() {
    return this._identity;
  }

  isAuthenticated() {
    return !this.getIdentity().getPrincipal().isAnonymous() && this._chain !== null;
  }

  _getAccessToken(location: Location) {
    try {
      const searchParams = new URLSearchParams(location.search);
      // Remove the `#` at the start.
      const hashParams = new URLSearchParams(location.hash.substr(1));

      return searchParams.get('accessToken')
        || searchParams.get('access_token')
        || hashParams.get('accessToken')
        || hashParams.get('access_token')
        || null;
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
      console.log('no token...');
      return;
    }
    const key = this._key;
    if (!key) {
      throw new Error('Cannot ');
    }

    // Parse the token which is a JSON object serialized in Hex form.
    const chainJson = [...maybeToken]
      .reduce((acc, curr, i) => {
        acc[Math.floor(i/2)] = (acc[i/2 | 0] || "") + curr;
        return acc;
      }, [] as string[])
      .map(x => Number.parseInt(x, 16))
      .map(x => String.fromCharCode(x))
      .join('');
    this._chain = DelegationChain.fromJSON(chainJson);
    localStorage.setItem(KEY_LOCALSTORAGE_DELEGATION, JSON.stringify(this._chain.toJSON()));
    this._identity = DelegationIdentity.fromDelegation(key, this._chain);

    return {
      identity: this._identity,
    }
  }

  async logout(options: { returnTo?: string; } = {}) {
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

  async loginWithRedirect(options: { redirectUri?: string; scope?: Principal[]; } = {}) {
    let key = this._key;
    if (!key) {
      // Create a new key (whether or not one was in storage).
      key = Ed25519KeyIdentity.generate();
      this._key = key;
      localStorage.setItem(KEY_LOCALSTORAGE_KEY, JSON.stringify(key));
    }

    await this._auth.sendAuthenticationRequest({
      session: {
        identity: key,
      },
      redirectUri: new URL(options.redirectUri || window.location.href),
      scope: options.scope?.map(x => ({ type: 'CanisterScope', principal: x })) ?? [],
    });
  }
}
