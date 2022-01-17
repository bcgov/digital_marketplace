/// <reference types="cypress" />

describe('As a user authenticated via IDIR', function() {
    beforeEach(function() {
        cy.sqlFixture('dbReset.sql')
        cy.login()
        cy.sqlFixture('swuOpportunity.sql')
    })

    it('update an existing SWU opportunity', function() {
        cy.visit("/dashboard")
        cy.contains('Fixture SWU Opportunity Title').click()
        cy.get('a[href*="tab=opportunity"]').first().click()
        cy.contains('Edit').click()

        // Make updates


        // 1. Overview tab
        cy.get('#swu-opportunity-title').clear().type('new title')
        cy.get('#swu-opportunity-teaser').clear().type('new teaser')
        cy.get('#swu-opportunity-remote-ok-1').check({force:true})
        cy.get('#swu-opportunity-location').clear().type('new location')
        cy.get('#swu-opportunity-proposal-deadline').clear().type('2029-01-15')
        cy.get('#swu-opportunity-assignment-date').clear().type('2029-01-31')
        cy.get('#swu-opportunity-total-max-budget').clear().type('2000000')
        cy.get('#swu-opportunity-min-team-members').clear().type('5')
        cy.get('path[d="M207.6 256l107.72-107.72c6.23-6.23 6.23-16.34 0-22.58l-25.03-25.03c-6.23-6.23-16.34-6.23-22.58 0L160 208.4 52.28 100.68c-6.23-6.23-16.34-6.23-22.58 0L4.68 125.7c-6.23 6.23-6.23 16.34 0 22.58L112.4 256 4.68 363.72c-6.23 6.23-6.23 16.34 0 22.58l25.03 25.03c6.23 6.23 16.34 6.23 22.58 0L160 303.6l107.72 107.72c6.23 6.23 16.34 6.23 22.58 0l25.03-25.03c6.23-6.23 6.23-16.34 0-22.58L207.6 256z"]').first().click()
        cy.get('#swu-opportunity-mandatory-skills').type('HTML{enter}')
        cy.get('#swu-opportunity-mandatory-skills').type('Java{enter}')
        cy.get('#swu-opportunity-optional-skills').type('VueJS{enter}')
        cy.get('a').contains('Next').click()


        // 2. Description tab
        cy.get('#swu-opportunity-description').clear()
        cy.get('#swu-opportunity-description').should('be.empty')
        cy.get('#swu-opportunity-description').type('new desc')
        cy.contains('Next').click()

        // 3. Phases tab
        cy.get('#swu-opportunity-starting-phase').click()
        cy.get('#swu-opportunity-starting-phase').type('Proof of Concept{enter}')
        // eslint-disable-next-line
        cy.wait(1000) // Without this, something in the app resets the state and closes the drop-down, so can't fill out the fields

        cy.get('div[class="h3 mb-0"]').contains('Proof of Concept').click()
        cy.contains("During the Proof of Concept phase").should('be.visible')
        cy.get('[id*=start-date]').eq(0).clear().type('2029-02-01')
        cy.get('[id*=completion-date]').eq(0).clear().type('2029-02-15')
        cy.get('[id*=max-budget]').eq(0).clear().type('400000')
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('Backend Development').click()
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('Technical Architecture').click()
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('Agile Coaching').click()
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('User Experience Design').click()
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('Backend Development').click()

        cy.get('div[class="h3 mb-0"]').contains('Implementation').click()
        cy.contains("As you reach the Implementation phase").should('be.visible')
        cy.get('[id*=start-date]').eq(1).clear().type('2029-02-16')
        cy.get('[id*=completion-date]').eq(1).clear().type('2029-02-28')
        cy.get('[id*=max-budget]').eq(1).clear().type('1000000')
        cy.get('div[class="pt-2 pb-4 "]').contains('DevOps Engineering').click()

        cy.get('a').contains('Next').click()

        // 4. Team questions
        cy.get('[id*=team-questions-question]').clear().type('new question')
        cy.get('[id*="team-questions-response-guidelines"]').clear().type('new response')
        cy.get('[id*="team-questions-word-limit"]').clear().type('1000')
        cy.get('[id*="team-questions-score"]').clear().type('20')
        cy.get('a').contains('Next').click()

        // 5. Scoring
        cy.get('#swu-opportunity-questions-weight').clear().type('10')
        cy.get('#swu-opportunity-code-challenge-weight').clear().type('10')
        cy.get('#swu-opportunity-scenario-weight').clear().type('10')
        cy.get('#swu-opportunity-price-weight').clear().type('70')
        cy.get('a').contains('Next').click()

        // 6. Attachments
        cy.get('path[d="M32 464a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128H32zm272-256a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zM432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"]').click({force: true})

        // Submit changes
        cy.contains('Submit Changes').click();
        cy.get('div[class*="modal-footer"]').children().contains('Submit Changes').click();
        cy.contains('Your changes to this Sprint With Us opportunity have been saved.').should('exist');
        cy.contains('Under Review').should('exist')



        // Confirm updates saved
        cy.visit("/dashboard")
        cy.contains('new title').click()
        cy.get('a[href*="tab=opportunity"]').first().click()


        // 1. Overview tab
        cy.get('#swu-opportunity-title').should('have.value','new title')

        cy.get('#swu-opportunity-teaser').should('have.value','new teaser')
        cy.get('#swu-opportunity-remote-ok-1').should('be.checked')
        cy.get('#swu-opportunity-remote-ok-0').should('not.be.checked')
        cy.get('#swu-opportunity-location').should('have.value','new location')
        cy.get('#swu-opportunity-proposal-deadline').should('have.value','2029-01-15')
        cy.get('#swu-opportunity-assignment-date').should('have.value','2029-01-31')
        cy.get('#swu-opportunity-total-max-budget').should('have.value','2000000')
        cy.get('#swu-opportunity-min-team-members').should('have.value','5')
        cy.get('#swu-opportunity-mandatory-skills').contains('HTML').should('have.text', 'HTML')
        cy.get('#swu-opportunity-mandatory-skills').contains('Java').should('have.text', 'Java')
        cy.get('#swu-opportunity-optional-skills').contains('VueJS').should('have.text', 'VueJS')
        cy.get('a').contains('Next').click()

        // 2. Description tab
        cy.get('#swu-opportunity-description').should('have.value','new desc')
        cy.get('a').contains('Next').click()

        // 3. Phases tab
        cy.get('#swu-opportunity-starting-phase').should('have.text','Proof of Concept')
        // eslint-disable-next-line
        cy.get('div[class="h3 mb-0"]').contains('Proof of Concept').click()
        cy.contains("During the Proof of Concept phase").should('be.visible')
        cy.get('[id*=start-date]').eq(0).should('have.value','2029-03-01')
        cy.get('[id*=completion-date]').eq(0).should('have.value','2029-03-31')
        cy.get('[id*=max-budget]').eq(0).should('have.value','400000')
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('Agile Coaching').should('include.text','Agile Coaching')
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('User Experience Design').should('include.text','User Experience Design')

        cy.get('div[class="h3 mb-0"]').contains('Implementation').click()
        cy.contains("As you reach the Implementation phase").should('be.visible')
        cy.get('[id*=start-date]').eq(1).should('have.value','2029-04-01')
        cy.get('[id*=completion-date]').eq(1).should('have.value','2029-04-30')
        cy.get('[id*=max-budget]').eq(1).should('have.value','1000000')
        cy.get('div[class="pt-2 pb-4 "]').contains('DevOps Engineering').should('include.text','DevOps Engineering')

        cy.get('a').contains('Next').click()

        // 4. Team questions
        cy.get('[id*=team-questions-question]').should('have.value','new question') // would need to change this selector if entering multiple questions
        cy.get('[id*="team-questions-response-guidelines"]').should('have.value','new response')
        cy.get('[id*="team-questions-word-limit"]').should('have.value','1000')
        cy.get('[id*="team-questions-score"]').should('have.value','20')
        cy.get('a').contains('Next').click()

        // 5. Scoring
        cy.get('#swu-opportunity-questions-weight').should('have.value','10')
        cy.get('#swu-opportunity-code-challenge-weight').should('have.value','10')
        cy.get('#swu-opportunity-scenario-weight').should('have.value','10')
        cy.get('#swu-opportunity-price-weight').should('have.value','70')
        cy.get('a').contains('Next').click()

        // 6. Attachments
        cy.get('[type=text]').should('not.exist')
    })
});
