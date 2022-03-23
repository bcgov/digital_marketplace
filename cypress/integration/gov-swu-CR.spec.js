/// <reference types="cypress" />

describe('As a user authenticated via IDIR', function() {
    beforeEach(function() {
        cy.sqlFixture('dbReset.sql')
        cy.sqlFixture('users.sql')
        cy.idirLogin('gov')
    })

    it('create and submit SWU for review, read opportunity', function() {
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
        cy.get('#swu-opportunity-proposal-deadline').clear().type('2030-01-01')
        cy.get('#swu-opportunity-assignment-date').clear().type('2030-01-02')
        cy.get('#swu-opportunity-total-max-budget').clear().type('1000000')
        cy.get('#swu-opportunity-min-team-members').clear().type('2')
        cy.get('#swu-opportunity-mandatory-skills').type('Back-End Development{enter}')
        cy.get('#swu-opportunity-mandatory-skills').type('Front-End Development{enter}')
        cy.get('#swu-opportunity-optional-skills').type('Adobe Creative Cloud{enter}')
        cy.get('a').contains('Next').click()

        // 2. Description tab
        cy.get('#swu-opportunity-description').type('SWU cy description')
        cy.get('a').contains('Next').click()

        // 3. Phases tab
        cy.get('#swu-opportunity-starting-phase').click()
        cy.get('#swu-opportunity-starting-phase').type('Inception{enter}')
        // eslint-disable-next-line
        cy.wait(1000) // Without this, something in the app resets the state and closes the drop-down, so can't fill out the fields
        cy.get('div[class="h3 mb-0"]').contains('Inception').click()
        cy.contains("During the Inception phase").should('be.visible')


        cy.get('[id*=start-date]').eq(0).type('2030-01-03')
        cy.get('[id*=completion-date]').eq(0).type('2030-01-15')
        cy.get('[id*=max-budget]').eq(0).type('200000')
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('Delivery Management').click()
        cy.contains('P/T').click()
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('User Research').click()

        cy.get('div[class="h3 mb-0"]').contains('Proof of Concept').click()
        cy.contains("During the Proof of Concept phase").should('be.visible')
        cy.get('[id*=start-date]').eq(1).type('2030-01-17')
        cy.get('[id*=completion-date]').eq(1).type('2030-01-30')
        cy.get('[id*=max-budget]').eq(1).type('200000')
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(1).contains('Frontend Development').click()
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(1).contains('Technical Architecture').click()

        cy.get('div[class="h3 mb-0"]').contains('Implementation').click()
        cy.contains("As you reach the Implementation phase").should('be.visible')
        cy.get('[id*=start-date]').eq(2).type('2030-02-01')
        cy.get('[id*=completion-date]').eq(2).type('2030-02-15')
        cy.get('[id*=max-budget]').eq(2).type('400000')
        cy.get('div[class="pt-2 pb-4 "]').contains('Security Engineering').click()
        cy.get('div[class="pt-2 pb-4 "]').contains('Backend Development').click()

        cy.get('a').contains('Next').click()

        // 4. Team questions
        cy.contains('Add Question').click()
        cy.get('[id*=team-questions-question]').type('SWU cy question') // would need to change this selector if entering multiple questions
        cy.get('[id*="team-questions-response-guidelines"]').type('SWU cy response')
        cy.get('[id*="team-questions-word-limit"]').clear().type('600')
        cy.get('[id*="team-questions-score"]').clear().type('10')
        cy.get('a').contains('Next').click()

        // 5. Scoring
        cy.get('#swu-opportunity-questions-weight').clear().type('20')
        cy.get('#swu-opportunity-code-challenge-weight').clear().type('20')
        cy.get('#swu-opportunity-scenario-weight').clear().type('20')
        cy.get('#swu-opportunity-price-weight').clear().type('40')
        cy.get('a').contains('Next').click()

        // 6. Attachments
        const fixtureFile = 'Screenshot.png';
        cy.get('input[type=file]').attachFile(fixtureFile);

        // Submit for review
        cy.get('a').contains('Submit for Review').click()
        cy.get('div[class*="modal-footer"]').children().contains('Submit for Review').click();
        cy.contains('Sprint With Us opportunity has been submitted.').should('be.visible');
        cy.get('span[class*="badge"]').contains('Under Review').should('be.visible')



        // Confirm form saved
        cy.visit("/dashboard")
        cy.contains('SWU cy title').click()

        // Summary page

        cy.get('h4[class="mb-4"]').should('contain.text','Details')

        // History page
        cy.get('a[href*="tab=history"]').first().click()
        cy.get('h3[class="mb-4"]').should('contain.text','History')

        // Proposals page
        cy.get('a[href*="tab=proposals"]').first().click()
        cy.get('h4[class="mb-0"]').should('contain.text','Proposals')

        // Team Questions page
        cy.get('a[href*="tab=teamQuestions"]').first().click()
        cy.get('h4[class="mb-0"]').should('contain.text','Proponents')

        // Code Challenge page
        cy.get('a[href*="tab=codeChallenge"]').first().click()
        cy.get('h4[class="mb-0"]').should('contain.text','Code Challenge Participants')

        // Team scenario page
        cy.get('a[href*="tab=teamScenario"]').first().click()
        cy.get('h4[class="mb-0"]').should('contain.text','Team Scenario Participants')


        // Opportunity page
        cy.get('a[href*="tab=opportunity"]').first().click()


        // 1. Overview tab
        cy.get('#swu-opportunity-title').should('have.value','SWU cy title')

        cy.get('#swu-opportunity-teaser').should('have.value','SWU cy teaser')
        cy.get('#swu-opportunity-remote-ok-0').should('be.checked')
        cy.get('#swu-opportunity-remote-ok-1').should('not.be.checked')
        cy.get('#swu-opportunity-remote-desc').should('have.value','SWU cy remote desc')
        cy.get('#swu-opportunity-location').should('have.value','Sechelt')
        cy.get('#swu-opportunity-proposal-deadline').should('have.value','2030-01-01')
        cy.get('#swu-opportunity-assignment-date').should('have.value','2030-01-02')
        cy.get('#swu-opportunity-total-max-budget').should('have.value','1000000')
        cy.get('#swu-opportunity-min-team-members').should('have.value','2')
        cy.get('#swu-opportunity-mandatory-skills').contains('Back-End Development').should('have.text', 'Back-End Development')
        cy.get('#swu-opportunity-mandatory-skills').contains('Front-End Development').should('have.text', 'Front-End Development')
        cy.get('#swu-opportunity-optional-skills').contains('Adobe Creative Cloud').should('have.text', 'Adobe Creative Cloud')
        cy.get('a').contains('Next').click()

        // 2. Description tab
        cy.get('#swu-opportunity-description').should('have.value','SWU cy description')
        cy.get('a').contains('Next').click()

        // 3. Phases tab
        cy.get('#swu-opportunity-starting-phase').should('have.text','Inception')
        // eslint-disable-next-line
        cy.wait(1000) // Without this, something in the app resets the state and closes the drop-down, so can't fill out the fields
        cy.get('div[class="h3 mb-0"]').contains('Inception').click()
        cy.contains("During the Inception phase").should('be.visible')

        cy.get('[id*=start-date]').eq(0).should('have.value','2030-01-03')
        cy.get('[id*=completion-date]').eq(0).should('have.value','2030-01-15')
        cy.get('[id*=max-budget]').eq(0).should('have.value','200000')
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('Delivery Management').should('include.text','Delivery Management')
        cy.contains('P/T').should('have.text','P/T')
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(0).contains('User Research').should('include.text','User Research')


        cy.get('div[class="h3 mb-0"]').contains('Proof of Concept').click()
        cy.contains("During the Proof of Concept phase").should('be.visible')
        cy.get('[id*=start-date]').eq(1).should('have.value','2030-01-17')
        cy.get('[id*=completion-date]').eq(1).should('have.value','2030-01-30')
        cy.get('[id*=max-budget]').eq(1).should('have.value','200000')
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(1).contains('Frontend Development').should('include.text','Frontend Development')
        cy.get('div[class="pt-2 pb-4 mb-4"]').eq(1).contains('Technical Architecture').should('include.text','Technical Architecture')

        cy.get('div[class="h3 mb-0"]').contains('Implementation').click()
        cy.contains("As you reach the Implementation phase").should('be.visible')
        cy.get('[id*=start-date]').eq(2).should('have.value','2030-02-01')
        cy.get('[id*=completion-date]').eq(2).should('have.value','2030-02-15')
        cy.get('[id*=max-budget]').eq(2).should('have.value','400000')
        cy.get('div[class="pt-2 pb-4 "]').contains('Security Engineering').should('include.text','Security Engineering')
        cy.get('div[class="pt-2 pb-4 "]').contains('Backend Development').should('include.text','Backend Development')

        cy.get('a').contains('Next').click()

        // 4. Team questions
        cy.get('[id*=team-questions-question]').should('have.value','SWU cy question') // would need to change this selector if entering multiple questions
        cy.get('[id*="team-questions-response-guidelines"]').should('have.value','SWU cy response')
        cy.get('[id*="team-questions-word-limit"]').should('have.value','600')
        cy.get('[id*="team-questions-score"]').should('have.value','10')
        cy.get('a').contains('Next').click()

        // 5. Scoring
        cy.get('#swu-opportunity-questions-weight').should('have.value','20')
        cy.get('#swu-opportunity-code-challenge-weight').should('have.value','20')
        cy.get('#swu-opportunity-scenario-weight').should('have.value','20')
        cy.get('#swu-opportunity-price-weight').should('have.value','40')
        cy.get('a').contains('Next').click()

        // 6. Attachments
        cy.get('input[placeholder="Screenshot.png"]').should('be.visible')

    })




});
