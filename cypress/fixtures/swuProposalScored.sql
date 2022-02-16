\i /workspace/cypress/fixtures/swuProposalUnscored.sql
update "swuProposals" set "challengeScore"=100;
update "swuProposals" set "scenarioScore"=100;
update "swuProposals" set "priceScore"=100;

update "swuTeamQuestionResponses" set "score"=10;
\.


INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('121e5c4a-b335-4e9e-bfaa-d5c9030e7eda', '2022-02-16 19:12:03.769+00', null, 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'UNDER_REVIEW_QUESTIONS', null, '')
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('01a933b0-bfa3-4af8-ab83-d7ff0b1309ea', '2022-02-16 19:12:26.591+00', '39b86e99-9a39-49ae-8962-c7d815e56129', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', null, 'QUESTIONS_SCORE_ENTERED', 'Team question scores were entered. Q1: 10.')
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('0afe3774-877d-4579-b908-c43b09b295e4', '2022-02-16 19:12:26.594+00', '39b86e99-9a39-49ae-8962-c7d815e56129', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'EVALUATED_QUESTIONS', null, '')
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('c5011274-9a0b-4a23-98d2-b4c56350676f', '2022-02-16 19:12:35.091+00', '39b86e99-9a39-49ae-8962-c7d815e56129', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'UNDER_REVIEW_CODE_CHALLENGE', null, '')
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('b3ff6ee7-e5cc-46bd-bc5d-095d71152414', '2022-02-16 19:19:49.701+00', '39b86e99-9a39-49ae-8962-c7d815e56129', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', null, 'CHALLENGE_SCORE_ENTERED', 'A code challenge score of "100" was entered.')
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('93088ead-3768-492e-8d0d-f60f8994bcd0', '2022-02-16 19:19:49.704+00', '39b86e99-9a39-49ae-8962-c7d815e56129', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'EVALUATED_CODE_CHALLENGE', null, '')
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('32b669dc-3aee-4e70-93f7-02fc821a61c5', '2022-02-16 19:19:51.916+00', '39b86e99-9a39-49ae-8962-c7d815e56129', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'UNDER_REVIEW_TEAM_SCENARIO', null, '')
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('410f8041-473f-4782-9560-014ffa3200e4', '2022-02-16 19:20:40.44+00', '39b86e99-9a39-49ae-8962-c7d815e56129', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', null, 'SCENARIO_SCORE_ENTERED', 'A team scenario score of "100" was entered.')
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('8acba535-3e44-48bc-bd5c-60849f7743c7', '2022-02-16 19:20:40.445+00', null, 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', null, 'PRICE_SCORE_ENTERED', 'A price score of "100" was calculated.')
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('03f91f07-5e77-498d-96cf-7cc12f408379', '2022-02-16 19:20:40.445+00', '39b86e99-9a39-49ae-8962-c7d815e56129', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'EVALUATED_TEAM_SCENARIO', null, '')
\.
