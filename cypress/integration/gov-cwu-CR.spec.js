/// <reference types="cypress" />

describe('As a user authenticated via IDIR', function() {
    beforeEach(function() {
        cy.sqlFixture('dbReset.sql')
        cy.login()
    })

    it('create, publish, and read new CWU opportunity', function() {
        cy.visit("/opportunities/create")
        cy.get('a[href="/opportunities/code-with-us/create"]').should('be.visible')
        cy.get('a[href="/opportunities/code-with-us/create"]').click()

        // Fill out form

        // 1. Overview tab
        cy.get('#cwu-opportunity-title').should('be.visible').type('Cypress Opp')
        cy.get('#cwu-opportunity-teaser').type('Teaser text')
        cy.get('#cwu-opportunity-remote-ok-0').check({force:true})
        cy.get('#cwu-opportunity-remote-desc').type('Remote description text')
        cy.get('#cwu-opportunity-location').clear().type('Vancouver')
        cy.get('#cwu-opportunity-reward').type('5000')
        cy.get('#cwu-opportunity-skills').type('Agile{enter}')
        cy.get('a').contains('Next').click()

        // 2. Description tab
        cy.get('#cwu-opportunity-description').type('Opp description')
        cy.get('a').contains('Next').click()

        // 3. Details tab
        cy.get('#cwu-opportunity-proposal-deadline').type('2030-01-15')
        cy.get('#cwu-opportunity-assignment-date').type('2030-01-31')
        cy.get('#cwu-opportunity-start-date').type('2030-02-15')
        cy.get('#cwu-opportunity-completion-date').type('2030-02-28')
        cy.get('#cwu-opportunity-submission-info').type('github repo')
        cy.get('#cwu-opportunity-acceptance-criteria').type('Some acceptance criteria')
        cy.get('#cwu-opportunity-evaluation-criteria').type('Some evaluation criteria')
        cy.get('a').contains('Next').click()

        // 4. Attachments tab
        const fixtureFile = 'Screenshot.png';
        cy.get('[type=file]').attachFile(fixtureFile);

        // Publish
        cy.contains('Publish').click();
        cy.contains('Publish Opportunity').click();
        cy.contains('Code With Us opportunity has been published.').should('exist');
        cy.get('span[class*="badge-success"]').should('exist')


        // Read and confirm form saved
        cy.visit("/dashboard")
        cy.contains('Cypress Opp').click()

        // Summary page

        cy.get('h4[class="mb-4"]').should('contain.text','Details')

        // Addenda page
        cy.get('a[href*="tab=addenda"]').first().click()
        cy.get('h3[class="mb-4"]').should('contain.text','Addenda')

        // History page
        cy.get('a[href*="tab=history"]').first().click()
        cy.get('h3[class="mb-4"]').should('contain.text','History')

        // Proposals page
        cy.get('a[href*="tab=proposals"]').first().click()
        cy.get('h4[class="mb-0"]').should('contain.text','Proposals')

        // Opportunity page
        cy.get('a[href*="tab=opportunity"]').first().click()

        // 1. Overview tab
        cy.get('#cwu-opportunity-title').should('have.value', 'Cypress Opp')
        cy.get('#cwu-opportunity-teaser').should('have.value','Teaser text')
        cy.get('#cwu-opportunity-remote-ok-0').should('be.checked')
        cy.get('#cwu-opportunity-remote-ok-1').should('not.be.checked')
        cy.get('#cwu-opportunity-remote-desc').should('have.value','Remote description text')
        cy.get('#cwu-opportunity-location').should('have.value','Vancouver')
        cy.get('#cwu-opportunity-reward').should('have.value','5000')
        cy.get('#cwu-opportunity-skills').contains('Agile').should('have.text', 'Agile')
        cy.get('a').contains('Next').click()

        // 2. Description tab
        cy.get('#cwu-opportunity-description').should('have.value','Opp description')
        cy.get('a').contains('Next').click()

        // 3. Details tab
        cy.get('#cwu-opportunity-proposal-deadline').should('have.value','2030-01-15')
        cy.get('#cwu-opportunity-assignment-date').should('have.value','2030-01-31')
        cy.get('#cwu-opportunity-start-date').should('have.value','2030-02-15')
        cy.get('#cwu-opportunity-completion-date').should('have.value','2030-02-28')
        cy.get('#cwu-opportunity-submission-info').should('have.value','github repo')
        cy.get('#cwu-opportunity-acceptance-criteria').should('have.value','Some acceptance criteria')
        cy.get('#cwu-opportunity-evaluation-criteria').should('have.value','Some evaluation criteria')
        cy.get('a').contains('Next').click()

        // 4. Attachments tab
        cy.get('[type=text]').should('have.value','Screenshot.png')

    })




});
