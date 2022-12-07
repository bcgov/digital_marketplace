## Instructions for Backup Container building and deployment - Digital Marketplace PostgreSQL and Patroni-PostgreSQL

-----

To build the backup-container image, run the following commands in the tools namespace:

```
oc process -f openshift/templates/backup/backup-build.yaml | oc create -f -
oc tag backup-postgres:latest backup-postgres:dev
oc tag backup-postgres:latest backup-postgres:test
oc tag backup-postgres:latest backup-postgres:prod
```

-----

To deploy the backup-container image to each applications namespace <dev/test/prod>, run the following for each environment:

```
oc -n ccc866-<dev/test/prod> process -f openshift/templates/backup/backup-config.yaml \
-p DATABASE_SERVICE_NAME=patroni-pg12-digmkt-<dev/test/prod> \
-p DATABASE_PORT=5432 \
-p DATABASE_NAME=digmkt | oc -n ccc866-<dev/test/prod> apply -f -
```

```
oc -n ccc866-<dev/test/prod> process -f openshift/templates/backup/backup-deploy.yaml \
-p DATABASE_DEPLOYMENT_NAME=patroni-pg12-digmkt-<dev/test/prod> \
-p TAG_NAME=<dev/test/prod> \
-p BACKUP_VOLUME_SIZE=<2Gi/10Gi> | oc -n ccc866-<dev/test/prod> apply -f -
```
