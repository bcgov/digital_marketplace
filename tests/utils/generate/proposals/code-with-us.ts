import {
  CWUIndividualProponent,
  CWUProposal,
  CWUProposalStatus
} from "shared/lib/resources/proposal/code-with-us";
import { getEmail, getFullName, getId, getPhoneNumber } from "..";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { buildCWUOpportunitySlim } from "../opportunities/code-with-us";
import { buildUserSlim } from "../user";
import { adt } from "shared/lib/types";

function buildCWUProposal(overrides: Partial<CWUProposal> = {}): CWUProposal {
  const {
    createdBy = buildUserSlim(),
    opportunity = buildCWUOpportunitySlim({ createdAt: faker.date.past() }),
    createdAt = faker.date.between({
      from: opportunity.createdAt,
      to: opportunity.proposalDeadline
    })
  } = overrides;

  overrides.proponent =
    overrides.proponent?.tag === "organization"
      ? adt("organization", { ...overrides.proponent.value, owner: createdBy })
      : overrides.proponent;

  return {
    id: getId(),
    createdBy,
    createdAt,
    updatedBy: createdBy,
    updatedAt: createdAt,
    status: CWUProposalStatus.Draft,
    opportunity: buildCWUOpportunitySlim(),
    proposalText: faker.lorem.paragraphs(),
    additionalComments: faker.lorem.paragraphs(),
    proponent: adt("individual", buildCWUIndividualProponent()),
    attachments: [],
    ...overrides
  };
}

function buildCWUIndividualProponent({
  ...overrides
}: Partial<CWUIndividualProponent> = {}): CWUIndividualProponent {
  return {
    id: getId(),
    legalName: getFullName(),
    email: getEmail(),
    phone: getPhoneNumber(),
    street1: faker.location.streetAddress(),
    street2: faker.location.secondaryAddress(),
    city: faker.location.city(),
    region: faker.location.state(),
    mailCode: faker.location.zipCode(),
    country: "Canada",
    ...overrides
  };
}

export { buildCWUIndividualProponent, buildCWUProposal };
