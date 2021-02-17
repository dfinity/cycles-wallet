import * as React from "react";
import { useEffect, useRef } from "react";
import { Authenticator, IdentitiesIterable } from "@dfinity/authentication"
import { AuthenticatorSession, KeyedLocalStorage, readOrCreateSession, readSession, Session, writeSession } from "./session";
import { AnonymousIdentity, createIdentityDescriptor, IdentityDescriptor, makeLog } from "@dfinity/agent";
import * as assert from "assert";
import { useValue } from "@repeaterjs/react-hooks";

interface AuthenticationState {
    identity: Readonly<IdentityDescriptor>
    session: Readonly<Session>
}

/**
 * React Hook wrapping common use of @dfinity/authentication authenticator in Components.
 * See for docs: https://github.com/dfinity/agent-js/blob/next/packages/authentication/docs/how-to-add-authentication-to-canister-ui.md
 * @param parameters
 * @param parameters.authenticator - instance of @dfinity/authentication Authenticator
 * @param parameters.href - current URL of document, which might contain an AuthenticationResponse
 * @param parameters.sessionStorage - describes where to read/write stored session
 */
export function useInternetComputerAuthentication(
    parameters: {
        authenticator: Authenticator,
        href: string,
        sessionStorage: KeyedLocalStorage
    }
): AuthenticationState {
    // IdentitiesIterable will async yield the current identity, and then each new identity
    // This will assign each new async value to `latestIdentityDescriptor`.
    const latestIdentityDescriptor: IdentityDescriptor = useValue(() => IdentitiesIterable(document)) || {
        type: "AnonymousIdentity" as const,
    };
    const log = makeLog('useInternetComputerAuthentication');
    // get session from storage, or create it if this is the first time this user-agent
    // has loaded this page.
    let session = readOrCreateSession(parameters.sessionStorage);
    // If there's no authenticationResponse, then we need to get one in order to call
    // `authenticator.useSession()` on each pageload.
    if ( ! session.authenticationResponse) {
        if (isMaybeAuthenticationResponse(parameters.href)) {
            // There's no authenticationResponse, but this href looks like one...
            // Be hopeful and store href as session.authenticationResponse.
            writeSession(
                {
                    ...session,
                    authenticationResponse: parameters.href,
                },
                parameters.sessionStorage
            );
            // we should be able to immediately read the same session,
            // now with authenticationResponse
            const storedSession = readSession(parameters.sessionStorage);
            if ( ! storedSession) {
                throw new Error('Error reading session immediately after writing.');
            }
            session = storedSession;
        }
    }
    // We expect to have a session.authenticationResponse, either because
    // it was already in sessionStorage from last time,
    // or because we optimistically wrote a maybeAuthenticationResponse just-now from href

    // Whenever session changes, notify @dfinity/authentication via authenticator.useSession()
    React.useEffect(
        () => {
            const useSessionCommand = AuthenticatorSession(session);
            log('debug', 'calling useSession with', useSessionCommand)
            parameters.authenticator.useSession(useSessionCommand)
        },
        [
            AuthenticatorSession,
            parameters.authenticator.useSession,
            session.authenticationResponse,
            session.identity.secretKey.hex,
        ]
    )
    return { session, identity: Object.freeze(latestIdentityDescriptor) }
}

function isMaybeAuthenticationResponse(href: string) {
    const url = new URL(href);
    return Boolean(url.searchParams.get('access_token'))
}
