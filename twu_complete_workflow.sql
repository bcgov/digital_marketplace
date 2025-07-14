-- Complete TWU Workflow Script with Chair Consensus Evaluations
-- This script creates a TWU opportunity and moves it through the full evaluation workflow

-- Clean up any existing test data (optional)
-- DELETE FROM "twuOpportunities" WHERE title LIKE 'Test TWU Opportunity%';

-- CREATE OPPORTUNITY
INSERT INTO "twuOpportunities" (id, "createdAt", "createdBy")
VALUES (
  gen_random_uuid(),
  NOW(),
  (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1)
)
RETURNING id;

-- opportunity: 6a3ded1c-ae64-4ebd-96f3-8c4c6034c5b9
-- version: 7c37a0d1-85cc-4e0a-af1b-4037792ca755
-- resource: cf391516-fc29-4ab4-843c-63a26be58b87

-- CREATE OPPORTUNITY VERSION
INSERT INTO "twuOpportunityVersions" (
  id, "createdAt", "createdBy", opportunity, title, teaser, "remoteOk",
  "remoteDesc", "location", "maxBudget", description, "proposalDeadline",
  "assignmentDate", "questionsWeight", "challengeWeight", "priceWeight",
  "startDate", "completionDate"
)
VALUES (
  gen_random_uuid(),
  NOW(),
  (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
  '6a3ded1c-ae64-4ebd-96f3-8c4c6034c5b9',
  'Test TWU Opportunity - Full Workflow',
  'This is a comprehensive test TWU opportunity for workflow testing',
  true,
  'This work can be done remotely with some on-site requirements',
  'Victoria, BC',
  150000,
  'This is a detailed description of the team-based work to be done. Multiple resources needed.',
  NOW() - INTERVAL '1 hour',
  NOW() + INTERVAL '45 days',
  40,
  30,
  30,
  NOW() + INTERVAL '60 days',
  NOW() + INTERVAL '120 days'
)
RETURNING id, opportunity;

-- CREATE RESOURCE
INSERT INTO "twuResources" (
  id, "serviceArea", "opportunityVersion", "targetAllocation",
  "mandatorySkills", "optionalSkills", "order"
)
VALUES (
  gen_random_uuid(),
  1,
  '7c37a0d1-85cc-4e0a-af1b-4037792ca755',
  100,
  ARRAY['TypeScript', 'React', 'Node.js'],
  ARRAY['Python', 'Docker', 'AWS'],
  0
)
RETURNING id, "opportunityVersion";

-- CREATE RESOURCE QUESTIONS
INSERT INTO "twuResourceQuestions" (
  "opportunityVersion", question, guideline, score, "wordLimit",
  "order", "createdAt", "createdBy", "minimumScore"
)
VALUES (
  '7c37a0d1-85cc-4e0a-af1b-4037792ca755',
  'Describe your team''s experience with similar projects',
  'Please provide specific examples of past work and outcomes',
  10,
  500,
  0,
  NOW(),
  (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
  7
);

INSERT INTO "twuResourceQuestions" (
  "opportunityVersion", question, guideline, score, "wordLimit",
  "order", "createdAt", "createdBy", "minimumScore"
)
VALUES (
  '7c37a0d1-85cc-4e0a-af1b-4037792ca755',
  'What is your approach to project management and collaboration?',
  'Detail your methodology and tools for team coordination',
  10,
  400,
  1,
  NOW(),
  (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
  7
);

-- CREATE EVALUATION PANEL
INSERT INTO "twuEvaluationPanelMembers" (
  "opportunityVersion", "user", chair, evaluator, "order"
)
VALUES (
  '7c37a0d1-85cc-4e0a-af1b-4037792ca755',
  (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
  true,
  false,
  0
);

INSERT INTO "twuEvaluationPanelMembers" (
  "opportunityVersion", "user", chair, evaluator, "order"
)
VALUES (
  '7c37a0d1-85cc-4e0a-af1b-4037792ca755',
  (SELECT id FROM users WHERE type = 'GOV' AND email != 'alex.struk@gov.bc.ca' LIMIT 1),
  false,
  true,
  1
);

-- CREATE DRAFT STATUS
INSERT INTO "twuOpportunityStatuses" (
  id, "createdAt", "createdBy", opportunity, status, note
)
VALUES (
  gen_random_uuid(),
  NOW(),
  (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
  '6a3ded1c-ae64-4ebd-96f3-8c4c6034c5b9',
  'DRAFT',
  'Initial TWU opportunity creation'
);

-- PUBLISH OPPORTUNITY
INSERT INTO "twuOpportunityStatuses" (
  id, "createdAt", "createdBy", opportunity, status, note
)
VALUES (
  gen_random_uuid(),
  NOW() + INTERVAL '1 second',
  (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
  '6a3ded1c-ae64-4ebd-96f3-8c4c6034c5b9',
  'PUBLISHED',
  'TWU opportunity published and accepting proposals'
);

-- CREATE PROPOSAL 1
INSERT INTO "twuProposals" (
  id, "createdAt", "createdBy", "updatedAt", "updatedBy",
  opportunity, organization, "anonymousProponentName"
)
VALUES (
  gen_random_uuid(),
  NOW() + INTERVAL '2 seconds',
  (SELECT id FROM users WHERE type = 'VENDOR' LIMIT 1),
  NOW() + INTERVAL '2 seconds',
  (SELECT id FROM users WHERE type = 'VENDOR' LIMIT 1),
  '6a3ded1c-ae64-4ebd-96f3-8c4c6034c5b9',
  (SELECT id FROM organizations WHERE active = true LIMIT 1),
  'Test Vendor Team A'
)
RETURNING id, opportunity;

-- PROPOSAL 1 MEMBER
INSERT INTO "twuProposalMember" (
  member, proposal, "hourlyRate", resource
)
VALUES (
  (SELECT id FROM users WHERE type = 'VENDOR' LIMIT 1),
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  85.50,
  'cf391516-fc29-4ab4-843c-63a26be58b87'
);

-- RESOURCE QUESTION RESPONSES FOR PROPOSAL 1
INSERT INTO "twuResourceQuestionResponses" (
  proposal, "order", response
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  0,
  'Our team has 5+ years of experience building similar applications using React and TypeScript. We delivered 3 major projects for government clients with 98% uptime.'
);

INSERT INTO "twuResourceQuestionResponses" (
  proposal, "order", response
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  1,
  'We use Agile methodology with 2-week sprints, daily standups, and comprehensive documentation. Our tools include Jira, Confluence, and Slack for coordination.'
);

-- DRAFT PROPOSAL 1 STATUS
INSERT INTO "twuProposalStatuses" (
  id, "createdAt", "createdBy", proposal, status, note
)
VALUES (
  gen_random_uuid(),
  NOW() + INTERVAL '3 seconds',
  (SELECT id FROM users WHERE type = 'VENDOR' LIMIT 1),
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  'DRAFT',
  'Initial proposal creation'
);

-- SUBMIT PROPOSAL 1
INSERT INTO "twuProposalStatuses" (
  id, "createdAt", "createdBy", proposal, status, note
)
VALUES (
  gen_random_uuid(),
  NOW() + INTERVAL '4 seconds',
  (SELECT id FROM users WHERE type = 'VENDOR' LIMIT 1),
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  'SUBMITTED',
  'Proposal submitted for evaluation'
);

-- CREATE PROPOSAL 2
INSERT INTO "twuProposals" (
  id, "createdAt", "createdBy", "updatedAt", "updatedBy",
  opportunity, organization, "anonymousProponentName"
)
VALUES (
  gen_random_uuid(),
  NOW() + INTERVAL '5 seconds',
  (SELECT id FROM users WHERE type = 'VENDOR' OFFSET 1 LIMIT 1),
  NOW() + INTERVAL '5 seconds',
  (SELECT id FROM users WHERE type = 'VENDOR' OFFSET 1 LIMIT 1),
  '6a3ded1c-ae64-4ebd-96f3-8c4c6034c5b9',
  (SELECT id FROM organizations WHERE active = true OFFSET 1 LIMIT 1),
  'Test Vendor Team B'
)
RETURNING id, opportunity;

-- PROPOSAL 2 MEMBER
INSERT INTO "twuProposalMember" (
  member, proposal, "hourlyRate", resource
)
VALUES (
  (SELECT id FROM users WHERE type = 'VENDOR' OFFSET 1 LIMIT 1),
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  85.50,
  'cf391516-fc29-4ab4-843c-63a26be58b87'
);

-- RESOURCE QUESTION RESPONSES FOR PROPOSAL 2
INSERT INTO "twuResourceQuestionResponses" (
  proposal, "order", response
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  0,
  'Our team specializes in full-stack development with 8+ years of experience. We have successfully delivered 12 enterprise applications with cutting-edge technologies.'
);

INSERT INTO "twuResourceQuestionResponses" (
  proposal, "order", response
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  1,
  'We follow Scrum methodology with certified Scrum Master. We use Azure DevOps for project management and maintain 99.5% on-time delivery rate.'
);

-- DRAFT PROPOSAL 2 STATUS
INSERT INTO "twuProposalStatuses" (
  id, "createdAt", "createdBy", proposal, status, note
)
VALUES (
  gen_random_uuid(),
  NOW() + INTERVAL '6 seconds',
  (SELECT id FROM users WHERE type = 'VENDOR' OFFSET 1 LIMIT 1),
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  'DRAFT',
  'Initial proposal creation'
);

-- SUBMIT PROPOSAL 2
INSERT INTO "twuProposalStatuses" (
  id, "createdAt", "createdBy", proposal, status, note
)
VALUES (
  gen_random_uuid(),
  NOW() + INTERVAL '7 seconds',
  (SELECT id FROM users WHERE type = 'VENDOR' OFFSET 1 LIMIT 1),
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  'SUBMITTED',
  'Proposal submitted for evaluation'
);

-- MOVE OPPORTUNITY TO INDIVIDUAL EVALUATION STATUS
INSERT INTO "twuOpportunityStatuses" (
  id, "createdAt", "createdBy", opportunity, status, note
)
VALUES (
  gen_random_uuid(),
  NOW() + INTERVAL '8 seconds',
  (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
  '6a3ded1c-ae64-4ebd-96f3-8c4c6034c5b9',
  'EVAL_QUESTIONS_INDIVIDUAL',
  'Individual evaluation phase started'
);

-- CREATE INDIVIDUAL EVALUATIONS (EVALUATOR TABLE)

-- Evaluator evaluations for Proposal 1
INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  0,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND evaluator = true LIMIT 1),
  NOW() + INTERVAL '9 seconds',
  NOW() + INTERVAL '9 seconds',
  8.5,
  'Strong experience demonstrated with good examples'
);

INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  1,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND evaluator = true LIMIT 1),
  NOW() + INTERVAL '9 seconds',
  NOW() + INTERVAL '9 seconds',
  7.5,
  'Good methodology, could be more detailed'
);

-- Chair evaluations for Proposal 1
INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  0,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true),
  NOW() + INTERVAL '9 seconds',
  NOW() + INTERVAL '9 seconds',
  8.0,
  'Solid experience, well documented'
);

INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  1,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true),
  NOW() + INTERVAL '9 seconds',
  NOW() + INTERVAL '9 seconds',
  7.0,
  'Adequate approach, meets requirements'
);

