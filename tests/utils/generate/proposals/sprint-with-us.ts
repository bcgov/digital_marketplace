import {
  SWUProposal,
  SWUProposalPhase,
  SWUProposalPhaseType,
  SWUProposalStatus,
  SWUProposalTeamMember
} from "shared/lib/resources/proposal/sprint-with-us";
import { DEFAULT_TEAM_QUESTION_RESPONSE_WORD_LIMIT } from "shared/lib/resources/opportunity/sprint-with-us";
import { getFullName, getEmail, getId, getPhoneNumber } from "..";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { SWU_MAX_BUDGET } from "shared/config";
import { buildSWUOpportunitySlim } from "../opportunities/sprint-with-us";
import { buildUserSlim } from "../user";
import { buildOrganizationSlim } from "../organization";
import CAPABILITY_NAMES_ONLY from "shared/lib/data/capabilities";

function buildSWUProposal(overrides: Partial<SWUProposal> = {}): SWUProposal {
  const {
    createdBy = buildUserSlim(),
    opportunity = buildSWUOpportunitySlim({ createdAt: faker.date.past() }),
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
    status: SWUProposalStatus.Draft,
    opportunity: buildSWUOpportunitySlim(),
    organization: buildOrganizationSlim({ owner: createdBy }),
    implementationPhase: buildSWUProposalPhase({
      phase: SWUProposalPhaseType.Implementation,
      members: [buildSWUProposalTeamMember({ member: createdBy })]
    }),
    references: [...Array(3)].map((_, i) => ({
      name: getFullName(),
      company: faker.company.name(),
      phone: getPhoneNumber(),
      email: getEmail(),
      order: i
    })),
    attachments: [],
    teamQuestionResponses: [...Array(faker.number.int({ min: 1, max: 4 }))].map(
      (_, i) => ({
        response: faker.lorem.words({
          min: 1,
          max: DEFAULT_TEAM_QUESTION_RESPONSE_WORD_LIMIT
        }),
        order: i
      })
    ),
    anonymousProponentName: "",
    ...overrides
  };
}

function buildSWUProposalPhase(
  overrides: Partial<SWUProposalPhase> = {}
): SWUProposalPhase {
  return {
    phase: SWUProposalPhaseType.Implementation,
    members: [buildSWUProposalTeamMember()],
    proposedCost: faker.number.float({ max: SWU_MAX_BUDGET, precision: 2 }),
    ...overrides
  };
}

function buildSWUProposalTeamMember(
  overrides: Partial<SWUProposalTeamMember> = {}
): SWUProposalTeamMember {
  return {
    member: buildUserSlim(),
    scrumMaster: true,
    pending: false,
    capabilities: CAPABILITY_NAMES_ONLY,
    idpUsername: faker.internet.userName(),
    ...overrides
  };
}

export { buildSWUProposal };
