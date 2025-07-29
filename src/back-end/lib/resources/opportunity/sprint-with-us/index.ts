import { FileRecord } from "back-end/../shared/lib/resources/file";
import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as swuOpportunityNotifications from "back-end/lib/mailer/notifications/opportunity/sprint-with-us";
import * as permissions from "back-end/lib/permissions";
import {
  basicResponse,
  JsonResponseBody,
  makeJsonResponseBody,
  nullRequestBodyHandler,
  wrapRespond
} from "back-end/lib/server";
import {
  validateAttachments,
  validateSWUOpportunityId,
  validateSWUEvaluationPanelMembers,
  validateSWUTeamQuestionResponseEvaluation
} from "back-end/lib/validation";
import { get, omit } from "lodash";
import {
  addDays,
  getBoolean,
  getNumber,
  getString,
  getStringArray
} from "shared/lib";
import { invalid } from "shared/lib/http";
import {
  CreateRequestBody as SharedCreateRequestBody,
  CreateSWUOpportunityPhaseBody,
  CreateSWUOpportunityStatus,
  CreateSWUTeamQuestionBody,
  CreateSWUTeamQuestionValidationErrors,
  CreateValidationErrors,
  DeleteValidationErrors,
  editableOpportunityStatuses,
  isValidStatusChange,
  SWUOpportunity,
  SWUOpportunitySlim,
  SWUOpportunityStatus,
  UpdateRequestBody as SharedUpdateRequestBody,
  UpdateValidationErrors,
  UpdateWithNoteRequestBody,
  CreateSWUEvaluationPanelMemberBody,
  CreateSWUEvaluationPanelMemberValidationErrors,
  SubmitQuestionEvaluationsWithNoteRequestBody,
  canChangeEvaluationPanel
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors,
  isValidEvaluationStatusChange,
  isValidConsensusStatusChange,
  SWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationStatus
} from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { ADT, adt, Id } from "shared/lib/types";
import {
  allValid,
  getInvalidValue,
  getValidValue,
  Invalid,
  isInvalid,
  isValid,
  optional,
  valid,
  validateUUID,
  Validation
} from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/sprint-with-us";
import * as genericValidation from "shared/lib/validation/opportunity/utility";
import {
  SWUProposalStatus,
  isSWUProposalInCodeChallenge
} from "shared/lib/resources/proposal/sprint-with-us";
import * as questionEvaluationValidation from "shared/lib/validation/evaluations/sprint-with-us/team-questions";

interface ValidatedCreateSWUOpportunityPhaseBody
  extends Omit<CreateSWUOpportunityPhaseBody, "startDate" | "completionDate"> {
  startDate: Date;
  completionDate: Date;
}

interface ValidatedCreateRequestBody
  extends Omit<
    SWUOpportunity,
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "status"
    | "id"
    | "addenda"
    | "history"
    | "publishedAt"
    | "subscribed"
    | "inceptionPhase"
    | "prototypePhase"
    | "implementationPhase"
    | "teamQuestions"
    | "codeChallengeEndDate"
    | "teamScenarioEndDate"
    | "evaluationPanel"
  > {
  status: CreateSWUOpportunityStatus;
  session: AuthenticatedSession;
  inceptionPhase?: ValidatedCreateSWUOpportunityPhaseBody;
  prototypePhase?: ValidatedCreateSWUOpportunityPhaseBody;
  implementationPhase: ValidatedCreateSWUOpportunityPhaseBody;
  teamQuestions: CreateSWUTeamQuestionBody[];
  evaluationPanel: CreateSWUEvaluationPanelMemberBody[];
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body:
    | ADT<"edit", ValidatedUpdateEditRequestBody>
    | ADT<"submitForReview", string>
    | ADT<"publish", string>
    | ADT<"startCodeChallenge", string>
    | ADT<"startTeamScenario", string>
    | ADT<"cancel", string>
    | ADT<"addAddendum", string>
    | ADT<"addNote", ValidatedUpdateWithNoteRequestBody>
    | ADT<
        "submitIndividualQuestionEvaluations",
        ValidatedSubmitQuestionEvaluationsWithNoteRequestBody
      >
    | ADT<
        "submitConsensusQuestionEvaluations",
        ValidatedSubmitQuestionEvaluationsWithNoteRequestBody
      >
    | ADT<"editEvaluationPanel", ValidatedUpdateEditRequestBody>
    | ADT<"finalizeQuestionConsensuses", string>;
}

type ValidatedUpdateEditRequestBody = Omit<
  ValidatedCreateRequestBody,
  "status" | "session"
>;

interface ValidatedUpdateWithNoteRequestBody
  extends Omit<UpdateWithNoteRequestBody, "attachments"> {
  attachments: FileRecord[];
}

interface ValidatedSubmitQuestionEvaluationsWithNoteRequestBody
  extends Omit<SubmitQuestionEvaluationsWithNoteRequestBody, "proposals"> {
  evaluations: SWUTeamQuestionResponseEvaluation[];
}

type ValidatedDeleteRequestBody = Id;

type CreateRequestBody = Omit<SharedCreateRequestBody, "status"> & {
  status: string;
};

type UpdateRequestBody = SharedUpdateRequestBody | null;

const routeNamespace = "opportunities/sprint-with-us";

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<SWUOpportunitySlim[] | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: SWUOpportunitySlim[] | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));

    // Read and validate the panelMember flag
    const isPanelMember = request.query.panelMember === "true";

    const dbResult = await db.readManySWUOpportunities(
      connection,
      request.session,
      isPanelMember
    );
    if (isInvalid(dbResult)) {
      return respond(503, [db.ERROR_MESSAGE]);
    }
    return respond(200, dbResult.value);
  });
};

const readOne: crud.ReadOne<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<SWUOpportunity | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: SWUOpportunity | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    // Validate the provided id
    const validatedId = validateUUID(request.params.id);
    if (isInvalid(validatedId)) {
      return respond(400, validatedId.value);
    }
    const dbResult = await db.readOneSWUOpportunity(
      connection,
      validatedId.value,
      request.session
    );
    if (isInvalid(dbResult)) {
      return respond(503, [db.ERROR_MESSAGE]);
    }
    if (!dbResult.value) {
      return respond(404, ["Opportunity not found."]);
    }
    return respond(200, dbResult.value);
  });
};

const create: crud.Create<
  Session,
  db.Connection,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors
