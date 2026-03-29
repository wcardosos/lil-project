declare namespace Cypress {
  interface Chainable {
    createProject(name: string, slug?: string): Chainable<void>;
    shouldBeOnBoard(slug: string): Chainable<void>;
  }
}
