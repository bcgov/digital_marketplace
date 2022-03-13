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
$ bash  ./lib/helm_deploy.sh -n <namespace> \ # eg ccc866-dev
          --set app.namespace=<namespace> \
          --set image.app.clientSecret=<keycloak_client_secret> \
          --set route.origin=<app_origin> \ #eg app-digmkt-dev.apps.silver.devops.gov.bc.ca
          --set image.app.cookieSecret=<cookie_secret> \
          --set image.app.databasePassword=<db_password> \
          --set image.app.databaseServiceHost=<db_service_host> \
          --set image.app.tag=<tag> # see below
```

To find the `<tag>` visit [our GitHub packages page](https://github.com/bcgov/digital_marketplace/pkgs/container/digital_marketplace) and use the latest docker image sha. 

eg. `sha-b0086114dfdd9ddcf1f8bb0ad3980dd261a987d6d42f85595da7b24d2f0c3230`

---

### Subsequent Deployments

- Log into the [BCDevExchange OpenShift cluster](https://console.apps.silver.devops.gov.bc.ca)
- Select the correct `namespace`
- Switch to the `Administrator` and select `ServiceAccounts` under the `User Management` dropdown
- Click on `digital-marketplace-deployer`
- In the `Secrets` section click the name with the type `kubernetes.io/service-account-token`
- In the `Data` section copy to clipboard the entry labelled `token`
- Paste the `token` value into the repositories [GitHub secrets](https://github.com/bcgov/digital_marketplace/settings/secrets/actions) in `OPENSHIFT_TOKEN`

### Secrets
The secrets we need to set are in github. Secrets common to all of the deploys are i the repository secrets. Secrets that are specific to the environment (dev, test or prod) are in the environment secrets. They are read in in the `/.github/workflows/publish_deploy_image.yml` workflow, which passes them to the action `/.github/actions/action.yaml`. This injects them to the script `/lib/helm_deploy.sh` script, which supplies them to the helm values, which are consumed in `deploy.yaml`.

In Openshift gui, the secrets are found as an admin under `Workloads` -> `Secrets`.

## Helm Templates

### deployer
These templates create the `digital-marketplace-deployer` service account in the Openshift cluster. This is the account token used for `OPENSHIFT_TOKEN`. Found in Openshift gui when logged in as an admin under `User Management` -> `Service Accounts`.

### networkPolicies
These create the network policies `digital-marketplace-allow-route-ingress` and `digital-marketplace-allow-same-namespace`. These allow any pods with a `service` and a `route` to accept traffic from the Openshift router pods, allowing them to be reached from outside the cluster. Found in Openshift gui when logged in as an admin under `Networking` -> `NetowrkPolicies`.

### routes
Sets up the `route` to redirect to the namespace url. Found in Openshift gui when logged in as an admin under `Networking` -> `Routes`.

### _helpers.tpl
This file sets up the full name, and labels for the deployment.

### *secret.yaml
These files take the secrets passed in (from GHSecrets to the action to `values.yaml`) and create them in Openshift. They are read into `deploy.yaml` using `valueFrom` -> `secretKeyRef`.

### deploy.yaml
The deployment spec for digital marketplace.

### values.yaml
Creates the Service. Found as an admin in Openshift under `Networking` -> `Services`.