-- Evaluator evaluations for Proposal 2
INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  0,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND evaluator = true LIMIT 1),
  NOW() + INTERVAL '9 seconds',
  NOW() + INTERVAL '9 seconds',
  9.0,
  'Exceptional experience and track record'
);

INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  1,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND evaluator = true LIMIT 1),
  NOW() + INTERVAL '9 seconds',
  NOW() + INTERVAL '9 seconds',
  8.5,
  'Excellent methodology and proven delivery'
);

-- Chair evaluations for Proposal 2
INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  0,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true),
  NOW() + INTERVAL '9 seconds',
  NOW() + INTERVAL '9 seconds',
  8.5,
  'Outstanding experience and capabilities'
);

INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  1,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true),
  NOW() + INTERVAL '9 seconds',
  NOW() + INTERVAL '9 seconds',
  8.0,
  'Strong methodology with excellent tools'
);

-- SUBMIT INDIVIDUAL EVALUATIONS (EVALUATOR STATUS TABLE)

-- Evaluator submits scores for Proposal 1
INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluationStatuses" (
  proposal, "evaluationPanelMember", status, note, "createdAt"
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND evaluator = true LIMIT 1),
  'SUBMITTED',
  'Individual evaluation completed',
  NOW() + INTERVAL '10 seconds'
);

