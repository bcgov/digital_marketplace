import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  basicResponse,
  JsonResponseBody,
  makeJsonResponseBody,
  nullRequestBodyHandler,
  wrapRespond
} from "back-end/lib/server";
import {
  validateAttachments
  // validateTWUOpportunityId
} from "back-end/lib/validation";
import { get, omit } from "lodash";
import { addDays, getNumber, getString, getStringArray } from "shared/lib";
import { invalid } from "shared/lib/http";
import {
  CreateRequestBody as SharedCreateRequestBody,
  CreateTWUOpportunityStatus,
  CreateTWUResourceQuestionBody,
  CreateTWUResourceQuestionValidationErrors,
  CreateValidationErrors,
  TWUOpportunity,
  TWUOpportunitySlim,
  TWUOpportunityStatus,
  TWUServiceArea
  // DeleteValidationErrors,
  // isValidStatusChange,
  // UpdateValidationErrors
} from "shared/lib/resources/opportunity/team-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import {
  allValid,
  getInvalidValue,
  getValidValue,
  isInvalid,
  // isValid,
  // mapValid,
  valid,
  validateUUID
  // Validation
} from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/team-with-us";
import * as genericValidation from "shared/lib/validation/opportunity/utility";
// import {adt} from 'shared/lib/types';
import * as twuOpportunityNotifications from "back-end/lib/mailer/notifications/opportunity/team-with-us";

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
    | "resourceQuestions"
    | "challengeEndDate"
  > {
  status: CreateTWUOpportunityStatus;
  session: AuthenticatedSession;
  resourceQuestions: CreateTWUResourceQuestionBody[];
}

type CreateRequestBody = Omit<
  SharedCreateRequestBody,
  "status" | "serviceArea"
> & {
  status: string;
  serviceArea: string;
};

/**
 * Defined for use in the router
 *
 * @see {@link resource}
 */
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

/**
 * Reads one TWU opportunity from the database.
 *
 * @param connection - database connection
 * @returns - a response code, and a value
 */
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

