import { IdentityDescriptor } from "@dfinity/authentication";
import * as React from "react";
import { createSession, Session } from "../../session";

interface AuthenticationContextValue {
    identity: IdentityDescriptor
    session: Readonly<Session>
}

const defaultValue: AuthenticationContextValue = {
    identity: { type: "AnonymousIdentity" },
    session: createSession()
}

export const AuthenticationContext: React.Context<AuthenticationContextValue> = React.createContext(defaultValue);
export default AuthenticationContext;
