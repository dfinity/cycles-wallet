export interface ICredential {
    type: "Credential",
    id: string;
}

export interface IRegistration {
    type: "Registration",
    credential: ICredential
}

export interface ISession<Registration> {
    type: "Session",
    /** String to send with each request in the session to prove authorization */
    authorization: string,
    registration: Registration
}

export interface IAuthenticationController<Registration=IRegistration> {
    registration?: Registration
    session?: ISession<Registration>
    register(): Promise<Registration>
    createSession(o: { registration: Registration }): Promise<ISession<Registration>>
    endSession(session: ISession<Registration>): void;
}

export interface IAuthenticationStorage<Registration extends IRegistration> {
    get(): IAuthenticationStorageState<Registration>
    store(value: ISession<Registration>|Registration): void;
    remove(session: ISession<Registration>): void;
}

export interface IAuthenticationStorageState<Registration extends IRegistration> {
    session?: ISession<Registration>
    registration?: Registration
}