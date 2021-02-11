import * as React from "react";
import { useEffect, useRef } from "react";
import { Authenticator, IdentitiesIterable } from "@dfinity/authentication"
import { AuthenticatorSession, KeyedLocalStorage, readOrCreateSession, Session, writeSession } from "./session";
import { AnonymousIdentity, createIdentityDescriptor, IdentityDescriptor, makeLog } from "@dfinity/agent";
import * as assert from "assert";
import { useValue } from "@repeaterjs/react-hooks";

interface AuthenticationState {
    identity: Readonly<IdentityDescriptor>
    session: Readonly<Session>
}

export function useInternetComputerAuthentication(
    parameters: {
        authenticator: Authenticator,
        href: string,
        sessionStorage: KeyedLocalStorage
    }
): AuthenticationState {
    const latestIdentityDescriptor: IdentityDescriptor = useValue(() => IdentitiesIterable(document)) || {
        type: "AnonymousIdentity" as const,
    };
    const log = makeLog('useInternetComputerAuthentication');
    log('debug', { latestIdentityDescriptor })
    let session = readOrCreateSession(parameters.sessionStorage);
    if ( ! session.authenticationResponse) {
        // no authenticationResponse yet. We need one to authenticate.
        if (isMaybeAuthenticationResponse(parameters.href)) {
            writeSession(
                {
                    ...session,
                    authenticationResponse: parameters.href,
                },
                parameters.sessionStorage
            );
            session = readOrCreateSession(parameters.sessionStorage);
        }
    }
    // call useSession
    React.useEffect(
        () => {
            const useSessionCommand = AuthenticatorSession(session);
            log('debug', 'calling useSession with', useSessionCommand)
            parameters.authenticator.useSession(useSessionCommand)
        },
        [
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
