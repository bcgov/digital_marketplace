import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as twuProposalNotifications from "back-end/lib/mailer/notifications/proposal/team-with-us";
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
  validateOrganizationId,
  validateTWUProposalTeamMembers,
  validateTWUOpportunityId,
  validateTWUProposalId,
  validateDraftProposalOrganization
} from "back-end/lib/validation";
import { get, omit } from "lodash";
import { getNumber, getString, getStringArray } from "shared/lib";
import { FileRecord } from "shared/lib/resources/file";
import {
  CreateTWUResourceQuestionValidationErrors,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import { OrganizationSlim } from "shared/lib/resources/organization";
import {
  CreateRequestBody as SharedCreateRequestBody,
  CreateTWUProposalTeamMemberValidationErrors,
  CreateValidationErrors,
  DeleteValidationErrors,
  isValidStatusChange,
  TWUProposal,
  TWUProposalSlim,
  TWUProposalStatus,
  UpdateResourceQuestionScoreBody,
  UpdateEditValidationErrors,
  UpdateRequestBody as SharedUpdateRequestBody,
  UpdateResourceQuestionScoreValidationErrors,
  UpdateValidationErrors
} from "shared/lib/resources/proposal/team-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { ADT, adt, Id } from "shared/lib/types";
import {
  allValid,
  getInvalidValue,
  getValidValue,
  invalid,
  isInvalid,
  isValid,
  optionalAsync,
  valid,
  Validation
} from "shared/lib/validation";
import * as proposalValidation from "shared/lib/validation/proposal/team-with-us";

interface ValidatedCreateRequestBody
  extends Omit<SharedCreateRequestBody, "attachments"> {
  session: AuthenticatedSession;
  attachments: FileRecord[];
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body:
    | ADT<"edit", ValidatedUpdateEditRequestBody>
    | ADT<"submit", string>
    | ADT<"scoreQuestions", UpdateResourceQuestionScoreBody[]>
    | ADT<"screenInToChallenge", string>
    | ADT<"screenOutFromChallenge", string>
    | ADT<"scoreChallenge", number>
    | ADT<"award", string>
    | ADT<"disqualify", string>
    | ADT<"withdraw", string>;
}

type ValidatedUpdateEditRequestBody = Omit<
  ValidatedCreateRequestBody,
  "opportunity" | "status" | "session"
>;

interface ValidatedDeleteRequestBody {
  proposal: Id;
  session: AuthenticatedSession;
}
/**
 * @typeParam CreateRequestBody - All the information that comes in the request
 * body when a vendor is creating a Team with Us Proposal.
 * @typeParam SharedCreateRequestBody - is an alias defined in this file for CreateRequestBody
 * defined in the 'shared' folder. It is renamed 'CreateRequestBody' here, though redefines 'status' as a
 * string instead of an enum of statuses.
 */
type CreateRequestBody = Omit<SharedCreateRequestBody, "status"> & {
  status: string;
};

type UpdateRequestBody = SharedUpdateRequestBody | null;

const routeNamespace = "proposals/team-with-us";

/**
 * Reads Many TWU Proposals
 *
 * @remarks
 *
 * validates that the TWU opp id exists in the database, checks permissions of
 * the user, if the request comes with the following parameters set.
 *
 * @example
 *
 * - request.query.opportunity=<string> = (an opportunity number) it will
 *   return all proposals associated with that opportunity
 * - request.query.organizationProposals=<string> = it will return a response
 *   for all proposals associated with the organizations the requester has
 *   access to.
 * - default behavior is to return the requester\'s own proposals
 *
 * @param connection
 */
const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<TWUProposalSlim[] | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: TWUProposalSlim[] | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    if (request.query.opportunity) {
      const validatedTWUOpportunity = await validateTWUOpportunityId(
        connection,
        request.query.opportunity,
        request.session
      );
      if (isInvalid(validatedTWUOpportunity)) {
        return respond(404, ["Team With Us opportunity not found."]);
      }

      if (
        !permissions.isSignedIn(request.session) ||
        !(await permissions.readManyTWUProposals(
          connection,
          request.session,
          validatedTWUOpportunity.value
        ))
      ) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult = await db.readManyTWUProposals(
        connection,
        request.session,
        request.query.opportunity
      );
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    } else if (request.query.organizationProposals) {
      // create a permissions check for Owners and Admins
      if (
        !permissions.isSignedIn(request.session) ||
        !(await permissions.isOrgOwnerOrAdmin(connection, request.session))
      ) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }

      const dbResult = await db.readOrgTWUProposals(
        connection,
        request.session
      );
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    } else {
      if (
        !permissions.isSignedIn(request.session) ||
        !permissions.readOwnProposals(request.session)
      ) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult = await db.readOwnTWUProposals(
        connection,
        request.session
      );
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    }
  });
};

