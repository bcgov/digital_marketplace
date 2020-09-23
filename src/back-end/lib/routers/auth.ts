import { KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET, KEYCLOAK_REALM, KEYCLOAK_URL, SERVICE_TOKEN_HASH } from 'back-end/config';
import { prefixPath } from 'back-end/lib';
import { Connection, createSession, createUser, deleteSession, findOneUserByTypeAndUsername, readOneSession, updateUser } from 'back-end/lib/db';
import { accountReactivatedSelf, userAccountRegistered } from 'back-end/lib/mailer/notifications/user';
import { authenticatePassword } from 'back-end/lib/security';
import { makeErrorResponseBody, makeTextResponseBody, nullRequestBodyHandler, passThroughRequestBodyHandler, Request, Router, TextResponseBody } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';
import { generators, TokenSet, TokenSetParameters } from 'openid-client';
import qs from 'querystring';
import { getString, getStringArray } from 'shared/lib';
import { GOV_IDP_SUFFIX, VENDOR_IDP_SUFFIX } from 'shared/lib/config.json';
import { request as httpRequest } from 'shared/lib/http';
import { Session } from 'shared/lib/resources/session';
import { KeyCloakIdentityProvider, User, UserStatus, UserType } from 'shared/lib/resources/user';
import { ClientHttpMethod } from 'shared/lib/types';
import { getValidValue, isInvalid, isValid } from 'shared/lib/validation';

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
  const router: Router<any, any, any, any, TextResponseBody, any, any> = [
    {
      method: ServerHttpMethod.Get,
      path: '/auth/sign-in',
      handler: nullRequestBodyHandler(async request => {
        try {
          const provider = request.query.provider;
          const redirectOnSuccess = request.query.redirectOnSuccess;
          const nonce = generators.codeVerifier();
          const authQuery: KeyCloakAuthQuery = {
            client_id: KEYCLOAK_CLIENT_ID,
            client_secret: KEYCLOAK_CLIENT_SECRET,
            redirect_uri: prefixPath('auth/callback'),
            response_mode: 'query',
            response_type: 'code',
            scope: 'openid',
            nonce
          };

          // If redirectOnSuccess specified, include that as query parameter for callback
          if (redirectOnSuccess) {
            authQuery.redirect_uri += `?redirectOnSuccess=${redirectOnSuccess}`;
          }

          if (provider === VENDOR_IDP_SUFFIX || provider === GOV_IDP_SUFFIX) {
            authQuery.kc_idp_hint = provider;
          }
          // Cast authQuery as any to support use with qs.stringify.
          // The types between openid-client and qs aren't compatible unfortunately.
          // Might be worthwhile extracting required values from authQuery into a separate
          // object that can be passed to qs.stringify.
          const authQueryString = qs.stringify(authQuery as any);
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
          // Retrieve authorization code and redirect
          const { code, redirectOnSuccess } = request.query;

          // Use auth code to retrieve token asynchronously
          const data: KeyCloakTokenRequestData = {
            code,
            grant_type: 'authorization_code',
            client_id: KEYCLOAK_CLIENT_ID,
            client_secret: KEYCLOAK_CLIENT_SECRET,
            scope: 'openid',
            redirect_uri: prefixPath('auth/callback')
          };

          // If redirectOnSuccess was provided on callback, this must also be provided on token request (redirect_uri must match for each request)
          if (redirectOnSuccess) {
            data.redirect_uri += `?redirectOnSuccess=${redirectOnSuccess}`;
          }

          const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
          // data as any --> pacify the compiler
          const response = await httpRequest(ClientHttpMethod.Post, `${KEYCLOAK_URL}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, qs.stringify(data as any), headers);

          if (response.status !== 200) {
            return makeAuthErrorRedirect(request);
          }

          const tokenSet = new TokenSet(response.data as TokenSetParameters);
          const { session, existingUser } = await establishSessionWithClaims(connection, request, tokenSet) || {};
          if (!session) {
            throw new Error('unable to create session');
          }

          const signinCompleteLocation = redirectOnSuccess ? redirectOnSuccess : (existingUser ? prefixPath('/dashboard') : prefixPath('/sign-up/complete'));

          return {
            code: 302,
            headers: {
              'Location': signinCompleteLocation
            },
            session,
            body: makeTextResponseBody('')
          };
        } catch (error) {
          request.logger.error('authentication failed', makeErrorResponseBody(error));
          return makeAuthErrorRedirect(request);
        }
      })
    }
  ];

  // Routes that are added only if the service token environment variable is defined
  // Requests to these routes much include the correct service token in order to be processed.
  if (SERVICE_TOKEN_HASH) {

    // The /auth/service endpoint is for creating user accounts for testing purposes.
    // The test users must already exist in KeyCloak with the appropriate attributes and claims.
    router.push({
      method: ServerHttpMethod.Post,
      path: '/auth/service',
      handler: passThroughRequestBodyHandler(async request => {
        try {
          // Retrieve service token from query paramters and validate
          const serviceToken = request.query.token;
          if (!serviceToken || !await authenticatePassword(serviceToken, SERVICE_TOKEN_HASH)) {
            return {
              code: 401,
              headers: {},
              session: request.session,
              body: makeTextResponseBody('Not authorized')
            };
          }
          // Extract claims and create/update user
          const validRequestBody = getValidValue(request.body, undefined);
          if (!validRequestBody) {
            throw new Error('no request body provided');
          }

          const body: unknown = validRequestBody.tag === 'json' ? validRequestBody.value : {};
          const tokens = new TokenSet(body as TokenSetParameters);
          const { session } = await establishSessionWithClaims(connection, request, tokens) || {};
          if (!session) {
            throw new Error('unable to establish session');
          }
          return {
            code: 200,
            headers: {},
            session,
            body: makeTextResponseBody('')
          };
        } catch (error) {
          return {
            code: 400,
            headers: {},
            session: request.session,
            body: makeTextResponseBody('')
          };
        }
      })
    });

    // The /auth/override-session endpoint is for overriding an existing session with a new user account.
    // For instance, a session attached to a government account, could be overridden to use a vendor account instead.
    // This should be used only for testing and QA purposes, and is not meant for use in production.
    router.push({
      method: ServerHttpMethod.Get,
      path: '/auth/override-session/:type/:username',
      handler: nullRequestBodyHandler(async request => {
        try {
          // Retrieve service token from query paramters and validate.
          // Also check that current session is authenticated.
          const serviceToken = request.query.token;
          if (!await authenticatePassword(serviceToken, SERVICE_TOKEN_HASH) || !request.session.user) {
            return {
              code: 401,
              headers: {},
              session: request.session,
              body: makeTextResponseBody('Not authorized')
            };
          }

          // Validate the given user username and type for overriding, and modify the session with the returned id
          const overrideUserName = request.params.username;
          let overrideAccountType;
          switch (request.params.type.toLowerCase()) {
            case 'vendor':
              overrideAccountType = UserType.Vendor;
              break;
            case 'gov':
              overrideAccountType = UserType.Government;
              break;
            case 'admin':
              overrideAccountType = UserType.Admin;
              break;
            default:
              return {
                code: 400,
                headers: {},
                session: request.session,
                body: makeTextResponseBody('')
              };
          }
          const overrideUser = getValidValue(await findOneUserByTypeAndUsername(connection, overrideAccountType, overrideUserName), undefined);
          const currentSession = getValidValue(await readOneSession(connection, request.session.id), undefined);
          if (overrideUser && currentSession) {
            const newSession = getValidValue(await createSession(connection, { accessToken: currentSession.accessToken, user: overrideUser.id }), currentSession);
            await deleteSession(connection, currentSession.id);
            return {
              code: 200,
              headers: {},
              session: newSession,
              body: makeTextResponseBody('OK')
            };
          }
          return {
            code: 400,
            headers: {},
            session: request.session,
            body: makeTextResponseBody('')
          };
        } catch (error) {
          return {
            code: 400,
            headers: {},
            session: request.session,
            body: makeTextResponseBody('')
          };
        }
      })
    });
  }
  return router;
}

// Process claims into a user, and establish a session
// If something goes wrong return null
async function establishSessionWithClaims(connection: Connection, request: Request<any, Session>, tokenSet: TokenSet) {
  const claims = tokenSet.claims();
  let userType: UserType;
  const identityProvider = getString(claims, 'loginSource');
  switch (identityProvider) {
    case GOV_IDP_SUFFIX.toUpperCase():
      const roles = getStringArray(claims, 'roles');
      if (roles.includes('dm_admin')) {
        userType = UserType.Admin;
      } else {
        userType = UserType.Government;
      }
      break;
    case VENDOR_IDP_SUFFIX.toUpperCase():
      userType = UserType.Vendor;
      break;
    default:
      request.logger.error('unknown identity provider', makeErrorResponseBody(new Error(identityProvider)));
      makeAuthErrorRedirect(request);
      return null;
  }

  let username = getString(claims, 'preferred_username');
  const idpId = getString(claims, 'idp_id');

  // Strip the vendor/gov suffix if present.  We want to match and store the username without suffix.
  if ((username.endsWith('@' + VENDOR_IDP_SUFFIX) && userType === UserType.Vendor) || (username.endsWith('@' + GOV_IDP_SUFFIX) && userType === UserType.Government)) {
    username = username.slice(0, username.lastIndexOf('@'));
  }

  if (!username || !idpId || !tokenSet.access_token || !tokenSet.refresh_token) {
    throw new Error('authentication failure - invalid claims');
  }

  const dbResult = await findOneUserByTypeAndUsername(connection, userType, username);
  if (isInvalid(dbResult)) {
    makeAuthErrorRedirect(request);
  }
  let user = dbResult.value as User | null;
  const existingUser = !!user;
  if (!user) {
    user = getValidValue(await createUser(connection, {
      idpId,
      type: userType,
      status: UserStatus.Active,
      name: claims.name || '',
      email: claims.email || '',
      jobTitle: '',
      idpUsername: username
    }), null);

    // If email present, notify of successful account creation
    if (user && user.email) {
      userAccountRegistered(user);
    }
  } else if (user.status === UserStatus.InactiveByUser) {
    const { id } = user;
    const dbResult = await updateUser(connection, { id, status: UserStatus.Active });
    // // Send notification
    if (isValid(dbResult)) {
      accountReactivatedSelf(dbResult.value);
    }
  } else if (user.status === UserStatus.InactiveByAdmin) {
    makeAuthErrorRedirect(request);
    return null;
  }

  if (!user) {
    makeAuthErrorRedirect(request);
    return null;
  }

  const result = await createSession(connection, {
    user: user && user.id,
    accessToken: tokenSet.refresh_token
  });
  if (isInvalid(result)) {
    makeAuthErrorRedirect(request);
    return null;
  }

  return { session: result.value, existingUser };
}

function makeAuthErrorRedirect(request: Request<any, Session>) {
  return {
    code: 302,
    headers: {
      'Location': prefixPath('/notice/authFailure')
    },
    session: request.session,
    body: makeTextResponseBody('')
  };
}

export default makeRouter;
