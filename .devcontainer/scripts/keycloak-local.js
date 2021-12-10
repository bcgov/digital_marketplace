require('dotenv').config();
const KcAdminClient = require('@keycloak/keycloak-admin-client').default;

const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
const KEYCLOAK_USERNAME = process.env.KEYCLOAK_USER;
const KEYCLOAK_PASSWORD = process.env.KEYCLOAK_PASSWORD;

const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;

const ID_PROVIDER = process.env.ID_PROVIDER;
const ID_PROVIDER_CLIENT_ID = process.env.ID_PROVIDER_CLIENT_ID;
const ID_PROVIDER_CLIENT_SECRET = process.env.ID_PROVIDER_CLIENT_SECRET;

const kcAdminClient = new KcAdminClient({ baseUrl: `${KEYCLOAK_URL}/auth` });

async function main() {
  try {
    await kcAdminClient.auth({
      grantType: 'password',
      clientId: 'admin-cli',
      password: KEYCLOAK_PASSWORD,
      username: KEYCLOAK_USERNAME,
    });

    const realms = await kcAdminClient.realms.find();

    const existingRealm = realms.find(realms => realms['realm'] === KEYCLOAK_REALM);

    if (!existingRealm) {
      const createRealm = (realm) => kcAdminClient.realms.create({ realm, enabled: true });
      const payload = await createRealm(KEYCLOAK_REALM);
      console.log("Realm created: ", payload);
    }

    kcAdminClient.setConfig({
      realmName: KEYCLOAK_REALM,
    });

    const clients = await kcAdminClient.clients.find({ realm: KEYCLOAK_REALM });
    const client = clients.find((x) => x.clientId === KEYCLOAK_CLIENT_ID);

    if (!client) {
      console.log(`Creating client: ${KEYCLOAK_CLIENT_ID}`);

      await kcAdminClient.clients.create({
        realm: KEYCLOAK_REALM,
        clientId: KEYCLOAK_CLIENT_ID,
        surrogateAuthRequired: false,
        enabled: true,
        secret: KEYCLOAK_CLIENT_SECRET,
        alwaysDisplayInConsole: false,
        clientAuthenticatorType: 'client-secret',
        redirectUris: ['*'],
        webOrigins: ['+'],
        notBefore: 0,
        bearerOnly: false,
        consentRequired: false,
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        directAccessGrantsEnabled: true,
        serviceAccountsEnabled: false,
        publicClient: false,
        frontchannelLogout: false,
        protocol: 'openid-connect',
        protocolMappers: [{
          protocol: 'openid-connect',
          name: 'Login Source',
          protocolMapper: 'oidc-usermodel-attribute-mapper',
          config: {
            'userinfo.token.claim': 'true',
            'id.token.claim': 'true',
            'access.token.claim': 'true',
            'user.attribute': 'loginSource',
            'claim.name': 'loginSource',
            'jsonType.label': 'String',
          }
        },
        {
          protocol: 'openid-connect',
          name: 'Idp Id',
          protocolMapper: 'oidc-usermodel-attribute-mapper',
          config: {
            'userinfo.token.claim': 'true',
            'id.token.claim': 'true',
            'access.token.claim': 'true',
            'user.attribute': 'idp_id',
            'claim.name': 'idp_id',
            'jsonType.label': 'String',
          }
        }],
        attributes: {
          'saml.assertion.signature': 'false',
          'saml.multivalued.roles': 'false',
          'saml.force.post.binding': 'false',
          'saml.encrypt': 'false',
          'oauth2.device.authorization.grant.enabled': 'false',
          'backchannel.logout.revoke.offline.tokens': 'false',
          'saml.server.signature': 'false',
          'saml.server.signature.keyinfo.ext': 'false',
          'use.refresh.tokens': 'true',
          'exclude.session.state.from.auth.response': 'false',
          'oidc.ciba.grant.enabled': 'false',
          'saml.artifact.binding': 'false',
          'backchannel.logout.session.required': 'true',
          'client_credentials.use_refresh_token': 'false',
          saml_force_name_id_format: 'false',
          'saml.client.signature': 'false',
          'tls.client.certificate.bound.access.tokens': 'false',
          'saml.authnstatement': 'false',
          'display.on.consent.screen': 'false',
          'saml.onetimeuse.condition': 'false',
        },
        authenticationFlowBindingOverrides: {},
        fullScopeAllowed: true,
        nodeReRegistrationTimeout: -1,
        defaultClientScopes: ['web-origins', 'profile', 'roles', 'email'],
        optionalClientScopes: ['address', 'phone', 'offline_access', 'microprofile-jwt'],
        access: { view: true, configure: true, manage: true },
      });
    }

    const idp = await kcAdminClient.identityProviders.findOne({ alias: ID_PROVIDER });
    const mappers = await kcAdminClient.identityProviders.find({ alias: 'github' });

    if (!idp) {
      console.log(`Creating Identity Provider: ${ID_PROVIDER}`);
      const idpurl = `${KEYCLOAK_URL}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect`;

      await kcAdminClient.identityProviders.create({
        realm: KEYCLOAK_REALM,
        alias: 'github',
        displayName: 'github',
        providerId: 'github',
        enabled: true,
        trustEmail: false,
        storeToken: false,
        addReadTokenRoleOnCreate: false,
        authenticateByDefault: false,
        linkOnly: false,
        firstBrokerLoginFlowAlias: 'first broker login',
        config: {
          authorizationUrl: `${idpurl}/auth`,
          tokenUrl: `${idpurl}/token`,
          logoutUrl: `${idpurl}/logout`,
          userInfoUrl: `${idpurl}/userinfo`,
          syncMode: 'IMPORT',
          clientAuthMethod: 'client_secret_basic',
          clientId: ID_PROVIDER_CLIENT_ID,
          clientSecret: ID_PROVIDER_CLIENT_SECRET,
          backchannelSupported: 'false',
          useJwksUrl: 'true',
          loginHint: 'false',
        }
      });

      const loginSourceMapperData = {
        name: 'loginSource',
        identityProviderAlias: 'github',
        identityProviderMapper: 'hardcoded-attribute-idp-mapper',
        config: {
          'attribute.value': 'GITHUB',
          syncMode: 'INHERIT',
          attribute: 'loginSource'
        }
      }
      const idpIdMapperData = {
        name: 'idp_id',
        identityProviderAlias: 'github',
        identityProviderMapper: 'hardcoded-attribute-idp-mapper',
        config: {
          'attribute.value': 'GITHUB',
          syncMode: 'INHERIT',
          attribute: 'idp_id',
        }
      }

      await kcAdminClient.identityProviders.createMapper({
        alias: 'github',
        identityProviderMapper: loginSourceMapperData
      });

      await kcAdminClient.identityProviders.createMapper({
        alias: 'github',
        identityProviderMapper: idpIdMapperData
      });
    }

  } catch (err) {
    console.log("Error: ", err);
  }
}
main();
