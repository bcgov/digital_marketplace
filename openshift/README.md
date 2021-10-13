## Notes for Digital Marketplace deployment to OCP4

All below commands should be run from openshift directory in the project root. You will also need to log in with the oc command line tool and a token retrieved from the OpenShift 4 Web GUI.

For instructions on deploying the Backup Container for each environment please refer to [BACKUPS.md](./BACKUPS.md).

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
oc process -f templates/app/app-digmkt-build.yaml -p ENV_NAME=dev -p GIT_REF=development | oc create -f -
oc process -f templates/app/app-digmkt-build.yaml -p ENV_NAME=test -p GIT_REF=master | oc create -f -
oc process -f templates/app/app-digmkt-build.yaml -p ENV_NAME=prod -p GIT_REF=master | oc create -f -
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

 -----

To deploy a single PostgreSQL instance (for use in DEV and TEST):

```
oc process -f templates/database/postgresql-digmkt-deploy.yaml -p TAG_NAME=dev | oc create -f -
```

```
oc process -f templates/database/postgresql-digmkt-deploy.yaml -p TAG_NAME=test | oc create -f -
```

------

To deploy a highly available Patroni-PostgreSQL stateful set (for use in PROD), run the following:

```
oc project ccc866-prod
oc process -f templates/database/patroni-prereq-create.yaml | oc create -f -

oc project ccc866-tools
oc policy add-role-to-user system:image-puller system:serviceaccount:ccc866-prod:patroni-digmkt-prod --namespace=ccc866-tools

oc project ccc866-prod
oc process -f templates/database/patroni-digmkt-deploy.yaml | oc apply -f -
```

------

To deploy the Digital Marketplace app, run these commands in each namespace (dev/test/prod).
Replace `<secret>` with the KeyCloak client secret for the target environment.
Replace `<username>` and `<hashed_password>` with the basic auth credentials desired.

```
oc -n ccc866-dev process -f templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=dev \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://dev.oidc.gov.bc.ca \
-p SHOW_TEST_INDICATOR=1 \
-p DATABASE_SERVICE_NAME=postgresql | oc create -f -
```

```
oc process -f templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=test \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://test.oidc.gov.bc.ca \
-p SHOW_TEST_INDICATOR=1 \
-p DATABASE_SERVICE_NAME=postgresql | oc create -f -
```

```
oc process -f templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=prod \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://oidc.gov.bc.ca \
-p SHOW_TEST_INDICATOR=0 \
-p DATABASE_SERVICE_NAME=patroni | oc create -f -
```

When there is an existing deployment config in the namespace these commands must be modified:

In the dev namespace, updating the dc is done using apply:

oc -n ccc866-dev process -f templates/app/app-digmkt-deploy.yaml \
-p TAG_NAME=dev \
-p KEYCLOAK_CLIENT_SECRET=<secret> \
-p KEYCLOAK_URL=https://dev.oidc.gov.bc.ca \
-p SHOW_TEST_INDICATOR=1 \
-p DATABASE_SERVICE_NAME=postgresql | oc apply -f -
```

Note, when `apply` is used the deployment will not be automatically triggered.  That is done with the command:

`oc -n ccc866-dev rollout latest dc/app-digmkt-dev`

If the `KEYCLOAK_CLIENT_SECRET` has changed, the previous one will need to be deleted before generating the new one.