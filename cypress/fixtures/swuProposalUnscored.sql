-- Proposal #1

INSERT INTO "swuProposals" (id, "createdAt", "createdBy", "updatedAt", "updatedBy", "challengeScore", "scenarioScore", "priceScore", opportunity, organization, "anonymousProponentName") VALUES('cf9bf170-02bb-4ea7-8932-65fef16d0a6d', '2022-02-16 17:57:06.723+00', '06172f56-f08c-4380-86db-603bec98a8c4', '2022-02-16 17:57:06.723+00', '06172f56-f08c-4380-86db-603bec98a8c4', null, null, null, 'fce9016d-89c9-435b-9e47-c9fcb3f6f84d', '0e593592-4df5-412c-bd68-cc7718e3bc74', '');

INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('9300060f-45ef-468d-a683-491654b5302e', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'INCEPTION', '100000');
INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('60909eeb-a6f0-490c-8e91-98846b28bab9', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'PROTOTYPE', '100000');
INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('8ba93179-e407-4829-81fd-9e9614f93ea8', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'IMPLEMENTATION', '100000');

INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('cf9bf170-02bb-4ea7-8932-65fef16d0a6d', '0', 'Ref 1', 'Company 1A', '111111111', 'one@fake.com');
INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('cf9bf170-02bb-4ea7-8932-65fef16d0a6d', '1', 'Ref 2', 'Company 1B', '222222222', 'two@fake.com');
INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('cf9bf170-02bb-4ea7-8932-65fef16d0a6d', '2', 'Ref 3', 'Company 1C', '333333333', 'three@fake.com');

INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('553eab44-f293-47ea-9843-c381de864873', '2022-02-16 17:57:06.723+00', '06172f56-f08c-4380-86db-603bec98a8c4', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6d', 'SUBMITTED', null, '');


-- brianna--this doesn't seem to be working
INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c5', '9300060f-45ef-468d-a683-491654b5302e', 't');
INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c5', '60909eeb-a6f0-490c-8e91-98846b28bab9', 't');
INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c5', '8ba93179-e407-4829-81fd-9e9614f93ea8', 't');

INSERT INTO "swuTeamQuestionResponses" (proposal, "order", response, score) VALUES('cf9bf170-02bb-4ea7-8932-65fef16d0a6d', '0', 'Response', null);

-- INSERT INTO "viewCounters" (name, count) VALUES('opportunity.sprint-with-us.fce9016d-89c9-435b-9e47-c9fcb3f6f84d.views', '1');

-- Proposal #2--brianna--make another org for this one

INSERT INTO "swuProposals" (id, "createdAt", "createdBy", "updatedAt", "updatedBy", "challengeScore", "scenarioScore", "priceScore", opportunity, organization, "anonymousProponentName") VALUES('cf9bf170-02bb-4ea7-8932-65fef16d0a6e', '2022-02-16 17:57:06.723+00', '06172f56-f08c-4380-86db-603bec98a8c4', '2022-02-16 17:57:06.723+00', '06172f56-f08c-4380-86db-603bec98a8c4', null, null, null, 'fce9016d-89c9-435b-9e47-c9fcb3f6f84d', '0e593592-4df5-412c-bd68-cc7718e3bc75', '');

INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('9300060f-45ef-468d-a683-491654b5302f', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', 'INCEPTION', '200000');
INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('60909eeb-a6f0-490c-8e91-98846b28bab0', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', 'PROTOTYPE', '200000');
INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('8ba93179-e407-4829-81fd-9e9614f93ea9', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', 'IMPLEMENTATION', '200000');

INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('cf9bf170-02bb-4ea7-8932-65fef16d0a6e', '0', 'Ref 1', 'Company 2A', '111111111', 'one@fake.com');
INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('cf9bf170-02bb-4ea7-8932-65fef16d0a6e', '1', 'Ref 2', 'Company 2B', '222222222', 'two@fake.com');
INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('cf9bf170-02bb-4ea7-8932-65fef16d0a6e', '2', 'Ref 3', 'Company 2C', '333333333', 'three@fake.com');

INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('553eab44-f293-47ea-9843-c381de864874', '2022-02-16 17:57:06.723+00', '06172f56-f08c-4380-86db-603bec98a8c4', 'cf9bf170-02bb-4ea7-8932-65fef16d0a6e', 'SUBMITTED', null, '');

INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c6', '9300060f-45ef-468d-a683-491654b5302f', 't');
INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c6', '60909eeb-a6f0-490c-8e91-98846b28bab0', 't');
INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c6', '8ba93179-e407-4829-81fd-9e9614f93ea9', 't');

INSERT INTO "swuTeamQuestionResponses" (proposal, "order", response, score) VALUES('cf9bf170-02bb-4ea7-8932-65fef16d0a6e', '0', 'Response', null);

-- INSERT INTO "viewCounters" (name, count) VALUES('opportunity.sprint-with-us.fce9016d-89c9-435b-9e47-c9fcb3f6f84d.views', '1');
