# Digital Marketplace Custom Frontend Framework Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture Philosophy](#architecture-philosophy)
3. [Core Components](#core-components)
4. [Component Structure](#component-structure)
5. [Base Components: View vs ComponentView](#base-components-view-vs-componentview)
6. [Page Components](#page-components)
7. [State Management](#state-management)
8. [Message Handling & Communication](#message-handling--communication)
9. [Command System](#command-system)
10. [Type System](#type-system)
11. [Routing System](#routing-system)
12. [Child Component Management](#child-component-management)
13. [Best Practices](#best-practices)
14. [Common Patterns](#common-patterns)
15. [Examples](#examples)

## Overview

This project uses a custom frontend framework built on top of React and TypeScript that follows the **Model-View-Update (MVU)** architecture pattern, similar to the Elm architecture. The framework emphasizes:

- **Unidirectional data flow**
- **Immutable state management**
- **Predictable updates**
- **Component composability**
- **Strong type safety**
- **Separation of concerns**

The framework is located in `src/front-end/typescript/lib/framework/` and consists of several key modules:

- **base**: Core component primitives
- **component**: Component utilities and types
- **page**: Page-specific components and utilities
- **router**: Client-side routing
- **cmd**: Command system for side effects

## Architecture Philosophy

The framework follows these core principles:

### 1. Separation of Concerns
Each component is organized around three main concerns:
- **State**: What data the component manages
- **Messages**: How the component communicates
- **View**: How the component renders

### 2. Composability
Components can be safely nested within other components through:
- **State path mapping** with `updateChild`
- **Message mapping** with `mapDispatch`
- **Predictable parent-child communication**

### 3. Immutability
All state is immutable using Immutable.js Records, ensuring:
- **Predictable updates**
- **Easy debugging**
- **Undo/redo capabilities**
- **Performance optimizations**

## Core Components

### Component Interface

Every component must implement the base `Component` interface:

```typescript
interface Component<Params, State, Msg, Props> {
  init: Init<Params, State, Msg>;
  update: Update<State, Msg>;
  view: View<Props>;
}
```

### The Three Functions

#### 1. `init`
**Purpose**: Initialize component state and trigger initial side effects.

```typescript
type Init<Params, State, Msg> = (
  params: Params
) => InitReturnValue<State, Msg>;

type InitReturnValue<State, Msg> = [State, Array<Cmd<Msg>>];
```

**Example**:
```typescript
const init: component_.base.Init<Params, State, Msg> = (params) => {
  return [
    {
      loading: false,
      data: null,
      error: null
    },
    [cmd.dispatch(adt("loadData"))]
  ];
};
```

#### 2. `update`
**Purpose**: Handle messages and update state.

```typescript
type Update<State, Msg> = (
  params: UpdateParams<State, Msg>
) => UpdateReturnValue<State, Msg>;

type UpdateReturnValue<State, Msg> = [Immutable<State>, Array<Cmd<Msg>>];
```

**Example**:
```typescript
const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "loadData":
      return [
        state.set("loading", true),
        [cmd.httpRequest({
          method: "GET",
          url: "/api/data",
          handleResponse: (response) => adt("dataLoaded", response)
        })]
      ];

    case "dataLoaded":
      return [
        state
          .set("loading", false)
          .set("data", msg.value),
        []
      ];

    default:
      return [state, []];
  }
};
```

#### 3. `view`
**Purpose**: Render the component UI.

```typescript
type View<Props> = (props: Props) => ViewElement;
```

**Example**:
```typescript
const view: component_.base.ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      {state.loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <button onClick={() => dispatch(adt("loadData"))}>
            Refresh Data
          </button>
          {state.data && <div>{state.data}</div>}
        </div>
      )}
    </div>
  );
};
```

## Base Components: View vs ComponentView

The framework provides two main view types:

### `base.View<Props>`
- **Generic view function** that accepts any props
- **Flexible** - can accept custom props beyond state/dispatch
- **Use when**: You need to pass additional props or when building reusable view components

```typescript
type View<Props = Record<string, never>, ReturnValue = ViewElement> = (
  props: Props
) => ReturnValue;
```

### `base.ComponentView<State, Msg>`
- **Component-specific view** that receives state and dispatch
- **Standardized** - always receives `ComponentViewProps<State, Msg>`
- **Use when**: Building standard components that follow the MVU pattern

```typescript
type ComponentView<State, Msg, ReturnValue = ViewElement> = View<
  ComponentViewProps<State, Msg>,
  ReturnValue
>;

interface ComponentViewProps<State, Msg> {
  state: Immutable<State>;
  dispatch: Dispatch<Msg>;
}
```

### Key Differences

| Aspect | `base.View` | `base.ComponentView` |
|--------|-------------|----------------------|
| **Props** | Custom props type | Standard `{state, dispatch}` |
| **Flexibility** | High - any props | Low - fixed props |
| **Usage** | Reusable views, custom props | Standard components |
| **Type Safety** | Requires explicit typing | Automatic from State/Msg |

## Page Components

Page components are special components that represent entire pages and extend the base component interface:

```typescript
interface Component<RouteParams, SharedState, State, PageMsg, Route> {
  fullWidth?: boolean;
  simpleNav?: boolean;
  backgroundColor?: ThemeColor;
  init: Init<RouteParams, SharedState, State, PageMsg, Route>;
  update: Update<State, PageMsg, Route>;
  view: View<State, PageMsg, Route>;
  sidebar?: Sidebar<State, Msg<PageMsg, Route>>;
  getMetadata: GetMetadata<State>;
  getAlerts?: GetAlerts<State, Msg<PageMsg, Route>>;
  getBreadcrumbs?: GetBreadcrumbs<State, Msg<PageMsg, Route>>;
  getModal?: GetModal<State, Msg<PageMsg, Route>>;
  getActions?: GetActions<State, Msg<PageMsg, Route>>;
}
```

### Page Component Features

1. **Metadata**: Page title, description, etc.
2. **Sidebar**: Optional sidebar content
3. **Alerts**: System notifications
4. **Breadcrumbs**: Navigation breadcrumbs
5. **Modals**: Page-level modals
6. **Actions**: Page-level action buttons
7. **Layout Options**: Full width, simple nav, background color

### Page Init Function

Page components receive additional context:

```typescript
interface Params<RouteParams, SharedState> {
  routePath: string;
  routeParams: Readonly<RouteParams>;
  shared: Readonly<SharedState>;
}
```

## State Management

### Immutable State

All state is immutable using Immutable.js Records:

```typescript
type Immutable<State> = Immutable.Record<State & object> & Readonly<State>;

function immutable<State>(state: State): Immutable<State> {
  return Immutable.Record(state as State & object)();
}
```

### State Updates

State updates are performed through the update function:

```typescript
// Wrong: Direct mutation
state.loading = true;

// Correct: Immutable update
const newState = state.set("loading", true);

// Multiple updates
const newState = state
  .set("loading", false)
  .set("data", responseData)
  .set("error", null);
```

### Nested State

For complex state structures, use nested updates:

```typescript
const newState = state.setIn(["user", "profile", "name"], newName);
```

## Message Handling & Communication

### Message Types

Messages are defined using ADT (Algebraic Data Types):

```typescript
import { ADT, adt } from "shared/lib/types";

type Msg =
  | ADT<"loadData">
  | ADT<"dataLoaded", ResponseData>
  | ADT<"setLoading", boolean>
  | ADT<"showModal", ModalData>;
```

### Message Dispatch

Messages are dispatched using the dispatch function:

```typescript
// Simple message
dispatch(adt("loadData"));

// Message with data
dispatch(adt("dataLoaded", responseData));
```

### Parent-Child Communication

#### mapDispatch

Used to map child messages to parent messages:

```typescript
const childDispatch = mapDispatch(
  parentDispatch,
  (childMsg: ChildMsg) => adt("childAction", childMsg)
);
```

#### updateChild

Used to update child state within parent update function:

```typescript
const [newState, cmds] = updateChild({
  state: parentState,
  childStatePath: ["childComponent"],
  childUpdate: ChildComponent.update,
  childMsg: childMessage,
  mapChildMsg: (childMsg) => adt("childAction", childMsg)
});
```

## Command System

Commands handle side effects and asynchronous operations:

### Command Types

```typescript
type Cmd<Msg> = ADT<"async", () => Promise<Msg>>;
```

### Built-in Commands

#### HTTP Requests
```typescript
cmd.httpRequest({
  method: "GET",
  url: "/api/data",
  transformResponse: (raw) => raw,
  handleResponse: (response) => adt("dataLoaded", response)
});
```

#### Navigation
```typescript
cmd.pushUrlState("/new-url", adt("urlChanged"));
cmd.replaceUrlState("/new-url", adt("urlChanged"));
cmd.redirect("/external-url", adt("redirected"));
```

#### DOM Operations
```typescript
cmd.focus("element-id", adt("focused"));
cmd.blur("element-id", adt("blurred"));
cmd.scrollTo(0, 100, adt("scrolled"));
```

#### Delayed Actions
```typescript
cmd.delayedDispatch(1000, adt("delayed"));
```

#### Debounced Actions
```typescript
const debouncedDispatch = cmd.makeDebouncedDispatch(
  adt("noOp"),
  adt("search", query),
  500
);
```

#### Local Storage
```typescript
cmd.localStorage.setItem("key", "value", adt("stored"));
cmd.localStorage.getItem("key", (value) => adt("retrieved", value));
```

### Command Composition

Commands can be composed using various utilities:

```typescript
// Map command to different message type
const mappedCmd = cmd.map(originalCmd, (msg) => adt("wrapped", msg));

// Sequence commands
const sequenceCmd = cmd.sequence([cmd1, cmd2, cmd3]);

// Join commands
const joinedCmd = cmd.join(
  cmd1,
  cmd2,
  (result1, result2) => adt("combined", { result1, result2 })
);
```

## Type System

### Component Type Parameters

```typescript
interface Component<Params, State, Msg, Props> {
  // Params: Initial parameters for component
  // State: Component state type
  // Msg: Message types the component handles
  // Props: View props type (optional, defaults to ComponentViewProps)
}
```

### Page Component Type Parameters

```typescript
interface Component<RouteParams, SharedState, State, PageMsg, Route> {
  // RouteParams: URL parameters
  // SharedState: Application shared state
  // State: Page-specific state
  // PageMsg: Page message types
  // Route: Application route type
}
```

### Type Utilities

#### Validation Types
```typescript
import { Validation, valid, invalid } from "shared/lib/validation";

type State = Validation<ValidState, ErrorState>;
```

#### ADT (Algebraic Data Types)
```typescript
import { ADT, adt } from "shared/lib/types";

type Status =
  | ADT<"loading">
  | ADT<"success", Data>
  | ADT<"error", Error>;
```

## Routing System

### Router Configuration

```typescript
interface Router<Route> {
  routes: Array<RouteDefinition<Route>>;
  routeToUrl(route: Route): string;
}

interface RouteDefinition<Route> {
  path: string;
  makeRoute(params: RouteDefinitionParams): Route;
}
```

### Route Handling

Routes are handled through the router system:

```typescript
// Route definition
{
  path: "/users/:id",
  makeRoute: ({ params }) => adt("userProfile", { id: params.id })
}

// Route navigation
dispatch(adt("@newRoute", adt("userProfile", { id: "123" })));
```

## Child Component Management

### Pattern for Child Components

1. **Define child state path**:
```typescript
interface ParentState {
  childComponent: Immutable<ChildState>;
}
```

2. **Initialize child in parent init**:
```typescript
const init: Init<Params, State, Msg> = (params) => {
  const [childState, childCmds] = ChildComponent.init(params.childParams);
  return [
    {
      childComponent: immutable(childState)
    },
    childCmds.map(cmd => cmd.map(msg => adt("childAction", msg)))
  ];
};
```

3. **Handle child messages in parent update**:
```typescript
const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "childAction":
      return updateChild({
        state,
        childStatePath: ["childComponent"],
        childUpdate: ChildComponent.update,
        childMsg: msg.value,
        mapChildMsg: (childMsg) => adt("childAction", childMsg)
      });
  }
};
```

4. **Render child in parent view**:
```typescript
const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const childDispatch = mapDispatch(
    dispatch,
    (childMsg) => adt("childAction", childMsg)
  );

  return (
    <div>
      {ChildComponent.view({
        state: state.childComponent,
        dispatch: childDispatch
      })}
    </div>
  );
};
```

## Best Practices

### 1. State Design

- **Keep state minimal**: Only store what's necessary
- **Normalize nested data**: Avoid deep nesting
- **Use validation types**: Wrap state in `Validation<Valid, Invalid>`
- **Immutable updates**: Always use immutable operations

### 2. Message Design

- **Use descriptive names**: `loadUserData` vs `load`
- **Include necessary data**: Avoid multiple round trips
- **Group related messages**: Use ADT unions effectively
- **Handle all cases**: Ensure exhaustive pattern matching

### 3. Component Structure

- **Single responsibility**: Each component should have one clear purpose
- **Composition over inheritance**: Build complex components from simple ones
- **Consistent patterns**: Follow the same patterns across components
- **Type safety**: Use TypeScript effectively for compile-time checking

### 4. Side Effects

- **Use commands**: All side effects should go through the command system
- **Avoid direct DOM manipulation**: Use commands for DOM operations
- **Handle errors**: Always handle potential failure cases
- **Debounce expensive operations**: Use debounced commands for search, etc.

## Common Patterns

### 1. Form Component Pattern

```typescript
interface FormState {
  fields: {
    name: Immutable<TextField.State>;
    email: Immutable<TextField.State>;
  };
  submitting: boolean;
}

type FormMsg =
  | ADT<"nameField", TextField.Msg>
  | ADT<"emailField", TextField.Msg>
  | ADT<"submit">
  | ADT<"submitResponse", Response>;

const update: Update<FormState, FormMsg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "nameField":
      return updateChild({
        state,
        childStatePath: ["fields", "name"],
        childUpdate: TextField.update,
        childMsg: msg.value,
        mapChildMsg: (msg) => adt("nameField", msg)
      });
    // ... other field handlers
  }
};
```

### 2. List Component Pattern

```typescript
interface ListState<Item> {
  items: Item[];
  loading: boolean;
  selectedItem: Item | null;
}

type ListMsg<Item> =
  | ADT<"loadItems">
  | ADT<"itemsLoaded", Item[]>
  | ADT<"selectItem", Item>
  | ADT<"deleteItem", Item>;
```

### 3. Modal Pattern

```typescript
interface ModalState {
  isOpen: boolean;
  content: ModalContent | null;
}

type ModalMsg =
  | ADT<"showModal", ModalContent>
  | ADT<"hideModal">
  | ADT<"modalAction", ModalAction>;
```

### 4. Tabbed Interface Pattern

```typescript
interface TabbedState {
  activeTab: TabId;
  tabs: {
    [K in TabId]: Immutable<TabState<K>>;
  };
}

type TabbedMsg =
  | ADT<"switchTab", TabId>
  | ADT<"tabAction", [TabId, TabMsg]>;
```

## Examples

### Basic Component Example

```typescript
// types.ts
interface Params {
  initialCount: number;
}

interface State {
  count: number;
}

type Msg =
  | ADT<"increment">
  | ADT<"decrement">
  | ADT<"reset">;

// component.ts
const init: component_.base.Init<Params, State, Msg> = ({ initialCount }) => {
  return [
    { count: initialCount },
    []
  ];
};

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "increment":
      return [state.set("count", state.count + 1), []];
    case "decrement":
      return [state.set("count", state.count - 1), []];
    case "reset":
      return [state.set("count", 0), []];
    default:
      return [state, []];
  }
};

const view: component_.base.ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <h2>Count: {state.count}</h2>
      <button onClick={() => dispatch(adt("increment"))}>+</button>
      <button onClick={() => dispatch(adt("decrement"))}>-</button>
      <button onClick={() => dispatch(adt("reset"))}>Reset</button>
    </div>
  );
};

export const component: component_.base.Component<Params, State, Msg> = {
  init,
  update,
  view
};
```

### Page Component Example

```typescript
// page.tsx
interface RouteParams {
  id: string;
}

interface State {
  user: User | null;
  loading: boolean;
}

type InnerMsg =
  | ADT<"loadUser">
  | ADT<"userLoaded", User>;

type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.page.Init<RouteParams, SharedState, State, InnerMsg, Route> =
  ({ routeParams }) => {
    return [
      { user: null, loading: true },
      [cmd.dispatch(adt("loadUser"))]
    ];
  };

const update: component_.page.Update<State, InnerMsg, Route> = ({ state, msg }) => {
  switch (msg.tag) {
    case "loadUser":
      return [
        state.set("loading", true),
        [cmd.httpRequest({
          method: "GET",
          url: `/api/users/${routeParams.id}`,
          handleResponse: (response) => adt("userLoaded", response)
        })]
      ];
    case "userLoaded":
      return [
        state.set("loading", false).set("user", msg.value),
        []
      ];
    default:
      return [state, []];
  }
};

const view: component_.page.View<State, InnerMsg, Route> = ({ state, dispatch }) => {
  if (state.loading) {
    return <div>Loading...</div>;
  }

  if (!state.user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>{state.user.name}</h1>
      <p>{state.user.email}</p>
    </div>
  );
};

export const component: component_.page.Component<RouteParams, SharedState, State, InnerMsg, Route> = {
  init,
  update,
  view,
  getMetadata: (state) => ({ title: state.user?.name || "Loading..." })
};
```

### Form Field Component Example

The framework includes a powerful FormField system that provides consistent form handling:

```typescript
// Using the FormField helper to create a text input
import * as FormField from "front-end/lib/components/form-field";

interface ChildParams {
  id: string;
  value: string;
  placeholder?: string;
}

interface ChildState {
  value: string;
}

type InnerChildMsg =
  | ADT<"setValue", string>;

const childInit: component_.base.Init<ChildParams, ChildState, InnerChildMsg> =
  ({ value }) => [{ value }, []];

const childUpdate: component_.base.Update<ChildState, InnerChildMsg> =
  ({ state, msg }) => {
    switch (msg.tag) {
      case "setValue":
        return [state.set("value", msg.value), []];
      default:
        return [state, []];
    }
  };

const childView: FormField.ChildComponent<string, ChildParams, ChildState, InnerChildMsg>["view"] =
  ({ state, dispatch, placeholder }) => {
    return (
      <input
        type="text"
        value={state.value}
        placeholder={placeholder}
        onChange={(e) => dispatch(adt("setValue", e.target.value))}
      />
    );
  };

export const component = FormField.makeComponent({
  init: childInit,
  update: childUpdate,
  view: childView
});
```

### Framework-Provided Form Field Components

The framework provides several pre-built form field components:

#### Text Fields
```typescript
import * as ShortTextField from "front-end/lib/components/form-field/short-text";
import * as LongTextField from "front-end/lib/components/form-field/long-text";

// Short text field (single line)
const [shortTextState, shortTextCmds] = ShortTextField.init({
  errors: [],
  validate: (value) => value.length > 0 ? valid(value) : invalid(["Required"]),
  child: { id: "name", value: "" }
});

// Long text field (multi-line)
const [longTextState, longTextCmds] = LongTextField.init({
  errors: [],
  validate: (value) => value.length > 10 ? valid(value) : invalid(["Too short"]),
  child: { id: "description", value: "" }
});
```

#### Select Fields
```typescript
import * as SelectField from "front-end/lib/components/form-field/select";

const [selectState, selectCmds] = SelectField.init({
  errors: [],
  validate: (value) => value ? valid(value) : invalid(["Please select an option"]),
  child: {
    id: "category",
    value: null,
    options: [
      { label: "Option 1", value: "opt1" },
      { label: "Option 2", value: "opt2" }
    ]
  }
});
```

#### Checkbox Fields
```typescript
import * as CheckboxField from "front-end/lib/components/form-field/checkbox";

const [checkboxState, checkboxCmds] = CheckboxField.init({
  errors: [],
  validate: (value) => value ? valid(value) : invalid(["Must be checked"]),
  child: {
    id: "terms",
    value: false,
    label: "I agree to terms and conditions"
  }
});
```

#### Date Fields
```typescript
import * as DateField from "front-end/lib/components/form-field/date";

const [dateState, dateCmds] = DateField.init({
  errors: [],
  validate: (value) => value ? valid(value) : invalid(["Date required"]),
  child: {
    id: "deadline",
    value: null,
    min: new Date(),
    max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
  }
});
```

#### Number Fields
```typescript
import * as NumberField from "front-end/lib/components/form-field/number";

const [numberState, numberCmds] = NumberField.init({
  errors: [],
  validate: (value) => value && value > 0 ? valid(value) : invalid(["Must be positive"]),
  child: {
    id: "amount",
    value: null,
    min: 0,
    max: 1000000
  }
});
```

### FormField Pattern

All form fields follow the same pattern:

1. **Validation**: Each field can have a `validate` function
2. **Error handling**: Fields display validation errors
3. **Consistent props**: All fields receive similar props
4. **Reusable**: Fields can be used across different forms

```typescript
// Generic FormField structure
interface FormFieldParams<Value> {
  errors: string[];
  validate?: (value: Value) => Validation<Value, string[]>;
  child: ChildParams;
}

interface FormFieldState<Value, ChildState> {
  id: string;
  errors: string[];
  showHelp: boolean;
  child: Immutable<ChildState>;
  validate: ((value: Value) => Validation<Value, string[]>) | null;
}

type FormFieldMsg<InnerChildMsg> =
  | ADT<"child", InnerChildMsg>
  | ADT<"toggleHelp">;
```

### Complex Component with Child Components

```typescript
// Parent component managing multiple child components
interface ParentState {
  nameField: Immutable<TextField.State>;
  emailField: Immutable<TextField.State>;
  modal: Immutable<Modal.State>;
  submitting: boolean;
}

type ParentMsg =
  | ADT<"nameField", TextField.Msg>
  | ADT<"emailField", TextField.Msg>
  | ADT<"modal", Modal.Msg>
  | ADT<"submit">
  | ADT<"submitResponse", Response>;

const init: component_.base.Init<Params, ParentState, ParentMsg> = (params) => {
  const [nameState, nameCmds] = TextField.init({ value: "", id: "name" });
  const [emailState, emailCmds] = TextField.init({ value: "", id: "email" });
  const [modalState, modalCmds] = Modal.init({ visible: false });

  return [
    {
      nameField: immutable(nameState),
      emailField: immutable(emailState),
      modal: immutable(modalState),
      submitting: false
    },
    [
      ...cmd.mapMany(nameCmds, (msg) => adt("nameField", msg)),
      ...cmd.mapMany(emailCmds, (msg) => adt("emailField", msg)),
      ...cmd.mapMany(modalCmds, (msg) => adt("modal", msg))
    ]
  ];
};

const update: component_.base.Update<ParentState, ParentMsg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "nameField":
      return updateChild({
        state,
        childStatePath: ["nameField"],
        childUpdate: TextField.update,
        childMsg: msg.value,
        mapChildMsg: (msg) => adt("nameField", msg)
      });

    case "emailField":
      return updateChild({
        state,
        childStatePath: ["emailField"],
        childUpdate: TextField.update,
        childMsg: msg.value,
        mapChildMsg: (msg) => adt("emailField", msg)
      });

    case "modal":
      return updateChild({
        state,
        childStatePath: ["modal"],
        childUpdate: Modal.update,
        childMsg: msg.value,
        mapChildMsg: (msg) => adt("modal", msg)
      });

    case "submit":
      return [
        state.set("submitting", true),
        [cmd.httpRequest({
          method: "POST",
          url: "/api/submit",
          body: {
            name: state.nameField.value,
            email: state.emailField.value
          },
          handleResponse: (response) => adt("submitResponse", response)
        })]
      ];

    case "submitResponse":
      return [
        state.set("submitting", false),
        [cmd.dispatch(adt("modal", Modal.adt("show", "Success!")))]
      ];

    default:
      return [state, []];
  }
};

const view: component_.base.ComponentView<ParentState, ParentMsg> = ({ state, dispatch }) => {
  const nameDispatch = mapDispatch(dispatch, (msg) => adt("nameField", msg));
  const emailDispatch = mapDispatch(dispatch, (msg) => adt("emailField", msg));
  const modalDispatch = mapDispatch(dispatch, (msg) => adt("modal", msg));

  return (
    <div>
      <form onSubmit={(e) => {
        e.preventDefault();
        dispatch(adt("submit"));
      }}>
        <TextField.view state={state.nameField} dispatch={nameDispatch} />
        <TextField.view state={state.emailField} dispatch={emailDispatch} />
        <button type="submit" disabled={state.submitting}>
          {state.submitting ? "Submitting..." : "Submit"}
        </button>
      </form>

      <Modal.view state={state.modal} dispatch={modalDispatch} />
    </div>
  );
};

export const component: component_.base.Component<Params, ParentState, ParentMsg> = {
  init,
  update,
  view
};
```

## Framework-Specific Utilities

### Tabbed Navigation Components

The framework provides utilities for creating tabbed interfaces:

```typescript
import * as TabbedNav from "front-end/lib/components/tabbed-nav";

interface TabDefinition {
  id: string;
  label: string;
  content: React.ReactNode;
}

const tabs: TabDefinition[] = [
  { id: "overview", label: "Overview", content: <OverviewTab /> },
  { id: "details", label: "Details", content: <DetailsTab /> },
  { id: "history", label: "History", content: <HistoryTab /> }
];

// In your view
<TabbedNav.view
  tabs={tabs}
  activeTab={state.activeTab}
  onTabChange={(tabId) => dispatch(adt("switchTab", tabId))}
/>
```

### Table Components

The framework includes powerful table utilities:

```typescript
import * as Table from "front-end/lib/components/table";

interface TableRow {
  id: string;
  name: string;
  status: string;
  actions: React.ReactNode;
}

const tableConfig = {
  idNamespace: "users-table",
  columns: [
    { key: "name", label: "Name", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "actions", label: "Actions", sortable: false }
  ]
};

const [tableState, tableCmds] = Table.init(tableConfig);
```

### Sidebar Components

The framework provides sidebar utilities:

```typescript
import * as MenuSidebar from "front-end/lib/components/sidebar/menu";

interface SidebarItem {
  icon: AvailableIcons;
  label: string;
  route: Route;
  active: boolean;
}

const sidebarItems: SidebarItem[] = [
  { icon: "home", label: "Dashboard", route: adt("dashboard"), active: true },
  { icon: "users", label: "Users", route: adt("users"), active: false },
  { icon: "settings", label: "Settings", route: adt("settings"), active: false }
];

// In page component
sidebar: {
  size: "medium",
  color: "c-sidebar-instructional-bg",
  view: ({ state, dispatch }) => (
    <MenuSidebar.view
      items={sidebarItems}
      dispatch={dispatch}
    />
  )
}
```

### Modal System

The framework has a built-in modal system:

```typescript
import * as Modal from "front-end/lib/components/modal";

// In page component
getModal: (state) => {
  if (state.showModal) {
    return {
      tag: "show",
      value: {
        title: "Confirm Action",
        body: (dispatch) => (
          <div>
            <p>Are you sure you want to proceed?</p>
          </div>
        ),
        actions: [
          {
            label: "Cancel",
            color: "secondary",
            msg: adt("hideModal")
          },
          {
            label: "Confirm",
            color: "primary",
            msg: adt("confirmAction")
          }
        ],
        onCloseMsg: adt("hideModal")
      }
    };
  }
  return { tag: "hide" };
}
```

### Alert System

Pages can display alerts using the alert system:

```typescript
// In page component
getAlerts: (state) => {
  const alerts = {
    info: [] as Alert[],
    warnings: [] as Alert[],
    errors: [] as Alert[]
  };

  if (state.error) {
    alerts.errors.push({
      text: state.error,
      dismissible: true,
      onDismiss: adt("dismissError")
    });
  }

  if (state.successMessage) {
    alerts.info.push({
      text: state.successMessage,
      dismissible: true,
      onDismiss: adt("dismissSuccess")
    });
  }

  return alerts;
}
```

### Breadcrumb System

Pages can provide breadcrumb navigation:

```typescript
// In page component
getBreadcrumbs: (state) => [
  { text: "Home", route: adt("dashboard") },
  { text: "Users", route: adt("users") },
  { text: state.user?.name || "User Details" }
]
```

### Icon System

The framework provides a comprehensive icon system:

```typescript
import Icon, { AvailableIcons } from "front-end/lib/views/icon";

// Usage in views
<Icon name="user" color="primary" />
<Icon name="settings" size="lg" />
<Icon name="check-circle" color="success" className="me-2" />
```

### Link System

The framework provides a routing-aware link system:

```typescript
import Link, { routeDest } from "front-end/lib/views/link";

// Internal routing
<Link dest={routeDest(adt("userProfile", { id: "123" }))}>
  View Profile
</Link>

// External links
<Link dest={externalDest("https://example.com")}>
  External Link
</Link>

// Email links
<Link dest={emailDest("user@example.com")}>
  Send Email
</Link>
```

### Validation Views

The framework provides utilities for handling validation in views:

```typescript
import { viewValid, viewInvalid } from "front-end/lib/views/validation";

// For components with validation state
const view: ComponentView<ValidationState, Msg> = viewValid(
  ({ state, dispatch }) => {
    // This only renders when state is valid
    return <div>Valid content: {state.data}</div>;
  }
);

// You can also handle invalid states
const view: ComponentView<ValidationState, Msg> = ({ state, dispatch }) => {
  switch (state.tag) {
    case "valid":
      return <div>Valid: {state.value.data}</div>;
    case "invalid":
      return <div>Error: {state.value.join(", ")}</div>;
  }
};
```

### Badge Components

The framework provides badge components:

```typescript
import { Badge } from "front-end/lib/views/badge";

<Badge color="primary" text="New" />
<Badge color="success" text="Active" />
<Badge color="warning" text="Pending" />
```

### Responsive Design

The framework includes responsive utilities:

```typescript
// Using Bootstrap-based responsive classes
<div className="d-none d-md-block">
  Desktop only content
</div>

<div className="d-block d-md-none">
  Mobile only content
</div>
```

### Theme System

The framework uses a comprehensive theme system:

```typescript
import { ThemeColor } from "front-end/lib/types";

// Available theme colors
type ThemeColor =
  | "primary" | "secondary" | "success" | "warning" | "danger"
  | "info" | "light" | "dark" | "white" | "black"
  | "bcgov-blue" | "bcgov-yellow"
  | "gray-100" | "gray-200" | "gray-300" // ... etc

// Usage in components
interface ComponentProps {
  color?: ThemeColor;
  backgroundColor?: ThemeColor;
}
```

### Access Control Utilities

The framework provides access control utilities:

```typescript
import { isSignedIn, isSignedOut, hasPermission } from "front-end/lib/access-control";

// Usage in page init
const init: page.Init<RouteParams, SharedState, State, InnerMsg, Route> =
  isSignedIn({
    success: ({ routeParams, shared }) => {
      // Handle signed in user
    },
    fail: ({ routeParams }) => {
      // Handle unauthenticated user
    }
  });

// Check specific permissions
const hasViewPermission = hasPermission(user, "view:users");
```

## Advanced Topics

### Access Control Integration

The framework includes built-in access control utilities:

```typescript
import { isSignedIn, isSignedOut } from "front-end/lib/access-control";

const init: component_.page.Init<RouteParams, SharedState, State, InnerMsg, Route> =
  isSignedIn<RouteParams, State, Msg>({
    success: ({ routeParams, shared }) => {
      // User is signed in, proceed normally
      return [initialState, []];
    },
    fail: ({ routeParams }) => {
      // User is not signed in, redirect to login
      return [
        invalid(null),
        [cmd.dispatch(component_.global.replaceRouteMsg(adt("signIn", null)))]
      ];
    }
  });
```

### Validation Integration

Components can use the validation system for form handling:

```typescript
import { Validation, valid, invalid } from "shared/lib/validation";

interface ValidState {
  name: string;
  email: string;
}

interface InvalidState {
  nameErrors: string[];
  emailErrors: string[];
}

type State = Validation<ValidState, InvalidState>;

const validateForm = (name: string, email: string): State => {
  const nameErrors = name.length < 2 ? ["Name must be at least 2 characters"] : [];
  const emailErrors = !email.includes("@") ? ["Invalid email format"] : [];

  if (nameErrors.length > 0 || emailErrors.length > 0) {
    return invalid({ nameErrors, emailErrors });
  }

  return valid({ name, email });
};
```

### Performance Optimization

The framework includes several optimization patterns:

#### Debounced Search
```typescript
const debouncedSearch = cmd.makeDebouncedDispatch(
  adt("searchNoOp"),
  adt("performSearch", query),
  300
);
```

#### Memoized Views
```typescript
const memoizedView = React.memo(({ state, dispatch }) => {
  return <ExpensiveComponent data={state.data} />;
});
```

#### Command Batching
```typescript
const batchedCmds = cmd.sequence([
  cmd.httpRequest(/* ... */),
  cmd.localStorage.setItem(/* ... */),
  cmd.focus(/* ... */)
]);
```

### Testing Components

Components can be tested by testing their three functions separately:

```typescript
// Testing init
test("initializes with correct state", () => {
  const [state, cmds] = MyComponent.init({ initialValue: "test" });
  expect(state.value).toBe("test");
  expect(cmds).toHaveLength(0);
});

// Testing update
test("handles increment message", () => {
  const initialState = immutable({ count: 0 });
  const [newState, cmds] = MyComponent.update({
    state: initialState,
    msg: adt("increment")
  });
  expect(newState.count).toBe(1);
});

// Testing view
test("renders correctly", () => {
  const state = immutable({ count: 5 });
  const dispatch = jest.fn();
  const rendered = MyComponent.view({ state, dispatch });
  // Assert on rendered content
});
```

## Migration Guide

### From React Class Components

1. **State**: Move from `this.state` to immutable state
2. **Methods**: Convert to message handlers in `update`
3. **Lifecycle**: Use `init` for componentDidMount, commands for side effects
4. **Props**: Use `Params` for initialization, `State` for runtime data

### From React Hooks

1. **useState**: Replace with component state
2. **useEffect**: Replace with commands in `init` or `update`
3. **useCallback**: Not needed due to immutable state
4. **useMemo**: Not needed due to predictable re-renders

## Troubleshooting

### Common Issues

1. **State not updating**: Ensure you're returning immutable state from `update`
2. **Commands not executing**: Check that commands are returned from `init`/`update`
3. **Child components not responding**: Verify message mapping is correct
4. **TypeScript errors**: Ensure all type parameters are properly defined

### Debugging Tips

1. **Use console.log in update**: Log state transitions
2. **Check command execution**: Commands should return promises
3. **Verify message routing**: Ensure messages reach the correct handlers
4. **State inspection**: Use browser dev tools to inspect immutable state

This comprehensive guide covers all aspects of the custom frontend framework. The framework emphasizes type safety, immutability, and predictable state management while maintaining composability and reusability of components. By following the patterns and examples provided, developers can build robust, maintainable frontend applications.
