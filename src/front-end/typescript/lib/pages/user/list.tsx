import { SEARCH_DEBOUNCE_DURATION } from "front-end/config";
import { makePageMetadata } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import router from "front-end/lib/app/router";
import { Route, SharedState } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import * as FormField from "front-end/lib/components/form-field";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import {
  userStatusToColor,
  userStatusToTitleCase
} from "front-end/lib/pages/user/lib";
import {
  userTypeToTitleCase,
  UserType,
  isAdmin,
  User
} from "shared/lib/resources/user";
import Link, { externalDest, routeDest } from "front-end/lib/views/link";
import * as VirtualizedTable from "front-end/lib/components/virtualized-table";
import React from "react";
import { Button, Col, Row, Spinner } from "reactstrap";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import { compareStrings } from "shared/lib";
import { adt, ADT } from "shared/lib/types";
import Badge from "front-end/lib/views/badge";
import { EMPTY_STRING } from "shared/config";

// Constants
const TABLE_ROW_HEIGHT = 50;
const LOADING_CONTAINER_HEIGHT = "60vh";

// Column width constants
const COLUMN_WIDTHS = {
  STATUS: "10%",
  ACCOUNT_TYPE: "15%",
  NAME: "30%",
  ADMIN: "10%"
};

const MIN_COLUMN_WIDTHS = {
  STATUS: "80px",
  ACCOUNT_TYPE: "180px",
  NAME: "200px",
  ADMIN: "52px"
};

interface TableUser extends User {
  statusTitleCase: string;
  typeTitleCase: string;
}
export interface State {
  users: TableUser[];
  visibleUsers: TableUser[];
  loading: boolean;
  searchFilter: Immutable<ShortText.State>;
  virtualizedTable: Immutable<VirtualizedTable.State>;
  showExportModal: boolean;
  userTypeCheckboxes: {
    [UserType.Government]: Immutable<Checkbox.State>;
    [UserType.Vendor]: Immutable<Checkbox.State>;
  };
  fieldCheckboxes: {
    firstName: Immutable<Checkbox.State>;
    lastName: Immutable<Checkbox.State>;
    email: Immutable<Checkbox.State>;
    organizationName: Immutable<Checkbox.State>;
  };
}

type InnerMsg =
  | ADT<"onInitResponse", TableUser[]>
  | ADT<"searchFilter", ShortText.Msg>
  | ADT<"search", null>
  | ADT<"noop">
  | ADT<"virtualizedTable", VirtualizedTable.Msg>
  | ADT<"showExportModal">
  | ADT<"hideExportModal">
  | ADT<"userTypeCheckboxGovernment", Checkbox.Msg>
  | ADT<"userTypeCheckboxVendor", Checkbox.Msg>
  | ADT<"fieldCheckboxFirstName", Checkbox.Msg>
  | ADT<"fieldCheckboxLastName", Checkbox.Msg>
  | ADT<"fieldCheckboxEmail", Checkbox.Msg>
  | ADT<"fieldCheckboxOrganizationName", Checkbox.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

function makeQueryRegExp(query: string): RegExp | null {
  if (!query) {
    return null;
  }
  return new RegExp(query.split(/\s+/).join(".*"), "i");
}

function filterUsers(users: TableUser[], query: string): TableUser[] {
  const regExp = makeQueryRegExp(query);
  if (!regExp) {
    return users;
  }
  return users.filter((user) => {
    return user.name && regExp.exec(user.name);
  });
}

function runSearch(state: Immutable<State>): Immutable<State> {
  const query = FormField.getValue(state.searchFilter);
  const filteredUsers = filterUsers(state.users, query);
  return state
    .set("visibleUsers", filteredUsers)
    .setIn(["virtualizedTable", "totalItems"], filteredUsers.length);
}

const dispatchSearch = component_.cmd.makeDebouncedDispatch(
  adt("noop") as InnerMsg,
  adt("search", null) as InnerMsg,
  SEARCH_DEBOUNCE_DURATION
);

