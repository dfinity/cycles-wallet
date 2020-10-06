import * as t from "../types";
import { base64UrlToBase64 } from "../base64url";
import AuthenticationStorageController from "./AuthenticationStorageController";

export default function WebAuthnAuthenticationController(): t.IAuthenticationController<t.IRegistration> {
    const storage = AuthenticationStorageController()
    const { session, registration } = storage.get();
    const controller: t.IAuthenticationController<t.IRegistration> = {
        registration,
        session,
        register,
        createSession,
        endSession,
    }
    return controller;

    async function register() {
        const webauthnCredentialCreation = await navigator.credentials.create({
            publicKey: {
                ...DefaultPublicKeyCredentialCreationOptions(),
                challenge: stringToByteArray(`anonymous-${Math.random().toString().slice(2)}`),
            }
        })
        if ( ! webauthnCredentialCreation) {
            throw new Error(`Failed to create Credential with WebAuthn`)
        }
        const credential: t.ICredential = {
            type: "Credential",
            id: webauthnCredentialCreation.id
        };
        const registration: t.IRegistration = {
            type: "Registration",
            credential,
        }
        await storage.store(registration)
        controller.registration = registration
        return registration
    }

    async function createSession(options: {
        registration: t.IRegistration
    }): Promise<t.ISession<t.IRegistration>> {
        const in24hrs = new Date(Date.now() + (1000 * 60 * 60 * 24))
        const signatureRequest: PublicKeyCredentialRequestOptions = {
            allowCredentials: [{
                type: 'public-key',
                id: credentialIdStringToBytes(options.registration.credential.id)
            }],
            challenge: stringToByteArray(JSON.stringify({
                id: `session-${Math.random().toString().slice(2)}`,
                expiry: in24hrs.toISOString()
            }))
        }
        const got = await navigator.credentials.get({
            publicKey: signatureRequest,
        })
        const signature = (got as any)?.response?.signature as ArrayBuffer
        const signatureBase64: string = btoa(String.fromCharCode(...new Uint8Array(signature)))
        const session: t.ISession<t.IRegistration> = {
            type: "Session",
            authorization: `Bearer ${signatureBase64}`,
            registration: options.registration,
        }
        await storage.store(session)
        controller.session = session
        return session;
    }
    function endSession(session: t.ISession<t.IRegistration>) {
        storage.remove(session);
    }
}

function stringToByteArray(s: string) {
    return Uint8Array.from(s, s => s.charCodeAt(0))
}


function DefaultPublicKeyCredentialCreationOptions(): PublicKeyCredentialCreationOptions {
    return {
        challenge: stringToByteArray("bengo"),
        rp: {
            name: "rust-wallet"
        },
        user: {
            displayName: 'anonymous',
            name: 'anonymous',
            id: stringToByteArray('anonymous'),
        },
        pubKeyCredParams: [
            {
                type: "public-key",
                alg: -7 // "ES256" as registered in the IANA COSE Algorithms registry
            },
            {
                type: "public-key",
                alg: -257 // Value registered by this specification for "RS256"
            }
        ], 
    }
}

function credentialIdStringToBytes(id: string) {
    const base64 = base64UrlToBase64(id);
    const string = atob(base64);
    return Uint8Array.from(string, c => c.charCodeAt(0))
}
