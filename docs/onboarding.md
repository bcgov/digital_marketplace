# Developer Onboarding

The Digital Marketplace web application has been implemented as a full stack, TypeScript web application. Its codebase has been split into three parts: back-end, front-end and shared. This repository uses Vite and Typescript to implement various build tasks for both local development and hosted environments. Developers can build and run these codebases by running the scripts defined in `package.json`.

## Back-End Overview

The back-end source code implements a server-side application in TypeScript that runs on Node.js. It employs a type-safe, custom framework that (internally) uses Express to handle incoming requests.

## Front-End Overview

The front-end application is also implemented in TypeScript, and also employs a type-safe, custom framework that mirrors the Elm Architecture. It uses React for implementing and rendering views, and Bootstrap (via Sass) for styling. Learning Elm and its architecture will make it much easier to be productive in the front-end codebase.

## Shared Overview

The shared code implements types and helper functions that are used by both the front-end and back-end applications. In some cases, this is so we can stay DRY and abstract common logic. In other cases, shared modules (like the "resource" modules) act as a type-safe "contract" between the back-end and front-end, using the compiler to ensure each application is encoding/decoding the same values over a network connection.

## Other Considersations

### Why use custom frameworks?

There are several reasons this approach was taken for implementing the Digital Marketplace. The web app was originally built during a five-month contract by a vendor, Real Folk, in 2019/20. There were no software engineers employed by the province at the time. The original vendor, Real Folk, realized the importance of building an application with a minimal failure rate (i.e. minimize the risk of run-time exceptions) because of (1) the province's lack of internal resources to maintain the application if something went wrong, and (2) the lengthy process involved with procuring a vendor to fix any issues that may arise.

So, to avoid a period of prolonged downtime, the decision was made the implement the application with type safety as the most important architectural outcome. Doing so would almost completely eliminate the risk of run-time exceptions while significantly reducing the need for unit tests. At the time, the Node.js ecosystem did not have many strongly-typed application frameworks (modules were often "JavaScript-first" and `any` was pervasively used in type interface files), so the Real Folk development team built the back-end and front-end frameworks from scratch. This also offered the benefit of a "controlled dependency" that wouldn't be deprecated outside the control of the province, in alignment with the above-mentioned architectural goals.

### Algebraic Data Types

The application employs Algebraic Data Types (A.K.A ADTs) throughout the source code. ADTs are a fundamental building block of functional programming, inspiring their usage here. It is recommended that developers learn about ADTs and how they can be used in order to effectively contribute to this codebase.

# Front-End Architecture

The front-end framework's source code is located in the `src/front-end/typescript/lib/framework` directory. The framework is effectively a TypeScript port of the Elm Architecture, mirroring the following concepts:

- Components with `init`, `update` and `view` functions, and `State` (A.K.A `Model` in Elm) and `Msg` types.
- Managed effects via `Cmd`.
- Immutable representation of state.

However, it differs from the Elm Architecture in several ways, mainly due to the nature of TypeScript/JavaScript and the scope of the Digital Marketplace web application:

- Several component "types": `App`, `Page`, `Global`, `Base`.
  - `Page` components are coupled to the Digital Marketplace application's style guide and design system, implementing functionality like alerts, modals, sidebars, etc.
- A new `Process` type that represents a running `App` component, allowing developers to introspect running applications in debug mode.
- A prescriptive approach to component composition via helper functions exposed by the framework.
- A different approach to client-side, `pushState` routing.

