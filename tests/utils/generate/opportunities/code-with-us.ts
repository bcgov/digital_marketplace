import {
  CWUOpportunity,
  CWUOpportunitySlim,
  CWUOpportunityStatus
} from "shared/lib/resources/opportunity/code-with-us";
import { getId } from "..";
import { buildUserSlim } from "../user";
import { faker } from "@faker-js/faker";
import { CWU_MAX_BUDGET } from "shared/config";
import SKILLS from "shared/lib/data/skills";
import { omit, pick } from "lodash";
import { CreateCWUOpportunityParams } from "back-end/lib/db";
import { setDateTo4PM } from "shared/lib";

function buildCWUOpportunity(
  overrides: Partial<CWUOpportunity> = {}
): CWUOpportunity {
  const {
    createdAt = new Date(),
    createdBy = buildUserSlim(),
    remoteOk = faker.datatype.boolean(),
    proposalDeadline = faker.date.soon({ refDate: createdAt }),
    assignmentDate = faker.date.soon({ refDate: proposalDeadline }),
    completionDate = overrides.completionDate
      ? overrides.completionDate
      : faker.date.future({ refDate: assignmentDate })
  } = overrides;

  return {
    id: getId(),
    createdAt,
    updatedAt: createdAt,
    createdBy,
    updatedBy: createdBy,
    title: faker.lorem.sentence(),
    teaser: faker.lorem.paragraph(),
    remoteOk,
    remoteDesc: remoteOk ? faker.lorem.paragraph() : "",
    location: faker.location.city(),
    reward: faker.number.float({ min: 0, max: CWU_MAX_BUDGET, precision: 2 }),
    skills: faker.helpers.arrayElements(SKILLS, { min: 1, max: 6 }),
    description: faker.lorem.paragraphs(),
    proposalDeadline: setDateTo4PM(proposalDeadline),
    assignmentDate: setDateTo4PM(assignmentDate),
    startDate: setDateTo4PM(
      completionDate
        ? faker.date.between({
            from: assignmentDate,
            to: completionDate
          })
        : faker.date.soon({ refDate: assignmentDate })
    ),
    completionDate: completionDate ? setDateTo4PM(completionDate) : null,
    submissionInfo: faker.lorem.sentence(),
    acceptanceCriteria: faker.lorem.paragraphs(),
    evaluationCriteria: faker.lorem.paragraphs(),
    status: CWUOpportunityStatus.Draft,
    attachments: [],
    addenda: [],
    ...overrides
  };
}

function buildCWUOpportunitySlim(
  overrides: Partial<CWUOpportunity> = {}
): CWUOpportunitySlim {
  return {
    ...pick(buildCWUOpportunity(overrides), [
      "id",
      "title",
      "teaser",
      "createdAt",
      "createdBy",
      "updatedAt",
      "updatedBy",
      "status",
      "proposalDeadline",
      "remoteOk",
      "reward",
      "location",
      "subscribed"
    ])
  };
}

function buildCreateCWUOpportunityParams(
  overrides: Partial<CreateCWUOpportunityParams> = {}
): CreateCWUOpportunityParams {
  const opportunity = buildCWUOpportunity();

  return {
    ...omit(opportunity, [
      "createdBy",
      "createdAt",
      "updatedAt",
      "updatedBy",
      "status",
      "id",
      "addenda"
    ]),
    status: CWUOpportunityStatus.Draft,
    ...overrides
  };
}

export {
  buildCreateCWUOpportunityParams,
  buildCWUOpportunity,
  buildCWUOpportunitySlim
};