function baseInit(): component_.base.InitReturnValue<State, Msg> {
  const [searchFilterState, searchFilterCmds] = ShortText.init({
    errors: [],
    child: {
      type: "text",
      value: "",
      id: "user-list-search"
    }
  });
  const [virtualizedTableState, virtualizedTableCmds] = VirtualizedTable.init({
    idNamespace: "user-list-virtualized",
    totalItems: 0,
    rowHeight: TABLE_ROW_HEIGHT
  });

  // Initialize user type checkboxes
  const [govCheckboxState, govCheckboxCmds] = Checkbox.init({
    errors: [],
    child: {
      value: true,
      id: "export-user-type-government"
    }
  });

  const [vendorCheckboxState, vendorCheckboxCmds] = Checkbox.init({
    errors: [],
    child: {
      value: true,
      id: "export-user-type-vendor"
    }
  });

  // Initialize field checkboxes
  const [firstNameCheckboxState, firstNameCheckboxCmds] = Checkbox.init({
    errors: [],
    child: {
      value: true,
      id: "export-field-first-name"
    }
  });

  const [lastNameCheckboxState, lastNameCheckboxCmds] = Checkbox.init({
    errors: [],
    child: {
      value: true,
      id: "export-field-last-name"
    }
  });

  const [emailCheckboxState, emailCheckboxCmds] = Checkbox.init({
    errors: [],
    child: {
      value: true,
      id: "export-field-email"
    }
  });

  const [organizationNameCheckboxState, organizationNameCheckboxCmds] =
    Checkbox.init({
      errors: [],
      child: {
        value: true,
        id: "export-field-organization-name"
      }
    });

  return [
    {
      visibleUsers: [],
      loading: true,
      searchFilter: immutable(searchFilterState),
      virtualizedTable: immutable(virtualizedTableState),
      users: [],
      showExportModal: false,
      userTypeCheckboxes: {
        [UserType.Government]: immutable(govCheckboxState),
        [UserType.Vendor]: immutable(vendorCheckboxState)
      },
      fieldCheckboxes: {
        firstName: immutable(firstNameCheckboxState),
        lastName: immutable(lastNameCheckboxState),
        email: immutable(emailCheckboxState),
        organizationName: immutable(organizationNameCheckboxState)
      }
    },
    [
      component_.cmd.dispatch(component_.page.readyMsg()),
      ...component_.cmd.mapMany(
        searchFilterCmds,
        (msg) => adt("searchFilter", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        virtualizedTableCmds,
        (msg) => adt("virtualizedTable", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        govCheckboxCmds,
        (msg) => adt("userTypeCheckboxGovernment", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        vendorCheckboxCmds,
        (msg) => adt("userTypeCheckboxVendor", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        firstNameCheckboxCmds,
        (msg) => adt("fieldCheckboxFirstName", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        lastNameCheckboxCmds,
        (msg) => adt("fieldCheckboxLastName", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        emailCheckboxCmds,
        (msg) => adt("fieldCheckboxEmail", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        organizationNameCheckboxCmds,
        (msg) => adt("fieldCheckboxOrganizationName", msg) as Msg
      )
    ]
  ];
}

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType({
  userType: [UserType.Admin],
  success() {
    const [initState, initCmds] = baseInit();
    return [
      initState,
      [
        ...initCmds,
        api.users.readMany<Msg>()((response) => {
          if (!api.isValid(response)) return adt("onInitResponse", []);
          const users = response.value
            .map((user) => ({
              ...user,
              typeTitleCase: userTypeToTitleCase(user.type),
              statusTitleCase: userStatusToTitleCase(user.status)
            }))
            .sort((a, b) => {
              const statusCompare = compareStrings(
                a.statusTitleCase,
                b.statusTitleCase
              );
              if (statusCompare) {
                return statusCompare;
              }
              const typeCompare = compareStrings(
                a.typeTitleCase,
                b.typeTitleCase
              );
              if (typeCompare) {
                return typeCompare;
              }
              return compareStrings(a.name, b.name);
            });
          return adt("onInitResponse", users);
        })
      ]
    ];
  },
  fail({ routePath, shared }) {
    const [initState, initCmds] = baseInit();
    return [
      initState,
      [
        ...initCmds,
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            shared.session
              ? adt("notFound" as const, { path: routePath })
              : adt("signIn" as const, {
                  redirectOnSuccess: router.routeToUrl(adt("userList", null))
                })
          )
        )
      ]
    ];
  }
});

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const newState = state.set("users", msg.value).set("loading", false);
      const searchState = runSearch(newState);
      return [
        searchState,
        [
          component_.cmd.dispatch(
            adt("virtualizedTable", adt("resetScroll", null)) as Msg
          )
        ]
      ];
    }
    case "searchFilter":
      return component_.base.updateChild({
        state,
        childStatePath: ["searchFilter"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "searchFilter", value }),
        updateAfter: (state) =>
          [state, [dispatchSearch()]] as component_.page.UpdateReturnValue<
            State,
            InnerMsg,
            Route
          >
      });
    case "search": {
      const searchState = runSearch(state);
      return [
        searchState,
        [
          component_.cmd.dispatch(
            adt("virtualizedTable", adt("resetScroll", null)) as Msg
          )
        ]
      ];
    }
    case "virtualizedTable":
      return component_.base.updateChild({
        state,
        childStatePath: ["virtualizedTable"],
        childUpdate: VirtualizedTable.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "virtualizedTable", value })
      });
    case "showExportModal":
      return [state.set("showExportModal", true), []];
    case "hideExportModal":
      return [state.set("showExportModal", false), []];
    case "userTypeCheckboxGovernment":
      return component_.base.updateChild({
        state,
        childStatePath: ["userTypeCheckboxes", UserType.Government],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("userTypeCheckboxGovernment", value)
      });
    case "userTypeCheckboxVendor":
      return component_.base.updateChild({
        state,
        childStatePath: ["userTypeCheckboxes", UserType.Vendor],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("userTypeCheckboxVendor", value)
      });
    case "fieldCheckboxFirstName":
      return component_.base.updateChild({
        state,
        childStatePath: ["fieldCheckboxes", "firstName"],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("fieldCheckboxFirstName", value)
      });
    case "fieldCheckboxLastName":
      return component_.base.updateChild({
        state,
        childStatePath: ["fieldCheckboxes", "lastName"],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("fieldCheckboxLastName", value)
      });
    case "fieldCheckboxEmail":
      return component_.base.updateChild({
        state,
        childStatePath: ["fieldCheckboxes", "email"],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("fieldCheckboxEmail", value)
      });
    case "fieldCheckboxOrganizationName":
      return component_.base.updateChild({
        state,
        childStatePath: ["fieldCheckboxes", "organizationName"],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("fieldCheckboxOrganizationName", value)
      });

    default:
      return [state, []];
  }
};

function tableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Status",
      className: "text-nowrap",
      style: { width: COLUMN_WIDTHS.STATUS, minWidth: MIN_COLUMN_WIDTHS.STATUS }
    },
    {
      children: "Account Type",
      className: "text-nowrap",
      style: {
        width: COLUMN_WIDTHS.ACCOUNT_TYPE,
        minWidth: MIN_COLUMN_WIDTHS.ACCOUNT_TYPE
      }
    },
    {
      children: "Name",
      className: "text-nowrap",
      style: {
        width: COLUMN_WIDTHS.NAME,
        minWidth: MIN_COLUMN_WIDTHS.NAME
      }
    },
    {
      children: "Admin?",
      className: "text-center text-nowrap",
      style: { width: COLUMN_WIDTHS.ADMIN, minWidth: MIN_COLUMN_WIDTHS.STATUS }
    }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.visibleUsers.map((user: TableUser) => [
    {
      children: (
        <Badge
          text={user.statusTitleCase}
          color={userStatusToColor(user.status)}
        />
      ),
      className: "align-middle"
    },
    {
      children: user.typeTitleCase,
      className: "align-middle text-nowrap"
    },
    {
      children: (
        <Link dest={routeDest(adt("userProfile", { userId: user.id }))}>
          {user.name || EMPTY_STRING}
        </Link>
      ),
      className: "align-middle"
    },
    {
      children: <Table.Check checked={isAdmin(user)} />,
      className: "align-middle text-center"
    }
  ]);
}

