import {
  AnonymousIdentity,
  blobFromUint8Array,
  derBlobFromBlob,
} from "@dfinity/agent";
import { isDelegationValid } from "@dfinity/authentication";
import {
  Delegation,
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from "@dfinity/identity";
const KEY_LOCALSTORAGE_KEY = "identity";
const KEY_LOCALSTORAGE_DELEGATION = "delegation";
const IDENTITY_PROVIDER_DEFAULT = "https://identity.ic0.app";
const IDENTITY_PROVIDER_ENDPOINT = "#authorize";
async function _deleteStorage(storage) {
  await storage.remove(KEY_LOCALSTORAGE_KEY);
  await storage.remove(KEY_LOCALSTORAGE_DELEGATION);
}
export class LocalStorage {
  constructor(prefix = "ic-", _localStorage) {
    this.prefix = prefix;
    this._localStorage = _localStorage;
  }
  get(key) {
    return Promise.resolve(this._getLocalStorage().getItem(this.prefix + key));
  }
  set(key, value) {
    this._getLocalStorage().setItem(this.prefix + key, value);
    return Promise.resolve();
  }
  remove(key) {
    this._getLocalStorage().removeItem(this.prefix + key);
    return Promise.resolve();
  }
  _getLocalStorage() {
    if (this._localStorage) {
      return this._localStorage;
    }
    const ls =
      typeof window === "undefined"
        ? typeof global === "undefined"
          ? typeof self === "undefined"
            ? undefined
            : self.localStorage
          : global.localStorage
        : window.localStorage;
    if (!ls) {
      throw new Error("Could not find local storage.");
    }
    return ls;
  }
}
export class AuthClient {
  constructor(
    _identity,
    _key,
    _chain,
    _storage,
    // A handle on the IdP window.
    _idpWindow,
    // The event handler for processing events from the IdP.
    _eventHandler
  ) {
    this._identity = _identity;
    this._key = _key;
    this._chain = _chain;
    this._storage = _storage;
    this._idpWindow = _idpWindow;
    this._eventHandler = _eventHandler;
  }
  static async create(options = {}) {
    var _a;
    const storage =
      (_a = options.storage) !== null && _a !== void 0
        ? _a
        : new LocalStorage("ic-");
    let key = null;
    if (options.identity) {
      key = options.identity;
    } else {
      const maybeIdentityStorage = await storage.get(KEY_LOCALSTORAGE_KEY);
      if (maybeIdentityStorage) {
        try {
          key = Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
        } catch (e) {
          // Ignore this, this means that the localStorage value isn't a valid Ed25519KeyIdentity
          // serialization.
        }
      }
    }
    let identity = new AnonymousIdentity();
    let chain = null;
    if (key) {
      try {
        const chainStorage = await storage.get(KEY_LOCALSTORAGE_DELEGATION);
        if (chainStorage) {
          chain = DelegationChain.fromJSON(chainStorage);
          // Verify that the delegation isn't expired.
          if (!isDelegationValid(chain)) {
            await _deleteStorage(storage);
            key = null;
          } else {
            identity = DelegationIdentity.fromDelegation(key, chain);
          }
        }
      } catch (e) {
        console.error(e);
        // If there was a problem loading the chain, delete the key.
        await _deleteStorage(storage);
        key = null;
      }
    }
    return new this(identity, key, chain, storage);
  }
  _handleSuccess(message, onSuccess) {
    var _a;
    const delegations = message.delegations.map((signedDelegation) => {
      return {
        delegation: new Delegation(
          blobFromUint8Array(signedDelegation.delegation.pubkey),
          signedDelegation.delegation.expiration,
          signedDelegation.delegation.targets
        ),
        signature: blobFromUint8Array(signedDelegation.signature),
      };
    });
    const delegationChain = DelegationChain.fromDelegations(
      delegations,
      derBlobFromBlob(blobFromUint8Array(message.userPublicKey))
    );
    const key = this._key;
    if (!key) {
      return;
    }
    this._chain = delegationChain;
    this._identity = DelegationIdentity.fromDelegation(key, this._chain);
    (_a = this._idpWindow) === null || _a === void 0 ? void 0 : _a.close();
    onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess();
    this._removeEventListener();
  }
  getIdentity() {
    return this._identity;
  }
  async isAuthenticated() {
    return (
      !this.getIdentity().getPrincipal().isAnonymous() && this._chain !== null
    );
  }
  async login(options) {
    var _a, _b, _c;
    let key = this._key;
    if (!key) {
      // Create a new key (whether or not one was in storage).
      key = Ed25519KeyIdentity.generate();
      this._key = key;
      await this._storage.set(KEY_LOCALSTORAGE_KEY, JSON.stringify(key));
    }
    // Create the URL of the IDP. (e.g. https://XXXX/#authorize)
    const identityProviderUrl = new URL(
      ((_a =
        options === null || options === void 0
          ? void 0
          : options.identityProvider) === null || _a === void 0
        ? void 0
        : _a.toString()) || IDENTITY_PROVIDER_DEFAULT
    );
    // Set the correct hash if it isn't already set.
    identityProviderUrl.hash = IDENTITY_PROVIDER_ENDPOINT;
    // If `login` has been called previously, then close/remove any previous windows
    // and event listeners.
    (_b = this._idpWindow) === null || _b === void 0 ? void 0 : _b.close();
    this._removeEventListener();
    // Add an event listener to handle responses.
    this._eventHandler = this._getEventHandler(identityProviderUrl, options);
    window.addEventListener("message", this._eventHandler);
    // Open a new window with the IDP provider.
    this._idpWindow =
      (_c = window.open(identityProviderUrl.toString(), "idpWindow")) !==
        null && _c !== void 0
        ? _c
        : undefined;
  }
  _getEventHandler(identityProviderUrl, options) {
    return async (event) => {
      var _a, _b;
      if (event.origin !== identityProviderUrl.origin) {
        return;
      }
      const message = event.data;
      switch (message.kind) {
        case "authorize-ready": {
          // IDP is ready. Send a message to request authorization.
          const request = {
            kind: "authorize-client",
            sessionPublicKey:
              (_a = this._key) === null || _a === void 0
                ? void 0
                : _a.getPublicKey().toDer(),
            maxTimetoLive:
              options === null || options === void 0
                ? void 0
                : options.maxTimeToLive,
          };
          (_b = this._idpWindow) === null || _b === void 0
            ? void 0
            : _b.postMessage(request, identityProviderUrl.origin);
          break;
        }
        case "authorize-client-success":
          // Create the delegation chain and store it.
          try {
            this._handleSuccess(
              message,
              options === null || options === void 0
                ? void 0
                : options.onSuccess
            );
            // Setting the storage is moved out of _handleSuccess to make
            // it a sync function. Having _handleSuccess as an async function
            // messes up the jest tests for some reason.
            if (this._chain) {
              await this._storage.set(
                KEY_LOCALSTORAGE_DELEGATION,
                JSON.stringify(this._chain.toJSON())
              );
            }
          } catch (err) {
            this._handleFailure(
              err.message,
              options === null || options === void 0 ? void 0 : options.onError
            );
          }
          break;
        case "authorize-client-failure":
          this._handleFailure(
            message.text,
            options === null || options === void 0 ? void 0 : options.onError
          );
          break;
        default:
          break;
      }
    };
  }
  _handleFailure(errorMessage, onError) {
    var _a;
    (_a = this._idpWindow) === null || _a === void 0 ? void 0 : _a.close();
    onError === null || onError === void 0 ? void 0 : onError(errorMessage);
    this._removeEventListener();
  }
  _removeEventListener() {
    if (this._eventHandler) {
      window.removeEventListener("message", this._eventHandler);
    }
    this._eventHandler = undefined;
  }
  async logout(options = {}) {
    _deleteStorage(this._storage);
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
}
//# sourceMappingURL=index.js.map