> = (connection: db.Connection) => {
  return {
    async parseRequestBody(request) {
      const body: unknown =
        request.body.tag === "json" ? request.body.value : {};
      return {
        title: getString(body, "title"),
        teaser: getString(body, "teaser"),
        remoteOk: getBoolean(body, "remoteOk"),
        remoteDesc: getString(body, "remoteDesc"),
        location: getString(body, "location"),
        totalMaxBudget: getNumber(body, "totalMaxBudget"),
        // Can't use undefined as fallback for minTeamMembers
        // as getNumber will default it to zero.
        minTeamMembers: getNumber<null>(body, "minTeamMembers", null),
        mandatorySkills: getStringArray(body, "mandatorySkills"),
        optionalSkills: getStringArray(body, "optionalSkills"),
        description: getString(body, "description"),
        proposalDeadline: getString(body, "proposalDeadline"),
        assignmentDate: getString(body, "assignmentDate"),
        questionsWeight: getNumber(body, "questionsWeight"),
        codeChallengeWeight: getNumber(body, "codeChallengeWeight"),
        scenarioWeight: getNumber(body, "scenarioWeight"),
        priceWeight: getNumber(body, "priceWeight"),
        attachments: getStringArray(body, "attachments"),
        status: getString(body, "status"),
        inceptionPhase: get<typeof body, string>(body, "inceptionPhase"),
        prototypePhase: get<typeof body, string>(body, "prototypePhase"),
        implementationPhase: get<typeof body, string>(
          body,
          "implementationPhase"
        ),
        teamQuestions: get<typeof body, string>(body, "teamQuestions"),
        evaluationPanel: get<typeof body, string>(body, "evaluationPanel")
      };
    },
    async validateRequestBody(request) {
      const {
        title,
        teaser,
        remoteOk,
        remoteDesc,
        location,
        totalMaxBudget,
        minTeamMembers,
        mandatorySkills,
        optionalSkills,
        description,
        proposalDeadline,
        assignmentDate,
        questionsWeight,
        codeChallengeWeight,
        scenarioWeight,
        priceWeight,
        attachments,
        status,
        inceptionPhase,
        prototypePhase,
        implementationPhase,
        teamQuestions,
        evaluationPanel
      } = request.body;

      const validatedStatus =
        opportunityValidation.validateCreateSWUOpportunityStatus(status);
      if (isInvalid(validatedStatus)) {
        return invalid({
          status: validatedStatus.value
        });
      }

      if (
        !permissions.createSWUOpportunity(
          request.session,
          validatedStatus.value
        ) ||
        !permissions.isSignedIn(request.session)
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const session: AuthenticatedSession = request.session;

      // Validate attachments for all opportunity statuses
      const validatedAttachments = await validateAttachments(
        connection,
        attachments
      );
      if (isInvalid<string[][]>(validatedAttachments)) {
        return invalid({
          attachments: validatedAttachments.value
        });
      }

      const now = new Date();
      const validatedProposalDeadline =
        opportunityValidation.validateProposalDeadline(proposalDeadline);
      const validatedAssignmentDate =
        genericValidation.validateDateFormatMinMax(
          assignmentDate,
          getValidValue(validatedProposalDeadline, now)
        );
      // Validate phase start/completion dates now so that we can coerce to defaults for draft
      const inceptionPhaseStartDate = getString(
        inceptionPhase || {},
        "startDate"
      );
      const validatedInceptionPhaseStartDate =
        genericValidation.validateDateFormatMinMax(
          inceptionPhaseStartDate,
          getValidValue(validatedAssignmentDate, now)
        );
      const inceptionPhaseCompletionDate = getString(
        inceptionPhase || {},
        "completionDate"
      );
      const validatedInceptionPhaseCompletionDate =
        opportunityValidation.validateSWUOpportunityPhaseCompletionDate(
          inceptionPhaseCompletionDate,
          getValidValue(
            validatedInceptionPhaseStartDate,
            getValidValue(validatedAssignmentDate, now)
          )
        );

      const prototypePhaseStartDate = getString(
        prototypePhase || {},
        "startDate"
      );
      const validatedPrototypePhaseStartDate =
        opportunityValidation.validateSWUOpportunityPrototypePhaseStartDate(
          prototypePhaseStartDate,
          getValidValue(
            validatedInceptionPhaseCompletionDate,
            getValidValue(validatedAssignmentDate, now)
          )
        );
      const prototypePhaseCompletionDate = getString(
        prototypePhase || {},
        "completionDate"
      );
      const validatedPrototypePhaseCompletionDate =
        opportunityValidation.validateSWUOpportunityPhaseCompletionDate(
          prototypePhaseCompletionDate,
          getValidValue(
            validatedPrototypePhaseStartDate,
            getValidValue(validatedAssignmentDate, now)
          )
        );

      const implementationPhaseStartDate = getString(
        implementationPhase || {},
        "startDate"
      );
      const validatedImplementationPhaseStartDate =
        opportunityValidation.validateSWUOpportunityImplementationPhaseStartDate(
          implementationPhaseStartDate,
          getValidValue(
            validatedPrototypePhaseCompletionDate,
            getValidValue(validatedAssignmentDate, now)
          )
        );
      const implementationPhaseCompletionDate = getString(
        implementationPhase || {},
        "completionDate"
      );
      const validatedImplementationPhaseCompletionDate =
        opportunityValidation.validateSWUOpportunityPhaseCompletionDate(
          implementationPhaseCompletionDate,
          getValidValue(
            validatedImplementationPhaseStartDate,
            getValidValue(validatedAssignmentDate, now)
          )
        );

      const validatedEvaluationPanel = await validateSWUEvaluationPanelMembers(
        connection,
        evaluationPanel
      );
      if (
        isInvalid<CreateSWUEvaluationPanelMemberValidationErrors[]>(
          validatedEvaluationPanel
        )
      ) {
        return invalid({
          evaluationPanel: validatedEvaluationPanel.value
        });
      }

      // Do not validate other fields if the opportunity a draft
      if (validatedStatus.value === SWUOpportunityStatus.Draft) {
        const defaultPhaseLength = 7;
        const defaultDate = addDays(new Date(), 14);
        return valid({
          title,
          teaser,
          remoteOk,
          remoteDesc,
          location,
          totalMaxBudget,
          minTeamMembers,
          mandatorySkills,
          optionalSkills,
          description,
          questionsWeight,
          codeChallengeWeight,
          scenarioWeight,
          priceWeight,
          session,
          status: validatedStatus.value,
          attachments: validatedAttachments.value,
          teamQuestions: teamQuestions
            ? teamQuestions.map((v) => ({
                question: getString(v, "question"),
                guideline: getString(v, "guideline"),
                score: getNumber(v, "score"),
                minimumScore: getNumber<null>(v, "minimumScore", null),
                wordLimit: getNumber(v, "wordLimit"),
                order: getNumber(v, "order")
              }))
            : [],
          // Coerce validated dates to default values
          proposalDeadline: getValidValue(
            validatedProposalDeadline,
            defaultDate
          ),
          assignmentDate: getValidValue(validatedAssignmentDate, defaultDate),
          inceptionPhase: inceptionPhase
            ? {
                requiredCapabilities: (
                  get(inceptionPhase, "requiredCapabilities") || []
                ).map((v) => ({
                  capability: getString(v, "capability"),
                  fullTime: getBoolean(v, "fullTime")
                })),
                maxBudget: getNumber<number>(inceptionPhase, "maxBudget"),
                startDate: getValidValue(
                  validatedInceptionPhaseStartDate,
                  getValidValue(validatedAssignmentDate, defaultDate)
                ),
                completionDate: getValidValue(
                  validatedInceptionPhaseCompletionDate,
                  addDays(
                    getValidValue(
                      validatedInceptionPhaseStartDate,
                      getValidValue(validatedAssignmentDate, defaultDate)
                    ),
                    defaultPhaseLength
                  )
                )
              }
            : undefined,
          prototypePhase: prototypePhase
            ? {
                requiredCapabilities: (
                  get(prototypePhase, "requiredCapabilities") || []
                ).map((v) => ({
                  capability: getString(v, "capability"),
                  fullTime: getBoolean(v, "fullTime")
                })),
                maxBudget: getNumber<number>(prototypePhase, "maxBudget"),
                startDate: getValidValue(
                  validatedPrototypePhaseStartDate,
                  inceptionPhase
                    ? getValidValue(
                        validatedInceptionPhaseCompletionDate,
                        getValidValue(validatedAssignmentDate, defaultDate)
                      )
                    : getValidValue(validatedAssignmentDate, defaultDate)
                ),
                completionDate: getValidValue(
                  validatedPrototypePhaseCompletionDate,
                  addDays(
                    getValidValue(
                      validatedPrototypePhaseStartDate,
                      getValidValue(validatedAssignmentDate, defaultDate)
                    ),
                    defaultPhaseLength
                  )
                )
              }
            : undefined,
          implementationPhase: {
            requiredCapabilities: (
              get(implementationPhase, "requiredCapabilities") || []
            ).map((v) => ({
              capability: getString(v, "capability"),
              fullTime: getBoolean(v, "fullTime")
            })),
            maxBudget: getNumber<number>(implementationPhase, "maxBudget"),
            startDate: getValidValue(
              validatedImplementationPhaseStartDate,
              prototypePhase
                ? getValidValue(
                    validatedPrototypePhaseCompletionDate,
                    getValidValue(validatedAssignmentDate, defaultDate)
                  )
                : getValidValue(validatedAssignmentDate, defaultDate)
            ),
            completionDate: getValidValue(
              validatedImplementationPhaseCompletionDate,
              addDays(
                getValidValue(
                  validatedImplementationPhaseStartDate,
                  getValidValue(validatedAssignmentDate, defaultDate)
                ),
                defaultPhaseLength
              )
            )
          },
          evaluationPanel: validatedEvaluationPanel.value
        });
      }

      const validatedTitle = genericValidation.validateTitle(title);
      const validatedTeaser = genericValidation.validateTeaser(teaser);
      const validatedRemoteOk = genericValidation.validateRemoteOk(remoteOk);
      const validatedRemoteDesc = genericValidation.validateRemoteDesc(
        remoteDesc,
        getValidValue(validatedRemoteOk, false)
      );
      const validatedLocation = genericValidation.validateLocation(location);
      const validatedTotalMaxBudget =
        opportunityValidation.validateTotalMaxBudget(totalMaxBudget);
      const validatedMinTeamMembers =
        opportunityValidation.validateMinimumTeamMembers(minTeamMembers);
      const validatedMandatorySkills =
        genericValidation.validateMandatorySkills(mandatorySkills);
      const validatedOptionalSkills =
        genericValidation.validateOptionalSkills(optionalSkills);
      const validatedDescription =
        genericValidation.validateDescription(description);
      const validatedQuestionsWeight =
        opportunityValidation.validateQuestionsWeight(questionsWeight);
      const validatedCodeChallengeWeight =
        opportunityValidation.validateCodeChallengeWeight(codeChallengeWeight);
      const validatedTeamScenarioWeight =
        opportunityValidation.validateTeamScenarioWeight(scenarioWeight);
      const validatedPriceWeight =
        opportunityValidation.validatePriceWeight(priceWeight);
      const validatedInceptionPhase =
        opportunityValidation.validateSWUOpportunityInceptionPhase(
          inceptionPhase,
          getValidValue(validatedAssignmentDate, new Date())
        );
      const validatedPrototypePhase = optional(prototypePhase, (v) =>
        opportunityValidation.validateSWUOpportunityPrototypePhase(
          v,
          getValidValue(
            validatedInceptionPhaseCompletionDate,
            getValidValue(validatedAssignmentDate, new Date())
          )
        )
      );
      const validatedImplementationPhase =
        opportunityValidation.validateSWUOpportunityImplementationPhase(
          implementationPhase,
          getValidValue(
            validatedPrototypePhaseCompletionDate,
            getValidValue(validatedAssignmentDate, new Date())
          )
        );
      const validatedTeamQuestions =
        opportunityValidation.validateTeamQuestions(teamQuestions);

      if (
        allValid([
          validatedTitle,
          validatedTeaser,
          validatedRemoteOk,
          validatedRemoteDesc,
          validatedLocation,
          validatedTotalMaxBudget,
          validatedMinTeamMembers,
          validatedMandatorySkills,
          validatedOptionalSkills,
          validatedDescription,
          validatedQuestionsWeight,
          validatedCodeChallengeWeight,
          validatedTeamScenarioWeight,
          validatedPriceWeight,
          validatedInceptionPhase,
          validatedPrototypePhase,
          validatedImplementationPhase,
          validatedTeamQuestions,
          validatedProposalDeadline,
          validatedAssignmentDate,
          validatedAttachments,
          validatedStatus,
          validatedEvaluationPanel
        ])
      ) {
        // Ensure that score weights total 100%
        if (
          getValidValue(validatedQuestionsWeight, 0) +
            getValidValue(validatedCodeChallengeWeight, 0) +
            getValidValue(validatedTeamScenarioWeight, 0) +
            getValidValue(validatedPriceWeight, 0) !==
          100
        ) {
          return invalid({
            scoreWeights: ["The scoring weights must total 100%."]
          });
        }

        // Ensure that if inception phase is defined, prototype phase must also be defined
        if (
          getValidValue(validatedInceptionPhase, undefined) &&
          !getValidValue(validatedPrototypePhase, undefined)
        ) {
          return invalid({
            phases: ["A prototype phase must follow an inception phase."]
          });
        }

        return valid({
          session,
          title: validatedTitle.value,
          teaser: validatedTeaser.value,
          remoteOk: validatedRemoteOk.value,
          remoteDesc: validatedRemoteDesc.value,
          location: validatedLocation.value,
          totalMaxBudget: validatedTotalMaxBudget.value,
          minTeamMembers: validatedMinTeamMembers.value,
          mandatorySkills: validatedMandatorySkills.value,
          optionalSkills: validatedOptionalSkills.value,
          description: validatedDescription.value,
          questionsWeight: validatedQuestionsWeight.value,
          codeChallengeWeight: validatedCodeChallengeWeight.value,
          scenarioWeight: validatedTeamScenarioWeight.value,
          priceWeight: validatedPriceWeight.value,
          inceptionPhase: validatedInceptionPhase.value,
          prototypePhase: validatedPrototypePhase.value,
          implementationPhase: validatedImplementationPhase.value,
          teamQuestions: validatedTeamQuestions.value,
          proposalDeadline: validatedProposalDeadline.value,
          assignmentDate: validatedAssignmentDate.value,
          attachments: validatedAttachments.value,
          status: validatedStatus.value,
          evaluationPanel: validatedEvaluationPanel.value
        } as ValidatedCreateRequestBody);
      } else {
        return invalid({
          title: getInvalidValue(validatedTitle, undefined),
          teaser: getInvalidValue(validatedTeaser, undefined),
          remoteOk: getInvalidValue(validatedRemoteOk, undefined),
          remoteDesc: getInvalidValue(validatedRemoteDesc, undefined),
          location: getInvalidValue(validatedLocation, undefined),
          totalMaxBudget: getInvalidValue(validatedTotalMaxBudget, undefined),
          minTeamMembers: getInvalidValue(validatedMinTeamMembers, undefined),
          mandatorySkills: getInvalidValue<string[][], undefined>(
            validatedMandatorySkills,
            undefined
          ),
          optionalSkills: getInvalidValue<string[][], undefined>(
            validatedOptionalSkills,
            undefined
          ),
          description: getInvalidValue(validatedDescription, undefined),
          questionsWeight: getInvalidValue(validatedQuestionsWeight, undefined),
          codeChallengeWeight: getInvalidValue(
            validatedCodeChallengeWeight,
            undefined
          ),
          teamScenarioWeight: getInvalidValue(
            validatedTeamScenarioWeight,
            undefined
          ),
          priceWeight: getInvalidValue(validatedPriceWeight, undefined),
          inceptionPhase: getInvalidValue(validatedInceptionPhase, undefined),
          prototypePhase: getInvalidValue(validatedPrototypePhase, undefined),
          implementationPhase: getInvalidValue(
            validatedImplementationPhase,
            undefined
          ),
          teamQuestions: getInvalidValue<
            CreateSWUTeamQuestionValidationErrors[],
            undefined
          >(validatedTeamQuestions, undefined),
          proposalDeadline: getInvalidValue(
            validatedProposalDeadline,
            undefined
          ),
          assignmentDate: getInvalidValue(validatedAssignmentDate, undefined),
          evaluationPanel: getInvalidValue<
            CreateSWUEvaluationPanelMemberValidationErrors[],
            undefined
          >(validatedEvaluationPanel, undefined)
        });
      }
    },
    respond: wrapRespond<
      ValidatedCreateRequestBody,
      CreateValidationErrors,
      JsonResponseBody<SWUOpportunity>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const dbResult = await db.createSWUOpportunity(
          connection,
          omit(request.body, "session"),
          request.body.session
        );
        if (isInvalid(dbResult)) {
          return basicResponse(
            503,
            request.session,
            makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
          );
        }
        // If submitted for review, notify
        if (dbResult.value.status === SWUOpportunityStatus.UnderReview) {
          swuOpportunityNotifications.handleSWUSubmittedForReview(
            connection,
            dbResult.value
          );
        }
        // If published, notify subscribed users
        if (dbResult.value.status === SWUOpportunityStatus.Published) {
          swuOpportunityNotifications.handleSWUPublished(
            connection,
            dbResult.value
          );
        }
        return basicResponse(
          201,
          request.session,
          makeJsonResponseBody(dbResult.value)
        );
      },
      invalid: async (request) => {
        return basicResponse(
          400,
          request.session,
          makeJsonResponseBody(request.body)
        );
      }
    })
  };
};

