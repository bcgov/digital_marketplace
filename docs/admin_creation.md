# The creation of admin users

The Digital Marketplace app uses Keycloak to authenticate users, however their roles are stored in the PostgreSQL database.  

Users that log into the app through IDIR are public sector employees, those that log in through GitHub authentication are vendors. Any public sector employee can be promoted to an admin by another admin.

There are three ways of creating an admin in the app. 

## 1. GUI: Have an admin promote them.

_App Environment: Any environment (Dev/Test/Prod)_

_Keycloak Environment: Dev/Test/Prod_

This is the simplest method. As long as there is an existing admin in the app, they can navigate to the 'Users' tab in the app header, go to the public sector employee user they want to promote to admin, and check the box on their profile.

## 2. Keycloak: Use the `dm_admin` Role in Keycloak.

_App Environment: (Local development, Dev/Test/Prod)_

_Keycloak Environment: Dev/Test/Prod_

If there is no admin user set up for the app one must be created.  This is a workaround that is most useful when spinning up a local database for development.  

As a Keycloak admin, navigate to 'Users' -> 'Add user' to create an IDIR user in Keycloak **before** they attempt to log into the app for the first time. After the user has been created, navigate to the 'Role Mappings' tab and assign them the role `dm_admin`.  When they log into the Digital Marketplace app for the firs time, they should be an admin.  If this does not work proceed to the third option. Alternatively, and *only* if this is for local development, destroying the existing database and rebuilding it should give that user admin access.

## 3. SQL: Change the role in the PostgreSQL db.

_App Environment: (Dev/Test/Prod)_

_Keycloak Environment: Dev/Test/Prod_

**Caution** Be careful writting SQL queries on a production database.  Make sure you know how to restore from backups.  To create a first admin user from an existing public sector employee, log into the OpenShift production namespace via `oc login`. The OCP GUI can also be used: 'Topology' -> 'patroni-digmkt-prod' -> 'patroni-digmkt-prod-0' -> 'Terminal'. Since there are likely multiple instances of the db, make certain you are on the 'leader' instance using `patronictl list` in one of the database pod terminals. The command `psql` can be used in the terminal window to run the appropriate queries.

After the `oc login` command and confirming you are in the production namespace with `oc project` log into the leader PostgreSQL pod. Use `oc get pods` to see the list of running pods. This is most easily done by running this command on your local machine:

`oc port-forward <PostgreSQL pod name> 5432`

Now it is possible to use any database management software to write SQL queries.

Find the user you wish to promote to admin:

`select * from users;`

using their id, update their type:

```
update users
set type = 'ADMIN'
where id = <id> ;
```

Run `select * from users;` to verify only the expected users type was updated.
