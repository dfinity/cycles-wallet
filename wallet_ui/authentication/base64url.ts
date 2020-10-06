export const base64UrlToBase64 = (base64UrlString: string) => base64UrlString.replace(/\-/g, '+').replace(/_/g, '/') + '=='.substring(0, (3*base64UrlString.length)%4);
export const base64ToBase64Url = (base64String: string) => base64String.replace(/\+/g, '-').replace(/\//g, '_') + '=='.substring(0, (3*base64String.length)%4);
