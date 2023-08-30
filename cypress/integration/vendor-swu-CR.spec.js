/// <reference types="cypress" />

describe("As a user authenticated via GitHub", function () {
  beforeEach(function () {
    cy.sqlFixture("dbReset.sql");
    cy.sqlFixture("users.sql");
    cy.vendorLogin(1);
    cy.sqlFixture("organizations.sql");
    cy.sqlFixture("swuOpportunityPublished.sql");
  });

  it("create and read SWU proposal", function () {
    cy.visit("/opportunities");
    cy.contains("SWU created by admin").should("be.visible").click();
    cy.contains("Start Proposal").should("be.visible").click();

    // 1. Evaluation tab
    cy.contains("Scoring Table").should("be.visible");
    cy.get("a").contains("Next").should("be.visible").click();

    // 2. Proposal
    cy.get("#react-select-3-input").type("Test Organization 1{enter}", {
      force: true
    }); // forcing because element covered by div

    cy.get('div[class="h3 mb-0"]')
      .contains("Inception")
      .should("be.visible")
      .click();
    cy.get('div[class="mb-5 row"]')
      .eq(0)
      .children()
      .contains("Add Team Member(s)")
      .should("be.visible")
      .click();
    cy.get("a").contains("Test Vendor User").should("be.visible").click();
    cy.get('div[class*="modal-footer"]')
      .children()
      .contains("Add Team Member(s)")
      .click();

    cy.get('div[class="h3 mb-0"]')
      .contains("Proof of Concept")
      .should("be.visible")
      .click();
    cy.get('div[class="mb-5 row"]')
      .eq(1)
      .children()
      .contains("Add Team Member(s)")
      .should("be.visible")
      .click();
    cy.get("a")
      .contains("Test Vendor User 2")
      .should("be.visible")
      .click({ force: true });
    cy.get('div[class*="modal-footer"]')
      .children()
      .contains("Add Team Member(s)")
      .click();

    cy.get('div[class="h3 mb-0"]')
      .contains("Implementation")
      .should("be.visible")
      .click();
    cy.get('div[class="mb-5 row"]')
      .eq(2)
      .children()
      .contains("Add Team Member(s)")
      .should("be.visible")
      .click();
    cy.get("a").contains("Test Vendor User 3").should("be.visible").click();
    cy.get('div[class*="modal-footer"]')
      .children()
      .contains("Add Team Member(s)")
      .click();
    cy.get("a").contains("Next").click();

    // 3. Pricing
    cy.get("#swu-proposal-inception-cost").should("be.visible").type("100000");
    cy.get("#swu-proposal-prototype-cost").type("100000");
    cy.get("#swu-proposal-implementation-cost").type("100000");
    cy.get("a").contains("Next").click();

    //4. Team Questions
    cy.get('div[class="h3 mb-0"]')
      .contains("Question 1")
      .should("be.visible")
      .click();
    cy.get("#swu-proposal-team-question-response-0")
      .should("be.visible")
      .type("Answering question 1");
    cy.get("a").contains("Next").click();

    //5. References
    cy.get("#swu-proposal-reference-0-name").should("be.visible").type("Ref 1");
    cy.get("#swu-proposal-reference-0-company").type("Company 1");
    cy.get("#swu-proposal-reference-0-phone").type("111111111");
    cy.get("#swu-proposal-reference-0-email").type("one@email.com");

    cy.get("#swu-proposal-reference-1-name").should("be.visible").type("Ref 2");
    cy.get("#swu-proposal-reference-1-company").type("Company 2");
    cy.get("#swu-proposal-reference-1-phone").type("222222222");
    cy.get("#swu-proposal-reference-1-email").type("two@email.com");

    cy.get("#swu-proposal-reference-2-name").should("be.visible").type("Ref 3");
    cy.get("#swu-proposal-reference-2-company").type("Company 3");
    cy.get("#swu-proposal-reference-2-phone").type("333333333");
    cy.get("#swu-proposal-reference-2-email").type("three@email.com");
    cy.get("a").contains("Next").click();

    //6.Review
    cy.get("a").contains("Submit").trigger("click");
    cy.contains("Review Terms and Conditions").should("be.visible");
    cy.get("#create-swu-proposal-submit-terms-proposal").click();
    cy.get("#create-swu-proposal-submit-terms-app").click();
    cy.get("a").contains("Submit Proposal").click();
    cy.contains("Your Sprint With Us proposal has been submitted.").should(
      "be.visible"
    );
    cy.get('span[class*="badge"]').contains("Submitted").should("be.visible");

    // Confirm save
    cy.visit("/dashboard");
    cy.contains("SWU created by admin").click();

    // 1. Evaluation tab
    cy.contains("Scoring Table").should("be.visible");
    cy.get("a").contains("Next").should("be.visible").click();

    // 2. Proposal
    cy.get("#swu-proposal-organization")
      .children()
      .contains("Test Organization 1")
      .should("be.visible");

    cy.get('div[class="h3 mb-0"]')
      .contains("Inception")
      .should("be.visible")
      .click();
    cy.get("a").contains("Test Vendor User").should("be.visible");

    cy.get('div[class="h3 mb-0"]')
      .contains("Proof of Concept")
      .should("be.visible")
      .click();
    cy.get("a").contains("Test Vendor User 2").should("be.visible");

    cy.get('div[class="h3 mb-0"]')
      .contains("Implementation")
      .should("be.visible")
      .click();
    cy.get("a").contains("Test Vendor User 3").should("be.visible");
    cy.get("a").contains("Next").should("be.visible").click();

    // 3. Pricing
    cy.get("#swu-proposal-inception-cost").should("have.value", "100000");
    cy.get("#swu-proposal-prototype-cost").should("have.value", "100000");
    cy.get("#swu-proposal-implementation-cost").should("have.value", "100000");
    cy.get("a").contains("Next").click();

    //4. Team Questions
    cy.get('div[class="h3 mb-0"]')
      .contains("Question 1")
      .should("be.visible")
      .click();
    cy.get("#swu-proposal-team-question-response-0").should(
      "have.value",
      "Answering question 1"
    );
    cy.get("a").contains("Next").click();

    //5. References
    cy.get("#swu-proposal-reference-0-name").should("have.value", "Ref 1");
    cy.get("#swu-proposal-reference-0-company").should(
      "have.value",
      "Company 1"
    );
    cy.get("#swu-proposal-reference-0-phone").should("have.value", "111111111");
    cy.get("#swu-proposal-reference-0-email").should(
      "have.value",
      "one@email.com"
    );

    cy.get("#swu-proposal-reference-1-name")
      .should("be.visible")
      .should("have.value", "Ref 2");
    cy.get("#swu-proposal-reference-1-company").should(
      "have.value",
      "Company 2"
    );
    cy.get("#swu-proposal-reference-1-phone").should("have.value", "222222222");
    cy.get("#swu-proposal-reference-1-email").should(
      "have.value",
      "two@email.com"
    );

    cy.get("#swu-proposal-reference-2-name")
      .should("be.visible")
      .should("have.value", "Ref 3");
    cy.get("#swu-proposal-reference-2-company").should(
      "have.value",
      "Company 3"
    );
    cy.get("#swu-proposal-reference-2-phone").should("have.value", "333333333");
    cy.get("#swu-proposal-reference-2-email").should(
      "have.value",
      "three@email.com"
    );
  });
});
