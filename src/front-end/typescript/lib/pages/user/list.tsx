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
import { Button, Col, Row, FormGroup, Label, Input } from "reactstrap";
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
  exportOptions: {
    userTypes: {
      gov: boolean;
      vendor: boolean;
    };
    fields: {
      firstName: boolean;
      lastName: boolean;
      email: boolean;
      organizationName: boolean;
    };
  };
}

type InnerMsg =
  | ADT<"onInitResponse", TableUser[]>
  | ADT<"table", Table.Msg>
  | ADT<"showExportModal">
  | ADT<"hideExportModal">
  | ADT<"toggleUserType", keyof State["exportOptions"]["userTypes"]>
  | ADT<"toggleField", keyof State["exportOptions"]["fields"]>
  | ADT<"exportContactList">
  | ADT<"exportComplete">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

function baseInit(): component_.base.InitReturnValue<State, Msg> {
  const [tableState, tableCmds] = Table.init({
    idNamespace: "user-list-table"
  });
  return [
    {
      users: [],
      table: immutable(tableState),
      showExportModal: false,
      exportLoading: false,
      exportOptions: {
        userTypes: {
          gov: true,
          vendor: true
        },
        fields: {
          firstName: true,
          lastName: true,
          email: true,
          organizationName: true
        }
      }
    },
    [
      component_.cmd.dispatch(component_.page.readyMsg()),
      ...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg)
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
    case "toggleUserType":
      return [
        state.update("exportOptions", (options) => ({
          ...options,
          userTypes: {
            ...options.userTypes,
            [msg.value]: !options.userTypes[msg.value]
          }
        })),
        []
      ];
    case "toggleField":
      return [
        state.update("exportOptions", (options) => ({
          ...options,
          fields: {
            ...options.fields,
            [msg.value]: !options.fields[msg.value]
          }
        })),
        []
      ];
    case "exportContactList": {
      const { userTypes, fields } = state.exportOptions;

      // Build query parameters
      const selectedUserTypes = Object.entries(userTypes)
        .filter(([_, isSelected]) => isSelected)
        .map(([type]) => type);

      const selectedFields = Object.entries(fields)
        .filter(([_, isSelected]) => isSelected)
        .map(([field]) => field);

      // Make sure there's at least one user type and field selected
      if (!selectedUserTypes.length || !selectedFields.length) {
        return [state, []];
      }

      // Build the download URL with query parameters
      const userTypesParam = selectedUserTypes.join(",");
      const fieldsParam = selectedFields.join(",");
      const downloadUrl = `/api/users/export-contact-list?userTypes=${userTypesParam}&fields=${fieldsParam}`;

      // Create a hidden anchor and trigger the download
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "dm-contacts.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

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

  const { exportOptions, exportLoading } = state;
  const isLoading = exportLoading;

  // Check if at least one user type and one field is selected
  const hasUserTypeSelected = Object.values(exportOptions.userTypes).some(
    (v) => v
  );
  const hasFieldSelected = Object.values(exportOptions.fields).some((v) => v);
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
          <FormGroup check className="mb-2">
            <Label check>
              <Input
                type="checkbox"
                checked={exportOptions.userTypes.gov}
                onChange={() =>
                  dispatch(adt("toggleUserType" as const, "gov" as const))
                }
              />{" "}
              Government Users
            </Label>
          </FormGroup>
          <FormGroup check>
            <Label check>
              <Input
                type="checkbox"
                checked={exportOptions.userTypes.vendor}
                onChange={() =>
                  dispatch(adt("toggleUserType" as const, "vendor" as const))
                }
              />{" "}
              Vendor Users
            </Label>
          </FormGroup>
        </div>

        <div>
          <h5>Select Fields to Export</h5>
          <FormGroup check className="mb-2">
            <Label check>
              <Input
                type="checkbox"
                checked={exportOptions.fields.firstName}
                onChange={() =>
                  dispatch(adt("toggleField" as const, "firstName" as const))
                }
              />{" "}
              First Name
            </Label>
          </FormGroup>
          <FormGroup check className="mb-2">
            <Label check>
              <Input
                type="checkbox"
                checked={exportOptions.fields.lastName}
                onChange={() =>
                  dispatch(adt("toggleField" as const, "lastName" as const))
                }
              />{" "}
              Last Name
            </Label>
          </FormGroup>
          <FormGroup check className="mb-2">
            <Label check>
              <Input
                type="checkbox"
                checked={exportOptions.fields.email}
                onChange={() =>
                  dispatch(adt("toggleField" as const, "email" as const))
                }
              />{" "}
              Email
            </Label>
          </FormGroup>
          <FormGroup check>
            <Label check>
              <Input
                type="checkbox"
                checked={exportOptions.fields.organizationName}
                onChange={() =>
                  dispatch(
                    adt("toggleField" as const, "organizationName" as const)
                  )
                }
              />{" "}
              Organization Name
            </Label>
          </FormGroup>
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
