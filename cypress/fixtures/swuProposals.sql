-- create proposal 1
INSERT INTO "swuProposals" (id, "createdAt", "createdBy", "updatedAt", "updatedBy", "challengeScore", "scenarioScore", "priceScore", opportunity, organization, "anonymousProponentName") VALUES('7a6dce2b-8344-41aa-a429-43e80758aef1', '2022-02-18 18:59:35.676+00', '06172f56-f08c-4380-86db-603bec98a8c4', '2022-02-18 18:59:35.676+00', '06172f56-f08c-4380-86db-603bec98a8c4', null, null, null, '593f191a-8c7d-4a3b-92e2-4703a80f4f05', '0e593592-4df5-412c-bd68-cc7718e3bc74','');


INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('2da3af93-46ae-4749-948b-1e85f3c21189', '7a6dce2b-8344-41aa-a429-43e80758aef1', 'INCEPTION', '100000');
INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('7e27666c-1362-4aeb-91c5-421e73075d0a', '7a6dce2b-8344-41aa-a429-43e80758aef1', 'PROTOTYPE', '100000');
INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('6fb5b831-7f56-4da4-8ea6-b39cd3dc4de1', '7a6dce2b-8344-41aa-a429-43e80758aef1', 'IMPLEMENTATION', '10000');


INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('7a6dce2b-8344-41aa-a429-43e80758aef1', '0', 'Ref 1', 'Company 1', '111111111', 'one@email.com');
INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('7a6dce2b-8344-41aa-a429-43e80758aef1', '1', 'Ref 2', 'Company 2', '222222222', 'two@email.com');
INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('7a6dce2b-8344-41aa-a429-43e80758aef1', '2', 'Ref 3', 'Company 3', '333333333', 'three@email.co');


INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('952d886e-f03d-46cd-a863-03e412bda7be', '2022-02-18 18:59:35.676+00', '06172f56-f08c-4380-86db-603bec98a8c4', '7a6dce2b-8344-41aa-a429-43e80758aef1', 'SUBMITTED', null,'');


INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c4', '2da3af93-46ae-4749-948b-1e85f3c21189', 't');
INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c5', '7e27666c-1362-4aeb-91c5-421e73075d0a', 't');
INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c6', '6fb5b831-7f56-4da4-8ea6-b39cd3dc4de1', 't');



INSERT INTO "swuTeamQuestionResponses" (proposal, "order", response, score) VALUES('7a6dce2b-8344-41aa-a429-43e80758aef1', '0', 'Answering question 1',null);



--create proposal 2
INSERT INTO "swuProposals" (id, "createdAt", "createdBy", "updatedAt", "updatedBy", "challengeScore", "scenarioScore", "priceScore", opportunity, organization, "anonymousProponentName") VALUES('7a6dce2b-8344-41aa-a429-43e80758aef2', '2022-02-18 18:59:35.676+00', '06172f56-f08c-4380-86db-603bec98a8c7', '2022-02-18 18:59:35.676+00', '06172f56-f08c-4380-86db-603bec98a8c7', null, null, null, '593f191a-8c7d-4a3b-92e2-4703a80f4f05', '0e593592-4df5-412c-bd68-cc7718e3bc75','');


INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('2da3af93-46ae-4749-948b-1e85f3c21180', '7a6dce2b-8344-41aa-a429-43e80758aef2', 'INCEPTION', '200000');
INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('7e27666c-1362-4aeb-91c5-421e73075d0b', '7a6dce2b-8344-41aa-a429-43e80758aef2', 'PROTOTYPE', '200000');
INSERT INTO "swuProposalPhases" (id, proposal, phase, "proposedCost") VALUES('6fb5b831-7f56-4da4-8ea6-b39cd3dc4de2', '7a6dce2b-8344-41aa-a429-43e80758aef2', 'IMPLEMENTATION', '20000');


INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('7a6dce2b-8344-41aa-a429-43e80758aef2', '0', 'Ref 1', 'Company 1', '111111111', 'one@email.com');
INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('7a6dce2b-8344-41aa-a429-43e80758aef2', '1', 'Ref 2', 'Company 2', '222222222', 'two@email.com');
INSERT INTO "swuProposalReferences" (proposal, "order", name, company, phone, email) VALUES('7a6dce2b-8344-41aa-a429-43e80758aef2', '2', 'Ref 3', 'Company 3', '333333333', 'three@email.co');


INSERT INTO "swuProposalStatuses" (id, "createdAt", "createdBy", proposal, status, event, note) VALUES('952d886e-f03d-46cd-a863-03e412bda7bf', '2022-02-18 18:59:35.676+00', '06172f56-f08c-4380-86db-603bec98a8c7', '7a6dce2b-8344-41aa-a429-43e80758aef2', 'SUBMITTED', null,'');


INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c7', '2da3af93-46ae-4749-948b-1e85f3c21180', 't');
INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c5', '7e27666c-1362-4aeb-91c5-421e73075d0b', 't');
INSERT INTO "swuProposalTeamMembers" (member, phase, "scrumMaster") VALUES('06172f56-f08c-4380-86db-603bec98a8c6', '6fb5b831-7f56-4da4-8ea6-b39cd3dc4de2', 't');



INSERT INTO "swuTeamQuestionResponses" (proposal, "order", response, score) VALUES('7a6dce2b-8344-41aa-a429-43e80758aef2', '0', 'Answering question 1',null);
