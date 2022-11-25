# Overview
A custom, lightweight framework is used in this application. There are a few reasons a custom framework was built and we know it adds a bit of complexity, so what follows is a few reasons behind the decision. First the most desirable goal was a stable system. The influence of how funding can incentivize the building of software at the expense of maintaining software meant choosing an approach that offered some consistency over time. This translated to focusing on type safety. Things need to be strongly typed! Since most JS modules don't deal with types and change frequently, an argument could be made for minimizing external dependencies. Also, the reality of many developers working on the codebase created a desire for consistency to manage technical debt...the tradeoff with a prescriptive design approach is more initial effort for less chance of features being broken over time.

## Architecture
ELM architecture is similar to the custom framework, though one is a language and the other is simply TypeScript.

One of the most important things about the architectural approach is that the application nodes (back-end) are stateless, to maintain data consistency. You'll notice a shared directory as well `/src/shared` which both the front-end and back-end use. Front-end and back-end are also not spun up as separate pods/containers and this is by design.

The reasons for choosing a monolitic architecture are:

- team composition (it was small at the time), not having two separate developers focusing on disparate things
- instead of having a separate back-end and front-end microservice architecture which risks duplicating effort
- less overhead (economics) and for speeding up development time
- having single source of truth, such as with session states
- The CPU/Memory resource usage for the application is small.
- there needs to be more evidence that a microservice architecture is justified (currently over resourced). Vertical scaling for performance and horizontal scaling for fault-tolerance requires more users than we currently have.

### Design strategy:
Type safety is a predominant theme that influenced decisions about the direction of technology. A design principle is to lean on compiling the code as a way to ensure a level of quality. Errors will present themselves early. Given the time and resource constraints of the project's initialization, a reasonable tradeoff was to lean on a type safe design over front-end unit tests, for instance.

### Lightweight Framework
This describes what is basically a layer of `types` that are built on top of existing frameworks (such as Express), but standardizes them. A lightweight framework was created to overcome some deficiencies in the React library which didn't have types that were necessary to ensure safety.  (use of `any`, for instance). Redux was considered, but it wasn't really built with type safety in mind.

### Type Safety
The compiler works for you, not against you. Compiling catches errors prior to deployment. At the time of development, it was necessary to build a complete open source solution with a limited timeframe, with the goal that it could be maintained by one or two people and type safety was a way to reach that goal. Leaning on type safety provided a level of assurance towards software quality and data integrity.

### Composable State Management
Composable means many small components working together to build an application. The way it does this is through hierarchy. The goal of this approach is to provide great abstraction and composable state management. In React, for instance, the views are composable using an Object Oriented API. However, the state is mutable which means it can be changed anywhere resulting in the hierarchy of state being hard to maintain. State management in modern front-end frameworks is usually an afterthought. Redux is based on ELM but watered down and not fully type-safe. Redux brought this idea of reducers, a uni-directional state management system which is based on ELM. Update function in ELM = Reducer and Messages in ELM = Actions (Redux equivalent).

### Directory highlights

`/front-end/lib/framework/` - React is used as a stateless view library. Every react component takes arguments and returns html. State management is handled by the lightweight framework. State management is verbatim ELM architecture with a TypeScript twist. Provides a set of types that provide components, each component has **init**, **update** and **view** (the React view).

**Update** function takes a message from the component, updates the (immutable) state, and sends a message back. Can also return a promise (optional, but allows you to avoid a race state.)

**Init** takes some params, returns a promise with a state.

**View** takes props (optional arguments) in components, props must contain a state.

#### `/grunt-configs/`

GRUNT: calls the typescript compiler through grunt. The intent was a unified approach to front-end and back-end.

#### `/src/front-end/typescript/index.tsx`

- a single point of entry

#### `/src/migrations`

Purpose is to migrate the (mutable) schema and adhere to the type safe design principle. Custom migration framework to leverage type safety, using knex. Used to snapshot the data. The data, sometimes represented as ENUMs in migration scripts.

#### `/src/scripts`

more for development, not deployment. for example bcrypt for hashing passwords. a place to keep things for posterity.

## Back-End

ADT (algebraic data types) are used quite a bit; often used in functional programming and have been around for years. Each value constructor has a tag and a value. Example is color.

 ``` typescript
 type Color
   = ADT<'red'>
   | ADT<'blue'>
   | ADT<'green'>
   | ADT<'rgb', [number, number, number]>;

 const red: Color = { tag: 'red', value: undefined };
 const rgb: Color = { tag: 'rgb', value: [123, 255, 7] };
 ```

### `/src/backend/index.ts`

This is the point of entry, a tonne of imports. calls the `start()` function which starts the app, catches all errors, validates environment variables, connects to the database, sets up the router (router is a custom layer on top of express - for, you guessed it, the purpose of type safety). Also has a `start()` function. One adapter `ExpressAdapter` ('back-end/lib/server/adapters') acts as a driver to make sure the routes are handled properly, manage sessions, hosts, port, max file size - the arguments here are the minimum number of arguments to get the router going. Namespaced for clarity, example is /admin.

### `/src/backend/lib/crud.js`

one server that does everything, all in one monolith solution

### `/src/back-end/start.js`

Keeps things consistent. A way to make sure that module imports are brought in (via moduleAlias).

## Front-End

Need to produce a single javascript file; typescript and browserify allow us to do this.

#### `/src/front-end/typescript/index.ts`

This is the entry point. Grunt takes care of a lot of the work. Similar to the back-end there is a `start()` function. Environment variables are set at build time, not at runtime. You get a state manager at start up. Listeners for window resizing.

#### `/src/front-end/typescript/lib/app/index.tsx`

*AppComponent* comes from the framework (`front-end/lib/framework`). init, update, view, router
