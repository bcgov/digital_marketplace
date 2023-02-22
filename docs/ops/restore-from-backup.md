# Restore from backup

This can be handled by the Platform Services Team, or if you've got the gusto, with the following:

## On your own

`rsh` into your backup container `backup-postgres-<xxxx>` and backup the existing database `./backup.sh -s`, or if there is a scheduled backup file that exists already and you'd like to backup from that `ls -la ./backups/daily/`. Find the path the <<backup created>>.

Restore the backup to the db cluster: `./backup.sh -r postgres=<<database service name>>:5432/<<database name>> -f ./backups/daily/<<path to backup created>> `

## Platform Services

The process starts with opening an issue from the issue template "**Request to restore a backup Persistent Volume (PV) from OpenShift**" in GitHub which requires specific information:

* Date: the date you need restored from
* Cluster: Silver/Gold/GoldDR
* Source PV: the source PV you need restored
* Destination PV: the destination path

- https://github.com/BCDevOps/devops-requests/issues/new/choose

## Documentation

- https://developer.gov.bc.ca/OCP4-Backup-and-Restore
