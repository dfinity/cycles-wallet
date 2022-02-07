import { Identity } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";

class AuthClientWrapper {
  public authClient?: AuthClient;
  public ready = false;
  constructor() {
    return this;
  }
  async create() {
    this.authClient = await AuthClient.create();
    await this.authClient?.isAuthenticated();
    this.ready = true;
  }
  async login(): Promise<Identity | undefined> {
    return new Promise(async (resolve) => {
      return await this.authClient?.login({
        identityProvider: this.identityProvider,
        onSuccess: async () => {
          resolve(await this.authClient?.getIdentity());
        },
      });
    });
  }

  async getIdentity() {
    return await this.authClient?.getIdentity();
  }

  async isAuthenticated() {
    return await this.authClient?.isAuthenticated();
  }

  /**
   * Get the internet-identity identityProvider URL to use when authenticating the end-user.
   * Use ?identityProvider if present (useful in development), otherwise return undefined
   * so that AuthClient default gets used.
   * For development, open browser to :
   * `http://localhost:8080/?canisterId=<wallet_canister_id>&identityProvider=http://localhost:8000/?canisterId=<internet_identity_id>`
   */
  private get identityProvider(): string | undefined {
    const fromUrl = new URLSearchParams(location.search).get(
      "identityProvider"
    );

    return fromUrl || undefined;
  }
}

export const authClient = new AuthClientWrapper();
authClient.create();