/**
 * Parses and validates the response, ensures authentication, that
 * the proposal exists in the db and the response is free from errors.
 *
 * @param connection
 * @returns Response - with appropriate code (401,404, 200) and response body
 */
const readOne: crud.ReadOne<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<TWUProposal | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: TWUProposal | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    if (!permissions.isSignedIn(request.session)) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }
    const validatedTWUProposal = await validateTWUProposalId(
      connection,
      request.params.id,
      request.session
    );
    if (isInvalid(validatedTWUProposal)) {
      return respond(404, ["Proposal not found."]);
    }
    if (
      !(await permissions.readOneTWUProposal(
        connection,
        request.session,
        validatedTWUProposal.value
      ))
    ) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }
    return respond(200, validatedTWUProposal.value);
  });
};

/**
 * Creates a new Team With Us Proposal.
 *
 * @remarks
 *
 * Handles both the request and response. Sequence is to parse
 * the request, validate fields, create the proposal and
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
      const team = get<typeof body, string>(body, "team");
      return {
        opportunity: getString(body, "opportunity"),
        organization: getString(body, "organization"),
        attachments: getStringArray(body, "attachments"),
        status: getString(body, "status"),
        resourceQuestionResponses: get<typeof body, string>(
          body,
          "resourceQuestionResponses"
        ),
        team: (Array.isArray(team) ? team : []).map((member) => ({
          member: getString(member, "member"),
          hourlyRate: getNumber(member, "hourlyRate"),
          resource: getString(member, "resource")
        }))
      };
    },
    async validateRequestBody(request) {
      const {
        opportunity,
        organization,
        attachments,
        status,
        resourceQuestionResponses,
        team
      } = request.body;

      if (
        !permissions.isSignedIn(request.session) ||
        !(await permissions.createTWUProposal(connection, request.session))
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      /**
       * Takes orgId in the request body, queries the db to check if organization
       * exists, sets variable as either adt('valid', value)
       * or adt('invalid', {['some message']})
       */
      const validatedOrganization = await optionalAsync(organization, (v) =>
        validateOrganizationId(connection, v, request.session)
      );
      if (isInvalid(validatedOrganization)) {
        return invalid({
          organization: validatedOrganization.value
        });
      }

      /**
       * Takes status in the request body, checks if it's either 'Draft' or
       * 'Submitted', sets variable as either adt('valid', value),
       * or adt('invalid', {['some message']})
       */
      const validatedStatus =
        proposalValidation.validateCreateTWUProposalStatus(status);
      if (isInvalid(validatedStatus)) {
        return invalid({
          status: validatedStatus.value
        });
      }

      /**
       * Takes opportunity in the request body, queries the db to check if
       * the opportunityID exists, sets variable as either adt('valid', value)
       * or adt('invalid', {['some message']})
       */
      const validatedTWUOpportunity = await validateTWUOpportunityId(
        connection,
        opportunity,
        request.session
      );
      if (isInvalid(validatedTWUOpportunity)) {
        return invalid({
          notFound: getInvalidValue(validatedTWUOpportunity, undefined)
        });
      }

      // Check for existing proposal on this opportunity, authored by this user
      if (organization) {
        const dbResultOrgProposal =
          await db.readOneTWUProposalByOpportunityAndOrgAuthor(
            connection,
            request.session,
            opportunity,
            organization
          );
        if (isInvalid(dbResultOrgProposal)) {
          return invalid({
            database: [db.ERROR_MESSAGE]
          });
        }
        if (dbResultOrgProposal.value) {
          return invalid({
            existingOrganizationProposal: {
              proposalId: dbResultOrgProposal.value,
              errors: ["Please select a different organization."]
            }
          });
        }
      }

      /**
       * Check for existing proposal on this opportunity, authored by this user
       * If the person is not the author, dbResult will be valid(null)
       */
      const dbResultProposal =
        await db.readOneTWUProposalByOpportunityAndAuthor(
          connection,
          request.session,
          opportunity
        );
      if (isInvalid(dbResultProposal)) {
        return invalid({
          database: [db.ERROR_MESSAGE]
        });
      }
      if (dbResultProposal.value) {
        return invalid({
          conflict: ["You already have a proposal for this opportunity."]
        });
      }

      // Attachments must be validated for both drafts AND published opportunities.
      const validatedAttachments = await validateAttachments(
        connection,
        attachments
      );
      if (isInvalid<string[][]>(validatedAttachments)) {
        return invalid({
          attachments: validatedAttachments.value
        });
      }

      // Only validate the following fields if proposal is in DRAFT
      if (validatedStatus.value === TWUProposalStatus.Draft) {
        return valid({
          resourceQuestionResponses: resourceQuestionResponses
            ? resourceQuestionResponses.map((q) => ({
                response: getString(q, "response"),
                order: getNumber<number>(q, "order")
              }))
            : [],
          session: request.session,
          opportunity: validatedTWUOpportunity.value.id,
          organization: organization || undefined,
          status: validatedStatus.value,
          attachments: validatedAttachments.value,
          team: team.map((t) => ({
            member: getString(t, "member"),
            hourlyRate: getNumber(t, "hourlyRate"),
            resource: getString(t, "resource")
          }))
        });
      }

      // Ensure organization was provided
      if (!validatedOrganization.value) {
        return invalid({
          organization: ["An organization must be specified before submitting."]
        });
      }

      // Prior to submitting, re-check permissions
      if (
        !(await permissions.submitTWUProposal(
          connection,
          request.session,
          validatedOrganization.value
        ))
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      const validatedResourceQuestionResponses =
        proposalValidation.validateTWUProposalResourceQuestionResponses(
          resourceQuestionResponses,
          validatedTWUOpportunity.value.resourceQuestions
        );

      /**
       * Validate individual team members.
       */
      const validatedTeamMembers = await validateTWUProposalTeamMembers(
        connection,
        team,
        validatedOrganization.value.id
      );

      /**
       * Validate that the organizational service areas intersect with those
       * of the opportunity
       */
      const validatedOrganizationServiceAreas =
        proposalValidation.validateTWUProposalOrganizationServiceAreas(
          validatedTWUOpportunity.value,
          validatedOrganization.value
        );

      if (
        allValid([
          validatedResourceQuestionResponses,
          validatedTeamMembers,
          validatedOrganizationServiceAreas
        ])
      ) {
        return valid({
          session: request.session,
          opportunity: validatedTWUOpportunity.value.id,
          organization: (validatedOrganization.value as OrganizationSlim).id,
          status: validatedStatus.value,
          attachments: validatedAttachments.value,
          resourceQuestionResponses: validatedResourceQuestionResponses.value,
          team: validatedTeamMembers.value
        } as ValidatedCreateRequestBody);
      } else {
        return invalid({
          resourceQuestionResponses: getInvalidValue<
            CreateTWUResourceQuestionValidationErrors[],
            undefined
          >(validatedResourceQuestionResponses, undefined),
          team: getInvalidValue<
            CreateTWUProposalTeamMemberValidationErrors[],
            undefined
          >(validatedTeamMembers, undefined),
          organization: getInvalidValue(
            validatedOrganizationServiceAreas,
            undefined
          )
        });
      }
    },
    respond: wrapRespond<
      ValidatedCreateRequestBody,
      CreateValidationErrors,
      JsonResponseBody<TWUProposal>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const dbResult = await db.createTWUProposal(
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
        // Notify of submitted proposal if applicable
        if (dbResult.value.status === TWUProposalStatus.Submitted) {
          twuProposalNotifications.handleTWUProposalSubmitted(
            connection,
            dbResult.value.id,
            request.body.session
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
        case "edit":
          return adt("edit", {
            organization: getString(value, "organization"),
            resourceQuestionResponses: get<typeof value, string>(
              value,
              "resourceQuestionResponses"
            ),
            attachments: getStringArray(value, "attachments"),
            team: get<typeof value, string>(value, "team")
          });
        case "submit":
          return adt("submit", getString(body, "value", ""));
        case "scoreQuestions":
          return adt(
            "scoreQuestions",
            value as UpdateResourceQuestionScoreBody[]
          );
        case "screenInToChallenge":
          return adt("screenInToChallenge", getString(body, "value"));
        case "screenOutFromChallenge":
          return adt("screenOutFromChallenge", getString(body, "value"));
        case "scoreChallenge":
          return adt(
            "scoreChallenge",
            getNumber<number>(body, "value", -1, false)
          );
        case "award":
          return adt("award", getString(body, "value", ""));
        case "disqualify":
          return adt("disqualify", getString(body, "value", ""));
        case "withdraw":
          return adt("withdraw", getString(body, "value", ""));
        default:
          return null;
      }
    },
    async validateRequestBody(request) {
      if (!request.body) {
        return invalid({ proposal: adt("parseFailure" as const) });
      }
      if (!permissions.isSignedIn(request.session)) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const validatedTWUProposal = await validateTWUProposalId(
        connection,
        request.params.id,
        request.session
      );
      if (isInvalid(validatedTWUProposal)) {
        return invalid({
          notFound: getInvalidValue(validatedTWUProposal, undefined)
        });
      }

      // Retrieve the full opportunity to validate the proposal against
      const twuOpportunity = getValidValue(
        await db.readOneTWUOpportunity(
          connection,
          validatedTWUProposal.value.opportunity.id,
          request.session
        ),
        undefined
      );
      if (!twuOpportunity) {
        return invalid({
          database: [db.ERROR_MESSAGE]
        });
      }

      if (
        !(await permissions.editTWUProposal(
          connection,
          request.session,
          validatedTWUProposal.value,
          twuOpportunity
        ))
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      switch (request.body.tag) {
        case "edit": {
          const { organization, resourceQuestionResponses, attachments, team } =
            request.body.value;

          const validatedOrganization = await validateDraftProposalOrganization(
            connection,
            organization,
            request.session
          );
          if (isInvalid(validatedOrganization)) {
            return invalid({
              proposal: adt("edit" as const, {
                organization: getInvalidValue(validatedOrganization, undefined)
              })
            });
          }

          // Organization can only be changed for DRAFT or WITHDRAWN proposals
          if (
            ![TWUProposalStatus.Draft, TWUProposalStatus.Withdrawn].includes(
              validatedTWUProposal.value.status
            ) &&
            organization !== validatedTWUProposal.value.organization?.id
          ) {
            return invalid({
              proposal: adt("edit" as const, {
                organization: [
                  "Organization cannot be changed once the proposal has been submitted"
                ]
              })
            });
          }

          // Check for existing proposal on this opportunity, authored by this user
          if (validatedOrganization.value) {
            const dbResult =
              await db.readOneTWUProposalByOpportunityAndOrgAuthor(
                connection,
                request.session,
                twuOpportunity.id,
                validatedOrganization.value.id
              );
            if (isInvalid(dbResult)) {
              return invalid({
                database: [db.ERROR_MESSAGE]
              });
            }
            if (dbResult.value && dbResult.value !== request.params.id) {
              return invalid({
                proposal: adt("edit" as const, {
                  existingOrganizationProposal: {
                    proposalId: dbResult.value,
                    errors: ["Please select a different organization."]
                  }
                })
              });
            }
          }

          // Attachments must be validated for both drafts and published opportunities
          const validatedAttachments = await validateAttachments(
            connection,
            attachments
          );
          if (isInvalid<string[][]>(validatedAttachments)) {
            return invalid({
              proposal: adt("edit" as const, {
                attachments: validatedAttachments.value
              })
            });
          }

          // Do not validate other fields if the proposal is a draft.
          if (validatedTWUProposal.value.status === TWUProposalStatus.Draft) {
            return valid({
              session: request.session,
              body: adt("edit" as const, {
                resourceQuestionResponses: resourceQuestionResponses
                  ? resourceQuestionResponses.map((q) => ({
                      response: getString(q, "response"),
                      order: getNumber<number>(q, "order")
                    }))
                  : [],
                session: request.session,
                attachments: validatedAttachments.value,
                organization: organization || undefined,
                team: team
                  ? team.map((t) => ({
                      member: getString(t, "member"),
                      hourlyRate: getNumber<number>(t, "hourlyRate"),
                      resource: getString(t, "resource")
                    }))
                  : []
              })
            });
          }

          if (!validatedOrganization.value) {
            return invalid({
              proposal: adt("edit" as const, {
                organization: [
                  "An organization must be specified prior to submitting."
                ]
              })
            });
          }

          const validatedResourceQuestionResponses =
            proposalValidation.validateTWUProposalResourceQuestionResponses(
              resourceQuestionResponses,
              twuOpportunity.resourceQuestions
            );

          // Validate team members
          const validatedProposalTeam = await validateTWUProposalTeamMembers(
            connection,
            team,
            validatedOrganization.value.id
          );

          /**
           * Validate that the organizational service areas intersect with those
           * of the opportunity
           */
          const validatedOrganizationServiceAreas =
            proposalValidation.validateTWUProposalOrganizationServiceAreas(
              twuOpportunity,
              validatedOrganization.value
            );

          if (
            allValid([
              validatedResourceQuestionResponses,
              validatedProposalTeam,
              validatedOrganizationServiceAreas
            ])
          ) {
            return valid({
              session: request.session,
              body: adt("edit" as const, {
                organization: validatedOrganization.value.id,
                resourceQuestionResponses:
                  validatedResourceQuestionResponses.value,
                attachments: validatedAttachments.value,
                team: validatedProposalTeam.value
              })
            } as ValidatedUpdateRequestBody);
          } else {
            return invalid({
              proposal: adt(
                "edit" as const,
                {
                  resourceQuestionResponses: getInvalidValue<
                    CreateTWUResourceQuestionValidationErrors[],
                    undefined
                  >(validatedResourceQuestionResponses, undefined),
                  organization: getInvalidValue(
                    validatedOrganizationServiceAreas,
                    undefined
                  )
                } as UpdateEditValidationErrors
              )
            });
          }
        }
        case "submit": {
          if (
            !isValidStatusChange(
              validatedTWUProposal.value.status,
              TWUProposalStatus.Submitted,
              request.session.user.type,
              twuOpportunity.proposalDeadline
            )
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }

          const validatedOrganization = await validateOrganizationId(
            connection,
            validatedTWUProposal.value.organization?.id ?? "",
            request.session
          );
          if (isInvalid(validatedOrganization)) {
            return invalid({
              proposal: adt(
                "submit" as const,
                getInvalidValue(validatedOrganization, [])
              )
            });
          }

          // Validate draft proposal here to make sure it has everything
          if (
            !allValid([
              proposalValidation.validateTWUProposalResourceQuestionResponses(
                validatedTWUProposal.value.resourceQuestionResponses,
                twuOpportunity.resourceQuestions
              ),
              await validateTWUProposalTeamMembers(
                connection,
                validatedTWUProposal.value.team?.map(
                  ({ member, hourlyRate, resource }) => ({
                    member: member.id,
                    hourlyRate,
                    resource
                  })
                ) ?? [],
                validatedOrganization.value.id
              ),
              proposalValidation.validateTWUProposalOrganizationServiceAreas(
                twuOpportunity,
                validatedOrganization.value
              )
            ])
          ) {
            return invalid({
              proposal: adt("submit" as const, [
                "This proposal could not be submitted for review because it is incomplete. Please edit, complete and save the form below before trying to submit it again."
              ])
            });
          }

          // Prior to submitting, re-check permissions and ensure organization is still TWU qualified
          const proposalOrganization =
            validatedTWUProposal.value.organization &&
            getValidValue(
              await db.readOneOrganization(
                connection,
                validatedTWUProposal.value.organization.id,
                false,
                request.session
              ),
              null
            );
          if (
            !proposalOrganization ||
            !(await permissions.submitTWUProposal(
              connection,
              request.session,
              proposalOrganization
            ))
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }

          const validatedSubmissionNote = proposalValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedSubmissionNote)) {
            return invalid({
              proposal: adt("submit" as const, validatedSubmissionNote.value)
            });
          }
          return valid({
            session: request.session,
            body: adt("submit" as const, validatedSubmissionNote.value)
          } as ValidatedUpdateRequestBody);
        }
        case "scoreQuestions": {
          if (
            ![
              TWUProposalStatus.UnderReviewResourceQuestions,
              TWUProposalStatus.EvaluatedResourceQuestions
            ].includes(validatedTWUProposal.value.status)
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          // The opportunity must be in resource questions stage
          if (
            twuOpportunity.status !==
            TWUOpportunityStatus.EvaluationResourceQuestionsIndividual
          ) {
            return invalid({
              permissions: [
                "The opportunity is not in the correct stage of evaluation to perform that action."
              ]
            });
          }
          const validatedQuestionsScore =
            proposalValidation.validateResourceQuestionScores(
              request.body.value,
              twuOpportunity.resourceQuestions
            );
          if (
            isInvalid<UpdateResourceQuestionScoreValidationErrors[]>(
              validatedQuestionsScore
            )
          ) {
            return invalid({
              proposal: adt(
                "scoreQuestions" as const,
                getInvalidValue(validatedQuestionsScore, [])
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("scoreQuestions" as const, validatedQuestionsScore.value)
          } as ValidatedUpdateRequestBody);
        }
        case "screenInToChallenge": {
          if (
            !isValidStatusChange(
              validatedTWUProposal.value.status,
              TWUProposalStatus.UnderReviewChallenge,
              request.session.user.type,
              twuOpportunity.proposalDeadline
            )
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          // The opportunity must be in resource question stage still
          if (
            twuOpportunity.status !==
            TWUOpportunityStatus.EvaluationResourceQuestionsIndividual
          ) {
            return invalid({
              permissions: [
                "The opportunity is not in the correct stage of evaluation to perform that action."
              ]
            });
          }
          const validatedScreenInCCNote = proposalValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedScreenInCCNote)) {
            return invalid({
              proposal: adt(
                "screenInToChallenge" as const,
                getInvalidValue(validatedScreenInCCNote, [])
              )
            });
          }
          return valid({
            session: request.session,
            body: adt(
              "screenInToChallenge" as const,
              validatedScreenInCCNote.value
            )
          });
        }
        case "screenOutFromChallenge": {
          if (
            !isValidStatusChange(
              validatedTWUProposal.value.status,
              TWUProposalStatus.EvaluatedResourceQuestions,
              request.session.user.type,
              twuOpportunity.proposalDeadline
            )
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          // The opportunity must be in the resource questions or code challenge stage
          if (
            ![
              TWUOpportunityStatus.EvaluationResourceQuestionsIndividual,
              TWUOpportunityStatus.EvaluationChallenge
            ].includes(twuOpportunity.status)
          ) {
            return invalid({
              permissions: [
                "The opportunity is not in the correct stage of evaluation to perform that action."
              ]
            });
          }
          const validatedScreenOutCCNote = proposalValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedScreenOutCCNote)) {
            return invalid({
              proposal: adt(
                "screenOutFromChallenge" as const,
                getInvalidValue(validatedScreenOutCCNote, [])
              )
            });
          }
          return valid({
            session: request.session,
            body: adt(
              "screenOutFromChallenge" as const,
              validatedScreenOutCCNote.value
            )
          });
        }
        case "scoreChallenge": {
          if (
            ![
              TWUProposalStatus.UnderReviewChallenge,
              TWUProposalStatus.EvaluatedChallenge
            ].includes(validatedTWUProposal.value.status)
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          // The opportunity must be in code challenge stage
          if (
            twuOpportunity.status !== TWUOpportunityStatus.EvaluationChallenge
          ) {
            return invalid({
              permissions: [
                "The opportunity is not in the correct stage of evaluation to perform that action."
              ]
            });
          }
          const validatedChallengeScore =
            proposalValidation.validateChallengeScore(request.body.value);
          if (isInvalid(validatedChallengeScore)) {
            return invalid({
              proposal: adt(
                "scoreChallenge" as const,
                getInvalidValue(validatedChallengeScore, [])
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("scoreChallenge" as const, validatedChallengeScore.value)
          } as ValidatedUpdateRequestBody);
        }

        case "award": {
          if (
            !isValidStatusChange(
              validatedTWUProposal.value.status,
              TWUProposalStatus.Awarded,
              request.session.user.type,
              twuOpportunity.proposalDeadline
            )
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          // To award the opportunity, it must be in Processing stage
          if (twuOpportunity.status !== TWUOpportunityStatus.Processing) {
            return invalid({
              permissions: [
                "The opportunity is not in the correct stage of evaluation to perform that action."
              ]
            });
          }
          const validatedAwardNote = proposalValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedAwardNote)) {
            return invalid({
              proposal: adt(
                "award" as const,
                getInvalidValue(validatedAwardNote, [])
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("award" as const, validatedAwardNote.value)
          } as ValidatedUpdateRequestBody);
        }
        case "disqualify": {
          if (
            !isValidStatusChange(
              validatedTWUProposal.value.status,
              TWUProposalStatus.Disqualified,
              request.session.user.type,
              twuOpportunity.proposalDeadline
            )
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          const validatedDisqualifyNote =
            proposalValidation.validateDisqualificationReason(
              request.body.value
            );
          if (isInvalid(validatedDisqualifyNote)) {
            return invalid({
              proposal: adt(
                "disqualify" as const,
                getInvalidValue(validatedDisqualifyNote, [])
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("disqualify" as const, validatedDisqualifyNote.value)
          } as ValidatedUpdateRequestBody);
        }
        case "withdraw": {
          if (
            !isValidStatusChange(
              validatedTWUProposal.value.status,
              TWUProposalStatus.Withdrawn,
              request.session.user.type,
              twuOpportunity.proposalDeadline
            )
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          const validatedWithdrawnNote = proposalValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedWithdrawnNote)) {
            return invalid({
              proposal: adt(
                "withdraw" as const,
                getInvalidValue(validatedWithdrawnNote, [])
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("withdraw" as const, validatedWithdrawnNote.value)
          } as ValidatedUpdateRequestBody);
        }
        default:
          return invalid({ proposal: adt("parseFailure" as const) });
      }
    },
    respond: wrapRespond<
      ValidatedUpdateRequestBody,
      UpdateValidationErrors,
      JsonResponseBody<TWUProposal>,
      JsonResponseBody<UpdateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        let dbResult: Validation<TWUProposal, null>;
        const { session, body } = request.body;
        switch (body.tag) {
          case "edit":
            dbResult = await db.updateTWUProposal(
              connection,
              { ...body.value, id: request.params.id },
              session
            );
            break;
          case "submit":
            dbResult = await db.updateTWUProposalStatus(
              connection,
              request.params.id,
              TWUProposalStatus.Submitted,
              body.value,
              session
            );
            // Notify of submission
            if (isValid(dbResult)) {
              twuProposalNotifications.handleTWUProposalSubmitted(
                connection,
                request.params.id,
                request.body.session
              );
            }
            break;
          case "scoreQuestions":
            dbResult = await db.updateTWUProposalResourceQuestionScores(
              connection,
              request.params.id,
              body.value,
              session
            );
            break;
          case "screenInToChallenge":
            dbResult = await db.updateTWUProposalStatus(
              connection,
              request.params.id,
              TWUProposalStatus.UnderReviewChallenge,
              body.value,
              session
            );
            break;
          case "screenOutFromChallenge":
            dbResult = await db.updateTWUProposalStatus(
              connection,
              request.params.id,
              TWUProposalStatus.EvaluatedResourceQuestions,
              body.value,
              session
            );
            break;
          case "scoreChallenge":
            dbResult = await db.updateTWUProposalChallengeAndPriceScores(
              connection,
              request.params.id,
              body.value,
              session
            );
            break;
          case "award":
            dbResult = await db.awardTWUProposal(
              connection,
              request.params.id,
              body.value,
              session
            );
            // Notify of award (also notifies unsuccessful proponents)
            if (isValid(dbResult)) {
              twuProposalNotifications.handleTWUProposalAwarded(
                connection,
                request.params.id,
                request.body.session
              );
            }
            break;
          case "disqualify": {
            dbResult = await db.disqualifyTWUProposalAndUpdateOpportunity(
              connection,
              request.params.id,
              body.value,
              session
            );
            break;
          }
          case "withdraw":
            dbResult = await db.updateTWUProposalStatus(
              connection,
              request.params.id,
              TWUProposalStatus.Withdrawn,
              body.value,
              session
            );
            if (isValid(dbResult)) {
              twuProposalNotifications.handleTWUProposalWithdrawn(
                connection,
                request.params.id,
                request.body.session
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
      if (!permissions.isSignedIn(request.session)) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const validatedTWUProposal = await validateTWUProposalId(
        connection,
        request.params.id,
        request.session
      );
      if (isInvalid(validatedTWUProposal)) {
        return invalid({
          notFound: ["The specified proposal was not found."]
        });
      }
      if (
        !(await permissions.deleteTWUProposal(
          connection,
          request.session,
          validatedTWUProposal.value
        ))
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      if (validatedTWUProposal.value.status !== TWUProposalStatus.Draft) {
        return invalid({ status: ["Only draft proposals can be deleted."] });
      }
      return valid({
        proposal: validatedTWUProposal.value.id,
        session: request.session
      });
    },
    respond: wrapRespond({
      valid: async (request) => {
        const dbResult = await db.deleteTWUProposal(
          connection,
          request.body.proposal,
          request.body.session
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

const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  readMany,
  readOne,
  create,
  update,
  delete: delete_
};

export default resource;
