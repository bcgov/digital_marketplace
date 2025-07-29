# Notes for Digital Marketplace deployment to OCP4

All below commands should be run from openshift directory in the project root. You will also need to log in with the oc command line tool and a token retrieved from the OpenShift 4 Web GUI.

For instructions on deploying the Backup Container for each environment please refer to [backups.md](../build-deploy/backups.md).

For instructions on deploying the new AI services (NestJS AI service and ChromaDB) please refer to [ai-services.md](../build-deploy/ai-services.md).

-----
## Prerequisites

### Network
For appropriate security on deployed pods:

    Kubernetes Network Policies should be in place, see the [Network Policy QuickStart](https://github.com/bcgov/how-to-workshops/tree/master/labs/netpol-quickstart)

-----
### Role Binding
To create permissions for image pulls between namespaces, run this in the tools namespace, replacing `<namespace>` with the name of the namespace that is pulling images (e.g. ccc866-dev):

`oc policy add-role-to-user system:image-puller system:serviceaccount:<namespace>:default --namespace=ccc866-tools`

-----
### Build Configs
#### Application Image build
To apply updated build configs for the application images, run these commands in the tools namespace:

```
oc -n ccc866-tools process -f openshift/templates/app/app-digmkt-build.yaml -p ENV_NAME=dev -p GIT_REF=development | oc -n ccc866-tools apply -f -
oc -n ccc866-tools process -f openshift/templates/app/app-digmkt-build.yaml -p ENV_NAME=test -p GIT_REF=master | oc -n ccc866-tools apply -f -
oc -n ccc866-tools process -f openshift/templates/app/app-digmkt-build.yaml -p ENV_NAME=prod -p GIT_REF=master | oc -n ccc866-tools apply -f -
```

**Note**: If the build doesn't already exists the `apply` option may not work as expected.  This can be fixed by using `create` instead of `apply`.  Once the build config is successfully created, run: `oc start-build <buildconfig_name>` to trigger the build.

------
#### Patroni-postgres build

Currently we use a Platform Services built image stored in Artifactory for Patroni-PostgreSQL. The image is maintained and available to all namespaces. In short, no build configs necessary.

More information: https://github.com/bcgov/patroni-postgres-container

##### Artifactory Overview
 - **How is the Service Accessed**
	- artifacts.developer.gov.bc.ca

 - **What is it used for**
	- Marketplace project is using it to obtain access to a shared image (postgres/patroni), which is built and maintained by the platform services team.

 - **How is it authenticated**
	- every namespace is supplied with a default username/password that follows the pattern `artifacts-default-xxxxx`. Run `oc get secrets -n ccc866-tools` to verify.

## Patroni-Postgres deploy
To deploy a highly available Patroni-PostgreSQL stateful set (for use in DEV/TEST/PROD), run the following:

**First time only**

```
oc project ccc866-<dev/test/prod>
oc process -f openshift/templates/database/patroni-prereq-create.yaml -p TAG_NAME=<dev/test/prod> | oc create -f -
```

**Deploy**
```
oc project ccc866-<dev/test/prod>
oc process -f openshift/templates/database/patroni-digmkt-deploy.yaml -p TAG_NAME=<dev/test/prod> -p PVC_SIZE=<2Gi/10Gi> | oc apply -f -
```

------
## Application deploy
To deploy the Digital Marketplace app, run these commands in each namespace (dev/test/prod).
Replace `<secret>` with the KeyCloak `{"credentials": {"secret": <value> }}` for the target environment. Configuration for each of the environments can be retrieved from the [Common Hosted Single Sign-on Service](https://bcgov.github.io/sso-requests). Mappings between a sample output from the SSO service and the application config are as follows:

```json
{
  "confidential-port": 0,
  "auth-server-url": "<url>/auth",
  "realm": "<realm>",
  "ssl-required": "external",
  "resource": "<resource>",
  "credentials": {
    "secret": "<secret>"
  }
}
````

```yaml
KEYCLOAK_CLIENT_ID="<resource>"
KEYCLOAK_CLIENT_SECRET="<secret>"
KEYCLOAK_URL="<url>"
KEYCLOAK_REALM="<realm>"
```

**Optional:** To password protect the dev and test namespace deployments, replace `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD_HASH` with the basic auth credentials desired. Leaving these parameters off the deployment command will deactivate login. The hashed password can be generated using the npm library bcrypt `bcrypt.hash('<password>',10)`. (NOTE:  This login is unrelated to keycloak authentication.)

The `ORIGIN` parameter specifies the url Keycloak will redirect the browser to after a user logs into the app.

**Dev**
```
oc -n ccc866-dev process -f openshift/templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=dev \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://dev.loginproxy.gov.bc.ca/auth \
-p VITE_SHOW_TEST_INDICATOR=1 \
-p BASIC_AUTH_USERNAME=<username> \
-p BASIC_AUTH_PASSWORD_HASH=<hashed_password> \
-p ORIGIN=https://app-digmkt-dev.apps.silver.devops.gov.bc.ca \
-p HOST=app-digmkt-dev.apps.silver.devops.gov.bc.ca \
-p DATABASE_SERVICE_NAME=patroni-pg12 | oc -n ccc866-dev apply -f -
```

**Test**
```
oc -n ccc866-test process -f openshift/templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=test \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://test.loginproxy.gov.bc.ca/auth \
-p VITE_SHOW_TEST_INDICATOR=1 \
-p ORIGIN=https://app-digmkt-test.apps.silver.devops.gov.bc.ca \
-p HOST=app-digmkt-test.apps.silver.devops.gov.bc.ca \
-p BASIC_AUTH_USERNAME=<username> \
-p BASIC_AUTH_PASSWORD_HASH=<hashed_password> \
-p DATABASE_SERVICE_NAME=patroni-pg12 | oc -n ccc866-test apply -f -
```

**Prod**
```
oc -n ccc866-prod process -f openshift/templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=prod \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://loginproxy.gov.bc.ca/auth \
-p VITE_SHOW_TEST_INDICATOR=0 \
-p ORIGIN=https://marketplace.digital.gov.bc.ca \
-p HOST=marketplace.digital.gov.bc.ca \
-p DATABASE_SERVICE_NAME=patroni-pg12 | oc -n ccc866-prod apply -f -
```

Note 1: When `apply` is used the deployment will (sometimes) not be automatically triggered.  If this happens, you can trigger it manually with:

`oc -n ccc866-<dev,test,prod> rollout latest dc/<deploymentconfig_name>`

Note 2: the `apply` command will not override an existing `KEYCLOAK_CLIENT_SECRET` stored in the OCP namespace.
If the `KEYCLOAK_CLIENT_SECRET` needs to be changed, the previous one will need to be deleted (in the namespace) before generating the new one.
