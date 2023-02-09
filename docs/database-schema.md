# Database Documentation
## Tables
[A](#A) \| [C](#C) \| [F](#F) \| [M](#M) \| [O](#O) \| [S](#S) \| [U](#U) \| [V](#V)
### A
|# |Table Name| Description|
|--:|----------|------------|
|1| [affiliations](#affiliations) |  |
### C
|# |Table Name| Description|
|--:|----------|------------|
|2| [content](#content) |  |
|3| [contentVersions](#contentVersions) |  |
|4| [cwuOpportunities](#cwuOpportunities) |  |
|5| [cwuOpportunityAddenda](#cwuOpportunityAddenda) |  |
|6| [cwuOpportunityAttachments](#cwuOpportunityAttachments) |  |
|7| [cwuOpportunityNoteAttachments](#cwuOpportunityNoteAttachments) |  |
|8| [cwuOpportunityStatuses](#cwuOpportunityStatuses) |  |
|9| [cwuOpportunitySubscribers](#cwuOpportunitySubscribers) |  |
|10| [cwuOpportunityVersions](#cwuOpportunityVersions) |  |
|11| [cwuProponents](#cwuProponents) |  |
|12| [cwuProposalAttachments](#cwuProposalAttachments) |  |
|13| [cwuProposalStatuses](#cwuProposalStatuses) |  |
|14| [cwuProposals](#cwuProposals) |  |
### F
|# |Table Name| Description|
|--:|----------|------------|
|15| [fileBlobs](#fileBlobs) |  |
|16| [filePermissionsPublic](#filePermissionsPublic) |  |
|17| [filePermissionsUser](#filePermissionsUser) |  |
|18| [filePermissionsUserType](#filePermissionsUserType) |  |
|19| [files](#files) |  |
### M
|# |Table Name| Description|
|--:|----------|------------|
|20| [migrations](#migrations) |  |
|21| [migrations_lock](#migrations_lock) |  |
### O
|# |Table Name| Description|
|--:|----------|------------|
|22| [organizations](#organizations) |  |
### S
|# |Table Name| Description|
|--:|----------|------------|
|23| [sessions](#sessions) |  |
|24| [swuOpportunities](#swuOpportunities) |  |
|25| [swuOpportunityAddenda](#swuOpportunityAddenda) |  |
|26| [swuOpportunityAttachments](#swuOpportunityAttachments) |  |
|27| [swuOpportunityNoteAttachments](#swuOpportunityNoteAttachments) |  |
|28| [swuOpportunityPhases](#swuOpportunityPhases) |  |
|29| [swuOpportunityStatuses](#swuOpportunityStatuses) |  |
|30| [swuOpportunitySubscribers](#swuOpportunitySubscribers) |  |
|31| [swuOpportunityVersions](#swuOpportunityVersions) |  |
|32| [swuPhaseCapabilities](#swuPhaseCapabilities) |  |
|33| [swuProposalAttachments](#swuProposalAttachments) |  |
|34| [swuProposalPhases](#swuProposalPhases) |  |
|35| [swuProposalReferences](#swuProposalReferences) |  |
|36| [swuProposalStatuses](#swuProposalStatuses) |  |
|37| [swuProposalTeamMembers](#swuProposalTeamMembers) |  |
|38| [swuProposals](#swuProposals) |  |
|39| [swuTeamQuestionResponses](#swuTeamQuestionResponses) |  |
|40| [swuTeamQuestions](#swuTeamQuestions) |  |
### U
|# |Table Name| Description|
|--:|----------|------------|
|41| [users](#users) |  |
### V
|# |Table Name| Description|
|--:|----------|------------|
|42| [viewCounters](#viewCounters) |  |
## Details
### affiliations


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | user |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 2 | organization |  uuid | NO |  | **FK** ([organizations.id](#organizations)) |  |
| 3 | createdAt |  timestamp with time zone | NO |  |  |  |
| 4 | membershipType |  text | YES |  |  |  |
| 5 | updatedAt |  timestamp with time zone | NO | '2019-12-09 00:00:00+00' |  |  |
| 6 | id |  uuid | NO | '5c8d40f0-dfbb-4400-bc38-cbbfbbe63d7b' | **PK**, **UNIQ** |  |
| 7 | membershipStatus |  text | NO | 'PENDING' |  |  |
### content


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | YES |  | **FK** ([users.id](#users)) |  |
| 4 | slug |  text | NO |  | **UNIQ** |  |
| 5 | fixed |  boolean | NO | false |  |  |
### contentVersions


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  integer | NO |  | **PK** |  |
| 2 | title |  text | NO |  |  |  |
| 3 | body |  text | YES |  |  |  |
| 4 | createdAt |  timestamp with time zone | NO |  |  |  |
| 5 | createdBy |  uuid | YES |  | **FK** ([users.id](#users)) |  |
| 6 | contentId |  uuid | NO |  | **PK**, **FK** ([content.id](#content)) |  |
### cwuOpportunities


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
### cwuOpportunityAddenda


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | opportunity |  uuid | NO |  | **FK** ([cwuOpportunities.id](#cwuOpportunities)) |  |
| 3 | createdAt |  timestamp with time zone | NO |  |  |  |
| 4 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 5 | description |  text | NO |  |  |  |
### cwuOpportunityAttachments


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | opportunityVersion |  uuid | NO |  | **PK**, **FK** ([cwuOpportunityVersions.id](#cwuOpportunityVersions)) |  |
| 2 | file |  uuid | NO |  | **PK**, **FK** ([files.id](#files)) |  |
### cwuOpportunityNoteAttachments


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | event |  uuid | NO |  | **PK**, **FK** ([cwuOpportunityStatuses.id](#cwuOpportunityStatuses)) |  |
| 2 | file |  uuid | NO |  | **PK**, **FK** ([files.id](#files)) |  |
### cwuOpportunityStatuses


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  | **UNIQ** |  |
| 3 | createdBy |  uuid | YES |  | **FK** ([users.id](#users)) |  |
| 4 | opportunity |  uuid | NO |  | **UNIQ**, **FK** ([cwuOpportunities.id](#cwuOpportunities)) |  |
| 5 | status |  character varying | YES |  | **UNIQ** |  |
| 6 | note |  text | YES |  |  |  |
| 7 | event |  text | YES |  |  |  |
### cwuOpportunitySubscribers


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | opportunity |  uuid | NO |  | **PK**, **FK** ([cwuOpportunities.id](#cwuOpportunities)) |  |
| 2 | user |  uuid | NO |  | **PK**, **FK** ([users.id](#users)) |  |
| 3 | createdAt |  timestamp with time zone | NO |  |  |  |
### cwuOpportunityVersions


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 4 | opportunity |  uuid | NO |  | **FK** ([cwuOpportunities.id](#cwuOpportunities)) |  |
| 5 | title |  text | NO |  |  |  |
| 6 | teaser |  text | NO |  |  |  |
| 7 | remoteOk |  boolean | NO | false |  |  |
| 8 | remoteDesc |  text | NO |  |  |  |
| 9 | location |  character varying | NO |  |  |  |
| 10 | reward |  integer | NO |  |  |  |
| 11 | skills |  ARRAY | NO |  |  |  |
| 12 | description |  text | NO |  |  |  |
| 13 | proposalDeadline |  timestamp with time zone | NO |  |  |  |
| 14 | assignmentDate |  timestamp with time zone | NO |  |  |  |
| 15 | startDate |  timestamp with time zone | NO |  |  |  |
| 16 | completionDate |  timestamp with time zone | YES |  |  |  |
| 17 | submissionInfo |  text | NO |  |  |  |
| 18 | acceptanceCriteria |  text | NO |  |  |  |
| 19 | evaluationCriteria |  text | NO |  |  |  |
### cwuProponents


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 4 | updatedAt |  timestamp with time zone | NO |  |  |  |
| 5 | updatedBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 6 | legalName |  text | NO |  |  |  |
| 7 | email |  text | NO |  |  |  |
| 8 | phone |  text | YES |  |  |  |
| 9 | street1 |  text | NO |  |  |  |
| 10 | street2 |  text | YES |  |  |  |
| 11 | city |  text | NO |  |  |  |
| 12 | region |  text | NO |  |  |  |
| 13 | mailCode |  text | NO |  |  |  |
| 14 | country |  text | NO |  |  |  |
### cwuProposalAttachments


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | proposal |  uuid | NO |  | **PK**, **FK** ([cwuProposals.id](#cwuProposals)) |  |
| 2 | file |  uuid | NO |  | **PK**, **FK** ([files.id](#files)) |  |
### cwuProposalStatuses


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  | **UNIQ** |  |
| 3 | createdBy |  uuid | YES |  | **FK** ([users.id](#users)) |  |
| 4 | proposal |  uuid | NO |  | **UNIQ**, **FK** ([cwuProposals.id](#cwuProposals)) |  |
| 5 | status |  character varying | YES |  | **UNIQ** |  |
| 6 | note |  text | YES |  |  |  |
| 7 | event |  text | YES |  |  |  |
### cwuProposals


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | NO |  | **UNIQ**, **FK** ([users.id](#users)) |  |
| 4 | updatedAt |  timestamp with time zone | NO |  |  |  |
| 5 | updatedBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 6 | proposalText |  text | NO |  |  |  |
| 7 | additionalComments |  text | NO |  |  |  |
| 8 | proponentIndividual |  uuid | YES |  | **FK** ([cwuProponents.id](#cwuProponents)) |  |
| 9 | proponentOrganization |  uuid | YES |  | **FK** ([organizations.id](#organizations)) |  |
| 10 | score |  real | YES |  |  |  |
| 11 | opportunity |  uuid | NO |  | **UNIQ**, **FK** ([cwuOpportunities.id](#cwuOpportunities)) |  |
### fileBlobs


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | hash |  text | NO |  | **PK**, **UNIQ** |  |
| 2 | blob |  bytea | NO |  |  |  |
### filePermissionsPublic


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | file |  uuid | NO |  | **PK**, **FK** ([files.id](#files)) |  |
### filePermissionsUser


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | file |  uuid | NO |  | **PK**, **FK** ([files.id](#files)) |  |
| 2 | user |  uuid | NO |  | **PK**, **FK** ([users.id](#users)) |  |
### filePermissionsUserType


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | userType |  text | NO |  | **PK** |  |
| 2 | file |  uuid | NO |  | **PK**, **FK** ([files.id](#files)) |  |
### files


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 4 | name |  text | NO |  |  |  |
| 5 | fileBlob |  text | NO |  | **FK** ([fileBlobs.hash](#fileBlobs)) |  |
### migrations


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  integer | NO | auto-increment | **PK** |  |
| 2 | name |  character varying | YES |  |  |  |
| 3 | batch |  integer | YES |  |  |  |
| 4 | migration_time |  timestamp with time zone | YES |  |  |  |
### migrations_lock


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | index |  integer | NO | auto-increment | **PK** |  |
| 2 | is_locked |  integer | YES |  |  |  |
### organizations


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | legalName |  text | NO |  |  |  |
| 4 | logoImageFile |  uuid | YES |  | **FK** ([files.id](#files)) |  |
| 5 | websiteUrl |  text | YES |  |  |  |
| 6 | updatedAt |  timestamp with time zone | NO | '2019-12-09 00:00:00+00' |  |  |
| 7 | streetAddress1 |  text | NO |  |  |  |
| 8 | streetAddress2 |  text | YES |  |  |  |
| 9 | city |  text | NO |  |  |  |
| 10 | region |  text | NO |  |  |  |
| 11 | mailCode |  text | NO |  |  |  |
| 12 | country |  text | NO |  |  |  |
| 13 | contactName |  text | NO |  |  |  |
| 14 | contactTitle |  text | YES |  |  |  |
| 15 | contactEmail |  text | NO |  |  |  |
| 16 | contactPhone |  text | YES |  |  |  |
| 17 | active |  boolean | NO | true |  |  |
| 18 | deactivatedOn |  timestamp with time zone | YES |  |  |  |
| 19 | deactivatedBy |  uuid | YES |  | **FK** ([users.id](#users)) |  |
| 20 | acceptedSWUTerms |  timestamp with time zone | YES |  |  |  |
### sessions


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | accessToken |  text | NO |  |  |  |
| 3 | createdAt |  timestamp with time zone | NO |  |  |  |
| 4 | updatedAt |  timestamp with time zone | NO |  |  |  |
| 5 | user |  uuid | NO |  | **FK** ([users.id](#users)) |  |
### swuOpportunities


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
### swuOpportunityAddenda


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | opportunity |  uuid | NO |  | **FK** ([swuOpportunities.id](#swuOpportunities)) |  |
| 3 | createdAt |  timestamp with time zone | NO |  |  |  |
| 4 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 5 | description |  text | NO |  |  |  |
### swuOpportunityAttachments


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | opportunityVersion |  uuid | NO |  | **PK**, **FK** ([swuOpportunityVersions.id](#swuOpportunityVersions)) |  |
| 2 | file |  uuid | NO |  | **PK**, **FK** ([files.id](#files)) |  |
### swuOpportunityNoteAttachments


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | event |  uuid | NO |  | **PK**, **FK** ([swuOpportunityStatuses.id](#swuOpportunityStatuses)) |  |
| 2 | file |  uuid | NO |  | **PK**, **FK** ([files.id](#files)) |  |
### swuOpportunityPhases


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | opportunityVersion |  uuid | NO |  | **UNIQ**, **FK** ([swuOpportunityVersions.id](#swuOpportunityVersions)) |  |
| 3 | phase |  text | NO |  | **UNIQ** |  |
| 4 | startDate |  timestamp with time zone | NO |  |  |  |
| 5 | completionDate |  timestamp with time zone | YES |  |  |  |
| 6 | maxBudget |  integer | NO |  |  |  |
| 7 | createdAt |  timestamp with time zone | NO |  |  |  |
| 8 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
### swuOpportunityStatuses


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | YES |  | **FK** ([users.id](#users)) |  |
| 4 | opportunity |  uuid | NO |  | **FK** ([swuOpportunities.id](#swuOpportunities)) |  |
| 5 | status |  text | YES |  |  |  |
| 6 | event |  text | YES |  |  |  |
| 7 | note |  text | YES |  |  |  |
### swuOpportunitySubscribers


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | opportunity |  uuid | NO |  | **PK**, **FK** ([swuOpportunities.id](#swuOpportunities)) |  |
| 2 | user |  uuid | NO |  | **PK**, **FK** ([users.id](#users)) |  |
| 3 | createdAt |  timestamp with time zone | NO |  |  |  |
### swuOpportunityVersions


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 4 | opportunity |  uuid | NO |  | **FK** ([swuOpportunities.id](#swuOpportunities)) |  |
| 5 | title |  text | NO |  |  |  |
| 6 | teaser |  text | NO |  |  |  |
| 7 | remoteOk |  boolean | NO | false |  |  |
| 8 | remoteDesc |  text | NO |  |  |  |
| 9 | location |  text | NO |  |  |  |
| 10 | totalMaxBudget |  integer | NO |  |  |  |
| 11 | minTeamMembers |  integer | YES |  |  |  |
| 12 | mandatorySkills |  ARRAY | NO |  |  |  |
| 13 | optionalSkills |  ARRAY | NO |  |  |  |
| 14 | description |  text | NO |  |  |  |
| 15 | proposalDeadline |  timestamp with time zone | NO |  |  |  |
| 16 | assignmentDate |  timestamp with time zone | NO |  |  |  |
| 17 | questionsWeight |  integer | NO |  |  |  |
| 18 | codeChallengeWeight |  integer | NO |  |  |  |
| 19 | scenarioWeight |  integer | NO |  |  |  |
| 20 | priceWeight |  integer | NO |  |  |  |
### swuPhaseCapabilities


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | phase |  uuid | NO |  | **PK**, **FK** ([swuOpportunityPhases.id](#swuOpportunityPhases)) |  |
| 2 | capability |  character varying | NO |  | **PK** |  |
| 3 | fullTime |  boolean | NO | false |  |  |
| 4 | createdAt |  timestamp with time zone | NO |  |  |  |
| 5 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
### swuProposalAttachments


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | proposal |  uuid | NO |  | **PK**, **FK** ([swuProposals.id](#swuProposals)) |  |
| 2 | file |  uuid | NO |  | **PK**, **FK** ([files.id](#files)) |  |
### swuProposalPhases


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | proposal |  uuid | NO |  | **UNIQ**, **FK** ([swuProposals.id](#swuProposals)) |  |
| 3 | phase |  text | NO |  | **UNIQ** |  |
| 4 | proposedCost |  integer | NO |  |  |  |
### swuProposalReferences


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | proposal |  uuid | NO |  | **PK**, **FK** ([swuProposals.id](#swuProposals)) |  |
| 2 | order |  integer | NO |  | **PK** |  |
| 3 | name |  text | NO |  |  |  |
| 4 | company |  text | NO |  |  |  |
| 5 | phone |  text | NO |  |  |  |
| 6 | email |  text | NO |  |  |  |
### swuProposalStatuses


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | YES |  | **FK** ([users.id](#users)) |  |
| 4 | proposal |  uuid | NO |  | **FK** ([swuProposals.id](#swuProposals)) |  |
| 5 | status |  text | YES |  |  |  |
| 6 | event |  text | YES |  |  |  |
| 7 | note |  text | YES |  |  |  |
### swuProposalTeamMembers


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | member |  uuid | NO |  | **PK**, **FK** ([users.id](#users)) |  |
| 2 | phase |  uuid | NO |  | **PK**, **FK** ([swuProposalPhases.id](#swuProposalPhases)) |  |
| 3 | scrumMaster |  boolean | NO | false |  |  |
### swuProposals


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 4 | updatedAt |  timestamp with time zone | NO |  |  |  |
| 5 | updatedBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
| 6 | challengeScore |  real | YES |  |  |  |
| 7 | scenarioScore |  real | YES |  |  |  |
| 8 | priceScore |  real | YES |  |  |  |
| 9 | opportunity |  uuid | YES |  | **FK** ([swuOpportunities.id](#swuOpportunities)) |  |
| 10 | organization |  uuid | YES |  | **FK** ([organizations.id](#organizations)) |  |
| 11 | anonymousProponentName |  text | NO | '' |  |  |
### swuTeamQuestionResponses


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | proposal |  uuid | NO |  | **PK**, **FK** ([swuProposals.id](#swuProposals)) |  |
| 2 | order |  integer | NO |  | **PK** |  |
| 3 | response |  text | NO |  |  |  |
| 4 | score |  real | YES |  |  |  |
### swuTeamQuestions


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | opportunityVersion |  uuid | NO |  | **PK**, **FK** ([swuOpportunityVersions.id](#swuOpportunityVersions)) |  |
| 2 | question |  text | NO |  |  |  |
| 3 | guideline |  text | NO |  |  |  |
| 4 | score |  integer | NO |  |  |  |
| 5 | wordLimit |  integer | NO |  |  |  |
| 6 | order |  integer | NO |  | **PK** |  |
| 7 | createdAt |  timestamp with time zone | NO |  |  |  |
| 8 | createdBy |  uuid | NO |  | **FK** ([users.id](#users)) |  |
### users


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | id |  uuid | NO |  | **PK**, **UNIQ** |  |
| 2 | createdAt |  timestamp with time zone | NO |  |  |  |
| 3 | updatedAt |  timestamp with time zone | NO |  |  |  |
| 4 | type |  text | NO |  | **UNIQ** |  |
| 5 | status |  text | NO |  |  |  |
| 6 | name |  text | NO |  |  |  |
| 7 | email |  text | YES |  | **UNIQ** |  |
| 8 | avatarImageFile |  uuid | YES |  | **FK** ([files.id](#files)) |  |
| 9 | jobTitle |  text | YES |  |  |  |
| 10 | idpUsername |  text | NO |  | **UNIQ** |  |
| 11 | notificationsOn |  timestamp with time zone | YES |  |  |  |
| 12 | acceptedTermsAt |  timestamp with time zone | YES |  |  |  |
| 13 | deactivatedOn |  timestamp with time zone | YES |  |  |  |
| 14 | deactivatedBy |  uuid | YES |  | **FK** ([users.id](#users)) |  |
| 15 | capabilities |  ARRAY | NO | '{}' |  |  |
| 16 | idpId |  text | NO |  | **UNIQ** |  |
| 17 | lastAcceptedTermsAt |  timestamp with time zone | YES |  |  |  |
### viewCounters


|# |column|type|nullable|default|constraints|description|
|--:|------|----|--------|-------|-----------|-----------|
| 1 | name |  text | NO |  | **PK** |  |
| 2 | count |  integer | NO |  |  |  |
---
generated by [pg-doc](https://github.com/echetzakis/pg-doc) v0.1.1
