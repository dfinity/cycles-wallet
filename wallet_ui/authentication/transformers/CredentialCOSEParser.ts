import * as cbor from "cbor";

export default function CoseParser() {
    return {
        credentialToAuthData,
        authDataToCoseByteOffset,
        authDataToCredentialId,
        authDataToCoseBytes,
        authDataToCoseObject,
        coseBytesToCoseObject,
    }
    function credentialToAuthData(credential: PublicKeyCredential) {
        const attestationObjectBuffer = (credential as any)?.response?.attestationObject
        if ( ! attestationObjectBuffer) {
            throw new Error('Cannot find response.attestationObject');
        }
        const attestationObjectHex = hexEncodeArrayBuffer(attestationObjectBuffer)
        const attestationObjectDecoded = cbor.decodeFirstSync(attestationObjectHex, { encoding: 'hex' });
        return attestationObjectDecoded.authData as Uint16Array
    }
    function authDataToCredentialIdLength(authData: Uint16Array) {
        // get the length of the credential ID
        const dataView = new DataView(new ArrayBuffer(2));
        const idLenBytes = authData.slice(53, 55);
        idLenBytes.forEach((value, index) => dataView.setUint8(index, value));
        const credentialIdLength = dataView.getUint16(0);
        return credentialIdLength;
    }
    function authDataToCoseByteOffset(authData: Uint16Array) {
        const publicKeyByteOffset = 55 + authDataToCredentialIdLength(authData);
        return publicKeyByteOffset
    }
    function authDataToCredentialId(authData: Uint16Array) {
        return authData.slice(55, authDataToCoseByteOffset(authData))
    }
    function authDataToCoseBytes(authData: Uint16Array) {
        return authData.slice(authDataToCoseByteOffset(authData));
    }
    function authDataToCoseMap(authData: Uint16Array): Map<number,number|Uint8Array> {
        return cbor.decodeFirstSync(authDataToCoseBytes(authData), { encoding: 'hex' });
    }
    function authDataToCoseObject(authData: Uint16Array) {
        return Object.fromEntries(authDataToCoseMap(authData).entries())
    }
    function coseBytesToCoseMap(coseBytes: Uint16Array) {
        const hex = hexEncodeArrayBuffer(coseBytes);
        console.log('coseBytesToCoseMap', { coseBytes, hex });
        return cbor.decodeFirstSync(hex, { encoding: 'hex' })
    }
    function coseBytesToCoseObject(coseBytes: Uint16Array) {
        const map = coseBytesToCoseMap(coseBytes);
        const obj = coseMapToObject(map);
        return obj;
    }
    function coseMapToObject(map: Map<any, any>) {
        return Object.fromEntries(map.entries());
    }
}

export function hexEncodeArrayBuffer(buffer: ArrayBuffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    }
    