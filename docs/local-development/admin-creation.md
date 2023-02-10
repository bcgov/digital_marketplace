# The creation of admin users

The Digital Marketplace app uses Keycloak to authenticate users, however their roles are stored in the PostgreSQL database.

Users that log into the app through IDIR are public sector employees, those that log in through GitHub authentication are vendors. Any public sector employee can be promoted to an admin by another admin.

There are two ways of creating an admin in the app.

## 1. GUI: Have an admin promote them.

_App Environment: Any environment (Dev/Test/Prod)_

_Keycloak Environment: Dev/Test/Prod_

This is the simplest method. As long as there is an existing admin in the app, they can navigate to the 'Users' tab in the app header, go to the public sector employee user they want to promote to admin, and check the box on their profile.

## 2. SQL: Change the role in the PostgreSQL db.

_App Environment: (Dev/Test/Prod)_

_Keycloak Environment: Dev/Test/Prod_

**Caution** Be careful writing SQL queries on a production database.  Make sure you know how to restore from backups.  To create a first admin user from an existing public sector employee, log into the OpenShift production namespace via `oc login`. The OCP GUI can also be used: 'Topology' -> 'patroni-pg12-digmkt-prod' -> 'patroni-pg12-digmkt-prod-0' -> 'Terminal'. Since there are likely multiple instances of the db, make certain you are on the 'leader' instance using `patronictl list` in one of the database pod terminals. The command `psql` can be used in the terminal window to run the appropriate queries.

After the `oc login` command and confirming you are in the correct namespace (dev, test, or prod) with `oc project` log into the leader PostgreSQL pod. Use `oc get pods` to see the list of running pods. This is most easily done by running this command on your local machine:

`oc port-forward <PostgreSQL pod name> 5432`

Now it is possible to use any database management software to write SQL queries.

Alternatively, you can open a remote shell:

`oc rsh <PostgreSQL pod name>`
`psql`
`\c digmkt`

Find the user you wish to promote to admin:

`select * from users;`

using their id, update their type:

```
update users
set type = 'ADMIN'
where id = <id> ;
```

Run `select * from users;` to verify only the expected user's type was updated.
