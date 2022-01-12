INSERT into cwuOpportunities (id, "createdAt", "createdBy")
VALUES ('3e14eab3-a4e2-4995-bc20-9a53db135365', '2022-01-11 22:55:43.525+00', '39b86e99-9a39-49ae-8962-c7d815e56125')

INSERT into cwuOpportunityVersions (id, "createdAt", "createdBy", opportunity, title, teaser, "remoteOk", "remoteDesc", location, reward, skills, description, "proposalDeadline", "assignmentDate", "startDate", "completionDate", "submissionInfo", "acceptanceCriteria", "evaluationCriteria")
VALUES (65a37eea-c925-482e-9869-baaf33b452a3, 2022-01-11 22:55:43.525+00, 39b86e99-9a39-49ae-8962-c7d815e56125, 3e14eab3-a4e2-4995-bc20-9a53db135365, Cypress Opp, Teaser text, t, Remote description text, Vancouver, 5000, {Agile}, Opp description, 2030-01-16 00:00:00+00, 2030-02-01 00:00:00+00, 2030-02-16 00:00:00+00, 2030-03-01 00:00:00+00, github repo, Some acceptance criteria, Some evaluation criteria)

INSERT into cwuOpportunityAttachments ("opportunityVersion", file)
VALUES (65a37eea-c925-482e-9869-baaf33b452a3, a2665bfa-9e7c-4a7b-92ea-66758e782160)

INSERT into cwuOpportunityStatuses (id, "createdAt", "createdBy", opportunity, status, note, event)
VALUES (7d914068-04a7-4165-bf1e-7bd29af3358e, 2022-01-11 22:55:43.525+00, 39b86e99-9a39-49ae-8962-c7d815e56125, 3e14eab3-a4e2-4995-bc20-9a53db135365, DRAFT, \N)
