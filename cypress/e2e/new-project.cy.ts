describe("New Project", () => {
  beforeEach(() => {
    cy.task("db:reset");
    cy.visit("/new-project");
  });

  it("should render the new project form", () => {
    cy.get("[data-cy=new-project-heading]").should("contain", "Novo projeto");
    cy.get("[data-cy=project-name-input]").should("be.visible");
    cy.get("[data-cy=project-slug-input]").should("be.visible");
    cy.get("[data-cy=submit-project]").should("be.visible");
    cy.get("[data-cy=cancel-project]").should("be.visible");
  });

  describe("client-side validation", () => {
    it("should show error when name is too short", () => {
      cy.get("[data-cy=project-name-input]").type("ab").blur();
      cy.get("[data-cy=name-error]").should(
        "contain",
        "O nome deve ter pelo menos 3 caracteres",
      );
    });

    it("should show error when name contains only numbers", () => {
      cy.get("[data-cy=project-name-input]").type("12345").blur();
      cy.get("[data-cy=name-error]").should(
        "contain",
        "O nome não pode ser composto apenas por números",
      );
    });

    it("should show error when slug has less than 3 letters", () => {
      cy.get("[data-cy=project-slug-input]").type("AB").blur();
      cy.get("[data-cy=slug-error]").should(
        "contain",
        "A abreviação deve ter exatamente 3 letras",
      );
    });

    it("should show validation errors on submit with empty fields", () => {
      cy.get("[data-cy=submit-project]").click();
      cy.get("[data-cy=name-error]").should("be.visible");
      cy.get("[data-cy=slug-error]").should("be.visible");
    });
  });

  describe("auto-slug generation", () => {
    it("should auto-generate slug from name", () => {
      cy.get("[data-cy=project-name-input]").type("Alpha Projeto");
      cy.get("[data-cy=project-slug-input]").should("have.value", "ALP");
    });

    it("should handle accented characters in slug generation", () => {
      cy.get("[data-cy=project-name-input]").type("Ágil");
      cy.get("[data-cy=project-slug-input]").should("have.value", "AGI");
    });

    it("should allow manual slug override", () => {
      cy.get("[data-cy=project-name-input]").type("Alpha Projeto");
      cy.get("[data-cy=project-slug-input]").should("have.value", "ALP");

      cy.get("[data-cy=project-slug-input]").clear().type("XYZ");
      cy.get("[data-cy=project-slug-input]").should("have.value", "XYZ");

      // After manual override, changing name should not update slug
      cy.get("[data-cy=project-name-input]").clear().type("Beta Projeto");
      cy.get("[data-cy=project-slug-input]").should("have.value", "XYZ");
    });
  });

  describe("successful project creation", () => {
    it("should create a project and redirect to the board", () => {
      cy.get("[data-cy=project-name-input]").type("Meu Projeto");
      cy.get("[data-cy=project-slug-input]").should("have.value", "MEU");
      cy.get("[data-cy=submit-project]").click();

      cy.url().should("include", "/projects/MEU/board");
    });

    it("should show loading state during submission", () => {
      cy.get("[data-cy=project-name-input]").type("Projeto Teste");
      cy.get("[data-cy=submit-project]").click();

      cy.get("[data-cy=submit-project]").should("contain", "Criando...");
    });
  });

  describe("duplicate slug", () => {
    it("should show error when slug already exists", () => {
      cy.task("db:seed", [{ name: "Projeto Existente", slug: "ALF" }]);

      cy.get("[data-cy=project-name-input]").type("Alpha Novo");
      cy.get("[data-cy=project-slug-input]").clear().type("ALF");
      cy.get("[data-cy=submit-project]").click();

      cy.get("[data-cy=slug-error]").should(
        "contain",
        "Esta abreviação já está em uso",
      );
    });
  });
});
