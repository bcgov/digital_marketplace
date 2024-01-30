import {
  TWUOpportunity,
  TWUOpportunityStatus,
  TWUServiceArea,
  DEFAULT_PRICE_WEIGHT,
  DEFAULT_QUESTIONS_WEIGHT,
  DEFAULT_CODE_CHALLENGE_WEIGHT,
  DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT,
  DEFAULT_RESOURCE_QUESTION_AVAILABLE_SCORE,
  TWUOpportunitySlim
} from "shared/lib/resources/opportunity/team-with-us";
import { getId } from "..";
import { buildUserSlim } from "../user";
import { fakerEN_CA as faker } from "@faker-js/faker";
import SKILLS from "shared/lib/data/skills";
import { omit, pick } from "lodash";
import { CreateTWUOpportunityParams } from "back-end/lib/db";
import { setDateTo4PM } from "shared/lib";

function buildTWUOpportunity(
  overrides: Partial<TWUOpportunity> = {}
): TWUOpportunity {
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
    description: faker.lorem.paragraphs(),
    proposalDeadline: setDateTo4PM(proposalDeadline),
    assignmentDate: setDateTo4PM(assignmentDate),
    startDate: setDateTo4PM(
      faker.date.between({
        from: assignmentDate,
        to: completionDate
      })
    ),
    completionDate: setDateTo4PM(completionDate),
    maxBudget: faker.number.float({ min: 1, precision: 2 }),
    questionsWeight: DEFAULT_QUESTIONS_WEIGHT,
    challengeWeight: DEFAULT_CODE_CHALLENGE_WEIGHT,
    priceWeight: DEFAULT_PRICE_WEIGHT,
    status: TWUOpportunityStatus.Draft,
    attachments: [],
    addenda: [],
    resourceQuestions: [...Array(faker.number.int({ min: 1, max: 4 }))].map(
      (_, i) => ({
        question: faker.lorem.sentence(),
        guideline: faker.lorem.sentence(),
        score: DEFAULT_RESOURCE_QUESTION_AVAILABLE_SCORE,
        wordLimit: DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT,
        order: i,
        createdAt,
        createdBy
      })
    ),
    resources: [...Array(faker.number.int({ min: 0, max: 3 }))].map((_, i) => ({
      serviceArea: TWUServiceArea.DataProfessional,
      targetAllocation: faker.number.int({ min: 1, max: 100 }),
      mandatorySkills: faker.helpers.arrayElements(SKILLS, {
        min: 1,
        max: 6
      }),
      optionalSkills: faker.helpers.arrayElements(SKILLS, {
        min: 0,
        max: 6
      }),
      order: i
    })),
    ...overrides
  };
}

function buildTWUOpportunitySlim(
  overrides: Partial<TWUOpportunity> = {}
): TWUOpportunitySlim {
  return {
    ...pick(buildTWUOpportunity(overrides), [
      "id",
      "title",
      "teaser",
      "createdAt",
      "createdBy",
      "updatedAt",
      "updatedBy",
      "status",
      "proposalDeadline",
      "maxBudget",
      "location",
      "remoteOk",
      "subscribed"
    ])
  };
}

function buildCreateTWUOpportunityParams(
  overrides: Partial<CreateTWUOpportunityParams> = {}
): CreateTWUOpportunityParams {
  const opportunity = buildTWUOpportunity();

  return <CreateTWUOpportunityParams>{
    ...omit(opportunity, [
      "createdBy",
      "createdAt",
      "updatedAt",
      "updatedBy",
      "status",
      "id",
      "addenda",
      "resourceQuestions",
      "resources"
    ]),
    status: TWUOpportunityStatus.Draft,
    resourceQuestions: opportunity.resourceQuestions.map(
      ({ createdAt, createdBy, ...teamQuestions }) => teamQuestions
    ),
    resources: opportunity.resources.map((resource) => ({
      serviceArea: resource.serviceArea as string,
      targetAllocation: resource.targetAllocation,
      mandatorySkills: resource.mandatorySkills,
      optionalSkills: resource.optionalSkills,
      order: resource.order
    })),
    ...overrides
  };
}

export {
  buildTWUOpportunity,
  buildTWUOpportunitySlim,
  buildCreateTWUOpportunityParams
};
