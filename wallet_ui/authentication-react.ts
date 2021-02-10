import * as React from "react";
import type { Authenticator } from "@dfinity/authentication"
import { AuthenticatorSession, KeyedLocalStorage, readOrCreateSession, writeSession } from "./session";
import { makeLog } from "@dfinity/agent";
import * as assert from "assert";

export function useInternetComputerAuthentication(
    parameters: {
        authenticator: Authenticator,
        href: string,
        sessionStorage: KeyedLocalStorage
    }
) {
    const log = makeLog('useInternetComputerAuthentication');
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
        assert.ok(session.authenticationResponse);
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
    return { session }
}

function isMaybeAuthenticationResponse(href: string) {
    const url = new URL(href);
    return Boolean(url.searchParams.get('access_token'))
}
