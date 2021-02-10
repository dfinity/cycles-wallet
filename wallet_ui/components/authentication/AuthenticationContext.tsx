import * as React from "react";
import { createSession, Session } from "../../session";

interface AuthenticationContextValue {
    session: Readonly<Session>
}

const defaultValue: AuthenticationContextValue = {
    session: createSession()
}

export const AuthenticationContext: React.Context<AuthenticationContextValue> = React.createContext(defaultValue);
export default AuthenticationContext;
