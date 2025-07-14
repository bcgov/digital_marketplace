-- Complete TWU (Team with us) Opportunity Workflow Query
-- This creates a full TWU opportunity with evaluation panel, resources, questions, proposals, and evaluations

-- First, create the opportunity and get its ID
WITH created_opportunity AS (
  INSERT INTO "twuOpportunities" (id, "createdAt", "createdBy")
  VALUES (
    gen_random_uuid(),
    NOW(),
    (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1)
  )
  RETURNING id
),
-- Create the opportunity version
created_version AS (
  INSERT INTO "twuOpportunityVersions" (
    id, "createdAt", "createdBy", opportunity, title, teaser, "remoteOk",
    "remoteDesc", location, "maxBudget", description, "proposalDeadline",
    "assignmentDate", "questionsWeight", "challengeWeight", "priceWeight",
    "startDate", "completionDate"
  )
  SELECT
    gen_random_uuid(),
    NOW(),
    (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
    co.id,
    'Test TWU Opportunity - Full Workflow',
    'This is a comprehensive test TWU opportunity for workflow testing',
    true,
    'This work can be done remotely with some on-site requirements',
    'Victoria, BC',
    150000,
    'This is a detailed description of the team-based work to be done. Multiple resources needed.',
    NOW() - INTERVAL '1 hour', -- Set deadline in past immediately
    NOW() + INTERVAL '45 days',
    40, -- Questions weight
    30, -- Challenge weight
    30, -- Price weight
    NOW() + INTERVAL '60 days',
    NOW() + INTERVAL '120 days'
  FROM created_opportunity co
  RETURNING id, opportunity
),
-- Create resources for the opportunity
created_resources AS (
  INSERT INTO "twuResources" (
    id, "serviceArea", "opportunityVersion", "targetAllocation",
    "mandatorySkills", "optionalSkills", "order"
  )
  SELECT
    gen_random_uuid(),
    1, -- Service area ID from serviceAreas table
    cv.id,
    100, -- 100% allocation
    ARRAY['TypeScript', 'React', 'Node.js'],
    ARRAY['Python', 'Docker', 'AWS'],
    0
  FROM created_version cv
  RETURNING id, "opportunityVersion"
),
-- Create resource questions
created_questions AS (
  INSERT INTO "twuResourceQuestions" (
    "opportunityVersion", question, guideline, score, "wordLimit",
    "order", "createdAt", "createdBy", "minimumScore"
  )
  SELECT
    cv.id,
    'Describe your team''s experience with similar projects',
    'Please provide specific examples of past work and outcomes',
    10,
    500,
    0,
    NOW(),
    (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
    7
  FROM created_version cv
  UNION ALL
  SELECT
    cv.id,
    'What is your approach to project management and collaboration?',
    'Detail your methodology and tools for team coordination',
    10,
    400,
    1,
    NOW(),
    (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
    7
  FROM created_version cv
  RETURNING "opportunityVersion"
),
-- Create evaluation panel members
created_panel AS (
  INSERT INTO "twuEvaluationPanelMembers" (
    "opportunityVersion", "user", chair, evaluator, "order"
  )
  SELECT
    cv.id,
    (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
    true,  -- Chair
    false, -- Not evaluator since they're chair
    0
  FROM created_version cv
  UNION ALL
  SELECT
    cv.id,
    (SELECT id FROM users WHERE type = 'GOV' AND email != 'alex.struk@gov.bc.ca' LIMIT 1),
    false, -- Not chair
    true,  -- Evaluator
    1
  FROM created_version cv
  RETURNING "opportunityVersion"
),
-- Create DRAFT status
draft_status AS (
  INSERT INTO "twuOpportunityStatuses" (
    id, "createdAt", "createdBy", opportunity, status, note
  )
  SELECT
    gen_random_uuid(),
    NOW(),
    (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
    cv.opportunity,
    'DRAFT',
    'Initial TWU opportunity creation'
  FROM created_version cv
  RETURNING opportunity
),
-- Create PUBLISHED status
published_status AS (
  INSERT INTO "twuOpportunityStatuses" (
    id, "createdAt", "createdBy", opportunity, status, note
  )
  SELECT
    gen_random_uuid(),
    NOW() + INTERVAL '1 second',
    (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
    ds.opportunity,
    'PUBLISHED',
    'TWU opportunity published and accepting proposals'
  FROM draft_status ds
  RETURNING opportunity
),
-- Create first proposal
proposal1 AS (
  INSERT INTO "twuProposals" (
    id, "createdAt", "createdBy", "updatedAt", "updatedBy",
    opportunity, organization, "anonymousProponentName"
  )
  SELECT
    gen_random_uuid(),
    NOW() + INTERVAL '2 seconds',
    (SELECT id FROM users WHERE type = 'VENDOR' LIMIT 1),
    NOW() + INTERVAL '2 seconds',
    (SELECT id FROM users WHERE type = 'VENDOR' LIMIT 1),
    ps.opportunity,
    (SELECT id FROM organizations WHERE active = true LIMIT 1),
    'Test Vendor Team A'
  FROM published_status ps
  RETURNING id, opportunity
),
-- Create proposal member mapping
proposal1_member AS (
  INSERT INTO "twuProposalMember" (
    member, proposal, "hourlyRate", resource
  )
  SELECT
    p1.id, -- Using proposal creator as the member
    p1.id,
    85.50,
    cr.id
  FROM proposal1 p1
  CROSS JOIN created_resources cr
  RETURNING proposal
),
-- Create resource question responses for proposal1
proposal1_responses AS (
  INSERT INTO "twuResourceQuestionResponses" (
    proposal, "order", response
  )
  SELECT
    p1.id,
    0,
    'Our team has 5+ years of experience building similar applications using React and TypeScript. We delivered 3 major projects for government clients with 98% uptime.'
  FROM proposal1 p1
  UNION ALL
  SELECT
    p1.id,
    1,
    'We use Agile methodology with 2-week sprints, daily standups, and comprehensive documentation. Our tools include Jira, Confluence, and Slack for coordination.'
  FROM proposal1 p1
  RETURNING proposal
),
-- Create DRAFT proposal status
proposal1_draft AS (
  INSERT INTO "twuProposalStatuses" (
    id, "createdAt", "createdBy", proposal, status, note
  )
  SELECT
    gen_random_uuid(),
    NOW() + INTERVAL '3 seconds',
    (SELECT id FROM users WHERE type = 'VENDOR' LIMIT 1),
    p1.id,
    'DRAFT',
    'Initial proposal creation'
  FROM proposal1 p1
  RETURNING proposal
),
-- Create SUBMITTED proposal status
proposal1_submitted AS (
  INSERT INTO "twuProposalStatuses" (
    id, "createdAt", "createdBy", proposal, status, note
  )
  SELECT
    gen_random_uuid(),
    NOW() + INTERVAL '4 seconds',
    (SELECT id FROM users WHERE type = 'VENDOR' LIMIT 1),
    p1d.proposal,
    'SUBMITTED',
    'Proposal submitted for evaluation'
  FROM proposal1_draft p1d
  RETURNING proposal
),
-- Create second proposal
proposal2 AS (
  INSERT INTO "twuProposals" (
    id, "createdAt", "createdBy", "updatedAt", "updatedBy",
    opportunity, organization, "anonymousProponentName"
  )
  SELECT
    gen_random_uuid(),
    NOW() + INTERVAL '5 seconds',
    (SELECT id FROM users WHERE type = 'VENDOR' OFFSET 1 LIMIT 1),
    NOW() + INTERVAL '5 seconds',
    (SELECT id FROM users WHERE type = 'VENDOR' OFFSET 1 LIMIT 1),
    ps.opportunity,
    (SELECT id FROM organizations WHERE active = true OFFSET 1 LIMIT 1),
    'Test Vendor Team B'
  FROM published_status ps
  RETURNING id, opportunity
),
-- Create proposal member mapping for proposal2
proposal2_member AS (
  INSERT INTO "twuProposalMember" (
    member, proposal, "hourlyRate", resource
  )
  SELECT
    p2.id, -- Using proposal creator as the member
    p2.id,
    92.75,
    cr.id
  FROM proposal2 p2
  CROSS JOIN created_resources cr
  RETURNING proposal
),
-- Create resource question responses for proposal2
proposal2_responses AS (
  INSERT INTO "twuResourceQuestionResponses" (
    proposal, "order", response
  )
  SELECT
    p2.id,
    0,
    'Our team specializes in full-stack development with 8+ years of experience. We have successfully delivered 12 enterprise applications with cutting-edge technologies.'
  FROM proposal2 p2
  UNION ALL
  SELECT
    p2.id,
    1,
    'We follow Scrum methodology with certified Scrum Master. We use Azure DevOps for project management and maintain 99.5% on-time delivery rate.'
  FROM proposal2 p2
  RETURNING proposal
),
-- Create SUBMITTED proposal status for proposal2
proposal2_submitted AS (
  INSERT INTO "twuProposalStatuses" (
    id, "createdAt", "createdBy", proposal, status, note
  )
  SELECT
    gen_random_uuid(),
    NOW() + INTERVAL '6 seconds',
    (SELECT id FROM users WHERE type = 'VENDOR' OFFSET 1 LIMIT 1),
    p2.id,
    'SUBMITTED',
    'Second proposal submitted for evaluation'
  FROM proposal2 p2
  RETURNING proposal
),
-- Move opportunity to EVAL_QUESTIONS_INDIVIDUAL status
eval_individual_status AS (
  INSERT INTO "twuOpportunityStatuses" (
    id, "createdAt", "createdBy", opportunity, status, note
  )
  SELECT
    gen_random_uuid(),
    NOW() + INTERVAL '7 seconds',
    (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
    ps.opportunity,
    'EVAL_QUESTIONS_INDIVIDUAL',
    'Individual evaluation phase started'
  FROM published_status ps
  RETURNING opportunity
),
Create individual evaluator evaluations for proposal1
eval1_individual AS (
  INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluations" (
    proposal, "questionOrder", "evaluationPanelMember", "createdAt",
    "updatedAt", score, notes
  )
  SELECT
    p1s.proposal,
    0,
    (SELECT "user" FROM "twuEvaluationPanelMembers" tpm
     JOIN created_version cv ON tpm."opportunityVersion" = cv.id
     WHERE tpm.evaluator = true LIMIT 1),
    NOW() + INTERVAL '8 seconds',
    NOW() + INTERVAL '8 seconds',
    8.5,
    'Strong experience demonstrated with good examples'
  FROM proposal1_submitted p1s
  UNION ALL
  SELECT
    p1s.proposal,
    1,
    (SELECT "user" FROM "twuEvaluationPanelMembers" tpm
     JOIN created_version cv ON tpm."opportunityVersion" = cv.id
     WHERE tpm.evaluator = true LIMIT 1),
    NOW() + INTERVAL '8 seconds',
    NOW() + INTERVAL '8 seconds',
    7.5,
    'Good methodology, could be more detailed'
  FROM proposal1_submitted p1s
  RETURNING proposal
),
Create individual evaluator evaluations for proposal2
eval2_individual AS (
  INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluations" (
    proposal, "questionOrder", "evaluationPanelMember", "createdAt",
    "updatedAt", score, notes
  )
  SELECT
    p2s.proposal,
    0,
    (SELECT "user" FROM "twuEvaluationPanelMembers" tpm
     JOIN created_version cv ON tpm."opportunityVersion" = cv.id
     WHERE tpm.evaluator = true LIMIT 1),
    NOW() + INTERVAL '9 seconds',
    NOW() + INTERVAL '9 seconds',
    9.0,
    'Excellent experience with impressive track record'
  FROM proposal2_submitted p2s
  UNION ALL
  SELECT
    p2s.proposal,
    1,
    (SELECT "user" FROM "twuEvaluationPanelMembers" tpm
     JOIN created_version cv ON tpm."opportunityVersion" = cv.id
     WHERE tpm.evaluator = true LIMIT 1),
    NOW() + INTERVAL '9 seconds',
    NOW() + INTERVAL '9 seconds',
    8.0,
    'Strong methodology with good metrics'
  FROM proposal2_submitted p2s
  RETURNING proposal
),

-- STOP HERE

SELECT
  'TWU Opportunity workflow completed successfully' as message,
  co.id as opportunity_id,
  cv.id as version_id
FROM created_opportunity co
JOIN created_version cv ON cv.opportunity = co.id;

-- Create evaluator evaluation status (SUBMITTED)
evaluator_status AS (
  INSERT INTO "twuResourceQuestionResponseEvaluatorEvaluationStatuses" (
    proposal, "evaluationPanelMember", status, note, "createdAt"
  )
  SELECT
    p1s.proposal,
    (SELECT "user" FROM "twuEvaluationPanelMembers" tpm
     JOIN created_version cv ON tpm."opportunityVersion" = cv.id
     WHERE tpm.evaluator = true LIMIT 1),
    'SUBMITTED',
    'Individual evaluation completed',
    NOW() + INTERVAL '10 seconds'
  FROM proposal1_submitted p1s
  UNION ALL
  SELECT
    p2s.proposal,
    (SELECT "user" FROM "twuEvaluationPanelMembers" tpm
     JOIN created_version cv ON tpm."opportunityVersion" = cv.id
     WHERE tpm.evaluator = true LIMIT 1),
    'SUBMITTED',
    'Individual evaluation completed',
    NOW() + INTERVAL '10 seconds'
  FROM proposal2_submitted p2s
  RETURNING proposal
),
-- Move opportunity to EVAL_QUESTIONS_CONSENSUS status
eval_consensus_status AS (
  INSERT INTO "twuOpportunityStatuses" (
    id, "createdAt", "createdBy", opportunity, status, note
  )
  SELECT
    gen_random_uuid(),
    NOW() + INTERVAL '11 seconds',
    (SELECT id FROM users WHERE email = 'alex.struk@gov.bc.ca' LIMIT 1),
    eis.opportunity,
    'EVAL_QUESTIONS_CONSENSUS',
    'Consensus evaluation phase started'
  FROM eval_individual_status eis
  RETURNING opportunity
)

-- Final SELECT to execute the WITH statement
SELECT
  'TWU Opportunity workflow completed successfully' as message,
  co.id as opportunity_id,
  cv.id as version_id
FROM created_opportunity co
JOIN created_version cv ON cv.opportunity = co.id;
