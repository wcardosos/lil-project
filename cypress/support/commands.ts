Cypress.Commands.add("createProject", (name: string, slug?: string) => {
  cy.get("[data-cy=project-name-input]").clear().type(name);
  if (slug) {
    cy.get("[data-cy=project-slug-input]").clear().type(slug);
  }
  cy.get("[data-cy=submit-project]").click();
});

Cypress.Commands.add("shouldBeOnBoard", (slug: string) => {
  cy.url().should("include", `/projects/${slug}/board`);
});
