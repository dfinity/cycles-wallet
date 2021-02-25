/**
 * This file was copied from bootstrap website, waiting for it to be its own package.
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Identity, Principal } from '@dfinity/agent';

const localStorageCanisterIdKey = 'dfinity-ic-canister-id';
const localStorageHostKey = 'dfinity-ic-host';
const localStorageIdentityKey = 'dfinity-ic-user-identity';
const localStorageLoginKey = 'dfinity-ic-login';

function _getVariable(name: string, localStorageName: string): string | undefined;
function _getVariable(
  name: string,
  localStorageName: string,
  defaultValue: string,
): string;
function _getVariable(
  name: string,
  localStorageName: string,
  defaultValue?: string,
): string | undefined {
  const params = new URLSearchParams(window.location.search);

  const maybeValue = params.get(name);
  if (maybeValue) {
    return maybeValue;
  }

  const lsValue = localStorage.getItem(localStorageName);
  if (lsValue) {
    return lsValue;
  }

  return defaultValue;
}

function _parseCanisterId(s: string | undefined): Principal | undefined {
  s = s || _getVariable('canisterId', localStorageCanisterIdKey);

  if (s === undefined) {
    return undefined;
  } else {
    try {
      return Principal.fromText(s);
    } catch (_) {
      return undefined;
    }
  }
}

// A regex that matches `SUBDOMAIN.CANISTER_ID.ic0.app` (the prod URL).
const ic0AppHostRe = /(?:(?<subdomain>.*)\.)?(?<canisterId>[^.]*)\.(?<domain>ic0\.app)$/;
// A regex that matches `SUBDOMAIN.CANISTER_ID.sdk-test.dfinity.network` (the staging URL).
const sdkTestHostRe = /(?:(?<subdomain>.*)\.)?(?<canisterId>[^.]*)\.(?<domain>sdk-test\.dfinity\.network)$/;
// Matches `SUBDOMAIN.lvh.me`, which always resolves to 127.0.0.1 (old localhost staging).
const lvhMeHostRe = /(?<subdomain>.*)\.(?<canisterId>[^.]*)\.(?<domain>lvh\.me)$/;
// Localhost (development environment).
const localhostHostRe = /(?<subdomain>(.*))\.(?<domain>localhost)$/;

/**
 * Internal data structure for the location informations.
 */
interface LocationInfo {
  // The domain of the request, which is where the worker domain name should be.
  domain: string;
  // The kind of domain we're using (e.g. localhost or Ic0).
  kind: DomainKind;
  // Any subdomains that are before the canister id.
  subdomain: string[];
  // The canister ID in the location.
  canisterId: Principal | null;
  // Whether the location is considered secure (ie. "https"). This is used when building
  // the URL for the replica.
  secure: boolean;
}

function _createLocationInfo(
  meta: { subdomain?: string; canisterId?: string; domain?: string },
  location: URL,
  kind: DomainKind,
): LocationInfo {
  const subdomain = meta.subdomain?.split('.') || [];
  const canisterId = (_parseCanisterId(meta.canisterId)) || null;
  const port = location.port;

  return {
    domain: (meta.domain || 'ic0.app') + (port ? `:${port}` : ''),
    subdomain,
    canisterId,
    kind,
    secure: location.protocol === 'https:',
  };
}

function _parseLocation(location: URL): LocationInfo {
  const maybeIc0 = ic0AppHostRe.exec(location.hostname) || sdkTestHostRe.exec(location.hostname);

  if (maybeIc0) {
    return _createLocationInfo(maybeIc0.groups!, location, DomainKind.Ic0);
  }

  const maybeLocalhost = localhostHostRe.exec(location.hostname);
  if (maybeLocalhost) {
    return _createLocationInfo(maybeLocalhost.groups!, location, DomainKind.Localhost);
  }

  const maybeLvh = lvhMeHostRe.exec(location.hostname);
  if (maybeLvh) {
    return _createLocationInfo(maybeLvh.groups!, location, DomainKind.Lvh);
  }

  return _createLocationInfo({}, location, DomainKind.Unknown);
}

export enum DomainKind {
  Unknown,
  Localhost,
  Ic0,
  Lvh,
}

export class SiteInfo {
  public static async worker(): Promise<SiteInfo> {
    const siteInfo = await SiteInfo.fromWindow();
    siteInfo._isWorker = true;

    return siteInfo;
  }

  public static async unknown(): Promise<SiteInfo> {
    const principal = await _getVariable('canisterId', localStorageCanisterIdKey);
    return new SiteInfo({
      domain: '',
      subdomain: [],
      kind: DomainKind.Unknown,
      canisterId: principal !== undefined ? Principal.fromText(principal) : null,
      secure: false,
    });
  }

  public static fromWindow(): SiteInfo {
    const locationInfo = _parseLocation(new URL(window.location.toString()));
    return new SiteInfo(locationInfo);
  }

  private _isWorker = false;

  constructor(private readonly _info: LocationInfo) {}

  public get kind(): DomainKind {
    return this._info.kind;
  }
  public get secure(): boolean {
    return this._info.secure;
  }
  public get principal(): Principal | undefined {
    return this._info.canisterId || undefined;
  }
  public get domain(): string {
    return this._info.domain;
  }
  public get subdomain(): string[] {
    return this._info.subdomain;
  }

  public async setLogin(username: string, password: string): Promise<void> {
    await this.store(localStorageLoginKey, JSON.stringify([username, password]));
  }

  public async getLogin(): Promise<[string, string] | undefined> {
    const maybeCreds = await this.retrieve(localStorageLoginKey);
    return maybeCreds !== undefined ? JSON.parse(maybeCreds) : undefined;
  }

  public async hasUserIdentity(): Promise<boolean> {
    let k = await _getVariable('userIdentity', localStorageIdentityKey);
    if (k === undefined) {
      k = await this.retrieve(localStorageIdentityKey);
    }

    return !!k;
  }

  public isUnknown(): boolean {
    return this.kind === DomainKind.Unknown;
  }

  public async getWorkerHost(): Promise<string> {
    if (this._isWorker) {
      return '';
    }

    const protocol = this.secure ? 'https:' : 'http:';

    switch (this.kind) {
      case DomainKind.Unknown:
        throw new Error('Cannot get worker host inside a worker.');
      case DomainKind.Ic0:
      case DomainKind.Lvh:
      case DomainKind.Localhost:
        return `${protocol}//z.${this.domain}`;
    }
  }

  public async getHost(): Promise<string> {
    // Figure out the host.
    let host = await _getVariable('host', localStorageHostKey, '');

    if (host) {
      try {
        host = JSON.parse(host);

        if (Array.isArray(host)) {
          return '' + host[Math.floor(Math.random() * host.length)];
        } else {
          return '' + host;
        }
      } catch (_) {
        return host;
      }
    } else {
      const protocol = this.secure ? 'https:' : 'http:';

      switch (this.kind) {
        case DomainKind.Unknown:
          return '';
        case DomainKind.Ic0:
          // TODO: think if we want to have this hard coded here. We might.
          return `${protocol}//gw.dfinity.network`;
        case DomainKind.Lvh:
        case DomainKind.Localhost:
          return `${protocol}//z.${this.domain}`;
        default:
          return host || '';
      }
    }
  }

  private async store(name: string, value: string): Promise<void> {
    localStorage.setItem(name, value);
  }

  private async retrieve(name: string): Promise<string | undefined> {
    return localStorage.getItem(name) || undefined;
  }
}
