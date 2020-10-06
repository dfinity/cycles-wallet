import { IAuthenticationStorage, IAuthenticationStorageState, ICredential, IRegistration, ISession } from "../types";

export default function AuthenticationStorageController(): IAuthenticationStorage<IRegistration> {
    const keyNamespace = 'AuthenticationStorageController';
    const key = (s: string) => [keyNamespace, s].join('/')
    const storageKeys = {
        session: key('session'),
        registration: key('registration'),
    }
    return {
        store,
        get,
        remove,
    }
    function remove(session: ISession<IRegistration>) {
        localStorage.removeItem(storageKeys.session);
    }
    function get(): IAuthenticationStorageState<IRegistration> {
        return {
            session: getSession(),
            registration: getRegistration(),
        }
    }
    async function store(value: ISession<IRegistration>|IRegistration) {
        switch (value.type) {
            case "Registration":
                await storeRegistration(value);
                break;
            case "Session":
                await storeSession(value);
                break;
        }
    }
    async function storeRegistration(registration: IRegistration) {
        localStorage.setItem(storageKeys.registration, JSONSerializer().serialize(registration))
    }
    async function storeSession(session: ISession<IRegistration>) {
        localStorage.setItem(storageKeys.session, JSONSerializer().serialize(session))
    }
    function getSession(): ISession<IRegistration>|undefined {
        const string = localStorage.getItem(storageKeys.session);
        if ( ! string) { return undefined; }
        const obj = JSONSerializer().deserialize(string);
        if (obj.type === "Session") {
            return obj as ISession<IRegistration>;
        }
        throw new Error('Unable to parse stored session')
    }
    function getRegistration() {
        const string = localStorage.getItem(storageKeys.registration);
        if ( ! string) { return undefined; }
        const obj = JSONSerializer().deserialize(string);
        if (obj.type === "Registration") {
            return obj as IRegistration;
        }
        throw new Error('Unable to parse stored registration')
    }
}

function JSONSerializer<T>() {
    return {
        serialize(value: any) {
            return JSON.stringify(value);
        },
        deserialize(string: string) {
            return JSON.parse(string);
        }
    }
}
