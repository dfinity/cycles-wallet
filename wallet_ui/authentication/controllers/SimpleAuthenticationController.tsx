import * as t from "../types";

export default function SimpleAuthenticationController(): t.IAuthenticationController<t.IRegistration> {
    let registration: t.IRegistration|undefined;
    let session: t.ISession<t.IRegistration>|undefined;
    return {
        register,
        createSession,
        endSession,
    }

    async function register() {
        const credential: t.ICredential = {
            type: "Credential",
            id: `credential-id-${Math.random().toString().slice(2)}`
        };
        registration = {
            type: "Registration",
            credential,
        }
        return registration
    }

    async function createSession(options: {
        registration: t.IRegistration
    }): Promise<t.ISession<t.IRegistration>> {
        session = {
            type: "Session",
            authorization: options.registration.credential.id,
            registration: options.registration,
        }
        return session
    }

    function endSession(s: t.ISession<t.IRegistration>) {
        session = undefined;
    }
}
