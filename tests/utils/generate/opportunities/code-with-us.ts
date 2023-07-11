import {
  CWUOpportunity,
  CWUOpportunityStatus
} from "shared/lib/resources/opportunity/code-with-us";
import { getId } from "..";
import { buildUserSlim } from "../user";
import { faker } from "@faker-js/faker";
import { CWU_MAX_BUDGET } from "shared/config";
import SKILLS from "shared/lib/data/skills";
import { dateAt4PM } from "tests/utils/date";

function buildCWUOpportunity(
  overrides: Partial<CWUOpportunity> = {}
): CWUOpportunity {
  const createdAt = new Date();
  const createdBy = buildUserSlim();
  const remoteOk = faker.datatype.boolean();
  const proposalDeadline = faker.date.soon({ refDate: createdAt });
  const assignmentDate = faker.date.soon({ refDate: proposalDeadline });
  const completionDate = faker.date.future({ refDate: assignmentDate });
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
    proposalDeadline: dateAt4PM(proposalDeadline),
    assignmentDate: dateAt4PM(assignmentDate),
    startDate: dateAt4PM(
      faker.date.between({ from: assignmentDate, to: completionDate })
    ),
    completionDate: dateAt4PM(completionDate),
    submissionInfo: faker.lorem.sentence(),
    acceptanceCriteria: faker.lorem.paragraphs(),
    evaluationCriteria: faker.lorem.paragraphs(),
    status: CWUOpportunityStatus.Draft,
    attachments: [],
    addenda: [],
    ...overrides
  };
}

export { buildCWUOpportunity };
