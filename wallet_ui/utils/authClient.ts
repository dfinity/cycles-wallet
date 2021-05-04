import { Identity } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";

class AuthClientWrapper {
  public authClient?: AuthClient;
  public ready = false;
  constructor() {
    return this;
  }
  async create() {
    console.trace("create");
    this.authClient = await AuthClient.create();
    this.ready = true;
  }
  async login(): Promise<Identity | undefined> {
    return new Promise(async (resolve) => {
      console.trace("login");
      return await this.authClient?.login({
        identityProvider:
          "http://localhost:8000?canisterId=rno2w-sqaaa-aaaaa-aaacq-cai#authorize",
        onSuccess: async () => {
          resolve(await this.authClient?.getIdentity());
        },
      });
    });
  }

  async getIdentity() {
    console.trace("getIdentity");
    return await this.authClient?.getIdentity();
  }

  async isAuthenticated() {
    console.trace("isAuthenticated");
    return await this.authClient?.isAuthenticated();
  }
}

export const authClient = new AuthClientWrapper();
authClient.create();
