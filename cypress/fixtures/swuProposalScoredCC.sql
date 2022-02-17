\i /workspace/cypress/fixtures/swuProposalScoredTQ.sql

--score proposal #1
update "swuProposals" set "challengeScore"=100 where "id"='cf9bf170-02bb-4ea7-8932-65fef16d0a6d';

--score proposal #2
update "swuProposals" set "challengeScore"=20 where "id"='cf9bf170-02bb-4ea7-8932-65fef16d0a6e';

-- update scoring status for proposal #1

INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('80ffa12f-a47b-48b5-92bb-9acd2ffebf31', '2022-02-17 16:39:47.361+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', null, 'CHALLENGE_SCORE_ENTERED', 'A code challenge score of "100" was entered.');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('79159a69-2805-4dc3-9d78-62d5ecf79bee', '2022-02-17 16:39:47.364+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'EVALUATED_CODE_CHALLENGE', null, '');
-- comment out below line to screen out
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('f8c5384a-2066-424d-bdbe-44737716519d', '2022-02-17 16:39:49.011+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'UNDER_REVIEW_TEAM_SCENARIO', null, '');

-- update scoring status for proposal #2
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('d144d1dc-4045-442f-be83-fda8a8c89629', '2022-02-17 16:39:56.793+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', null, 'CHALLENGE_SCORE_ENTERED', 'A code challenge score of "20" was entered.');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('e02eed84-35f4-4a05-a2a8-1164b67bc7db', '2022-02-17 16:39:56.795+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', 'EVALUATED_CODE_CHALLENGE', null, '');
-- comment out below line to screen out
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('6c7b998f-e148-4b06-8eab-eb3ddfd2f8d0', '2022-02-17 16:39:58.685+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', 'UNDER_REVIEW_TEAM_SCENARIO', null, '');

-- update opp status
INSERT INTO "swuOpportunityStatuses" (id, "createdAt", "createdBy", opportunity, status, event, note) VALUES('81ca2a80-72f7-4c97-9720-7120f28c2393', '2022-02-17 16:40:10.142+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'fce9016d-89c9-435b-9e47-c9fcb3f6f84d', 'EVAL_SCENARIO', null, '');
