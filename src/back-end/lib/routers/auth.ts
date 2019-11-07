import { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OPENID_CONNECT_REDIRECT_URI, ORIGIN } from 'back-end/config';
import { Connection, createUser, findOneUserByIssuerUidAndEmail, updateSessionWithIssuerRequestState, updateSessionWithUser } from 'back-end/lib/db';
import { makeErrorResponseBody, makeTextResponseBody, Router, TextResponseBody } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';
import { custom, generators, Issuer } from 'openid-client';
import { IssuerType, User } from 'shared/lib/types';

async function makeRouter(connection: Connection): Promise<Router<any, TextResponseBody, any>> {
  const googleIssuer = await Issuer.discover('https://accounts.google.com');
  const client = new googleIssuer.Client({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
    redirect_uris: [GOOGLE_OPENID_CONNECT_REDIRECT_URI],
    response_types: ['code']
  });
  client[custom.http_options] = options => {
    // Set the timeout to connect to Google to be 10s instead of the default 2.5s.
    // If this request times out this server fails to launch and throws an exception.
    options.timeout = 10000;
    return options;
  };
  client[custom.clock_tolerance] = 30;
  return [
    {
      method: ServerHttpMethod.Get,
      path: '/auth/sign-in',
      handler: {
        transformRequest: async () => null,
        async respond(request) {
          const issuerRequestState = generators.codeVerifier();
          const session = await updateSessionWithIssuerRequestState(connection, request.session.id, issuerRequestState);
          const issuerRequestStateChallenge = generators.codeChallenge(issuerRequestState);
          const redirectUrl = client.authorizationUrl({
            scope: 'openid email profile',
            code_challenge: issuerRequestStateChallenge,
            code_challenge_method: 'S256'
          });
          return {
            code: 302,
            headers: {
              'Location': redirectUrl
            },
            session,
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
            // Retrieve ID JWT.
            const tokens = await client.callback(GOOGLE_OPENID_CONNECT_REDIRECT_URI, request.query, {
              code_verifier: request.session.issuerRequestState || ''
            });
            // Get user.
            const idToken = tokens.claims();
            const issuerUid = idToken.sub as string;
            const email = idToken.email as string;
            let user: User | null = await findOneUserByIssuerUidAndEmail(connection, issuerUid, email);
            if (!user) {
              user = await createUser(connection, {
                issuerUid,
                email,
                name: (idToken.name as string) || 'Unknown Name',
                issuerType: IssuerType.Google
              })
            }
            const session = await updateSessionWithUser(connection, request.session.id, user.id);
            // Redirect users upon successful authentication to continue the enrollment process.
            return {
              code: 302,
              headers: {
                'Location': `${ORIGIN}/books`
              },
              session,
              body: makeTextResponseBody('')
            };
          } catch (error) {
            request.logger.error('authorization with google failed', makeErrorResponseBody(error));
            return {
              code: 302,
              headers: {
                'Location': `${ORIGIN}/notice/auth-failure`
              },
              session: request.session,
              body: makeTextResponseBody('')
            };
          }
        }
      }
    }
  ];
}

export default makeRouter;
