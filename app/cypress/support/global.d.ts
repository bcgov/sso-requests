declare namespace Cypress {
  interface Chainable<Subject> {
    login(username?: string, password?: string, host?: string, siteminder?: string): Chainable<any>;

    logout(host?: string): void;

    setid(type: string | null): Chainable<any>;

    generateUUID(): Chainable<any>;

    cleanGC(): Chainable<any>;

    realPress(el: string): void;

    findByRole(el: string, options: any): Chainable<any>;
  }
}
