# Purpose

**Continuous Onboarding:** This app uses a custom framework which does some familiar things in a unique way. This demo app strips everything down and walks you through some simple tasks to familiarize yourself with how it works.

1. Hello World
2. Counter
3. Multiple Counters

It is intended to be run locally and requires shutting down any other local instances of Marketplace that may be running (back-end and front-end). Build and Serve instructions are below.

## View

To switch between exercises, simply modify the line in `docs/learn/front-end/typescript/index.ts` to import the exercise you're working on.

```js
import * as exercise from "learn-front-end/exercises/02-single-counter";
```

## Build
to build the front-end learn app:

`npm run learn-front-end:watch`

## Run
to serve the front-end learn app:

`npm run learn-front-end:serve`
