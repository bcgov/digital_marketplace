/// <reference types="cypress" />

describe('As a user authenticated via GitHub,',  function() {
    beforeEach(function() {
        cy.sqlFixture('dbReset.sql')
        cy.login('vendor')
        cy.sqlFixture('cwuOpportunity.sql')
        cy.sqlFixture('cwuProposal.sql')
    })

    it('edit CWU proposal', function() {
        cy.get('#user-sign-up-step-two-terms').click()
        cy.get('a').contains('Complete Profile').click()
        cy.contains('Fixture CWU Opportunity Title').should('be.visible')
        cy.contains('Fixture CWU Opportunity Title').click()
        cy.contains('Edit').should('be.visible').click()

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
        cy.get('input[placeholder="Screenshot.png"]').siblings('svg').click() // delete attachment

        // Submit
        cy.get('a').contains('Submit Changes').trigger('click')
        cy.contains('Review Terms and Conditions').should('be.visible')
        cy.get('#edit-cwu-proposal-submit-terms-proposal').click()
        cy.get('#edit-cwu-proposal-submit-terms-app').click()
        cy.get('div[class*="modal-footer"]').children().contains('Submit Changes').click();
        cy.contains('Your changes to your Code With Us proposal have been submitted.').should('be.visible');
        cy.get('span[class*="badge"]').contains('Submitted').should('be.visible')

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

    it('delete CWU proposal', function() {
        cy.get('#user-sign-up-step-two-terms').click()
        cy.get('a').contains('Complete Profile').click()
        cy.contains('Fixture CWU Opportunity Title').should('be.visible')
        cy.contains('Fixture CWU Opportunity Title').click()
        cy.contains('Withdraw').click()
        cy.get('div[class*="modal-footer"]').children().contains('Withdraw Proposal').click();

        cy.contains('Code With Us proposal has been withdrawn.').should('be.visible');
        cy.get('span[class*="badge"]').contains('Withdrawn').should('be.visible')


    })
});