const update: crud.Update<
  Session,
  db.Connection,
  UpdateRequestBody,
  ValidatedUpdateRequestBody,
  UpdateValidationErrors
> = (connection: db.Connection) => {
  return {
    async parseRequestBody(request) {
      const body = request.body.tag === "json" ? request.body.value : {};
      const tag = get(body, "tag");
      const value: unknown = get(body, "value");

      switch (tag) {
        case "edit": {
          return adt("edit", {
            title: getString(value, "title"),
            teaser: getString(value, "teaser"),
            remoteOk: getBoolean(value, "remoteOk"),
            remoteDesc: getString(value, "remoteDesc"),
            location: getString(value, "location"),
            totalMaxBudget: getNumber<number>(value, "totalMaxBudget"),
            // Can't use undefined as fallback for minTeamMembers
            // as getNumber will default it to zero.
            minTeamMembers: getNumber<null>(value, "minTeamMembers", null),
            mandatorySkills: getStringArray(value, "mandatorySkills"),
            optionalSkills: getStringArray(value, "optionalSkills"),
            description: getString(value, "description"),
            proposalDeadline: getString(value, "proposalDeadline"),
            assignmentDate: getString(value, "assignmentDate"),
            questionsWeight: getNumber<number>(value, "questionsWeight"),
            codeChallengeWeight: getNumber<number>(
              value,
              "codeChallengeWeight"
            ),
            scenarioWeight: getNumber<number>(value, "scenarioWeight"),
            priceWeight: getNumber<number>(value, "priceWeight"),
            attachments: getStringArray(value, "attachments"),
            inceptionPhase: get<typeof value, string>(value, "inceptionPhase"),
            prototypePhase: get<typeof value, string>(value, "prototypePhase"),
            implementationPhase: get<typeof value, string>(
              value,
              "implementationPhase"
            ),
            teamQuestions: get<typeof value, string>(value, "teamQuestions"),
            evaluationPanel: get<typeof value, string>(value, "evaluationPanel")
          });
        }
        case "submitForReview":
          return adt("submitForReview", getString(body, "value"));
        case "publish":
          return adt("publish", getString(body, "value"));
        case "finalizeQuestionConsensuses":
          return adt("finalizeQuestionConsensuses", getString(body, "value"));
        case "startCodeChallenge":
          return adt("startCodeChallenge", getString(body, "value"));
        case "startTeamScenario":
          return adt("startTeamScenario", getString(body, "value"));
        case "cancel":
          return adt("cancel", getString(body, "value"));
        case "addAddendum":
          return adt("addAddendum", getString(body, "value"));
        case "addNote":
          return adt("addNote", {
            note: getString(value, "note"),
            attachments: getStringArray(value, "attachments")
          });
        case "submitIndividualQuestionEvaluations":
          return adt(
            "submitIndividualQuestionEvaluations",
            value as SubmitQuestionEvaluationsWithNoteRequestBody
          );
        case "submitConsensusQuestionEvaluations":
          return adt(
            "submitConsensusQuestionEvaluations",
            value as SubmitQuestionEvaluationsWithNoteRequestBody
          );
        case "editEvaluationPanel":
          return adt(
            "editEvaluationPanel",
            value as CreateSWUEvaluationPanelMemberBody[]
          );
        default:
          return null;
      }
    },
    async validateRequestBody(request) {
      if (!request.body) {
        return invalid({ opportunity: adt("parseFailure" as const) });
      }

      const validatedSWUOpportunity = await validateSWUOpportunityId(
        connection,
        request.params.id,
        request.session
      );
      if (isInvalid(validatedSWUOpportunity)) {
        return invalid({
          notFound: ["The specified opportunity does not exist."]
        });
      }
      const swuOpportunity = validatedSWUOpportunity.value;

      if (
        // Evaluation panel actions checked separately
        (![
          "submitIndividualQuestionEvaluations",
          "submitConsensusQuestionEvaluations"
        ].includes(request.body.tag) &&
          !(await permissions.editSWUOpportunity(
            connection,
            request.session,
            request.params.id
          ))) ||
        !permissions.isSignedIn(request.session)
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      switch (request.body.tag) {
        case "edit": {
          const {
            title,
            teaser,
            remoteOk,
            remoteDesc,
            location,
            totalMaxBudget,
            minTeamMembers,
            mandatorySkills,
            optionalSkills,
            description,
            proposalDeadline,
            assignmentDate,
            questionsWeight,
            codeChallengeWeight,
            scenarioWeight,
            priceWeight,
            attachments,
            inceptionPhase,
            prototypePhase,
            implementationPhase,
            teamQuestions
          } = request.body.value;

          if (!editableOpportunityStatuses.includes(swuOpportunity.status)) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }

          // Attachments must be validated for draft opportunities, as well as published.
          const validatedAttachments = await validateAttachments(
            connection,
            attachments
          );
          if (isInvalid<string[][]>(validatedAttachments)) {
            return invalid({
              opportunity: adt("edit" as const, {
                attachments: validatedAttachments.value
              })
            });
          }

          /**
           * If the existing proposal deadline is in the past,
           * updates should be validated against that deadline.
           * The exception to this rule is if the opportunity is
           * a draft, then the proposal deadline should be validated
           * against the current date.
           */
          const now = new Date();
          const validatedProposalDeadline =
            opportunityValidation.validateProposalDeadline(
              proposalDeadline,
              swuOpportunity
            );
          const validatedAssignmentDate =
            genericValidation.validateDateFormatMinMax(
              assignmentDate,
              getValidValue(validatedProposalDeadline, now)
            );
          const inceptionPhaseStartDate = getString(
            inceptionPhase || {},
            "startDate"
          );
          const validatedInceptionPhaseStartDate =
            genericValidation.validateDateFormatMinMax(
              inceptionPhaseStartDate,
              getValidValue(
                validatedAssignmentDate,
                getValidValue(validatedAssignmentDate, now)
              )
            );
          const inceptionPhaseCompletionDate = getString(
            inceptionPhase || {},
            "completionDate"
          );
          const validatedInceptionPhaseCompletionDate =
            opportunityValidation.validateSWUOpportunityPhaseCompletionDate(
              inceptionPhaseCompletionDate,
              getValidValue(
                validatedInceptionPhaseStartDate,
                getValidValue(validatedAssignmentDate, now)
              )
            );
          const prototypePhaseStartDate = getString(
            prototypePhase || {},
            "startDate"
          );
          const validatedPrototypePhaseStartDate =
            opportunityValidation.validateSWUOpportunityPrototypePhaseStartDate(
              prototypePhaseStartDate,
              getValidValue(
                validatedInceptionPhaseCompletionDate,
                getValidValue(validatedAssignmentDate, now)
              )
            );
          const prototypePhaseCompletionDate = getString(
            prototypePhase || {},
            "completionDate"
          );
          const validatedPrototypePhaseCompletionDate =
            opportunityValidation.validateSWUOpportunityPhaseCompletionDate(
              prototypePhaseCompletionDate,
              getValidValue(
                validatedPrototypePhaseStartDate,
                getValidValue(validatedAssignmentDate, now)
              )
            );
          const implementationPhaseStartDate = getString(
            implementationPhase || {},
            "startDate"
          );
          const validatedImplementationPhaseStartDate =
            opportunityValidation.validateSWUOpportunityImplementationPhaseStartDate(
              implementationPhaseStartDate,
              getValidValue(
                validatedPrototypePhaseCompletionDate,
                getValidValue(validatedAssignmentDate, now)
              )
            );
          const implementationPhaseCompletionDate = getString(
            implementationPhase || {},
            "completionDate"
          );
          const validatedImplementationPhaseCompletionDate =
            opportunityValidation.validateSWUOpportunityPhaseCompletionDate(
              implementationPhaseCompletionDate,
              getValidValue(
                validatedImplementationPhaseStartDate,
                getValidValue(validatedAssignmentDate, now)
              )
            );

          // Do not validate other fields if the opportunity a draft
          if (swuOpportunity.status === SWUOpportunityStatus.Draft) {
            const defaultPhaseLength = 7;
            const defaultDate = addDays(new Date(), 14);
            return valid({
              session: request.session,
              body: adt("edit" as const, {
                title,
                teaser,
                remoteOk,
                remoteDesc,
                location,
                totalMaxBudget,
                minTeamMembers,
                mandatorySkills,
                optionalSkills,
                description,
                questionsWeight,
                codeChallengeWeight,
                scenarioWeight,
                priceWeight,
                teamQuestions: teamQuestions
                  ? teamQuestions.map((v) => ({
                      question: getString(v, "question"),
                      guideline: getString(v, "guideline"),
                      score: getNumber(v, "score"),
                      wordLimit: getNumber(v, "wordLimit"),
                      order: getNumber(v, "order"),
                      minimumScore: getNumber<null>(v, "minimumScore", null)
                    }))
                  : [],
                attachments: validatedAttachments.value,
                // Coerce validated dates to default values
                proposalDeadline: getValidValue(
                  validatedProposalDeadline,
                  defaultDate
                ),
                assignmentDate: getValidValue(
                  validatedAssignmentDate,
                  defaultDate
                ),
                inceptionPhase: inceptionPhase
                  ? {
                      requiredCapabilities: (
                        get(inceptionPhase, "requiredCapabilities") || []
                      ).map((v) => ({
                        capability: getString(v, "capability"),
                        fullTime: getBoolean(v, "fullTime")
                      })),
                      maxBudget: getNumber<number>(inceptionPhase, "maxBudget"),
                      startDate: getValidValue(
                        validatedInceptionPhaseStartDate,
                        getValidValue(validatedAssignmentDate, defaultDate)
                      ),
                      completionDate: getValidValue(
                        validatedInceptionPhaseCompletionDate,
                        addDays(
                          getValidValue(
                            validatedInceptionPhaseStartDate,
                            getValidValue(validatedAssignmentDate, defaultDate)
                          ),
                          defaultPhaseLength
                        )
                      )
                    }
                  : undefined,
                prototypePhase: prototypePhase
                  ? {
                      requiredCapabilities: (
                        get(prototypePhase, "requiredCapabilities") || []
                      ).map((v) => ({
                        capability: getString(v, "capability"),
                        fullTime: getBoolean(v, "fullTime")
                      })),
                      maxBudget: getNumber<number>(prototypePhase, "maxBudget"),
                      startDate: getValidValue(
                        validatedPrototypePhaseStartDate,
                        inceptionPhase
                          ? getValidValue(
                              validatedInceptionPhaseCompletionDate,
                              getValidValue(
                                validatedAssignmentDate,
                                defaultDate
                              )
                            )
                          : getValidValue(validatedAssignmentDate, defaultDate)
                      ),
                      completionDate: getValidValue(
                        validatedPrototypePhaseCompletionDate,
                        addDays(
                          getValidValue(
                            validatedPrototypePhaseStartDate,
                            getValidValue(validatedAssignmentDate, defaultDate)
                          ),
                          defaultPhaseLength
                        )
                      )
                    }
                  : undefined,
                implementationPhase: {
                  requiredCapabilities: (
                    get(implementationPhase, "requiredCapabilities") || []
                  ).map((v) => ({
                    capability: getString(v, "capability"),
                    fullTime: getBoolean(v, "fullTime")
                  })),
                  maxBudget: getNumber<number>(
                    implementationPhase,
                    "maxBudget"
                  ),
                  startDate: getValidValue(
                    validatedImplementationPhaseStartDate,
                    prototypePhase
                      ? getValidValue(
                          validatedPrototypePhaseCompletionDate,
                          getValidValue(validatedAssignmentDate, defaultDate)
                        )
                      : getValidValue(validatedAssignmentDate, defaultDate)
                  ),
                  completionDate: getValidValue(
                    validatedImplementationPhaseCompletionDate,
                    addDays(
                      getValidValue(
                        validatedImplementationPhaseStartDate,
                        getValidValue(validatedAssignmentDate, defaultDate)
                      ),
                      defaultPhaseLength
                    )
                  )
                }
              })
            } as ValidatedUpdateRequestBody);
          }

          const validatedTitle = genericValidation.validateTitle(title);
          const validatedTeaser = genericValidation.validateTeaser(teaser);
          const validatedRemoteOk =
            genericValidation.validateRemoteOk(remoteOk);
          const validatedRemoteDesc = genericValidation.validateRemoteDesc(
            remoteDesc,
            getValidValue(validatedRemoteOk, false)
          );
          const validatedLocation =
            genericValidation.validateLocation(location);
          const validatedTotalMaxBudget =
            opportunityValidation.validateTotalMaxBudget(totalMaxBudget);
          const validatedMinTeamMembers =
            opportunityValidation.validateMinimumTeamMembers(minTeamMembers);
          const validatedMandatorySkills =
            genericValidation.validateMandatorySkills(mandatorySkills);
          const validatedOptionalSkills =
            genericValidation.validateOptionalSkills(optionalSkills);
          const validatedDescription =
            genericValidation.validateDescription(description);
          const validatedQuestionsWeight =
            opportunityValidation.validateQuestionsWeight(questionsWeight);
          const validatedCodeChallengeWeight =
            opportunityValidation.validateCodeChallengeWeight(
              codeChallengeWeight
            );
          const validatedTeamScenarioWeight =
            opportunityValidation.validateTeamScenarioWeight(scenarioWeight);
          const validatedPriceWeight =
            opportunityValidation.validatePriceWeight(priceWeight);
          const validatedInceptionPhase =
            opportunityValidation.validateSWUOpportunityInceptionPhase(
              inceptionPhase,
              getValidValue(validatedAssignmentDate, now)
            );
          const validatedPrototypePhase =
            opportunityValidation.validateSWUOpportunityPrototypePhase(
              prototypePhase,
              getValidValue(
                validatedInceptionPhaseCompletionDate,
                getValidValue(validatedAssignmentDate, now)
              )
            );
          const validatedImplementationPhase =
            opportunityValidation.validateSWUOpportunityImplementationPhase(
              implementationPhase,
              getValidValue(
                validatedPrototypePhaseCompletionDate,
                getValidValue(validatedAssignmentDate, now)
              )
            );
          const validatedTeamQuestions =
            opportunityValidation.validateTeamQuestions(teamQuestions);

          if (
            allValid([
              validatedTitle,
              validatedTeaser,
              validatedRemoteOk,
              validatedRemoteDesc,
              validatedLocation,
              validatedTotalMaxBudget,
              validatedMinTeamMembers,
              validatedMandatorySkills,
              validatedOptionalSkills,
              validatedDescription,
              validatedQuestionsWeight,
              validatedCodeChallengeWeight,
              validatedTeamScenarioWeight,
              validatedPriceWeight,
              validatedInceptionPhase,
              validatedPrototypePhase,
              validatedImplementationPhase,
              validatedTeamQuestions,
              validatedProposalDeadline,
              validatedAssignmentDate,
              validatedAttachments
            ])
          ) {
            // Ensure that score weights total 100%
            if (
              getValidValue(validatedQuestionsWeight, 0) +
                getValidValue(validatedCodeChallengeWeight, 0) +
                getValidValue(validatedTeamScenarioWeight, 0) +
                getValidValue(validatedPriceWeight, 0) !==
              100
            ) {
              return invalid({
                opportunity: adt("edit" as const, {
                  scoreWeights: ["The scoring weights must total 100%."]
                })
              });
            }

            // Ensure that if inception phase is defined, prototype phase must also be defined
            if (
              getValidValue(validatedInceptionPhase, undefined) &&
              !getValidValue(validatedPrototypePhase, undefined)
            ) {
              return invalid({
                opportunity: adt("edit" as const, {
                  phases: ["A prototype phase must follow an inception phase."]
                })
              });
            }

            return valid({
              session: request.session,
              body: adt("edit" as const, {
                title: validatedTitle.value,
                teaser: validatedTeaser.value,
                remoteOk: validatedRemoteOk.value,
                remoteDesc: validatedRemoteDesc.value,
                location: validatedLocation.value,
                totalMaxBudget: validatedTotalMaxBudget.value,
                minTeamMembers: validatedMinTeamMembers.value,
                mandatorySkills: validatedMandatorySkills.value,
                optionalSkills: validatedOptionalSkills.value,
                description: validatedDescription.value,
                questionsWeight: validatedQuestionsWeight.value,
                codeChallengeWeight: validatedCodeChallengeWeight.value,
                scenarioWeight: validatedTeamScenarioWeight.value,
                priceWeight: validatedPriceWeight.value,
                inceptionPhase: validatedInceptionPhase.value,
                prototypePhase: validatedPrototypePhase.value,
                implementationPhase: validatedImplementationPhase.value,
                teamQuestions: validatedTeamQuestions.value,
                proposalDeadline: validatedProposalDeadline.value,
                assignmentDate: validatedAssignmentDate.value,
                attachments: validatedAttachments.value
              })
            } as ValidatedUpdateRequestBody);
          } else {
            return invalid({
              opportunity: adt("edit" as const, {
                title: getInvalidValue(validatedTitle, undefined),
                teaser: getInvalidValue(validatedTeaser, undefined),
                remoteOk: getInvalidValue(validatedRemoteOk, undefined),
                remoteDesc: getInvalidValue(validatedRemoteDesc, undefined),
                location: getInvalidValue(validatedLocation, undefined),
                totalMaxBudget: getInvalidValue(
                  validatedTotalMaxBudget,
                  undefined
                ),
                minTeamMembers: getInvalidValue(
                  validatedMinTeamMembers,
                  undefined
                ),
                mandatorySkills: getInvalidValue<string[][], undefined>(
                  validatedMandatorySkills,
                  undefined
                ),
                optionalSkills: getInvalidValue<string[][], undefined>(
                  validatedOptionalSkills,
                  undefined
                ),
                description: getInvalidValue(validatedDescription, undefined),
                questionsWeight: getInvalidValue(
                  validatedQuestionsWeight,
                  undefined
                ),
                codeChallengeWeight: getInvalidValue(
                  validatedCodeChallengeWeight,
                  undefined
                ),
                teamScenarioWeight: getInvalidValue(
                  validatedTeamScenarioWeight,
                  undefined
                ),
                priceWeight: getInvalidValue(validatedPriceWeight, undefined),
                inceptionPhase: getInvalidValue(
                  validatedInceptionPhase,
                  undefined
                ),
                prototypePhase: getInvalidValue(
                  validatedPrototypePhase,
                  undefined
                ),
                implementationPhase: getInvalidValue(
                  validatedImplementationPhase,
                  undefined
                ),
                teamQuestions: getInvalidValue<
                  CreateSWUTeamQuestionValidationErrors[],
                  undefined
                >(validatedTeamQuestions, undefined),
                proposalDeadline: getInvalidValue(
                  validatedProposalDeadline,
                  undefined
                ),
                assignmentDate: getInvalidValue(
                  validatedAssignmentDate,
                  undefined
                )
              })
            });
          }
        }
        case "submitForReview": {
          if (
            !isValidStatusChange(
              swuOpportunity.status,
              SWUOpportunityStatus.UnderReview
            )
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          // Perform validation on draft to ensure it's ready for publishing
          if (
            !allValid([
              genericValidation.validateTitle(
                validatedSWUOpportunity.value.title
              ),
              genericValidation.validateTeaser(
                validatedSWUOpportunity.value.teaser
              ),
              genericValidation.validateRemoteOk(
                validatedSWUOpportunity.value.remoteOk
              ),
              genericValidation.validateRemoteDesc(
                validatedSWUOpportunity.value.remoteDesc,
                validatedSWUOpportunity.value.remoteOk
              ),
              genericValidation.validateLocation(
                validatedSWUOpportunity.value.location
              ),
              opportunityValidation.validateTotalMaxBudget(
                validatedSWUOpportunity.value.totalMaxBudget
              ),
              opportunityValidation.validateMinimumTeamMembers(
                validatedSWUOpportunity.value.minTeamMembers
              ),
              genericValidation.validateMandatorySkills(
                validatedSWUOpportunity.value.mandatorySkills
              ),
              genericValidation.validateOptionalSkills(
                validatedSWUOpportunity.value.optionalSkills
              ),
              genericValidation.validateDescription(
                validatedSWUOpportunity.value.description
              ),
              opportunityValidation.validateQuestionsWeight(
                validatedSWUOpportunity.value.questionsWeight
              ),
              opportunityValidation.validateCodeChallengeWeight(
                validatedSWUOpportunity.value.codeChallengeWeight
              ),
              opportunityValidation.validateTeamScenarioWeight(
                validatedSWUOpportunity.value.scenarioWeight
              ),
              opportunityValidation.validatePriceWeight(
                validatedSWUOpportunity.value.priceWeight
              ),
              opportunityValidation.validatePriceWeight(
                validatedSWUOpportunity.value.priceWeight
              ),
              opportunityValidation.validateSWUOpportunityInceptionPhase(
                validatedSWUOpportunity.value.inceptionPhase,
                validatedSWUOpportunity.value.assignmentDate,
                validatedSWUOpportunity.value.totalMaxBudget
              ),
              opportunityValidation.validateSWUOpportunityPrototypePhase(
                validatedSWUOpportunity.value.prototypePhase,
                validatedSWUOpportunity.value.inceptionPhase?.completionDate ||
                  validatedSWUOpportunity.value.assignmentDate,
                validatedSWUOpportunity.value.totalMaxBudget
              ),
              opportunityValidation.validateSWUOpportunityImplementationPhase(
                validatedSWUOpportunity.value.implementationPhase,
                validatedSWUOpportunity.value.prototypePhase?.completionDate ||
                  validatedSWUOpportunity.value.assignmentDate,
                validatedSWUOpportunity.value.totalMaxBudget
              )
            ])
          ) {
            return invalid({
              opportunity: adt("submitForReview" as const, [
                "This opportunity could not be submitted for review because it is incomplete. Please edit, complete and save the form below before trying to publish it again."
              ])
            });
          }

          const validatedSubmitNote = opportunityValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedSubmitNote)) {
            return invalid({
              opportunity: adt(
                "submitForReview" as const,
                validatedSubmitNote.value
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("submitForReview", validatedSubmitNote.value)
          } as ValidatedUpdateRequestBody);
        }
        case "publish": {
          if (
            !isValidStatusChange(
              validatedSWUOpportunity.value.status,
              SWUOpportunityStatus.Published
            )
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          // Only admins can publish, so additional permissions check needed
          if (!permissions.publishSWUOpportunity(request.session)) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          // Opportunity will have been fully validated during review process, so no need to repeat
          const validatedPublishNote = opportunityValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedPublishNote)) {
            return invalid({
              opportunity: adt("publish" as const, validatedPublishNote.value)
            });
          }
          return valid({
            session: request.session,
            body: adt("publish", validatedPublishNote.value)
          });
        }
        case "finalizeQuestionConsensuses": {
          if (
            !isValidStatusChange(
              validatedSWUOpportunity.value.status,
              SWUOpportunityStatus.EvaluationCodeChallenge
            )
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }

          const consensuses = getValidValue<
            SWUTeamQuestionResponseEvaluation[]
          >(
            await db.readManySWUTeamQuestionResponseEvaluations(
              connection,
              request.session,
              request.params.id,
              true
            ),
            []
          );

          if (
            !consensuses.every(
              ({ status }) =>
                status === SWUTeamQuestionResponseEvaluationStatus.Submitted
            )
          ) {
            return invalid({
              permissions: ["Not all consensuses have been submitted."]
            });
          }

          const anyScreenableProponents = consensuses.some((consensus) => {
            return swuOpportunity.teamQuestions.every((tq) => {
              if (!tq.minimumScore) {
                return true;
              }

              return consensus.scores[tq.order].score >= tq.minimumScore;
            });
          });

          if (!anyScreenableProponents) {
            return invalid({
              permissions: [
                "You must have at least one proponent that can be screened into the Code Challenge."
              ]
            });
          }

          const validatedFinalizeQuestionConsensusesNote =
            opportunityValidation.validateNote(request.body.value);
          if (isInvalid(validatedFinalizeQuestionConsensusesNote)) {
            return invalid({
              opportunity: adt(
                "finalizeQuestionConsensuses" as const,
                validatedFinalizeQuestionConsensusesNote.value
              )
            });
          }
          return valid({
            session: request.session,
            body: adt(
              "finalizeQuestionConsensuses",
              validatedFinalizeQuestionConsensusesNote.value
            )
          } as ValidatedUpdateRequestBody);
        }
        // todo: remove - not needed any more - the block is deprecated
        case "startCodeChallenge": {
          if (
            !isValidStatusChange(
              validatedSWUOpportunity.value.status,
              SWUOpportunityStatus.EvaluationCodeChallenge
            )
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          // Ensure there is at least one screened in proponent
          const screenedInCCProponentCount = getValidValue(
            await db.countScreenedInSWUCodeChallenge(
              connection,
              validatedSWUOpportunity.value.id
            ),
            0
          );
          if (!screenedInCCProponentCount) {
            return invalid({
              permissions: [
                "You must have at least one screened in proponent to start the Code Challenge."
              ]
            });
          }
          const validatedEvaluationCodeChallengeNote =
            opportunityValidation.validateNote(request.body.value);
          if (isInvalid(validatedEvaluationCodeChallengeNote)) {
            return invalid({
              opportunity: adt(
                "startCodeChallenge" as const,
                validatedEvaluationCodeChallengeNote.value
              )
            });
          }
          return valid({
            session: request.session,
            body: adt(
              "startCodeChallenge",
              validatedEvaluationCodeChallengeNote.value
            )
          });
        }
        case "startTeamScenario": {
          if (
            !isValidStatusChange(
              validatedSWUOpportunity.value.status,
              SWUOpportunityStatus.EvaluationTeamScenario
            )
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }

          // "startTeamScenario" triggered - opportunity is about to be moved to EvaluationTeamScenario status
          // Check that all proposals have code challenge scores, otherwise it is possible
          // to move to EvaluationTeamScenario status without all proposals having scores
          const proposals = getValidValue(
            await db.readManySWUProposals(
              connection,
              request.session,
              validatedSWUOpportunity.value.id
            ),
            []
          );

          // Filter proposals to include only those in the code challenge phase
          const codeProposals = proposals?.filter(
            (p) =>
              isSWUProposalInCodeChallenge(p) ||
              p.status === SWUProposalStatus.Disqualified
          );

          // If there are code challenge proposals but some don't have scores and are not disqualified, return an error
          if (
            codeProposals?.length &&
            !codeProposals.every(
              (p) =>
                p.challengeScore !== undefined ||
                p.status === SWUProposalStatus.Disqualified
            )
          ) {
            return invalid({
              permissions: [
                "You must score all proponents before moving to the Team Scenario evaluation step."
              ]
            });
          }

          // Ensure there is at least one screened in proponent
          const screenedInTSProponentCount = getValidValue(
            await db.countScreenInSWUTeamScenario(
              connection,
              validatedSWUOpportunity.value.id
            ),
            0
          );
          if (!screenedInTSProponentCount) {
            return invalid({
              permissions: [
                "You must have at least one screened in proponent to start the Team Scenario."
              ]
            });
          }
          const validatedEvaluationTeamScenarioNote =
            opportunityValidation.validateNote(request.body.value);
          if (isInvalid(validatedEvaluationTeamScenarioNote)) {
            return invalid({
              opportunity: adt(
                "startTeamScenario" as const,
                validatedEvaluationTeamScenarioNote.value
              )
            });
          }
          return valid({
            session: request.session,
            body: adt(
              "startTeamScenario",
              validatedEvaluationTeamScenarioNote.value
            )
          });
        }
        case "cancel": {
          if (
            !isValidStatusChange(
              validatedSWUOpportunity.value.status,
              SWUOpportunityStatus.Canceled
            ) ||
            !permissions.cancelSWUOpportunity(request.session)
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          const validatedCancelNote = opportunityValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedCancelNote)) {
            return invalid({
              opportunity: adt("cancel" as const, validatedCancelNote.value)
            });
          }
          return valid({
            session: request.session,
            body: adt("cancel", validatedCancelNote.value)
          } as ValidatedUpdateRequestBody);
        }
        case "addAddendum": {
          if (
            validatedSWUOpportunity.value.status ===
              SWUOpportunityStatus.Draft ||
            !(await permissions.addSWUAddendum(
              connection,
              request.session,
              validatedSWUOpportunity.value.id
            ))
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          const validatedAddendumText =
            opportunityValidation.validateAddendumText(request.body.value);
          if (isInvalid(validatedAddendumText)) {
            return invalid({
              opportunity: adt(
                "addAddendum" as const,
                validatedAddendumText.value
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("addAddendum", validatedAddendumText.value)
          } as ValidatedUpdateRequestBody);
        }
        case "addNote": {
          const { note, attachments: noteAttachments } = request.body.value;
          const validatedNote = opportunityValidation.validateNote(note); //TODO changed to validateNote from validateHistoryNote as note-taking was removed from shared
          const validatedNoteAttachments = await validateAttachments(
            connection,
            noteAttachments
          );
          if (allValid([validatedNote, validatedNoteAttachments])) {
            return valid({
              session: request.session,
              body: adt("addNote", {
                note: validatedNote.value,
                attachments: validatedNoteAttachments.value
              })
            } as ValidatedUpdateRequestBody);
          } else {
            return invalid({
              opportunity: adt("addNote" as const, {
                note: getInvalidValue(validatedNote, undefined),
                attachments: getInvalidValue<string[][], undefined>(
                  validatedNoteAttachments,
                  undefined
                )
              })
            });
          }
        }
        case "submitIndividualQuestionEvaluations": {
          const validations = await Promise.all(
            request.body.value.proposals.map<
              Promise<
                Validation<
                  SWUTeamQuestionResponseEvaluation,
                  UpdateValidationErrors
                >
              >
            >(async (proposalId) => {
              // Satisfy the compiler.
              if (!permissions.isSignedIn(request.session)) {
                return invalid({
                  permissions: [permissions.ERROR_MESSAGE]
                });
              }

              const validatedSWUTeamQuestionResponseEvaluation =
                await validateSWUTeamQuestionResponseEvaluation(
                  connection,
                  proposalId,
                  request.session.user.id,
                  request.session
                );

              if (isInvalid(validatedSWUTeamQuestionResponseEvaluation)) {
                return invalid({
                  opportunity: adt(
                    "submitIndividualQuestionEvaluations" as const,
                    getInvalidValue(
                      validatedSWUTeamQuestionResponseEvaluation,
                      []
                    )
                  )
                });
              }

              if (
                !permissions.editSWUTeamQuestionResponseEvaluation(
                  request.session,
                  swuOpportunity,
                  validatedSWUTeamQuestionResponseEvaluation.value
                )
              ) {
                return invalid({
                  permissions: [permissions.ERROR_MESSAGE]
                });
              }

              if (
                !isValidEvaluationStatusChange(
                  validatedSWUTeamQuestionResponseEvaluation.value.status,
                  SWUTeamQuestionResponseEvaluationStatus.Submitted
                )
              ) {
                return invalid({
                  permissions: [permissions.ERROR_MESSAGE]
                });
              }

              const validatedScores =
                questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationScores(
                  validatedSWUTeamQuestionResponseEvaluation.value.scores,
                  validatedSWUOpportunity.value.teamQuestions
                );

              if (
                isInvalid<
                  CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors[]
                >(validatedScores) ||
                validatedScores.value.length !==
                  validatedSWUOpportunity.value.teamQuestions.length
              ) {
                return invalid({
                  opportunity: adt(
                    "submitIndividualQuestionEvaluations" as const,
                    [
                      "This evaluation could not be submitted for review because it is incomplete. Please edit, complete and save the appropriate form before trying to submit it again."
                    ]
                  )
                });
              }

              if (
                !permissions.submitSWUTeamQuestionResponseEvaluation(
                  request.session,
                  swuOpportunity,
                  validatedSWUTeamQuestionResponseEvaluation.value
                )
              ) {
                return invalid({
                  permissions: [permissions.ERROR_MESSAGE]
                });
              }

              return valid(validatedSWUTeamQuestionResponseEvaluation.value);
            })
          );

          if (!allValid(validations)) {
            return validations.find(
              isInvalid
            ) as Invalid<UpdateValidationErrors>;
          }
          const validatedSubmissionNote =
            questionEvaluationValidation.validateNote(request.body.value.note);
          if (isInvalid(validatedSubmissionNote)) {
            return invalid({
              opportunity: adt(
                "submitIndividualQuestionEvaluations" as const,
                validatedSubmissionNote.value
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("submitIndividualQuestionEvaluations", {
              note: validatedSubmissionNote.value,
              evaluations: validations.map(
                ({ value }) => value
              ) as SWUTeamQuestionResponseEvaluation[]
            })
          } as ValidatedUpdateRequestBody);
        }
        case "submitConsensusQuestionEvaluations": {
          const validations = await Promise.all(
            request.body.value.proposals.map<
              Promise<
                Validation<
                  SWUTeamQuestionResponseEvaluation,
                  UpdateValidationErrors
                >
              >
            >(async (proposalId) => {
              // Satisfy the compiler.
              if (!permissions.isSignedIn(request.session)) {
                return invalid({
                  permissions: [permissions.ERROR_MESSAGE]
                });
              }

              const validatedSWUTeamQuestionResponseEvaluation =
                await validateSWUTeamQuestionResponseEvaluation(
                  connection,
                  proposalId,
                  request.session.user.id,
                  request.session,
                  true
                );

              if (isInvalid(validatedSWUTeamQuestionResponseEvaluation)) {
                return invalid({
                  opportunity: adt(
                    "submitConsensusQuestionEvaluations" as const,
                    getInvalidValue(
                      validatedSWUTeamQuestionResponseEvaluation,
                      []
                    )
                  )
                });
              }

              if (
                !permissions.editSWUTeamQuestionResponseConsensus(
                  request.session,
                  swuOpportunity,
                  validatedSWUTeamQuestionResponseEvaluation.value
                )
              ) {
                return invalid({
                  permissions: [permissions.ERROR_MESSAGE]
                });
              }

              if (
                !isValidConsensusStatusChange(
                  validatedSWUTeamQuestionResponseEvaluation.value.status,
                  SWUTeamQuestionResponseEvaluationStatus.Submitted
                )
              ) {
                return invalid({
                  permissions: [permissions.ERROR_MESSAGE]
                });
              }

              const validatedScores =
                questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationScores(
                  validatedSWUTeamQuestionResponseEvaluation.value.scores,
                  validatedSWUOpportunity.value.teamQuestions
                );

              if (
                isInvalid<
                  CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors[]
                >(validatedScores) ||
                validatedScores.value.length !==
                  validatedSWUOpportunity.value.teamQuestions.length
              ) {
                return invalid({
                  opportunity: adt(
                    "submitConsensusQuestionEvaluations" as const,
                    [
                      "This evaluation could not be submitted for review because it is incomplete. Please edit, complete and save the appropriate form before trying to submit it again."
                    ]
                  )
                });
              }

              if (
                !permissions.submitSWUTeamQuestionResponseConsensus(
                  request.session,
                  swuOpportunity,
                  validatedSWUTeamQuestionResponseEvaluation.value
                )
              ) {
                return invalid({
                  permissions: [permissions.ERROR_MESSAGE]
                });
              }

              return valid(validatedSWUTeamQuestionResponseEvaluation.value);
            })
          );

          if (!allValid(validations)) {
            return validations.find(
              isInvalid
            ) as Invalid<UpdateValidationErrors>;
          }
          const validatedSubmissionNote =
            questionEvaluationValidation.validateNote(request.body.value.note);
          if (isInvalid(validatedSubmissionNote)) {
            return invalid({
              opportunity: adt(
                "submitConsensusQuestionEvaluations" as const,
                validatedSubmissionNote.value
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("submitConsensusQuestionEvaluations", {
              note: validatedSubmissionNote.value,
              evaluations: validations.map(
                ({ value }) => value
              ) as SWUTeamQuestionResponseEvaluation[]
            })
          } as ValidatedUpdateRequestBody);
        }
        case "editEvaluationPanel": {
          if (!canChangeEvaluationPanel(swuOpportunity)) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          const validatedEvaluationPanel =
            await validateSWUEvaluationPanelMembers(
              connection,
              request.body.value
            );
          if (
            isInvalid<CreateSWUEvaluationPanelMemberValidationErrors[]>(
              validatedEvaluationPanel
            )
          ) {
            return invalid({
              opportunity: adt("editEvaluationPanel" as const, {
                evaluationPanel: validatedEvaluationPanel.value
              })
            });
          }

          // status: CreateSWUOpportunityStatus;
          // session: AuthenticatedSession;
          // inceptionPhase?: ValidatedCreateSWUOpportunityPhaseBody;
          // prototypePhase?: ValidatedCreateSWUOpportunityPhaseBody;
          // implementationPhase: ValidatedCreateSWUOpportunityPhaseBody;
          // teamQuestions: CreateSWUTeamQuestionBody[];
          // evaluationPanel: CreateSWUEvaluationPanelMemberBody[];
          return valid({
            session: request.session,
            body: adt("editEvaluationPanel" as const, {
              ...omit(
                swuOpportunity,
                "createdAt",
                "updatedAt",
                "createdBy",
                "updatedBy",
                "status",
                "id",
                "addenda",
                "history",
                "publishedAt",
                "subscribed",
                "codeChallengeEndDate",
                "teamScenarioEndDate",
                "evaluationPanel",
                "reporting"
              ),
              evaluationPanel: validatedEvaluationPanel.value
            })
          } as ValidatedUpdateRequestBody);
        }
        default:
          return invalid({ opportunity: adt("parseFailure" as const) });
      }
    },
    respond: wrapRespond({
      valid: async (request) => {
        let dbResult: Validation<SWUOpportunity, null>;
        const { session, body } = request.body;
        const doNotNotify = [
          SWUOpportunityStatus.Draft,
          SWUOpportunityStatus.Canceled
        ];
        const existingOpportunity = getValidValue(
          await db.readOneSWUOpportunity(
            connection,
            request.params.id,
            session
          ),
          null
        );
        switch (body.tag) {
          case "edit":
            dbResult = await db.updateSWUOpportunityVersion(
              connection,
              {
                ...body.value,
                evaluationPanel:
                  existingOpportunity?.evaluationPanel?.map((member) => ({
                    ...member,
                    user: member.user.id
                  })) ?? [],
                id: request.params.id
              },
              session
            );
            /**
             * Notify all subscribed users on the opportunity of the update
             * (only if not draft status)
             */
            if (
              isValid(dbResult) &&
              !Object.values(doNotNotify).includes(dbResult.value.status)
            ) {
              swuOpportunityNotifications.handleSWUUpdated(
                connection,
                dbResult.value
              );
            }
            break;
          case "submitForReview":
            dbResult = await db.updateSWUOpportunityStatus(
              connection,
              request.params.id,
              SWUOpportunityStatus.UnderReview,
              body.value,
              session
            );
            //Notify of submission
            if (isValid(dbResult)) {
              swuOpportunityNotifications.handleSWUSubmittedForReview(
                connection,
                dbResult.value
              );
            }
            break;
          case "publish": {
            dbResult = await db.updateSWUOpportunityStatus(
              connection,
              request.params.id,
              SWUOpportunityStatus.Published,
              body.value,
              session
            );
            // Notify all users with notifications on of the new opportunity
            if (isValid(dbResult)) {
              swuOpportunityNotifications.handleSWUPublished(
                connection,
                dbResult.value
              );
            }
            break;
          }
          case "startCodeChallenge":
            dbResult = await db.updateSWUOpportunityStatus(
              connection,
              request.params.id,
              SWUOpportunityStatus.EvaluationCodeChallenge,
              body.value,
              session
            );
            break;
          case "startTeamScenario":
            dbResult = await db.updateSWUOpportunityStatus(
              connection,
              request.params.id,
              SWUOpportunityStatus.EvaluationTeamScenario,
              body.value,
              session
            );
            break;
          case "cancel":
            dbResult = await db.updateSWUOpportunityStatus(
              connection,
              request.params.id,
              SWUOpportunityStatus.Canceled,
              body.value,
              session
            );
            // Notify all subscribed users of cancellation
            if (isValid(dbResult)) {
              swuOpportunityNotifications.handleSWUCancelled(
                connection,
                dbResult.value
              );
            }
            break;
          case "addAddendum":
            dbResult = await db.addSWUOpportunityAddendum(
              connection,
              request.params.id,
              body.value,
              session
            );
            /**
             * Notify all subscribed users on the opportunity of the update
             * unless it's been cancelled
             */
            if (
              isValid(dbResult) &&
              !Object.values(doNotNotify).includes(dbResult.value.status)
            ) {
              swuOpportunityNotifications.handleSWUUpdated(
                connection,
                dbResult.value
              );
            }
            break;
          case "addNote":
            dbResult = await db.addSWUOpportunityNote(
              connection,
              request.params.id,
              body.value,
              session
            );
            break;
          case "submitIndividualQuestionEvaluations":
            dbResult = await db.submitIndividualSWUQuestionEvaluations(
              connection,
              request.params.id,
              body.value,
              session
            );
            break;
          case "submitConsensusQuestionEvaluations":
            dbResult = await db.submitConsensusSWUQuestionEvaluations(
              connection,
              request.params.id,
              body.value,
              session
            );
            if (isValid(dbResult)) {
              swuOpportunityNotifications.handleSWUQuestionConsensusSubmitted(
                connection,
                dbResult.value
              );
            }
            break;
          case "editEvaluationPanel":
            dbResult = await db.updateSWUOpportunityVersion(
              connection,
              { ...body.value, id: request.params.id },
              session
            );
            if (isValid(dbResult)) {
              swuOpportunityNotifications.handleSWUPanelChange(
                connection,
                dbResult.value,
                existingOpportunity
              );
            }
            break;
          case "finalizeQuestionConsensuses":
            dbResult = await db.finalizeSWUQuestionConsensus(
              connection,
              request.params.id,
              body.value,
              session
            );
            if (isValid(dbResult)) {
              swuOpportunityNotifications.handleSWUQuestionConsensusFinalized(
                connection,
                dbResult.value
              );
            }
            break;
        }
        if (isInvalid(dbResult)) {
          return basicResponse(
            503,
            request.session,
            makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
          );
        }
        return basicResponse(
          200,
          request.session,
          makeJsonResponseBody(dbResult.value)
        );
      },
      invalid: async (request) => {
        return basicResponse(
          400,
          request.session,
          makeJsonResponseBody(request.body)
        );
      }
    })
  };
};

const delete_: crud.Delete<
  Session,
  db.Connection,
  ValidatedDeleteRequestBody,
  DeleteValidationErrors
> = (connection: db.Connection) => {
  return {
    async validateRequestBody(request) {
      const validatedSWUOpportunity = await validateSWUOpportunityId(
        connection,
        request.params.id,
        request.session
      );
      if (isInvalid(validatedSWUOpportunity)) {
        return invalid({ notFound: ["Opportunity not found."] });
      }
      if (
        !(await permissions.deleteSWUOpportunity(
          connection,
          request.session,
          request.params.id,
          validatedSWUOpportunity.value.status
        ))
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      return valid(validatedSWUOpportunity.value.id);
    },
    respond: wrapRespond({
      valid: async (request) => {
        const dbResult = await db.deleteSWUOpportunity(
          connection,
          request.body,
          request.session
        );
        if (isInvalid(dbResult)) {
          return basicResponse(
            503,
            request.session,
            makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
          );
        }
        return basicResponse(
          200,
          request.session,
          makeJsonResponseBody(dbResult.value)
        );
      },
      invalid: async (request) => {
        return basicResponse(
          400,
          request.session,
          makeJsonResponseBody(request.body)
        );
      }
    })
  };
};

/**
 * Resources defined here are exported for use in the router
 *
 * @see {@link createRouter} in 'src/back-end/index.ts'
 */
const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  readOne,
  readMany,
  create,
  update,
  delete: delete_
};

export default resource;