-- Evaluator submits scores for Proposal 2
INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluationStatuses" (
  proposal, "evaluationPanelMember", status, note, "createdAt"
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND evaluator = true LIMIT 1),
  'SUBMITTED',
  'Individual evaluation completed',
  NOW() + INTERVAL '10 seconds'
);

-- Chair submits individual evaluations for Proposal 1
INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluationStatuses" (
  proposal, "evaluationPanelMember", status, note, "createdAt"
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true LIMIT 1),
  'SUBMITTED',
  'Individual evaluation completed',
  NOW() + INTERVAL '10 seconds'
);

-- Chair submits individual evaluations for Proposal 2
INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluationStatuses" (
  proposal, "evaluationPanelMember", status, note, "createdAt"
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true LIMIT 1),
  'SUBMITTED',
  'Individual evaluation completed',
  NOW() + INTERVAL '10 seconds'
);

-- MOVE OPPORTUNITY TO CONSENSUS STATUS
INSERT INTO "twuOpportunityStatuses" (
  id, "createdAt", "createdBy", opportunity, status, note
)
VALUES (
  gen_random_uuid(),
  NOW() + INTERVAL '11 seconds',
  (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
  '6a3ded1c-ae64-4ebd-96f3-8c4c6034c5b9',
  'EVAL_QUESTIONS_CONSENSUS',
  'Consensus evaluation phase started'
);

-- *** CRITICAL: CREATE CHAIR CONSENSUS EVALUATIONS ***
-- This is what was missing from your original script!
-- The consensus page loads data from the CHAIR evaluation tables

-- Chair consensus evaluations for Proposal 1
INSERT INTO "twuResourceQuestionResponseChairEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  0,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true),
  NOW() + INTERVAL '12 seconds',
  NOW() + INTERVAL '12 seconds',
  8.0,
  'Consensus: Strong experience with good documentation'
);

