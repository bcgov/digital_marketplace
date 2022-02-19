-- set SWU proposal closing date to the past
UPDATE "swuOpportunityVersions" set "proposalDeadline"='2022-02-18 12:17:17.72+00' where "opportunity"='593f191a-8c7d-4a3b-92e2-4703a80f4f05';

--add opp status
INSERT INTO "swuOpportunityStatuses" VALUES('9de528da-fb11-414e-916c-f3bbd123e48c', '2022-02-18 22:19:51.395+00', null, '593f191a-8c7d-4a3b-92e2-4703a80f4f05', 'EVAL_QUESTIONS', null, 'This opportunity has closed.'); --when I set this manually, it never seems to change

--add proposal statuses

INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('d4d70018-3485-4555-9bcc-a97251c48968', '2022-02-18 22:43:09.66+00', null, '7a6dce2b-8344-41aa-a429-43e80758aef1', 'UNDER_REVIEW_QUESTIONS', null, '');
INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('6bab1408-cfca-4883-ab1d-ea7e17384fb5', '2022-02-18 22:43:09.66+00', null, '7a6dce2b-8344-41aa-a429-43e80758aef2', 'UNDER_REVIEW_QUESTIONS', null, '');


--generate anonymous name

UPDATE "swuProposals" set "anonymousProponentName"='Proponent 1' where "id"='7a6dce2b-8344-41aa-a429-43e80758aef1';
UPDATE "swuProposals" set "anonymousProponentName"='Proponent 2' where "id"='7a6dce2b-8344-41aa-a429-43e80758aef2';
