import { Route, SharedState } from "front-end/lib/app/types";
import { immutable, component } from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import { InnerMsg, Msg, State } from "front-end/lib/pages/content/view";
import { adt } from "shared/lib/types";
import { valid } from "shared/lib/validation";

export const CONTENT_SLUG = "vendor-information-sessions";

export type RouteParams = null;

export const init: component.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = ({ routePath }) => {
  return [
    valid(immutable({ routePath, content: null })),
    [
      api.content.readOne<Msg>()(CONTENT_SLUG, (msg) =>
        adt("onContentResponse", msg)
      )
    ]
  ];
};