INSERT INTO "twuResourceQuestionResponseChairEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  1,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true),
  NOW() + INTERVAL '12 seconds',
  NOW() + INTERVAL '12 seconds',
  7.5,
  'Consensus: Good methodology, adequate for requirements'
);

-- Chair consensus evaluations for Proposal 2
INSERT INTO "twuResourceQuestionResponseChairEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  0,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true),
  NOW() + INTERVAL '12 seconds',
  NOW() + INTERVAL '12 seconds',
  8.5,
  'Consensus: Exceptional experience and strong capabilities'
);

INSERT INTO "twuResourceQuestionResponseChairEvaluations" (
  proposal, "questionOrder", "evaluationPanelMember", "createdAt",
  "updatedAt", score, notes
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  1,
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true),
  NOW() + INTERVAL '12 seconds',
  NOW() + INTERVAL '12 seconds',
  8.0,
  'Consensus: Excellent methodology with proven delivery record'
);

-- CREATE CHAIR CONSENSUS EVALUATION STATUSES (DRAFT STATE)
-- These are needed for the consensus page to work properly

INSERT INTO "twuResourceQuestionResponseChairEvaluationStatuses" (
  proposal, "evaluationPanelMember", status, note, "createdAt"
)
VALUES (
  '44502bf2-2738-4ce7-ba09-a4c82c63b9e4',
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true),
  'DRAFT',
  'Consensus evaluation in progress',
  NOW() + INTERVAL '12 seconds'
);

INSERT INTO "twuResourceQuestionResponseChairEvaluationStatuses" (
  proposal, "evaluationPanelMember", status, note, "createdAt"
)
VALUES (
  'd5fcfa20-e774-412f-a50f-4683bba3f2cc',
  (SELECT "user" FROM "twuEvaluationPanelMembers" WHERE "opportunityVersion" = '7c37a0d1-85cc-4e0a-af1b-4037792ca755' AND chair = true),
  'DRAFT',
  'Consensus evaluation in progress',
  NOW() + INTERVAL '12 seconds'
);

-- VERIFICATION QUERIES
SELECT
  'TWU Opportunity Setup Complete' as message,
  o.id as opportunity_id,
  o.status as current_status,
  COUNT(DISTINCT p.id) as proposal_count,
  COUNT(DISTINCT ie.proposal) as individual_evaluations,
  COUNT(DISTINCT ce.proposal) as consensus_evaluations
FROM "twuOpportunities" opp
JOIN "twuOpportunityStatuses" o ON o.opportunity = opp.id
JOIN "twuProposals" p ON p.opportunity = opp.id
LEFT JOIN "twuResourceQuestionResponseEvaluatorEvaluations" ie ON ie.proposal = p.id
LEFT JOIN "twuResourceQuestionResponseChairEvaluations" ce ON ce.proposal = p.id
WHERE opp.id = '6a3ded1c-ae64-4ebd-96f3-8c4c6034c5b9'
  AND o."createdAt" = (
    SELECT MAX("createdAt")
    FROM "twuOpportunityStatuses"
    WHERE opportunity = opp.id
  )
GROUP BY o.id, o.status;

-- Check that both evaluation types exist
SELECT
  'Evaluation Summary' as type,
  COUNT(*) as count
FROM "twuResourceQuestionResponseEvaluatorEvaluations"
WHERE proposal IN ('44502bf2-2738-4ce7-ba09-a4c82c63b9e4', 'd5fcfa20-e774-412f-a50f-4683bba3f2cc')

UNION ALL

SELECT
  'Consensus Summary' as type,
  COUNT(*) as count
FROM "twuResourceQuestionResponseChairEvaluations"
WHERE proposal IN ('44502bf2-2738-4ce7-ba09-a4c82c63b9e4', 'd5fcfa20-e774-412f-a50f-4683bba3f2cc');
