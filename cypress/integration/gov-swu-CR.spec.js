/// <reference types="cypress" />

describe('As a user authenticated via IDIR', function() {
    beforeEach(function() {
        cy.sqlFixture('dbReset.sql')
        cy.sqlFixture('users.sql')
        cy.visit('/auth/createsession')
        Cypress.Cookies.preserveOnce("sid")
        cy.getCookie('sid').should('exist');
    })

    it('create, publish, and read new CWU opportunity', function() {
        cy.visit("/opportunities/create")
        cy.get('a[href="/opportunities/sprint-with-us/create"]').should('be.visible')
        cy.get('a[href="/opportunities/sprint-with-us/create"]').click()

        // Fill out form

        // 1. Overview tab
        cy.get('#swu-opportunity-title').should('be.visible').type('SWU cy title')
        cy.get('#swu-opportunity-teaser').type('SWU cy teaser')
        cy.get('#swu-opportunity-remote-ok-0').check({force:true})
        cy.get('#swu-opportunity-remote-desc').type('SWU cy remote desc')
        cy.get('#swu-opportunity-location').clear().type('Sechelt')
        cy.get('#swu-opportunity-proposal-deadline').clear().type('2030-01-15')
        cy.get('#swu-opportunity-assignment-date').clear().type('2031-01-15')
        cy.get('#swu-opportunity-total-max-budget').clear().type('1000000')
        cy.get('#swu-opportunity-min-team-members').clear().type('2')
        cy.get('#swu-opportunity-mandatory-skills').click()
        cy.contains('Agile').click({force: true})
        cy.get('#swu-opportunity-optional-skills').click()
        cy.contains('Back-End Development').click({force: true})
        cy.contains('Next').click()

        // 2. Description tab
        cy.get('#swu-opportunity-description').type('SWU cy description')
        cy.contains('Next').click()

        // 3. Phases tab
        cy.get('#swu-opportunity-starting-phase').click()
        cy.contains('Inception').click({force: true})
        cy.get('#swu-opportunity-starting-phase').type('Inception{enter}')
        cy.get('div[class="h3 mb-0"]').contains('Inception').click() // either this or below works for click, but won't stay open
        // cy.get('path[d="M441.9 167.3l-19.8-19.8c-4.7-4.7-12.3-4.7-17 0L224 328.2 42.9 147.5c-4.7-4.7-12.3-4.7-17 0L6.1 167.3c-4.7 4.7-4.7 12.3 0 17l209.4 209.4c4.7 4.7 12.3 4.7 17 0l209.4-209.4c4.7-4.7 4.7-12.3 0-17z"]').first().click({force: true}) // covered by other element (svg)


        // cy.contains("During the Inception phase").should('exist')

        // cy.get('#swu-opportunity-phase-0.03365219189988733-start-date').type('2030-01-15')
        // cy.get('#swu-opportunity-phase-0.03365219189988733-completion-date').type('2030-01-31')
        // cy.contains('Delivery Management').click()
        // cy.contains('P/T').click()
        // cy.contains('User Research').click()

        cy.contains('Next').click({force: true}) //mystery one

        // 4. Team questions
        cy.contains('Add Question').click()
        cy.get('#0.5550434831506583-team-questions-question').type('SWU cy question')
        cy.get('#0.5550434831506583-team-questions-response-guidelines').type('SWU cy response')
        cy.get('#0.5550434831506583-team-questions-word-limit').clear().type('500')
        cy.get('#0.5550434831506583-team-questions-score').clear().type('10')
cy.pause()
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




});