To better understand the front-end architecture, it is recommended that developers read the [Elm Guide](https://guide.elm-lang.org/).

## Build System

The front-end is built using Vite. This includes:

1. Compiling the TypeScript codebase to JavaScript.
2. Bundling JavaScript modules with Rollup.
3. Processing CSS and SASS styles.
4. Handling static assets and HTML templates.
5. Minifying JavaScript, CSS and HTML assets for production builds.
6. Compressing static assets using gzip and brotli for production builds.

All commonly-used build scripts are aliased as NPM scripts in `package.json` for convenience.

To build the front-end, simply run `npm run front-end:build` which builds for production with asset minification, optimization and compression.

To watch for source file changes and rebuild the front-end during local development, execute the `npm run front-end:watch` command in your terminal.

## Deployment

The front-end's built assets are served by the back-end. They could be deployed to a CDN, however, given the scope and usage of the Digital Marketplace, the decision was made to serve them directly from the back-end server for simplicity.

# Back-End Architecture

The back-end framework's source code is in the `src/back-end/lib/server/` directory. It implements several core types and functions to build an HTTP server. Some of these types include: `Request`, `Response` and `Route`. This framework is executed by an "adapter." There is currently one adapter that uses `express` internally to listen for new requests and serve responses.

The core philosophy behind the server framework is two-fold:

1. To encourage type-safety across the codebase.
2. To separate the app's business logic from HTTP-specific logic. While this wasn't fully achieved, the framework made strides in this direction. This idea was heavily influenced by the "functional core, imperative shell" approach to software development (ask Google for more information).

## CRUD Resources

The bulk of the server's business logic is implemented as CRUD resources in the `src/back-end/lib/resources/` directory. The module organization there is pervasive throughout the codebase, including:

- Back-end database modules: `src/back-end/lib/db/`.
- Shared resources: `src/shared/lib/resources/`.
- Front-end HTTP client API: `src/front-end/typescript/lib/http/api/`.

## Database

The back-end persists data in a single PostgreSQL database. It also uses this database for binary file storage (e.g. user avatar images, opportunity attachments, etc.) As a result, all data, including binary files, conforms to the database schema.

Application code that interacts with the database is located in the `src/back-end/lib/db/` directory. This project uses `knex` to form and execute SQL queries.

### Database Migrations

Database migrations are stored in the `src/migrations/` directory. These migrations are implemented in TypeScript and use `knex` to run and manage migration state in the database.

The `npm run migrations:*` scripts in `package.json` are how developers can create and execute migrations.

**IMPORTANT: Always encapsulate all of your types and helper functions in a single migration file. Never import types from the `back-end` source directory, as that may change over time. Migrations should be viewed as all-encompassing and immutable (i.e. don't delete them either after they have been run in production).**

## Build/Execution System

The back-end is compiled from TypeScript to JavaScript using the TypeScript compiler directly.

To build the back-end, simply run `npm run back-end:build`. To build the app for production, which involves cleaning the build directory before rebuilding, run `npm run back-end:build:production`.

To watch for source file changes and rebuild the back-end during local development, execute the `npm run back-end:watch` command in your terminal.

# Directory Structure

## Root

| Path               | Description                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| `build/`           | Directory containing all final build artifacts. Ignored by `git`.                                    |

| `tmp`              | Directory containing all intermediary build artifacts. Ignored by `git`.                             |
| `.eslintrc.js`     | `eslint` configuration file for automated code linting.                                              |
| `.prettierrc.json` | `prettierrc` configuration file for automated code formatting.                                       |
| `package.json`     | NPM package configuration. All development scripts are defined in this file as NPM scripts.          |
| `tsconfig.json`    | Root TypeScript configuration file. Each `src` project inherits their configurations from this file. |

## Shared Source Code

| Path                                  | Description                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/shared/`                         | Source code that is shared between the front-end and back-end is located in this directory. |
| `src/shared/lib/data/`                | TypeScript modules that export hard-coded data, like Capabilities and Skills.               |
| `src/shared/lib/resources/`           | Types and helper functions organized by back-end resource for use across the stack.         |
| `src/shared/lib/validations/`         | Validation functions organized by back-end resource for use across the stack.               |
| `src/shared/lib/validations/index.ts` | Core validation types and helper functions for creating and using validation functions.     |
| `src/shared/lib/http.ts`              | HTTP-specific helper functions to make requests and handle responses.                       |
| `src/shared/lib/index.ts`             | General helper functions that don't have a specific business application.                   |
| `src/shared/lib/types.ts`             | General types used across the application. e.g. `ADT`.                                      |
| `src/shared/config.ts`                | Shared configuration constants.                                                             |
| `src/shared/tsconfig.json`            | TypeScript configuration file for shared source code.                                       |

## Front-End Source Code

| Path                                                 | Description                                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/front-end/`                                     | Source code that implements the Digital Marketplace web application user interface.                                                                                                         |
| `src/front-end/html/downtime.ejs`                    | An EmbeddedJS template to be rendered when the app is undergoing scheduled downtime.                                                                                                        |
| `src/front-end/html/index.ejs`                       | An EmbeddedJS template to be rendered when serving the web application.                                                                                                                     |
| `src/front-end/html/unsupported-browser.ejs`         | An EmbeddedJS template to be rendered when the user visits the web application with an unsupported web browser.                                                                             |
| `src/front-end/sass/_bootstrapp.scss`                | Modified Bootstrap framework.                                                                                                                                                               |
| `src/front-end/sass/_font.scss`                      | `@font-face` rules for `BCSans`.                                                                                                                                                            |
| `src/front-end/sass/_reboot.scss`                    | An overridden `_reboot.scss` from Bootstrap to change how certain links are styled.                                                                                                         |
| `src/front-end/sass/index.scss`                      | The Digital Marketplace custom Bootstrap theme and other styles.                                                                                                                            |
| `src/front-end/static/`                              | Static files that should be copied verbatim to the front-end's build directory.                                                                                                             |
| `src/front-end/typescript/`                          | TypeScript source files.                                                                                                                                                                    |
| `src/front-end/typescript/lib/app/`                  | Modules implementing the front-end's root `AppComponent`.                                                                                                                                   |
| `src/front-end/typescript/lib/components/`           | Modules implementing various re-usable `Component`s.                                                                                                                                        |
| `src/front-end/typescript/lib/framework/component/`  | Types and functions that implement the various component types supported by the front-end's custom framework.                                                                               |
| `src/front-end/typescript/lib/framework/router/`     | A fork of `page.js` that implements client-side `pushState` routing for the front-end's custom framework.                                                                                   |
| `src/front-end/typescript/lib/framework/index.tsx`   | A module that combines all of the abstractions exported by the front-end's custom framework.                                                                                                |
| `src/front-end/typescript/lib/framework/process.tsx` | Types and functions that execute an `AppComponent` in the browser.                                                                                                                          |
| `src/front-end/typescript/lib/http/api`              | Functions to request data from the back-end, generally organized by back-end CRUD resources.                                                                                                |
| `src/front-end/typescript/lib/http/api/index.ts`     | A module that combines all of the `http/api` functions and associated helper functions and types.                                                                                           |
| `src/front-end/typescript/lib/http/crud.ts`          | Types and helper functions for making requests to back-end CRUD resources.                                                                                                                  |
| `src/front-end/typescript/lib/pages/`                | Modules implementing all of the front-end's `PageComponent`s.                                                                                                                               |
| `src/front-end/typescript/lib/views/`                | Modules implementing various re-usable `View`s.                                                                                                                                             |
| `src/front-end/typescript/lib/access-control.ts`     | Exposes a set of functions used to limit access to various pages. These functions are used to create a `PageComponent`s `init` function that executes the desired access control behaviour. |
| `src/front-end/typescript/lib/index.ts`              | General front-end-specific helper functions.                                                                                                                                                |
| `src/front-end/typescript/lib/types.ts`              | General front-end-specific types.                                                                                                                                                           |
| `src/front-end/typescript/config.ts`                 | Front-end configuration constants.                                                                                                                                                          |
| `src/front-end/typescript/index.ts`                  | The front-end's entrypoint file that runs the application and renders it into the DOM.                                                                                                      |
| `src/front-end/typescript/tsconfig.json`             | TypeScript configuration file for front-end source code.                                                                                                                                    |

## Back-End Source Code

| Path                                        | Description                                                                                                                                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/back-end/`                             | Source code that defines the behaviour of Node.js HTTP server that supports the Digital Marketplace web application.                                                                                                  |
| `src/back-end/docs/`                        | Swagger documentation files.                                                                                                                                                                                          |
| `src/back-end/lib/db/`                      | Database-specific queries and helper functions organized by resource.                                                                                                                                                 |
| `src/back-end/lib/hooks/code-with-us.ts`    | A hook that automatically marks Code With Us opportunities as ready for evaluation. This hook is run on a per-request basis and is throttled to limit resource utilization.                                           |
| `src/back-end/lib/hooks/logger.ts`          | A hook that logs each request and response.                                                                                                                                                                           |
| `src/back-end/lib/hooks/sprint-with-us.ts`  | A hook that automatically marks Sprint With Us opportunities as ready for evaluation. This hook is run on a per-request basis and is throttled to limit resource utilization.                                         |
| `src/back-end/lib/mailer/notifications/`    | Modules that export individual email notifications. **Note:** There is a discrepancy in how contract dates are displayed in opportunity award emails across the three opportunity types. CWU opportunities have `startDate` and `completionDate` fields but do not include them in award emails, while TWU opportunities include them.                                                                                |
| `src/back-end/lib/mailer/index.tsx`         | Exports general types for representing transactional emails.                                                                                                                                                          |
| `src/back-end/lib/mailer/templates.tsx`     | Exports types, functions and React views for rendering email notifications.                                                                                                                                           |
| `src/back-end/lib/mailer/transport.ts`      | Exports types and functions for sending transactional emails using `nodemailer`.                                                                                                                                      |
| `src/back-end/lib/map-routes/basic-auth.ts` | Maps over a route to protect it behind HTTP basic authentication. This is useful for test environments.                                                                                                               |
| `src/back-end/lib/resources/`               | Core business logic implemented as CRUD "resources." These resources are exposed via the back-end server for consumption by the front-end web application.                                                            |
| `src/back-end/lib/routers/admin/`           | Exposes a single page for `UserType.Admin` users displaying test versions of each email notification sent by the Digital Marketplace.                                                                                 |
| `src/back-end/lib/routers/auth.ts`          | A router for handling KeyCloak authentication using OpenID Connect.                                                                                                                                                   |
| `src/back-end/lib/routers/front-end.ts`     | A router for serving the front-end web application's built assets.                                                                                                                                                    |
| `src/back-end/lib/routers/status.ts`        | A router exposing a lightweight endpoint to indicate uptime.                                                                                                                                                          |
| `src/back-end/lib/server/adapters.ts`       | Exposes an `ExpressAdapter` that is used to listen for incoming HTTP requests and respond to them using the back-end server framework's abstractions. It's like a server "driver" that uses `express` under the hood. |
| `src/back-end/lib/server/index.ts`          | The core server framework used to implement the back-end.                                                                                                                                                             |
| `src/back-end/lib/crud.ts`                  | Types and functions for implementing CRUD resources that can be converted to `Router`s for use by the server framework. The `resources/` are all implemented using this module's abstractions.                        |
| `src/back-end/lib/index.ts`                 | General back-end-specific helper functions.                                                                                                                                                                           |
| `src/back-end/lib/permissions.ts`           | Exposes a set of functions used to limit access to various routes, i.e. a form of access control.                                                                                                                     |
| `src/back-end/lib/security.ts`              | Exposes security-related helper functions that deal with hashing and verifying passwords.                                                                                                                             |
| `src/back-end/lib/swagger.ts`               | Swagger configuration used to generate API documentation.                                                                                                                                                             |
| `src/back-end/lib/types.ts`                 | General back-end-specific types.                                                                                                                                                                                      |
| `src/back-end/lib/validation.ts`            | Back-end-specific validation functions.                                                                                                                                                                               |
| `src/back-end/config.ts`                    | Back-end configuration constants, typically sourced from environment variables.                                                                                                                                       |
| `src/back-end/index.ts`                     | The main TypeScript file that executes the back-end server.                                                                                                                                                           |
| `src/back-end/start.js`                     | A JavaScript file that executes `index.ts` after it has been compiled. This file is required for the module aliases to work correctly.                                                                                |
| `src/back-end/tsconfig.json`                | TypeScript configuration file for back-end source code.                                                                                                                                                               |

## Database Migrations

| Path                           | Description                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `src/migrations/`              | All database migrations defined with Knex.                                                   |
| `src/migrations/tasks/`        | Each migration is defined as a single TypeScript file in this directory.                     |
| `src/migrations/knexfile.ts`   | Knex configuration file.                                                                     |
| `src/migrations/stub.ts`       | A blank, template migration that is used to create new migrations in the `tasks/` directory. |
| `src/migrations/tsconfig.json` | TypeScript configuration file for migrations source code.                                    |

# Terminology

## Algrebraic Data Type ("ADT")

An Algebraic Data Type ("ADT") is a composite type that is typically used in functional programming. It allows developers to define a new type and an associated set of value constructors that are "of" this new type. Once defined, an ADT is treated like any other type: it can be passed as arguments to a function and returned from a function. It's even possible to perform logic on ADTs, like equality comparisons.

The primary benefit of ADTs is that they allow you to enumerate your possible states and effectively "group" them as a single type. When working with a strongly-typed language, this is useful for modeling your problem domain and implementing type-safe programs.

An example of an ADT in Haskell:

```hs
-- The type name is "Color."
data Color
  -- Value constructors without any parameters to represent the colors "Red," "Green," and "Blue."
  = Red
  | Green
  | Blue
  -- A value constructor to represent an "RGB" color with integer channel parameters for red, green and blue.
  | RGB Int Int Int

-- It is possible to create "Color" values by using a value constructor.
foreground :: Color
foreground = Red

white :: Color
white = RGB 255 255 255
```

Unfortunately, ADTs are not native to TypeScript. Instead, we define "synthetic" ADTs in the `src/shared/lib/types.ts` file using a TypeScript interface. This solution employs generic type parameters and function overloading.

```ts
export interface ADT<Tag, Value = undefined> {
  readonly tag: Tag;
  readonly value: Value;
}

export function adt<T>(tag: T, value?: undefined): ADT<T>;
export function adt<T, V>(tag: T, value: V): ADT<T, V>;
export function adt<T extends ADT<unknown, unknown>>(
  tag: T["tag"],
  value: T["value"]
): ADT<T["tag"], T["value"]> {
  return { tag, value };
}
```

This flavour of ADTs allows us to define our own union types in TypeScript. Here is the `Color` example ported to TypeScript:

```ts
type Color =
  | ADT<"red">
  | ADT<"green">
  | ADT<"blue">
  | ADT<"rgb", [number, number, number]>;

const foreground: Color = adt("red");

const white: Color = adt("rgb", [255, 255, 255]);
```

While this solution works well enough to build a type-safe application, it isn't perfect. The TypeScript compiler sometimes requires "hints" to properly identify ADT values. If you notice the compiler complaining when it shouldn't be, try casting the appropriate type as shown below.

```ts
const white = adt("rgb", [255, 255, 255]) as Color;
```

### Further Reading

- [Wikipedia article on ADTs](https://en.wikipedia.org/wiki/Algebraic_data_type).

## Elm Architecture

Elm is a type-safe, functional, programming language for building browser-based user interfaces. It is known for its opinionated, but lightweight, architecture for building stateful applications. The Digital Marketplace's front-end is built with a custom, TypeScript port of the Elm Architecture. It is implemented in the `src/front-end/typescript/lib/framework/` directory.

Given TypeScript and Elm are different languages, the resulting TypeScript version of this framework is slightly different from the Elm version. For example, all side effects are managed in Elm via the `Cmd` type. However, TypeScript is simply a layer atop JavaScript, which has completely unmanaged effects (e.g. make a network request anywhere). While the framework implements a `Cmd` type, it's up to the developer to continue upholding the Elm-based conventions adopted in the code by managing effects accordingly.

In addition, this repository's front-end framework encapsulates a style guide and layout for the Digital Marketplace via `AppComponent`s and `PageComponent`s. Elm offers a more general-purpose architecture with fewer abstractions.

Both React and Redux were significantly influenced by the Elm Architecture.

### Further Reading

- [Elm Guide](https://guide.elm-lang.org/).

## Immutable

Traditionally, imperative languages like TypeScript, deal with mutable values (variables can _vary_ over time); whereas, functional languages usually only deal with immutable values (all variables are effectively constants). A programming environment that only deals with immutable data tends to result in more reliable software, as data cannot unexpectedly change in different places, eliminating swaths of bugs.

The Digital Marketplace's front-end framework uses the ImmutableJS library to enforce immutability throughout the source code.

### Further Reading

- [ImmutableJS Website](https://immutable-js.com/).

## Purity

Purity is a functional programming concept that describes functions without side effects.

For example, the following functions are pure because they only return new values after operating on their arguments:

```ts
function sum(a: number, b: number): number {
  return a + b;
}

function map<A, B>(fn: (a: A) => B, list: A[]): B[] {
  let acc: B[] = [];
  for (const a in list) {
    acc = [...acc, fn(a)];
  }
  return acc;
}
```

However, the following functions are **not** pure because they perform side effects during their operation:

```ts
function sumImpure(a: number, b: number): number {
  return a + b + Date.now(); // Getting the date is a side-effect.
}

function async mapImpure<A, B>(fn: (a: A) => B, list: A[]): Promise<B[]> {
  const makeNetworkRequest = (a: A): Promise<A> => /* ... */;
  let acc: B[] = [];
  for (const a in list) {
    acc = [...acc, fn(await makeNetworkRequest(a))]; // Making a network request and using the response is impure.
  }
  return acc;
}
```

## Unidirectional Data Flow

An important concept of the Elm Architecture is "Unidirectional Data Flow." This means that data in a front-end application only flows one way. An Elm application (and those built with the Digital Marketplace's front-end framework) is a tree of components. This tree has a single root node that can be referred to as the "root component" or "app component."

All of an application's state lives in its root component as an immutable variable. Subsets of it are passed down to child components, which them pass down subsets of their own state to their own child (grandchild?) components, and so on. A unidirectional application architecture only passes state "down" this way, state is never passed "up."

```
Root(rootState)
  -> ChildA(rootState.childA)
    -> GrandChild(rootState.childA.grandChild)
  -> ChildB(rootState.childB)
```

Understanding this concept usually comes from experience. It becomes more intuitive after working on the codebase for a while.
