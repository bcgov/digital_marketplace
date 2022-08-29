## Notes for Digital Marketplace deployment to OCP4

All below commands should be run from openshift directory in the project root. You will also need to log in with the oc command line tool and a token retrieved from the OpenShift 4 Web GUI.

For instructions on deploying the Backup Container for each environment please refer to [backups.md](../docs/backups.md).

-----

To create default network security policies, run this command in each namespace, replacing `<namespace>` with the name of the target namespace:

```
oc process -f \
https://raw.githubusercontent.com/BCDevOps/platform-services/master/security/aporeto/docs/sample/quickstart-nsp.yaml \

-p NAMESPACE=<namespace> | oc create -f -
```

-----

To create permissions for image pulls between namespaces, run this in the tools namespace, replacing `<yyyy>` with the name of the namespace that is pulling images (e.g. ccc866-dev):

```
oc policy add-role-to-user system:image-puller system:serviceaccount:<yyyy>:default --namespace=ccc866-tools
```

-----

To create build configs for the application images, run these commands in the tools namespace:

```
oc -n ccc866-tools process -f openshift/templates/app/app-digmkt-build.yaml -p ENV_NAME=dev -p GIT_REF=development | oc create -f -
oc -n ccc866-tools process -f openshift/templates/app/app-digmkt-build.yaml -p ENV_NAME=test -p GIT_REF=master | oc create -f -
oc -n ccc866-tools process -f openshift/templates/app/app-digmkt-build.yaml -p ENV_NAME=prod -p GIT_REF=master | oc create -f -
```

If the build already exists the `create` option will error out.  This can be fixed by using `apply` instead of `create`.  Once the build config is successfully created, run:

`oc start-build <buildconfig_name>`

to trigger the build.


------

To create build configs for the Patroni-PostgreSQL images, run this command in the tools namespace:

```
oc process -f openshift/build.yaml \
 -p GIT_URI=https://github.com/BCDevOps/platform-services/tree/master/apps/pgsql/patroni \
 -p GIT_REF=master \
 -p SUFFIX=-pg11 \
 -p OUT_VERSION=v11-latest \
 -p PG_VERSION=11 | oc create -f -
```

To deploy a highly available Patroni-PostgreSQL stateful set (for use in DEV/TEST/PROD), run the following:

```
oc project ccc866-<dev/test/prod>
oc process -f openshift/templates/database/patroni-prereq-create.yaml -p TAG_NAME=<dev/test/prod> | oc create -f -

oc project ccc866-tools
oc policy add-role-to-user system:image-puller system:serviceaccount:ccc866-<dev/test/prod>:patroni-pg12-digmkt-<dev/test/prod> -n ccc866-tools

oc project ccc866-<dev/test/prod>
oc process -f openshift/templates/database/patroni-digmkt-deploy.yaml -p TAG_NAME=<dev/test/prod> -p PVC_SIZE=<2Gi/10Gi> | oc apply -f -
```

------

To deploy the Digital Marketplace app, run these commands in each namespace (dev/test/prod).
Replace `<secret>` with the KeyCloak client secret for the target environment.

To password protect the dev and test namespace deployments, replace `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD_HASH` with the basic auth credentials desired. Leaving these parameters off the deployment command will deactivate login. The hashed password can be generated using the npm library bcrypt `bcrypt.hash('<password>',10)`. (NOTE:  This login is unrelated to keycloak authentication.)

The `ORIGIN` parameter specifies the url Keycloak will redirect the browser to after a user logs into the app.

```
oc -n ccc866-dev process -f openshift/templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=dev \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://dev.oidc.gov.bc.ca \
-p SHOW_TEST_INDICATOR=1 \
-p BASIC_AUTH_USERNAME=<username> \
-p BASIC_AUTH_PASSWORD_HASH=<hashed_password> \
-p ORIGIN=https://app-digmkt-dev.apps.silver.devops.gov.bc.ca \
-p DATABASE_SERVICE_NAME=patroni | oc create -f -
```

```
oc -n ccc866-test process -f openshift/templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=test \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://test.oidc.gov.bc.ca \
-p SHOW_TEST_INDICATOR=1 \
-p ORIGIN=https://digital-gov-frontend-test-c0cce6-test.apps.silver.devops.gov.bc.ca/marketplace \
-p BASIC_AUTH_USERNAME=<username> \
-p BASIC_AUTH_PASSWORD_HASH=<hashed_password> \
-p DATABASE_SERVICE_NAME=postgresql | oc create -f -
```

```
oc -n ccc866-prod process -f openshift/templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=prod \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://oidc.gov.bc.ca \
-p SHOW_TEST_INDICATOR=0 \
-p ORIGIN=https://digital.gov.bc.ca/marketplace \
-p DATABASE_SERVICE_NAME=patroni | oc create -f -
```

When there is an existing deployment config in the namespace these commands must be modified:

In the dev namespace, updating the dc is done using apply:

```
oc -n ccc866-dev process -f openshift/templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=dev \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://dev.oidc.gov.bc.ca \
-p SHOW_TEST_INDICATOR=1 \
-p BASIC_AUTH_USERNAME=<username> \
-p BASIC_AUTH_PASSWORD_HASH=<hashed_password> \
-p ORIGIN=https://app-digmkt-dev.apps.silver.devops.gov.bc.ca \
-p DATABASE_SERVICE_NAME=postgresql | oc apply -f -
```
```
oc -n ccc866-test process -f openshift/templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=test \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://test.oidc.gov.bc.ca \
-p SHOW_TEST_INDICATOR=1 \
-p BASIC_AUTH_USERNAME=<username> \
-p BASIC_AUTH_PASSWORD_HASH=<hashed_password> \
-p ORIGIN=https://digital-gov-frontend-test-c0cce6-test.apps.silver.devops.gov.bc.ca/marketplace \
-p DATABASE_SERVICE_NAME=postgresql | oc apply -f -
```

```
oc -n ccc866-prod process -f openshift/templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=prod \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://oidc.gov.bc.ca \
-p SHOW_TEST_INDICATOR=0 \
-p ORIGIN=https://digital.gov.bc.ca/marketplace \
-p DATABASE_SERVICE_NAME=patroni | oc apply -f -
```

Note 1: When `apply` is used the deployment will not be automatically triggered.  That is done with the command:

`oc -n ccc866-<dev,test,prod> rollout latest dc/<deploymentconfig_name>`

Note 2: the `apply` command will not override an existing `KEYCLOAK_CLIENT_SECRET` stored in the OCP namespace.
If the `KEYCLOAK_CLIENT_SECRET` needs to be changed, the previous one will need to be deleted (in the namespace) before generating the new one.
