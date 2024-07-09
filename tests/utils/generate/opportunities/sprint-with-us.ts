import {
  DEFAULT_PRICE_WEIGHT,
  DEFAULT_QUESTIONS_WEIGHT,
  DEFAULT_SCENARIO_WEIGHT,
  DEFAULT_TEAM_QUESTION_RESPONSE_WORD_LIMIT,
  SWUEvaluationPanelMember,
  SWUOpportunity,
  SWUOpportunityPhase,
  SWUOpportunityPhaseType,
  SWUOpportunitySlim,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import { getEmail, getId } from "tests/utils/generate";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { buildUserSlim } from "tests/utils/generate/user";
import { SWU_MAX_BUDGET } from "shared/config";
import SKILLS from "shared/lib/data/skills";
import {
  DEFAULT_CODE_CHALLENGE_WEIGHT,
  DEFAULT_TEAM_QUESTION_AVAILABLE_SCORE
} from "shared/lib/resources/opportunity/sprint-with-us";
import CAPABILITY_NAMES_ONLY from "shared/lib/data/capabilities";
import { omit, pick } from "lodash";
import {
  CreateSWUOpportunityParams,
  CreateSWUOpportunityPhaseParams
} from "back-end/lib/db";
import { setDateTo4PM } from "shared/lib";

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
      startDate: setDateTo4PM(implementationPhaseStartDate),
      completionDate: setDateTo4PM(implementationPhaseCompletionDate),
      maxBudget: totalMaxBudget
    }),
    evaluationPanel = [
      buildSWUEvaluationPanelMember({
        user: { ...createdBy, email: getEmail() },
        chair: true,
        order: 0
      }),
      buildSWUEvaluationPanelMember({
        order: 1
      })
    ]
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
    proposalDeadline: setDateTo4PM(proposalDeadline),
    assignmentDate: setDateTo4PM(assignmentDate),
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
    evaluationPanel,
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
    startDate: setDateTo4PM(startDate),
    completionDate: setDateTo4PM(completionDate),
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
  overrides: Partial<SWUOpportunity> = {}
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

export function buildSWUEvaluationPanelMember(
  overrides: Partial<SWUEvaluationPanelMember>
): SWUEvaluationPanelMember {
  const user = buildUserSlim();
  return {
    user: { ...user, email: getEmail() },
    chair: false,
    evaluator: true,
    order: 0,
    ...overrides
  };
}

function buildCreateSWUOpportunityParams(
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
  buildCreateSWUOpportunityParams,
  buildSWUOpportunity,
  buildSWUOpportunityPhase,
  buildSWUOpportunitySlim
};
