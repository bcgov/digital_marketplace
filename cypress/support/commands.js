// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import 'cypress-file-upload';
import '@testing-library/cypress/add-commands';

Cypress.Commands.add('sqlFixture',(sqlFilename)=>{
    cy.exec(`docker exec dm_db psql -v "ON_ERROR_STOP=1" -U digitalmarketplace digitalmarketplace -f /workspace/cypress/fixtures/${sqlFilename}`) //need /workspace/ because that's the file structure in the db container
})

Cypress.Commands.add('idirLogin',(role)=>{
    cy.visit(`/auth/createsession${role}`)
    Cypress.Cookies.preserveOnce("sid")
})

// id must be a number from 1-6 (6 vendors in fixtures)
Cypress.Commands.add('vendorLogin',(id)=>{
    cy.visit(`/auth/createsessionvendor/${id}`)
    Cypress.Cookies.preserveOnce("sid")
})

Cypress.Commands.add('scoreTeamQuestions',(proponent, score)=>{

        cy.contains(proponent).should('be.visible').click()
        cy.contains('Enter Score').should('be.visible').click()
        cy.get('#swu-proposal-question-score-0').type(score)
        cy.get('a').contains('Submit Score').click()
        cy.get('a').contains('Screen In').click()
        cy.get('a').contains('Back to Opportunity').click()
})

Cypress.Commands.add('scoreCodeChallenge',(proponent, score)=>{

    cy.contains(proponent).should('be.visible')
    cy.wait(1000)
    cy.contains(proponent).click()
    cy.contains('Enter Score').should('be.visible').click()
    cy.get('#swu-proposal-code-challenge-score').type(score)
    cy.get('a').contains('Submit Score').click()
    cy.get('a').contains('Screen In').click()
    cy.get('a').contains('Back to Opportunity').click()
    cy.get('div[class*="toast-header"]').children('svg').click({ multiple: true, force: true }) // clear toasts (they pile up and cover the whole right side of the window)
})

Cypress.Commands.add('scoreTeamScenario',(proponent, score)=>{
    cy.contains(proponent).should('be.visible')
    cy.wait(1000)
    cy.contains(proponent).click()
    cy.contains('Enter Score').should('exist').click()
    cy.get('#swu-proposal-team-scenario-score').type(score)
    cy.get('a').contains('Submit Score').click()
    cy.get('a').contains('Back to Opportunity').click()
    cy.get('div[class*="toast-header"]').children('svg').click({ multiple: true, force: true }) //clear toasts

})

Cypress.Commands.add('evaluateStage',(evaluationStage)=>{
    cy.get('a').contains(`Complete ${evaluationStage}`).click()
        cy.get('div[class*="modal-footer"]').children().contains(`Complete ${evaluationStage}`).click();

})

Cypress.Commands.add('checkEvalTableRow',(proponent, evalStage, tqScore, ccScore, tsScore, priceScore, total)=>{
    //check table headers
    cy.get('h4').should('have.text','Proposals').should('be.visible')
    cy.contains('Proponent')
        .next('th').contains('Status')
        .next().contains('TQ')
        .next().contains('CC')
        .next().contains('TS')
        .next().contains('Price')
        .next().contains('Total')

    //check tables contains correct values
    cy.contains(proponent).parents('td').next().contains(evalStage)
        .parents('td').next().contains(tqScore)
        .parents('td').next().contains(ccScore)
        .parents('td').next().contains(tsScore)
        .parents('td').next().contains(priceScore)
        .parents('td').next().contains(total)

})