const getModal: component_.page.GetModal<State, Msg> = (state) => {
  if (!state.showExportModal) {
    return component_.page.modal.hide();
  }

  // Check if at least one user type and one field is selected
  const hasUserTypeSelected = Object.values(state.userTypeCheckboxes).some(
    (checkboxState) => FormField.getValue(checkboxState)
  );
  const hasFieldSelected = Object.values(state.fieldCheckboxes).some(
    (checkboxState) => FormField.getValue(checkboxState)
  );
  const canExport = hasUserTypeSelected && hasFieldSelected;

  // Build query parameters from checkbox states
  const selectedUserTypes = Object.entries(state.userTypeCheckboxes)
    .filter(([_, checkboxState]) => FormField.getValue(checkboxState))
    .map(([type]) => type);

  const selectedFields = Object.entries(state.fieldCheckboxes)
    .filter(([_, checkboxState]) => FormField.getValue(checkboxState))
    .map(([field]) => field);

  // Use URLSearchParams for safer URL construction
  const params = new URLSearchParams({
    userTypes: selectedUserTypes.join(","),
    fields: selectedFields.join(",")
  });

  const csvURLWithQueryParams = `/api/contact-list?${params}`;

  return component_.page.modal.show<Msg>({
    title: "Export Contact List",
    onCloseMsg: adt("hideExportModal"),
    actions: [],
    body: (dispatch) => (
      <div>
        <div className="mb-4">
          <h5>Select User Types</h5>
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "Government Users"
            }}
            className="mb-0"
            state={state.userTypeCheckboxes.GOV}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("userTypeCheckboxGovernment" as const, msg)
            )}
          />
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "Vendor Users"
            }}
            className="mb-0"
            state={state.userTypeCheckboxes.VENDOR}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("userTypeCheckboxVendor" as const, msg)
            )}
          />
        </div>

        <div className="mb-4">
          <h5>Select Fields to Export</h5>
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "First Name"
            }}
            className="mb-0"
            state={state.fieldCheckboxes.firstName}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("fieldCheckboxFirstName" as const, msg)
            )}
          />
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "Last Name"
            }}
            className="mb-0"
            state={state.fieldCheckboxes.lastName}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("fieldCheckboxLastName" as const, msg)
            )}
          />
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "Email"
            }}
            className="mb-0"
            state={state.fieldCheckboxes.email}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("fieldCheckboxEmail" as const, msg)
            )}
          />
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "Organization Name"
            }}
            className="mb-0"
            state={state.fieldCheckboxes.organizationName}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("fieldCheckboxOrganizationName" as const, msg)
            )}
          />
        </div>

        {!canExport && (
          <div className="mb-4 text-muted">
            Please select at least one user type and one field to export.
          </div>
        )}

        {/* Action buttons styled like modal footer */}
        <div
          className="p-0 modal-footer ml-n3 mr-n3"
          style={{ overflowX: "auto", justifyContent: "normal" }}>
          <div className="p-3 d-flex flex-row-reverse justify-content-start align-items-center text-nowrap flex-grow-1">
            <Link
              newTab
              download
              dest={externalDest(csvURLWithQueryParams)}
              onClick={() => dispatch(adt("hideExportModal"))}
              disabled={!canExport}
              className="mx-0">
              Export
            </Link>
            <Link
              onClick={() => dispatch(adt("hideExportModal"))}
              color="secondary"
              className="mr-3">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    )
  });
};

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const dispatchSearchFilter = component_.base.mapDispatch<Msg, ShortText.Msg>(
    dispatch,
    (value) => ({ tag: "searchFilter", value })
  );
  const dispatchVirtualizedTable = component_.base.mapDispatch<
    Msg,
    VirtualizedTable.Msg
  >(dispatch, (value) => ({ tag: "virtualizedTable", value }));
  const ShortTextView = ShortText.view;
  const VirtualizedTableView = VirtualizedTable.view;

  return (
    <Row>
      <Col xs="12">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
          <h1 className="mb-3 mb-md-0">Digital Marketplace Users</h1>
          <Button
            color="primary"
            onClick={() => dispatch(adt("showExportModal"))}>
            Export Contact List
          </Button>
        </div>
        <div className="mb-3">
          {state.loading ? (
            <div
              className="d-flex justify-content-center align-items-center"
              style={{ height: LOADING_CONTAINER_HEIGHT }}>
              <Spinner color="primary" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <ShortTextView
                  extraChildProps={{}}
                  placeholder="Search by name..."
                  disabled={false}
                  state={state.searchFilter}
                  className="w-100"
                  dispatch={dispatchSearchFilter}
                />
              </div>
              <VirtualizedTableView
                state={state.virtualizedTable}
                dispatch={dispatchVirtualizedTable}
                headCells={tableHeadCells()}
                bodyRows={tableBodyRows(state)}
              />
            </>
          )}
        </div>
      </Col>
    </Row>
  );
};

export const component: component_.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata("Users");
  },
  getModal
};
