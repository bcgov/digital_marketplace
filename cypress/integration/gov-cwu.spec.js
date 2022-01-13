/// <reference types="cypress" />

describe('As a user authenticated via IDIR', function() {
    beforeEach(function() {
        // cy.sqlFixture('dbReset.sql')
        cy.sqlFixture('users.sql')
        cy.visit('/auth/createsession')
        Cypress.Cookies.preserveOnce("sid")
        cy.getCookie('sid').should('exist');
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
        cy.get('#cwu-opportunity-skills').click()
        cy.contains('Agile').click({force: true})
        cy.contains('Next').click()

        // 2. Description tab
        cy.get('#cwu-opportunity-description').type('Opp description')
        cy.contains('Next').click()

        // 3. Details tab
        cy.get('#cwu-opportunity-proposal-deadline').type('2030-01-15')
        cy.get('#cwu-opportunity-assignment-date').type('2030-01-31')
        cy.get('#cwu-opportunity-start-date').type('2030-02-15')
        cy.get('#cwu-opportunity-completion-date').type('2030-02-28')
        cy.get('#cwu-opportunity-submission-info').type('github repo')
        cy.get('#cwu-opportunity-acceptance-criteria').type('Some acceptance criteria')
        cy.get('#cwu-opportunity-evaluation-criteria').type('Some evaluation criteria')
        cy.contains('Next').click()

        // 4. Attachments tab
        const fixtureFile = 'Screenshot.png';
        cy.get('[type=file]').attachFile(fixtureFile);

        // Publish
        cy.contains('Publish').click();
        cy.contains('Publish Opportunity').click();
        cy.contains('Code With Us opportunity has been published.').should('exist');
        cy.get('span[class*="badge-success"]').should('exist')


        // Confirm form saved
        cy.visit("/dashboard")
        cy.contains('Cypress Opp').click()
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
        cy.contains('Next').click()

        // 2. Description tab
        cy.get('#cwu-opportunity-description').should('have.value','Opp description')
        cy.contains('Next').click()

        // 3. Details tab
        cy.get('#cwu-opportunity-proposal-deadline').should('have.value','2030-01-15')
        cy.get('#cwu-opportunity-assignment-date').should('have.value','2030-01-31')
        cy.get('#cwu-opportunity-start-date').should('have.value','2030-02-15')
        cy.get('#cwu-opportunity-completion-date').should('have.value','2030-02-28')
        cy.get('#cwu-opportunity-submission-info').should('have.value','github repo')
        cy.get('#cwu-opportunity-acceptance-criteria').should('have.value','Some acceptance criteria')
        cy.get('#cwu-opportunity-evaluation-criteria').should('have.value','Some evaluation criteria')
        cy.contains('Next').click()

        // 4. Attachments tab
        cy.get('[type=text]').should('have.value','Screenshot.png')

    })


    it.skip('update an existing CWU opportunity', function() {
        cy.sqlFixture('cwuOpportunity.sql')
        cy.visit("/dashboard")
        cy.contains('Fixture CWU Opportunity Title').click()
        cy.get('a[href*="tab=opportunity"]').first().click()
        cy.contains('Actions').click()
        cy.contains('Edit').click()

        // Make updates

        // 1. Overview tab
        cy.get('#cwu-opportunity-title').clear().type('new title')
        cy.get('#cwu-opportunity-teaser').clear().type('new teaser')
        cy.get('#cwu-opportunity-remote-ok-1').check({force:true})
        cy.get('#cwu-opportunity-location').clear().type('new location')
        cy.get('#cwu-opportunity-reward').clear().type('567')
        cy.get('#cwu-opportunity-skills').click()
        cy.contains('Angular').click({force: true})
        cy.contains('Next').click()


        // 2. Description tab
        cy.get('#cwu-opportunity-description').clear().type('new desc')
        cy.contains('Next').click()

        // 3. Details tab
        cy.get('#cwu-opportunity-proposal-deadline').clear().type('2029-01-15')
        cy.get('#cwu-opportunity-assignment-date').clear().type('2029-01-31')
        cy.get('#cwu-opportunity-start-date').clear().type('2029-02-15')
        cy.get('#cwu-opportunity-completion-date').clear().type('2029-02-28')
        cy.get('#cwu-opportunity-submission-info').clear().type('new repo')
        cy.get('#cwu-opportunity-acceptance-criteria').clear().type('new criteria')
        cy.get('#cwu-opportunity-evaluation-criteria').clear().type('new criteria')
        cy.contains('Next').click()

        // 4. Attachments tab
        cy.get('path[d="M32 464a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128H32zm272-256a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zM432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"]').click({force: true})

        // Publish changes
        cy.contains('Publish Changes').click();
        cy.get('div[class*="modal-footer"]').children().contains('Publish Changes').click();
        cy.contains('Your changes to this Code With Us opportunity have been published.').should('exist');
        cy.get('span[class*="badge-success"]').should('exist')

        // Confirm updates saved
        cy.visit("/dashboard")
        cy.contains('new title').click()
        cy.get('a[href*="tab=opportunity"]').first().click()


        // 1. Overview tab
        cy.get('#cwu-opportunity-title').should('have.value', 'new title')
        cy.get('#cwu-opportunity-teaser').should('have.value','new teaser')
        cy.get('#cwu-opportunity-remote-ok-1').should('be.checked')
        cy.get('#cwu-opportunity-remote-ok-0').should('not.be.checked')
        cy.get('#cwu-opportunity-location').should('have.value','new location')
        cy.get('#cwu-opportunity-reward').should('have.value','567')
        cy.get('#cwu-opportunity-skills').contains('Agile').should('have.text', 'Agile')
        cy.get('#cwu-opportunity-skills').contains('Angular').should('have.text', 'Angular')
        cy.contains('Next').click()

        // 2. Description tab
        cy.get('#cwu-opportunity-description').should('have.value','new desc')
        cy.contains('Next').click()

        // 3. Details tab
        cy.get('#cwu-opportunity-proposal-deadline').should('have.value','2029-01-15')
        cy.get('#cwu-opportunity-assignment-date').should('have.value','2029-01-31')
        cy.get('#cwu-opportunity-start-date').should('have.value','2029-02-15')
        cy.get('#cwu-opportunity-completion-date').should('have.value','2029-02-28')
        cy.get('#cwu-opportunity-submission-info').should('have.value','new repo')
        cy.get('#cwu-opportunity-acceptance-criteria').should('have.value','new criteria')
        cy.get('#cwu-opportunity-evaluation-criteria').should('have.value','new criteria')
        cy.contains('Next').click()

        // 4. Attachments tab
        cy.get('[type=text]').should('not.exist')

    })

    it('suspend an existing CWU opportunity', function() {
        cy.sqlFixture('cwuOpportunity.sql')
        cy.visit("/dashboard")
        cy.contains('Fixture CWU Opportunity Title').click()
        cy.get('a[href*="tab=opportunity"]').first().click()
        cy.contains('Actions').click()
        cy.contains('Suspend').click()
        cy.get('div[class*="modal-footer"]').children().contains('Suspend Opportunity').click();
        cy.contains('Code With Us opportunity has been suspended.').should('exist');
        cy.get('span[class*="badge"]').should('have.value', 'Suspended')
    })

    it('archive an existing CWU opportunity', function() {
        cy.sqlFixture('cwuOpportunity.sql')
        cy.visit("/dashboard")
        cy.contains('Fixture CWU Opportunity Title').click()
        cy.get('a[href*="tab=opportunity"]').first().click()
        cy.contains('Actions').click()
        cy.contains('Cancel').click()
        cy.get('div[class*="modal-footer"]').children().contains('Cancel Opportunity').click();
        cy.contains('Code With Us opportunity has been cancelled.').should('exist');
        cy.get('span[class*="badge"]').should('have.value', 'Cancelled')
    })

});
