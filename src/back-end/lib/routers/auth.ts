import { KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET, KEYCLOAK_REALM, KEYCLOAK_URL } from 'back-end/config';
import { prefixPath } from 'back-end/lib';
import { Connection, createSession, createUser, findOneUserByTypeAndIdp, updateUser } from 'back-end/lib/db';
import { accountReactivatedSelf, userAccountRegistered } from 'back-end/lib/mailer/notifications/user';
import { makeErrorResponseBody, makeTextResponseBody, nullRequestBodyHandler, Request, Router, TextResponseBody } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';
import { generators, TokenSet, TokenSetParameters } from 'openid-client';
import qs from 'querystring';
import { GOV_IDP_SUFFIX, VENDOR_IDP_SUFFIX } from 'shared/config';
import { getString, getStringArray } from 'shared/lib';
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
    },
    // /auth/createsession is for testing only, so only exists outside of production
    // @ts-ignore
    ...(process.env.NODE_ENV === 'development' ? [{
      method: ServerHttpMethod.Get,
      path: '/auth/createsession',
      // @ts-ignore
      handler: nullRequestBodyHandler(async request => {
        try {
          const userType = UserType.Government; // Add a check for gov vs. admin as test suite expands
          const idpId = 'test-gov' // Add a check for gov vs. admin as test suite expands
          const dbResult = await findOneUserByTypeAndIdp(connection, userType, idpId);
          if (isInvalid(dbResult)) {
           // @ts-ignore
            makeAuthErrorRedirect(request);
          }
          const user = dbResult.value as User | null;

          if (!user) {
            console.log('Error: Test user does not exist in database')
            return;
          }
          const result = await createSession(connection, {
            user: user && user.id,
            accessToken: '' // This token isn't required anywhere
          });
          if (isInvalid(result)) {
            // @ts-ignore
            makeAuthErrorRedirect(request);
            console.log('Error: Unsuccessful login')
            return null;
          }

          const session = result.value;

          const signinCompleteLocation = prefixPath('/dashboard');
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
          console.log('Error: Unsuccessful login')
          // @ts-ignore
          return makeAuthErrorRedirect(request);
        }
      })
    }] : []),
  ];
  return router;
}

// Process claims into a user, and establish a session
// If something goes wrong return null
async function establishSessionWithClaims(connection: Connection, request: Request<any, Session>, tokenSet: TokenSet) {
  const claims = tokenSet.claims();
  let userType: UserType;
  const identityProvider = getString(claims, 'loginSource');
  switch (identityProvider) {
    case GOV_IDP_SUFFIX.toUpperCase(): {
      const roles = getStringArray(claims, 'roles');
      if (roles.includes('dm_admin')) {
        userType = UserType.Admin;
      } else {
        userType = UserType.Government;
      }
      break;
    }
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

  const dbResult = await findOneUserByTypeAndIdp(connection, userType, idpId);
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
      email: claims.email || null,
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
