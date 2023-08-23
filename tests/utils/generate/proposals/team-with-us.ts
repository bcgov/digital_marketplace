import {
  TWUProposal,
  TWUProposalStatus,
  TWUProposalTeamMember,
  TWUProposalResourceQuestionResponse
} from "shared/lib/resources/proposal/team-with-us";
import { DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT } from "shared/lib/resources/opportunity/team-with-us";
import { getId } from "..";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { buildTWUOpportunitySlim } from "../opportunities/team-with-us";
import { buildUserSlim } from "../user";

function buildTWUProposal(overrides: Partial<TWUProposal> = {}): TWUProposal {
  const {
    createdBy = buildUserSlim(),
    opportunity = buildTWUOpportunitySlim({ createdAt: faker.date.past() }),
    createdAt = faker.date.between({
      from: opportunity.createdAt,
      to: opportunity.proposalDeadline
    })
  } = overrides;

  overrides.organization = overrides.organization
    ? { ...overrides.organization, owner: createdBy }
    : overrides.organization;

  return {
    id: getId(),
    createdBy,
    createdAt,
    updatedBy: createdBy,
    updatedAt: createdAt,
    status: TWUProposalStatus.Draft,
    opportunity: buildTWUOpportunitySlim(),
    attachments: [],
    resourceQuestionResponses: [
      ...Array(faker.number.int({ min: 1, max: 4 }))
    ].map((_, i) =>
      buildTWUProposalResourceQuestionResponse({
        order: i
      })
    ),
    team: [buildTWUProposalTeamMember()],
    anonymousProponentName: "",
    ...overrides
  };
}

function buildTWUProposalTeamMember(
  overrides: Partial<TWUProposalTeamMember> = {}
): TWUProposalTeamMember {
  return {
    member: buildUserSlim(),
    idpUsername: faker.internet.userName(),
    hourlyRate: faker.number.int({ max: 200 }),
    ...overrides
  };
}

function buildTWUProposalResourceQuestionResponse(
  overrides: Partial<TWUProposalResourceQuestionResponse> = {}
): TWUProposalResourceQuestionResponse {
  return {
    response: faker.lorem.words({
      min: 1,
      max: DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT
    }),
    order: 0,
    ...overrides
  };
}

export {
  buildTWUProposal,
  buildTWUProposalResourceQuestionResponse,
  buildTWUProposalTeamMember
};
