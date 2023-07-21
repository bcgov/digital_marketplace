import {
  DEFAULT_PRICE_WEIGHT,
  DEFAULT_QUESTIONS_WEIGHT,
  DEFAULT_SCENARIO_WEIGHT,
  DEFAULT_TEAM_QUESTION_RESPONSE_WORD_LIMIT,
  SWUOpportunity,
  SWUOpportunityPhase,
  SWUOpportunityPhaseType,
  SWUOpportunitySlim,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import { getId } from "..";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { buildUserSlim } from "../user";
import { SWU_MAX_BUDGET } from "shared/config";
import SKILLS from "shared/lib/data/skills";
import { dateAt4PM } from "tests/utils/date";
import {
  DEFAULT_CODE_CHALLENGE_WEIGHT,
  DEFAULT_TEAM_QUESTION_AVAILABLE_SCORE
} from "build/back-end/shared/lib/resources/opportunity/sprint-with-us";
import CAPABILITY_NAMES_ONLY from "shared/lib/data/capabilities";
import { omit, pick } from "lodash";
import {
  CreateSWUOpportunityParams,
  CreateSWUOpportunityPhaseParams
} from "back-end/lib/db";

function buildSWUOpportunity(
  overrides: Partial<SWUOpportunity> = {}
): SWUOpportunity {
  const {
    createdAt = new Date(),
    createdBy = buildUserSlim(),
    remoteOk = faker.datatype.boolean(),
    totalMaxBudget = faker.number.float({
      max: SWU_MAX_BUDGET,
      precision: 2
    }),
    mandatorySkills = faker.helpers.arrayElements(SKILLS, {
      min: 1,
      max: 6
    }),
    proposalDeadline = faker.date.soon({ refDate: createdAt }),
    assignmentDate = faker.date.soon({ refDate: proposalDeadline }),
    inceptionPhase,
    prototypePhase,
    implementationPhase: {
      completionDate: implementationPhaseCompletionDate = faker.date.future({
        refDate: assignmentDate
      }),
      startDate: implementationPhaseStartDate = faker.date.between({
        from: assignmentDate,
        to: implementationPhaseCompletionDate
      })
    } = {},
    implementationPhase = buildSWUOpportunityPhase({
      phase: SWUOpportunityPhaseType.Implementation,
      startDate: dateAt4PM(implementationPhaseStartDate),
      completionDate: dateAt4PM(implementationPhaseCompletionDate),
      maxBudget: totalMaxBudget
    })
  } = overrides;

  // Inherit phase createdAt and createdBy for consistency and a simpler API
  (
    ["inceptionPhase", "prototypePhase", "implementationPhase"] as const
  ).forEach((phaseKey) => {
    const phase = overrides[phaseKey];
    if (phase) {
      overrides[phaseKey] = {
        ...phase,
        createdAt,
        createdBy,
        requiredCapabilities: phase.requiredCapabilities.map(
          (requiredCapability) => ({
            ...requiredCapability,
            createdAt,
            createdBy
          })
        )
      };
    }
  });

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
    totalMaxBudget,
    location: faker.location.city(),
    minTeamMembers: null,
    mandatorySkills,
    optionalSkills: faker.helpers.arrayElements(
      SKILLS.filter((skill) => !mandatorySkills.includes(skill)),
      { min: 1, max: 6 }
    ),
    description: faker.lorem.paragraphs(),
    proposalDeadline: dateAt4PM(proposalDeadline),
    assignmentDate: dateAt4PM(assignmentDate),
    questionsWeight: DEFAULT_QUESTIONS_WEIGHT,
    codeChallengeWeight: DEFAULT_CODE_CHALLENGE_WEIGHT,
    scenarioWeight: DEFAULT_SCENARIO_WEIGHT,
    priceWeight: DEFAULT_PRICE_WEIGHT,
    status: SWUOpportunityStatus.Draft,
    attachments: [],
    addenda: [],
    ...(inceptionPhase ? { inceptionPhase } : {}),
    ...(prototypePhase ? { prototypePhase } : {}),
    implementationPhase,
    teamQuestions: [...Array(faker.number.int({ min: 1, max: 4 }))].map(
      (_, i) => ({
        question: faker.lorem.sentence(),
        guideline: faker.lorem.sentence(),
        score: DEFAULT_TEAM_QUESTION_AVAILABLE_SCORE,
        wordLimit: DEFAULT_TEAM_QUESTION_RESPONSE_WORD_LIMIT,
        order: i,
        createdAt,
        createdBy
      })
    ),
    ...overrides
  };
}

function buildSWUOpportunityPhase(
  overrides: Partial<SWUOpportunityPhase> = {}
): SWUOpportunityPhase {
  const {
    createdAt = new Date(),
    startDate = createdAt,
    completionDate = faker.date.future({ years: 1, refDate: startDate }),
    createdBy = buildUserSlim()
  } = overrides;
  return {
    phase: SWUOpportunityPhaseType.Implementation,
    startDate: dateAt4PM(startDate),
    completionDate: dateAt4PM(completionDate),
    maxBudget: SWU_MAX_BUDGET,
    createdBy,
    createdAt: startDate,
    requiredCapabilities: faker.helpers
      .arrayElements(CAPABILITY_NAMES_ONLY)
      .map((capability) => ({
        capability,
        fullTime: faker.datatype.boolean(0.75),
        createdAt: startDate,
        createdBy
      })),
    ...overrides
  };
}

function buildSWUOpportunitySlim(
  overrides: Partial<SWUOpportunitySlim> = {}
): SWUOpportunitySlim {
  return {
    ...pick(buildSWUOpportunity(overrides), [
      "id",
      "title",
      "teaser",
      "createdAt",
      "createdBy",
      "updatedAt",
      "updatedBy",
      "status",
      "proposalDeadline",
      "totalMaxBudget",
      "location",
      "remoteOk",
      "subscribed"
    ])
  };
}

export function buildCreateSWUOpportunityParams(
  overrides: Partial<CreateSWUOpportunityParams> = {}
): CreateSWUOpportunityParams {
  const opportunity = buildSWUOpportunity();

  return {
    ...omit(opportunity, [
      "createdBy",
      "createdAt",
      "updatedAt",
      "updatedBy",
      "status",
      "id",
      "addenda",
      "inceptionPhase",
      "prototypePhase",
      "implementationPhase",
      "teamQuestions"
    ]),
    status: SWUOpportunityStatus.Draft,
    implementationPhase: buildCreateSWUOpportunityPhaseParams(
      opportunity.implementationPhase
    ),
    teamQuestions: opportunity.teamQuestions.map(
      ({ createdAt, createdBy, ...teamQuestions }) => teamQuestions
    ),
    ...overrides
  };
}

function buildCreateSWUOpportunityPhaseParams(
  overrides: Partial<CreateSWUOpportunityPhaseParams>
): CreateSWUOpportunityPhaseParams {
  const { maxBudget, startDate, completionDate, requiredCapabilities } =
    buildSWUOpportunityPhase();
  return {
    maxBudget,
    startDate,
    completionDate,
    requiredCapabilities: requiredCapabilities.map(
      ({ capability, fullTime }) => ({ capability, fullTime })
    ),
    ...overrides
  };
}

export {
  buildSWUOpportunity,
  buildSWUOpportunityPhase,
  buildSWUOpportunitySlim
};
