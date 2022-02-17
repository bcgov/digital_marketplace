\i /workspace/cypress/fixtures/swuProposalUnscored.sql

-- score questions for proposal #1
update "swuTeamQuestionResponses" set "score"=10 where "proposal"='cf9bf170-02bb-4ea7-8932-65fef16d0a6d';
-- score questions for proposal #2
update "swuTeamQuestionResponses" set "score"=2 where "proposal"='cf9bf170-02bb-4ea7-8932-65fef16d0a6e';

-- update scoring status for proposal #1
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('826c64dd-6aa5-4195-96e3-fc67b139fad2', '2022-02-16 19:58:28.377+00', null, 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'UNDER_REVIEW_QUESTIONS', null, '');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('d9cfa3c8-6b79-409d-8191-529f8288e908', '2022-02-16 19:59:30.951+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', null, 'QUESTIONS_SCORE_ENTERED', 'Team question scores were entered. Q1: 10.');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('593fc295-020a-4b0b-a9c5-309c70e7731a', '2022-02-16 19:59:30.954+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'EVALUATED_QUESTIONS', null, '');
-- comment out below line to screen out
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('392bcc59-c4fa-4c80-906c-892e8fa77857', '2022-02-16 19:59:49.943+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'UNDER_REVIEW_CODE_CHALLENGE', null, '');

-- update scoring status for proposal #2
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('7d25f30e-c5a1-4901-9ecd-b8c66c34b4bf', '2022-02-16 19:58:28.377+00', null, 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', 'UNDER_REVIEW_QUESTIONS', null, '');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('f0c70fee-6aa9-411a-86a2-635d533387eb', '2022-02-16 19:59:42.274+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', null, 'QUESTIONS_SCORE_ENTERED', 'Team question scores were entered. Q1: 10.');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('465067a8-daee-4616-8cc2-54271869b09f', '2022-02-16 19:59:42.277+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', 'EVALUATED_QUESTIONS', null, '');
-- comment out below line to screen out
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('769f31ae-3207-4596-9a78-395f0a18468a', '2022-02-16 19:59:44.416+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', 'UNDER_REVIEW_CODE_CHALLENGE', null, '');

-- update opp status
INSERT INTO "swuOpportunityStatuses" (id, "createdAt", "createdBy", opportunity, status, event, note) VALUES('f6fcf231-f30a-4c05-961b-bcf714a8805b', '2022-02-17 16:11:36.724+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'fce9016d-89c9-435b-9e47-c9fcb3f6f84d', 'EVAL_CC', null,'');
