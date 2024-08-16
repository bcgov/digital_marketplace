import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  JsonResponseBody,
  basicResponse,
  makeJsonResponseBody,
  wrapRespond
} from "back-end/lib/server";
import { validateSWUProposalId } from "back-end/lib/validation";
import { get, omit } from "lodash";
import { getString } from "shared/lib";
import {
  CreateValidationErrors,
  SWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationStatus,
  SWUTeamQuestionResponseEvaluationType,
  CreateRequestBody as SharedCreateRequestBody
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { Id } from "shared/lib/types";
import {
  getInvalidValue,
  invalid,
  isInvalid,
  isValid,
  valid
} from "shared/lib/validation";
import * as questionEvaluationValidation from "shared/lib/validation/question-evaluation/sprint-with-us";

interface ValidatedCreateRequestBody extends SharedCreateRequestBody {
  session: AuthenticatedSession;
  evaluationPanelMember: Id;
}

type CreateRequestBody = Omit<SharedCreateRequestBody, "type" | "status"> & {
  status: string;
  type: string;
};

const routeNamespace = "question-evaluations/sprint-with-us";

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
        proposal: getString(body, "proposal"),
        type: getString(body, "type"),
        status: getString(body, "status"),
        scores: get(body, "scores")
      };
    },
    async validateRequestBody(request) {
      const { proposal, type, scores, status } = request.body;

      if (!permissions.isSignedIn(request.session)) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      const validatedType =
        questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationType(
          type,
          [
            SWUTeamQuestionResponseEvaluationType.Conensus,
            SWUTeamQuestionResponseEvaluationType.Individual
          ]
        );
      if (isInvalid(validatedType)) {
        return invalid({
          type: validatedType.value
        });
      }

      const validatedStatus =
        questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationStatus(
          status,
          [SWUTeamQuestionResponseEvaluationStatus.Draft]
        );
      if (isInvalid(validatedStatus)) {
        return invalid({
          status: validatedStatus.value
        });
      }

      const validatedSWUProposal = await validateSWUProposalId(
        connection,
        proposal,
        request.session
      );
      if (isInvalid(validatedSWUProposal)) {
        return invalid({
          proposal: getInvalidValue(validatedSWUProposal, undefined)
        });
      }

      if (
        !(await permissions.createSWUTeamQuestionResponseEvaluation(
          connection,
          request.session,
          validatedSWUProposal.value
        ))
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      const validatedSWUPanelEvaluationPanelMember =
        await db.readOneSWUEvaluationPanelMemberWithId(
          connection,
          request.session.user.id,
          validatedSWUProposal.value.opportunity.id
        );
      if (!validatedSWUPanelEvaluationPanelMember.value) {
        return invalid({
          evaluationPanelMember: ["evaluation panel member not found"]
        });
      }

      const validatedScores =
        questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationScores(
          scores,
          validatedSWUProposal.value.teamQuestionResponses
        );

      if (isValid(validatedScores)) {
        return valid({
          session: request.session,
          proposal: validatedSWUProposal.value.id,
          evaluationPanelMember:
            validatedSWUPanelEvaluationPanelMember.value.id,
          status: validatedStatus.value,
          type: validatedType.value,
          scores: validatedScores.value
        } as ValidatedCreateRequestBody);
      } else {
        return invalid({
          scores: getInvalidValue(validatedScores, undefined)
        });
      }
    },
    respond: wrapRespond<
      ValidatedCreateRequestBody,
      CreateValidationErrors,
      JsonResponseBody<SWUTeamQuestionResponseEvaluation>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const dbResult = await db.createSWUTeamQuestionResponseEvaluation(
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
  create
};

export default resource;
