## Instructions for Backup Container building and deployment - Digital Marketplace PostgreSQL and Patroni-PostgreSQL

-----

To build the backup-container image, run the following commands in the tools namespace:

```
oc process -f templates/backup/backup-build.yaml | oc create -f -
oc tag backup-postgres:latest backup-postgres:dev
oc tag backup-postgres:latest backup-postgres:test
oc tag backup-postgres:latest backup-postgres:prod
```

-----

To deploy the backup-container image to each applications namespace (dev/test/prod), run the following for each environment:

PROD:

```
oc process -f templates/backup/backup-config.yaml \
-p DATABASE_SERVICE_NAME=patroni-digmkt-prod \
-p DATABASE_PORT=5432 \
-p DATABASE_NAME=digmkt | oc create -f -
```

```
oc process -f templates/backup/backup-deploy.yaml \
-p DATABASE_DEPLOYMENT_NAME=patroni-digmkt-prod \
-p TAG_NAME=prod \
-p BACKUP_VOLUME_SIZE=10Gi | oc create -f -
```

TEST:

```
oc process -f templates/backup/backup-config.yaml \
-p DATABASE_SERVICE_NAME=postgresql-digmkt-test \
-p DATABASE_PORT=5432 \
-p DATABASE_NAME=dig-mkt | oc create -f -
```

```
oc process -f templates/backup/backup-deploy.yaml \
-p DATABASE_DEPLOYMENT_NAME=postgresql-digmkt-test \
-p TAG_NAME=test \
-p BACKUP_VOLUME_SIZE=2Gi | oc create -f -
```

DEV:

```
oc process -f templates/backup/backup-config.yaml \
-p DATABASE_SERVICE_NAME=postgresql-digmkt-dev \
-p DATABASE_PORT=5432 \
-p DATABASE_NAME=dig-mkt | oc create -f -
```

```
oc process -f templates/backup/backup-deploy.yaml \
-p DATABASE_DEPLOYMENT_NAME=postgresql-digmkt-dev \
-p TAG_NAME=dev \
-p BACKUP_VOLUME_SIZE=2Gi | oc create -f -
```