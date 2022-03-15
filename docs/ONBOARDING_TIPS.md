# Onboarding Notes

This document outlines the major pain points in understanding this code base that have been uncovered by developers who have worked on this code base since the original authors handed it off. There is more information available in the `README.md` that should not be skipped over. It is encouraged that you add any additional discoveries or 'aha!' moments to this document.

## Setup
The process for setting up local development environment can be found in `README.md` under the section `Local Development Environment`. Some environment variables are secrets and will need to be safely passed from another team member to be added to your `.env` file.
**While the .env file is in the `.gitignore` file, be careful not to commit any sensitive values since they are being passed around**

### Accessing the Local DB
Once your local development environment is running, you may need to access the database. If the database is running in a Docker container, use the following to access the DB:
`docker exec -it  <container_name>  psql -U digitalmarketplace digitalmarketplace`
Unless changed, the container name will be `dm_db`.

To log in to the site as a government employee or an admin, you will need an IDIR. If you do not have one yet, or are handling multiple users in your local environment, the following can be used to update a users type directly in the database:
`update users set type='<user_type>' where email='<email_of_user>';`
A list of the available user types can be found in the `UserType` enum in `/src/shared/lib/resources/user.ts`. In the case of an admin, `<user_type>` in the above command would be replaced with `ADMIN`.

## Front-end

### State Management
As mentioned in the README, the front-end state management was based on the Elm architecture, and functions comparably to Redux. The relevant files can be found in 
`src/front-end/typescript/lib/framework/**/*.tsx`. The state object itself is created using `Immutable.js`. (Reference https://immutable-js.com/docs/v4.0.0)
In `src/front-end/typescript/lib/framework/index.tsx` the `start` function is defined. To better understand how the state management works in this project, spend some time reading this function. Notable points in it include:
- `state` object is created using Immutable
- `getState` accessor for `state`
- `routeManager` to handle route changes
- `dispatch` function to handle the queue of `state` mutations

Each page in the app has an `init`, `update`, and `view` function defined.
`init` initializes the state for the page.
`view` is where the pages layout is created.
`update` handles the staate changes made on the page. The update method takes the `state` and a `msg` as its args, and uses a switch satement on `msg.tag`. The `msg` values are defined as ADTs at the top of the pages, and can also have a second param which is accessed through `msg.value` inside the update function. Inside each case, `state` is modified using `state = state.set('<property>', value)` and the new `state` object is returned. The `msg` ADTs defined in each page, are imported into `src/front-end/typescript/lib/app/types.ts` where they are added to the `state` type under the appropriate page.

The general process of handling a new state change:
- Add an ADT to the list in the page with an appropriate `msg`, and if necessary `value`.
- Add a case to the `update` switch statement for your new `msg`.
- Handle the chage in that case.
- Return the new state object.

Each pages props are created in the `pageToViewPageProps` function found in `src/front-end/typescript/lib/app/view/index.tsx`.

### Styles
Styles can be found in `src/front-end/sass/`. Bootsrap is heavily used, and any other styling is in the `index.scss` file.

### Static
`src/front-end/static/` contains fonts, and images used in the app.

### CRUD
The CRUD abstractions can be found in `src/front-end/typescript/lib/http/crud.ts`. The crud actions that can be made are:
`create`, `readMany`, `readOne`, `update`, and `delete`. These are used to create the requests to the API.

## Shared
The shared folder contains types and functions used by both the `back-end` and `front-end`. Many of the commonly used types can be found in `src/shared/lib/types.ts` (for example the `ADT` interface mentioned above), and more specific types can be found in the appropriate files within `src/shared/lib/resources`. Also in the files in resources are functions used by both sides of the app, such as parse functions for proposals and opportunities.
`src/shared/lib/validation/` contains the validation functions used. For example, file validation functions can be found in `src/shared/lib/validation/file.ts`.

## Back-end
As mentioned in the `README.md` the back-end vends the front-end assets in `src/back-end/lib/routers/front-end.ts`. This is why `back-end:start` is what spins up the front end. The `createRouter` function collects all of the routes to serve, including the front-ends. 

All of the API logic that handles persisting data to the DB is found in `src/back-end/lib/resources/**/*.ts`. For example, the CRUD operations for SWU proposals can be found in `src/back-end/lib/resources/proposal/sprint-with-us.ts`.

### Swagger UI
In your local `.env` file you can set `SWAGGER_ENABLE` to true, spin up a local instance of the app, and then visit the `SWAGGER_UI_PATH` (default `/docs/api`) to view the generated API docs. 

## Migrations
DB migrations are written using the `knex` package (https://knexjs.org/). Read the `README.md` section on migrations. As mentioned there, it is important not to modify these files as the process as a whole is stateful. Existing migrations can be found in `src/migrations/tasks` and can be applied to your database by running `npm run migrations:latest` while the DB is running locally.
