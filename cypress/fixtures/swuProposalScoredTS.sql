\i /workspace/cypress/fixtures/swuProposalScoredTQ.sql

-- brianna--confirm this is when price score is set

--score proposal #1
update "swuProposals" set "scenarioScore"=100 where "id"='cf9bf170-02bb-4ea7-8932-65fef16d0a6d';
update "swuProposals" set "priceScore"=100 where "id"='cf9bf170-02bb-4ea7-8932-65fef16d0a6d';

--score proposal #2
update "swuProposals" set "scenarioScore"=20 where "id"='cf9bf170-02bb-4ea7-8932-65fef16d0a6e';
update "swuProposals" set "priceScore"=50 where "id"='cf9bf170-02bb-4ea7-8932-65fef16d0a6e';

-- update scoring status for proposal #1


INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('b815abd4-194d-48f4-932c-ee0655f3d1d8', '2022-02-17 21:13:56.526+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', null, 'SCENARIO_SCORE_ENTERED', 'A team scenario score of "100" was entered.');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('97bfe673-abbf-4777-b512-561be782403f', '2022-02-17 21:13:56.53+00', null, 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', null, 'PRICE_SCORE_ENTERED', 'A price score of "100" was calculated.');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('54a7cddc-c0c8-45b5-89ba-9f862f725ee2', '2022-02-17 21:13:56.531+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'EVALUATED_TEAM_SCENARIO', null, '');

-- update scoring status for proposal #2
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('5662c11c-e97b-4a30-b98c-b112bef79171', '2022-02-17 21:14:02.075+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', null, 'SCENARIO_SCORE_ENTERED', 'A team scenario score of "20" was entered.');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('03e521c2-e45d-4517-90f8-bf4493c3979d', '2022-02-17 21:14:02.08+00', null, 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', null, 'PRICE_SCORE_ENTERED', 'A price score of "50" was calculated.');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('03ffa031-e910-408f-8211-95cfebde3b13', '2022-02-17 21:14:02.08+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', 'EVALUATED_TEAM_SCENARIO', null, '');


-- update opp status

INSERT INTO "swuOpportunityStatuses" (id, "createdAt", "createdBy", opportunity, status, event, note) VALUES('81ca2a80-72f7-4c97-9720-7120f28c2393', '2022-02-17 16:40:10.142+00', '39b86e99-9a39-49ae-8962-c7d815e56125', 'fce9016d-89c9-435b-9e47-c9fcb3f6f84d', 'EVAL_SCENARIO', null,'');
