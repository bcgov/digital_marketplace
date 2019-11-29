import axios from 'axios';
import { KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET, KEYCLOAK_REALM, KEYCLOAK_URL, ORIGIN } from 'back-end/config';
import { Connection, createAnonymousSession, createUser, deleteSession, findOneUserByTypeAndUsername, readOneSession, updateSessionWithToken, updateSessionWithUser } from 'back-end/lib/db';
import { makeErrorResponseBody, makeTextResponseBody, Request, Router, TextResponseBody,  } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';
import { generators, TokenSet } from 'openid-client';
import qs from 'querystring';
import { Session } from 'shared/lib/resources/session';
import { User, UserStatus, UserType } from 'shared/lib/resources/user';

async function makeRouter(connection: Connection): Promise<Router<any, TextResponseBody, any>> {
  return [
    {
      method: ServerHttpMethod.Get,
      path: '/auth/sign-in',
      handler: {
        transformRequest: async () => null,
        async respond(request) {
          const redirectUrl = qs.escape(`${ORIGIN}/auth/callback`);
          const nonce = generators.codeVerifier();
          const authUrl = `${KEYCLOAK_URL}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth` +
                          `?client_id=${KEYCLOAK_CLIENT_ID}` +
                          `&client_secret=${KEYCLOAK_CLIENT_SECRET}` +
                          `&redirect_uri=${redirectUrl}` +
                          `&response_type=code` +
                          `&response_mode=query` +
                          `&scope=openid` +
                          `&nonce=${nonce}`;

          return {
            code: 302,
            headers: {
              'Location': authUrl
            },
            session: request.session,
            body: makeTextResponseBody('')
          };
        }
      }
    },
    {
      method: ServerHttpMethod.Get,
      path: '/auth/callback',
      handler: {
        transformRequest: async () => null,
        async respond(request) {
          try {
            // Retrieve authorization code
            const { code } = request.query;

            // Use auth code to retrieve token asynchronously
            const formData = qs.stringify({
              code,
              grant_type: 'authorization_code',
              client_id: KEYCLOAK_CLIENT_ID,
              client_secret: KEYCLOAK_CLIENT_SECRET,
              scope: 'openid',
              redirect_uri: `${ORIGIN}/auth/callback`
            });

            const axiosResponse = await axios({
              method: ServerHttpMethod.Post,
              url: `${KEYCLOAK_URL}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
              data: formData,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // Extract claims and create/update user
            const tokens = new TokenSet(axiosResponse.data);
            const claims = tokens.claims();
            const idpUsername: string | undefined = claims.preferred_username;
            if (!idpUsername || !tokens.access_token || !tokens.refresh_token) {
              throw new Error('authentication failure - invalid claims');
            }
            const userType = idpUsername.endsWith('@idir') ? UserType.Government : UserType.Vendor;
            let user: User | null = await findOneUserByTypeAndUsername(connection, userType, idpUsername);

            if (!user) {
              user = await createUser(connection, {
                type: userType,
                status: UserStatus.Active,
                name: claims.name ? claims.name : '',
                email: claims.email,
                notificationsOn: false,
                acceptedTerms: false,
                idpUsername
              });
            }

            let session = await updateSessionWithUser(connection, request.session.id, user.id);
            session = await updateSessionWithToken(connection, session.id, tokens.refresh_token);

            return {
              code: 302,
              headers: {
                'Location': '/' // TODO: Redirect to proper landing page post-login.
              },
              session,
              body: makeTextResponseBody('')
            };
          } catch (error) {
            request.logger.error('authorization failed', makeErrorResponseBody(error));
            return {
              code: 302,
              headers: {
                'Location': `/error`
              },
              session: request.session,
              body: makeTextResponseBody('')
            };
          }
        }
      }
    },
    {
      method: ServerHttpMethod.Get,
      path: '/auth/logout',
      handler: {
        transformRequest: async () => null,
        async respond(request: Request<Body, Session>) {
          try {
            // Retrieve the corresponding session, and keycloak token
            let session = await readOneSession(connection, request.session.id);

            const formData = qs.stringify({
              client_id: KEYCLOAK_CLIENT_ID,
              client_secret: KEYCLOAK_CLIENT_SECRET,
              scope: 'openid',
              refresh_token: session.accessToken
            });

            await axios({
              method: ServerHttpMethod.Post,
              url: `${KEYCLOAK_URL}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`,
              data: formData,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            });

            // Delete the current session and create a new anonymous one
            await deleteSession(connection, session.id);
            session = await createAnonymousSession(connection);

            return {
              code: 302,
              headers: {
                'Location': '/'
              },
              session,
              body: makeTextResponseBody('')
            };
          } catch (error) {
            request.logger.error('logout failed', makeErrorResponseBody(error));
            return {
              code: 302,
              headers: {
                'Location': `/error`
              },
              session: request.session,
              body: makeTextResponseBody('An error occurred while logging out')
            };
          }
        }
      }
    }
  ];
}

export default makeRouter;
