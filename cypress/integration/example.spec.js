/// <reference types="cypress" />

describe("example Digital Marketplace test", function () {
  beforeEach(function () {
    cy.visit("localhost:3000");
  });

  it("displays the Browse Opportunities button", function () {
    cy.contains("Browse Opportunities").should("be.visible");
  });
});
