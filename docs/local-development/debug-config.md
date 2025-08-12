# Debug

## Difficulties
It is difficult to debug/step-through front-end code so the recommendation is to use browser development tools separately. When using the IDE for debugging and setting breakpoints it should only be for back-end/server code.

## Gotchas with IDE debugging
The module aliasing (e.g. import * from "shared/...") is what throws off most debuggers and build tools. Usually `tsconfig` files are used by debuggers and you may need to create a separate tsconfig for your local environment so that the IDE knows how to run your app.

## Alternatives
Another solution is to configure TypeScript to emit source maps alongside JS and just debug the JS.

## Front-end
Debugging the front-end might require evaluating MSG's in the state object.

**Pre-requisites**
- running locally
- dev tools in the browser

1. Run the following
`VITE_NODE_ENV=development npm run front-end:watch`

2. Open the Console of a browser's Dev Tools to view a list of state events.

*Example*
``` json
{
    "tag": "msgDispatched",
    "value": {
        "tag": "nav",
        "value": {
            "tag": "toggleMobileMenu",
            "value": false
        }
    }
}
{
    "tag": "stateChanged",
    "value": {
        "state": {
            "ready": true,
            "incomingRoute": null,
            "toasts": [],
            "showModal": null,
            "acceptNewTerms": {
                "id": "global-accept-new-terms",
                "errors": [],
                "showHelp": false,
                "child": {
                    "value": false,
                    "id": "global-accept-new-terms"
                },
                "validate": null
            },
            "acceptNewTermsLoading": 0,
            "shared": {
                "session": null
            },
            "activeRoute": {
                "tag": "landing",
                "value": null
            },
            "nav": {
                "isDesktopAccountDropdownOpen": false,
                "isDesktopContextualDropdownOpen": false,
                "isMobileContextualDropdownOpen": false,
                "isMobileMenuOpen": false
            },
            "pages": {
                "landing": {
                    "totalCount": 94,
                    "totalAwarded": 13211500
                }
            }
        }
    }
}
```
## Back-end

**Pre-requisites**
- running locally
- command line access

### Regular Development (without source maps)

Run the following for normal development:
```bash
VITE_NODE_ENV=development npm run back-end:watch
```

This will display server logs:

```bash
[request:76d1029e-445a-46b1-a45b-db34cdefbac4] -> GET /images/illustrations/sprint_with_us.svg sessionId="anonymous"
[request:76d1029e-445a-46b1-a45b-db34cdefbac4] <- 200 1ms
[request:b7c10e3f-5bd9-49f7-a82f-3d4d21e2b042] -> GET /images/illustrations/collaboration_work.svg sessionId="anonymous"
[request:b7c10e3f-5bd9-49f7-a82f-3d4d21e2b042] <- 200 1ms
[request:950b8e2b-c899-4497-a3ed-229ff9004a39] -> GET /images/illustrations/consultation.svg sessionId="anonymous"
[request:950b8e2b-c899-4497-a3ed-229ff9004a39] <- 200 0ms
[request:e486a819-21fa-429d-9f8f-94361f638665] -> GET /images/andy.jpg sessionId="anonymous"
[request:e486a819-21fa-429d-9f8f-94361f638665] <- 200 0ms
[request:bd12f2f3-de43-42e6-b09e-36efb822fb53] -> GET /fonts/BCSans/BCSans-Bold.woff2 sessionId="anonymous"
[request:bd12f2f3-de43-42e6-b09e-36efb822fb53] <- 200 1ms
[hooks] Invoked cwuCrudHook at Thu Nov 24 2022 16:02:55 GMT-0800 (Pacific Standard Time)
[hooks] Invoked swuCrudHook at Thu Nov 24 2022 16:02:55 GMT-0800 (Pacific Standard Time)
```

### Debugging with Source Maps

For debugging with IDE integration and source maps, use the following:

In your IDE, set up a debug configuration that connects to your Node.js application. For VS Code You can use the pre-configured 'Run Script:back-end:debug' command, which will automatically start and attach to the debug session. This allows you to set breakpoints, inspect variables, and step through your back-end code.

This setup uses a separate `tsconfig.debug.json` configuration that only generates source maps when needed for debugging.
