import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAttachments, validateCWUOpportunityId } from 'back-end/lib/validation';
import { get, omit } from 'lodash';
import { addDays, getNumber, getString, getStringArray } from 'shared/lib';
import { FileRecord } from 'shared/lib/resources/file';
import { CreateCWUOpportunityStatus, CreateRequestBody, CreateValidationErrors, CWUOpportunity, CWUOpportunitySlim, CWUOpportunityStatus, DeleteValidationErrors, isValidStatusChange, UpdateEditRequestBody, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/opportunity/code-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { adt, ADT, Id } from 'shared/lib/types';
import { allValid, getInvalidValue, getValidValue, invalid, isInvalid, valid, validateUUID, Validation } from 'shared/lib/validation';
import * as opportunityValidation from 'shared/lib/validation/opportunity/code-with-us';

export interface ValidatedCreateRequestBody extends Omit<CWUOpportunity, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> {
  status: CreateCWUOpportunityStatus;
  session: AuthenticatedSession;
}

interface ValidatedUpdateEditRequestBody extends Omit<UpdateEditRequestBody, 'proposalDeadline' | 'assignmentDate' | 'startDate' | 'completionDate' | 'attachments'> {
  proposalDeadline: Date;
  assignmentDate: Date;
  startDate: Date;
  completionDate: Date;
  attachments: FileRecord[];
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body: ADT<'edit', ValidatedUpdateEditRequestBody>
      | ADT<'publish', string>
      | ADT<'startEvaluation', string>
      | ADT<'suspend', string>
      | ADT<'cancel', string>
      | ADT<'addAddendum', string>;
}

type ValidatedDeleteRequestBody = Id;

type Resource = crud.Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  Omit<CreateRequestBody, 'status'> & { status: string; },
  ValidatedCreateRequestBody,
  CreateValidationErrors,
  null,
  null,
  UpdateRequestBody | null,
  ValidatedUpdateRequestBody,
  UpdateValidationErrors,
  ValidatedDeleteRequestBody,
  DeleteValidationErrors,
  Session,
  db.Connection
>;

const resource: Resource = {
  routeNamespace: 'opportunities/code-with-us',

  readMany(connection) {
    return nullRequestBodyHandler<JsonResponseBody<CWUOpportunitySlim[] | string[]>, Session>(async request => {
      const respond = (code: number, body: CWUOpportunitySlim[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      const dbResult = await db.readManyCWUOpportunities(connection, request.session);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    });
  },

  readOne(connection) {
    return nullRequestBodyHandler<JsonResponseBody<CWUOpportunity | string[]>, Session>(async request => {
      const respond = (code: number, body: CWUOpportunity | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      // Validate the provided id
      const validatedId = validateUUID(request.params.id);
      if (isInvalid(validatedId)) {
        return respond(400, validatedId.value);
      }
      const dbResult = await db.readOneCWUOpportunity(connection, validatedId.value, request.session);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      if (!dbResult.value) {
        return respond(404, ['Opportunity not found.']);
      }
      return respond(200, dbResult.value);
    });
  },

  create(connection) {
    return {
      async parseRequestBody(request) {
        const body: unknown = request.body.tag === 'json' ? request.body.value : {};
        return {
          title: getString(body, 'title'),
          teaser: getString(body, 'teaser'),
          remoteOk: get(body, 'remoteOk'),
          remoteDesc: getString(body, 'remoteDesc'),
          location: getString(body, 'location'),
          reward: getNumber(body, 'reward'),
          skills: getStringArray(body, 'skills'),
          description: getString(body, 'description'),
          proposalDeadline: getString(body, 'proposalDeadline'),
          assignmentDate: getString(body, 'assignmentDate'),
          startDate: getString(body, 'startDate'),
          completionDate: getString(body, 'completionDate'),
          submissionInfo: getString(body, 'submissionInfo'),
          acceptanceCriteria: getString(body, 'acceptanceCriteria'),
          evaluationCriteria: getString(body, 'evaluationCriteria'),
          attachments: getStringArray(body, 'attachments'),
          status: getString(body, 'status')
        };
      },
      async validateRequestBody(request) {
        if (!permissions.createCWUOpportunity(request.session)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        const { title,
                teaser,
                remoteOk,
                remoteDesc,
                location,
                reward,
                skills,
                description,
                proposalDeadline,
                assignmentDate,
                startDate,
                completionDate,
                submissionInfo,
                acceptanceCriteria,
                evaluationCriteria,
                attachments
              } = request.body;

        const validatedStatus = opportunityValidation.validateCWUOpportunityStatus(request.body.status, [CWUOpportunityStatus.Draft, CWUOpportunityStatus.Published]);
        if (isInvalid(validatedStatus)) {
          return invalid({
            status: validatedStatus.value
          });
        }

        // Attachments must be validated for both drafts and published opportunities.
        const validatedAttachments = await validateAttachments(connection, attachments);
        if (isInvalid(validatedAttachments)) {
          return invalid({
            attachments: validatedAttachments.value
          });
        }
        const attachmentIds = validatedAttachments.value.map(v => v.id);

        const validatedProposalDeadline = opportunityValidation.validateProposalDeadline(proposalDeadline);
        const validatedAssignmentDate = opportunityValidation.validateAssignmentDate(assignmentDate, getValidValue(validatedProposalDeadline, new Date()));
        const validatedStartDate = opportunityValidation.validateStartDate(startDate, getValidValue(validatedAssignmentDate, new Date()));
        const validatedCompletionDate = opportunityValidation.validateCompletionDate(completionDate, getValidValue(validatedStartDate, new Date()));

        // Do not validate other fields if the opportunity is a draft.
        if (validatedStatus.value === CWUOpportunityStatus.Draft) {
          const defaultDate = addDays(new Date(), 14);
          return valid({
            ...request.body,
            session: request.session,
            status: validatedStatus.value,
            attachments: attachmentIds,
            // Coerce validated dates to default values.
            proposalDeadline: getValidValue(validatedProposalDeadline, defaultDate),
            assignmentDate: getValidValue(validatedAssignmentDate, defaultDate),
            startDate: getValidValue(validatedStartDate, defaultDate),
            completionDate: getValidValue(validatedCompletionDate, defaultDate)
          });
        }

        const validatedTitle = opportunityValidation.validateTitle(title);
        const validatedTeaser = opportunityValidation.validateTeaser(teaser);
        const validatedRemoteOk = opportunityValidation.validateRemoteOk(remoteOk);
        const validatedRemoteDesc = opportunityValidation.validateRemoteDesc(remoteDesc);
        const validatedLocation = opportunityValidation.validateLocation(location);
        const validatedReward = opportunityValidation.validateReward(reward);
        const validatedSkills = opportunityValidation.validateSkills(skills);
        const validatedDescription = opportunityValidation.validateDescription(description);
        const validatedSubmissionInfo = opportunityValidation.validateSubmissionInfo(submissionInfo);
        const validatedAcceptanceCriteria = opportunityValidation.validateAcceptanceCriteria(acceptanceCriteria);
        const validatedEvaluationCriteria = opportunityValidation.validateEvaluationCriteria(evaluationCriteria);

        if (allValid([
              validatedTitle,
              validatedTeaser,
              validatedRemoteOk,
              validatedRemoteDesc,
              validatedLocation,
              validatedReward,
              validatedSkills,
              validatedDescription,
              validatedProposalDeadline,
              validatedAssignmentDate,
              validatedStartDate,
              validatedCompletionDate,
              validatedSubmissionInfo,
              validatedAcceptanceCriteria,
              validatedEvaluationCriteria
        ])) {
          return valid({
            session: request.session,
            title: validatedTitle.value,
            teaser: validatedTeaser.value,
            remoteOk: validatedRemoteOk.value,
            remoteDesc: validatedRemoteDesc.value,
            location: validatedLocation.value,
            reward: validatedReward.value,
            skills: validatedSkills.value,
            description: validatedDescription.value,
            proposalDeadline: validatedProposalDeadline.value,
            assignmentDate: validatedAssignmentDate.value,
            startDate: validatedStartDate.value,
            completionDate: validatedCompletionDate.value,
            submissionInfo: validatedSubmissionInfo.value,
            acceptanceCriteria: validatedAcceptanceCriteria.value,
            evaluationCriteria: validatedEvaluationCriteria.value,
            attachments: attachmentIds,
            status: validatedStatus.value
          });
        } else {
          return invalid({
            title: getInvalidValue(validatedTitle, undefined),
            teaser: getInvalidValue(validatedTeaser, undefined),
            remoteOk: getInvalidValue(validatedRemoteOk, undefined),
            remoteDesc: getInvalidValue(validatedRemoteDesc, undefined),
            location: getInvalidValue(validatedLocation, undefined),
            reward: getInvalidValue(validatedReward, undefined),
            skills: getInvalidValue(validatedSkills, undefined),
            description: getInvalidValue(validatedDescription, undefined),
            proposalDeadline: getInvalidValue(validatedProposalDeadline, undefined),
            assignmentDate: getInvalidValue(validatedAssignmentDate, undefined),
            startDate: getInvalidValue(validatedStartDate, undefined),
            completionDate: getInvalidValue(validatedCompletionDate, undefined),
            submissionInfo: getInvalidValue(validatedSubmissionInfo, undefined),
            acceptanceCriteria: getInvalidValue(validatedAcceptanceCriteria, undefined),
            evaluationCrtieria: getInvalidValue(validatedEvaluationCriteria, undefined),
            attachments: getInvalidValue(validatedAttachments, undefined)
          });
        }
      },
      respond: wrapRespond<ValidatedCreateRequestBody, CreateValidationErrors, JsonResponseBody<CWUOpportunity>, JsonResponseBody<CreateValidationErrors>, Session>({
        valid: (async request => {
          const dbResult = await db.createCWUOpportunity(connection, omit(request.body, 'session'), request.body.session);
          if (isInvalid(dbResult)) {
            return basicResponse(503, request.session, makeJsonResponseBody({ database: [db.ERROR_MESSAGE] }));
          }
          return basicResponse(201, request.session, makeJsonResponseBody(dbResult.value));
        }),
        invalid: (async request => {
          return basicResponse(400, request.session, makeJsonResponseBody(request.body));
        })
      })
    };
  },

  update(connection) {
    return {
      async parseRequestBody(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        const tag = get(body, 'tag');
        const value: unknown = get(body, 'value');
        switch (tag) {
          case 'edit':
            return adt('edit', {
              title: getString(value, 'title'),
              teaser: getString(value, 'teaser'),
              remoteOk: get(value, 'remoteOk'),
              remoteDesc: getString(value, 'remoteDesc'),
              location: getString(value, 'location'),
              reward: getNumber<number>(value, 'reward'),
              skills: getStringArray(value, 'skills'),
              description: getString(value, 'description'),
              proposalDeadline: getString(value, 'proposalDeadline'),
              assignmentDate: getString(value, 'assignmentDate'),
              startDate: getString(value, 'startDate'),
              completionDate: getString(value, 'completionDate'),
              submissionInfo: getString(value, 'submissionInfo'),
              acceptanceCriteria: getString(value, 'acceptanceCriteria'),
              evaluationCriteria: getString(value, 'evaluationCriteria'),
              attachments: getStringArray(value, 'attachments')
            });
          case 'publish':
            return adt('publish', getString(body, 'value', ''));
          case 'suspend':
            return adt('suspend', getString(body, 'value', ''));
          case 'cancel':
            return adt('cancel', getString(body, 'value', ''));
          case 'addAddendum':
            return adt('addAddendum', getString(body, 'value', ''));
          default:
            return null;
        }
      },
      async validateRequestBody(request) {
        if (!request.body) { return invalid({ opportunity: adt('parseFailure' as const) }); }

        const validatedCWUOpportunity = await validateCWUOpportunityId(connection, request.params.id, request.session);
        if (isInvalid(validatedCWUOpportunity)) {
          return invalid({ notFound: ['The specified opportunity does not exist.'] });
        }
        const cwuOpportunity = validatedCWUOpportunity.value;

        if (!permissions.editCWUOpportunity(connection, request.session, request.params.id)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        switch (request.body.tag) {
          case 'edit':
            const { title,
                    teaser,
                    remoteOk,
                    remoteDesc,
                    location,
                    reward,
                    skills,
                    description,
                    proposalDeadline,
                    assignmentDate,
                    startDate,
                    completionDate,
                    submissionInfo,
                    acceptanceCriteria,
                    evaluationCriteria,
                    attachments
            } = request.body.value;

            // Attachments must be validated for both drafts and published opportunities.
            const validatedAttachments = await validateAttachments(connection, attachments);
            if (isInvalid(validatedAttachments)) {
              return invalid({
                attachments: validatedAttachments.value
              });
            }
            const attachmentIds = validatedAttachments.value.map(v => v.id);

            const validatedProposalDeadline = opportunityValidation.validateProposalDeadline(proposalDeadline);
            const validatedAssignmentDate = opportunityValidation.validateAssignmentDate(assignmentDate, getValidValue(validatedProposalDeadline, new Date()));
            const validatedStartDate = opportunityValidation.validateStartDate(startDate, getValidValue(validatedAssignmentDate, new Date()));
            const validatedCompletionDate = opportunityValidation.validateCompletionDate(completionDate, getValidValue(validatedStartDate, new Date()));

            // Do not validate other fields if the opportunity is a draft.
            if (cwuOpportunity.status === CWUOpportunityStatus.Draft) {
              const defaultDate = addDays(new Date(), 14);
              return valid({
                session: request.session,
                body: adt('edit' as const, {
                  ...request.body.value,
                  attachments: attachmentIds,
                  // Coerce validated dates to default values.
                  proposalDeadline: getValidValue(validatedProposalDeadline, defaultDate),
                  assignmentDate: getValidValue(validatedAssignmentDate, defaultDate),
                  startDate: getValidValue(validatedStartDate, defaultDate),
                  completionDate: getValidValue(validatedCompletionDate, defaultDate)
                })
              });
            }

            const validatedTitle = opportunityValidation.validateTitle(title);
            const validatedTeaser = opportunityValidation.validateTeaser(teaser);
            const validatedRemoteOk = opportunityValidation.validateRemoteOk(remoteOk);
            const validatedRemoteDesc = opportunityValidation.validateRemoteDesc(remoteDesc);
            const validatedLocation = opportunityValidation.validateLocation(location);
            const validatedReward = opportunityValidation.validateReward(reward);
            const validatedSkills = opportunityValidation.validateSkills(skills);
            const validatedDescription = opportunityValidation.validateDescription(description);
            const validatedSubmissionInfo = opportunityValidation.validateSubmissionInfo(submissionInfo);
            const validatedAcceptanceCriteria = opportunityValidation.validateAcceptanceCriteria(acceptanceCriteria);
            const validatedEvaluationCriteria = opportunityValidation.validateEvaluationCriteria(evaluationCriteria);

            if (allValid([
              validatedTitle,
              validatedTeaser,
              validatedRemoteOk,
              validatedRemoteDesc,
              validatedLocation,
              validatedReward,
              validatedSkills,
              validatedDescription,
              validatedProposalDeadline,
              validatedAssignmentDate,
              validatedStartDate,
              validatedCompletionDate,
              validatedSubmissionInfo,
              validatedAcceptanceCriteria,
              validatedEvaluationCriteria,
              validatedAttachments
            ])) {
              return valid({
                session: request.session,
                body: adt('edit' as const, {
                  title: validatedTitle.value,
                  teaser: validatedTeaser.value,
                  remoteOk: validatedRemoteOk.value,
                  remoteDesc: validatedRemoteDesc.value,
                  location: validatedLocation.value,
                  reward: validatedReward.value,
                  skills: validatedSkills.value,
                  description: validatedDescription.value,
                  proposalDeadline: validatedProposalDeadline.value,
                  assignmentDate: validatedAssignmentDate.value,
                  startDate: validatedStartDate.value,
                  completionDate: validatedCompletionDate.value,
                  submissionInfo: validatedSubmissionInfo.value,
                  acceptanceCriteria: validatedAcceptanceCriteria.value,
                  evaluationCriteria: validatedEvaluationCriteria.value,
                  attachments: validatedAttachments.value
                })
              });
            } else {
              return invalid({
                opportunity: adt('edit' as const, {
                  title: getInvalidValue(validatedTitle, undefined),
                  teaser: getInvalidValue(validatedTeaser, undefined),
                  remoteOk: getInvalidValue(validatedRemoteOk, undefined),
                  remoteDesc: getInvalidValue(validatedRemoteDesc, undefined),
                  location: getInvalidValue(validatedLocation, undefined),
                  reward: getInvalidValue(validatedReward, undefined),
                  skills: getInvalidValue(validatedSkills, undefined),
                  description: getInvalidValue(validatedDescription, undefined),
                  proposalDeadline: getInvalidValue(validatedProposalDeadline, undefined),
                  assignmentDate: getInvalidValue(validatedAssignmentDate, undefined),
                  startDate: getInvalidValue(validatedStartDate, undefined),
                  completionDate: getInvalidValue(validatedCompletionDate, undefined),
                  submissionInfo: getInvalidValue(validatedSubmissionInfo, undefined),
                  acceptanceCriteria: getInvalidValue(validatedAcceptanceCriteria, undefined),
                  evaluationCrtieria: getInvalidValue(validatedEvaluationCriteria, undefined),
                  attachments: getInvalidValue(validatedAttachments, undefined)
                })
              });
            }
          case 'publish':
            if (!isValidStatusChange(validatedCWUOpportunity.value.status, CWUOpportunityStatus.Published)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            // Perform validation on draft to ensure it's ready for publishing
            if (!allValid([
              opportunityValidation.validateTitle(validatedCWUOpportunity.value.title),
              opportunityValidation.validateTeaser(validatedCWUOpportunity.value.teaser),
              opportunityValidation.validateRemoteOk(validatedCWUOpportunity.value.remoteOk),
              opportunityValidation.validateRemoteDesc(validatedCWUOpportunity.value.remoteDesc),
              opportunityValidation.validateLocation(validatedCWUOpportunity.value.location),
              opportunityValidation.validateReward(validatedCWUOpportunity.value.reward),
              opportunityValidation.validateSkills(validatedCWUOpportunity.value.skills),
              opportunityValidation.validateDescription(validatedCWUOpportunity.value.description),
              opportunityValidation.validateSubmissionInfo(validatedCWUOpportunity.value.submissionInfo),
              opportunityValidation.validateAcceptanceCriteria(validatedCWUOpportunity.value.acceptanceCriteria),
              opportunityValidation.validateEvaluationCriteria(validatedCWUOpportunity.value.evaluationCriteria)
            ])) {
              return invalid({
                opportunity: adt('publish', ['This opportunity could not be published because it is incomplete. Please edit, complete and save the form below before trying to publish it again.'])
              });
            }

            const validatedPublishNote = opportunityValidation.validateNote(request.body.value);
            if (isInvalid(validatedPublishNote)) {
              return invalid({ opportunity: adt('publish' as const, validatedPublishNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('publish', validatedPublishNote.value)
            });
          case 'suspend':
            if (!isValidStatusChange(validatedCWUOpportunity.value.status, CWUOpportunityStatus.Suspended)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            const validatedSuspendNote = opportunityValidation.validateNote(request.body.value);
            if (isInvalid(validatedSuspendNote)) {
              return invalid({ opportunity: adt('suspend' as const, validatedSuspendNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('suspend', validatedSuspendNote.value)
            });
          case 'cancel':
            if (!isValidStatusChange(validatedCWUOpportunity.value.status, CWUOpportunityStatus.Canceled)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            const validatedCancelNote = opportunityValidation.validateNote(request.body.value);
            if (isInvalid(validatedCancelNote)) {
              return invalid({ opportunity: adt('cancel' as const, validatedCancelNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('cancel', validatedCancelNote.value)
            });
          case 'addAddendum':
            if (validatedCWUOpportunity.value.status === CWUOpportunityStatus.Canceled) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            const validatedAddendumText = opportunityValidation.validateAddendumText(request.body.value);
            if (isInvalid(validatedAddendumText)) {
              return invalid({ opportunity: adt('addAddendum' as const, validatedAddendumText.value) });
            }
            return valid({
              session: request.session,
              body: adt('addAddendum', validatedAddendumText.value)
            });
          default:
            return invalid({ opportunity: adt('parseFailure' as const) });
        }
      },
      respond: wrapRespond({
        valid: async request => {
          let dbResult: Validation<CWUOpportunity, null>;
          const { session, body } = request.body;
          switch (body.tag) {
            case 'edit':
              dbResult = await db.updateCWUOpportunityVersion(connection, { ...body.value, id: request.params.id }, session);
              break;
            case 'publish':
              dbResult = await db.updateCWUOpportunityStatus(connection, request.params.id, CWUOpportunityStatus.Published, body.value, session);
              break;
            case 'startEvaluation':
              dbResult = await db.updateCWUOpportunityStatus(connection, request.params.id, CWUOpportunityStatus.Evaluation, body.value, session);
              break;
            case 'suspend':
              dbResult = await db.updateCWUOpportunityStatus(connection, request.params.id, CWUOpportunityStatus.Suspended, body.value, session);
              break;
            case 'cancel':
              dbResult = await db.updateCWUOpportunityStatus(connection, request.params.id, CWUOpportunityStatus.Canceled, body.value, session);
              break;
            case 'addAddendum':
              dbResult = await db.addCWUOpportunityAddendum(connection, request.params.id, body.value, session);
              break;
          }
          if (isInvalid(dbResult)) {
            return basicResponse(503, request.session, makeJsonResponseBody({ database: [db.ERROR_MESSAGE] }));
          }
          return basicResponse(200, request.session, makeJsonResponseBody(dbResult.value));
        },
        invalid: async request => {
          return basicResponse(400, request.session, makeJsonResponseBody(request.body));
        }
      })
    };
  },

  delete(connection) {
    return {
      async validateRequestBody(request) {
        if (!(await permissions.deleteCWUOpportunity(connection, request.session, request.params.id))) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        const validatedCWUOpportunity = await validateCWUOpportunityId(connection, request.params.id, request.session);
        if (isInvalid(validatedCWUOpportunity)) {
          return invalid({ notFound: ['Opportunity not found.'] });
        }
        if (validatedCWUOpportunity.value.status !== CWUOpportunityStatus.Draft) {
          return invalid({ permissions: [permissions.ERROR_MESSAGE] });
        }
        return valid(validatedCWUOpportunity.value.id);
      },
      respond: wrapRespond({
        valid: async request => {
          const dbResult = await db.deleteCWUOpportunity(connection, request.body);
          if (isInvalid(dbResult)) {
            return basicResponse(503, request.session, makeJsonResponseBody({ database: [db.ERROR_MESSAGE] }));
          }
          return basicResponse(200, request.session, makeJsonResponseBody(dbResult.value));
        },
        invalid: async request => {
          return basicResponse(400, request.session, makeJsonResponseBody(request.body));
        }
      })
    };
  }
};

export default resource;
