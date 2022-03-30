# Deployment

## Deploy using Helm charts

### First Time
The deploy process creates a service account for a deployer in Openshift, which won't exist if this hasn't been run yet.
This means that the first deploy needs to be run manually in order to create the deployer whos token is needed for the Github Action to run.
To deploy the application for the first time you must deploy logged in as a local user using the following command:
```bash
# Login to OpenShift using oc login
$ oc login --token=<token> --server=https://api.silver.devops.gov.bc.ca:6443
# Run deploy script from project root
$ bash  ./lib/helm_deploy.sh -n <namespace> \
          --set app.namespace=<namespace> \
          --set image.app.clientSecret=<keycloak_client_secret> \
          --set route.origin=<app_origin> \
          --set route.host=<app_host> \
          --set image.app.cookieSecret=<cookie_secret> \
          --set image.app.databasePassword=<db_password> \
          --set image.app.databaseServiceHost=<db_service_host> \
          --set app.keycloakUrl=<keycloak_url> \
          --set image.app.tag=<tag>
```
**Sample Vars**
namespace: `ccc866-dev`
app_origin `https://app-digmkt-dev.apps.silver.devops.gov.bc.ca`
app_host `app-digmkt-dev.apps.silver.devops.gov.bc.ca`
keycloak_url `https://dev.oidc.gov.bc.ca`
tag `sha-b0086114dfdd9ddcf1f8bb0ad3980dd261a987d6d42f85595da7b24d2f0c3230`

To find the `<tag>` visit [our GitHub packages page](https://github.com/bcgov/digital_marketplace/pkgs/container/digital_marketplace) and use the latest docker image sha. 

Note that running the first deploy like this will generate a `charts` directory (in the `helm` directory) containing a .tgz file for spilo. This doesn't need to be checked in to git, you can remove it locally.

---

### Subsequent Deployments

- Log into the [BCDevExchange OpenShift cluster](https://console.apps.silver.devops.gov.bc.ca)
- Select the correct `namespace`
- Switch to the `Administrator` and select `ServiceAccounts` under the `User Management` dropdown
- Click on `digital-marketplace-deployer`
- In the `Secrets` section click the name with the type `kubernetes.io/service-account-token`
- In the `Data` section copy to clipboard the entry labelled `token`
- Paste the `token` value into the repositories [GitHub secrets](https://github.com/bcgov/digital_marketplace/settings/secrets/actions) in `OPENSHIFT_TOKEN`

If the github action for deploying is failing because of timeout, the time allowed can be changed in `/lib/helm_deploy.sh`. 

## Secrets
The secrets we need to set are in github. Secrets common to all of the deploys are i the repository secrets. Secrets that are specific to the environment (dev, test or prod) are in the environment secrets. They are read in in the `/.github/workflows/publish_deploy_image.yml` workflow, which passes them to the action `/.github/actions/action.yaml`. This gives them to the script `/lib/helm_deploy.sh` script, which supplies them to the helm values, which are consumed in `deploy.yaml`.

Other secrets are generated in `helm/templates/*Secret.yaml` files, and stored in OpenShift. These are read in `deploy.yaml` byt the name of the secret, and the values key.

In Openshift gui, the secrets are found as an admin under `Workloads` -> `Secrets`.

**NOTE** The [BCGov spilo-chart](https://bcgov.github.io/spilo-chart) creates some secrets as well. More infor in their docs, but the ones we reference in `deploy.yaml` are from the secret suffixed with `-spilo`.

## Chart.yaml
The Helm chart for this deployment. Requirement includes [BCGov spilo-chart](https://bcgov.github.io/spilo-chart) which is responsible for deploying Patroni and Postgres.

## Helm Templates

### deployer
These templates create the `digital-marketplace-deployer` service account in the Openshift cluster. This is the account token used for `OPENSHIFT_TOKEN`. Found in Openshift gui when logged in as an admin under `User Management` -> `Service Accounts`.

### networkPolicies
These create the network policies `digital-marketplace-allow-route-ingress` and `digital-marketplace-allow-same-namespace`. These allow any pods with a `service` and a `route` to accept traffic from the Openshift router pods, allowing them to be reached from outside the cluster. Found in Openshift gui when logged in as an admin under `Networking` -> `NetowrkPolicies`.

### routes
Sets up the `route` to redirect to the namespace url. Found in Openshift gui when logged in as an admin under `Networking` -> `Routes`.
**NOTE** If changes are made to the route, the deploy process may error out with something along the lines of `...variable is immutable...` for `spec.host` (or whatever else you changed). In this case you need to go manually delete the route from either console with `kubectl` or in the Openshift gui, the rerun the deploy to have it recreate the host.

### _helpers.tpl
This file sets up the full name, and labels for the deployment.

### *Secret.yaml
These files create secrets for the cluster. They are read into `deploy.yaml` using `valueFrom` -> `secretKeyRef`. They can be accessed in OpenShift as an administrator under `Workloads` -> `Secrets`.

### values.yaml
Creates the Service. Found as an admin in Openshift under `Networking` -> `Services`.

### deploy.yaml
The deployment spec for digital marketplace.
**InitContainers**
These are run prior to containers, and always run to completion. Currently, ours is used to provision database credentials. 
