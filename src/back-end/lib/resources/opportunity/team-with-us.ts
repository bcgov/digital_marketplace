// import { FileRecord } from "back-end/../shared/lib/resources/file";
import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as twuOpportunityNotifications from "back-end/lib/mailer/notifications/opportunity/team-wtih-us";
import * as permissions from "back-end/lib/permissions";
import {
  basicResponse,
  JsonResponseBody,
  makeJsonResponseBody,
  nullRequestBodyHandler,
  wrapRespond
} from "back-end/lib/server";
import { validateAttachments } from "back-end/lib/validation";
import { get, omit } from "lodash";
import {
  addDays,
  //   getBoolean,
  getNumber,
  getString,
  getStringArray
} from "shared/lib";
import { invalid } from "shared/lib/http";
import {
  CreateRequestBody as SharedCreateRequestBody,
  CreateTWUOpportunityStatus,
  CreateTWUResourceQuestionBody,
  CreateTWUResourceQuestionValidationErrors,
  CreateValidationErrors,
  //   DeleteValidationErrors,
  //   editableOpportunityStatuses,
  //   isValidStatusChange,
  TWUOpportunity,
  TWUOpportunitySlim,
  TWUOpportunityStatus
  //   UpdateRequestBody as SharedUpdateRequestBody,
  //   UpdateValidationErrors,
  //   UpdateWithNoteRequestBody
} from "shared/lib/resources/opportunity/team-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
// import { ADT, Id } from "shared/lib/types";
import {
  allValid,
  getInvalidValue,
  getValidValue,
  isInvalid,
  //   isValid,
  //   optional,
  valid,
  validateUUID
  //   Validation
} from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/team-with-us";

interface ValidatedCreateRequestBody
  extends Omit<
    TWUOpportunity,
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
    | "resourceQuestions"
    | "challengeEndDate"
  > {
  status: CreateTWUOpportunityStatus;
  session: AuthenticatedSession;
  resourceQuestions: CreateTWUResourceQuestionBody[];
}

// interface ValidatedUpdateRequestBody {
//   session: AuthenticatedSession;
//   body:
//     | ADT<"edit", ValidatedUpdateEditRequestBody>
//     | ADT<"submitForReview", string>
//     | ADT<"publish", string>
//     | ADT<"startChallenge", string>
//     | ADT<"suspend", string>
//     | ADT<"cancel", string>
//     | ADT<"addAddendum", string>
//     | ADT<"addNote", ValidatedUpdateWithNoteRequestBody>;
// }

// type ValidatedUpdateEditRequestBody = Omit<
//   ValidatedCreateRequestBody,
//   "status" | "session"
// >;

// interface ValidatedUpdateWithNoteRequestBody
//   extends Omit<UpdateWithNoteRequestBody, "attachments"> {
//   attachments: FileRecord[];
// }

// type ValidatedDeleteRequestBody = Id;

type CreateRequestBody = Omit<SharedCreateRequestBody, "status"> & {
  status: string;
};

// type UpdateRequestBody = SharedUpdateRequestBody | null;

