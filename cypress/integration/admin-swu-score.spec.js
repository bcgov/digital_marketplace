/// <reference types="cypress" />

describe('As an administrator authenticated via IDIR',  function() {
    beforeEach(function() {
        cy.sqlFixture('dbReset.sql')
        cy.sqlFixture('users.sql')
        cy.idirLogin('admin')
        cy.sqlFixture('organizations.sql')
        cy.sqlFixture('swuOpportunityPublished.sql')
        cy.sqlFixture('swuProposals.sql')
        cy.sqlFixture('closeAdminSWUOpportunity.sql')
    })

    it('advances proponents 1 and 2 through all evaluations and awards opportunity to proponent 1', function() {
        cy.visit('/dashboard')
        cy.contains('SWU created by admin').should('be.visible')
        cy.contains('SWU created by admin').click()

        // Score Team Questions
        cy.get('a[href*="tab=teamQuestions"]').first().click()
        cy.scoreTeamQuestions('Proponent 1','9')
        cy.scoreTeamQuestions('Proponent 2','5')
        cy.evaluateStage('Team Questions')


        //Score Code Challenge
        cy.get('a[href*="tab=codeChallenge"]').first().click()
        cy.scoreCodeChallenge('Test Organization 1','91')
        cy.scoreCodeChallenge('Test Organization 2','51')
        cy.evaluateStage('Code Challenge')

        //Score Team Scenario
        cy.get('a[href*="tab=teamScenario"]').first().click()
        cy.scoreTeamScenario('Test Organization 1','92')
        cy.scoreTeamScenario('Test Organization 2','52')


        // Confirm all scores entered correctly
        cy.get('a[href*="tab=proposals"]').first().click()
        cy.checkEvalTableRow('Test Organization 1','Evaluated (TS)','90.00%','91.00%','92.00%','100.00%','94.60%')
        cy.checkEvalTableRow('Test Organization 2','Evaluated (TS)','50.00%','51.00%','52.00%','50.00%','50.60%')


        // Award opportunity
        cy.get('div[class="table-show-on-hover"]').children('a').contains('Award').click({force:true}) //forcing because it requires hover
        cy.get('div[class*="modal-footer"]').children().contains('Award Opportunity').click();
        cy.contains('Sprint With Us opportunity has been awarded.').should('be.visible');
        cy.get('span[class*="badge"]').contains('Awarded').should('be.visible')

        //check table rows for correct status and badges
        cy.checkEvalTableRow('Test Organization 1','Awarded','90.00%','91.00%','92.00%','100.00%','94.60%')
        cy.checkEvalTableRow('Test Organization 2','Not Awarded','50.00%','51.00%','52.00%','50.00%','50.60%')

        //Login in as vendors and check for correct proposal statuses and badges
        cy.vendorLogin(1)
        cy.get('#user-sign-up-step-two-terms').check()
        cy.get('a').contains('Complete Profile').click()
        cy.get('span[class=" text-capitalize text-nowrap badge badge-success"]').contains('Awarded').should('be.visible')

        cy.vendorLogin(4)
        cy.get('#user-sign-up-step-two-terms').check()
        cy.get('a').contains('Complete Profile').click()
        cy.get('span[class*="badge"]').contains('Not Awarded').should('be.visible')


    })
    it('screens out proponent 1 at the team questions stage, advances proponent 2 through all evaluations, and awards opportunity to proponent 2', function() {
        // cy.pause()
        cy.visit('/dashboard')
        cy.contains('SWU created by admin').should('be.visible')
        cy.contains('SWU created by admin').click()

        // Score Team Questions
        cy.get('a[href*="tab=teamQuestions"]').first().click()
        cy.scoreTeamQuestions('Proponent 1','1')
        cy.scoreTeamQuestions('Proponent 2','8')
        cy.contains('Proponent 1').parents('td').next().next().next().contains('Screen Out').click({force:true}) //forcing because it requires hover
        cy.evaluateStage('Team Questions')


        //Score Code Challenge
        cy.get('a[href*="tab=codeChallenge"]').first().click()
        cy.scoreCodeChallenge('Test Organization 2','81')
        cy.evaluateStage('Code Challenge')

        //Score Team Scenario
        cy.get('a[href*="tab=teamScenario"]').first().click()
        cy.scoreTeamScenario('Test Organization 2','82')


        // Confirm all scores entered correctly
        cy.get('a[href*="tab=proposals"]').first().click()
        cy.checkEvalTableRow('Test Organization 1','Evaluated (TQ)','10.00%','—','—','—','—')
        cy.checkEvalTableRow('Test Organization 2','Evaluated (TS)','80.00%','81.00%','82.00%','100.00%','88.60%')

        // Award opportunity
        cy.get('div[class="table-show-on-hover"]').children('a').contains('Award').click({force:true}) //forcing because it requires hover
        cy.get('div[class*="modal-footer"]').children().contains('Award Opportunity').click();
        cy.contains('Sprint With Us opportunity has been awarded.').should('be.visible');
        cy.get('span[class*="badge"]').contains('Awarded').should('be.visible')

        //check table rows for correct status and badges
        cy.checkEvalTableRow('Test Organization 1','Not Awarded','10.00%','—','—','—','—')
        cy.checkEvalTableRow('Test Organization 2','Awarded','80.00%','81.00%','82.00%','100.00%','88.60%')

        //Login in as proponent 1 and confirm proposal not awarded
        cy.vendorLogin(1)
        cy.get('#user-sign-up-step-two-terms').check()
        cy.get('a').contains('Complete Profile').click()
        cy.get('span[class*="badge"]').contains('Not Awarded').should('be.visible')
        cy.vendorLogin(4)
        cy.get('#user-sign-up-step-two-terms').check()
        cy.get('a').contains('Complete Profile').click()
        cy.get('span[class*="badge"]').contains('Awarded').should('be.visible')


    })
    it('screens out proponent 1 at the code challenge stage, advances proponent 2 through all evaluations, and awards opportunity to proponent 2', function() {
        cy.visit('/dashboard')
        cy.contains('SWU created by admin').should('be.visible')
        cy.contains('SWU created by admin').click()

        // Score Team Questions
        cy.get('a[href*="tab=teamQuestions"]').first().click()
        cy.scoreTeamQuestions('Proponent 1','3')
        cy.scoreTeamQuestions('Proponent 2','6')
        cy.evaluateStage('Team Questions')


        //Score Code Challenge
        cy.get('a[href*="tab=codeChallenge"]').first().click()
        cy.scoreCodeChallenge('Test Organization 1','31')
        cy.scoreCodeChallenge('Test Organization 2','61')
        cy.contains('Proponent 1').parents('td').next().next().next().contains('Screen Out').click({force:true})
        cy.evaluateStage('Code Challenge')

        //Score Team Scenario
        cy.get('a[href*="tab=teamScenario"]').first().click()
        cy.scoreTeamScenario('Test Organization 2','62')


        // Confirm all scores entered correctly
        cy.get('a[href*="tab=proposals"]').first().click()
        cy.checkEvalTableRow('Test Organization 1','Evaluated (CC)','30.00%','31.00%','—','—','—')
        cy.checkEvalTableRow('Test Organization 2','Evaluated (TS)','60.00%','61.00%','62.00%','100.00%','76.60%')

        // Award opportunity
        cy.get('div[class="table-show-on-hover"]').children('a').contains('Award').click({force:true}) //forcing because it requires hover
        cy.get('div[class*="modal-footer"]').children().contains('Award Opportunity').click();
        cy.contains('Sprint With Us opportunity has been awarded.').should('be.visible');
        cy.get('span[class*="badge"]').contains('Awarded').should('be.visible')

        //check table rows for correct status and badges
        cy.checkEvalTableRow('Test Organization 1','Not Awarded','30.00%','31.00%','—','—','—')
        cy.checkEvalTableRow('Test Organization 2','Awarded','60.00%','61.00%','62.00%','100.00%','76.60%')

        //Login in as proponent 1 and confirm proposal not awarded
        cy.vendorLogin(1)
        cy.get('#user-sign-up-step-two-terms').check()
        cy.get('a').contains('Complete Profile').click()
        cy.get('span[class*="badge"]').contains('Not Awarded').should('be.visible')
        cy.vendorLogin(4)
        cy.get('#user-sign-up-step-two-terms').check()
        cy.get('a').contains('Complete Profile').click()
        cy.get('span[class*="badge"]').contains('Awarded').should('be.visible')


    })
});
