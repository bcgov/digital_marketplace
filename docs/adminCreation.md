# The creation of admin users

The Digital Marketplace app uses Keycloak to authenticate users, however their roles are stored in the postgres database.  

Users that log into the app through IDIR are public sector employees, those that log in through github authentication are vendors. Any public sector employee can be promoted to an admin by another admin.

There are three ways of creating an admin in the app. 

## Have an admin promote them.

This is the simplest method. As long as there is an existing admin in the app, they can navigate to the `Users` tab in the app header, go to the Public Sector Employee user they want to promote to admin, and check the box on their profile.

## Use the dm_admin in keycloak.

If there is no admin user set up for the app one must be created.  This is a workaround that is most useful when spinning up a local database for development.  

As a keycloak admin, create an idir user in keycloak **before** they attempt to log into the app for the first time.  Navigate to the Role Mappings tab and asign the role dm_admin.  When they log into the markeplace app for the firs time, they should be an admin.  If this does not work proceed to the third option. Alternatively if this is for local development, destroying the existing databese and rebuilding it should give that user admin access.

## Change the role in the postgres db.

**Caution** Be careful writting sql queries on a production database.  Make sure you know how to restore from backups.  To create a first admin user from an existing public sector employee, log into the postgres db.  If there are multiple instances of the db, make certain you are on the `leader` instance using: 

`patronictl list`

In one of the database pod terminals.

Log into the leader postgres pod, This is most easily done by running this command on you local machine:

`oc port-forward <postgres pod name> 5432`

Now it is possible to use any database management software to write sql queries.

Find the user you wish to promote to admin:

`select * from users;`

using their id, update their type:

```
update users
set type = 'ADMIN'
where id = <id> ;
```

Run `select * from users;` to verify only the expected users type was updated.
