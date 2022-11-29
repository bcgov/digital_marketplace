import { APP_TERMS_CONTENT_ID } from "front-end/config";
import { Msg, State } from "front-end/lib/app/types";
import { component } from "front-end/lib/framework";
import Link, { routeDest } from "front-end/lib/views/link";
import React from "react";
import { COPY } from "shared/config";
import { adt } from "shared/lib/types";

function getAlerts({
  state,
  dispatch
}: component.base.ComponentViewProps<State, Msg>): component.page.Alerts<Msg> {
  const user = state.shared.session?.user;
  if (user && user.lastAcceptedTermsAt && !user.acceptedTermsAt) {
    return {
      ...component.page.alerts.empty(),
      warnings: [
        {
          text: (
            <div>
              The <i>{COPY.appTermsTitle}</i> have been updated. Please save
              what you are working on,{" "}
              <Link
                newTab
                dest={routeDest(adt("contentView", APP_TERMS_CONTENT_ID))}>
                review the latest version
              </Link>{" "}
              and{" "}
              <Link
                onClick={() =>
                  dispatch(adt("showModal", "acceptNewTerms" as const))
                }>
                {" "}
                agree to the updated terms
              </Link>
              .
            </div>
          )
        }
      ]
    };
  } else {
    return component.page.alerts.empty();
  }
}

export default getAlerts;
