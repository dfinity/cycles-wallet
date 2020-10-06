import * as React from "react";
import SimpleAuthenticationController from "../controllers/SimpleAuthenticationController";
import * as t from "../types";

export default function AuthenticationTester(props: {
    authenticationController: t.IAuthenticationController
}) {
    const {
        authenticationController,
    } = props;
    const [registration, setRegistration] = React.useState<t.IRegistration|undefined>(authenticationController.registration);
    const [session, setSession] = React.useState<t.ISession<t.IRegistration>|undefined>(authenticationController.session);
    console.debug('AuthenticationTester', Date.now(), {
        registration,
        session,
    })
    function onClickEndSession(event: React.MouseEvent<HTMLButtonElement>) {
        if (session) {
            props.authenticationController.endSession(session);
        }
        setSession(undefined);
    }
    return (
        <>
            <h1>AuthenticationTester</h1>
            {
                session
                ? <>
                    <p>Session active!</p>
                    <pre>{JSON.stringify(session, null, 2)}</pre>
                    <button onClick={onClickEndSession}>End Session</button>
                </>
                : (registration
                    ? <>
                        <SignInTester
                            authenticationController={authenticationController}
                            registration={registration}
                            onSession={setSession}
                            debug={true}
                        />
                    </>
                    : <>
                        <RegistrationTester
                            authenticationController={authenticationController}
                            registration={registration}
                            onRegistration={setRegistration}
                            debug={true}
                        />
                    </>
                )
            }
        </>
    )
}

export function RegistrationTester(props: {
    authenticationController: t.IAuthenticationController
    registration?: t.IRegistration,
    onRegistration?: (registration: t.IRegistration) => void,
    debug?: boolean
}) {
    const { registration } = props; 
    async function onClickRegister(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        console.debug('onClickRegister', { event })
        const registration = await props.authenticationController.register();
        console.debug('RegistrationTester created registration', { registration })
        if (props.onRegistration) {
            props.onRegistration(registration);
        }
    }
    return <>
        <p>
            <button onClick={onClickRegister}>Register</button>            
        </p>
    </>
}

export function SignInTester(props: {
    authenticationController: t.IAuthenticationController
    registration: t.IRegistration,
    onSession?: (s: t.ISession<t.IRegistration>) => void,
    debug?: boolean
}) {
    const { registration, debug } = props;
    async function onClickSignIn(event: React.MouseEvent) {
        event.preventDefault();
        console.debug('onClickSignIn', { event })
        const session = await props.authenticationController.createSession({ registration })
        if (props.onSession) {
            props.onSession(session)
        }
    }
    return <>
        {(registration && debug) && <>
            <header>Registration</header>
            <pre>{JSON.stringify(registration, null, 2)}</pre>
        </>}
        <p>
            <button onClick={onClickSignIn}>Sign In using credential {JSON.stringify(props.registration.credential.id)}</button>
        </p>
    </>
}
