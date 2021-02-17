import * as React from "react";
import Button from "@material-ui/core/Button";
import { makeLog } from "@dfinity/agent";
import { AuthenticatorSession, Session } from "../../session";
import { authenticator } from "../../utils/auth";

const log = makeLog('AuthenticationButton')

type Scope = Parameters<(typeof authenticator)['sendAuthenticationRequest']>[0]['scope']
type RedirectUri = Parameters<(typeof authenticator)['sendAuthenticationRequest']>[0]['redirectUri']

/**
 * A button that, when clicked, initiates authentication
 * using @dfinity/authentication
 */
export default function (props: React.PropsWithChildren<{
    request: {
        scope: Scope
        redirectUri: RedirectUri
    },
    session: Session
}>): JSX.Element {
    const { children = "Authenticate" } = props;
    const session = props.session;
    // If there is already an authenticationResponse, disable the button
    // const disabled = React.useMemo(() => Boolean(session.authenticationResponse), [session]);
    const onClickButton = (event: React.MouseEvent) => {
        log('debug', 'onClick', {
            event,
            session,
        });
        const command = {
            ...props.request,
            session: AuthenticatorSession(props.session),
        };
        log('debug', 'invoking `authenticator.sendAuthenticationRequest`', command)
        authenticator.sendAuthenticationRequest(command);
    }
    return <>
        <Button onClick={onClickButton}>{children}</Button>
    </>
}