const routeNamespace = "opportunities/team-with-us";

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<TWUOpportunitySlim[] | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: TWUOpportunitySlim[] | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    const dbResult = await db.readManyTWUOpportunities(
      connection,
      request.session
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
    JsonResponseBody<TWUOpportunity | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: TWUOpportunity | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    // Validate the provided id
    const validatedId = validateUUID(request.params.id);
    if (isInvalid(validatedId)) {
      return respond(400, validatedId.value);
    }
    const dbResult = await db.readOneTWUOpportunity(
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
        remoteOk: get(body, "remoteOk"),
        remoteDesc: getString(body, "remoteDesc"),
        location: getString(body, "location"),
        // Can't use undefined as fallback for minTeamMembers
        // as getNumber will default it to zero.
        minTeamMembers: getNumber<null>(body, "minTeamMembers", null),
        mandatorySkills: getStringArray(body, "mandatorySkills"),
        optionalSkills: getStringArray(body, "optionalSkills"),
        description: getString(body, "description"),
        proposalDeadline: getString(body, "proposalDeadline"),
        assignmentDate: getString(body, "assignmentDate"),
        questionsWeight: getNumber(body, "questionsWeight"),
        challengeWeight: getNumber(body, "challengeWeight"),
        scenarioWeight: getNumber(body, "scenarioWeight"),
        priceWeight: getNumber(body, "priceWeight"),
        attachments: getStringArray(body, "attachments"),
        status: getString(body, "status"),
        inceptionPhase: get(body, "inceptionPhase"),
        prototypePhase: get(body, "prototypePhase"),
        implementationPhase: get(body, "implementationPhase"),
        resourceQuestions: get(body, "resourceQuestions")
      };
    },
    async validateRequestBody(request) {
      const {
        title,
        teaser,
        remoteOk,
        remoteDesc,
        location,
        mandatorySkills,
        optionalSkills,
        description,
        proposalDeadline,
        assignmentDate,
        questionsWeight,
        challengeWeight,
        priceWeight,
        attachments,
        status,
        resourceQuestions
      } = request.body;

      const validatedStatus =
        opportunityValidation.validateCreateTWUOpportunityStatus(status);
      if (isInvalid(validatedStatus)) {
        return invalid({
          status: validatedStatus.value
        });
      }

      if (
        !permissions.createTWUOpportunity(
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
        opportunityValidation.validateAssignmentDate(
          assignmentDate,
          getValidValue(validatedProposalDeadline, now)
        );

      // Do not validate other fields if the opportunity a draft
      if (validatedStatus.value === TWUOpportunityStatus.Draft) {
        const defaultDate = addDays(new Date(), 14);
        return valid({
          title,
          teaser,
          remoteOk,
          remoteDesc,
          location,
          mandatorySkills,
          optionalSkills,
          description,
          questionsWeight,
          challengeWeight,
          priceWeight,
          session,
          status: validatedStatus.value,
          attachments: validatedAttachments.value,
          resourceQuestions: resourceQuestions
            ? resourceQuestions.map((v) => ({
                question: getString(v, "question"),
                guideline: getString(v, "guideline"),
                score: getNumber(v, "score"),
                wordLimit: getNumber(v, "wordLimit"),
                order: getNumber(v, "order")
              }))
            : [],
          // Coerce validated dates to default values
          proposalDeadline: getValidValue(
            validatedProposalDeadline,
            defaultDate
          ),
          assignmentDate: getValidValue(validatedAssignmentDate, defaultDate)
        });
      }

      const validatedTitle = opportunityValidation.validateTitle(title);
      const validatedTeaser = opportunityValidation.validateTeaser(teaser);
      const validatedRemoteOk =
        opportunityValidation.validateRemoteOk(remoteOk);
      const validatedRemoteDesc = opportunityValidation.validateRemoteDesc(
        remoteDesc,
        getValidValue(validatedRemoteOk, false)
      );
      const validatedLocation =
        opportunityValidation.validateLocation(location);
      const validatedMandatorySkills =
        opportunityValidation.validateMandatorySkills(mandatorySkills);
      const validatedOptionalSkills =
        opportunityValidation.validateOptionalSkills(optionalSkills);
      const validatedDescription =
        opportunityValidation.validateDescription(description);
      const validatedQuestionsWeight =
        opportunityValidation.validateQuestionsWeight(questionsWeight);
      const validatedChallengeWeight =
        opportunityValidation.validateChallengeWeight(challengeWeight);
      const validatedPriceWeight =
        opportunityValidation.validatePriceWeight(priceWeight);
      const validatedResourceQuestions =
        opportunityValidation.validateResourceQuestions(resourceQuestions);

      if (
        allValid([
          validatedTitle,
          validatedTeaser,
          validatedRemoteOk,
          validatedRemoteDesc,
          validatedLocation,
          validatedMandatorySkills,
          validatedOptionalSkills,
          validatedDescription,
          validatedQuestionsWeight,
          validatedChallengeWeight,
          validatedPriceWeight,
          validatedResourceQuestions,
          validatedProposalDeadline,
          validatedAssignmentDate,
          validatedAttachments,
          validatedStatus
        ])
      ) {
        // Ensure that score weights total 100%
        if (
          getValidValue(validatedQuestionsWeight, 0) +
            getValidValue(validatedChallengeWeight, 0) +
            getValidValue(validatedPriceWeight, 0) !==
          100
        ) {
          return invalid({
            scoreWeights: ["The scoring weights must total 100%."]
          });
        }

        return valid({
          session,
          title: validatedTitle.value,
          teaser: validatedTeaser.value,
          remoteOk: validatedRemoteOk.value,
          remoteDesc: validatedRemoteDesc.value,
          location: validatedLocation.value,
          mandatorySkills: validatedMandatorySkills.value,
          optionalSkills: validatedOptionalSkills.value,
          description: validatedDescription.value,
          questionsWeight: validatedQuestionsWeight.value,
          challengeWeight: validatedChallengeWeight.value,
          priceWeight: validatedPriceWeight.value,
          resourceQuestions: validatedResourceQuestions.value,
          proposalDeadline: validatedProposalDeadline.value,
          assignmentDate: validatedAssignmentDate.value,
          attachments: validatedAttachments.value,
          status: validatedStatus.value
        } as ValidatedCreateRequestBody);
      } else {
        return invalid({
          title: getInvalidValue(validatedTitle, undefined),
          teaser: getInvalidValue(validatedTeaser, undefined),
          remoteOk: getInvalidValue(validatedRemoteOk, undefined),
          remoteDesc: getInvalidValue(validatedRemoteDesc, undefined),
          location: getInvalidValue(validatedLocation, undefined),
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
          challengeWeight: getInvalidValue(validatedChallengeWeight, undefined),
          priceWeight: getInvalidValue(validatedPriceWeight, undefined),
          resourceQuestions: getInvalidValue<
            CreateTWUResourceQuestionValidationErrors[],
            undefined
          >(validatedResourceQuestions, undefined),
          proposalDeadline: getInvalidValue(
            validatedProposalDeadline,
            undefined
          ),
          assignmentDate: getInvalidValue(validatedAssignmentDate, undefined)
        });
      }
    },
    respond: wrapRespond<
      ValidatedCreateRequestBody,
      CreateValidationErrors,
      JsonResponseBody<TWUOpportunity>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const dbResult = await db.createTWUOpportunity(
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
        if (dbResult.value.status === TWUOpportunityStatus.UnderReview) {
          twuOpportunityNotifications.handleTWUSubmittedForReview(
            connection,
            dbResult.value
          );
        }
        // If published, notify subscribed users
        if (dbResult.value.status === TWUOpportunityStatus.Published) {
          twuOpportunityNotifications.handleTWUPublished(
            connection,
            dbResult.value,
            false
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

const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  readOne,
  readMany,
  create
  // update,
  // delete: delete_
};

export default resource;
