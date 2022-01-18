/// <reference types="cypress" />

describe('As a user authenticated via GitHub',  function() {
    beforeEach(function() {
        cy.sqlFixture('dbReset.sql')
        cy.login('vendor')
        cy.sqlFixture('cwuOpportunity.sql')
    })

    it('create and read CWU proposal', function() {
        cy.get('#user-sign-up-step-two-terms').click()
        cy.get('a').contains('Complete Profile').click()
        cy.get('a[href="/opportunities"]').contains('View All Opportunities').click()
        cy.contains('Fixture CWU Opportunity Title').should('be.visible')
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
        cy.get('input[type=file]').attachFile(fixtureFile);

        // Submit
        cy.get('a').contains('Submit').trigger('click')
        cy.contains('Review Terms and Conditions').should('be.visible')
        cy.get('#create-cwu-proposal-submit-terms-proposal').click()
        cy.get('#create-cwu-proposal-submit-terms-app').click()
        cy.get('a').contains('Submit Proposal').click()

        cy.contains('Your Code With Us proposal has been submitted.').should('be.visible');
        cy.get('span[class*="badge"]').contains('Submitted').should('be.visible')

        // Confirm save
        cy.visit("/dashboard")
        cy.contains('Fixture CWU Opportunity Title').click()

        // 1. Proponent tab
        cy.get('#cwu-proposal-proponent-type-0').should('be.checked')
        cy.get('#cwu-proposal-proponent-type-1').should('not.be.checked')
        cy.get('#cwu-proposal-individual-legalName').should('have.value','legal name')
        cy.get('#cwu-proposal-individual-email').should('have.value','fake@gmail.com')
        cy.get('#cwu-proposal-individual-phone').should('have.value','123-456-7890')
        cy.get('#cwu-proposal-individual-street1').should('have.value','address1')
        cy.get('#cwu-proposal-individual-street2').should('have.value','address2')
        cy.get('#cwu-proposal-individual-city').should('have.value','Victoria')
        cy.get('#cwu-proposal-individual-region').should('have.value','BC')
        cy.get('#cwu-proposal-individual-mailCode').should('have.value','V8W 2Z6')
        cy.get('#cwu-proposal-individual-country').should('have.value','Canada')
        cy.get('a').contains('Next').click()

        // 2. Proposal
        cy.get('#cwu-proposal-proposalText').should('have.value','Proposal')
        cy.get('#cwu-proposal-additional-comments').should('have.value','Additional comments')
        cy.get('a').contains('Next').click()

        // 3. Attachments
        cy.get('input[placeholder="Screenshot.png"]').should('be.visible')

    })
});
