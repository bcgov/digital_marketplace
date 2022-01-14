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
    cy.exec(`docker exec dm_db psql -U digitalmarketplace digitalmarketplace -f /workspace/cypress/fixtures/${sqlFilename}`) //need /workspace/ because that's the file structure in the db container
})

Cypress.Commands.add('login',()=>{
    cy.sqlFixture('users.sql')
    cy.visit('/auth/createsession')
    Cypress.Cookies.preserveOnce("sid")
})
