import { blobFromUint8Array, SignIdentity } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/authentication";
import { makeLog } from "./log";

export interface KeyedLocalStorage {
  key: string;
  localStorage: typeof localStorage;
}

export interface Session {
  authenticationResponse: undefined | string;
  identity: {
    type: "Ed25519KeyIdentity";
    secretKey: {
      hex: string;
    };
  };
}

/**
 * Read a Session from persistent Storage.
 * If there isn't one stored, return undefined.
 */
export function readSession(storage: KeyedLocalStorage): Readonly<Session> | undefined {
  const log = makeLog("readSession");
  const { localStorage, key: localStorageKey } = storage;
  const stored = localStorage.getItem(localStorageKey);
  if (!stored) {
    return;
  }
  const parsed = (() => {
    try {
      return JSON.parse(stored) as unknown;
    } catch (error) {
      log("warn", "error parsing stored localStorage", { error });
    }
  })();
  if (!parsed) {
    return;
  }
  return parsed as Session;
}

/**
 * Write a Session to persistent Storage.
 * @param session - session to store
 */
export function writeSession(session: Session, storage: KeyedLocalStorage) {
  const log = makeLog("writeSession");
  const stringified = JSON.stringify(session, null, 2);
  const { localStorage, key: localStorageKey } = storage;
  log('debug', 'writing', { localStorageKey, stringified})
  localStorage.setItem(localStorageKey, stringified);
}

/**
 * Return a Session, somehow.
 * If one is stored, return it.
 * Otherwise, create a brand new one, save it, and return it.
 */
export function readOrCreateSession(storage: KeyedLocalStorage): Readonly<Session> {
  const log = makeLog("readOrCreateSession");
  const session1 = readSession(storage);
  log("debug", "read session", session1);
  if (session1) {
    return session1;
  }
  const session2 = createSession();
  writeSession(session2, storage);
  return session2;
}

/**
 * Create a brand new Session.
 * New sessions have an identity, but they aren't yet authenticated.
 * i.e. they have an ed25519 keyPair created right here,
 * but the `.authenticationResponse` property is undefined.
 * AuthenticationResponse can be requested via @dfinity/authentication
 * `authenticator.sendAuthenticationRequest`
 */
export function createSession(): Readonly<Session> {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const keyPair = Ed25519KeyIdentity.generate(seed).getKeyPair();
  return {
    authenticationResponse: undefined,
    identity: {
      type: "Ed25519KeyIdentity",
      secretKey: {
        hex: toHex(keyPair.secretKey),
      },
    },
  };
}

/**
 * Encode the input as a hexidecimal number string.
 * @param input - thing to hex-encode
 */
function toHex(input: Uint8Array): string {
  return Array.from(input)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Decode a hex string to bytes
 * @param hex - hexidecimal number string to decode
 */
function hexToBytes(hex: string) {
  return Uint8Array.from(
    (hex.match(/.{2}/gi) || []).map((s) => parseInt(s, 16))
  );
}

/**
 * Given a Session, return a corresponding @dfinity/authentication SignIdentity.
 * The only supported SignIdentity is Ed25519KeyIdentity (so far)
 * @param session - ic-whoami Session to use as inputs to SignIdentity construction
 */
function SessionSignIdentity(session: Session): SignIdentity {
  makeLog('SessionSignIdentity')('debug', { session })
  const id = Ed25519KeyIdentity.fromSecretKey(
    hexToBytes(session.identity.secretKey.hex)
  );
  return id;
}

/**
 * Session wrapped so it can be passed to @dfinity/authentication Authenticator methods
 * @param session - ic-whoami Session
 */
export function AuthenticatorSession(session: Session) {
  const log = makeLog("AuthenticatorSession");
  log('debug', 'init', { session })
  const sessionIdentity = SessionSignIdentity(session);
  return {
    authenticationResponse: session.authenticationResponse,
    identity: {
      publicKey: sessionIdentity.getPublicKey(),
      sign: async (challenge: ArrayBuffer) => {
        challenge = new Uint8Array(challenge);
        log("debug", "sign", {
          challenge: String.fromCharCode(...new Uint8Array(challenge)),
        });
        const signature: Uint8Array = new Uint8Array(
          await sessionIdentity.sign(
            blobFromUint8Array(new Uint8Array(challenge))
          )
        );
        log("debug", "signature", toHex(signature));
        return signature;
      },
    },
  };
}
