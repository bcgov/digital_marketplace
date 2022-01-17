/// <reference types="cypress" />

describe('As a user authenticated via GitHub',  function() {
    beforeEach(function() {
        // refactor to use login later

        cy.sqlFixture('dbReset.sql')
        cy.sqlFixture('users.sql')
        cy.visit('/auth/createsessionvendor')
        cy.sqlFixture('cwuOpportunity.sql')
        Cypress.Cookies.preserveOnce("sid")
        cy.getCookie('sid').should('exist');
    })

    it('create and read CWU proposal', function() {
        cy.get('#user-sign-up-step-two-terms').click()
        cy.get('a').contains('Complete Profile').click()
        cy.contains('View All Opportunities').click()
        cy.contains('Fixture CWU Opportunity Title').click()
        cy.contains('Start Proposal').click()

        // 1. Proponent tab
        cy.get('#cwu-proposal-proponent-type-0').click({force: true}) // forcing because the input id is covered by the label
        cy.get('#cwu-proposal-individual-legalName').type('legal name')
        cy.get('#cwu-proposal-individual-email').type('fake@gmail.com')
        cy.get('#cwu-proposal-individual-phone').type('123-456-7890')
        cy.get('#cwu-proposal-individual-street1').type('address1')
        cy.get('#cwu-proposal-individual-street2').type('address2')
        cy.get('#cwu-proposal-individual-city').type('Victoria')
        cy.get('#cwu-proposal-individual-region').type('BC')
        cy.get('#cwu-proposal-individual-mailCode').type('V8W 2Z6')
        cy.get('#cwu-proposal-individual-country').type('Canada')
        cy.get('a').contains('Next').click()

        // 2. Proposal
        cy.get('#cwu-proposal-proposalText').type('Proposal')
        cy.get('#cwu-proposal-additional-comments').type('Additional comments')
        cy.get('a').contains('Next').click()

        // 3. Attachments
        const fixtureFile = 'Screenshot.png';
        cy.get('[type=file]').attachFile(fixtureFile);

        // Submit
        // cy.wait(3000)
        cy.get('a').contains('Submit').click()
        // cy.wait(3000)
        cy.contains('Review Terms and Conditions').should('be.visible')
        cy.get('#create-cwu-proposal-submit-terms-proposal').click()
        cy.get('#create-cwu-proposal-submit-terms-app').click()
        cy.get('a').contains('Submit Proposal').click()

    })
});
