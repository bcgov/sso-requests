interface CypressTestUser {
  type: string;
  username: string;
  password: string;
  email: string;
  otpsecret?: string;
}

declare namespace Cypress {
  interface Chainable<Subject> {
    login(username?: string, idp?: 'idir' | 'azureidir'): Chainable<any>;

    logout(host?: string): void;

    setid(type: string | null): Chainable<CypressTestUser>;

    generateUUID(): Chainable<any>;

    realPress(el: string): void;

    findByRole(el: string, options: any): Chainable<any>;
  }
}
