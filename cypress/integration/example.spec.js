/// <reference types="cypress" />

describe('example to-do app', function() {
    beforeEach(function() {
      cy.visit('localhost:3000')
    })

    it('displays the Browse Opportunities button', function() {
      cy.contains('Browse Opportunities').should('be.visible')
    })
});
