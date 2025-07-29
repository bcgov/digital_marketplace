[![pre-commit.ci status](https://results.pre-commit.ci/badge/github/button-inc/digital_marketplace/main.svg)](https://results.pre-commit.ci/latest/github/button-inc/digital_marketplace/main)

# Digital Marketplace

The Digital Marketplace is a web application that administers British Columbia's Code With Us and Sprint With Us procurement programs. It enables (1) public sector employees to create and publish procurement opportunities, and (2) vendors to submit proposals to these opportunities.

This document describes this project's developer environment, technical architecture and deployment infrastructure.

The file [`docs/onboarding/tips.md`](docs/onboarding/tips.md) contains a collection of helpful information about working with this [custom framework](docs/onboarding/custom-framework-overview.md). It is encouraged that the file be added to by anyone who uncovers something they feel would have been helpful to know.

## Table of Contents

<!-- toc -->

- [Authors and Licensing](#authors-and-licensing)
- [Project Organisation](#project-organisation)
  - [Front-End (`src/front-end`)](#1-front-end-srcfront-end)
  - [Back-End (`src/back-end`)](#2-back-end-srcback-end)
  - [Email Notifications](#3-email-notifications)
  - [Shared (`src/shared`)](#4-shared-srcshared)
  - [Database Migrations (`src/migrations`)](#5-database-migrations-srcmigrations)
  - [Scripts (`src/scripts`)](#6-scripts-srcscripts)
- [Development Environment](#development-environment)
  - [Dependencies](#install-dependencies)
  - [Quick Start](#quick-start)
  - [NPM Scripts](#npm-scripts)
  - [Environment Variables](#environment-variables)
- [Deployment](#deployment)
  - [Environments](#environments)
  - [Deployment Process](#deployment-process)
  - [Backups](#backups)
  - [High Availability Database Deployment](#high-availability-database-deployment)
- [Community](#community)
  - [Contributing](#contributing)
  - [Forking this Repository](#forking-this-repository)
- [Team](#team)
- [Credits](#credits)

<!-- tocstop -->

## Licensing

This project available to use under the Apache 2.0 license (see `LICENSE.txt`). Please note the `NOTICE.txt` file included with this repository and the guidelines in section 4(d) of the license.

## Project Organisation

The Digital Marketplace is a full-stack TypeScript web application that uses PostgreSQL for persistence.
It is written in a functional and declarative style with the goal of maximizing compile-time guarantees through type-safety.

The source code is split into six parts:

### 1. Front-End (`src/front-end`)

A TypeScript single-page application using React, Immutable.js, Bootstrap and SASS.
The front-end's build system is executed by Grunt.

The front-end's state management framework (`src/front-end/typescript/lib/framework/**/*.tsx`) provides type-safe state management, and is heavily influenced by the [Elm Architecture](https://guide.elm-lang.org/architecture/). If you've used Redux before, you will find this to be very similar since Redux is also based on the Elm Architecture. The main difference is that this project's framework derives greater inspiration from the Elm Architecture and it aims to be far more type-safe than Redux.

### 2. Back-End (`src/back-end`)

A TypeScript server that vends the front-end's build assets (`src/back-end/lib/routers/front-end.ts`) as well as a JSON CRUD API (`src/back-end/lib/resources/**/*.ts`) that performs business logic and persists data to a PostgreSQL database.

The server framework (`src/back-end/lib/server/index.ts`) provides type-safe abstractions for API development, and is executed by Express (`src/back-end/lib/server/adapters.ts`).

#### 2a. Authentication

The server uses OpenID Connect to authenticate users with a Keycloak server (managed by B.C. government employees). The authentication routes are implemented in `src/back-end/lib/routers/auth.ts`.

#### 2b. CRUD Resources

CRUD resources are created in a standardised, type-safe way in this project. CRUD abstractions are located in `src/back-end/lib/crud.ts`, and it is recommended to review this module prior to extending the API.

### 3. Email Notifications

Email notifications are all rendered server-side using React's static HTML renderer. Stub versions of all email notifications can be viewed by authenticated admin users at `{HOST}/admin/email-notification-reference` in your browser.

### 4. Shared (`src/shared`)

The `src/shared` folder contains modules that expose types and functions that are used across the entire stack: front-end and back-end.

### 5. Database Migrations (`src/migrations`)

All database migration logic is stored in the `src/migrations` folder. Migrations are managed and executed by the `knex` NPM module (a SQL ORM bundled with database migration functionality). The PostgreSQL-related environment variables described below are required to define the database to connect to.

You can create a migration using the following command:

```bash
npm run migrations:create -- <MIGRATION_NAME>
```

This command creates a migration file from a template and stores it at `src/migrations/tasks/{TIMESTAMP}_{MIGRATION_NAME}.ts`.

**DO NOT delete or change committed migration files. Creating and executing migrations is a stateful process, and, unless you know what you are doing, running a database migration should be viewed as an irreversible process.**

### 6. Scripts (`src/scripts`)

General purpose scripts are stored in this folder. The scripts themselves are stored in the `src/scripts/bin/` folder, and can be run using the following command:

```
npm run scripts:run -- <SCRIPT_NAME> [...args]
```

## Development Environment

### Set Up

### `.env` File

First, create a `.env` file and replace the placeholder values with your credentials (refer to the [Environment Variables](#environment-variables) section below for further information):

```bash
cp sample.env .env
# Open and edit .env in your text editor.
```

### Install Dependencies

Please ensure the following packages have been installed:

- yarn
- Node.js 22.x
- SASS
- Docker
- Docker Compose 3.x
- [pre-commit](docs/local-development/pre-commit.md)

Once installed, `cd` into this repository's root directory and proceed to install dependencies (if running for the first time):

```bash
yarn
```

### Keycloak Set Up (optional)

If you don't have access the BC Government's keycloak and you want to be able to log in to the app, you'll need to
set up a local instance of keycloak. To do this, update the following environment variables in the `.env` file:

- `KEYCLOAK_CLIENT_ID="login"`
- `KEYCLOAK_CLIENT_SECRET="abc-123"`
- `KEYCLOAK_URL="http://localhost:8080"`
- `KEYCLOAK_REALM="digitalmarketplace"`

Additionally, add:

- `KEYCLOAK_USER="admin"`
- `KEYCLOAK_PASSWORD="password"`
- `ID_PROVIDER="github"`

- Create `GitHub 0Auth` App - [Link](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app) and fill out the following fields:

- Name: digital_marketplace
- Homepage URL: https://localhost:3000 # Default back-end server address
- Authorization Callback URL: http://localhost:8080/auth/realms/digitalmarketplace/broker/github/endpoint # Keycloak endpoint, default URL http://localhost:8080

Then:

- Copy Client ID value and put into .env `ID_PROVIDER_CLIENT_ID`
- Click to `Generate a new client secret` and copy value and put into .env `ID_PROVIDER_CLIENT_SECRET`

### Quick Start

Open four terminals and run the following commands:

```bash
# Terminal 1
docker-compose up db # Start PostgreSQL only

# Terminal 2
npm run back-end:watch # Start the back-end server, restart on source changes.

# Terminal 3
npx vite dev # Start the development server, serves files with hot module replacement on source changes.

# Terminal 4
npm run migrations:latest # Run all database migrations.

# Terminal 5
docker-compose up chroma

# Terminal 6
npx vite dev

# Terminal 7 (in src/marketplace_ai)
npm run start:dev
```

The application will be available at http://localhost:5173/

#### Admin user

If this is the first time spinning up a local development environment, set up an [admin user](docs/local-development/admin-creation.md)

Then, visit the [URL](http://localhost:3000) logged to your terminal to view the now locally-running web application.

You can stop the local PostgreSQL container server (and the keycloak server, if you're running it) by running `docker-compose down`. If you wish to completely wipe the container database, including all the data added by the migrations, run `docker volume rm digital_marketplace_dm-vol`.

### NPM Scripts

It is recommended that developers use the following scripts defined in `package.json` to operate this web application:

```bash
# Usage
npm run <SCRIPT_NAME>
```

| Script Name                             | Description                                                                                                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cypress:run`                           | Runs the Cypress tests. (You must first manually start the app for the tests to have something to run against.) NOTE: The test set up and clean up will wipe and recreate the local database.                    |
| `cypress:open`                          | Opens the interactive Cypress test runner. (You must first manually start the app for the tests to have something to run against.) NOTE: The test set up and clean up will wipe and recreate the local database. |
| `start`                                 | Runs the back-end server.                                                                                                                                                                                        |
| `front-end:lint`                        | Lints the front-end source code using eslint.                                                                                                                                                                    |
| `front-end:typecheck`                   | Typechecks the front-end source code using tsc.                                                                                                                                                                  |
| `front-end:test`                        | Runs unit tests for the front-end source code.                                                                                                                                                                   |
| `front-end:build`                       | Builds the front-end source code using grunt. This builds the front end into /build/front-end and makes it available to be served from the backend, as in production environment.                                                                                                                                                                    |
| `front-end:watch`                       | Builds the front-end source code using grunt, and rebuilds it whenever a front-end or shared source file changes. This builds the front end into /build/front-end and makes it available to be served from the backend, as in production environment.                                                                                                |
| `front-end:typedoc`                     | Builds TypeDoc API documentation for the front-end source code.                                                                                                                                                  |
| `back-end:lint`                         | Lints the back-end source code using eslint.                                                                                                                                                                     |
| `back-end:typecheck`                    | Typechecks the back-end source code using tsc.                                                                                                                                                                   |
| `back-end:test`                         | Runs unit tests for the back-end source code.                                                                                                                                                                    |
| `back-end:start`                        | Starts the back-end server (assumes it has already been built by grunt).                                                                                                                                         |
| `back-end:build`                        | Builds the back-end server using grunt.                                                                                                                                                                          |
| `back-end:watch`                        | Builds and starts the back-end server inside a nodemon process, rebuilding and restarting it whenever a back-end or shared source file changes.                                                                  |
| `back-end:debug-watch`                  | Similar to back-end:debug but generates source maps to enable IDE debugging of the API project
| `back-end:typedoc`                      | Builds TypeDoc API documentation for the back-end source code.                                                                                                                                                   |
| `shared:lint`                           | Lints the shared source code using eslint.                                                                                                                                                                       |
| `shared:typedoc`                        | Builds TypeDoc API documentation for the shared source code.                                                                                                                                                     |
| `migrations:lint`                       | Lints the migrations source code using eslint.                                                                                                                                                                   |
| `migrations:helper`                     | A helper script to run various migration commands using `knex`. It is not recommended to use this directly, rather use the migration scripts described below.                                                    |
| `migrations:create -- <MIGRATION_NAME>` | Creates a migration file from a template in `src/migrations/tasks`.                                                                                                                                              |
| `migrations:latest`                     | Runs all migrations forward using their exported `up` functions.                                                                                                                                                 |
| `migrations:rollback`                   | Rolls all migrations back using their exported `down` functions.                                                                                                                                                 |
| `migrations:up <NAME_OF_FILE>`          | Runs one migration `up` so long as the name of the file is provided. (eg: `20221130162144_twu-admin-content-stub.ts`.ts>.                                                                                        |
| `migrations:down`                       | Runs one migration `down`.                                                                                                                                                                                       |
| `scripts:run`                           | Runs a script. Usage: `npm run scripts:run -- <SCRIPT_NAME> [...args]`. Ensure the `--` is included to allow script arguments to be properly parsed.                                                             |
| `typedoc:build`                         | Builds all TypeDoc API documentation.                                                                                                                                                                            |
| `typedoc:start`                         | Serves TypeDoc documentation on a local server.                                                                                                                                                                  |
| `docs:readme-toc`                       | Generate and insert a table of contents for `README.md`.                                                                                                                                                         |
| `docs:licenses`                         | Generate the list of licenses from this project's NPM dependencies in `docs/open-source-licenses.txt`.                                                                                                           |
| `docs:db -- <POSTGRESQL_URL>`           | Generate database schema documentation in `docs/database-schema.md` from the database specified by the connection url.                                                                                           |
| `learn-front-end:build`                 | Builds the learn-front-end project using grunt.                                                                                                                                                                  |
| `learn-front-end:watch`                 | Builds the learn-front-end project using grunt, and rebuilds it whenever a learn-front-end, front-end or shared source file changes.                                                                             |
| `learn-front-end:serve`                 | Serves the learn-front-end build files.                                                                                                                                                                          |

### Environment Variables

Developers can configure the following environment variables to alter how the web application is built and/or run.

In development, developers can create a `.env` file in the repository's root directory to configure environment variables.
As a convenience, developers can refer to `sample.env` as a guide.

#### Back-End Environment Variables

Environment variables that affect the back-end server's functionality are stored and sanitized in `src/back-end/config.ts`.

| Name                                    | Description                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_NODE_ENV`                              | The back-end run-time's environment. Possible values include either "development" or "production".                                                                                                                                                                                                                                         |
| `SERVER_HOST`                           | The IPv4 address for the back-end to bind to.                                                                                                                                                                                                                                                                                              |
| `SERVER_PORT`                           | The TCP port for the back-end to bind to.                                                                                                                                                                                                                                                                                                  |
| `SCHEDULED_DOWNTIME`                    | A boolean flag (set to `0` for `false`, `1` for `true`) to turn off CRUD endpoints and vend a downtime HTML page to all users when set to a non-zero number. Defaults to `false` if `SCHEDULED_DOWNTIME` is undefined or invalid.                                                                                                          |
| `BASIC_AUTH_USERNAME`                   | An HTTP basic auth username to limit access to the web application.                                                                                                                                                                                                                                                                        |
| `BASIC_AUTH_PASSWORD_HASH`              | A password hash to authenticate HTTP basic auth passwords to limit access to the web application.                                                                                                                                                                                                                                          |
| `ORIGIN`                                | The root URL of the web app. This is used for authentication and generating URLs in email notifications. The value must include the protocol and any path prefixes. e.g. `https://marketplace.digital.gov.bc.ca`.                                                                                                                          |
| `POSTGRES_URL`                          | The PostgreSQL database to connect to (you only need to use this variable in development, not the other `DATABASE_*` variables defined below).                                                                                                                                                                                             |
| `DATABASE_SERVICE_NAME`                 | Auto-generated in OpenShift.                                                                                                                                                                                                                                                                                                               |
| `${DATABASE_SERVICE_NAME}_SERVICE_HOST` | The PostgreSQL host to connect to in OpenShift.                                                                                                                                                                                                                                                                                            |
| `${DATABASE_SERVICE_NAME}_SERVICE_PORT` | The PostgreSQL port to connect to in OpenShift.                                                                                                                                                                                                                                                                                            |
| `DATABASE_USERNAME`                     | The PostgreSQL user to connect with in OpenShift.                                                                                                                                                                                                                                                                                          |
| `DATABASE_PASSWORD`                     | The PostgreSQL password to connect with in OpenShift.                                                                                                                                                                                                                                                                                      |
| `DATABASE_NAME`                         | The PostgreSQL database name to connect to in OpenShift.                                                                                                                                                                                                                                                                                   |
| `COOKIE_SECRET`                         | The secret used to hash cookies.                                                                                                                                                                                                                                                                                                           |
| `MAILER_HOST`                           | SMTP server host for transactional emails in production.                                                                                                                                                                                                                                                                                   |
| `MAILER_PORT`                           | SMTP server port for transactional emails in production.                                                                                                                                                                                                                                                                                   |
| `MAILER_USERNAME`                       | SMTP server username for authentication. If specified, `MAILER_PASSWORD` must also be provided.                                                                                                                                                                                                                                            |
| `MAILER_PASSWORD`                       | SMTP server password for authentication. If specified, `MAILER_USERNAME` must also be provided.                                                                                                                                                                                                                                            |
| `MAILER_GMAIL_USER`                     | A GMail SMTP username to test transactional emails in development.                                                                                                                                                                                                                                                                         |
| `MAILER_GMAIL_PASS`                     | A GMail SMTP password to test transactional emails in development.                                                                                                                                                                                                                                                                         |
| `MAILER_FROM`                           | The sender for transactional emails.                                                                                                                                                                                                                                                                                                       |
| `MAILER_BATCH_SIZE`                     | The maximum number of email addresses to include in batch notification emails. Defaults to `50`.                                                                                                                                                                                                                                           |
| `MAILER_MAX_CONNECTIONS`                | The maximum number of simultaneous SMTP connections to use for the mailer. Defaults to `5`.                                                                                                                                                                                                                                                |
| `KEYCLOAK_URL`                          | The URL of the Keycloak server to use for authentication. Please contact a team member to retrieve this credential, or [use a local instance of keycloak](#keycloak-set-up).                                                                                                                                                               |
| `KEYCLOAK_REALM`                        | The Keycloak realm. Please contact a team member to retrieve this credential, or [use a local instance of keycloak](#keycloak-set-up).                                                                                                                                                                                                     |
| `KEYCLOAK_CLIENT_ID`                    | The Keycloak client ID. Please contact a team member to retrieve this credential, or [use a local instance of keycloak](#keycloak-set-up).                                                                                                                                                                                                 |
| `KEYCLOAK_CLIENT_SECRET`                | The Keycloak client secret. Please contact a team member to retrieve this credential, or [use a local instance of keycloak](#keycloak-set-up).                                                                                                                                                                                             |
| `KNEX_DEBUG`                            | Set this to `true` to debug `knex` operations.                                                                                                                                                                                                                                                                                             |
| `UPDATE_HOOK_THROTTLE`                  | The number of milliseconds used to throttle per-request jobs (e.g. automatically closing opportunities). Defaults to `60000`ms.                                                                                                                                                                                                            |
| `AVATAR_MAX_IMAGE_WIDTH`                | The maximum image width for uploaded avatar image files. Files with a greater width will be resized. Defaults to 500 pixels.                                                                                                                                                                                                               |
| `AVATAR_MAX_IMAGE_HEIGHT`               | The maximum image height for uploaded avatar image files. Files with a greater height will be resized. Defaults to 500 pixels.                                                                                                                                                                                                             |
| `FILE_STORAGE_DIR`                      | The location to store uploaded files. This is typically used by the server to temporarily store files uploaded by multipart requests for processing.                                                                                                                                                                                       |
| `SERVICE_TOKEN_HASH`                    | A hashed token used to control access to service API endpoints that are only enabled in development and test environments. Defining the variable will enable service endpoints that can be used to override user accounts and sessions.                                                                                                    |
| `SWAGGER_ENABLE`                        | A flag to enable the Swagger UI API documentation under `SWAGGER_UI_PATH`. Defaults to `false`.                                                                                                                                                                                                                                            |
| `SWAGGER_UI_PATH`                       | The base path to run the Swagger UI under for serving of API documentation. Defaults to `/docs/api`.                                                                                                                                                                                                                                       |
| `TZ`                                    | Time-zone to use for the back-end. Required by the Linux OS that runs the back-end, but not used as application configuration.                                                                                                                                                                                                             |
| `VITE_SHOW_TEST_INDICATOR`                   | A boolean flag (set to `0` for `false`, `1` for `true`) to indicate that an environment is intended for testing purposes (prefixes emails subjects and shows a testing variant of the logo in email notifications). Defaults to `false`.                                                                                                   |
| `LOG_LEVEL`                             | An enumerated logging level that can be used to control the level of output when running the application. Allowed values are `debug`, `info`, `warn`, `error`, and `none`. The level will default to `debug` when `VITE_NODE_ENV` is set to `development`. Otherwise, the level will default to `info` unless explicity set in the environment. |
| `DISABLE_NOTIFICATIONS`                 | A boolean flag that will disable all outgoing email notifications when set to `1` (`true`). Defaults to `0` (`false`).                                                                                                                                                                                                                     |
| `LOG_MEM_USAGE`                         | A boolean flag (set to `0` for `false`, `1` for `true`) to enable debug-level logging of Node memory usage. Defaults to `false`.                                                                                                                                                                                                           |

**Note on Postgres Connection**
If the credentials for Patroni are provided, they will be used in place of the `POSTGRES_URL`, which acts as a fallback (as it is used for local dev).
The Patroni credentials are `PGHOST`, `PGUSER`, `PGPASSWORD` and `PGDATABASE` which are supplied by the Helm deployment.

#### Front-End Environment Variables

Environment variables that affect the front-end's build process are stored and sanitized in `src/front-end/config.ts`, and referenced to in `gruntfile.js`.

| Name                  | Description                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_NODE_ENV`            | Determines whether the front-end is built for production (e.g. minification, compression, etc). Possible values include either "development" or "production".                                          |
| `CONTACT_EMAIL`       | The Digital Marketplace team's contact email address.                                                                                                                                                  |
| `VITE_PATH_PREFIX`         | The URL path prefix that the Digital Marketplace is deployed to. For example, if deployed to `digital.gov.bc.ca/marketplace`, the value of this variable should be `marketplace`.                      |
| `VITE_SHOW_TEST_INDICATOR` | A boolean flag (set to `0` for `false`, `1` for `true`) to indicate that an environment is intended for testing purposes (shows a testing variant of the logo in the web app UI). Defaults to `false`. |

## Deployment

This project is deployed to the Government of British Columbia's own OpenShift infrastructure. _NOTE_ The instructions below apply to deployment to the OpenShift 4 (OCP4) environment, and no longer apply to deployment to OCP3 environments.

### Environments

We have four environments:

| OpenShift Project | Name        | URL                                                  |
| ----------------- | ----------- | ---------------------------------------------------- |
| ccc866-dev        | Development | https://app-digmkt-dev.apps.silver.devops.gov.bc.ca  |
| ccc866-test       | Test        | https://app-digmkt-test.apps.silver.devops.gov.bc.ca |
| ccc866-prod       | Production  | https://app-digmkt-prod.apps.silver.devops.gov.bc.ca |

Each environment has its own database instance.

The Development and Test environments are secured behind HTTP Basic Auth. Please contact a team member to access these credentials.

### Deployment Process

**IMPORTANT**
For information on Helm deployment, see [helm deploy docs](./docs/build-deploy/helm-deploy.md).

The "ccc866-tools" OpenShift project is used to trigger the deployment process for all environments.

To deploy to the Development environment, start a build for "app-digmkt-dev", and OpenShift will build and deploy HEAD from the `development` branch into the Dev environment listed above.

To deploy to the Test environment, start a build for "app-digmkt-test", and OpenShift will build and deploy HEAD from the `master` branch into the Test environment listed above.

To deploy to the Production environment, start a build for "app-digmkt-prod", and OpenShift will build HEAD from the `master` branch. You will need to manually deploy the build to the Production environment listed above once it completes by deploying the "app-digmkt-prod" deployment in the "ccc866-prod" project.

For instructions on building images for each of the environments and setting up build and deployment configurations in OpenShift 4, please refer to the instructions in [docs/build-deploy/openshift.md](./docs/build-deploy/openshift.md).

#### Running Database Migrations

Using an environment's deployment shell, run `npm run migrations:latest` in the root of this repository's directory to run all migrations forward.

### Backups

Automated backups of the PostgreSQL database are performed with the BC Government Backup Container. Full documentation for this tool can be found here: https://github.com/BCDevOps/backup-container. The schedule for automated backups is as follows:

- Every 6 hours with a retention of 4 backups
- Every 24 hours with a retention of 1 backup (daily)
- Every week with a retention of 4 backups (weekly)
- Every month with a retention of 1 backup (monthly)

A manual backup can be immediately performed by connecting to the backup container pod in OpenShift and running `backup.sh -1`.

Backup archives are stored in the same OpenShift project as the Digital Marketplace application, on a separate provisioned volume.

You can find instructions for building and deploying the Backup Container images to OpenShift 4 [here](docs/build-deploy/backups.md).

#### Restoring from Backup

In the unfortunate event that you need to restore your data from a backup archive, the `backup.sh` script can be used to restore from the last backup file. Refer to https://github.com/BCDevOps/backup-container#restore for details on how to use this script.

### High Availability Database Deployment

The Digital Marketplace is currently deployed to an OpenShift platform using a highly available PostgreSQL stateful set. The template used to deploy this set is based on Patroni (https://patroni.readthedocs.io/en/latest/). A deployment configuration has been provided in `openshift/templates/database` for deployment to OpenShift environments. Instructions for building and deploying can be viewed [here](docs/build-deploy/backups.md).

Deployment as a highly available replicaset is recommended, but not required. A standalone PostgreSQL database deployment configuration has also been provided in `openshift/templates/database`.

## Community

### Contributing

Features should be implemented in feature branches. Create a pull request against the `development` branch to have your work reviewed for subsequent deployment.

The `development` branch contains all approved code.

The `master` branch contains work that has passed the Quality Assurance process and is ready to be deployed to production.

Hotfixes can be merged directly to `master` via a pull request, but should be merged back into the `development` branch as well.

#### Changelog & Versioning

This project introduced a Changelog and versioning system in 2020-09 to track changes made to the code. Please refer to `CHANGELOG.md` for further information. Generally, core maintainers of this project should be the only people adding to the Changelog.

### Forking this Repository

Please note the section above titled "Authors and Licensing" before forking this repository.

#### Configuration

Various aspects of this application can be configured. In addition to the environment variables described in the section titled "Environment Variables", the following files contain hard-coded configuration variables that can be overridden as needed:

- `src/back-end/config.ts`
- `src/front-end/typescript/config.ts`
- `src/shared/config.ts`

#### Theming

This project has a custom Bootstrap theme, defined in `src/front-end/sass/index.scss`. If you would like to theme this project to match your own style guide, you will need to update many of the variables in that file. You will likely also need to make the following changes to ensure a consistent user experience:

- Replace `logo.svg` and `logo.png` in `src/front-end/static/images`.
- Modify the colors within `default_user_avatar.svg` and `default_organization_logo.svg` in `src/front-end/static/images`.
- Modify the colors within the SVGs in `src/front-end/static/images/illustrations`.
- Modify the fonts sourced in `src/front-end/sass/_font.scss`.
- Modify the colors in `src/back-end/lib/mailer/templates.tsx` that are used for email notifications.

#### Migrations

When maintaining a fork of this project that has its own database migrations, special attention must be given to the `CHANGELOG.md` and source code diff whenever the root repository is merged into the fork. You will need to verify that any new migrations from the root repository do not conflict with your own database migrations and schema.

**Migrations can be destructive operations, so please ensure they are monitored and executed with special care.**

## Team

The Digital Marketplace is currently operated by the Procurement Services Branch within the Government of British Columbia's Ministry of Citizen's Services.

## Credits

This project would not have been possible by the incredible work done by open source project maintainers. The licenses for open source projects used are documented in `docs/open-source-licenses.txt`.
