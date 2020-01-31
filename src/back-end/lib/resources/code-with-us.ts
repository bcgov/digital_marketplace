import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAttachments } from 'back-end/lib/validation';
import { get } from 'lodash';
import { getNumber, getString, getStringArray } from 'shared/lib';
import { CreateRequestBody as SharedRequestBody, CreateValidationErrors, CWUOpportunity, CWUOpportunitySlim } from 'shared/lib/resources/code-with-us';
import { FileRecord } from 'shared/lib/resources/file';
import { Session } from 'shared/lib/resources/session';
import { allValid, getInvalidValue, invalid, isInvalid, valid, validateUUID } from 'shared/lib/validation';
import * as opportunityValidation from 'shared/lib/validation/code-with-us';

interface CreateRequestBody extends Omit<SharedRequestBody, 'status' | 'proposalDeadline' | 'completionDate' | 'assignmentDate' | 'startDate'> {
  proposalDeadline: string;
  completionDate: string;
  assignmentDate: string;
  startDate: string;
}

export type ValidatedCreateRequestBody = Omit<CWUOpportunity, 'status' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;

type Resource = crud.Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  Session,
  db.Connection
>;

const resource: Resource = {
  routeNamespace: 'code-with-us',

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
          attachments: getStringArray(body, 'attachments')
        };
      },
      async validateRequestBody(request) {
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

        if (!permissions.createCWUOpportunity(request.session)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
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
        const validatedProposalDeadline = opportunityValidation.validateDate(proposalDeadline, new Date());
        const validatedAssignmentDate = opportunityValidation.validateDate(assignmentDate, new Date());
        const validatedStartDate = opportunityValidation.validateDate(startDate, new Date());
        const validatedCompletionDate = opportunityValidation.validateDate(completionDate, new Date());
        const validatedSubmissionInfo = opportunityValidation.validateSubmissionInfo(submissionInfo);
        const validatedAcceptanceCriteria = opportunityValidation.validateAcceptanceCriteria(acceptanceCriteria);
        const validatedEvaluationCriteria = opportunityValidation.validateEvaluationCriteria(evaluationCriteria);
        const validatedAttachments = await validateAttachments(connection, attachments);

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
            attachments: (validatedAttachments.value as FileRecord[]).map(v => v.id)
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
          const dbResult = await db.createCWUOpportunity(connection, request.body, request.session);
          if (isInvalid(dbResult)) {
            return basicResponse(503, request.session, makeJsonResponseBody({ database: [db.ERROR_MESSAGE] }));
          }
          return basicResponse(200, request.session, makeJsonResponseBody(dbResult.value));
        }),
        invalid: (async request => {
          return basicResponse(400, request.session, makeJsonResponseBody(request.body));
        })
      })
    };
  }
};

export default resource;