/**
 * Creates a new Team With Us Opportunity.
 *
 * @remarks
 *
 * Handles both the request and response. Sequence is to parse
 * the request, validate fields, create the opportunity and
 * generate the response. It also triggers notifications (email)
 * in certain conditions, such as if the status of the opportunity
 * changes to publish.
 *
 *
 * @param connection - database connection
 * @returns - a response body that is valid or invalid
 */
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
        mandatorySkills: getStringArray(body, "mandatorySkills"),
        optionalSkills: getStringArray(body, "optionalSkills"),
        serviceArea: getString(body, "serviceArea"),
        targetAllocation: getNumber(body, "targetAllocation"),
        description: getString(body, "description"),
        proposalDeadline: getString(body, "proposalDeadline"),
        assignmentDate: getString(body, "assignmentDate"),
        startDate: getString(body, "startDate"),
        completionDate: getString(body, "completionDate"),
        maxBudget: getNumber(body, "maxBudget"),
        questionsWeight: getNumber(body, "questionsWeight"),
        challengeWeight: getNumber(body, "challengeWeight"),
        priceWeight: getNumber(body, "priceWeight"),
        attachments: getStringArray(body, "attachments"),
        status: getString(body, "status"),
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
        serviceArea,
        targetAllocation,
        description,
        proposalDeadline,
        assignmentDate,
        startDate,
        completionDate,
        maxBudget,
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
        genericValidation.validateDateFormatMinMax(
          assignmentDate,
          getValidValue(validatedProposalDeadline, now)
        );
      // Validate phase start/completion dates now so that we can coerce to defaults for draft
      const validatedStartDate = genericValidation.validateDateFormatMinMax(
        startDate,
        getValidValue(validatedAssignmentDate, now)
      );
      const validatedCompletionDate =
        genericValidation.validateDateFormatMinMax(
          completionDate,
          getValidValue(validatedStartDate, now)
        );
      // Service areas are required for drafts
      const validatedServiceArea =
        opportunityValidation.validateServiceArea(serviceArea);

      // Do not validate other fields if the opportunity a draft
      if (validatedStatus.value === TWUOpportunityStatus.Draft) {
        const defaultDate = addDays(new Date(), 14);
        return valid({
          ...request.body,
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
          assignmentDate: getValidValue(validatedAssignmentDate, defaultDate),
          startDate: getValidValue(validatedStartDate, defaultDate),
          completionDate: getValidValue(validatedCompletionDate, defaultDate),
          serviceArea: getValidValue(
            validatedServiceArea,
            TWUServiceArea.Developer
          )
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
      const validatedMaxBudget =
        opportunityValidation.validateMaxBudget(maxBudget);
      const validatedMandatorySkills =
        genericValidation.validateMandatorySkills(mandatorySkills);
      const validatedOptionalSkills =
        opportunityValidation.validateOptionalSkills(optionalSkills);
      const validatedTargetAllocation =
        opportunityValidation.validateTargetAllocation(targetAllocation);
      const validatedDescription =
        genericValidation.validateDescription(description);
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
          validatedMaxBudget,
          validatedMandatorySkills,
          validatedOptionalSkills,
          validatedServiceArea,
          validatedTargetAllocation,
          validatedDescription,
          validatedQuestionsWeight,
          validatedChallengeWeight,
          validatedPriceWeight,
          validatedResourceQuestions,
          validatedProposalDeadline,
          validatedAssignmentDate,
          validatedStartDate,
          validatedCompletionDate,
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
          maxBudget: validatedMaxBudget.value,
          mandatorySkills: validatedMandatorySkills.value,
          optionalSkills: validatedOptionalSkills.value,
          serviceArea: validatedServiceArea.value,
          targetAllocation: validatedTargetAllocation.value,
          description: validatedDescription.value,
          questionsWeight: validatedQuestionsWeight.value,
          challengeWeight: validatedChallengeWeight.value,
          priceWeight: validatedPriceWeight.value,
          resourceQuestions: validatedResourceQuestions.value,
          proposalDeadline: validatedProposalDeadline.value,
          assignmentDate: validatedAssignmentDate.value,
          startDate: validatedStartDate.value,
          completionDate: validatedCompletionDate.value,
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
          maxBudget: getInvalidValue(validatedMaxBudget, undefined),
          mandatorySkills: getInvalidValue<string[][], undefined>(
            validatedMandatorySkills,
            undefined
          ),
          optionalSkills: getInvalidValue<string[][], undefined>(
            validatedOptionalSkills,
            undefined
          ),
          serviceArea: getInvalidValue(validatedServiceArea, undefined),
          targetAllocation: getInvalidValue(
            validatedTargetAllocation,
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
          assignmentDate: getInvalidValue(validatedAssignmentDate, undefined),
          startDate: getInvalidValue(validatedStartDate, undefined),
          completionDate: getInvalidValue(validatedCompletionDate, undefined)
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
          await twuOpportunityNotifications.handleTWUSubmittedForReview(
            connection,
            dbResult.value
          );
        }
        // If published, notify subscribed users
        if (dbResult.value.status === TWUOpportunityStatus.Published) {
          await twuOpportunityNotifications.handleTWUPublished(
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

// const update: crud.Update<
//   Session,
//   db.Connection,
//   UpdateRequestBody,
//   ValidatedUpdateRequestBody,
//   UpdateValidationErrors
// > = (connection: db.Connection) => {
//   return {
//     async parseRequestBody(request) {
//       const body = request.body.tag === "json" ? request.body.value : {};
//       const tag = get(body, "tag");
//       const value: unknown = get(body, "value");
//       switch (tag) {
//         case "edit":
//           return adt("edit", {
//             title: getString(value, "title"),
//             teaser: getString(value, "teaser"),
//             remoteOk: get(value, "remoteOk"),
//             remoteDesc: getString(value, "remoteDesc"),
//             location: getString(value, "location"),
//             reward: getNumber<number>(value, "reward"),
//             skills: getStringArray(value, "skills"),
//             description: getString(value, "description"),
//             proposalDeadline: getString(value, "proposalDeadline"),
//             assignmentDate: getString(value, "assignmentDate"),
//             startDate: getString(value, "startDate"),
//             completionDate: getString(value, "completionDate"),
//             submissionInfo: getString(value, "submissionInfo"),
//             acceptanceCriteria: getString(value, "acceptanceCriteria"),
//             evaluationCriteria: getString(value, "evaluationCriteria"),
//             attachments: getStringArray(value, "attachments")
//           });
//         case "publish":
//           return adt("publish", getString(body, "value", ""));
//         case "suspend":
//           return adt("suspend", getString(body, "value", ""));
//         case "cancel":
//           return adt("cancel", getString(body, "value", ""));
//         case "addAddendum":
//           return adt("addAddendum", getString(body, "value", ""));
//         case "addNote":
//           return adt("addNote", {
//             note: getString(value, "note"),
//             attachments: getStringArray(value, "attachments")
//           });
//         default:
//           return null;
//       }
//     },
//     async validateRequestBody(request) {
//       if (!request.body) {
//         return invalid({ opportunity: adt("parseFailure" as const) });
//       }
//
//       const validatedTWUOpportunity = await validateTWUOpportunityId(
//         connection,
//         request.params.id,
//         request.session
//       );
//       if (isInvalid(validatedTWUOpportunity)) {
//         return invalid({
//           notFound: ["The specified opportunity does not exist."]
//         });
//       }
//       const twuOpportunity = validatedTWUOpportunity.value;
//
//       if (
//         !(await permissions.editTWUOpportunity(
//           connection,
//           request.session,
//           request.params.id
//         )) ||
//         !permissions.isSignedIn(request.session)
//       ) {
//         return invalid({
//           permissions: [permissions.ERROR_MESSAGE]
//         });
//       }
//
//       switch (request.body.tag) {
//         case "edit": {
//           const {
//             title,
//             teaser,
//             remoteOk,
//             remoteDesc,
//             location,
//             reward,
//             skills,
//             description,
//             proposalDeadline,
//             assignmentDate,
//             startDate,
//             completionDate,
//             submissionInfo,
//             acceptanceCriteria,
//             evaluationCriteria,
//             attachments
//           } = request.body.value;
//
//           // TWU Opportunities can only be edited if they are in DRAFT, PUBLISHED, or SUSPENDED
//           if (
//             ![
//               TWUOpportunityStatus.Draft,
//               TWUOpportunityStatus.Published,
//               TWUOpportunityStatus.Suspended
//             ].includes(twuOpportunity.status)
//           ) {
//             return invalid({
//               permissions: [permissions.ERROR_MESSAGE]
//             });
//           }
//
//           // Attachments must be validated for both drafts and published opportunities.
//           const validatedAttachments = await validateAttachments(
//             connection,
//             attachments
//           );
//           if (isInvalid<string[][]>(validatedAttachments)) {
//             return invalid({
//               opportunity: adt("edit" as const, {
//                 attachments: validatedAttachments.value
//               })
//             });
//           }
//
//           /**
//            * If the existing proposal deadline is in the past,
//            * updates should be validated against that deadline.
//            * The exception to this rule is if the opportunity is
//            * a draft, then the proposal deadline should be validated
//            * against the current date.
//            */
//           const now = new Date();
//           const validatedProposalDeadline =
//             opportunityValidation.validateProposalDeadline(
//               proposalDeadline,
//               twuOpportunity
//             );
//           const validatedAssignmentDate =
//             genericValidation.validateDateFormatMinMax(
//               assignmentDate,
//               getValidValue(validatedProposalDeadline, now)
//             );
//           const validatedStartDate = genericValidation.validateDateFormatMinMax(
//             startDate,
//             getValidValue(validatedAssignmentDate, now)
//           );
//           const validatedCompletionDate = mapValid(
//             genericValidation.validateDateFormatMinMaxOrUndefined(
//               completionDate,
//               getValidValue(validatedStartDate, now)
//             ),
//             (v) => v || null
//           );
//
//           // Do not validate other fields if the opportunity is a draft.
//           if (twuOpportunity.status === TWUOpportunityStatus.Draft) {
//             const defaultDate = addDays(new Date(), 14);
//             return valid({
//               session: request.session,
//               body: adt("edit" as const, {
//                 ...request.body.value,
//                 attachments: validatedAttachments.value,
//                 // Coerce validated dates to default values.
//                 proposalDeadline: getValidValue(
//                   validatedProposalDeadline,
//                   defaultDate
//                 ),
//                 assignmentDate: getValidValue(
//                   validatedAssignmentDate,
//                   defaultDate
//                 ),
//                 startDate: getValidValue(validatedStartDate, defaultDate),
//                 completionDate: getValidValue(validatedCompletionDate, null)
//               })
//             });
//           }
//
//           const validatedTitle = genericValidation.validateTitle(title);
//           const validatedTeaser = genericValidation.validateTeaser(teaser);
//           const validatedRemoteOk =
//             genericValidation.validateRemoteOk(remoteOk);
//           const validatedRemoteDesc = genericValidation.validateRemoteDesc(
//             remoteDesc,
//             getValidValue(validatedRemoteOk, false)
//           );
//           const validatedLocation =
//             genericValidation.validateLocation(location);
//           const validatedReward = opportunityValidation.validateReward(reward);
//           const validatedSkills = opportunityValidation.validateSkills(skills);
//           const validatedDescription =
//             genericValidation.validateDescription(description);
//           const validatedSubmissionInfo =
//             opportunityValidation.validateSubmissionInfo(submissionInfo);
//           const validatedAcceptanceCriteria =
//             opportunityValidation.validateAcceptanceCriteria(
//               acceptanceCriteria
//             );
//           const validatedEvaluationCriteria =
//             opportunityValidation.validateEvaluationCriteria(
//               evaluationCriteria
//             );
//
//           if (
//             allValid([
//               validatedTitle,
//               validatedTeaser,
//               validatedRemoteOk,
//               validatedRemoteDesc,
//               validatedLocation,
//               validatedReward,
//               validatedSkills,
//               validatedDescription,
//               validatedProposalDeadline,
//               validatedAssignmentDate,
//               validatedStartDate,
//               validatedCompletionDate,
//               validatedSubmissionInfo,
//               validatedAcceptanceCriteria,
//               validatedEvaluationCriteria,
//               validatedAttachments
//             ])
//           ) {
//             return valid({
//               session: request.session,
//               body: adt("edit" as const, {
//                 title: validatedTitle.value,
//                 teaser: validatedTeaser.value,
//                 remoteOk: validatedRemoteOk.value,
//                 remoteDesc: validatedRemoteDesc.value,
//                 location: validatedLocation.value,
//                 reward: validatedReward.value,
//                 skills: validatedSkills.value,
//                 description: validatedDescription.value,
//                 proposalDeadline: validatedProposalDeadline.value,
//                 assignmentDate: validatedAssignmentDate.value,
//                 startDate: validatedStartDate.value,
//                 completionDate: validatedCompletionDate.value,
//                 submissionInfo: validatedSubmissionInfo.value,
//                 acceptanceCriteria: validatedAcceptanceCriteria.value,
//                 evaluationCriteria: validatedEvaluationCriteria.value,
//                 attachments: validatedAttachments.value
//               })
//             } as ValidatedUpdateRequestBody);
//           } else {
//             return invalid({
//               opportunity: adt("edit" as const, {
//                 title: getInvalidValue(validatedTitle, undefined),
//                 teaser: getInvalidValue(validatedTeaser, undefined),
//                 remoteOk: getInvalidValue(validatedRemoteOk, undefined),
//                 remoteDesc: getInvalidValue(validatedRemoteDesc, undefined),
//                 location: getInvalidValue(validatedLocation, undefined),
//                 reward: getInvalidValue(validatedReward, undefined),
//                 skills: getInvalidValue<string[][], undefined>(
//                   validatedSkills,
//                   undefined
//                 ),
//                 description: getInvalidValue(validatedDescription, undefined),
//                 proposalDeadline: getInvalidValue(
//                   validatedProposalDeadline,
//                   undefined
//                 ),
//                 assignmentDate: getInvalidValue(
//                   validatedAssignmentDate,
//                   undefined
//                 ),
//                 startDate: getInvalidValue(validatedStartDate, undefined),
//                 completionDate: getInvalidValue(
//                   validatedCompletionDate,
//                   undefined
//                 ),
//                 submissionInfo: getInvalidValue(
//                   validatedSubmissionInfo,
//                   undefined
//                 ),
//                 acceptanceCriteria: getInvalidValue(
//                   validatedAcceptanceCriteria,
//                   undefined
//                 ),
//                 evaluationCriteria: getInvalidValue(
//                   validatedEvaluationCriteria,
//                   undefined
//                 )
//               })
//             });
//           }
//         }
//         case "publish": {
//           if (
//             !isValidStatusChange(
//               validatedTWUOpportunity.value.status,
//               TWUOpportunityStatus.Published
//             )
//           ) {
//             return invalid({ permissions: [permissions.ERROR_MESSAGE] });
//           }
//           // Perform validation on draft to ensure it's ready for publishing
//           if (
//             !allValid([
//               genericValidation.validateTitle(
//                 validatedTWUOpportunity.value.title
//               ),
//               genericValidation.validateTeaser(
//                 validatedTWUOpportunity.value.teaser
//               ),
//               genericValidation.validateRemoteOk(
//                 validatedTWUOpportunity.value.remoteOk
//               ),
//               genericValidation.validateRemoteDesc(
//                 validatedTWUOpportunity.value.remoteDesc,
//                 validatedTWUOpportunity.value.remoteOk
//               ),
//               genericValidation.validateLocation(
//                 validatedTWUOpportunity.value.location
//               ),
//               opportunityValidation.validateReward(
//                 validatedTWUOpportunity.value.reward
//               ),
//               opportunityValidation.validateSkills(
//                 validatedTWUOpportunity.value.skills
//               ),
//               genericValidation.validateDescription(
//                 validatedTWUOpportunity.value.description
//               ),
//               opportunityValidation.validateSubmissionInfo(
//                 validatedTWUOpportunity.value.submissionInfo
//               ),
//               opportunityValidation.validateAcceptanceCriteria(
//                 validatedTWUOpportunity.value.acceptanceCriteria
//               ),
//               opportunityValidation.validateEvaluationCriteria(
//                 validatedTWUOpportunity.value.evaluationCriteria
//               )
//             ])
//           ) {
//             return invalid({
//               opportunity: adt("publish" as const, [
//                 "This opportunity could not be published because it is incomplete. Please edit, complete and save the form below before trying to publish it again."
//               ])
//             });
//           }
//
//           const validatedPublishNote = opportunityValidation.validateNote(
//             request.body.value
//           );
//           if (isInvalid(validatedPublishNote)) {
//             return invalid({
//               opportunity: adt("publish" as const, validatedPublishNote.value)
//             });
//           }
//           return valid({
//             session: request.session,
//             body: adt("publish", validatedPublishNote.value)
//           } as ValidatedUpdateRequestBody);
//         }
//         case "suspend": {
//           if (
//             !isValidStatusChange(
//               validatedTWUOpportunity.value.status,
//               TWUOpportunityStatus.Suspended
//             )
//           ) {
//             return invalid({ permissions: [permissions.ERROR_MESSAGE] });
//           }
//           const validatedSuspendNote = opportunityValidation.validateNote(
//             request.body.value
//           );
//           if (isInvalid(validatedSuspendNote)) {
//             return invalid({
//               opportunity: adt("suspend" as const, validatedSuspendNote.value)
//             });
//           }
//           return valid({
//             session: request.session,
//             body: adt("suspend", validatedSuspendNote.value)
//           } as ValidatedUpdateRequestBody);
//         }
//         case "cancel": {
//           if (
//             !isValidStatusChange(
//               validatedTWUOpportunity.value.status,
//               TWUOpportunityStatus.Canceled
//             )
//           ) {
//             return invalid({ permissions: [permissions.ERROR_MESSAGE] });
//           }
//           const validatedCancelNote = opportunityValidation.validateNote(
//             request.body.value
//           );
//           if (isInvalid(validatedCancelNote)) {
//             return invalid({
//               opportunity: adt("cancel" as const, validatedCancelNote.value)
//             });
//           }
//           return valid({
//             session: request.session,
//             body: adt("cancel", validatedCancelNote.value)
//           } as ValidatedUpdateRequestBody);
//         }
//         case "addAddendum": {
//           if (
//             validatedTWUOpportunity.value.status === TWUOpportunityStatus.Draft
//           ) {
//             return invalid({ permissions: [permissions.ERROR_MESSAGE] });
//           }
//           const validatedAddendumText =
//             opportunityValidation.validateAddendumText(request.body.value);
//           if (isInvalid(validatedAddendumText)) {
//             return invalid({
//               opportunity: adt(
//                 "addAddendum" as const,
//                 validatedAddendumText.value
//               )
//             });
//           }
//           return valid({
//             session: request.session,
//             body: adt("addAddendum", validatedAddendumText.value)
//           } as ValidatedUpdateRequestBody);
//         }
//
//         case "addNote": {
//           const { note, attachments: noteAttachments } = request.body.value;
//           const validatedNote = opportunityValidation.validateNote(note); //TODO changed to validateNote from validateHistoryNote as note-taking was removed from shared
//           const validatedNoteAttachments = await validateAttachments(
//             connection,
//             noteAttachments
//           );
//           if (allValid([validatedNote, validatedNoteAttachments])) {
//             return valid({
//               session: request.session,
//               body: adt("addNote", {
//                 note: validatedNote.value,
//                 attachments: validatedNoteAttachments.value
//               })
//             } as ValidatedUpdateRequestBody);
//           } else {
//             return invalid({
//               opportunity: adt("addNote" as const, {
//                 note: getInvalidValue(validatedNote, undefined),
//                 attachments: getInvalidValue<string[][], undefined>(
//                   validatedNoteAttachments,
//                   undefined
//                 )
//               })
//             });
//           }
//         }
//         default:
//           return invalid({ opportunity: adt("parseFailure" as const) });
//       }
//     },
//     respond: wrapRespond({
//       valid: async (request) => {
//         let dbResult: Validation<TWUOpportunity, null>;
//         const { session, body } = request.body;
//         switch (body.tag) {
//           case "edit":
//             dbResult = await db.updateTWUOpportunityVersion(
//               connection,
//               { ...body.value, id: request.params.id },
//               session
//             );
//             // Notify all subscribed users on the opportunity of the update (only if not draft)
//             if (
//               isValid(dbResult) &&
//               dbResult.value.status !== TWUOpportunityStatus.Draft
//             ) {
//               twuOpportunityNotifications.handleTWUUpdated(
//                 connection,
//                 dbResult.value
//               );
//             }
//             break;
//           case "publish": {
//             const existingOpportunity = getValidValue(
//               await db.readOneTWUOpportunity(
//                 connection,
//                 request.params.id,
//                 session
//               ),
//               null
//             );
//             dbResult = await db.updateTWUOpportunityStatus(
//               connection,
//               request.params.id,
//               TWUOpportunityStatus.Published,
//               body.value,
//               session
//             );
//             // Notify subscribers of publication
//             if (isValid(dbResult) && permissions.isSignedIn(request.session)) {
//               twuOpportunityNotifications.handleTWUPublished(
//                 connection,
//                 dbResult.value,
//                 existingOpportunity?.status === TWUOpportunityStatus.Suspended
//               );
//             }
//             break;
//           }
//           case "startEvaluation":
//             dbResult = await db.updateTWUOpportunityStatus(
//               connection,
//               request.params.id,
//               TWUOpportunityStatus.Evaluation,
//               body.value,
//               session
//             );
//             break;
//           case "suspend":
//             dbResult = await db.updateTWUOpportunityStatus(
//               connection,
//               request.params.id,
//               TWUOpportunityStatus.Suspended,
//               body.value,
//               session
//             );
//             // Notify subscribers of suspension
//             if (isValid(dbResult) && permissions.isSignedIn(request.session)) {
//               twuOpportunityNotifications.handleTWUSuspended(
//                 connection,
//                 dbResult.value
//               );
//             }
//             break;
//           case "cancel":
//             dbResult = await db.updateTWUOpportunityStatus(
//               connection,
//               request.params.id,
//               TWUOpportunityStatus.Canceled,
//               body.value,
//               session
//             );
//             // Notify subscribers of cancellation
//             if (isValid(dbResult) && permissions.isSignedIn(request.session)) {
//               twuOpportunityNotifications.handleTWUCancelled(
//                 connection,
//                 dbResult.value
//               );
//             }
//             break;
//           case "addAddendum":
//             dbResult = await db.addTWUOpportunityAddendum(
//               connection,
//               request.params.id,
//               body.value,
//               session
//             );
//             // Notify all subscribed users on the opportunity of the update
//             if (isValid(dbResult)) {
//               twuOpportunityNotifications.handleTWUUpdated(
//                 connection,
//                 dbResult.value
//               );
//             }
//             break;
//           case "addNote":
//             dbResult = await db.addTWUOpportunityNote(
//               connection,
//               request.params.id,
//               body.value,
//               session
//             );
//             break;
//         }
//         if (isInvalid(dbResult)) {
//           return basicResponse(
//             503,
//             request.session,
//             makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
//           );
//         }
//         return basicResponse(
//           200,
//           request.session,
//           makeJsonResponseBody(dbResult.value)
//         );
//       },
//       invalid: async (request) => {
//         return basicResponse(
//           400,
//           request.session,
//           makeJsonResponseBody(request.body)
//         );
//       }
//     })
//   };
// };

// const delete_: crud.Delete<
//   Session,
//   db.Connection,
//   ValidatedDeleteRequestBody,
//   DeleteValidationErrors
// > = (connection: db.Connection) => {
//   return {
//     async validateRequestBody(request) {
//       if (
//         !(await permissions.deleteTWUOpportunity(
//           connection,
//           request.session,
//           request.params.id
//         ))
//       ) {
//         return invalid({
//           permissions: [permissions.ERROR_MESSAGE]
//         });
//       }
//       const validatedTWUOpportunity = await validateTWUOpportunityId(
//         connection,
//         request.params.id,
//         request.session
//       );
//       if (isInvalid(validatedTWUOpportunity)) {
//         return invalid({ notFound: ["Opportunity not found."] });
//       }
//       if (validatedTWUOpportunity.value.status !== TWUOpportunityStatus.Draft) {
//         return invalid({ permissions: [permissions.ERROR_MESSAGE] });
//       }
//       return valid(validatedTWUOpportunity.value.id);
//     },
//     respond: wrapRespond({
//       valid: async (request) => {
//         const dbResult = await db.deleteTWUOpportunity(
//           connection,
//           request.body
//         );
//         if (isInvalid(dbResult)) {
//           return basicResponse(
//             503,
//             request.session,
//             makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
//           );
//         }
//         return basicResponse(
//           200,
//           request.session,
//           makeJsonResponseBody(dbResult.value)
//         );
//       },
//       invalid: async (request) => {
//         return basicResponse(
//           400,
//           request.session,
//           makeJsonResponseBody(request.body)
//         );
//       }
//     })
//   };
// };

/**
 * Resources defined here are exported for use in the router
 *
 * @see {@link createRouter} in 'src/back-end/index.ts'
 */
const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  readOne,
  readMany,
  create
  // update,
  // delete: _delete
};

export default resource;
