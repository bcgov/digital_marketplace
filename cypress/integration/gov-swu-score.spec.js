/// <reference types="cypress" />

describe('As a user authenticated via GitHub',  function() {
    beforeEach(function() {
        cy.sqlFixture('dbReset.sql')
        cy.login('admin')
        cy.sqlFixture('organizations.sql')
        cy.sqlFixture('swuOpportunityPublished.sql')
        cy.sqlFixture('swuProposals.sql')
        cy.sqlFixture('closeAdminSWUOpportunity.sql')

    })

    it('scores a SWU opp', function() {
        cy.visit('/dashboard')
        cy.contains('SWU created by admin').should('be.visible')
        cy.contains('SWU created by admin').click()

        // Score Team Questions
        cy.get('a[href*="tab=teamQuestions"]').first().click()
        cy.contains('Proponent 1').should('be.visible').click()
        cy.contains('Enter Score').should('be.visible').click() //why won't 'a' pick it up?
        cy.get('#swu-proposal-question-score-0').type('10')
        cy.get('a').contains('Submit Score').click()
        cy.get('a').contains('Screen In').click()
        cy.get('a').contains('Back to Opportunity').click()

        cy.contains('Proponent 2').should('be.visible').click()
        cy.contains('Enter Score').should('be.visible').click()
        cy.get('#swu-proposal-question-score-0').type('2')
        cy.get('a').contains('Submit Score').click()
        cy.get('a').contains('Screen In').click()
        cy.get('a').contains('Back to Opportunity').click()
        cy.get('a').contains('Complete Team Questions').click()
        cy.get('div[class*="modal-footer"]').children().contains('Complete Team Questions').click();

        //Score Code Challenge
        cy.get('a[href*="tab=codeChallenge"]').first().click()
        cy.contains('Test Organization 1').should('be.visible').click()
        cy.contains('Enter Score').should('be.visible').click()
        cy.get('#swu-proposal-code-challenge-score').type('100')
        cy.get('a').contains('Submit Score').click()
        cy.get('a').contains('Screen In').click()
        cy.get('a').contains('Back to Opportunity').click()
        cy.get('div[class*="toast-header"]').children('svg').click({ multiple: true, force: true }) // clear all toasts (they pile up and cover the whole right side of the window)
        cy.contains('Test Organization 2').should('be.visible').click()
        cy.contains('Enter Score').should('be.visible').click()
        cy.get('#swu-proposal-code-challenge-score').type('20')
        cy.get('a').contains('Submit Score').click()
        cy.get('a').contains('Screen In').click()
        cy.get('a').contains('Back to Opportunity').click()
        cy.get('a').contains('Complete Code Challenge').click()
        cy.get('div[class*="modal-footer"]').children().contains('Complete Code Challenge').click();


        //Score Team Scenario
        cy.get('a[href*="tab=teamScenario"]').first().click()
        cy.get('div[class*="toast-header"]').children('svg').click({ multiple: true, force: true })
        cy.contains('Test Organization 1').should('be.visible').click()
        cy.contains('Enter Score').should('exist').click()
        cy.get('#swu-proposal-team-scenario-score').type('100')
        cy.get('a').contains('Submit Score').click()
        cy.get('a').contains('Back to Opportunity').click()
        cy.get('div[class*="toast-header"]').children('svg').click({ multiple: true, force: true })
        cy.contains('Test Organization 2').should('be.visible').click()
        cy.contains('Enter Score').should('be.visible').click()
        cy.get('#swu-proposal-team-scenario-score').type('20')
        cy.get('a').contains('Submit Score').click()
        cy.get('a').contains('Back to Opportunity').click()
        cy.get('div[class*="toast-header"]').children('svg').click({ multiple: true, force: true })

        // Confirm all scores entered correctly
        cy.get('a[href*="tab=proposals"]').first().click()
        cy.get('tr').eq(1).children('td').eq(0).children().contains('Test Organization 1')
        //check table rows
        // cy.get('span[class=" text-capitalize text-nowrap badge badge-primary"]').eq(0).should('have.text','Evaluated (TS)')
        // cy.get('tr').eq(1).children('td').eq(3).children('div').should('have.text','100.00%')
        // cy.get('tr').eq(1).children('td').eq(4).children('div').should('have.text','100.00%')
        // cy.get('tr').eq(1).children('td').eq(5).children('div').should('have.text','100.00%')
        // cy.get('tr').eq(1).children('td').eq(6).children('div').should('have.text','100.00%')
        // cy.get('tr').eq(1).children('td').eq(7).children('div').should('have.text','100.00%')

        // cy.get('a').contains('Award').trigger()
        cy.get('div[class="table-show-on-hover"]').children('a').contains('Award').click({force:true}) //forcing because it requires hover
        cy.get('div[class*="modal-footer"]').children().contains('Award Opportunity').click();
        //check table rows for correct status

        //Login in as both vendors and check for awarded/not awarded


    })
});
