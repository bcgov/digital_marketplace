/// <reference types="cypress" />

describe('As a user authenticated via GitHub,',  function() {
    beforeEach(function() {
        // refactor to use login later

        cy.sqlFixture('dbReset.sql')
        cy.sqlFixture('users.sql')
        cy.visit('/auth/createsessionvendor')
        cy.sqlFixture('cwuOpportunity.sql')
        cy.sqlFixture('cwuProposal.sql')
        Cypress.Cookies.preserveOnce("sid")
        cy.getCookie('sid').should('exist');
    })

    it('edit CWU proposal', function() {
        cy.get('#user-sign-up-step-two-terms').click()
        cy.get('a').contains('Complete Profile').click()
        cy.contains('Fixture CWU Opportunity Title').click()
        cy.contains('Edit').click()

        // 1. Proponent tab
        cy.get('#cwu-proposal-individual-legalName').clear().type('new legal name')
        cy.get('#cwu-proposal-individual-email').clear().type('new@gmail.com')
        cy.get('#cwu-proposal-individual-phone').clear().type('222-222-2222')
        cy.get('#cwu-proposal-individual-street1').clear().type('new address1')
        cy.get('#cwu-proposal-individual-street2').clear().type('new address2')
        cy.get('#cwu-proposal-individual-city').clear().type('new city')
        cy.get('#cwu-proposal-individual-region').clear().type('new province')
        cy.get('#cwu-proposal-individual-mailCode').clear().type('new postal code')
        cy.get('#cwu-proposal-individual-country').clear().type('new country')
        cy.get('a').contains('Next').click()

        // 2. Proposal
        cy.get('#cwu-proposal-proposalText').clear().type('new Proposal')
        cy.get('#cwu-proposal-additional-comments').clear().type('new Additional comments')
        cy.get('a').contains('Next').click()

        // 3. Attachments
        cy.get('path[d="M32 464a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128H32zm272-256a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zM432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"]').click({force: true})


        // Submit
        cy.get('a').contains('Submit Changes').trigger('click')
        cy.contains('Review Terms and Conditions').should('be.visible')
        cy.get('#edit-cwu-proposal-submit-terms-proposal').click()
        cy.get('#edit-cwu-proposal-submit-terms-app').click()
        cy.get('div[class*="modal-footer"]').children().contains('Submit Changes').click();
        cy.contains('Your changes to your Code With Us proposal have been submitted.').should('be.visible');
        cy.get('span[class*="badge"]').contains('Submitted').should('exist')

        // Confirm save
        cy.visit("/dashboard")
        cy.contains('Fixture CWU Opportunity Title').click()

        // 1. Proponent tab
        cy.get('#cwu-proposal-proponent-type-0').should('be.checked')
        cy.get('#cwu-proposal-proponent-type-1').should('not.be.checked')
        cy.get('#cwu-proposal-individual-legalName').should('have.value','new legal name')
        cy.get('#cwu-proposal-individual-email').should('have.value','new@gmail.com')
        cy.get('#cwu-proposal-individual-phone').should('have.value','222-222-2222')
        cy.get('#cwu-proposal-individual-street1').should('have.value','new address1')
        cy.get('#cwu-proposal-individual-street2').should('have.value','new address2')
        cy.get('#cwu-proposal-individual-city').should('have.value','new city')
        cy.get('#cwu-proposal-individual-region').should('have.value','new province')
        cy.get('#cwu-proposal-individual-mailCode').should('have.value','new postal code')
        cy.get('#cwu-proposal-individual-country').should('have.value','new country')
        cy.get('a').contains('Next').click()

        // 2. Proposal
        cy.get('#cwu-proposal-proposalText').should('have.value','new Proposal')
        cy.get('#cwu-proposal-additional-comments').should('have.value','new Additional comments')
        cy.get('a').contains('Next').click()

        // 3. Attachments
        cy.get('input[placeholder="Screenshot.png"]').should('not.exist')

    })

    it.skip('delete CWU proposal', function() {
        // cy.get('#user-sign-up-step-two-terms').click()
        // cy.get('a').contains('Complete Profile').click()
        cy.contains('Fixture CWU Opportunity Title').click()
        cy.contains('Withdraw').click()
        cy.get('div[class*="modal-footer"]').children().contains('Withdraw Proposal').click();

        cy.contains('Code With Us proposal has been withdrawn.').should('exist');
        cy.get('span[class*="badge"]').contains('Withdrawn').should('exist')


    })
});
