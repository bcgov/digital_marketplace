import { KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET, KEYCLOAK_REALM, KEYCLOAK_URL, ORIGIN } from 'back-end/config';
import { Connection, createUser, findOneUserByTypeAndUsername, updateSessionWithToken, updateSessionWithUser, updateUser } from 'back-end/lib/db';
import { makeErrorResponseBody, makeTextResponseBody, nullRequestBodyHandler, Request, Router, TextResponseBody } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';
import { generators, TokenSet, TokenSetParameters } from 'openid-client';
import qs from 'querystring';
import { request as httpRequest } from 'shared/lib/http';
import { Session } from 'shared/lib/resources/session';
import { KeyCloakIdentityProvider, User, UserStatus, UserType } from 'shared/lib/resources/user';
import { ClientHttpMethod } from 'shared/lib/types';

interface KeyCloakAuthQuery {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  response_mode: 'query';
  response_type: 'code';
  scope: 'openid';
  nonce: string;
  kc_idp_hint?: KeyCloakIdentityProvider;
}

interface KeyCloakTokenRequestData {
  code: string;
  grant_type: 'authorization_code';
  client_id: string;
  client_secret: string;
  scope: 'openid';
  redirect_uri: string;
}

async function makeRouter(connection: Connection): Promise<Router<any, any, any, any, TextResponseBody, any, any>> {
  return [
    {
      method: ServerHttpMethod.Get,
      path: '/auth/sign-in',
      handler: nullRequestBodyHandler(async request => {
        try {
          const provider = request.query.provider;
          const nonce = generators.codeVerifier();
          const authQuery: KeyCloakAuthQuery = {
            client_id: KEYCLOAK_CLIENT_ID,
            client_secret: KEYCLOAK_CLIENT_SECRET,
            redirect_uri: `${ORIGIN}/auth/callback`,
            response_mode: 'query',
            response_type: 'code',
            scope: 'openid',
            nonce
          };

          if (provider === 'github' || provider === 'idir') {
            authQuery.kc_idp_hint = provider;
          }
          const authQueryString = qs.stringify(authQuery);
          const authUrl = `${KEYCLOAK_URL}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?${authQueryString}`;

          return {
            code: 302,
            headers: {
              'Location': authUrl
            },
            session: request.session,
            body: makeTextResponseBody('')
          };
        } catch (error) {
          request.logger.error('authorization failed', makeErrorResponseBody(error));
          return makeAuthErrorRedirect(request);
        }
      })
    },
    {
      method: ServerHttpMethod.Get,
      path: '/auth/callback',
      handler: nullRequestBodyHandler(async request => {
        try {
          // Retrieve authorization code
          const { code } = request.query;

          // Use auth code to retrieve token asynchronously
          const data: KeyCloakTokenRequestData = {
            code,
            grant_type: 'authorization_code',
            client_id: KEYCLOAK_CLIENT_ID,
            client_secret: KEYCLOAK_CLIENT_SECRET,
            scope: 'openid',
            redirect_uri: `${ORIGIN}/auth/callback`
          };

          const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
          const response = await httpRequest(ClientHttpMethod.Post, `${KEYCLOAK_URL}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, qs.stringify(data), headers);

          if (response.status !== 200) {
            return makeAuthErrorRedirect(request);
          }

          // Extract claims and create/update user
          const tokens = new TokenSet(response.data as TokenSetParameters);
          const claims = tokens.claims();
          const idpUsername: string | undefined = claims.preferred_username;
          if (!idpUsername || !tokens.access_token || !tokens.refresh_token) {
            throw new Error('authentication failure - invalid claims');
          }

          // IDP type is appended to preferred username claim as '@idp-type`
          let userType: UserType;
          const identityProvider = idpUsername.substr(idpUsername.lastIndexOf('@') + 1);
          switch (identityProvider) {
            case 'idir':
              userType = UserType.Government;
              break;
            case 'github':
              userType = UserType.Vendor;
              break;
            default:
              request.logger.error('unknown identity provider', makeErrorResponseBody(new Error(identityProvider)));
              return makeAuthErrorRedirect(request);
          }

          let user: User | null = await findOneUserByTypeAndUsername(connection, userType, idpUsername);
          if (!user) {
            user = await createUser(connection, {
              type: userType,
              status: UserStatus.Active,
              name: claims.name || '',
              email: claims.email,
              idpUsername
            });
          } else if (user.status === UserStatus.InactiveByUser) {
            const { id } = user;
            await updateUser(connection, { id, status: UserStatus.Active });
          } else if (user.status === UserStatus.InactiveByAdmin) {
            // If deactivated by admin, reroute to error (separate route/page for this?)
            return makeAuthErrorRedirect(request);
          }

          let session = await updateSessionWithUser(connection, request.session.id, user.id);
          session = await updateSessionWithToken(connection, session.id, tokens.refresh_token);

          return {
            code: 302,
            headers: {
              'Location': '/sign-up/complete'
            },
            session,
            body: makeTextResponseBody('')
          };
        } catch (error) {
          request.logger.error('authorization failed', makeErrorResponseBody(error));
          return makeAuthErrorRedirect(request);
        }
      })
    }
  ];
}

function makeAuthErrorRedirect(request: Request<any, Session>) {
  return {
    code: 302,
    headers: {
      'Location': '/notice/auth-failure'
    },
    session: request.session,
    body: makeTextResponseBody('')
  };
}

export default makeRouter;
