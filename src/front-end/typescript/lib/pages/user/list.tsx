import { EMPTY_STRING } from "front-end/config";
import { makePageMetadata } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import router from "front-end/lib/app/router";
import { Route, SharedState } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import {
  userStatusToColor,
  userStatusToTitleCase,
  userTypeToTitleCase
} from "front-end/lib/pages/user/lib";
import Badge from "front-end/lib/views/badge";
import Link, { routeDest } from "front-end/lib/views/link";
import React from "react";
import { Button, Col, Row } from "reactstrap";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import * as FormField from "front-end/lib/components/form-field";
import { compareStrings } from "shared/lib";
import { isAdmin, User, UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";

interface TableUser extends User {
  statusTitleCase: string;
  typeTitleCase: string;
}

export interface State {
  table: Immutable<Table.State>;
  users: TableUser[];
  showExportModal: boolean;
  exportLoading: boolean;
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

type ToggleableUserType = UserType.Vendor | UserType.Government;

type InnerMsg =
  | ADT<"onInitResponse", TableUser[]>
  | ADT<"table", Table.Msg>
  | ADT<"showExportModal">
  | ADT<"hideExportModal">
  | ADT<"userTypeCheckbox", { userType: ToggleableUserType; msg: Checkbox.Msg }>
  | ADT<
      "fieldCheckbox",
      { field: keyof State["fieldCheckboxes"]; msg: Checkbox.Msg }
    >
  | ADT<"exportContactList">
  | ADT<"exportComplete">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

function baseInit(): component_.base.InitReturnValue<State, Msg> {
  const [tableState, tableCmds] = Table.init({
    idNamespace: "user-list-table"
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
      users: [],
      table: immutable(tableState),
      showExportModal: false,
      exportLoading: false,
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
      ...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg),
      ...component_.cmd.mapMany(
        govCheckboxCmds,
        (msg) =>
          adt("userTypeCheckbox", { userType: UserType.Government, msg }) as Msg
      ),
      ...component_.cmd.mapMany(
        vendorCheckboxCmds,
        (msg) =>
          adt("userTypeCheckbox", { userType: UserType.Vendor, msg }) as Msg
      ),
      ...component_.cmd.mapMany(
        firstNameCheckboxCmds,
        (msg) => adt("fieldCheckbox", { field: "firstName", msg }) as Msg
      ),
      ...component_.cmd.mapMany(
        lastNameCheckboxCmds,
        (msg) => adt("fieldCheckbox", { field: "lastName", msg }) as Msg
      ),
      ...component_.cmd.mapMany(
        emailCheckboxCmds,
        (msg) => adt("fieldCheckbox", { field: "email", msg }) as Msg
      ),
      ...component_.cmd.mapMany(
        organizationNameCheckboxCmds,
        (msg) => adt("fieldCheckbox", { field: "organizationName", msg }) as Msg
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
    case "onInitResponse":
      return [state.set("users", msg.value), []];
    case "table":
      return component_.base.updateChild({
        state,
        childStatePath: ["table"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "table", value })
      });
    case "showExportModal":
      return [state.set("showExportModal", true), []];
    case "hideExportModal":
      return [state.set("showExportModal", false), []];
    case "userTypeCheckbox":
      return component_.base.updateChild({
        state,
        childStatePath: ["userTypeCheckboxes", msg.value.userType],
        childUpdate: Checkbox.update,
        childMsg: msg.value.msg,
        mapChildMsg: (value) => ({
          tag: "userTypeCheckbox",
          value: { userType: msg.value.userType, msg: value }
        })
      });
    case "fieldCheckbox":
      return component_.base.updateChild({
        state,
        childStatePath: ["fieldCheckboxes", msg.value.field],
        childUpdate: Checkbox.update,
        childMsg: msg.value.msg,
        mapChildMsg: (value) => ({
          tag: "fieldCheckbox",
          value: { field: msg.value.field, msg: value }
        })
      });
    case "exportContactList": {
      // Build query parameters from checkbox states
      const selectedUserTypes = Object.entries(state.userTypeCheckboxes)
        .filter(([_, checkboxState]) => FormField.getValue(checkboxState))
        .map(([type]) => type);

      const selectedFields = Object.entries(state.fieldCheckboxes)
        .filter(([_, checkboxState]) => FormField.getValue(checkboxState))
        .map(([field]) => field);

      // Make sure there's at least one user type and field selected
      if (!selectedUserTypes.length || !selectedFields.length) {
        return [state, []];
      }

      // Use URLSearchParams for safer URL construction
      const params = new URLSearchParams({
        userTypes: selectedUserTypes.join(","),
        fields: selectedFields.join(",")
      });

      // Fetch and create blob download
      fetch(`/api/contact-list?${params}`)
        .then((response) => response.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "dm-contacts.csv";
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch((error) => console.error("Export failed:", error));

      return [
        state.set("showExportModal", false).set("exportLoading", true),
        [component_.cmd.dispatch(adt("exportComplete"))]
      ];
    }

    case "exportComplete":
      return [state.set("exportLoading", false), []];
    default:
      return [state, []];
  }
};

function tableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Status",
      className: "text-nowrap",
      style: { width: "0px" }
    },
    {
      children: "Account Type",
      className: "text-nowrap",
      style: { width: "0px" }
    },
    {
      children: "Name",
      className: "text-nowrap",
      style: {
        width: "100%",
        minWidth: "200px"
      }
    },
    {
      children: "Admin?",
      className: "text-center text-nowrap",
      style: { width: "0px" }
    }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.users.map((user) => {
    return [
      {
        children: (
          <Badge
            text={user.statusTitleCase}
            color={userStatusToColor(user.status)}
          />
        )
      },
      {
        children: user.typeTitleCase,
        className: "text-nowrap"
      },
      {
        children: (
          <Link dest={routeDest(adt("userProfile", { userId: user.id }))}>
            {user.name || EMPTY_STRING}
          </Link>
        )
      },
      {
        children: <Table.Check checked={isAdmin(user)} />,
        className: "text-center"
      }
    ];
  });
}

const getModal: component_.page.GetModal<State, Msg> = (state) => {
  if (!state.showExportModal) {
    return component_.page.modal.hide();
  }

  const { exportLoading } = state;
  const isLoading = exportLoading;

  // Check if at least one user type and one field is selected
  const hasUserTypeSelected = Object.values(state.userTypeCheckboxes).some(
    (checkboxState) => FormField.getValue(checkboxState)
  );
  const hasFieldSelected = Object.values(state.fieldCheckboxes).some(
    (checkboxState) => FormField.getValue(checkboxState)
  );
  const canExport = hasUserTypeSelected && hasFieldSelected && !isLoading;

  return component_.page.modal.show<Msg>({
    title: "Export Contact List",
    onCloseMsg: adt("hideExportModal"),
    actions: [
      {
        text: isLoading ? "Exporting..." : "Export",
        color: "primary",
        msg: adt("exportContactList"),
        button: true,
        disabled: !canExport,
        loading: isLoading
      },
      {
        text: "Cancel",
        color: "secondary",
        msg: adt("hideExportModal")
      }
    ],
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
              adt("userTypeCheckbox" as const, {
                userType: UserType.Government as ToggleableUserType,
                msg
              })
            )}
          />
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "Vendor Users"
            }}
            className="mb-0"
            state={state.userTypeCheckboxes.VENDOR}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("userTypeCheckbox" as const, {
                userType: UserType.Vendor as ToggleableUserType,
                msg
              })
            )}
          />
        </div>

        <div>
          <h5>Select Fields to Export</h5>
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "First Name"
            }}
            className="mb-0"
            state={state.fieldCheckboxes.firstName}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("fieldCheckbox" as const, {
                field: "firstName" as const,
                msg
              })
            )}
          />
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "Last Name"
            }}
            className="mb-0"
            state={state.fieldCheckboxes.lastName}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("fieldCheckbox" as const, { field: "lastName" as const, msg })
            )}
          />
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "Email"
            }}
            className="mb-0"
            state={state.fieldCheckboxes.email}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("fieldCheckbox" as const, { field: "email" as const, msg })
            )}
          />
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "Organization Name"
            }}
            className="mb-0"
            state={state.fieldCheckboxes.organizationName}
            dispatch={component_.base.mapDispatch(dispatch, (msg) =>
              adt("fieldCheckbox" as const, {
                field: "organizationName" as const,
                msg
              })
            )}
          />
        </div>
      </div>
    )
  });
};

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const dispatchTable = component_.base.mapDispatch<Msg, Table.Msg>(
    dispatch,
    (value) => ({ tag: "table", value })
  );
  return (
    <Row>
      <Col xs="12">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
          <h1 className="mb-3 mb-md-0">Digital Marketplace Users</h1>
          <Button
            color="primary"
            onClick={() => dispatch(adt("showExportModal"))}
            disabled={state.exportLoading}>
            Export Contact List
          </Button>
        </div>
        <Table.view
          headCells={tableHeadCells()}
          bodyRows={tableBodyRows(state)}
          state={state.table}
          dispatch={dispatchTable}
        />
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
