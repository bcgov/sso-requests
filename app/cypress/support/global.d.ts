declare namespace Cypress {
  interface Chainable<Subject> {
    login(username?: string, idp?: 'idir' | 'azureidir'): Chainable<any>;

    logout(host?: string): void;

    setid(type: string | null): Chainable<any>;

    generateUUID(): Chainable<any>;

    realPress(el: string): void;

    findByRole(el: string, options: any): Chainable<any>;
  }
}
