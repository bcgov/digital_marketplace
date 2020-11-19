import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import { handleTermsUpdated } from 'back-end/lib/mailer/notifications/termsUpdated';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, makeJsonResponseBody, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { getString } from 'shared/lib';
import { invalid, valid } from 'shared/lib/http';
import { CreateRequestBody as SharedCreateRequestBody, CreateValidationErrors } from 'shared/lib/resources/emailNotifications';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { adt } from 'shared/lib/types';

type CreateRequestBody = SharedCreateRequestBody | null;

export interface ValidatedCreateRequestBody {
  session: AuthenticatedSession;
  body: SharedCreateRequestBody;
}

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
  routeNamespace: 'email-notifications',

  create(connection) {
    return {
      async parseRequestBody(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        const tag = getString(body, 'tag');
        switch (tag) {
          case 'updateTerms':
            return adt('updateTerms');
          default:
            return null;
        }
      },

      async validateRequestBody(request) {
        if (!request.body) { return invalid({ emailNotification: adt('parseFailure' as const) }); }
        if (!permissions.updateTermsNotification(request.session) || !permissions.isSignedIn(request.session)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        switch (request.body.tag) {
          case 'updateTerms':
            return valid({
              session: request.session,
              body: adt('updateTerms' as const)
            });
          default:
            return invalid({ emailNotification: adt('parseFailure' as const) });
        }
      },

      respond: wrapRespond({
        valid: (async request => {
          const { session, body } = request.body;
          switch (body.tag) {
            case 'updateTerms':
              handleTermsUpdated(connection);
              break;
          }
          return basicResponse(200, session, makeJsonResponseBody(null));
        }),
        invalid: (async request => {
          return basicResponse(400, request.session, makeJsonResponseBody(request.body));
        })
      })
    };
  }
};

export default resource;
